const express = require("express");
const { nanoid } = require("nanoid");
const { db } = require("../db");
const { findBestMatch, guessModule } = require("../services/ai-core/keywordMatch");
const { isLlmConfigured, askLlm, generateBrd } = require("../services/ai-core/llm");

const router = express.Router();

const NOT_COVERED_TEXT = "This hasn't been covered in KT yet — I've logged it as a gap.";
function isBrdRequest(message) {
  const q = message.toLowerCase();
  return (
    q.includes("brd") ||
    q.includes("business requirement") ||
    q.includes("requirement document")
  );
}
async function loadKnowledgeObjects(engagementId) {
  const rows = await db.prepare(`
    SELECT ko.*, s.title AS "sessionTitle" FROM knowledge_objects ko
    JOIN sessions s ON s.id = ko.session_id
    WHERE s.engagement_id = ?
  `).all(engagementId);
  return rows.map((k) => ({
    id: k.id, title: k.title, type: k.type, module: k.module,
    description: k.description, confidence: k.confidence,
    needsReview: !!k.needs_review, source: k.source,
    sessionTitle: k.sessionTitle,
    sessionId: k.session_id, timestamp: k.segment_timestamp, speaker: k.speaker,
  }));
}

async function loadTranscriptSegments(engagementId) {
  const rows = await db
    .prepare(
      `SELECT ts.id AS "segId", ts.session_id AS "sessionId", ts.timestamp AS timestamp, ts.speaker AS speaker,
              ts.text AS text, s.title AS "sessionTitle", s.num AS "sessionNum", s.module AS module,
              s.source_type AS "sourceType"
       FROM transcript_segments ts
       JOIN sessions s ON s.id = ts.session_id
       WHERE s.engagement_id = ?`
    )
    .all(engagementId);
 
  return rows.map((r) => ({
    id: `seg-${r.segId}`,
    title: `Session ${r.sessionNum} — ${r.sessionTitle}`,
    type: "Transcript",
    module: r.module,
    description: r.text.slice(0, 1500),
    confidence: 1,
    needsReview: false,
    source: `${r.sessionTitle} (${r.sourceType}), ${r.timestamp}`,
    sessionTitle: r.sessionTitle,
    sessionId: r.sessionId, timestamp: r.timestamp, speaker: r.speaker,
  }));
}

