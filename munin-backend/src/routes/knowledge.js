const express = require("express");
const { db } = require("../db");

const router = express.Router();

function serialize(k) {
  return {
    id: k.id, title: k.title, type: k.type, module: k.module,
    description: k.description, confidence: k.confidence,
    needsReview: !!k.needs_review, source: k.source,
    sessionId: k.session_id, segmentTimestamp: k.segment_timestamp,
  };
}

// GET /api/knowledge-objects?module=&type=&q=
router.get("/", (req, res) => {
  const { module, type, q } = req.query;
  let sql = `SELECT * FROM knowledge_objects WHERE 1=1`;
  const params = [];

  if (module && module !== "All") {
    sql += ` AND module = ?`;
    params.push(module);
  }
  if (type && type !== "All") {
    sql += ` AND type = ?`;
    params.push(type);
  }
  if (q) {
    sql += ` AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)`;
    const like = `%${String(q).toLowerCase()}%`;
    params.push(like, like);
  }
  sql += ` ORDER BY id ASC`;

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serialize));
});

// GET /api/knowledge-objects/:id
router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM knowledge_objects WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Knowledge object not found" });
  res.json(serialize(row));
});

module.exports = router;
