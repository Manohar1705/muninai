const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const {
  ENGAGEMENT,
  READINESS_INITIAL,
  SME_ROLES,
  SESSIONS_SEED,
  KNOWLEDGE_OBJECTS_SEED,
  KT_TOPICS_SEED,
  GAPS_SEED,
  SME_MAP_SEED,
  KEY_PERSON_RISK_MODULES,
  ACTIVITY_SEED,
  CHAT_SEED,
} = require("./data/seedData");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "munin.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS engagements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phase TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smes (
  name TEXT PRIMARY KEY,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  num INTEGER NOT NULL,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  duration TEXT NOT NULL,
  status TEXT NOT NULL,
  attendees TEXT NOT NULL, -- JSON array of names
  engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_objects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence REAL NOT NULL,
  needs_review INTEGER NOT NULL,
  source TEXT NOT NULL,          -- human readable "Session title, HH:MM:SS"
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  segment_timestamp TEXT,
  speaker TEXT                   -- who this fact is attributed to (meetings
                                 -- only — validated against real speakers seen
                                 -- in that meeting's transcript at insert time)
);

CREATE TABLE IF NOT EXISTS kt_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL,
  topic TEXT NOT NULL,
  depth INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gaps (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL, -- Open | Scheduled for next session | Closed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sme_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  share INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS key_person_risk (
  module TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS readiness (
  module TEXT PRIMARY KEY,
  score INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL, -- user | assistant
  text TEXT NOT NULL,
  citation TEXT,
  is_gap INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Modules are namespaced per engagement (two engagements may each define
-- a module called "Payments Core" without colliding) so the uniqueness
-- constraint is on (engagement_id, name), not name alone.
CREATE TABLE IF NOT EXISTS modules(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  planned_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(engagement_id, name)
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,          -- our own id, e.g. "mtg-XXXXXXXX"
  bot_id TEXT,                  -- Recall.ai bot id, set once createBot() returns
  meeting_url TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  module TEXT,
  status TEXT NOT NULL,         -- joining | in_call | call_ended | done | error
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL, -- linked once transcript is processed (Step 5)
  error TEXT,
  engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 5: raw transcript pieces streamed in live from Recall.ai's
-- transcript.data webhook while a bot is in a call. Keyed by bot_id (not
-- meeting id) because the webhook payload only carries the bot id. Once the
-- meeting ends, these rows are read in seq order, turned into real
-- transcript_segments under a new session, and left in place as a raw log.
CREATE TABLE IF NOT EXISTS meeting_transcript_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function tableIsEmpty(table) {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
  return row.c === 0;
}

function seedIfEmpty() {
  const insertSession = db.prepare(
    `INSERT INTO sessions (id, num, module, title, date, duration, status, attendees, engagement_id) VALUES (@id, @num, @module, @title, @date, @duration, @status, @attendees, @engagement_id)`
  );
  const insertSegment = db.prepare(
    `INSERT INTO transcript_segments (session_id, seq, timestamp, speaker, text) VALUES (@session_id, @seq, @timestamp, @speaker, @text)`
  );
  const insertKO = db.prepare(
    `INSERT INTO knowledge_objects (id, title, type, module, description, confidence, needs_review, source, session_id, segment_timestamp, speaker)
     VALUES (@id, @title, @type, @module, @description, @confidence, @needs_review, @source, @session_id, @segment_timestamp, @speaker)`
  );
  const insertTopic = db.prepare(
    `INSERT INTO kt_topics (module, topic, depth) VALUES (@module, @topic, @depth)`
  );
  const insertGap = db.prepare(
    `INSERT INTO gaps (id, module, question, status) VALUES (@id, @module, @question, @status)`
  );
  const insertSmeContribution = db.prepare(
    `INSERT INTO sme_contributions (module, name, share) VALUES (@module, @name, @share)`
  );
  const insertReadiness = db.prepare(
    `INSERT INTO readiness (module, score) VALUES (@module, @score)`
  );
  const insertActivity = db.prepare(
    `INSERT INTO activity (text, created_at) VALUES (@text, @created_at)`
  );
  const insertChat = db.prepare(
    `INSERT INTO chat_messages (role, text, citation, citation_session_id, citation_timestamp, is_gap, conversation_id) VALUES (@role, @text, @citation, @citation_session_id, @citation_timestamp, @is_gap, @conversation_id)`
  );
  const insertConversation = db.prepare(
    `INSERT INTO conversations (id, title) VALUES (@id, @title)`
  );
  const insertSme = db.prepare(
    `INSERT INTO smes (name, role) VALUES (@name, @role)`
  );

  // Helper: find which session a KO's source belongs to, and its timestamp
  function resolveKoSession(source) {
    const [titlePart, tsPart] = source.split(", ");
    const session = SESSIONS_SEED.find((s) => s.title === titlePart);
    return { sessionId: session ? session.id : null, ts: tsPart || null };
  }

  const seedTx = db.transaction(() => {
  if (tableIsEmpty("engagements")) {
    db.prepare(`
      INSERT INTO engagements (name, phase, details)
      VALUES (?, ?, ?)
    `).run(
      ENGAGEMENT.name,
      ENGAGEMENT.phase,
      ENGAGEMENT.details || ""
    );
  }

    // Everything seeded below (sessions, modules) belongs to this one demo
    // engagement — new engagements created later start with none of it.
    const seedEngagementId = db.prepare(`SELECT id FROM engagements ORDER BY id ASC LIMIT 1`).get()?.id || null;

    if (tableIsEmpty("smes")) {
      for (const [name, role] of Object.entries(SME_ROLES)) {
        insertSme.run({ name, role });
      }
    }

    if (tableIsEmpty("sessions")) {
      for (const s of SESSIONS_SEED) {
        insertSession.run({
          id: s.id, num: s.num, module: s.module, title: s.title,
          date: s.date, duration: s.duration, status: s.status,
          attendees: JSON.stringify(s.attendees),
          engagement_id: seedEngagementId,
        });
        s.transcript.forEach((seg, i) => {
          insertSegment.run({ session_id: s.id, seq: i, timestamp: seg.t, speaker: seg.s, text: seg.x });
        });
      }
    }

    if (tableIsEmpty("knowledge_objects")) {
      for (const k of KNOWLEDGE_OBJECTS_SEED) {
        if(k.source.startsWith("KT Session 9")) continue;
        const { sessionId, ts } = resolveKoSession(k.source);
        insertKO.run({
          id: k.id, title: k.title, type: k.type, module: k.module,
          description: k.description, confidence: k.confidence,
          needs_review: k.needsReview ? 1 : 0, source: k.source,
          session_id: sessionId, segment_timestamp: ts, speaker: null,
        });
      }
    }

    if (tableIsEmpty("kt_topics")) {
      for (const t of KT_TOPICS_SEED) insertTopic.run(t);
    }

    if (tableIsEmpty("gaps")) {
      for (const g of GAPS_SEED) insertGap.run(g);
    }

    if (tableIsEmpty("sme_contributions")) {
      for (const [module, people] of Object.entries(SME_MAP_SEED)) {
        for (const p of people) insertSmeContribution.run({ module, name: p.name, share: p.share });
      }
    }

    if (tableIsEmpty("key_person_risk")) {
      for (const module of KEY_PERSON_RISK_MODULES) {
        db.prepare(`INSERT INTO key_person_risk (module) VALUES (?)`).run(module);
      }
    }

    if (tableIsEmpty("readiness")) {
      for (const [module, score] of Object.entries(READINESS_INITIAL)) {
        insertReadiness.run({ module, score });
      }
    }
    if(tableIsEmpty("modules")) {
      // Seed planned_sessions from the actual seeded session count per
      // module (plus a small realistic backlog) so the demo engagement
      // starts in a believable "in progress" state instead of violating
      // the planned >= completed invariant with a planned count of 0.
      const insertModule = db.prepare(`INSERT OR IGNORE INTO modules (engagement_id, name, planned_sessions) VALUES (?, ?, ?)`);
      for(const [module] of Object.entries(READINESS_INITIAL)) {
        const completedCount = SESSIONS_SEED.filter((s) => s.module === module).length;
        insertModule.run(seedEngagementId, module, completedCount + 2);
      }
    }

    if (tableIsEmpty("activity")) {
      for (const a of ACTIVITY_SEED) insertActivity.run({ text: a.text, created_at: a.createdAt });
    }

    if (tableIsEmpty("conversations")) {
      insertConversation.run({ id: "conv-demo", title: "Demo Q&A" });
    }
 
    if (tableIsEmpty("chat_messages")) {
      for (const m of CHAT_SEED) {
        // citation_session_id/timestamp are what "View source" in Ask Munin
        // actually navigates on — without resolving them here too, the
        // seeded demo conversation reproduces the same broken-link bug the
        // migration backfill above fixes for pre-existing databases.
        const resolved = m.citation ? resolveKoSession(m.citation) : { sessionId: null, ts: null };
        insertChat.run({
          role: m.role, text: m.text, citation: m.citation,
          citation_session_id: resolved.sessionId, citation_timestamp: resolved.ts,
          is_gap: m.isGap ? 1 : 0, conversation_id: "conv-demo",
        });
      }
    }

    if (tableIsEmpty("app_state")) {
      db.prepare(`INSERT INTO app_state (key, value) VALUES ('session9_uploaded', 'false')`).run();
    }
  });

  seedTx();
}

function resetDemoData() {
  const tables = [
    "chat_messages", "conversations", "modules", "activity", "readiness", "key_person_risk",
    "sme_contributions", "gaps", "kt_topics", "knowledge_objects",
    "transcript_segments", "meeting_transcript_chunks", "meetings", "sessions", "smes", "engagements", "app_state",
  ];

  const resetTx = db.transaction(() => {
    for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
  });
  resetTx();
  seedIfEmpty();
}

function migrateSchema() {
  const sessionCols = db.prepare(`PRAGMA table_info(sessions)`).all().map((c) => c.name);
  if (!sessionCols.includes("source_type")) {
    db.exec(`ALTER TABLE sessions ADD COLUMN source_type TEXT NOT NULL DEFAULT 'kt_session'`);
  }

  const meetingCols = db.prepare(`PRAGMA table_info(meetings)`).all().map((c) => c.name);
  if (!meetingCols.includes("last_extracted_seq")) {
    // -1 means "nothing processed yet" (chunk seq numbers start at 0).
    db.exec(`ALTER TABLE meetings ADD COLUMN last_extracted_seq INTEGER NOT NULL DEFAULT -1`);
  }
  const meetingCols2 = db.prepare(`PRAGMA table_info(meetings)`).all().map((c) => c.name);
  if (!meetingCols2.includes("meeting_title")) {
    db.exec(`ALTER TABLE meetings ADD COLUMN meeting_title TEXT`);
  }
  if (!meetingCols.includes("last_extracted_at")) {
    db.exec(`ALTER TABLE meetings ADD COLUMN last_extracted_at TEXT`);
  }
  const meetingCols3 = db.prepare(
    `PRAGMA table_info(meetings)`
  ).all().map((c) => c.name);

  if (!meetingCols3.includes("module")) {
    db.exec(`ALTER TABLE meetings ADD COLUMN module TEXT`);
  }
  const chatColsForConv = db.prepare(`PRAGMA table_info(chat_messages)`).all().map((c) => c.name);
  if (!chatColsForConv.includes("conversation_id")) {
    db.exec(`ALTER TABLE chat_messages ADD COLUMN conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE`);
    // Backfill: any messages that existed before this migration get grouped 
    // into one "Earlier conversation" so nothing disappears from history.
    const orphanCount = db.prepare(`SELECT COUNT(*) AS c FROM chat_messages WHERE conversation_id IS NULL`).get().c;
    if (orphanCount > 0){
      const legacyId = `conv-legacy-${Date.now().toString(36)}`;
      db.prepare(`INSERT INTO conversations (id, title) VALUES (?, ?)`).run(legacyId, "Earlier conversation");
      db.prepare(`UPDATE chat_messages SET conversation_id = ? WHERE conversation_id IS NULL`).run(legacyId);
    }
  }
  const chatCols = db.prepare(`PRAGMA table_info(chat_messages)`).all().map((c) => c.name);
  if (!chatCols.includes("citation_session_id")) {
    db.exec(`ALTER TABLE chat_messages ADD COLUMN citation_session_id TEXT`);
  }
  if (!chatCols.includes("citation_timestamp")) {
    db.exec(`ALTER TABLE chat_messages ADD COLUMN citation_timestamp TEXT`);
  }

  const koCols = db.prepare(`PRAGMA table_info(knowledge_objects)`).all().map((c) => c.name);
  if (!koCols.includes("speaker")) {
    db.exec(`ALTER TABLE knowledge_objects ADD COLUMN speaker TEXT`);
  }

  // Backfill: messages saved before the two columns above existed (e.g. the
  // seeded demo conversation) have a human-readable `citation` string like
  // "KT Session 2 — ..., 00:04:09" but no citation_session_id/timestamp —
  // which silently breaks Ask Munin's "View source" button (it requires
  // citation.sessionId to navigate). Resolved the same way KO sources are
  // resolved elsewhere: split on the last ", " into "<session title>" and
  // "<timestamp>", then look up the session by title. Only touches rows
  // that are actually broken, so real conversations are never overwritten.
  const brokenCitations = db.prepare(`
    SELECT id, citation FROM chat_messages
    WHERE citation IS NOT NULL AND citation_session_id IS NULL
  `).all();
  if (brokenCitations.length) {
    const findSessionByTitle = db.prepare(`SELECT id FROM sessions WHERE title = ?`);
    const fixCitation = db.prepare(`UPDATE chat_messages SET citation_session_id = ?, citation_timestamp = ? WHERE id = ?`);
    for (const row of brokenCitations) {
      const lastComma = row.citation.lastIndexOf(", ");
      if (lastComma === -1) continue;
      const titlePart = row.citation.slice(0, lastComma);
      const tsPart = row.citation.slice(lastComma + 2);
      const session = findSessionByTitle.get(titlePart);
      if (session) {
        fixCitation.run(session.id, tsPart, row.id);
      }
    }
  }
 
  const conversationCols = db.prepare(`PRAGMA table_info(conversations)`).all().map((c) => c.name);
  if (!conversationCols.includes("pinned")) {
    db.exec(`ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`);
  }
  if (!conversationCols.includes("archived")) {
    db.exec(`ALTER TABLE conversations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`);
  }
  const meetingCols4 = db.prepare(
    `PRAGMA table_info(meetings)`
  ).all().map((c) => c.name);

  if (!meetingCols4.includes("participants")) {
    db.exec(`ALTER TABLE meetings ADD COLUMN participants TEXT`);
  }
  const moduleCols = db
    .prepare(`PRAGMA table_info(modules)`)
    .all()
    .map((c) => c.name);

  if (!moduleCols.includes("planned_sessions")) {
    db.exec(`
      ALTER TABLE modules
      ADD COLUMN planned_sessions INTEGER NOT NULL DEFAULT 0
    `);
  }

  const engagementCols = db.prepare(`PRAGMA table_info(engagements)`).all().map((c) => c.name);
  if (!engagementCols.includes("details")) {
    db.exec(`ALTER TABLE engagements ADD COLUMN details TEXT NOT NULL DEFAULT ''`);
  }

  // Everything below scopes Modules & Sessions (and the Meetings that
  // create them) to a single engagement, so a Starter page can list
  // multiple engagements each with their own module list and session
  // counts instead of one shared global pool.
  //
  // This database only ever holds demo/seed data (see data/seedData.js),
  // never real customer records, so instead of writing fragile per-row
  // UPDATE ... WHERE x IS NULL backfills for legacy databases created
  // before engagement-scoping existed, a legacy database is simply wiped
  // and regenerated through the exact same insertion path a brand-new
  // install uses (resetDemoData -> seedIfEmpty). That guarantees the
  // reseeded data is fully self-consistent (correct engagement_id
  // everywhere, planned_sessions >= completed_sessions, etc.) instead of
  // relying on backfill passes that can drift from what a real insert
  // would produce.
  const sessionCols2 = db.prepare(`PRAGMA table_info(sessions)`).all().map((c) => c.name);
  const moduleColsForEngagement = db.prepare(`PRAGMA table_info(modules)`).all().map((c) => c.name);
  const isLegacyPreEngagementSchema =
    !sessionCols2.includes("engagement_id") || !moduleColsForEngagement.includes("engagement_id");

  if (!sessionCols2.includes("engagement_id")) {
    db.exec(`ALTER TABLE sessions ADD COLUMN engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE`);
  }

  const meetingCols5 = db.prepare(`PRAGMA table_info(meetings)`).all().map((c) => c.name);
  if (!meetingCols5.includes("engagement_id")) {
    db.exec(`ALTER TABLE meetings ADD COLUMN engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE`);
  }

  if (!moduleColsForEngagement.includes("engagement_id")) {
    // Module names used to be globally unique; now they're namespaced per
    // engagement, so the table is rebuilt with a surrogate key and a
    // (engagement_id, name) uniqueness constraint instead of `name` alone.
    // Data isn't copied over here because isLegacyPreEngagementSchema
    // triggers a full reseed right below anyway.
    db.exec(`DROP TABLE modules`);
    db.exec(`
      CREATE TABLE modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        planned_sessions INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(engagement_id, name)
      );
    `);
  }

  if (isLegacyPreEngagementSchema) {
    resetDemoData();
  }
}
function initDb() {
  db.exec(SCHEMA);
  migrateSchema();
  seedIfEmpty();
}
module.exports = { db, initDb, resetDemoData };