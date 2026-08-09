const express = require("express");
const router = express.Router();

// GET /api/traceability/traces — pulls recent traces from Langfuse's
// Public API so they can be shown inside our own app instead of
// requiring a visit to cloud.langfuse.com. Internal/debug use only.
router.get("/traces", async (req, res) => {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

  if (!publicKey || !secretKey) {
    return res.status(400).json({ error: "Langfuse is not configured." });
  }

  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  try {
    const response = await fetch(`${baseUrl}/api/public/observations?limit=20&type=GENERATION`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return res.status(response.status).json({ error: `Langfuse API error: ${errText}` });
    }

    const data = await response.json();

    // One extra call for scores (not per-trace — same rate-limit-safe
    // pattern as observations above), then match each score to its trace.
    const scoresRes = await fetch(`${baseUrl}/api/public/scores?limit=50`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const scoresData = scoresRes.ok ? await scoresRes.json() : { data: [] };
    const scoreByTraceId = {};
    for (const s of scoresData.data || []) {
      if (s.traceId && s.name === "answer-quality") scoreByTraceId[s.traceId] = s.value;
    }

    const mapped = (data.data || []).map((obs) => ({
      id: obs.id,
      name: obs.name,
      timestamp: obs.startTime,
      metadata: { model: obs.model },
      totalCost: obs.calculatedTotalCost ?? 0,
      latency: obs.latency,
      totalTokens: obs.usage?.total ?? obs.usageDetails?.total ?? null,
      score: scoreByTraceId[obs.traceId] ?? null,
    }));
    res.json({ data: mapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;