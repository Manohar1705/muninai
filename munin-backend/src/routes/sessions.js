const express = require("express");
const { db } = require("../db");
const { SESSION_9, KNOWLEDGE_OBJECTS_SEED } = require("../data/seedData");
const { ensureModule, listModules } = require("../services/modules");
const router = express.Router();

function serializeSession(row) {
  return {
    id: row.id,
    num: row.num,
    module: row.module,
    title: row.title,
    date: row.date,
    duration: row.duration,
    status: row.status,
    attendees: JSON.parse(row.attendees),
    engagementId: row.engagement_id,
  };
}

// GET /api/sessions?engagementId=1 — lightweight list (no transcript payload)
router.get("/", (req, res) => {
  const engagementId = req.query.engagementId ? Number(req.query.engagementId) : null;
  const rows = engagementId
    ? db.prepare(`SELECT * FROM sessions WHERE engagement_id = ? ORDER BY num ASC`).all(engagementId)
    : db.prepare(`SELECT * FROM sessions ORDER BY num ASC`).all();
  res.json(rows.map(serializeSession));
});

// GET /api/sessions/:id — full detail with transcript + extracted knowledge objects
router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Session not found" });

  const transcript = db
    .prepare(`SELECT timestamp AS t, speaker AS s, text AS x FROM transcript_segments WHERE session_id = ? ORDER BY seq ASC`)
    .all(row.id);

  const knowledgeObjects = db
    .prepare(`SELECT * FROM knowledge_objects WHERE session_id = ? ORDER BY id ASC`)
    .all(row.id)
    .map((k) => ({
      id: k.id, title: k.title, type: k.type, module: k.module,
      description: k.description, confidence: k.confidence,
      needsReview: !!k.needs_review, source: k.source,
      segmentTimestamp: k.segment_timestamp,
    }));

  res.json({ ...serializeSession(row), transcript, knowledgeObjects });
});

// POST /api/sessions/upload — simulates the "Upload session recording" demo flow.
// Idempotent: calling it again after Session 9 already exists is a no-op.
router.post("/upload", (req, res) => {
  const already = db.prepare(`SELECT value FROM app_state WHERE key = 'session9_uploaded'`).get();
  if (already && already.value === "true") {
    return res.json({ alreadyUploaded: true, message: "Session 9 has already been added." });
  }

  const requestedEngagementId = req.body?.engagementId ? Number(req.body.engagementId) : null;
  const engagementId = requestedEngagementId || db.prepare(`SELECT id FROM engagements ORDER BY id ASC LIMIT 1`).get()?.id || null;
  ensureModule(SESSION_9.module, engagementId);

  const insertSession = db.prepare(
    `INSERT INTO sessions (id, num, module, title, date, duration, status, attendees, engagement_id) VALUES (@id, @num, @module, @title, @date, @duration, @status, @attendees, @engagement_id)`
  );
  const insertSegment = db.prepare(
    `INSERT INTO transcript_segments (session_id, seq, timestamp, speaker, text) VALUES (@session_id, @seq, @timestamp, @speaker, @text)`
  );
  const insertKO = db.prepare(
    `INSERT INTO knowledge_objects (id, title, type, module, description, confidence, needs_review, source, session_id, segment_timestamp)
     VALUES (@id, @title, @type, @module, @description, @confidence, @needs_review, @source, @session_id, @segment_timestamp)`
  );
  const insertActivity = db.prepare(`INSERT INTO activity (text, created_at) VALUES (@text, @created_at)`);

  const newKOs = KNOWLEDGE_OBJECTS_SEED.filter((k) => k.source.startsWith("KT Session 9"));

  const tx = db.transaction(() => {
    insertSession.run({
      id: SESSION_9.id, num: SESSION_9.num, module: SESSION_9.module, title: SESSION_9.title,
      date: SESSION_9.date, duration: SESSION_9.duration, status: SESSION_9.status,
      attendees: JSON.stringify(SESSION_9.attendees),
      engagement_id: engagementId,
    });
    SESSION_9.transcript.forEach((seg, i) => {
      insertSegment.run({ session_id: SESSION_9.id, seq: i, timestamp: seg.t, speaker: seg.s, text: seg.x });
    });
    for (const k of newKOs) {
      insertKO.run({
        id: k.id, title: k.title, type: k.type, module: k.module,
        description: k.description, confidence: k.confidence,
        needs_review: k.needsReview ? 1 : 0, source: k.source,
        session_id: SESSION_9.id, segment_timestamp: k.source.split(", ")[1],
      });
    }

    // Coverage: "Gateway failover & DR" topic goes to fully demonstrated
    db.prepare(
      `UPDATE kt_topics SET depth = 3 WHERE module = 'Customer Notifications' AND topic = 'Gateway failover & DR'`
    ).run();

    // Close the matching open gap
    db.prepare(`UPDATE gaps SET status = 'Closed' WHERE id = 'g9'`).run();

    // Bump readiness for Customer Notifications
    const current = db.prepare(`SELECT score FROM readiness WHERE module = 'Customer Notifications'`).get();
    const nextScore = Math.min(100, (current ? current.score : 58) + 14);
    db.prepare(`UPDATE readiness SET score = ? WHERE module = 'Customer Notifications'`).run(nextScore);

    const now = new Date().toISOString();
    insertActivity.run({ text: "KT Session 9 — Notification Gateway Failover & DR processed, 4 knowledge objects extracted.", created_at: now });
    insertActivity.run({ text: "Gap closed: notification gateway failover procedure.", created_at: now });
    insertActivity.run({ text: `Readiness recalculated for Customer Notifications (${nextScore}%).`, created_at: now });

    db.prepare(`INSERT OR REPLACE INTO app_state (key, value) VALUES ('session9_uploaded', 'true')`).run();
  });

  tx();

  const sessionRow = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(SESSION_9.id);
  const transcript = db
    .prepare(`SELECT timestamp AS t, speaker AS s, text AS x FROM transcript_segments WHERE session_id = ? ORDER BY seq ASC`)
    .all(SESSION_9.id);
  const readinessRow = db.prepare(`SELECT score FROM readiness WHERE module = 'Customer Notifications'`).get();

  res.json({
    alreadyUploaded: false,
    session: { ...serializeSession(sessionRow), transcript },
    newKnowledgeObjects: newKOs.map((k) => ({ ...k })),
    updatedReadiness: { "Customer Notifications": readinessRow.score },
    closedGapId: "g9",
  });
});

