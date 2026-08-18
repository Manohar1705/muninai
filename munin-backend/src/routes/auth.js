const express = require("express");
const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { hashPassword, verifyPassword, generateTempPassword, signToken } = require("../services/auth");
const { sendPasswordResetNotice } = require("../services/notifications");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const FORGOT_PASSWORD_COOLDOWN_MS = 60 * 1000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function serializeUser(user, team) {
  return {
    id: user.id,
    email: user.email,
    teamId: user.team_id,
    teamName: team?.name,
    isOwner: user.is_owner,
    mustResetPassword: user.must_reset_password,
  };
}

// POST /api/auth/register — first-time flow: creates a brand new team and
// its owner user in one step. There is no separate "create team" endpoint;
// registering IS creating a team, matching the "for first timers" flow.
router.post("/register", async (req, res) => {
  const { teamName, email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!teamName || !teamName.trim()) {
    return res.status(400).json({ error: "teamName is required" });
  }
  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const existing = await db.prepare(`SELECT id FROM users WHERE email = ?`).get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await hashPassword(password);

  const registerTx = db.transaction(async () => {
    const team = await db.prepare(`INSERT INTO teams (name) VALUES (?) RETURNING id`).run(teamName.trim());
    const user = await db.prepare(`
      INSERT INTO users (team_id, email, password_hash, is_owner, must_reset_password)
      VALUES (?, ?, ?, TRUE, FALSE)
      RETURNING id, team_id, email, password_hash, is_owner, must_reset_password
    `).run(team.lastInsertRowid, normalizedEmail, passwordHash);
    return { teamId: team.lastInsertRowid, user: user.rows[0] };
  });

  const { teamId, user } = await registerTx();
  const token = signToken(user);
  res.status(201).json({ token, user: serializeUser(user, { name: teamName.trim(), id: teamId }) });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).get(normalizedEmail);
  const valid = user && (await verifyPassword(password || "", user.password_hash));
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const team = await db.prepare(`SELECT * FROM teams WHERE id = ?`).get(user.team_id);
  const token = signToken(user);
  res.json({ token, user: serializeUser(user, team) });
});

// In-memory per-email cooldown so an anonymous caller can't repeatedly
// invalidate a real user's password (a self-DoS on their account) by
// spamming this endpoint. Single-instance only — a multi-instance deploy
// needs a shared store (DB/Redis) instead.
const forgotPasswordCooldowns = new Map();

// POST /api/auth/forgot-password — deliberately answers identically
// whether or not the email has an account, and never returns the temp
// password in the response: doing either would let anyone take over any
// account just by knowing their email (no proof of inbox ownership). If
// the account exists, a temp password is generated and handed to
// sendPasswordResetNotice — today that's a console-log stub (see
// services/notifications.js); until a real email provider is wired up,
// use Team Setup's admin-triggered reset instead, or check the server log.
router.post("/forgot-password", async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  const genericResponse = {
    message: "If an account exists for that email, a temporary password has been sent. " +
      "If you don't have an account yet, ask your engagement admin to add you in Team Setup.",
  };

  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.json(genericResponse);
  }

  const lastRequestAt = forgotPasswordCooldowns.get(normalizedEmail);
  if (lastRequestAt && Date.now() - lastRequestAt < FORGOT_PASSWORD_COOLDOWN_MS) {
    return res.json(genericResponse);
  }
  forgotPasswordCooldowns.set(normalizedEmail, Date.now());

  const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).get(normalizedEmail);
  if (user) {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, must_reset_password = TRUE, updated_at = NOW() WHERE id = ?
    `).run(passwordHash, user.id);
    await sendPasswordResetNotice({ email: normalizedEmail, tempPassword });
  }

  res.json(genericResponse);
});

// GET /api/auth/me — reachable even mid forced-reset, so the frontend can
// render "you're logged in as X" on the reset-password screen.
router.get("/me", requireAuth({ allowPendingReset: true }), async (req, res) => {
  const team = await db.prepare(`SELECT * FROM teams WHERE id = ?`).get(req.user.team_id);
  res.json({ user: serializeUser(req.user, team) });
});

// POST /api/auth/reset-password — used both for the forced first-login
// reset (Team Setup-issued temp password) and any later voluntary change.
// Always requires the current password, even mid forced-reset, so a leaked
// JWT alone can't be used to take over the account.
router.post("/reset-password", requireAuth({ allowPendingReset: true }), async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  const valid = await verifyPassword(currentPassword || "", req.user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const newHash = await hashPassword(newPassword);
  await db.prepare(`
    UPDATE users SET password_hash = ?, must_reset_password = FALSE, updated_at = NOW() WHERE id = ?
  `).run(newHash, req.user.id);

  res.json({ success: true });
});

module.exports = router;

