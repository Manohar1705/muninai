const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const rows = db
    .prepare(`
      SELECT id, name, phase
      FROM engagements
      ORDER BY created_at DESC
    `)
    .all();

  res.json(rows);
});
router.post("/", (req, res) => {
  const { name, phase } = req.body || {};

  if (!name || !phase) {
    return res.status(400).json({
      error: "name and phase are required",
    });
  }

  const result = db
    .prepare(`
      INSERT INTO engagements (name, phase)
      VALUES (?, ?)
    `)
    .run(name.trim(), phase.trim());

  const engagement = db
    .prepare(`
      SELECT *
      FROM engagements
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.json(engagement);
});
router.patch("/:id", (req, res) => {
  const { name } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "name is required",
    });
  }

  const existing = db
    .prepare(`SELECT * FROM engagements WHERE id = ?`)
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      error: "Engagement not found",
    });
  }

  db.prepare(`
    UPDATE engagements
    SET name = ?
    WHERE id = ?
  `).run(name.trim(), req.params.id);

  const updated = db
    .prepare(`SELECT * FROM engagements WHERE id = ?`)
    .get(req.params.id);

  res.json(updated);
});
module.exports = router;