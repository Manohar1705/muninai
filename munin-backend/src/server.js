require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");

const { db, initDb } = require("./db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { startTunnel } = require("./tunnel");

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
const engagementsRoutes = require("./routes/engagements");
const modulesRoutes = require("./routes/modules");
const traceabilityRoutes = require("./routes/traceability");
const app = express();
const clients = new Set();
let httpServer;
let shutdownPromise;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);
  req.on("close", () => clients.delete(res));
});

global.broadcastEvent = (eventName, data = {}) => {
  const payload = `data: ${JSON.stringify({ event: eventName, data })}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
};

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "munin-backend",
    time: new Date().toISOString(),
  });
});

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/knowledge-objects", knowledgeRoutes);
app.use("/api/coverage", coverageRoutes);
app.use("/api/sme-map", smeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/engagements", engagementsRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/traceability", traceabilityRoutes);
app.use(notFound);
app.use(errorHandler);

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once("listening", () => {
      server.off("error", reject);
      resolve(server);
    });
    server.once("error", reject);
  });
}

async function start({ port = process.env.PORT || 4000, tunnel = true } = {}) {
  if (httpServer) return httpServer;

  await initDb();
  httpServer = await listen(port);
  const address = httpServer.address();
  const listeningPort = typeof address === "object" && address ? address.port : port;
  console.log(`Munin backend listening on http://localhost:${listeningPort}`);

  if (tunnel) {
    try {
      const publicUrl = await startTunnel(listeningPort);
      console.log(`Cloudflare Tunnel: ${publicUrl}`);
    } catch (err) {
      console.warn(`Tunnel startup failed: ${err.message}`);
    }
  }

  return httpServer;
}

async function stop() {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    for (const client of clients) client.end();
    clients.clear();

    if (httpServer) {
      const server = httpServer;
      httpServer = undefined;
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }

    await db.pool.end();
  })();

  return shutdownPromise;
}

async function shutdown(signal) {
  try {
    await stop();
  } catch (err) {
    console.error("Graceful shutdown failed:", err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  start().catch(async (err) => {
    console.error("Failed to start Munin backend:", err);
    try {
      await db.pool.end();
    } catch (closeErr) {
      console.error("Failed to close the Postgres pool:", closeErr);
    }
    process.exitCode = 1;
  });

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { app, start, stop };
