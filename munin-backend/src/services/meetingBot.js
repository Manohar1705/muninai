// Thin wrapper around Recall.ai's Meeting Bot API.
//
// Scope of this file (Step 3 only): get a bot into a meeting and let us
// check on it. It does NOT touch the database and does NOT define any
// routes — meetings.js (Step 4) will call these functions from
// POST /api/meetings/join, and the webhook handler (Step 5) will consume
// the transcript.data events this bot is configured to send.
//
// Docs: https://docs.recall.ai/docs/quickstart

const RECALL_API_REGION = process.env.RECALL_API_REGION || "us-west-2";
const RECALL_BASE_URL = `https://${RECALL_API_REGION}.recall.ai/api/v1`;

function isRecallConfigured() {
  return Boolean(process.env.RECALL_API_KEY);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    // Recall's auth header is the raw key prefixed with "Token" — NOT "Bearer".
    Authorization: `Token ${process.env.RECALL_API_KEY}`,
  };
}

// Builds the public URL Recall.ai should POST real-time transcript events
// (and participant join/leave events) to. Requires PUBLIC_BASE_URL to be a
// publicly reachable address — a static ngrok domain in local dev, or your
// real deployed URL in production. Returns null if not configured, in which
// case createBot() below still works, just without real-time delivery.
function buildWebhookUrl() {
  const base = process.env.PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/meetings/webhook`;
}

/**
 * Sends Munin into a meeting.
 * @param {Object} opts
 * @param {string} opts.meetingUrl - Zoom / Google Meet / Teams invite link.
 * @param {string} [opts.botName] - Display name the bot joins as. Defaults to "Munin".
 * @returns {Promise<Object>} the raw Recall.ai bot object, including its `id`.
 */
async function createBot({ meetingUrl, botName }) {
  if (!isRecallConfigured()) {
    throw new Error("RECALL_API_KEY is not set — cannot create a meeting bot.");
  }
  if (!meetingUrl || typeof meetingUrl !== "string") {
    throw new Error("meetingUrl is required to create a bot.");
  }

  const webhookUrl = buildWebhookUrl();

  const body = {
    meeting_url: meetingUrl,
    bot_name: botName || "Munin",
    recording_config: {
      // meeting_captions reuses the video platform's own native captions
      // (Zoom/Meet/Teams) — no third-party transcription API key needed,
      // which keeps this free-tier friendly like the Groq extraction step.
      transcript: {
        provider: { meeting_captions: {} },
      },
    },
  };

  if (webhookUrl) {
    body.recording_config.realtime_endpoints = [
      {
        type: "webhook",
        url: webhookUrl,
        events: [
          "transcript.data",
          "participant_events.join",
          "participant_events.leave",
        ],
      },
    ];
  }

  const response = await fetch(`${RECALL_BASE_URL}/bot/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Recall.ai create-bot failed (${response.status}): ${errText}`);
  }

  return response.json(); // { id, meeting_url, status_changes: [...], ... }
}

/**
 * Polls the current status of a bot (joining, in_call, call_ended, done, etc).
 * @param {string} botId
 */
async function getBotStatus(botId) {
  if (!isRecallConfigured()) {
    throw new Error("RECALL_API_KEY is not set — cannot check bot status.");
  }
  if (!botId) {
    throw new Error("botId is required.");
  }

  const response = await fetch(`${RECALL_BASE_URL}/bot/${botId}/`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Recall.ai get-bot-status failed (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Pulls Munin out of a meeting early (e.g. user clicks "end session" in the UI).
 * @param {string} botId
 */
async function leaveBot(botId) {
  if (!isRecallConfigured()) {
    throw new Error("RECALL_API_KEY is not set — cannot remove bot.");
  }
  if (!botId) {
    throw new Error("botId is required.");
  }

  const response = await fetch(`${RECALL_BASE_URL}/bot/${botId}/leave_call/`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Recall.ai leave-call failed (${response.status}): ${errText}`);
  }

  return true;
}

module.exports = {
  isRecallConfigured,
  createBot,
  getBotStatus,
  leaveBot,
  buildWebhookUrl,
};
