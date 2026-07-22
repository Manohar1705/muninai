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
    sessionId: k.session_id, timestamp: k.segment_timestamp,
  }));
}

function loadTranscriptSegments() {
  const rows = db
    .prepare(
      `SELECT ts.id AS segId, ts.session_id AS sessionId, ts.timestamp AS timestamp,
              ts.text AS text, s.title AS sessionTitle, s.module AS module,
              s.source_type AS sourceType
       FROM transcript_segments ts
       JOIN sessions s ON s.id = ts.session_id`
    )
    .all();
 
  return rows.map((r) => ({
    id: `seg-${r.segId}`,
    title: `Full transcript — ${r.sessionTitle}`,
    type: "Transcript",
    module: r.module,
    description: r.text.slice(0, 1500),
    confidence: 1,
    needsReview: false,
    source: `${r.sessionTitle} (${r.sourceType}), ${r.timestamp}`,
    sessionId: r.sessionId, timestamp: r.timestamp,
  }));
}

function buildCitation(item) {
  if (!item) return null; 
  return { source: item.source, sessionId: item.sessionId || null, timestamp: item.timestamp || null };
}

function getRecentHistory(conversationId, limit = 25) {
  return db
    .prepare(`
      SELECT role, text
      FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY id ASC
    `)
    .all(conversationId)
    .slice(-limit);
}
function getConversationStats(conversationId) {
  const messageCount = db
    .prepare(`
      SELECT COUNT(*) AS c
      FROM chat_messages
      WHERE conversation_id = ?
    `)
    .get(conversationId);

  const recentTopics = db
    .prepare(`
      SELECT text
      FROM chat_messages
      WHERE conversation_id = ?
      AND role = 'user'
      ORDER BY id DESC
      LIMIT 20
    `)
    .all(conversationId);

  return {
    messageCount: messageCount.c,
    recentTopics,
  };
}

function buildDatabaseContext() {
  const sessionSummary = db
    .prepare(`
      SELECT
        id,
        title,
        module
      FROM sessions
      ORDER BY id DESC
      LIMIT 20
    `)
    .all();
  
  const recentGaps = db
  .prepare(`
    SELECT
      question,
      module,
      status
    FROM gaps
    ORDER BY rowid DESC
    LIMIT 20
  `)
  .all();


  const meetingCount =
    db.prepare(`SELECT COUNT(*) AS c FROM meetings`).get().c;

  const openGapCount =
    db.prepare(
      `SELECT COUNT(*) AS c
       FROM gaps
       WHERE status = 'Open'`
    ).get().c;

  const moduleCount =
    db.prepare(`SELECT COUNT(*) AS c FROM modules`).get().c;

  const readiness =
    db.prepare(`
      SELECT module, score
      FROM readiness
      ORDER BY score DESC
      LIMIT 5
    `).all();

  const engagement = db
  .prepare(`
    SELECT name, phase
    FROM engagement
    LIMIT 1
  `)
  .get();

  const readinessDetails = db
  .prepare(`
    SELECT module, score
    FROM readiness
    ORDER BY score DESC
  `)
  .all();

  const lowestReadiness = db
  .prepare(`
    SELECT module, score
    FROM readiness
    ORDER BY score ASC
    LIMIT 5
  `)
  .all();

  const gapSummary = db
  .prepare(`
    SELECT
      module,
      COUNT(*) AS count
    FROM gaps
    GROUP BY module
    ORDER BY count DESC
  `)
  .all();
  const moduleSummary = db
  .prepare(`
    SELECT
      name
    FROM modules
    ORDER BY name
  `)
  .all();
  const meetingSummary = db
  .prepare(`
    SELECT
      meeting_title,
      status
    FROM meetings
    ORDER BY created_at DESC
    LIMIT 20
  `)
  .all();

  const readinessSummary = db
  .prepare(`
    SELECT module, score
    FROM readiness
    ORDER BY score DESC
  `)
  .all();

  const sessionCount = db.prepare(`SELECT COUNT(*) AS c FROM sessions`).get().c;
  return {
    sessionCount,
    meetingCount,
    openGapCount,
    moduleCount,
    readiness,
    engagement,
    readinessDetails,
    lowestReadiness,
    sessionSummary,
    recentGaps,
    gapSummary,
    moduleSummary,
    meetingSummary,
    readinessSummary,

    modules: db
      .prepare(`SELECT name FROM modules ORDER BY name`)
      .all(),

    recentSessions: db
      .prepare(`
        SELECT title, module, date
        FROM sessions
        ORDER BY num DESC
        LIMIT 10
      `)
      .all(),

    recentMeetings: db
      .prepare(`
        SELECT meeting_title, status
        FROM meetings
        ORDER BY created_at DESC
        LIMIT 10
      `)
      .all(),
  };
  
}

