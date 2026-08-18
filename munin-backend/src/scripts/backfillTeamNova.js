// One-off backfill: pre-existing engagements had no owning team. Creates
// "Team Nova" (if missing) with sriharim@deloitte.com as its owner, then
// assigns every currently unassigned engagement to that team and makes the
// owner an admin on it. Safe to re-run — every step is idempotent.
require("dotenv").config();
const { db } = require("../db");
const { hashPassword, generateTempPassword } = require("../services/auth");

const TEAM_NAME = "Team Nova";
const ADMIN_EMAIL = "sriharim@deloitte.com";

async function main() {
  let team = await db.prepare(`SELECT * FROM teams WHERE name = ?`).get(TEAM_NAME);
  if (!team) {
    const result = await db.prepare(`INSERT INTO teams (name) VALUES (?) RETURNING id`).run(TEAM_NAME);
    team = { id: result.lastInsertRowid, name: TEAM_NAME };
    console.log(`Created team "${TEAM_NAME}" (id ${team.id})`);
  } else {
    console.log(`Team "${TEAM_NAME}" already exists (id ${team.id})`);
  }

  let admin = await db.prepare(`SELECT * FROM users WHERE email = ?`).get(ADMIN_EMAIL);
  if (!admin) {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const result = await db.prepare(`
      INSERT INTO users (team_id, email, password_hash, is_owner, must_reset_password)
      VALUES (?, ?, ?, true, true)
      RETURNING id
    `).run(team.id, ADMIN_EMAIL, passwordHash);
    admin = { id: result.lastInsertRowid };
    console.log(`Created owner user ${ADMIN_EMAIL} (id ${admin.id})`);
    console.log(`TEMPORARY PASSWORD (shown once, share securely): ${tempPassword}`);
  } else {
    console.log(`User ${ADMIN_EMAIL} already exists (id ${admin.id}) — leaving password untouched`);
  }

  const unassigned = await db.prepare(`SELECT id, name FROM engagements WHERE team_id IS NULL`).all();
  for (const e of unassigned) {
    await db.prepare(`UPDATE engagements SET team_id = ? WHERE id = ?`).run(team.id, e.id);
    await db.prepare(`
      INSERT INTO engagement_members (engagement_id, user_id, role)
      VALUES (?, ?, 'admin')
      ON CONFLICT (engagement_id, user_id) DO NOTHING
    `).run(e.id, admin.id);
    console.log(`Assigned engagement "${e.name}" (id ${e.id}) to ${TEAM_NAME}`);
  }
  if (unassigned.length === 0) console.log("No unassigned engagements found.");

  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
