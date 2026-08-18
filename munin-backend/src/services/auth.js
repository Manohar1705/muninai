// Shared password + JWT helpers used by auth routes, middleware, and the
// Team Setup invite flow.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const CLIENT_SECRET = process.env.CLIENT_SECRET;
if (!CLIENT_SECRET) {
  throw new Error("Missing required environment variable: CLIENT_SECRET. See .env.example.");
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Human-typeable, still high entropy (~70 bits) — used for Team Setup's
// auto-generated passwords and the one-off legacy admin backfill.
function generateTempPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, teamId: user.team_id, email: user.email, isOwner: user.is_owner },
    CLIENT_SECRET
  );
}

function verifyToken(token) {
  return jwt.verify(token, CLIENT_SECRET);
}

module.exports = { hashPassword, verifyPassword, generateTempPassword, signToken, verifyToken };
