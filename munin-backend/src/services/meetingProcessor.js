// Step 5 (original): turn a finished meeting's buffered transcript into a
// real session, once, at call end.
//
// Step 7 improvement: this now also runs *during* the call, not just after
// it ends. POST /api/meetings/webhook appends every transcript.data event
// into meeting_transcript_chunks as it arrives. Previously nothing touched
// those chunks until the call went terminal — "real-time KT" was really
// "KT available a few seconds after the call ends." Now, GET /:id/status
// (see routes/meetings.js) also calls processMeetingChunks() mid-call,
// throttled, so a session with real knowledge objects starts appearing
// *while the meeting is still happening*, and just keeps growing until the
// call ends.
//
// processMeetingChunks() is idempotent and incremental: it only ever looks
// at transcript chunks with seq > meetings.last_extracted_seq, so calling it
// repeatedly (mid-call polls + the final call-end pass) never re-extracts
// the same lines twice.

const { nanoid } = require("nanoid");
const { db } = require("../db");
const { isGroqConfigured, extractKnowledgeFromText } = require("./llm");
const { bumpReadinessForKnowledgeObjects } = require("./readiness");
const { guessModule } = require("./keywordMatch");
const { listModules} = require("./modules");

const TERMINAL_STATUSES = new Set(["call_ended", "done"]);
function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

// Don't run extraction more than once per this window while a call is still
// in progress — keeps a fast-polling frontend from hammering the LLM.
const INCREMENTAL_THROTTLE_MS = 45_000;

function shouldRunIncrementalExtraction(meeting) {
  if (!meeting.last_extracted_at) return true;
  return Date.now() - new Date(meeting.last_extracted_at).getTime() >= INCREMENTAL_THROTTLE_MS;
}

function getNewChunks(botId, afterSeq) {
  return db
    .prepare(`SELECT * FROM meeting_transcript_chunks WHERE bot_id = ? AND seq > ? ORDER BY seq ASC, id ASC`)
    .all(botId, afterSeq);
}

