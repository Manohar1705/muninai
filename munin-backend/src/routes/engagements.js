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

module.exports = router;