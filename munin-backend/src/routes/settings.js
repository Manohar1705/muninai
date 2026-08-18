const express = require("express");
const { isGroqConfigured } = require("../services/ai-core/llm");
const { isRecallConfigured, buildWebhookUrl } = require("../services/meetingBot");
const { isLangfuseConfigured } = require("../services/observability");

const router = express.Router();

// GET /api/settings/status — surfaces which optional integrations are
// actually configured, so the frontend can warn *before* something fails
// silently (e.g. joining a meeting with no webhook URL captures nothing).
router.get("/status", (req, res) => {
  res.json({
    groqConfigured: isGroqConfigured(),
    recallConfigured: isRecallConfigured(),
    meetingWebhookConfigured: Boolean(buildWebhookUrl()),
    langfuseConfigured: isLangfuseConfigured(),
  });
});

module.exports = router;