// PATCH /api/sessions/:id/module — reclassifies a session. Restricted to
// the session's own engagement's defined module list (or "Unclassified") —
// same rule as meetings' module PATCH: Munin only ever puts a KT session
// into one of the modules an engagement has actually defined, never an
// arbitrary free-typed name.
router.patch("/:id/module", (req, res) => {
  const { module } = req.body;
  const currentSession = db
    .prepare(`SELECT module, engagement_id FROM sessions WHERE id = ?`)
    .get(req.params.id);

  if (!currentSession) {
    return res.status(404).json({ error: "Session not found" });
  }

  const trimmedModule = String(module || "").trim();
  if (!trimmedModule) {
    return res.status(400).json({ error: "module is required" });
  }

  const allowedNames = listModules(currentSession.engagement_id).map((m) => m.name);
  if (trimmedModule !== "Unclassified" && !allowedNames.includes(trimmedModule)) {
    return res.status(400).json({
      error: `"${trimmedModule}" is not a defined module for this engagement. Add it under Engagement Setup first, or choose an existing module.`,
    });
  }

  const oldModule = currentSession?.module;
  const result = db
    .prepare(`
      UPDATE sessions
      SET module = ?
      WHERE id = ?
    `)
    .run(trimmedModule, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Session not found" });

  }
  db.prepare(`
    UPDATE knowledge_objects
    SET module = ?
    WHERE session_id = ?
  `).run(trimmedModule, req.params.id);
  if (oldModule && oldModule !== trimmedModule) {
    const oldReadiness = db
      .prepare(`SELECT score FROM readiness WHERE module = ?`)
      .get(oldModule);

    const newReadiness = db
      .prepare(`SELECT score FROM readiness WHERE module = ?`)
      .get(trimmedModule);

    if (oldReadiness) {
      db.prepare(`
        UPDATE readiness
        SET score = ?
        WHERE module = ?
      `).run(
        Math.max(oldReadiness.score, newReadiness?.score || 0),
        trimmedModule
      );

     const remainingUsage =
      db.prepare(`
        SELECT COUNT(*) as count
        FROM sessions
        WHERE module = ?
      `).get(oldModule);

    if (remainingUsage.count === 0) {
      db.prepare(`
        DELETE FROM readiness
        WHERE module = ?
      `).run(oldModule);
    }
    }
  }

  res.json({ success: true });
});

module.exports = router;
