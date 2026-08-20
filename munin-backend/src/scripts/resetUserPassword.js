// CLI-only account recovery: resets one user's password and prints the new
// temp password to this terminal. Deliberately NOT an HTTP endpoint — the
// security boundary here is "you already have terminal/DB access to the
// deployment", not "you know someone's email address". Exposing this over
// the network (even behind a generic response) would let anyone take over
// any account just by knowing their email, or enumerate which emails have
// accounts — see routes/auth.js's forgot-password route for the same
// reasoning. This is the fix for "I'm the only admin and I'm locked out".
require("dotenv").config();
const { db } = require("../db");
const { hashPassword, generateTempPassword } = require("../services/auth");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function main() {
  const email = normalizeEmail(process.argv[2]);
  if (!email) {
    console.error("Usage: npm run reset-password -- <email>");
    process.exit(1);
  }

  const user = await db.prepare(`SELECT id, email FROM users WHERE email = ?`).get(email);
  if (!user) {
    console.error(`No matching user found for email: ${email}`);
    process.exit(1);
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await db.prepare(`
    UPDATE users SET password_hash = ?, must_reset_password = TRUE, updated_at = NOW() WHERE id = ?
  `).run(passwordHash, user.id);

  console.log(`Password reset for ${user.email}.`);
  console.log(`TEMPORARY PASSWORD (shown once, share securely): ${tempPassword}`);

  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