function buildCitation(item) {
  if (!item) return null; 
  return {
    source: item.source,
    sessionId: item.sessionId || null,
    sessionTitle: item.sessionTitle || null,
    timestamp: item.timestamp || null,
  };
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
    .then((rows) => rows.slice(-limit));
}
async function getConversationStats(conversationId) {
  const messageCount = await db
    .prepare(`
      SELECT COUNT(*) AS c
      FROM chat_messages
      WHERE conversation_id = ?
    `)
    .get(conversationId);

  const recentTopics = await db
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

async function buildDatabaseContext(engagementId) {
  const sessionSummary = await db
    .prepare(`
      SELECT
        id,
        title,
        module
      FROM sessions
      WHERE engagement_id = ?
      ORDER BY id DESC
      LIMIT 20
    `)
    .all(engagementId);
  
  const recentGaps = await db
  .prepare(`
    SELECT
      question,
      module,
      status
    FROM gaps
    ORDER BY created_at DESC
    LIMIT 20
  `)
  .all();


  const meetingCount =
    (await db.prepare(`SELECT COUNT(*) AS c FROM meetings WHERE engagement_id = ?`).get(engagementId)).c;

  const openGapCount =
    (await db.prepare(
      `SELECT COUNT(*) AS c
       FROM gaps
       WHERE status = 'Open'`
    ).get()).c;

  const moduleCount =
    (await db.prepare(`SELECT COUNT(*) AS c FROM modules`).get()).c;

  const readiness =
    await db.prepare(`
      SELECT module, score
      FROM readiness
      ORDER BY score DESC
      LIMIT 5
    `).all();

  const engagement = await db
  .prepare(`
    SELECT name, phase
    FROM engagements
    WHERE id = ?
  `)
  .get(engagementId);

  const readinessDetails = await db
  .prepare(`
    SELECT module, score
    FROM readiness
    ORDER BY score DESC
  `)
  .all();

  const lowestReadiness = await db
  .prepare(`
    SELECT module, score
    FROM readiness
    ORDER BY score ASC
    LIMIT 5
  `)
  .all();

  const gapSummary = await db
  .prepare(`
    SELECT
      module,
      COUNT(*) AS count
    FROM gaps
    GROUP BY module
    ORDER BY count DESC
  `)
  .all();
  const moduleSummary = await db
  .prepare(`
    SELECT
      name
    FROM modules
    ORDER BY name
  `)
  .all();
  const meetingSummary = await db
  .prepare(`
    SELECT
      meeting_title,
      status
    FROM meetings
    WHERE engagement_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `)
  .all(engagementId);

  const readinessSummary = await db
  .prepare(`
    SELECT module, score
    FROM readiness
    ORDER BY score DESC
  `)
  .all();

  const sessionCount = (await db.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE engagement_id = ?`).get(engagementId)).c;
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

    modules: await db
      .prepare(`SELECT name FROM modules ORDER BY name`)
      .all(),

    recentSessions: await db
      .prepare(`
        SELECT title, module, date
        FROM sessions
        WHERE engagement_id = ?
        ORDER BY num DESC
        LIMIT 10
      `)
      .all(engagementId),

    recentMeetings: await db
      .prepare(`
        SELECT meeting_title, status
        FROM meetings
        WHERE engagement_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `)
      .all(engagementId),
  };
  
}

async function tryDatabaseQuery(question, engagementId) {
  const q = question.toLowerCase();

  if (
    q.includes("how many sessions") ||
    q.includes("number of sessions")
  ) {
    const count =
      (await db.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE engagement_id = ?`).get(engagementId)).c;

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
      (await db.prepare(`SELECT COUNT(*) AS c FROM meetings WHERE engagement_id = ?`).get(engagementId)).c;

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
      (await db.prepare(`
        SELECT COUNT(*) AS c
        FROM gaps g
        JOIN modules m ON m.name = g.module
        WHERE g.status = 'Open' AND m.engagement_id = ?
      `).get(engagementId)).c;

    return {
      answered: true,
      reply: `There are currently ${count} open gaps.`
    };
  }

  if (
    q.includes("highest readiness")
  ) {
    const row =
      await db.prepare(`
        SELECT r.module, r.score
        FROM readiness r
        JOIN modules m ON m.name = r.module
        WHERE m.engagement_id = ?
        ORDER BY r.score DESC
        LIMIT 1
      `).get(engagementId);

    return {
      answered: true,
      reply: `${row.module} currently has the highest readiness score at ${row.score}%.`
    };
  }

  if (
    q.includes("lowest readiness")
  ) {
    const row =
      await db.prepare(`
        SELECT r.module, r.score
        FROM readiness r
        JOIN modules m ON m.name = r.module
        WHERE m.engagement_id = ?
        ORDER BY r.score ASC
        LIMIT 1
      `).get(engagementId);

    return {
      answered: true,
      reply: `${row.module} currently has the lowest readiness score at ${row.score}%.`
    };
  }

  if (
    q.includes("readiness scores") ||
    q.includes("show readiness")
  ) {
    const rows = await db.prepare(`
      SELECT r.module, r.score
      FROM readiness r
      JOIN modules m ON m.name = r.module
      WHERE m.engagement_id = ?
      ORDER BY r.score DESC
    `).all(engagementId);

    return {
      answered: true,
      reply: rows.map(r => `${r.module}: ${r.score}%`).join("\n")
    };
  }

  if (
    q.includes("list modules") ||
    q.includes("available modules")
  ) {
    const rows = await db.prepare(`
      SELECT name
      FROM modules
      WHERE engagement_id = ?
      ORDER BY name
    `).all(engagementId);

    return {
      answered: true,
      reply: rows.map(r => r.name).join(", ")
    };
  }

  if (
    q.includes("show meetings") ||
    q.includes("list meetings")
  ) {
    const rows = await db.prepare(`
      SELECT meeting_title
      FROM meetings
      WHERE engagement_id = ?
      ORDER BY created_at DESC
    `).all(engagementId);

    return {
      answered: true,
      reply: rows.map(r => r.meeting_title || "Untitled").join(", ")
    };
  }

  if (
    q.includes("current engagement") ||
    q.includes("active engagement")
  ) {
    const row = await db.prepare(`
      SELECT name, phase
      FROM engagements
      WHERE id = ?
      LIMIT 1
    `).get(engagementId);

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
  return db.prepare(`INSERT INTO gaps (id, module, question, status) VALUES (?, ?, ?, 'Open')`).run(
    id, module || guessModule(question), question
  ).then(() => id);
}

