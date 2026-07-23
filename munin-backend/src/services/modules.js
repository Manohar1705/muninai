const { db } = require("../db");

// Modules are namespaced per engagement. `engagementId` is optional in the
// read paths for backward compatibility with callers that don't yet have an
// engagement in scope (e.g. chat.js, llm.js extraction prompts) — omitting
// it returns modules across all engagements. Every write path requires an
// engagementId, since a module always belongs to exactly one engagement.
function listModules(engagementId) {
  const modules = engagementId
    ? db.prepare(`
        SELECT name, planned_sessions, engagement_id
        FROM modules
        WHERE engagement_id = ?
        ORDER BY created_at ASC
      `).all(engagementId)
    : db.prepare(`
        SELECT name, planned_sessions, engagement_id
        FROM modules
        ORDER BY created_at ASC
      `).all();

  return modules.map((module) => {
    // Scoped by engagement_id, not just module name — module names aren't
    // globally unique (two engagements can each define "Onboarding"), so
    // without this a session in one engagement would get counted toward
    // another engagement's identically-named module.
    const completedSessions = db.prepare(`
      SELECT COUNT(*) AS count
      FROM sessions
      WHERE module = ?
      AND engagement_id = ?
      AND (
        source_type = 'kt_session'
        OR source_type = 'meeting'
      )
    `).get(module.name, module.engagement_id).count;

    return {
      ...module,
      completed_sessions: completedSessions,
    };
  });
}

function ensureModule(name, engagementId) {
  if (typeof name !== "string") return;
  if (!engagementId) return;

  const trimmed = name.trim();

  if (!trimmed) return;

  db.prepare(`
    INSERT OR IGNORE INTO modules
    (engagement_id, name, planned_sessions)
    VALUES (?, ?, 0)
  `).run(engagementId, trimmed);

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

function updatePlannedSessions(engagementId, name, plannedSessions) {
  const completed = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sessions
    WHERE module = ?
    AND engagement_id = ?
    AND (
      source_type = 'kt_session'
      OR source_type = 'meeting'
    )
  `).get(name, engagementId).count;

  if (plannedSessions < completed) {
    throw new Error(
      `Planned sessions cannot be less than completed sessions (${completed}).`
    );
  }

  const result = db.prepare(`
    UPDATE modules
    SET planned_sessions = ?
    WHERE name = ? AND engagement_id = ?
  `).run(plannedSessions, name, engagementId);

  if (result.changes === 0) {
    throw new Error(`Module "${name}" was not found in this engagement.`);
  }
}

// Renames a module within one engagement and cascades the new name onto
// every place that currently references it by name (sessions, meetings,
// knowledge objects, readiness, sme contributions, key-person risk, coverage
// topics/gaps). Those tables aren't engagement-scoped themselves, so this
// mirrors the same "rename by name" behavior already used by the session and
// meeting module-reassignment endpoints.
function renameModule(engagementId, oldName, newName) {
  if (!engagementId) throw new Error("engagementId is required.");
  const trimmedNew = (newName || "").trim();
  if (!trimmedNew) throw new Error("New module name is required.");

  const existing = db.prepare(`SELECT name FROM modules WHERE engagement_id = ? AND name = ?`).get(engagementId, oldName);
  if (!existing) throw new Error(`Module "${oldName}" was not found in this engagement.`);

  if (trimmedNew === oldName) return;

  const clash = db.prepare(`SELECT name FROM modules WHERE engagement_id = ? AND name = ?`).get(engagementId, trimmedNew);
  if (clash) throw new Error(`A module named "${trimmedNew}" already exists in this engagement.`);

  const tx = db.transaction(() => {
    db.prepare(`UPDATE modules SET name = ? WHERE engagement_id = ? AND name = ?`).run(trimmedNew, engagementId, oldName);
    db.prepare(`UPDATE sessions SET module = ? WHERE module = ? AND engagement_id = ?`).run(trimmedNew, oldName, engagementId);
    db.prepare(`UPDATE meetings SET module = ? WHERE module = ? AND engagement_id = ?`).run(trimmedNew, oldName, engagementId);
    db.prepare(`UPDATE knowledge_objects SET module = ? WHERE module = ?`).run(trimmedNew, oldName);
    db.prepare(`UPDATE kt_topics SET module = ? WHERE module = ?`).run(trimmedNew, oldName);
    db.prepare(`UPDATE gaps SET module = ? WHERE module = ?`).run(trimmedNew, oldName);
    db.prepare(`UPDATE sme_contributions SET module = ? WHERE module = ?`).run(trimmedNew, oldName);
    db.prepare(`UPDATE key_person_risk SET module = ? WHERE module = ?`).run(trimmedNew, oldName);
    db.prepare(`UPDATE readiness SET module = ? WHERE module = ?`).run(trimmedNew, oldName);
  });
  tx();
}

// Deletes a module outright — only when nothing has actually been
// classified under it yet (any session or meeting, of any source type).
// This is stricter than the planned>=completed invariant used elsewhere:
// that only counts kt_session/meeting sessions, but a module could also
// have document/recording sessions under it, and deleting the module row
// shouldn't silently orphan those from the module list.
function deleteModule(engagementId, name) {
  if (!engagementId) throw new Error("engagementId is required.");

  const existing = db.prepare(`SELECT name FROM modules WHERE engagement_id = ? AND name = ?`).get(engagementId, name);
  if (!existing) throw new Error(`Module "${name}" was not found in this engagement.`);

  const usage = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sessions WHERE module = ? AND engagement_id = ?) +
      (SELECT COUNT(*) FROM meetings WHERE module = ? AND engagement_id = ?) AS count
  `).get(name, engagementId, name, engagementId);

  if (usage.count > 0) {
    throw new Error(`Cannot delete "${name}" — ${usage.count} session(s)/meeting(s) are already classified under it. Reclassify them first.`);
  }

  db.prepare(`DELETE FROM modules WHERE engagement_id = ? AND name = ?`).run(engagementId, name);
}

module.exports = {
  listModules,
  ensureModule,
  deleteModule,
  updatePlannedSessions,
  renameModule,
};