const express = require("express");
const { db } = require("../db");
const { listModules } = require("../services/modules");

const router = express.Router();

// Quantitative "pipeline" summary for one engagement: how many modules are
// defined, how many sessions are planned vs. actually covered across them,
// and the resulting overall coverage percentage. This is the same ratio the
// Dashboard page shows, surfaced here so the Starter page can list every
// engagement's progress without opening each one.
async function summarizeEngagement(engagementId) {
  const modules = await listModules(engagementId);
  const plannedSessions = modules.reduce((sum, m) => sum + (m.planned_sessions || 0), 0);
  const completedSessions = modules.reduce((sum, m) => sum + (m.completed_sessions || 0), 0);
  const overallCoverage = plannedSessions > 0
    ? Math.min(100, Math.round((completedSessions / plannedSessions) * 100))
    : 0;

  return {
    moduleCount: modules.length,
    plannedSessions,
    completedSessions,
    overallCoverage,
  };
}

router.get("/", async (req, res) => {
  const rows = await db
    .prepare(`
      SELECT id, name, phase, details
      FROM engagements
      ORDER BY created_at DESC
    `)
    .all();

  const result = await Promise.all(
    rows.map(async (row) => ({ ...row, stats: await summarizeEngagement(row.id) }))
  );
  res.json(result);
});
router.post("/", async (req, res) => {
  const { name, phase, details } = req.body || {};

  if (!name || !phase) {
    return res.status(400).json({
      error: "name and phase are required",
    });
  }

  const result = await db
    .prepare(`
      INSERT INTO engagements (name, phase, details)
      VALUES (?, ?, ?)
      RETURNING id
    `)
    .run(name.trim(), phase.trim(), (details || "").trim());

  const engagement = await db
    .prepare(`
      SELECT *
      FROM engagements
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.json({ ...engagement, stats: await summarizeEngagement(engagement.id) });
});
router.patch("/:id", async (req, res) => {
  const { name, details } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "name is required",
    });
  }

  const existing = await db
    .prepare(`SELECT * FROM engagements WHERE id = ?`)
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      error: "Engagement not found",
    });
  }

  await db.prepare(`
    UPDATE engagements
    SET name = ?, details = ?
    WHERE id = ?
  `).run(name.trim(), details !== undefined ? String(details).trim() : existing.details, req.params.id);

  const updated = await db
    .prepare(`SELECT * FROM engagements WHERE id = ?`)
    .get(req.params.id);

  res.json({ ...updated, stats: await summarizeEngagement(updated.id) });
});

// DELETE /api/engagements/:id — only allowed when nothing has been
// captured under it yet: no sessions and no meetings at all (any source
// type — KT session, meeting, document, or recording), not just the
// stricter "completed_sessions" definition used elsewhere. An engagement
// delete is more destructive (cascades modules/sessions/meetings via
// ON DELETE CASCADE), so this errs on the safe side.
router.delete("/:id", async (req, res) => {
  const engagement = await db.prepare(`SELECT * FROM engagements WHERE id = ?`).get(req.params.id);
  if (!engagement) {
    return res.status(404).json({ error: "Engagement not found" });
  }

  const usage = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sessions WHERE engagement_id = ?) +
      (SELECT COUNT(*) FROM meetings WHERE engagement_id = ?) AS count
  `).get(req.params.id, req.params.id);

  if (usage.count > 0) {
    return res.status(400).json({
      error: `Cannot delete "${engagement.name}" — ${usage.count} session(s)/meeting(s) have already been captured under it.`,
    });
  }

  await db.prepare(`DELETE FROM engagements WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;