// const { MODULES } = require("../data/seedData");

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "how", "why", "when",
  "does", "do", "for", "of", "to", "in", "on", "and", "or", "if", "it", "who",
  "will", "can", "should", "there", "with", "this", "that", "be", "have",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Finds the best-matching knowledge object for a free-text question using
 * simple token-overlap scoring. Returns null if nothing scores highly enough
 * to count as "covered by KT".
 */
function findBestMatch(question, knowledgeObjects) {
  const qWords = tokenize(question);
  let best = null;
  let bestScore = 0;

  for (const k of knowledgeObjects) {
    const haystack = `${k.title} ${k.description} ${k.module} ${k.type}`.toLowerCase();
    let score = 0;
    for (const w of qWords) if (haystack.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }

  const MIN_SCORE = 2;
  if (best && bestScore >= MIN_SCORE) {
    return { knowledgeObject: best, score: bestScore };
  }
  return null;
}


// knownModules lets callers pass the *current, dynamic* module list (from
// services/modules.js) instead of always matching against the original
// fixed six. If nothing matches an existing module, coins a short label
// from the text's own keywords rather than a placeholder like "General".

function guessModule(text, knownModules = []) {
  if (!knownModules.length) {
    return "Unclassified";
  }

  const qLower = text.toLowerCase();

  const found = knownModules.find((m) =>
    qLower.includes(m.toLowerCase().split(" ")[0])
  );

  if (found) {
    return found;
  }

  return "Unclassified";
}
module.exports = { tokenize, findBestMatch, guessModule };
