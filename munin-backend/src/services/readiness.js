// Small shared helper so real document uploads and real meeting extraction
// both move the needle on the Dashboard's readiness chart, the same way the
// canned demo /sessions/upload route always has. Previously only that fake
// route touched the `readiness` table, so genuinely new knowledge from a
// real upload or a real meeting was invisible on the Dashboard — this closes
// that gap without trying to be a real maturity model (it's a capped,
// deliberately modest bump per module touched, not a scored assessment).

const { db } = require("../db");

// const POINTS_PER_KO = 3;
// const MAX_BUMP_PER_EVENT = 15;

// const getScore = db.prepare(`SELECT score FROM readiness WHERE module = ?`);
// const setScore = db.prepare(`UPDATE readiness SET score = ? WHERE module = ?`);
// const insertActivity = db.prepare(`INSERT INTO activity (text, created_at) VALUES (@text, @created_at)`);

/**
 * @param {Array<{module: string}>} knowledgeObjects - newly extracted KOs
 * @returns {Object} map of module -> new score, for modules that changed
 */
// function bumpReadinessForKnowledgeObjects(knowledgeObjects) {
//   const countsByModule = {};
//   for (const k of knowledgeObjects) {
//     if (!k.module) continue;
//     countsByModule[k.module] = (countsByModule[k.module] || 0) + 1;
//   }

//   const updated = {};
//   for (const [module, count] of Object.entries(countsByModule)) {
//     const row = getScore.get(module);
//     if (!row) continue; // unrecognized/"Unclassified" module — nothing to bump
//     const bump = Math.min(count * POINTS_PER_KO, MAX_BUMP_PER_EVENT);
//     const nextScore = Math.min(100, row.score + bump);
//     if (nextScore !== row.score) {
//       setScore.run(nextScore, module);
//       updated[module] = nextScore;
//       insertActivity.run({
//         text: `Readiness recalculated for ${module} (${nextScore}%).`,
//         created_at: new Date().toISOString(),
//       });
//     }
//   }
//   return updated;
// }
function bumpReadinessForKnowledgeObjects() {
  rebuildReadiness();
  return {};
}
function rebuildReadiness() {
  const rows = db.prepare(`
    SELECT module, COUNT(*) AS count
    FROM knowledge_objects
    GROUP BY module
  `).all();

  db.prepare(`
    UPDATE readiness
    SET score = 0
  `).run();

  for (const row of rows) {
    const score = Math.min(row.count * 5, 100);

    db.prepare(`
      INSERT OR IGNORE INTO readiness (module, score)
      VALUES (?, ?)
    `).run(row.module, score);

    db.prepare(`
      UPDATE readiness
      SET score = ?
      WHERE module = ?
    `).run(score, row.module);
  }
  if (global.broadcastEvent) {
    global.broadcastEvent("dashboard-updated");
  }

  console.log("Readiness rebuilt");
}
module.exports = { bumpReadinessForKnowledgeObjects, rebuildReadiness };
