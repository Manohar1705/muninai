const test = require("node:test");
const assert = require("node:assert/strict");
const {
  groundLlmResult,
  shortlistCandidates,
  termsForRetrieval,
} = require("../src/services/ai-core/chatRetrieval");

const candidates = [
  {
    id: "seg-1",
    title: "Session 1 — Payments overview",
    description: "Payment authorization fundamentals.",
    sessionId: "s1",
  },
  {
    id: "ko-llmops",
    title: "LLM Ops",
    description: "Automating the building, testing, and deployment of LLMs.",
    sessionId: "llm-session",
  },
];

test("matches compact user terms such as LLMOps to spaced knowledge titles", () => {
  const result = shortlistCandidates("Tell me about LLMOps", candidates);
  assert.equal(result[0].id, "ko-llmops");
});

test("uses the prior conversation topic for a referential session follow-up", () => {
  const history = [
    { role: "user", text: "Tell me about LLMOps" },
    { role: "assistant", text: "LLMOps automates the model lifecycle." },
    { role: "user", text: "Where did we discuss it?" },
    { role: "assistant", text: "It was covered earlier." },
    { role: "user", text: "In which session?" },
  ];

  assert.deepEqual(termsForRetrieval("In which session?", history), ["llmops"]);
  const result = shortlistCandidates("In which session?", candidates, history);
  assert.equal(result[0].id, "ko-llmops");
});

test("does not choose an arbitrary session when no topic can be resolved", () => {
  assert.deepEqual(shortlistCandidates("In which session?", candidates), []);
});

test("grounds a general-mode model answer when relevant KT context exists", () => {
  assert.deepEqual(
    groundLlmResult(
      {
        mode: "chat",
        covered: false,
        answer: "LLMOps automates the model lifecycle.",
        sourceId: null,
      },
      [candidates[1]]
    ),
    {
      mode: "kt",
      covered: true,
      answer: "LLMOps automates the model lifecycle.",
      sourceId: "ko-llmops",
    }
  );
});

test("never preserves a source id outside the retrieved candidate set", () => {
  assert.equal(
    groundLlmResult(
      { mode: "kt", covered: true, answer: "Answer", sourceId: "seg-1" },
      [candidates[1]]
    ).sourceId,
    "ko-llmops"
  );
});
