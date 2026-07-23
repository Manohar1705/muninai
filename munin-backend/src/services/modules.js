const { db } = require("../db");

function listModules() {
  const modules = db.prepare(`
    SELECT
      name,
      planned_sessions
    FROM modules
    ORDER BY created_at ASC
  `).all();

  return modules.map((module) => {
    const completedSessions = db.prepare(`
      SELECT COUNT(*) AS count
      FROM sessions
      WHERE module = ?
      AND (
        source_type = 'kt_session'
        OR source_type = 'meeting'
      )
    `).get(module.name).count;

    return {
      ...module,
      completed_sessions: completedSessions,
    };
  });
}

function ensureModule(name) {
  if (typeof name !== "string") return;

  const trimmed = name.trim();

  if (!trimmed) return;

  db.prepare(`
    INSERT OR IGNORE INTO modules
    (name, planned_sessions)
    VALUES (?, 0)
  `).run(trimmed);

  const readiness = db
    .prepare(`
      SELECT module
      FROM readiness
      WHERE module = ?
    `)
    .get(trimmed);

  if (!readiness) {
    db.prepare(`
      INSERT INTO readiness
      (module, score)
      VALUES (?, 0)
    `).run(trimmed);
  }
}

function updatePlannedSessions(name, plannedSessions) {
  const completed = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sessions
    WHERE module = ?
    AND (
      source_type = 'kt_session'
      OR source_type = 'meeting'
    )
  `).get(name).count;

  if (plannedSessions < completed) {
    throw new Error(
      `Planned sessions cannot be less than completed sessions (${completed}).`
    );
  }

  db.prepare(`
    UPDATE modules
    SET planned_sessions = ?
    WHERE name = ?
  `).run(plannedSessions, name);
}

module.exports = {
  listModules,
  ensureModule,
  updatePlannedSessions,
};