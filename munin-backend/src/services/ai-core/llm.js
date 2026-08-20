const fs = require("fs");
const path = require("path");
const {
  MODULE_MATCH_MIN_CONFIDENCE,
  UNCLASSIFIED_MODULE,
  normalizeKnownModule,
} = require("./keywordMatch");
const { traceLlmCall } = require("../observability");
const { judgeAskMuninAnswer } = require("./judge");
const { groundLlmResult, shortlistCandidates } = require("./chatRetrieval");
const {listModules} = require("../modules");
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


const extractionPromptTemplate = fs.readFileSync(
  path.join(__dirname, "../../prompts/extractionPrompt.txt"),
  "utf8"
);

const systemPromptTemplate = fs.readFileSync(
  path.join(__dirname, "../../prompts/systemPrompt.txt"),
  "utf8"
);
async function buildExtractionPrompt(text, sourceLabel, engagementId) {
  const knownModules = await listModules(engagementId);
  return extractionPromptTemplate
    .replace("{{SOURCE_LABEL}}", sourceLabel)
    .replace("{{TEXT}}", text.slice(0, 12000))
    .replace("{{VALID_MODULES}}", knownModules.length ? knownModules.map((m) => m.name).join(", ") : "(none yet)");
}

async function extractKnowledgeFromText(text, sourceLabel, engagementId) {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set — cannot run extraction.");
  }

  const prompt = await buildExtractionPrompt(text, sourceLabel, engagementId);
  const knownModuleNames = (await listModules(engagementId)).map((m) => m.name);
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  return traceLlmCall({ name: "extract-knowledge", input: prompt, metadata: { model, sourceLabel, engagementId } }, async (reportUsage) => {
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
    reportUsage(data.usage);
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

    // The prompt asks for an existing module, but persistence must not trust
    // the model to obey it. Invented and low-confidence labels are rejected.
    return objects
      .filter((o) => o && typeof o.title === "string" && typeof o.description === "string")
      .map((o) => {
        const exactModule = normalizeKnownModule(o.module, knownModuleNames);
        const moduleConfidence = typeof o.moduleConfidence === "number"
          ? Math.max(0, Math.min(1, o.moduleConfidence))
          : 0;

        return {
          title: o.title.slice(0, 200),
          description: o.description.slice(0, 2000),
          type: typeof o.type === "string" ? o.type : "Other",
          module: exactModule && moduleConfidence >= MODULE_MATCH_MIN_CONFIDENCE
            ? exactModule
            : UNCLASSIFIED_MODULE,
          moduleConfidence,
          confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5,
          // Raw, unverified — the LLM can hallucinate a name. Callers that
          // actually persist this (meetingProcessor.js) must cross-check it
          // against the real speakers present in that transcript before
          // trusting it for attribution.
          speaker: typeof o.speaker === "string" && o.speaker.trim() ? o.speaker.trim().slice(0, 100) : null,
        };
      });
  });
}

function buildSystemPrompt(candidates, dbContext = {}, conversationStats = {}) {
  const context = candidates
    .map((k, i) => `[${i + 1}] id=${k.id} sessionId=${k.sessionId || ""} module=${k.module} type=${k.type} title="${k.title}"
description: ${k.description}
speaker=${k.speaker || "unknown"}
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



Meeting Summary:
${(dbContext.meetingSummary || [])
  .map(m => `- ${m.meeting_title} (${m.status})`)
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


async function askLlm(question, knowledgeObjects, history = [], dbContext = {}, conversationStats = {}, engagementId = null) {
  const candidates = shortlistCandidates(question, knowledgeObjects, history, 25);
  const system = buildSystemPrompt(candidates, dbContext, conversationStats);
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
 
  // Prior turns are sent as real chat messages (not text stuffed into the
  // system prompt) so the model can naturally resolve follow-ups like "in
  // brief" or "the same" against what was actually said.
  const historyMessages = history.map((h) => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.text,
  }));
 
  return traceLlmCall({ name: "ask-munin", input: question, metadata: { model, candidateCount: candidates.length, historyTurns: history.length, engagementId } }, async (reportUsage, traceId) => {
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
    reportUsage(data.usage);
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
 
    const grounded = groundLlmResult(parsed, candidates);

    // Fire-and-forget — never awaited, so a slow/failed judge call can't
    // delay or break the user's actual answer.
    judgeAskMuninAnswer({ traceId, question, answer: grounded?.answer }).catch(() => {});

    return grounded;
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
async function transcribeAudio(buffer, filename, engagementId = null) {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set — cannot run speech-to-text.");
  }

  const model = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

  return traceLlmCall({ name: "transcribe-audio", input: `[audio file: ${filename}, ${buffer.length} bytes]`, metadata: { model, filename, engagementId } }, async (reportUsage) => {
    const form = new FormData();
    form.append("file", new Blob([buffer]), filename);
    form.append("model", model);
    form.append("response_format", "verbose_json");

    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Groq transcription error ${response.status}: ${errText}`);
    }

    // verbose_json includes { text, duration, ... } — duration is in
    // seconds. We report it as "seconds" (not a token count) so
    // observability.js can pass it through to Langfuse as-is.
    const data = await response.json();
    reportUsage({ seconds: Math.round(data.duration) });
    return data.text;
  });
}

module.exports = { isLlmConfigured, askLlm, shortlistCandidates, isGroqConfigured, extractKnowledgeFromText, transcribeAudio };
