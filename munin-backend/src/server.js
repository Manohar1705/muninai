require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { initDb } = require("./db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Must run before any route modules are required — some services (e.g.
// readiness.js) prepare statements against tables like `readiness` at
// module-load time, so the schema needs to exist first. This only worked
// locally by accident because munin.db already had tables from prior runs;
// a fresh deploy with an empty DB file would crash otherwise.
initDb();

const dashboardRoutes = require("./routes/dashboard");
const sessionsRoutes = require("./routes/sessions");
const knowledgeRoutes = require("./routes/knowledge");
const coverageRoutes = require("./routes/coverage");
const smeRoutes = require("./routes/sme");
const chatRoutes = require("./routes/chat");
const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");
const documentsRoutes = require("./routes/documents");
const meetingsRoutes = require("./routes/meetings");
const mediaRoutes = require("./routes/media");
const { startTunnel } = require("./tunnel");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "munin-backend", time: new Date().toISOString() });
});

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/knowledge-objects", knowledgeRoutes);
app.use("/api/coverage", coverageRoutes); // also owns /api/coverage/gaps
app.use("/api/sme-map", smeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/media", mediaRoutes);

app.use(notFound);
app.use(errorHandler);

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`Munin backend listening on http://localhost:${PORT}`);
// });
const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Munin backend listening on http://localhost:${PORT}`);

  try {
    const publicUrl = await startTunnel(PORT);
    console.log(`Cloudflare Tunnel: ${publicUrl}`);
  } catch (err) {
    console.warn(`Tunnel startup failed: ${err.message}`);
  }
});