function tryDatabaseQuery(question) {
  const q = question.toLowerCase();

  if (
    q.includes("how many sessions") ||
    q.includes("number of sessions")
  ) {
    const count =
      db.prepare(`SELECT COUNT(*) AS c FROM sessions`).get().c;

    return {
      answered: true,
      reply: `There are currently ${count} sessions in the system.`
    };
  }

  if (
    q.includes("how many meetings") ||
    q.includes("number of meetings")
  ) {
    const count =
      db.prepare(`SELECT COUNT(*) AS c FROM meetings`).get().c;

    return {
      answered: true,
      reply: `There are currently ${count} meetings in the system.`
    };
  }

  if (
    q.includes("how many open gaps") ||
    q.includes("open gaps")
  ) {
    const count =
      db.prepare(`
        SELECT COUNT(*) AS c
        FROM gaps
        WHERE status = 'Open'
      `).get().c;

    return {
      answered: true,
      reply: `There are currently ${count} open gaps.`
    };
  }

  if (
    q.includes("highest readiness")
  ) {
    const row =
      db.prepare(`
        SELECT module, score
        FROM readiness
        ORDER BY score DESC
        LIMIT 1
      `).get();

    return {
      answered: true,
      reply: `${row.module} currently has the highest readiness score at ${row.score}%.`
    };
  }

  if (
    q.includes("lowest readiness")
  ) {
    const row =
      db.prepare(`
        SELECT module, score
        FROM readiness
        ORDER BY score ASC
        LIMIT 1
      `).get();

    return {
      answered: true,
      reply: `${row.module} currently has the lowest readiness score at ${row.score}%.`
    };
  }

  if (
    q.includes("readiness scores") ||
    q.includes("show readiness")
  ) {
    const rows = db.prepare(`
      SELECT module, score
      FROM readiness
      ORDER BY score DESC
    `).all();

    return {
      answered: true,
      reply: rows.map(r => `${r.module}: ${r.score}%`).join("\n")
    };
  }

  if (
    q.includes("list modules") ||
    q.includes("available modules")
  ) {
    const rows = db.prepare(`
      SELECT name
      FROM modules
      ORDER BY name
    `).all();

    return {
      answered: true,
      reply: rows.map(r => r.name).join(", ")
    };
  }

  if (
    q.includes("show meetings") ||
    q.includes("list meetings")
  ) {
    const rows = db.prepare(`
      SELECT meeting_title
      FROM meetings
      ORDER BY created_at DESC
    `).all();

    return {
      answered: true,
      reply: rows.map(r => r.meeting_title || "Untitled").join(", ")
    };
  }

  if (
    q.includes("current engagement") ||
    q.includes("active engagement")
  ) {
    const row = db.prepare(`
      SELECT name, phase
      FROM engagements
      LIMIT 1
    `).get();

    if (row) {
      return {
        answered: true,
        reply: `Current engagement is ${row.name} (${row.phase}).`
      };
    }
  }

  return {
    answered: false
  };
}

function logGap(question, module) {
  const id = `g-${nanoid(8)}`;
  db.prepare(`INSERT INTO gaps (id, module, question, status) VALUES (?, ?, ?, 'Open')`).run(
    id, module || guessModule(question), question
  );
  return id;
}

function saveMessage(conversationId, role, text, citation, isGap) {
  db.prepare(
    `INSERT INTO chat_messages (role, text, citation, citation_session_id, citation_timestamp, is_gap, conversation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    role, text,
    citation ? citation.source : null,
    citation ? citation.sessionId : null,
    citation ? citation.timestamp : null,
    isGap ? 1 : 0,
    conversationId
  );
  db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(conversationId);
}
 
function ensureConversation(conversationId) {
  if (conversationId) {
    const existing = db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(conversationId);
    if (existing) return conversationId;
  }
  const id = `conv-${nanoid(8)}`;
  db.prepare(`INSERT INTO conversations (id, title) VALUES (?, ?)`).run(id, "New chat");
  return id;
}
 
function maybeTitleConversation(conversationId, firstMessage) {
  const conv = db.prepare(`SELECT title FROM conversations WHERE id = ?`).get(conversationId);
  if (conv && conv.title === "New chat") {
    const title = firstMessage.length > 48 ? firstMessage.slice(0, 48) + "…" : firstMessage;
    db.prepare(`UPDATE conversations SET title = ? WHERE id = ?`).run(title, conversationId);
  }
}

// GET /api/chat/conversations
router.get("/conversations", (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.title, c.pinned AS pinned, c.archived AS archived,
      c.created_at AS createdAt, c.updated_at AS updatedAt,
      (SELECT text FROM chat_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS lastMessage
    FROM conversations c
    ORDER BY c.pinned DESC, c.updated_at DESC
  `).all();
  res.json(rows.map((r) => ({ ...r, pinned: !!r.pinned, archived: !!r.archived })));
});
 
