const fs = require("fs");
const path = require("path");
const { tokenize, guessModule } = require("./keywordMatch");
const { traceLlmCall } = require("./observability");
const {listModules} = require("./modules");
// const { MODULES } = require("../data/seedData");

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


// const VALID_MODULES = [...MODULES, "Unclassified"];

const extractionPromptTemplate = fs.readFileSync(
  path.join(__dirname, "../prompts/extractionPrompt.txt"),
  "utf8"
);

const systemPromptTemplate = fs.readFileSync(
  path.join(__dirname, "../prompts/systemPrompt.txt"),
  "utf8"
);
function sanitizeModule(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(unclassified|n\/a|none|unknown|general)$/i.test(trimmed)) return null;
  return trimmed.slice(0,60);
}
function buildExtractionPrompt(text, sourceLabel, engagementId) {
  const knownModules = listModules(engagementId);
  return extractionPromptTemplate
    .replace("{{SOURCE_LABEL}}", sourceLabel)
    .replace("{{TEXT}}", text.slice(0, 12000))
    .replace("{{VALID_MODULES}}", knownModules.length ? knownModules.map((m) => m.name).join(", ") : "(none yet)");
}

async function extractKnowledgeFromText(text, sourceLabel, engagementId) {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set — cannot run extraction.");
  }

  const prompt = buildExtractionPrompt(text, sourceLabel, engagementId);
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
      parsed = {
        mode: "chat",
        covered: false,
        answer: cleaned || raw,
        sourceId: null
      };

      
    }

    const objects = Array.isArray(parsed.objects) ? parsed.objects : [];

    // Defensive normalization — never trust the model's output shape blindly.
    return objects
      .filter((o) => o && typeof o.title === "string" && typeof o.description === "string")
      .map((o) => ({
        title: o.title.slice(0, 200),
        description: o.description.slice(0, 2000),
        type: typeof o.type === "string" ? o.type : "Other",
        // module: VALID_MODULES.includes(o.module) ? o.module : guessModule(`${o.title} ${o.description}`),
        module: sanitizeModule(o.module) || guessModule(`${o.title} ${o.description}`, listModules(engagementId).map((m) => m.name)),
        confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5,
        // Raw, unverified — the LLM can hallucinate a name. Callers that
        // actually persist this (meetingProcessor.js) must cross-check it
        // against the real speakers present in that transcript before
        // trusting it for attribution.
        speaker: typeof o.speaker === "string" && o.speaker.trim() ? o.speaker.trim().slice(0, 100) : null,
      }));
  });
}

/**
 * Cheaply narrows the full knowledge base down to a shortlist of candidate
 * objects so we don't ship the entire KB as context on every request.
 */
