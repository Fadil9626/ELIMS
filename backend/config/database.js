// ============================================================
// 🧱 ELIMS Database Configuration (PostgreSQL + Docker + Cloud Safe)
// ============================================================

const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

// ============================================================
// 🧠 Smart SSL Detection
// ------------------------------------------------------------
// - In Docker or local Postgres: disables SSL
// - In cloud environments (Render, RDS, etc.): enables SSL
// ============================================================

let sslConfig = false;

// Force-disable SSL when connecting to Docker internal DB or localhost
if (
  connectionString.includes("@db:") ||
  connectionString.includes("@localhost:") ||
  connectionString.includes("@127.0.0.1:")
) {
  sslConfig = false;
} else if (process.env.NODE_ENV === "production") {
  sslConfig = { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ------------------------------------------------------------
// 🩺 Simple Connection Test
// ------------------------------------------------------------
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log(`✅ PostgreSQL connected — ${res.rows[0].now}`);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
})();

// ------------------------------------------------------------
// 🔁 Graceful Shutdown
// ------------------------------------------------------------
process.on("SIGTERM", async () => {
  console.log("⛔ Closing database pool...");
  await pool.end();
  process.exit(0);
});

module.exports = pool;
