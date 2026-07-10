const express = require("express");
const { resetDemoData } = require("../db");
const { isGroqConfigured } = require("../services/llm");
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

// POST /api/settings/reset — wipes and re-seeds all demo data so the
// walkthrough (including the Session 9 upload) is repeatable.
router.post("/reset", (req, res) => {
  resetDemoData();
  res.json({ ok: true, message: "Demo data reset to initial seed state." });
});

module.exports = router;