async function saveMessage(conversationId, role, text, citation, isGap) {
  await db.prepare(
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
  await db.prepare(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`).run(conversationId);
}
 
async function ensureConversation(conversationId, engagementId) {
  if (conversationId) {
    const existing = await db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(conversationId);
    if (existing) return conversationId;
  }
  const id = `conv-${nanoid(8)}`;
  await db.prepare(`INSERT INTO conversations (id, title, engagement_id) VALUES (?, ?, ?)`).run(
    id,
    "New chat",
    engagementId ? Number(engagementId) : null
  );
  return id;
}
 
async function maybeTitleConversation(conversationId, firstMessage) {
  const conv = await db.prepare(`SELECT title FROM conversations WHERE id = ?`).get(conversationId);
  if (conv && conv.title === "New chat") {
    const title = firstMessage.length > 48 ? firstMessage.slice(0, 48) + "…" : firstMessage;
    await db.prepare(`UPDATE conversations SET title = ? WHERE id = ?`).run(title, conversationId);
  }
}

// GET /api/chat/conversations?engagementId=123
router.get("/conversations", async (req, res) => {
  const { engagementId } = req.query;
  const rows = await db.prepare(`
    SELECT c.id, c.title, c.pinned AS pinned, c.archived AS archived,
      c.created_at AS "createdAt", c.updated_at AS "updatedAt",
      (SELECT text FROM chat_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS "lastMessage"
    FROM conversations c
    WHERE c.engagement_id IS NOT DISTINCT FROM ?
    ORDER BY c.pinned DESC, c.updated_at DESC
  `).all(engagementId ? Number(engagementId) : null);
  res.json(rows.map((r) => ({ ...r, pinned: !!r.pinned, archived: !!r.archived })));
});
 
router.post("/conversations", async (req, res) => {
  const { engagementId } = req.body || {};
  const id = `conv-${nanoid(8)}`;
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO conversations (id, title, engagement_id) VALUES (?, ?, ?)`).run(
    id,
    "New chat",
    engagementId ? Number(engagementId) : null
  );
  res.json({ id, title: "New chat", pinned: false, archived: false, createdAt: now, updatedAt: now, lastMessage: null, engagementId: engagementId ? Number(engagementId) : null });
});
 
// PATCH /api/chat/conversations/:id  { title }
router.patch("/conversations/:id", async (req, res) => {
  const { id } = req.params;
  const { title } = req.body || {};
  const existing = await db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  if (!title || !String(title).trim()) return res.status(400).json({ error: "title is required." });
  const trimmed = String(title).trim().slice(0, 80);
  await db.prepare(`UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?`).run(trimmed, id);
  res.json({ id, title: trimmed });
});
 
// PATCH /api/chat/conversations/:id/pin  { pinned: boolean }
router.patch("/conversations/:id/pin", async (req, res) => {
  const { id } = req.params;
  const { pinned } = req.body || {};
  const existing = await db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  await db.prepare(`UPDATE conversations SET pinned = ? WHERE id = ?`).run(pinned ? 1 : 0, id);
  res.json({ id, pinned: !!pinned });
});
 
// PATCH /api/chat/conversations/:id/archive  { archived: boolean }
router.patch("/conversations/:id/archive", async (req, res) => {
  const { id } = req.params;
  const { archived } = req.body || {};
  const existing = await db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  await db.prepare(`UPDATE conversations SET archived = ? WHERE id = ?`).run(archived ? 1 : 0, id);
  res.json({ id, archived: !!archived });
});
 
// DELETE /api/chat/conversations/:id
// chat_messages.conversation_id has ON DELETE CASCADE, so its messages are
// removed automatically — no separate cleanup needed here.
router.delete("/conversations/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  await db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
  res.json({ deleted: true, id });
});
 
