require("dotenv").config();
console.log("Using public key:", process.env.LANGFUSE_PUBLIC_KEY);
const { Langfuse } = require("langfuse");

const lf = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
});

const trace = lf.trace({ name: "manual-test-trace" });
const gen = trace.generation({ name: "manual-test-gen", input: "hello", model: "test" });
gen.end({ output: "world" });

lf.flushAsync()
  .then(() => console.log("✅ Flushed successfully — check Langfuse dashboard now"))
  .catch((err) => console.log("❌ Flush failed:", err.message));