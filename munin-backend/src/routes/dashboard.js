const express = require("express");
const { db } = require("../db");
const { listModules } = require("../services/modules");

const router = express.Router();

// GET /api/dashboard?engagementId=1 — the quantitative coverage pipeline for
// one engagement: modules are the source of truth, so every number here is
// derived from listModules(engagementId) (planned vs. actually covered
// sessions per module) rather than a separate, independently-tracked score.
router.get("/", (req, res) => {
  const engagementId = req.query.engagementId ? Number(req.query.engagementId) : undefined;
  const modules = listModules(engagementId);

  const modulesCovered = modules.filter((m) => (m.completed_sessions || 0) > 0).length;
  const plannedSessions = modules.reduce((sum, m) => sum + (m.planned_sessions || 0), 0);
  const completedSessions = modules.reduce((sum, m) => sum + (m.completed_sessions || 0), 0);

  // Per-module readiness carries the raw session counts alongside the
  // percentage — a bare "33%" has no functional meaning on its own, but
  // "2 / 6 sessions" does.
  const readiness = {};
  for (const module of modules) {
    const completed = module.completed_sessions || 0;
    const planned = module.planned_sessions || 0;
    readiness[module.name] = {
      pct: planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0,
      completed,
      planned,
    };
  }

  const overall = plannedSessions > 0
    ? Math.min(100, Math.round((completedSessions / plannedSessions) * 100))
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
