const express = require("express");
const { db } = require("../db");
const { listModules } = require("../services/modules");

const router = express.Router();

router.get("/", (req, res) => {
  const modulesCovered = db.prepare(`
    SELECT COUNT(DISTINCT module) AS c
    FROM sessions
    WHERE source_type IN ('kt_session', 'meeting')
  `).get().c;

  const plannedSessions = db.prepare(`
    SELECT COALESCE(SUM(planned_sessions), 0) AS c
    FROM modules
  `).get().c;

  const completedSessions = db.prepare(`
    SELECT COUNT(*) AS c
    FROM sessions
    WHERE source_type IN ('kt_session', 'meeting')
  `).get().c;
  const readiness = {};

  const modules = listModules();

  for (const module of modules) {
    const completed = module.completed_sessions || 0;

    const planned = module.planned_sessions || 0;

    const score =
      planned > 0
        ? Math.min(
            100,
            Math.round(
              (completed / planned) * 100
            )
          )
        : 0;

    readiness[module.name] = score;
  }

  const overall =
    plannedSessions > 0
      ? Math.min(
          100,
          Math.round(
            (completedSessions / plannedSessions) * 100
          )
        )
      : 0;


  const activity = db
    .prepare(`SELECT text, created_at AS createdAt FROM activity ORDER BY id DESC LIMIT 12`)
    .all();

  res.json({
    stats: {
      modulesCovered,
      plannedSessions,
      completedSessions,
      overallReadiness: overall,
    },
    readiness,
    activity,
  });
});

module.exports = router;
