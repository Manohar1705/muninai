// Langfuse gives visibility into what every Groq call actually did —
// prompts, outputs, latency, token usage, failures — none of which was
// observable before (just console.error on failure, nothing on success).
// This module is deliberately the *only* thing that touches the Langfuse
// SDK; llm.js calls traceLlmCall() and doesn't need to know whether
// tracing is even configured.
//
// Same graceful-degradation pattern used everywhere else in this codebase
// (isGroqConfigured, isRecallConfigured): if the keys aren't set, every
// function here becomes a no-op rather than throwing — tracing being
// unavailable should never break the actual feature it's observing.

let langfuseClient = null;

function isLangfuseConfigured() {
  return Boolean(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY);
}

function getClient() {
  if (!isLangfuseConfigured()) return null;
  if (!langfuseClient) {
    // Required lazily — so `npm install` without the package (or without
    // Langfuse keys set) never breaks anything that doesn't use tracing.
    const { Langfuse } = require("langfuse");
    langfuseClient = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
    });
  }
  return langfuseClient;
}

/**
 * Wraps a single Groq call (chat completion or transcription) with a
 * Langfuse trace, if configured. Runs `fn` regardless either way — tracing
 * is purely observational and never changes control flow, and a Langfuse
 * network hiccup can never fail the underlying LLM call.
 *
 * @param {Object} info
 * @param {string} info.name - e.g. "extract-knowledge", "ask-munin", "transcribe-audio"
 * @param {string|Object} info.input - what was sent to Groq (truncated before logging)
 * @param {Object} [info.metadata] - e.g. { model, sourceLabel }
 * @param {string} [info.traceId] - an existing trace ID to nest this call under
 *   (e.g. the judge call nesting under the original ask-munin trace) instead
 *   of starting a new top-level trace.
 * @param {() => Promise<any>} fn - the actual Groq call + parsing logic
 */
  async function traceLlmCall({ name, input, metadata, traceId }, fn) {
    const lf = getClient();
    if (!lf) return fn(() => {}, null);

    // Reusing the same id attaches to the existing trace instead of creating
    // a new one — this is how nested/child calls (e.g. the judge grading an
    // ask-munin answer) show up as part of the original trace rather than as
    // their own separate row.
    const trace = traceId
      ? lf.trace({ id: traceId })
      : lf.trace({
          name,
          metadata,
          sessionId: metadata?.engagementId ? `engagement:${metadata.engagementId}` : undefined,
        });
    const generation = trace.generation({
    name,
    input: typeof input === "string" ? input.slice(0, 4000) : input,
    model: metadata?.model,
    metadata,
  });
  const startedAt = Date.now();
  let usage = null;
  const reportUsage = (u) => {
    if (!u) return;
    // Two shapes come through here: Groq's text calls report token counts
    // (prompt/completion/total), while transcription reports audio length
    // in seconds instead — Langfuse prices each differently (per-token vs
    // per-second), so they're kept as distinct usage shapes, not merged.
    if (u.seconds !== undefined) {
      usage = { total: u.seconds, unit: "SECONDS" };
    } else {
      usage = {
        promptTokens: u.promptTokens ?? u.prompt_tokens ?? undefined,
        completionTokens: u.completionTokens ?? u.completion_tokens ?? undefined,
        totalTokens: u.totalTokens ?? u.total_tokens ?? undefined,
      };
    }
  };
  try {
    const result = await fn(reportUsage, trace.id);
    generation.end({
      output: typeof result === "string" ? result.slice(0, 4000) : result,
      usage: usage || undefined,
      metadata: { ...metadata, latencyMs: Date.now() - startedAt },
    });
    // Fire-and-forget: don't let a slow/failed flush add latency to the
    // actual request, and never let it surface as an error to the caller.
    lf.flushAsync().catch((err) => console.error("Langfuse flush failed:", err.message));
    return result;
  } catch (err) {
    generation.end({
      level: "ERROR",
      statusMessage: err.message,
      metadata: { ...metadata, latencyMs: Date.now() - startedAt },
    });
    lf.flushAsync().catch(() => {});
    throw err; // tracing never swallows the real error
  }
}

module.exports = { isLangfuseConfigured, traceLlmCall, getClient };