router.post("/conversations", (req, res) => {
  const id = `conv-${nanoid(8)}`;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO conversations (id, title) VALUES (?, ?)`).run(id, "New chat");
  res.json({ id, title: "New chat", pinned: false, archived: false, createdAt: now, updatedAt: now, lastMessage: null });
});
 
// PATCH /api/chat/conversations/:id  { title }
router.patch("/conversations/:id", (req, res) => {
  const { id } = req.params;
  const { title } = req.body || {};
  const existing = db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  if (!title || !String(title).trim()) return res.status(400).json({ error: "title is required." });
  const trimmed = String(title).trim().slice(0, 80);
  db.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(trimmed, id);
  res.json({ id, title: trimmed });
});
 
// PATCH /api/chat/conversations/:id/pin  { pinned: boolean }
router.patch("/conversations/:id/pin", (req, res) => {
  const { id } = req.params;
  const { pinned } = req.body || {};
  const existing = db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  db.prepare(`UPDATE conversations SET pinned = ? WHERE id = ?`).run(pinned ? 1 : 0, id);
  res.json({ id, pinned: !!pinned });
});
 
// PATCH /api/chat/conversations/:id/archive  { archived: boolean }
router.patch("/conversations/:id/archive", (req, res) => {
  const { id } = req.params;
  const { archived } = req.body || {};
  const existing = db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  db.prepare(`UPDATE conversations SET archived = ? WHERE id = ?`).run(archived ? 1 : 0, id);
  res.json({ id, archived: !!archived });
});
 
// DELETE /api/chat/conversations/:id
// chat_messages.conversation_id has ON DELETE CASCADE, so its messages are
// removed automatically — no separate cleanup needed here.
router.delete("/conversations/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
  res.json({ deleted: true, id });
});
 
// GET /api/chat/history
router.get("/history", (req, res) => {
  const { conversationId } = req.query;
  if (!conversationId) return res.json([]);
  const rows = db
    .prepare(
      `SELECT role, text, citation, citation_session_id AS citationSessionId,
              citation_timestamp AS citationTimestamp, is_gap AS isGap, created_at AS createdAt
       FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC`
    )
    .all(conversationId);
  res.json(
    rows.map((r) => ({
      role: r.role,
      text: r.text,
      citation: r.citation ? { source: r.citation, sessionId: r.citationSessionId, timestamp: r.citationTimestamp } : null,
      isGap: !!r.isGap,
      createdAt: r.createdAt,
    }))
  );
});

// POST /api/chat  { message: string }
router.post("/", async (req, res) => {
  console.log("CHAT ROUTE HIT");
  
  const { message, conversationId: incomingId } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  console.log("MESSAGE:", message);
  const conversationId = ensureConversation(incomingId);
  maybeTitleConversation(conversationId, message);
  saveMessage(conversationId, "user", message, null, false);
  const dbAnswer = tryDatabaseQuery(message);
  console.log("DB ANSWER:", dbAnswer);
  if (dbAnswer.answered) {
    saveMessage(
      conversationId,
      "assistant",
      dbAnswer.reply,
      null,
      false
    );

    return res.json({
      conversationId,
      reply: dbAnswer.reply,
      citation: null,
      matchedKnowledgeObjectId: null,
      isGap: false,
      loggedGapId: null,
      usedLlm: false
    });
  }
  const knowledgeObjects = loadKnowledgeObjects();
  const transcriptSegments = loadTranscriptSegments();
  const candidates = [...knowledgeObjects, ...transcriptSegments];
 
  let reply;
  let citation = null;
  let matchedKoId = null;
  let usedLlm = false;
  let isGap = false;
 
  try {
    if (isLlmConfigured()) {
     
      usedLlm = true;
      const history = getRecentHistory(conversationId);
      

      const dbContext = buildDatabaseContext();
      // let dbContext = {};

      // try {
      //   dbContext = buildDatabaseContext();
      // } catch (err) {
      //   console.error("buildDatabaseContext failed:", err);
      // }

      const conversationStats = getConversationStats(conversationId);

     

      
      const result = await askLlm(message, candidates, history, dbContext, conversationStats);
      console.log("LLM RESULT:", result);
      
      if (result.mode === "chat") {
        reply = result.answer;
        isGap = false;
      } else if (result.covered) {
        const ko = candidates.find((k) => k.id === result.sourceId);
        reply = result.answer;
        citation = buildCitation(ko);
        matchedKoId = ko ? ko.id : null;
        isGap = false;
        console.log("RESULT COVERED:", result.covered);
        console.log("SOURCE ID:", result.sourceId);
        console.log("CITATION:", citation);
      } else {
        reply = result.answer || "I couldn't find this information in the KT knowledge base.";
        isGap = false;
}
    } else {
      const match = findBestMatch(message, candidates);
      if (match) {
        reply = match.knowledgeObject.description;
        citation = buildCitation(match.knowledgeObject);
        matchedKoId = match.knowledgeObject.id;
      } else {
        reply = NOT_COVERED_TEXT;
        isGap = true;
      }
    }
  } catch (err) {
    console.error("CHAT ERROR:", err);

    reply = "Munin AI is temporarily unavailable because the LLM rate limit has been reached. Please try again later.";
    isGap = false;
    usedLlm = false;
    }
    
  let loggedGapId = null;
  if (isGap) {
    loggedGapId = logGap(message, guessModule(message));
  }

  saveMessage(conversationId, "assistant", reply, citation, isGap);
 
  res.json({
    conversationId,
    reply,
    citation,
    matchedKnowledgeObjectId: matchedKoId,
    isGap,
    loggedGapId,
    usedLlm,
  });
});

module.exports = router;
