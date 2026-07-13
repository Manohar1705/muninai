const express = require("express");
const { nanoid } = require("nanoid");
const { db } = require("../db");
const {
  isRecallConfigured,
  createBot,
  getBotStatus,
  leaveBot,
} = require("../services/meetingBot");
const { processMeetingChunks, isTerminalStatus, shouldRunIncrementalExtraction } = require("../services/meetingProcessor");

const router = express.Router();

const insertMeeting = db.prepare(
  `INSERT INTO meetings (id, bot_id, meeting_url, bot_name, status)
   VALUES (@id, @bot_id, @meeting_url, @bot_name, @status)`
);
const updateMeetingBotId = db.prepare(
  `UPDATE meetings SET bot_id = @bot_id, status = @status, updated_at = datetime('now') WHERE id = @id`
);
const updateMeetingStatus = db.prepare(
  `UPDATE meetings SET status = @status, updated_at = datetime('now') WHERE id = @id`
);
const updateMeetingError = db.prepare(
  `UPDATE meetings SET status = 'error', error = @error, updated_at = datetime('now') WHERE id = @id`
);
const getMeeting = db.prepare(`SELECT * FROM meetings WHERE id = ?`);
const getMeetingByBotId = db.prepare(`SELECT * FROM meetings WHERE bot_id = ?`);
const insertActivity = db.prepare(`INSERT INTO activity (text, created_at) VALUES (@text, @created_at)`);
const insertChunk = db.prepare(
  `INSERT INTO meeting_transcript_chunks (bot_id, seq, speaker, text, timestamp) VALUES (@bot_id, @seq, @speaker, @text, @timestamp)`
);
const nextChunkSeq = db.prepare(
  `SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM meeting_transcript_chunks WHERE bot_id = ?`
);

// --- Recall.ai webhook payload parsing -------------------------------------
// Recall's realtime_endpoints deliver events shaped roughly like:
//   { event: "transcript.data", data: { data: { words: [...], participant: {...} }, bot: { id } } }
// This has drifted across Recall API versions, so every accessor below is
// defensive: it tries the documented shape first and falls back to a couple
// of plausible alternates rather than throwing on an unexpected payload.

function parseWebhookEvent(body) {
  const event = body?.event || body?.type || null;
  const data = body?.data || {};
  const botId = data?.bot?.id || data?.bot_id || body?.bot?.id || body?.bot_id || null;
  return { event, data, botId };
}

