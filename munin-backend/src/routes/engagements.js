const express = require("express");
const { db } = require("../db");
const { listModules } = require("../services/modules");
const { requireAuth, requireOwner, requireEngagementAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth());

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
      SELECT e.id, e.name, e.phase, e.details, em.role AS member_role
      FROM engagements e
      LEFT JOIN engagement_members em ON em.engagement_id = e.id AND em.user_id = ?
      WHERE e.team_id = ?
      ORDER BY e.created_at DESC
    `)
    .all(req.user.id, req.user.team_id);

  // The team owner is always admin everywhere; anyone else falls back to
  // "user" if they were never explicitly added to this engagement (they
  // can still view it — team visibility isn't membership-gated — but the
  // frontend uses this to hide admin-only pages for them).
  const result = await Promise.all(
    rows.map(async ({ member_role, ...row }) => ({
      ...row,
      role: req.user.is_owner ? "admin" : (member_role || "user"),
      stats: await summarizeEngagement(row.id),
    }))
  );
  res.json(result);
});
router.post("/", requireOwner, async (req, res) => {
  const { name, phase, details } = req.body || {};

  if (!name || !phase) {
    return res.status(400).json({
      error: "name and phase are required",
    });
  }

  const result = await db
    .prepare(`
      INSERT INTO engagements (name, phase, details, team_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `)
    .run(name.trim(), phase.trim(), (details || "").trim(), req.user.team_id);

  const engagement = await db
    .prepare(`
      SELECT *
      FROM engagements
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  // The creator is always an admin on their own engagement (redundant with
  // the isOwner bypass, but keeps Team Setup's member list accurate).
  await db.prepare(`
    INSERT INTO engagement_members (engagement_id, user_id, role)
    VALUES (?, ?, 'admin')
    ON CONFLICT (engagement_id, user_id) DO NOTHING
  `).run(engagement.id, req.user.id);

  res.json({ ...engagement, stats: await summarizeEngagement(engagement.id) });
});
router.patch("/:id", requireEngagementAdmin("id"), async (req, res) => {
  const { name, details } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "name is required",
    });
  }

  const existing = req.engagement;

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
router.delete("/:id", requireEngagementAdmin("id"), async (req, res) => {
  const engagement = req.engagement;

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