function shortlistCandidates(question, knowledgeObjects, limit = 50) {
  const qWords = tokenize(question);
  const scored = knowledgeObjects.map((k) => {
    const haystack = `${k.title} ${k.description} ${k.module} ${k.type}`.toLowerCase();
    let score = 0;
    for (const w of qWords) if (haystack.includes(w)) score += 1;
    return { k, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Always send some KT context, even when keyword matching is weak.
  const matches = scored.filter((s) => s.score > 0);

  if (matches.length > 0) {
    return matches.slice(0, limit).map((s) => s.k);
  }

  return scored.slice(0, Math.min(limit, 30)).map((s) => s.k);
}

function buildSystemPrompt(candidates, dbContext = {}, conversationStats = {}) {
  const context = candidates
    .map((k, i) => `[${i + 1}] id=${k.id} module=${k.module} type=${k.type} title="${k.title}"
description: ${k.description}
source: ${k.source}`)
    .join("\n\n");

const liveData = `
Live Database Information:
- Sessions Processed: ${dbContext.sessionCount ?? 0}
- Meetings: ${dbContext.meetingCount ?? 0}
- Open Gaps: ${dbContext.openGapCount ?? 0}
- Modules: ${dbContext.moduleCount ?? 0}
Conversation Information:
- Total Messages: ${conversationStats.messageCount ?? 0}

Recent User Topics:
${(conversationStats.recentTopics || [])
  .map(t => `- ${t.text}`)
  .join("\n")}

Top Readiness Scores:
${(dbContext.readiness || [])
  .map(r => `- ${r.module}: ${r.score}%`)
  .join("\n")}

Available Modules:
${(dbContext.modules || [])
  .map(m => `- ${m.name}`)
  .join("\n")}

Recent Sessions:
${(dbContext.recentSessions || [])
  .map(s => `- ${s.title} (${s.module})`)
  .join("\n")}

Recent Meetings:
${(dbContext.recentMeetings || [])
  .map(
    m =>
      `- ${m.meeting_title || "Untitled"} | ${m.status}`
  )
  .join("\n")}

Engagement:
${dbContext.engagement
  ? `- ${dbContext.engagement.name} (${dbContext.engagement.phase})`
  : "- No engagement found"}

All Readiness Scores:
${(dbContext.readinessDetails || [])
  .map(r => `- ${r.module}: ${r.score}%`)
  .join("\n")}

Lowest Readiness Modules:
${(dbContext.lowestReadiness || [])
  .map(r => `- ${r.module}: ${r.score}%`)
  .join("\n")}

Recent Session Summary:
${(dbContext.sessionSummary || [])
  .map(s => `- ${s.title} (${s.module})`)
  .join("\n")}

Recent Gaps:
${(dbContext.recentGaps || [])
  .map(g => `- ${g.question} | ${g.module} | ${g.status}`)
  .join("\n")}

Gap Summary By Module:
${(dbContext.gapSummary || [])
  .map(g => `- ${g.module}: ${g.count}`)
  .join("\n")}

Modules:
${(dbContext.moduleSummary || [])
  .map(m => `- ${m.name}`)
  .join("\n")}

Meeting Summary:
${(dbContext.meetingSummary || [])
  .map(m => `- ${m.meeting_title} (${m.status})`)
  .join("\n")}

Readiness Summary:
${(dbContext.readinessSummary || [])
  .map(r => `- ${r.module}: ${r.score}%`)
  .join("\n")}
`;



  return (
    systemPromptTemplate
      .replace("{{CONTEXT}}", context || "(no relevant excerpts found)") +
    `

  IMPORTANT:
  The "Live Database Information" section below contains the current state of the system and is authoritative.

  When the user asks about:
  - readiness
  - readiness scores
  - readiness status
  - dashboard
  - meetings
  - sessions
  - engagement
  - gaps
  - modules

  ALWAYS prioritize the Live Database Information.

  If database information directly answers the question:
  - answer from the database
  - do not say information is unavailable
  - do not prefer KT excerpts over database values
  - use the exact values provided in the database context

  Questions about dashboard should be answered using:
  - readiness scores
  - session counts
  - meeting counts
  - open gaps
  - modules
  - engagement information

  ` +
    liveData
  );
}


async function askLlm(question, knowledgeObjects, history = [], dbContext = {}, conversationStats = {}) {
  const candidates = shortlistCandidates(question, knowledgeObjects, 25);
  const system = buildSystemPrompt(candidates, dbContext, conversationStats);
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
 
  // Prior turns are sent as real chat messages (not text stuffed into the
  // system prompt) so the model can naturally resolve follow-ups like "in
  // brief" or "the same" against what was actually said.
  const historyMessages = history.map((h) => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.text,
  }));
 
  return traceLlmCall({ name: "ask-munin", input: question, metadata: { model, candidateCount: candidates.length, historyTurns: history.length } }, async () => {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          ...historyMessages,
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
      return {
        mode: "kt",
        covered: false,
        answer: "I couldn't find information about this in the current KT knowledge base.",
        sourceId: null
      };
    }
 
    if (parsed.covered && parsed.sourceId) {
      const match = knowledgeObjects.find((k) => k.id === parsed.sourceId);

      if (match) {
        parsed.sourceId = match.id;
      } else {
        parsed.sourceId = null;
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
