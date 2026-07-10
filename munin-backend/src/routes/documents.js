const path = require("path");
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { nanoid } = require("nanoid");
const { db } = require("../db");
const { isGroqConfigured, extractKnowledgeFromText } = require("../services/llm");
const { bumpReadinessForKnowledgeObjects } = require("../services/readiness");

const router = express.Router();

// Memory storage — we only need the bytes long enough to extract text.
// Nothing is written to disk, nothing persists between requests.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB, matches Groq's free-tier audio cap for later reuse
});

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".pdf", ".docx"]);

async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === ".txt" || ext === ".md") {
    return file.buffer.toString("utf-8");
  }

  if (ext === ".pdf") {
    const result = await pdfParse(file.buffer);
    return result.text;
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type "${ext}". Supported: .txt, .md, .pdf, .docx`);
}

// POST /api/documents/upload  (multipart/form-data, field name: "file")
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Send it as multipart/form-data under the field name 'file'." });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return res.status(400).json({
      error: `Unsupported file type "${ext}". Supported: .txt, .md, .pdf, .docx`,
    });
  }

  try {
    const extractedText = await extractText(req.file);
    const trimmed = extractedText.trim();

    if (!trimmed) {
      return res.status(422).json({ error: "No text could be extracted from this file (it may be empty, scanned, or image-only)." });
    }

    // Step 1 proved upload + extraction. Step 2: send extractedText into
    // Groq, then persist a real session + knowledge objects — no more
    // hardcoded "Session 9" logic for anything going through this route.
    if (!isGroqConfigured()) {
      return res.status(503).json({
        error: "GROQ_API_KEY is not set on the backend. Add it to .env to enable knowledge extraction.",
        extractedText: trimmed, // still return the raw text so the pipeline isn't a dead end
      });
    }

    let knowledgeObjects;
    try {
      knowledgeObjects = await extractKnowledgeFromText(trimmed, req.file.originalname);
    } catch (err) {
      return res.status(502).json({ error: `Groq extraction failed: ${err.message}` });
    }

    const sessionId = `doc-${nanoid(8)}`;
    const now = new Date();
    const primaryModule = knowledgeObjects[0]?.module || "Unclassified";

    const insertSession = db.prepare(
      `INSERT INTO sessions (id, num, module, title, date, duration, status, attendees, source_type)
       VALUES (@id, @num, @module, @title, @date, @duration, @status, @attendees, @source_type)`
    );
    const insertKO = db.prepare(
      `INSERT INTO knowledge_objects (id, title, type, module, description, confidence, needs_review, source, session_id, segment_timestamp)
       VALUES (@id, @title, @type, @module, @description, @confidence, @needs_review, @source, @session_id, @segment_timestamp)`
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
        attendees: JSON.stringify(["Document Upload"]),
        source_type: "document",
      });

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
          source: `${req.file.originalname} (document upload)`,
          session_id: sessionId,
          segment_timestamp: null,
        });
        savedKOs.push({ id: koId, ...k, needsReview: k.confidence < 0.6, source: `${req.file.originalname} (document upload)` });
      }

      insertActivity.run({
        text: `Document "${req.file.originalname}" processed — ${knowledgeObjects.length} knowledge object(s) extracted.`,
        created_at: now.toISOString(),
      });
    });
    tx();

    const updatedReadiness = bumpReadinessForKnowledgeObjects(savedKOs);

    res.json({
      session: { id: sessionId, num: nextNumRow.n, module: primaryModule, title: req.file.originalname, sourceType: "document" },
      knowledgeObjects: savedKOs,
      updatedReadiness,
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to extract text: ${err.message}` });
  }
});

// Multer-specific errors (file too large, wrong field name, etc.) need their
// own handler — they throw before reaching the route body above.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
});

module.exports = router;
