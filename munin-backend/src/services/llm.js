const fs = require("fs");
const path = require("path");
const { tokenize } = require("./keywordMatch");
const { traceLlmCall } = require("./observability");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Chat ("Ask Munin") and extraction (documents/meetings) both run on Groq
// now, so both checks resolve to the same env var. isLlmConfigured stays a
// distinct export — kept for chat.js's call sites, which are asking
// conceptually different questions than the extraction routes even though
// they land on the same GROQ_API_KEY check today.
function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

function isLlmConfigured() {
  return isGroqConfigured();
}

const VALID_MODULES = [
  "Customer Notifications",
  "Payments",
  "Onboarding",
  "Reporting",
  "Infrastructure",
  "Unclassified",
];
const extractionPromptTemplate = fs.readFileSync(
  path.join(__dirname, "../prompts/extractionPrompt.txt"),
  "utf8"
);

const systemPromptTemplate = fs.readFileSync(
  path.join(__dirname, "../prompts/systemPrompt.txt"),
  "utf8"
);
function buildExtractionPrompt(text, sourceLabel) {
  return extractionPromptTemplate
    .replace("{{SOURCE_LABEL}}", sourceLabel)
    .replace("{{TEXT}}", text.slice(0, 12000))
    .replace("{{VALID_MODULES}}", VALID_MODULES.join(", "));
}

async function extractKnowledgeFromText(text, sourceLabel) {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set — cannot run extraction.");
  }

  const prompt = buildExtractionPrompt(text, sourceLabel);
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  return traceLlmCall({ name: "extract-knowledge", input: prompt, metadata: { model, sourceLabel } }, async () => {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/^```json/i, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Groq returned non-JSON output: ${raw.slice(0, 200)}`);
    }

    const objects = Array.isArray(parsed.objects) ? parsed.objects : [];

    // Defensive normalization — never trust the model's output shape blindly.
    return objects
      .filter((o) => o && typeof o.title === "string" && typeof o.description === "string")
      .map((o) => ({
        title: o.title.slice(0, 200),
        description: o.description.slice(0, 2000),
        type: typeof o.type === "string" ? o.type : "Other",
        module: VALID_MODULES.includes(o.module) ? o.module : "Unclassified",
        confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5,
      }));
  });
}

/**
 * Cheaply narrows the full knowledge base down to a shortlist of candidate
 * objects so we don't ship the entire KB as context on every request.
 */
function shortlistCandidates(question, knowledgeObjects, limit = 8) {
  const qWords = tokenize(question);
  const scored = knowledgeObjects.map((k) => {
    const haystack = `${k.title} ${k.description} ${k.module} ${k.type}`.toLowerCase();
    let score = 0;
    for (const w of qWords) if (haystack.includes(w)) score += 1;
    return { k, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.k);
}

function buildSystemPrompt(candidates) {
  const context = candidates
    .map((k, i) => `[${i + 1}] id=${k.id} module=${k.module} type=${k.type} title="${k.title}"
description: ${k.description}
source: ${k.source}`)
    .join("\n\n");

  return systemPromptTemplate.replace(
    "{{CONTEXT}}",
    context || "(no relevant excerpts found)"
  );
}


async function askLlm(question, knowledgeObjects) {
  const candidates = shortlistCandidates(question, knowledgeObjects);
  const system = buildSystemPrompt(candidates);
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  return traceLlmCall({ name: "ask-munin", input: question, metadata: { model, candidateCount: candidates.length } }, async () => {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || "").trim();

    const cleaned = text.replace(/^```json/i, "").replace(/```$/, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // If the model didn't return clean JSON, fail safe into "not covered"
      // so the caller falls back to gap-logging behavior.
      return { covered: false, answer: "This hasn't been covered in KT yet — I've logged it as a gap.", sourceId: null };
    }

    if (parsed.covered && parsed.sourceId) {
      const match = knowledgeObjects.find((k) => k.id === parsed.sourceId);
      if (!match) {
        // Model hallucinated a source id — don't trust the answer.
        return { covered: false, answer: "This hasn't been covered in KT yet — I've logged it as a gap.", sourceId: null };
      }
    }

    return parsed;
  });
}

/**
 * Speech-to-text for uploaded recordings (routes/media.js) — a separate
 * concern from meeting transcription. Meetings get their transcript for
 * free from the video platform's own live captions (see meetingBot.js);
 * an uploaded file has no such captions, so this actually runs Whisper via
 * Groq to produce one before extraction can run on it.
 *
 * Groq's transcription endpoint accepts mp3/mp4/mpeg/mpga/m4a/wav/webm
 * directly (it extracts the audio track itself for video containers, no
 * ffmpeg needed on our side) — capped at 25MB on direct upload.
 */
async function transcribeAudio(buffer, filename) {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set — cannot run speech-to-text.");
  }

  const model = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

  return traceLlmCall({ name: "transcribe-audio", input: `[audio file: ${filename}, ${buffer.length} bytes]`, metadata: { model, filename } }, async () => {
    const form = new FormData();
    form.append("file", new Blob([buffer]), filename);
    form.append("model", model);
    form.append("response_format", "text");

    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Groq transcription error ${response.status}: ${errText}`);
    }

    // response_format: "text" returns the raw transcript as plain text, not JSON.
    return response.text();
  });
}

module.exports = { isLlmConfigured, askLlm, shortlistCandidates, isGroqConfigured, extractKnowledgeFromText, transcribeAudio };
