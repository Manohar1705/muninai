const { tokenize } = require("./keywordMatch");

const RETRIEVAL_NOISE_WORDS = new Set([
  "about",
  "conversation",
  "did",
  "discuss",
  "discussed",
  "earlier",
  "session",
  "source",
  "tell",
  "where",
  "which",
]);

function meaningfulTerms(text) {
  return tokenize(text).filter((word) => !RETRIEVAL_NOISE_WORDS.has(word));
}

function compact(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const CASUAL_PATTERN = /^(hi|hello|hey|hii+|thanks|thank you|thx|bye|ok|okay|good morning|good evening)[\s!.?]*$/i;

function termsForRetrieval(question, history = []) {
  const currentTerms = meaningfulTerms(question);
  if (currentTerms.length) return currentTerms;

  // A greeting/small-talk message has no real terms, same as a genuine
  // follow-up ("and what about invoicing?") — but it should NOT reuse the
  // prior question's context, unlike a real follow-up.
  if (CASUAL_PATTERN.test(String(question || "").trim())) return [];

  const normalizedQuestion = String(question || "").trim().toLowerCase();
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn?.role !== "user") continue;
    if (String(turn.text || "").trim().toLowerCase() === normalizedQuestion) continue;

    const priorTerms = meaningfulTerms(turn.text);
    if (priorTerms.length) return priorTerms;
  }

  return [];
}

function shortlistCandidates(question, knowledgeObjects, history = [], limit = 50) {
  const terms = termsForRetrieval(question, history);
  if (!terms.length) return [];

  const scored = knowledgeObjects.map((item, index) => {
    const haystack = [
      item.title,
      item.description,
      item.module,
      item.type,
      item.source,
      item.sessionTitle,
      item.sessionId,
    ].join(" ").toLowerCase();
    const compactHaystack = compact(haystack);
    let score = 0;

    for (const term of terms) {
      if (haystack.includes(term) || compactHaystack.includes(compact(term))) {
        score += 1;
      }
    }

    return { item, score, index };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

function groundLlmResult(result, candidates) {
  const source = candidates.find((item) => item.id === result?.sourceId);
  if (source) {
    return { ...result, sourceId: source.id };
  }

  const shouldUseKtSource =
    candidates.length > 0 && (result?.mode === "chat" || result?.covered === true);

  if (shouldUseKtSource) {
    return {
      ...result,
      mode: "kt",
      covered: true,
      sourceId: candidates[0].id,
    };
  }

  return { ...result, sourceId: null };
}

module.exports = {
  groundLlmResult,
  meaningfulTerms,
  shortlistCandidates,
  termsForRetrieval,
};
