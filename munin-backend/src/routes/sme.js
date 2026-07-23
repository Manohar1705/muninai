const express = require("express");
const { db } = require("../db");
const { listModules } = require("../services/modules");

const router = express.Router();

// Speaker labels that don't represent an actual SME/person contributing
// knowledge — filtered out of both contribution metrics below.
const NON_PERSON_SPEAKERS = new Set(["Munin", "Unknown speaker", "Document", "Recording"]);
function isRealSpeaker(name) {
  const trimmed = (name || "").trim();
  return trimmed.length > 0 && !NON_PERSON_SPEAKERS.has(trimmed);
}

// Computes two contribution metrics per speaker across a module's sessions:
//  - share: % of total words spoken (talk time) — the original metric.
//  - contextShare: % of the module's knowledge objects attributable to that
//    speaker's segments — a substance-based metric, since talking a lot
//    isn't the same as contributing knowledge that got captured.
// A knowledge object is attributed to whichever speaker it was directly
// tagged with at extraction time (knowledge_objects.speaker, validated
// against the meeting's real speakers when it was saved). Older rows that
// predate that column (the seeded demo data) don't have it, so those fall
// back to matching the transcript segment that shares the KO's exact
// session + timestamp instead.
function computeModuleContribution(sessionIds) {
  if (!sessionIds.length) return [];
  const placeholders = sessionIds.map(() => "?").join(",");

  const segments = db.prepare(`
    SELECT session_id, speaker, text, timestamp
    FROM transcript_segments
    WHERE session_id IN (${placeholders})
  `).all(...sessionIds);

  const wordCounts = {};
  const speakerByKey = {};
  for (const seg of segments) {
    speakerByKey[`${seg.session_id}__${seg.timestamp}`] = seg.speaker;
    if (!isRealSpeaker(seg.speaker)) continue;
    const words = (seg.text || "").split(/\s+/).filter(Boolean).length;
    wordCounts[seg.speaker] = (wordCounts[seg.speaker] || 0) + words;
  }

  const knowledgeObjects = db.prepare(`
    SELECT session_id, segment_timestamp, speaker
    FROM knowledge_objects
    WHERE session_id IN (${placeholders}) AND (speaker IS NOT NULL OR segment_timestamp IS NOT NULL)
  `).all(...sessionIds);

  const contextCounts = {};
  for (const ko of knowledgeObjects) {
    const speaker = ko.speaker || speakerByKey[`${ko.session_id}__${ko.segment_timestamp}`];
    if (!isRealSpeaker(speaker)) continue;
    contextCounts[speaker] = (contextCounts[speaker] || 0) + 1;
  }

  const totalWords = Object.values(wordCounts).reduce((a, b) => a + b, 0);
  const totalContext = Object.values(contextCounts).reduce((a, b) => a + b, 0);
  const names = new Set([...Object.keys(wordCounts), ...Object.keys(contextCounts)]);

  return [...names]
    .map((name) => ({
      name,
      share: totalWords ? Math.round(((wordCounts[name] || 0) * 100) / totalWords) : 0,
      contextShare: totalContext ? Math.round(((contextCounts[name] || 0) * 100) / totalContext) : 0,
    }))
    .sort((a, b) => b.share - a.share);
}

// GET /api/sme-map?engagementId=1
router.get("/", (req, res) => {
  const engagementId = req.query.engagementId ? Number(req.query.engagementId) : undefined;
  const modules = listModules(engagementId);

  const riskRows = db.prepare(`SELECT module FROM key_person_risk`).all();
  const keyPersonRisk = new Set(riskRows.map((r) => r.module));

  const byModule = {};

  for (const mod of modules) {
    const sessionRows = engagementId
      ? db.prepare(`SELECT id FROM sessions WHERE module = ? AND engagement_id = ?`).all(mod.name, engagementId)
      : db.prepare(`SELECT id FROM sessions WHERE module = ?`).all(mod.name);
    const sessionIds = sessionRows.map((r) => r.id);
    const contributors = computeModuleContribution(sessionIds);

    if (contributors.length) {
      byModule[mod.name] = contributors;
      if (contributors[0].share >= 70) keyPersonRisk.add(mod.name);
      continue;
    }

    // No real transcript data for this module yet — fall back to any
    // manually-recorded static contribution rows rather than showing
    // nothing at all.
    const staticRows = db
      .prepare(`SELECT name, share FROM sme_contributions WHERE module = ? ORDER BY share DESC`)
      .all(mod.name);
    if (staticRows.length) {
      byModule[mod.name] = staticRows.map((r) => ({ name: r.name, share: r.share, contextShare: null }));
    }
  }

  res.json({
    modules: Object.keys(byModule).map((m) => ({
      module: m,
      contributors: byModule[m],
      keyPersonRisk: keyPersonRisk.has(m),
    })),
  });
});

module.exports = router;