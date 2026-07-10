const express = require("express");
const { nanoid } = require("nanoid");
const { db } = require("../db");
const { findBestMatch, guessModule } = require("../services/keywordMatch");
const { isLlmConfigured, askLlm } = require("../services/llm");

const router = express.Router();

const NOT_COVERED_TEXT = "This hasn't been covered in KT yet — I've logged it as a gap.";

function loadKnowledgeObjects() {
  return db.prepare(`SELECT * FROM knowledge_objects`).all().map((k) => ({
    id: k.id, title: k.title, type: k.type, module: k.module,
    description: k.description, confidence: k.confidence,
    needsReview: !!k.needs_review, source: k.source,
  }));
}

function logGap(question, module) {
  const id = `g-${nanoid(8)}`;
  db.prepare(`INSERT INTO gaps (id, module, question, status) VALUES (?, ?, ?, 'Open')`).run(
    id, module || guessModule(question), question
  );
  return id;
}

function saveMessage(role, text, citation, isGap) {
  db.prepare(`INSERT INTO chat_messages (role, text, citation, is_gap) VALUES (?, ?, ?, ?)`).run(
    role, text, citation || null, isGap ? 1 : 0
  );
}

// GET /api/chat/history
router.get("/history", (req, res) => {
  const rows = db
    .prepare(`SELECT role, text, citation, is_gap AS isGap, created_at AS createdAt FROM chat_messages ORDER BY id ASC`)
    .all();
  res.json(rows.map((r) => ({ ...r, isGap: !!r.isGap })));
});

// POST /api/chat  { message: string }
router.post("/", async (req, res) => {
  const { message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  saveMessage("user", message, null, false);
  const knowledgeObjects = loadKnowledgeObjects();

  let reply;
  let citation = null;
  let matchedKoId = null;
  let usedLlm = false;

  try {
    if (isLlmConfigured()) {
      usedLlm = true;
      const result = await askLlm(message, knowledgeObjects);
      if (result.covered) {
        const ko = knowledgeObjects.find((k) => k.id === result.sourceId);
        reply = result.answer;
        citation = ko ? ko.source : null;
        matchedKoId = ko ? ko.id : null;
      } else {
        reply = NOT_COVERED_TEXT;
      }
    } else {
      const match = findBestMatch(message, knowledgeObjects);
      if (match) {
        reply = match.knowledgeObject.description;
        citation = match.knowledgeObject.source;
        matchedKoId = match.knowledgeObject.id;
      } else {
        reply = NOT_COVERED_TEXT;
      }
    }
  } catch (err) {
    // LLM call failed (network, auth, etc.) — fail safe to keyword matching
    // rather than surfacing a 500 to a live demo.
    const match = findBestMatch(message, knowledgeObjects);
    if (match) {
      reply = match.knowledgeObject.description;
      citation = match.knowledgeObject.source;
      matchedKoId = match.knowledgeObject.id;
    } else {
      reply = NOT_COVERED_TEXT;
    }
    usedLlm = false;
  }

  const isGap = !citation;
  let loggedGapId = null;
  if (isGap) {
    loggedGapId = logGap(message, guessModule(message));
  }

  saveMessage("assistant", reply, citation, isGap);

  res.json({
    reply,
    citation,
    matchedKnowledgeObjectId: matchedKoId,
    isGap,
    loggedGapId,
    usedLlm,
  });
});

module.exports = router;
