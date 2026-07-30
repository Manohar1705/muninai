require("dotenv").config();
const { db, initDb } = require("./db");

async function seed() {
  try {
    await initDb();
    console.log("Munin database initialized and seeded (or already up to date).");
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

seed();