function formatTimestamp(totalSeconds) {
  if (typeof totalSeconds !== "number" || !isFinite(totalSeconds) || totalSeconds < 0) {
    return "00:00:00";
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
function resolveSessionTitle(meeting) {
  if (meeting.meeting_title) return meeting.meeting_title;
  const when = new Date(meeting.created_at);
  const formatted = isNaN(when.getTime())
    ? "Live meeting"
    : when.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `Meeting — ${formatted}`;
}

const getMeetingById = db.prepare(`SELECT * FROM meetings WHERE id = ?`);
const insertActivity = db.prepare(`INSERT INTO activity (text, created_at) VALUES (@text, @created_at)`);
const insertSession = db.prepare(
  `INSERT INTO sessions (id, num, module, title, date, duration, status, attendees, source_type, engagement_id)
   VALUES (@id, @num, @module, @title, @date, @duration, @status, @attendees, @source_type, @engagement_id)`
);
const setSessionComplete = db.prepare(`UPDATE sessions SET status = 'Complete' WHERE id = ?`);
const setSessionAttendees = db.prepare(`UPDATE sessions SET attendees = ? WHERE id = ?`);
const insertSegment = db.prepare(
  `INSERT INTO transcript_segments (session_id, seq, timestamp, speaker, text) VALUES (@session_id, @seq, @timestamp, @speaker, @text)`
);
const insertKO = db.prepare(
  `INSERT INTO knowledge_objects (id, title, type, module, description, confidence, needs_review, source, session_id, segment_timestamp, speaker)
   VALUES (@id, @title, @type, @module, @description, @confidence, @needs_review, @source, @session_id, @segment_timestamp, @speaker)`
);
const nextNum = db.prepare(`SELECT COALESCE(MAX(num), 0) + 1 AS n FROM sessions`);
const nextSegSeq = db.prepare(`SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM transcript_segments WHERE session_id = ?`);
const stampThrottle = db.prepare(`UPDATE meetings SET last_extracted_at = ? WHERE id = ?`);
const recordProgress = db.prepare(
  `UPDATE meetings SET session_id = @session_id, last_extracted_seq = @last_extracted_seq, last_extracted_at = @last_extracted_at, updated_at = datetime('now') WHERE id = @id`
);
const distinctSpeakers = db.prepare(`SELECT DISTINCT speaker FROM meeting_transcript_chunks WHERE bot_id = ? AND speaker IS NOT NULL`);

/**
 * Processes whatever transcript has accumulated since this meeting was last
 * processed (i.e. chunks with seq > last_extracted_seq). Safe to call
 * repeatedly — each call only ever advances past chunks it has actually
 * extracted, so nothing is double-counted.
 *
 * @param {string} meetingId
 * @param {Object} [opts]
 * @param {boolean} [opts.finalize] - true when called because the call just
 *   ended. Marks the session Complete and logs a "meeting ended" activity
 *   line even when there's nothing new to extract.
 * @returns {Promise<{sessionId: string, knowledgeObjects: Array, isFirstPass: boolean}|null>}
 */
async function processMeetingChunks(meetingId, { finalize = false } = {}) {
  const meeting = getMeetingById.get(meetingId);
  if (!meeting || !meeting.bot_id) return null;

  const newChunks = getNewChunks(meeting.bot_id, meeting.last_extracted_seq);

  if (!newChunks.length) {
    if (finalize && !meeting.session_id) {
      insertActivity.run({
        text: `Munin's meeting "${meeting.bot_name}" ended with no captured transcript (no captions were received).`,
        created_at: new Date().toISOString(),
      });
    } else if (finalize && meeting.session_id) {
      setSessionComplete.run(meeting.session_id);
      insertActivity.run({
        text: `Meeting "${meeting.bot_name}" ended.`,
        created_at: new Date().toISOString(),
      });
    }
    return null;
  }

  if (!isGroqConfigured()) {
    if (finalize) {
      insertActivity.run({
        text: `Meeting "${meeting.bot_name}" ended — transcript captured (${newChunks.length} new line(s)) but GROQ_API_KEY isn't set, so no knowledge was extracted.`,
        created_at: new Date().toISOString(),
      });
    }
    return null; // last_extracted_seq untouched — retried automatically once a key is added
  }

  // Stamp the throttle window *before* the (potentially slow) LLM call, so
  // a call that throws still enforces a cooldown instead of being retried
  // on every subsequent status poll. last_extracted_seq is deliberately
  // left alone here — these chunks get folded into the next attempt.
  const attemptedAt = new Date().toISOString();
  stampThrottle.run(attemptedAt, meeting.id);

  const transcriptText = newChunks.map((c) => `${c.speaker}: ${c.text}`).join("\n");
  // Let extraction errors propagate — the caller decides how to surface
  // them (see routes/meetings.js), same as the original design.
  const knowledgeObjects = await extractKnowledgeFromText(transcriptText, meeting.bot_name, meeting.engagement_id);

  const now = new Date();
  const isFirstPass = !meeting.session_id;
  const sessionId = meeting.session_id || `mtg-sess-${nanoid(8)}`;
  const sourceLabel = `${meeting.bot_name} (live meeting)`;
  // Classify the meeting into one of THIS engagement's defined modules only
  // (never the free-text meeting title, which is just a display name the
  // user typed at join time). Once a real classification has been made,
  // keep it stable across later incremental passes rather than re-guessing
  // from whatever the latest chunk happens to contain — it only keeps
  // trying while the meeting is still sitting in "Unclassified".
  let meetingTopic = meeting.module;
  if (!meetingTopic || meetingTopic === "Unclassified") {
    meetingTopic = guessModule(transcriptText, listModules(meeting.engagement_id).map((m) => m.name));
  }
  db.prepare(`
    UPDATE meetings
    SET module = ?
    WHERE id = ?
  `).run(meetingTopic, meeting.id);
  if (meeting.session_id) {
    db.prepare(`
      UPDATE sessions
      SET module = ?
      WHERE id = ?
    `).run(meetingTopic, meeting.session_id);
  }
  const savedKOs = [];
  const tx = db.transaction(() => {
    if (isFirstPass) {
      insertSession.run({
        id: sessionId,
        num: nextNum.get().n,
        module: meetingTopic,
        title: resolveSessionTitle(meeting),
        date: now.toISOString().slice(0, 10),
        duration: "N/A",
        status: finalize ? "Complete" : "In Progress",
        attendees: JSON.stringify([]),
        source_type: "meeting",
        engagement_id: meeting.engagement_id,
      });
    } else if (finalize) {
      setSessionComplete.run(sessionId);
    }

    let seq = nextSegSeq.get(sessionId).n;
    for (const c of newChunks) {
      insertSegment.run({
        session_id: sessionId,
        seq: seq,
        timestamp: c.timestamp || formatTimestamp(seq * 5),
        speaker: c.speaker,
        text: c.text,
      });
      seq += 1;
    }

    // Never trust the LLM's speaker claim blindly — only accept it if it
    // exactly matches (case-insensitively) someone who actually has a line
    // in this meeting's transcript. Anything else (a hallucinated or
    // paraphrased name) is dropped rather than stored as a false attribution.
    const knownSpeakers = new Map(
      distinctSpeakers.all(meeting.bot_id).map((r) => [String(r.speaker || "").trim().toLowerCase(), r.speaker])
    );
    const resolveSpeaker = (claimed) => {
      if (!claimed) return null;
      return knownSpeakers.get(claimed.trim().toLowerCase()) || null;
    };

    for (const k of knowledgeObjects) {
      const koId = `ko-${nanoid(8)}`;
      insertKO.run({
        id: koId,
        title: k.title,
        type: k.type,
        module: meetingTopic,
        description: k.description,
        confidence: k.confidence,
        needs_review: k.confidence < 0.6 ? 1 : 0,
        source: sourceLabel,
        session_id: sessionId,
        segment_timestamp: null,
        speaker: resolveSpeaker(k.speaker),
      });
      savedKOs.push({ id: koId, ...k, module: meetingTopic, needsReview: k.confidence < 0.6, source: sourceLabel });
    }

    // Refresh attendees from the full chunk history each pass — cheap, and
    // keeps the session's attendee line accurate as new speakers join.
    const attendees = distinctSpeakers.all(meeting.bot_id).map((r) => r.speaker).filter(Boolean);
    setSessionAttendees.run(JSON.stringify(attendees.length ? attendees : ["Meeting participant"]), sessionId);

    const lastSeq = newChunks[newChunks.length - 1].seq;
    recordProgress.run({ id: meeting.id, session_id: sessionId, last_extracted_seq: lastSeq, last_extracted_at: attemptedAt });

    insertActivity.run({
      text: finalize
        ? `Meeting "${meeting.bot_name}" ended — ${knowledgeObjects.length} knowledge object(s) extracted in the final pass.`
        : `Meeting "${meeting.bot_name}" is still in progress — ${knowledgeObjects.length} new knowledge object(s) extracted live.`,
      created_at: now.toISOString(),
    });
  });
  tx();

  bumpReadinessForKnowledgeObjects(savedKOs);

  return { sessionId, knowledgeObjects: savedKOs, isFirstPass };
}

module.exports = { processMeetingChunks, isTerminalStatus, shouldRunIncrementalExtraction };
