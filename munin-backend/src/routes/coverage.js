const express = require("express");
const { nanoid } = require("nanoid");
const { db } = require("../db");

const router = express.Router();

// GET /api/coverage — topics matrix + gaps + suggested next-session agenda
router.get("/", (req, res) => {
  const topics = db.prepare(`SELECT module, topic, depth FROM kt_topics ORDER BY id ASC`).all();
  const gaps = db.prepare(`SELECT id, module, question, status FROM gaps ORDER BY id ASC`).all();

  const uncoveredTopics = topics.filter((t) => t.depth <= 1).slice(0, 4);
  const topOpenGaps = gaps.filter((g) => g.status !== "Closed").slice(0, 3);

  res.json({
    topics,
    gaps,
    suggestedAgenda: { uncoveredTopics, topOpenGaps },
  });
});

// GET /api/gaps
router.get("/gaps", (req, res) => {
  const gaps = db.prepare(`SELECT id, module, question, status, created_at AS createdAt FROM gaps ORDER BY id ASC`).all();
  res.json(gaps);
});

// POST /api/gaps — manually log a new gap (also used internally by chat fallback)
router.post("/gaps", (req, res) => {
  const { module, question, status } = req.body || {};
  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: "question is required" });
  }
  const id = `g-${nanoid(8)}`;
  db.prepare(`INSERT INTO gaps (id, module, question, status) VALUES (?, ?, ?, ?)`).run(
    id, module || "General", question, status || "Open"
  );
  const created = db.prepare(`SELECT id, module, question, status, created_at AS createdAt FROM gaps WHERE id = ?`).get(id);
  res.status(201).json(created);
});

// PATCH /api/gaps/:id — update status (Open | Scheduled for next session | Closed)
router.patch("/gaps/:id", (req, res) => {
  const { status } = req.body || {};
  const allowed = ["Open", "Scheduled for next session", "Closed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }
  const existing = db.prepare(`SELECT id FROM gaps WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Gap not found" });

  db.prepare(`UPDATE gaps SET status = ? WHERE id = ?`).run(status, req.params.id);
  const updated = db.prepare(`SELECT id, module, question, status, created_at AS createdAt FROM gaps WHERE id = ?`).get(req.params.id);
  res.json(updated);
});

module.exports = router;
