const { db } = require("../db");
 
// Returns the current list of module names (dynamic, not hardcoded).
// Used by extraction prompts, dashboard, and SME map.
function listModules() {
  const rows = db.prepare(`SELECT name FROM modules ORDER BY created_at ASC`).all();
  return rows.map((r) => r.name);
}
 
// Registers a module if it doesn't already exist, and makes sure it has
// a readiness row too (starting at 0) so Dashboard/SME map pick it up
// immediately without any manual seeding.
function ensureModule(name) {
  if (typeof name !== "string") return;
  const trimmed = name.trim();
  if (!trimmed) return;
 
  db.prepare(`INSERT OR IGNORE INTO modules (name) VALUES (?)`).run(trimmed);
 
  const existingReadiness = db
    .prepare(`SELECT module FROM readiness WHERE module = ?`)
    .get(trimmed);
 
  if (!existingReadiness) {
    db.prepare(`INSERT INTO readiness (module, score) VALUES (?, ?)`).run(trimmed, 0);
  }
}
 
module.exports = { listModules, ensureModule };