function extractTranscriptText(data) {
  const inner = data?.data || data;
  const words = inner?.words;
  if (Array.isArray(words) && words.length) {
    return words
      .map((w) => (typeof w === "string" ? w : w?.text))
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (typeof inner?.text === "string") return inner.text.trim();
  if (typeof inner?.transcript === "string") return inner.transcript.trim();
  return "";
}

function extractSpeaker(data) {
  const inner = data?.data || data;
  return inner?.participant?.name || inner?.speaker?.name || inner?.speaker || "Unknown speaker";
}

function extractTimestampSeconds(data) {
  const inner = data?.data || data;
  const words = inner?.words;
  const first = Array.isArray(words) ? words[0] : null;
  const stamp = first?.start_timestamp ?? inner?.timestamp;
  if (typeof stamp === "number") return stamp;
  if (stamp && typeof stamp === "object") return stamp.relative ?? stamp.absolute ?? null;
  return null;
}

function formatTimestamp(totalSeconds) {
  if (typeof totalSeconds !== "number" || !isFinite(totalSeconds) || totalSeconds < 0) return null;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

// GET /api/meetings
// Lists all meetings, most recent first — lets the frontend restore the
// Meetings page (in-progress calls, past ones) after a refresh instead of
// only ever knowing about meetings joined in the current tab session.
router.get("/", (req, res) => {
  const meetings = db.prepare(`SELECT * FROM meetings ORDER BY created_at DESC`).all();
  res.json({ meetings });
});

// POST /api/meetings/join  { meetingUrl, botName? }
// Creates a row in `meetings` immediately (status "joining"), then calls
// Recall.ai to actually send the bot. If Recall.ai fails, the row is kept
// with status "error" so the UI can show what happened instead of the
// request just vanishing.
router.post("/join", async (req, res) => {
  const { meetingUrl, botName } = req.body || {};

  if (!meetingUrl || typeof meetingUrl !== "string" || !meetingUrl.trim()) {
    return res.status(400).json({ error: "meetingUrl is required." });
  }

  if (!isRecallConfigured()) {
    return res.status(503).json({
      error: "RECALL_API_KEY is not set on the backend. Add it to .env to enable meeting bots.",
    });
  }

  const meetingId = `mtg-${nanoid(8)}`;
  const resolvedBotName = (botName && botName.trim()) || "Munin";
  const now = new Date().toISOString();

  insertMeeting.run({
    id: meetingId,
    bot_id: null,
    meeting_url: meetingUrl.trim(),
    bot_name: resolvedBotName,
    status: "joining",
  });

  try {
    const bot = await createBot({ meetingUrl: meetingUrl.trim(), botName: resolvedBotName });

    updateMeetingBotId.run({ id: meetingId, bot_id: bot.id, status: "joining" });
    insertActivity.run({
      text: `Munin was sent to join a meeting (${resolvedBotName}).`,
      created_at: now,
    });

    return res.json({
      meeting: {
        id: meetingId,
        botId: bot.id,
        meetingUrl: meetingUrl.trim(),
        botName: resolvedBotName,
        status: "joining",
      },
    });
  } catch (err) {
    updateMeetingError.run({ id: meetingId, error: err.message });
    return res.status(502).json({
      error: `Failed to send Munin to the meeting: ${err.message}`,
      meeting: { id: meetingId, status: "error" },
    });
  }
});

// GET /api/meetings/:id/status
// Reads our local row, and — if we have a bot_id — refreshes it against
// Recall.ai's live status first, so the UI always sees current state.
//
// Step 7: knowledge extraction now runs two ways from here:
//  - mid-call, throttled (see shouldRunIncrementalExtraction) — this is what
//    makes a session with real knowledge objects appear *while the meeting
//    is still going*, not just after it ends.
//  - once, the moment the bot's status is first observed to have gone
//    terminal (call_ended / done) — a final pass that catches whatever
//    hasn't been picked up yet and marks the session Complete.
// There's no reliable "call just ended" push from Recall in this setup (we
// only subscribed to transcript.data and participant events, not a status
// webhook), so both paths are driven by this polling route.
router.get("/:id/status", async (req, res) => {
  const meeting = getMeeting.get(req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found." });
  }

  if (!meeting.bot_id || !isRecallConfigured()) {
    return res.json({ meeting });
  }

  try {
    const bot = await getBotStatus(meeting.bot_id);
    // Recall's status_changes is an array of { code, created_at, ... };
    // the most recent entry's code is the bot's current state.
    const latest = Array.isArray(bot.status_changes) && bot.status_changes.length
      ? bot.status_changes[bot.status_changes.length - 1].code
      : meeting.status;

    const justWentTerminal = isTerminalStatus(latest) && !isTerminalStatus(meeting.status);

    if (latest !== meeting.status) {
      updateMeetingStatus.run({ id: meeting.id, status: latest });
    }

    if (justWentTerminal) {
      try {
        await processMeetingChunks(meeting.id, { finalize: true });
      } catch (err) {
        // The bot status itself is still valid and already saved above —
        // only the knowledge extraction failed. Surface that separately
        // instead of masking a successful status refresh as a 502.
        const fresh = getMeeting.get(meeting.id);
        return res.json({
          meeting: { ...fresh, status: latest },
          warning: `Meeting ended but knowledge extraction failed: ${err.message}`,
        });
      }
    } else if (!isTerminalStatus(latest) && shouldRunIncrementalExtraction(meeting)) {
      // Mid-call pass. Failures here shouldn't break status polling for the
      // user — just log it and let the next throttle window retry.
      try {
        await processMeetingChunks(meeting.id, { finalize: false });
      } catch (err) {
        console.error(`Incremental extraction failed for meeting ${meeting.id}:`, err.message);
      }
    }

    const fresh = getMeeting.get(meeting.id);
    return res.json({ meeting: { ...fresh, status: latest } });
  } catch (err) {
    // Don't overwrite our stored status on a transient polling error —
    // just surface it and let the UI keep showing last-known state.
    return res.status(502).json({ error: `Failed to refresh bot status: ${err.message}`, meeting });
  }
});

// POST /api/meetings/webhook
// Recall.ai posts here (see meetingBot.js's realtime_endpoints config) as
// events happen live during the call: transcript.data for every caption
// line, participant_events.join/leave for people entering/exiting. We only
// buffer data here — no LLM calls, no session creation. That processing
// step is deliberately deferred to the status-polling route above, which
// knows when the call is actually over.
//
// Always responds 200, even on a parsing hiccup — this is a webhook Recall
// will retry on failure, and a malformed/unexpected event shape here isn't
// worth spamming their retry logs over.
router.post("/webhook", (req, res) => {

  console.log(
    "WEBHOOK RECEIVED:",
    JSON.stringify(req.body, null, 2)
  );

  try {
    const { event, data, botId } = parseWebhookEvent(req.body);

    if (!botId) {
      return res.status(200).json({ received: true, ignored: "no bot id in payload" });
    }

    if (event === "transcript.data") {
      const text = extractTranscriptText(data);
      if (text) {
        const seq = nextChunkSeq.get(botId).n;
        insertChunk.run({
          bot_id: botId,
          seq,
          speaker: extractSpeaker(data),
          text,
          timestamp: formatTimestamp(extractTimestampSeconds(data)),
        });
      }
    } else if (event === "participant_events.join" || event === "participant_events.leave") {
      const meeting = getMeetingByBotId.get(botId);
      if (meeting) {
        const inner = data?.data || data;
        const name = inner?.participant?.name || "A participant";
        const action = event.endsWith("join") ? "joined" : "left";
        insertActivity.run({
          text: `${name} ${action} the meeting Munin is in (${meeting.bot_name}).`,
          created_at: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("meetings webhook error:", err);
    return res.status(200).json({ received: true, error: err.message });
  }
});

// POST /api/meetings/:id/leave
router.post("/:id/leave", async (req, res) => {
  const meeting = getMeeting.get(req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found." });
  }

  if (!meeting.bot_id) {
    return res.status(400).json({ error: "This meeting never got a bot id — nothing to leave." });
  }

  if (!isRecallConfigured()) {
    return res.status(503).json({ error: "RECALL_API_KEY is not set on the backend." });
  }

  try {
    await leaveBot(meeting.bot_id);
    updateMeetingStatus.run({ id: meeting.id, status: "call_ended" });
    insertActivity.run({
      text: `Munin left the meeting (${meeting.bot_name}).`,
      created_at: new Date().toISOString(),
    });
    try {
      await processMeetingChunks(meeting.id, { finalize: true });
    } catch (err) {
      const fresh = getMeeting.get(meeting.id);
      return res.json({
        meeting: { ...fresh, status: "call_ended" },
        warning: `Left the meeting, but knowledge extraction failed: ${err.message}`,
      });
    }
    const fresh = getMeeting.get(meeting.id);
    return res.json({ meeting: { ...fresh, status: "call_ended" } });
  } catch (err) {
    return res.status(502).json({ error: `Failed to remove bot from meeting: ${err.message}` });
  }
});

module.exports = router;
