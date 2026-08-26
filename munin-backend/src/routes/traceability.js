const express = require("express");
const { db } = require("../db");
const router = express.Router();

function observationEngagementId(obs) {
  const value = obs.metadata?.engagementId || obs.trace?.metadata?.engagementId || obs.trace?.sessionId;
  return String(value || "").replace(/^engagement:/, "");
}

// GET /api/traceability/traces — pulls recent traces from Langfuse's
// Public API so they can be shown inside our own app instead of
// requiring a visit to cloud.langfuse.com. Internal/debug use only.
router.get("/traces", async (req, res) => {
  const engagementId = Number(req.query.engagementId);
  if (!Number.isInteger(engagementId) || engagementId < 1) {
    return res.status(400).json({ error: "engagementId is required." });
  }

  const engagement = await db.prepare(`SELECT id, team_id FROM engagements WHERE id = ?`).get(engagementId);
  if (!engagement || engagement.team_id !== req.user.team_id) {
    return res.status(404).json({ error: "Engagement not found" });
  }

  if (!req.user.is_owner) {
    const membership = await db.prepare(`
      SELECT role FROM engagement_members WHERE engagement_id = ? AND user_id = ?
    `).get(engagementId, req.user.id);
    if (membership?.role !== "admin") {
      return res.status(403).json({ error: "Admin role required on this engagement" });
    }
  }

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

  if (!publicKey || !secretKey) {
    return res.status(400).json({ error: "Langfuse is not configured." });
  }

  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    // Run both Langfuse calls in parallel instead of one after another —
    // they're independent, so there's no need to wait for observations
    // before starting the scores request.
    const [response, scoresRes] = await Promise.all([
      fetch(`${baseUrl}/api/public/observations?limit=100&type=GENERATION`, {
        headers: { Authorization: `Basic ${auth}` },
      }),
      fetch(`${baseUrl}/api/public/scores?limit=50`, {
        headers: { Authorization: `Basic ${auth}` },
      }),
    ]);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return res.status(response.status).json({ error: `Langfuse API error: ${errText}` });
    }

    const data = await response.json();
    const scoresData = scoresRes.ok ? await scoresRes.json() : { data: [] };
    const scoreByTraceId = {};
    for (const s of scoresData.data || []) {
      if (s.traceId && s.name === "answer-quality") scoreByTraceId[s.traceId] = s.value;
    }

    const scoped = (data.data || []).filter((obs) => observationEngagementId(obs) === String(engagementId));
    const mapped = scoped.slice(0, 20).map((obs) => ({
      id: obs.id,
      name: obs.name,
      timestamp: obs.startTime,
      metadata: { model: obs.model, engagementId },
      totalCost: obs.calculatedTotalCost ?? 0,
      latency: obs.latency,
      totalTokens: obs.usage?.total ?? obs.usageDetails?.total ?? null,
      score: scoreByTraceId[obs.traceId] ?? null,
    }));
    res.json({ data: mapped });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return res.status(504).json({
        error: "Insights are taking longer than usual to load. Please try again in a moment.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;