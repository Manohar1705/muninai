const { Pool, types } = require("pg");
const { AsyncLocalStorage } = require("async_hooks");

// node-postgres returns BIGINT (e.g. every `COUNT(*)`) as a string by
// default, to avoid silent precision loss for huge counts. This app's
// counts never get anywhere near that range and a lot of existing code
// does `=== 0` / arithmetic on COUNT(*) results, so parse it back to a
// normal JS number globally instead of touching every call site.
types.setTypeParser(20, (val) => parseInt(val, 10));

const REQUIRED_DB_ENV = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingDbEnv = REQUIRED_DB_ENV.filter((name) => !process.env[name]);
if (missingDbEnv.length) {
  throw new Error(`Missing required database environment variable(s): ${missingDbEnv.join(", ")}. See .env.example.`);
}

const dbPort = Number(process.env.DB_PORT);
if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
  throw new Error("DB_PORT must be an integer between 1 and 65535.");
}

const connectionString =
  `postgresql://${encodeURIComponent(process.env.DB_USER)}` +
  `:${encodeURIComponent(process.env.DB_PASSWORD)}` +
  `@${process.env.DB_HOST}:${dbPort}` +
  `/${encodeURIComponent(process.env.DB_NAME)}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err.message);
});

const txContext = new AsyncLocalStorage();
function getClient() {
  return txContext.getStore() || pool;
}

function compile(sql, args) {
  const namedMode = args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0]);

  if (namedMode) {
    const obj = args[0];
    const values = [];
    const text = sql.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      values.push(obj[name]);
      return `$${values.length}`;
    });
    return { text, values };
  }

  let i = 0;
  const text = sql.replace(/\?/g, () => `$${++i}`);
  return { text, values: [...args] };
}

function prepare(sql) {
  return {
    async all(...args) {
      const { text, values } = compile(sql, args);
      const result = await getClient().query(text, values);
      return result.rows;
    },
    async get(...args) {
      const { text, values } = compile(sql, args);
      const result = await getClient().query(text, values);
      return result.rows[0];
    },
    async run(...args) {
      const { text, values } = compile(sql, args);
      const result = await getClient().query(text, values);
      return {
        changes: result.rowCount,
        rows: result.rows,
        lastInsertRowid: result.rows[0]?.id,
      };
    },
  };
}

async function exec(sql) {
  await getClient().query(sql);
}

function transaction(fn) {
  return async (...args) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await txContext.run(client, () => fn(...args));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };
}

const db = { prepare, exec, transaction, pool };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS engagements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phase TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  attendees TEXT NOT NULL,
  engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'kt_session'
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id SERIAL PRIMARY KEY,
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
  source TEXT NOT NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  segment_timestamp TEXT,
  speaker TEXT                   -- who this fact is attributed to (meetings
                                 -- only — validated against real speakers seen
                                 -- in that meeting's transcript at insert time)
);

CREATE TABLE IF NOT EXISTS kt_topics (
  id SERIAL PRIMARY KEY,
  module TEXT NOT NULL,
  topic TEXT NOT NULL,
  depth INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gaps (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL, -- Open | Scheduled for next session | Closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sme_contributions (
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL, -- user | assistant
  text TEXT NOT NULL,
  citation TEXT,
  citation_session_id TEXT,
  citation_timestamp TEXT,
  is_gap INTEGER NOT NULL DEFAULT 0,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Modules are namespaced per engagement (two engagements may each define
-- a module called "Payments Core" without colliding) so the uniqueness
-- constraint is on (engagement_id, name), not name alone.
CREATE TABLE IF NOT EXISTS modules(
  id SERIAL PRIMARY KEY,
  engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  planned_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  last_extracted_seq INTEGER NOT NULL DEFAULT -1,
  last_extracted_at TEXT,
  meeting_title TEXT,
  participants TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 5: raw transcript pieces streamed in live from Recall.ai's
-- transcript.data webhook while a bot is in a call. Keyed by bot_id (not
-- meeting id) because the webhook payload only carries the bot id. Once the
-- meeting ends, these rows are read in seq order, turned into real
-- transcript_segments under a new session, and left in place as a raw log.
CREATE TABLE IF NOT EXISTS meeting_transcript_chunks (
  id SERIAL PRIMARY KEY,
  bot_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function tableIsEmpty(table) {
  const row = await db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
  return row.c === 0;
}

async function seedIfEmpty() {
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
    `INSERT INTO activity (text, created_at, engagement_id) VALUES (@text, @created_at, @engagement_id)`
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

  const seedTx = db.transaction(async () => {
    // Multiple app instances can boot against the same RDS database during
    // a rolling deploy. Serialize the empty-table checks and inserts so two
    // instances cannot both attempt to seed the same rows.
    await db.exec("SELECT pg_advisory_xact_lock(1297435981)");

    if (await tableIsEmpty("engagements")) {
      await db.prepare(`
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
    const seedEngagementId = (await db.prepare(`SELECT id FROM engagements ORDER BY id ASC LIMIT 1`).get())?.id || null;

    if (await tableIsEmpty("smes")) {
      for (const [name, role] of Object.entries(SME_ROLES)) {
        await insertSme.run({ name, role });
      }
    }

    if (await tableIsEmpty("sessions")) {
      for (const s of SESSIONS_SEED) {
        await insertSession.run({
          id: s.id, num: s.num, module: s.module, title: s.title,
          date: s.date, duration: s.duration, status: s.status,
          attendees: JSON.stringify(s.attendees),
          engagement_id: seedEngagementId,
        });
        for (let i = 0; i < s.transcript.length; i++) {
          const seg = s.transcript[i];
          await insertSegment.run({ session_id: s.id, seq: i, timestamp: seg.t, speaker: seg.s, text: seg.x });
        }
      }
    }

    if (await tableIsEmpty("knowledge_objects")) {
      for (const k of KNOWLEDGE_OBJECTS_SEED) {
        if (k.source.startsWith("KT Session 9")) continue;
        const { sessionId, ts } = resolveKoSession(k.source);
        await insertKO.run({
          id: k.id, title: k.title, type: k.type, module: k.module,
          description: k.description, confidence: k.confidence,
          needs_review: k.needsReview ? 1 : 0, source: k.source,
          session_id: sessionId, segment_timestamp: ts, speaker: null,
        });
      }
    }

    if (await tableIsEmpty("kt_topics")) {
      for (const t of KT_TOPICS_SEED) await insertTopic.run(t);
    }

    if (await tableIsEmpty("gaps")) {
      for (const g of GAPS_SEED) await insertGap.run(g);
    }

    if (await tableIsEmpty("sme_contributions")) {
      for (const [module, people] of Object.entries(SME_MAP_SEED)) {
        for (const p of people) await insertSmeContribution.run({ module, name: p.name, share: p.share });
      }
    }

    if (await tableIsEmpty("key_person_risk")) {
      for (const module of KEY_PERSON_RISK_MODULES) {
        await db.prepare(`INSERT INTO key_person_risk (module) VALUES (?)`).run(module);
      }
    }

    if (await tableIsEmpty("readiness")) {
      for (const [module, score] of Object.entries(READINESS_INITIAL)) {
        await insertReadiness.run({ module, score });
      }
    }
    if (await tableIsEmpty("modules")) {
      // Seed planned_sessions from the actual seeded session count per
      // module (plus a small realistic backlog) so the demo engagement
      // starts in a believable "in progress" state instead of violating
      // the planned >= completed invariant with a planned count of 0.
      const insertModule = db.prepare(
        `INSERT INTO modules (engagement_id, name, planned_sessions) VALUES (?, ?, ?) ON CONFLICT (engagement_id, name) DO NOTHING`
      );
      for (const [module] of Object.entries(READINESS_INITIAL)) {
        const completedCount = SESSIONS_SEED.filter((s) => s.module === module).length;
        await insertModule.run(seedEngagementId, module, completedCount + 2);
      }
    }

    if (await tableIsEmpty("activity")) {
      for (const a of ACTIVITY_SEED) await insertActivity.run({ text: a.text, created_at: a.createdAt, engagement_id: seedEngagementId });
    }

    if (await tableIsEmpty("conversations")) {
      await insertConversation.run({ id: "conv-demo", title: "Demo Q&A" });
    }

    if (await tableIsEmpty("chat_messages")) {
      for (const m of CHAT_SEED) {
        // citation_session_id/timestamp are what "View source" in Ask Munin
        // actually navigates on.
        const resolved = m.citation ? resolveKoSession(m.citation) : { sessionId: null, ts: null };
        await insertChat.run({
          role: m.role, text: m.text, citation: m.citation,
          citation_session_id: resolved.sessionId, citation_timestamp: resolved.ts,
          is_gap: m.isGap ? 1 : 0, conversation_id: "conv-demo",
        });
      }
    }

    if (await tableIsEmpty("app_state")) {
      await db.prepare(`INSERT INTO app_state (key, value) VALUES ('session9_uploaded', 'false')`).run();
    }
  });

  await seedTx();
}

async function resetDemoData() {
  const tables = [
    "chat_messages", "conversations", "modules", "activity", "readiness", "key_person_risk",
    "sme_contributions", "gaps", "kt_topics", "knowledge_objects",
    "transcript_segments", "meeting_transcript_chunks", "meetings", "sessions", "smes", "engagements", "app_state",
  ];

  const resetTx = db.transaction(async () => {
    for (const t of tables) await db.prepare(`DELETE FROM ${t}`).run();
  });
  await resetTx();
  await seedIfEmpty();
}

// This database only ever holds demo/seed data (see data/seedData.js),
// never real customer records, and this is a fresh Postgres instance with
// no legacy rows to migrate — so unlike the old SQLite version, there's no
// incremental ALTER-TABLE migration path to port. The schema above already
// includes every column an existing SQLite install would have needed a
// migration to add.
async function initDb() {
  await db.exec(SCHEMA);
}
module.exports = { db, initDb };
