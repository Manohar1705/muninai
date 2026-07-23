// POST /api/media/upload — a separate upload path from documents.js, for
// video/audio recordings (screen recordings, call recordings, voice notes)
// instead of text documents. The two are deliberately kept as separate
// routes/endpoints rather than one "smart" upload that branches on file
// type — different failure modes (a stuck STT call vs. a stuck text
// extraction call), different size limits, different UI copy.
//
// Flow: file -> Groq Whisper transcription -> same extractKnowledgeFromText
// used everywhere else -> real session + knowledge objects. Steps 2 onward
// are identical to how meeting transcripts get processed once captured;
// only step 1 (getting text out of the file in the first place) differs.

const path = require("path");
const express = require("express");
const multer = require("multer");
const { nanoid } = require("nanoid");
const { db } = require("../db");
const { isGroqConfigured, extractKnowledgeFromText, transcribeAudio } = require("../services/llm");
const { bumpReadinessForKnowledgeObjects } = require("../services/readiness");
const { guessModule } = require("../services/keywordMatch");
const { listModules, ensureModule } = require("../services/modules");

const router = express.Router();

// 25MB matches Groq's direct-upload transcription cap. Files larger than
// that would need the url-based path Groq also offers (upload somewhere
// public first, hand Groq a link) — not implemented here; if that's ever
// needed, this limit is the first thing to revisit.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Formats Groq's transcription API documents support for direct upload.
const SUPPORTED_EXTENSIONS = new Set([".mp4", ".mp3", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"]);

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Send it as multipart/form-data under the field name 'file'." });
  }

  const engagementId = req.body?.engagementId ? Number(req.body.engagementId) : null;
  if (!engagementId) {
    return res.status(400).json({ error: "engagementId is required." });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return res.status(400).json({
      error: `Unsupported file type "${ext}". Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")} (max 25MB).`,
    });
  }

  if (!isGroqConfigured()) {
    return res.status(503).json({
      error: "GROQ_API_KEY is not set on the backend. Add it to .env to enable speech-to-text and knowledge extraction.",
    });
  }

  let transcript;
  try {
    transcript = await transcribeAudio(req.file.buffer, req.file.originalname);
  } catch (err) {
    return res.status(502).json({ error: `Speech-to-text failed: ${err.message}` });
  }

  const trimmed = (transcript || "").trim();
  if (!trimmed) {
    return res.status(422).json({ error: "No speech was detected in this recording (it may be silent, music-only, or too short)." });
  }

  let knowledgeObjects;
  try {
    knowledgeObjects = await extractKnowledgeFromText(trimmed, req.file.originalname, engagementId);
  } catch (err) {
    // The transcript itself is still valuable even if extraction failed —
    // hand it back so the pipeline isn't a dead end, same pattern as
    // documents.js's missing-GROQ_API_KEY response.
    return res.status(502).json({ error: `Transcribed successfully, but knowledge extraction failed: ${err.message}`, transcript: trimmed });
  }

  try {
    const sessionId = `rec-${nanoid(8)}`;
    const now = new Date();

    const primaryModule = knowledgeObjects[0]?.module || guessModule(trimmed, listModules(engagementId).map((m)=>m.name));

    ensureModule(primaryModule, engagementId);
    for (const k of knowledgeObjects) {
      ensureModule(k.module, engagementId);
    }
    const sourceLabel = `${req.file.originalname} (recording upload)`;

    const insertSession = db.prepare(
      `INSERT INTO sessions (id, num, module, title, date, duration, status, attendees, source_type, engagement_id)
       VALUES (@id, @num, @module, @title, @date, @duration, @status, @attendees, @source_type, @engagement_id)`
    );
    const insertSegment = db.prepare(
      `INSERT INTO transcript_segments (session_id, seq, timestamp, speaker, text) VALUES (@session_id, @seq, @timestamp, @speaker, @text)`
    );
    const insertKO = db.prepare(
      `INSERT INTO knowledge_objects (id, title, type, module, description, confidence, needs_review, source, session_id, segment_timestamp, speaker)
       VALUES (@id, @title, @type, @module, @description, @confidence, @needs_review, @source, @session_id, @segment_timestamp, @speaker)`
    );
    const insertActivity = db.prepare(`INSERT INTO activity (text, created_at) VALUES (@text, @created_at)`);
    const nextNumRow = db.prepare(`SELECT COALESCE(MAX(num), 0) + 1 AS n FROM sessions`).get();

    const savedKOs = [];
    const tx = db.transaction(() => {
      insertSession.run({
        id: sessionId,
        num: nextNumRow.n,
        module: primaryModule,
        title: req.file.originalname,
        date: now.toISOString().slice(0, 10),
        duration: "N/A",
        status: "Complete",
        attendees: JSON.stringify(["Recording Upload"]),
        source_type: "recording",
        engagement_id: engagementId,
      });

      // Groq's transcription API returns one continuous transcript, not
      // per-speaker turns — there's no reliable signal to split this into a
      // real multi-speaker dialogue, so it's stored as a single segment
      // rather than fabricating fake speaker labels.
      insertSegment.run({ session_id: sessionId, seq: 0, timestamp: "00:00:00", speaker: "Recording", text: trimmed });

      for (const k of knowledgeObjects) {
        const koId = `ko-${nanoid(8)}`;
        insertKO.run({
          id: koId,
          title: k.title,
          type: k.type,
          module: k.module,
          description: k.description,
          confidence: k.confidence,
          needs_review: k.confidence < 0.6 ? 1 : 0,
          source: sourceLabel,
          session_id: sessionId,
          segment_timestamp: "00:00:00",
          // The transcription is one blended "Recording" voice, not real
          // per-person turns, so there's no individual to attribute to.
          speaker: null,
        });
        savedKOs.push({ id: koId, ...k, needsReview: k.confidence < 0.6, source: sourceLabel });
      }

      insertActivity.run({
        text: `Recording "${req.file.originalname}" transcribed and processed — ${knowledgeObjects.length} knowledge object(s) extracted.`,
        created_at: now.toISOString(),
      });
    });
    tx();

    const updatedReadiness = bumpReadinessForKnowledgeObjects(savedKOs);

    res.json({
      session: { id: sessionId, num: nextNumRow.n, module: primaryModule, title: req.file.originalname, sourceType: "recording" },
      knowledgeObjects: savedKOs,
      updatedReadiness,
      transcriptPreview: trimmed.slice(0, 500),
    });
  } catch (err) {
    res.status(500).json({ error: `Transcribed, but failed to save the session: ${err.message}` });
  }
});

// Multer-specific errors (file too large, wrong field name, etc.)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
});

module.exports = router;
