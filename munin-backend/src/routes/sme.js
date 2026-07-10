const express = require("express");
const { db } = require("../db");
const { MODULES } = require("../data/seedData");

const router = express.Router();

// GET /api/sme-map
router.get("/", (req, res) => {
  const rows = db.prepare(`SELECT module, name, share FROM sme_contributions ORDER BY module ASC, share DESC`).all();
  const riskRows = db.prepare(`SELECT module FROM key_person_risk`).all();
  const keyPersonRisk = new Set(riskRows.map((r) => r.module));

  const byModule = {};
  for (const m of MODULES) byModule[m] = [];
  for (const r of rows) {
    if (!byModule[r.module]) byModule[r.module] = [];
    byModule[r.module].push({ name: r.name, share: r.share });
  }

  res.json({
    modules: MODULES.map((m) => ({
      module: m,
      contributors: byModule[m] || [],
      keyPersonRisk: keyPersonRisk.has(m),
    })),
  });
});

module.exports = router;
