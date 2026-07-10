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
CREATE TABLE IF NOT EXISTS engagement (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  phase TEXT NOT NULL
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
  attendees TEXT NOT NULL -- JSON array of names
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
  segment_timestamp TEXT
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

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,          -- our own id, e.g. "mtg-XXXXXXXX"
  bot_id TEXT,                  -- Recall.ai bot id, set once createBot() returns
  meeting_url TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  status TEXT NOT NULL,         -- joining | in_call | call_ended | done | error
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL, -- linked once transcript is processed (Step 5)
  error TEXT,
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
    `INSERT INTO sessions (id, num, module, title, date, duration, status, attendees) VALUES (@id, @num, @module, @title, @date, @duration, @status, @attendees)`
  );
  const insertSegment = db.prepare(
    `INSERT INTO transcript_segments (session_id, seq, timestamp, speaker, text) VALUES (@session_id, @seq, @timestamp, @speaker, @text)`
  );
  const insertKO = db.prepare(
    `INSERT INTO knowledge_objects (id, title, type, module, description, confidence, needs_review, source, session_id, segment_timestamp)
     VALUES (@id, @title, @type, @module, @description, @confidence, @needs_review, @source, @session_id, @segment_timestamp)`
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
    `INSERT INTO chat_messages (role, text, citation, is_gap) VALUES (@role, @text, @citation, @is_gap)`
  );
  const insertSme = db.prepare(
    `INSERT OR REPLACE INTO smes (name, role) VALUES (@name, @role)`
  );

  // Helper: find which session a KO's source belongs to, and its timestamp
  function resolveKoSession(source) {
    const [titlePart, tsPart] = source.split(", ");
    const session = SESSIONS_SEED.find((s) => s.title === titlePart);
    return { sessionId: session ? session.id : null, ts: tsPart || null };
  }

  const seedTx = db.transaction(() => {
    if (tableIsEmpty("engagement")) {
      db.prepare(`INSERT INTO engagement (id, name, phase) VALUES (1, ?, ?)`).run(
        ENGAGEMENT.name,
        ENGAGEMENT.phase
      );
    }

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
          session_id: sessionId, segment_timestamp: ts,
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

    if (tableIsEmpty("activity")) {
      for (const a of ACTIVITY_SEED) insertActivity.run({ text: a.text, created_at: a.createdAt });
    }

    if (tableIsEmpty("chat_messages")) {
      for (const m of CHAT_SEED) {
        insertChat.run({ role: m.role, text: m.text, citation: m.citation, is_gap: m.isGap ? 1 : 0 });
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
    "chat_messages", "activity", "readiness", "key_person_risk",
    "sme_contributions", "gaps", "kt_topics", "knowledge_objects",
    "transcript_segments", "meeting_transcript_chunks", "meetings", "sessions", "smes", "engagement", "app_state",
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
  if (!meetingCols.includes("last_extracted_at")) {
    db.exec(`ALTER TABLE meetings ADD COLUMN last_extracted_at TEXT`);
  }
}

function initDb() {
  db.exec(SCHEMA);
  migrateSchema();
  seedIfEmpty();
}

module.exports = { db, initDb, resetDemoData };
