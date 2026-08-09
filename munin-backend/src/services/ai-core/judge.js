const { getClient } = require("../observability");

// LLM-as-a-Judge: after ask-munin already answered the user, a second,
// cheap Groq call rates that answer's quality and pushes the result to
// Langfuse as a Score attached to the original trace. Fire-and-forget —
// never awaited by the caller, so a judge failure can't affect or delay
// the user's actual answer.
async function judgeAskMuninAnswer({ traceId, question, answer }) {
  const lf = getClient();
  if (!lf || !traceId) return;

  // Casual/greeting messages ("hi", "thanks") have nothing meaningful to
  // grade for correctness — judging them anyway produces arbitrary,
  // confusing scores. Skip the judge (and its extra Groq call) for these.
  const CASUAL_PATTERN = /^(hi|hello|hey|hii+|thanks|thank you|thx|bye|ok|okay|good morning|good evening)[\s!.?]*$/i;
  if (CASUAL_PATTERN.test(question.trim())) return;

  try {
    const prompt = `You are grading an AI assistant's answer for correctness and relevance.
Question: ${question}
Answer: ${answer}

Reply with ONLY a JSON object: { "score": <1-5>, "reason": "<one short sentence>" }
1 = irrelevant or wrong. 5 = accurate and directly answers the question.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 100,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const score = Number(parsed.score);
    if (!Number.isFinite(score)) return;

    await lf.score({
      traceId,
      name: "answer-quality",
      value: score,
      dataType: "NUMERIC",
      comment: parsed.reason || undefined,
    });
    await lf.flushAsync();
  } catch (err) {
    console.error("LLM-as-a-Judge failed:", err.message);
  }
}

module.exports = { judgeAskMuninAnswer };