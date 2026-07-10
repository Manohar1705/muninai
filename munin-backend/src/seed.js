require("dotenv").config();
const { initDb } = require("./db");

initDb();
console.log("Munin database initialized and seeded (or already up to date).");
