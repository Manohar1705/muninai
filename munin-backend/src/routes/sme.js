const express = require("express");
const { db } = require("../db");
const {listModules} = require("../services/modules");

const router = express.Router();

// GET /api/sme-map
router.get("/", (req, res) => {
  const rows = db.prepare(`SELECT module, name, share FROM sme_contributions ORDER BY module ASC, share DESC`).all();
  const riskRows = db.prepare(`SELECT module FROM key_person_risk`).all();
  const meetingModules = db.prepare(`
    SELECT DISTINCT m.module, m.session_id
    FROM meetings m
    WHERE m.module IS NOT NULL
      AND m.module != ''
      AND m.session_id IS NOT NULL
  `).all();
  const keyPersonRisk = new Set(riskRows.map((r) => r.module));
  const allModules = listModules();
  const byModule = {};
  for (const m of allModules) byModule[m] = [];
  for (const r of rows) {
    if (!byModule[r.module]) byModule[r.module] = [];
    byModule[r.module].push({ name: r.name, share: r.share });
  }
  for (const row of meetingModules) {
    if (!byModule[row.module]) {
      byModule[row.module] = [];
    }
  }
  

  for (const row of meetingModules) {
    const speakers = db.prepare(`
      SELECT speaker, text
      FROM transcript_segments
      WHERE session_id = ?
    `).all(row.session_id);


    if (!speakers.length) continue;

    const counts = {};

    for (const sp of speakers) {
      const name = (sp.speaker || "").trim();

      if (
        !name ||
        name === "Munin" ||
        name === "Unknown speaker"
      ) {
        continue;
      }

      const words = (sp.text || "")
        .split(/\s+/)
        .filter(Boolean).length;

      counts[name] = (counts[name] || 0) + words;
    }

    const totalWords = Object.values(counts)
      .reduce((a, b) => a + b, 0);

    if (totalWords === 0) continue;

    const contributors = Object.entries(counts)
    .map(([name, words]) => ({
      name,
      share: Math.round((words * 100) / totalWords)
    }))
    .sort((a, b) => b.share - a.share);

  byModule[row.module] = contributors;

  if (
    contributors.length > 0 &&
    contributors[0].share >= 70
  ) {
    keyPersonRisk.add(row.module);
  }
  }
  res.json({
    modules: Object.keys(byModule)
      .filter((m) => (byModule[m] || []).length > 0)
      .map((m) => ({
        module: m,
        contributors: byModule[m],
        keyPersonRisk: keyPersonRisk.has(m),
      })),
  });
});

module.exports = router;