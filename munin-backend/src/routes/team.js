const express = require("express");
const { db } = require("../db");
const { requireAuth, requireEngagementAccess, requireEngagementAdmin } = require("../middleware/auth");
const { hashPassword, generateTempPassword } = require("../services/auth");
const { sendPasswordResetNotice } = require("../services/notifications");

const router = express.Router({ mergeParams: true });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["admin", "user"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// GET /api/engagements/:id/team — any team member may view the roster.
router.get("/", requireAuth(), requireEngagementAccess("id"), async (req, res) => {
  const rows = await db.prepare(`
    SELECT u.id, u.email, u.is_owner, em.role
    FROM engagement_members em
    JOIN users u ON u.id = em.user_id
    WHERE em.engagement_id = ?
    ORDER BY u.email ASC
  `).all(req.engagement.id);
  res.json(rows);
});

// POST /api/engagements/:id/team — invite by email. If the email already
// belongs to a user in this team, this only (re)assigns their role on this
// engagement. If it's a brand new email, a user is created in the same
// team with an auto-generated password and must_reset_password=true.
router.post("/", requireAuth(), requireEngagementAdmin("id"), async (req, res) => {
  const { email, role } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

  let user = await db.prepare(`SELECT * FROM users WHERE email = ?`).get(normalizedEmail);
  let tempPassword = null;

  if (user && user.team_id !== req.user.team_id) {
    return res.status(409).json({ error: "This email belongs to an account on a different team" });
  }

  if (!user) {
    tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const result = await db.prepare(`
      INSERT INTO users (team_id, email, password_hash, is_owner, must_reset_password)
      VALUES (?, ?, ?, FALSE, TRUE)
      RETURNING id, team_id, email, password_hash, is_owner, must_reset_password
    `).run(req.user.team_id, normalizedEmail, passwordHash);
    user = result.rows[0];
    await sendPasswordResetNotice({ email: normalizedEmail, tempPassword });
  }

  await db.prepare(`
    INSERT INTO engagement_members (engagement_id, user_id, role)
    VALUES (?, ?, ?)
    ON CONFLICT (engagement_id, user_id) DO UPDATE SET role = EXCLUDED.role
  `).run(req.engagement.id, user.id, role);

  res.status(201).json({
    id: user.id,
    email: user.email,
    role,
    // Only present the moment the account is created — there is no other
    // way to retrieve it later (only its hash is ever stored).
    tempPassword: tempPassword || undefined,
  });
});

// PATCH /api/engagements/:id/team/:userId — change an existing member's role.
router.patch("/:userId", requireAuth(), requireEngagementAdmin("id"), async (req, res) => {
  const { role } = req.body || {};
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

  const membership = await db.prepare(`
    SELECT * FROM engagement_members WHERE engagement_id = ? AND user_id = ?
  `).get(req.engagement.id, req.params.userId);
  if (!membership) {
    return res.status(404).json({ error: "This user is not a member of this engagement" });
  }

  if (membership.role === "admin" && role !== "admin") {
    const adminCount = await db.prepare(`
      SELECT COUNT(*) AS c FROM engagement_members WHERE engagement_id = ? AND role = 'admin'
    `).get(req.engagement.id);
    if (adminCount.c <= 1) {
      return res.status(400).json({ error: "An engagement must keep at least one admin" });
    }
  }

  await db.prepare(`
    UPDATE engagement_members SET role = ? WHERE engagement_id = ? AND user_id = ?
  `).run(role, req.engagement.id, req.params.userId);

  res.json({ success: true });
});

// POST /api/engagements/:id/team/:userId/reset-password — the practical
// "I forgot my password" path today: an already-authenticated admin
// regenerates a temp password and shares it with the member out-of-band
// (Slack, in person, etc.). Unlike a self-service reset, this is safe to
// show the temp password in the response — the caller has already proven
// they're an admin, not just someone who typed in an email address.
router.post("/:userId/reset-password", requireAuth(), requireEngagementAdmin("id"), async (req, res) => {
  const member = await db.prepare(`
    SELECT u.* FROM engagement_members em JOIN users u ON u.id = em.user_id
    WHERE em.engagement_id = ? AND em.user_id = ?
  `).get(req.engagement.id, req.params.userId);
  if (!member) {
    return res.status(404).json({ error: "This user is not a member of this engagement" });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await db.prepare(`
    UPDATE users SET password_hash = ?, must_reset_password = TRUE, updated_at = NOW() WHERE id = ?
  `).run(passwordHash, member.id);
  await sendPasswordResetNotice({ email: member.email, tempPassword });

  res.json({ email: member.email, tempPassword });
});

// DELETE /api/engagements/:id/team/:userId — remove a member's access to
// this one engagement (does not delete the user account itself).
router.delete("/:userId", requireAuth(), requireEngagementAdmin("id"), async (req, res) => {
  const membership = await db.prepare(`
    SELECT * FROM engagement_members WHERE engagement_id = ? AND user_id = ?
  `).get(req.engagement.id, req.params.userId);
  if (!membership) {
    return res.status(404).json({ error: "This user is not a member of this engagement" });
  }

  if (membership.role === "admin") {
    const adminCount = await db.prepare(`
      SELECT COUNT(*) AS c FROM engagement_members WHERE engagement_id = ? AND role = 'admin'
    `).get(req.engagement.id);
    if (adminCount.c <= 1) {
      return res.status(400).json({ error: "An engagement must keep at least one admin" });
    }
  }

  await db.prepare(`
    DELETE FROM engagement_members WHERE engagement_id = ? AND user_id = ?
  `).run(req.engagement.id, req.params.userId);

  res.json({ success: true });
});

module.exports = router;