// GET /api/chat/history
router.get("/history", async (req, res) => {
  const { conversationId } = req.query;
  if (!conversationId) return res.json([]);
  const rows = await db
    .prepare(
      `SELECT cm.role, cm.text, cm.citation,
              cm.citation_session_id AS "citationSessionId",
              s.title AS "citationSessionTitle",
              cm.citation_timestamp AS "citationTimestamp",
              cm.is_gap AS "isGap", cm.created_at AS "createdAt"
       FROM chat_messages cm
       LEFT JOIN sessions s ON s.id = cm.citation_session_id
       WHERE cm.conversation_id = ?
       ORDER BY cm.id ASC`
    )
    .all(conversationId);
  res.json(
    rows.map((r) => ({
      role: r.role,
      text: r.text,
      citation: r.citation ? {
        source: r.citation,
        sessionId: r.citationSessionId,
        sessionTitle: r.citationSessionTitle,
        timestamp: r.citationTimestamp,
      } : null,
      isGap: !!r.isGap,
      createdAt: r.createdAt,
    }))
  );
});

// POST /api/chat  { message: string }
router.post("/", async (req, res) => {
  
  const { message, conversationId: incomingId, engagementId } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  const conversationId = await ensureConversation(incomingId, engagementId);
  await maybeTitleConversation(conversationId, message);
  await saveMessage(conversationId, "user", message, null, false);
  const dbAnswer = await tryDatabaseQuery(message, engagementId);
  if (dbAnswer.answered) {
    await saveMessage(
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
  const knowledgeObjects = await loadKnowledgeObjects(engagementId);
  const transcriptSegments = await loadTranscriptSegments(engagementId);
  const candidates = [...knowledgeObjects, ...transcriptSegments];
 
  let reply;
  let citation = null;
  let matchedKoId = null;
  let usedLlm = false;
  let isGap = false;
 
  try {
    if (isLlmConfigured()) {
     
      usedLlm = true;
      const history = await getRecentHistory(conversationId);
      

      const dbContext = await buildDatabaseContext(engagementId);
      // let dbContext = {};

      // try {
      //   dbContext = buildDatabaseContext();
      // } catch (err) {
      //   console.error("buildDatabaseContext failed:", err);
      // }

      const conversationStats = await getConversationStats(conversationId);

     

      
      const result = await askLlm(message, candidates, history, dbContext, conversationStats, engagementId);  
      if (result.mode === "chat") {
        reply = result.answer;
        isGap = false;
      } else if (result.covered) {
        const ko = candidates.find((k) => k.id === result.sourceId);
        reply = result.answer;
        citation = buildCitation(ko);
        matchedKoId = ko ? ko.id : null;
        isGap = false;
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

    if (/model_decommissioned|does not exist/i.test(err.message)) {
      reply = "Munin AI's model configuration needs an update. Please contact support.";
    } else if (/429/.test(err.message)) {
      reply = "Munin AI is temporarily unavailable because the LLM rate limit has been reached. Please try again later.";
    } else {
      reply = "Munin AI is temporarily unavailable. Please try again later.";
    }
    isGap = false;
    usedLlm = false;
    }
    
  let loggedGapId = null;
  if (isGap) {
    loggedGapId = await logGap(message, guessModule(message));
  }

  await saveMessage(conversationId, "assistant", reply, citation, isGap);
 
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

// POST /api/chat/brd  { engagementId, module?, sessionId? }
router.post("/brd", async (req, res) => {
  const { engagementId, module: moduleFilter, sessionId } = req.body || {};

  if (!engagementId) {
    return res.status(400).json({ error: "engagementId is required" });
  }

  if (!moduleFilter && !sessionId) {
    return res.status(400).json({ error: "A module or session is required to generate a BRD." });
  }

  try {
    let knowledgeObjects = await loadKnowledgeObjects(engagementId);
    let scopeLabel = "Whole engagement";

    if (sessionId) {
      knowledgeObjects = knowledgeObjects.filter((k) => String(k.sessionId) === String(sessionId));
      scopeLabel = `Session ${sessionId}`;
    } else if (moduleFilter) {
      knowledgeObjects = knowledgeObjects.filter((k) => k.module === moduleFilter);
      scopeLabel = `Module: ${moduleFilter}`;
    }

    const engagement = await db.prepare(`SELECT name, phase FROM engagements WHERE id = ?`).get(engagementId);
    const brd = await generateBrd(knowledgeObjects, engagement, scopeLabel);

    res.json({
      brd,
      scopeLabel,
      objectCount: knowledgeObjects.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("BRD ERROR:", err);
    res.status(500).json({ error: "Failed to generate BRD. Please try again later." });
  }
});

module.exports = router;
