const express = require("express");
const { db } = require("../db");
const { listModules } = require("../services/modules");

const router = express.Router();

router.get("/", (req, res) => {
  const engagements = db.prepare(`SELECT name, phase FROM engagements WHERE id = 1`).get();

  const sessionCount = db.prepare(`SELECT COUNT(*) AS c FROM sessions`).get().c;
  const segmentCount = db.prepare(`SELECT COUNT(*) AS c FROM transcript_segments`).get().c;
  const koCount = db.prepare(`SELECT COUNT(*) AS c FROM knowledge_objects`).get().c;
  const needsReviewCount = db.prepare(`SELECT COUNT(*) AS c FROM knowledge_objects WHERE needs_review = 1`).get().c;
  const totalGaps = db.prepare(`SELECT COUNT(*) AS c FROM gaps`).get().c;
  const openGaps = db.prepare(`SELECT COUNT(*) AS c FROM gaps WHERE status != 'Closed'`).get().c;
  const readinessRows = db
  .prepare(`SELECT module, score FROM readiness WHERE score > 0`)
  .all();

  const readiness = {};

  for (const r of readinessRows) {
    readiness[r.module] = r.score;
  }

  const scores = Object.values(readiness);

  const overall = Math.round(
    scores.reduce((a, b) => a + b, 0) / (scores.length || 1)
  );

  const activity = db
    .prepare(`SELECT text, created_at AS createdAt FROM activity ORDER BY id DESC LIMIT 12`)
    .all();

  res.json({
    engagements,
    stats: {
      sessionsProcessed: sessionCount,
      transcriptSegments: segmentCount,
      knowledgeObjects: koCount,
      needsReview: needsReviewCount,
      openGaps,
      totalGaps,
      overallReadiness: overall,
    },
    readiness,
    activity,
  });
});

module.exports = router;
