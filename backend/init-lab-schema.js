// ============================================================
// 🧱 ELIMS Schema Initialization Script
// ============================================================

// ✅ Load environment variables FIRST
require("dotenv").config({ path: __dirname + "/.env" });

// ✅ Auto-build DATABASE_URL if not defined
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
  console.log("🔧 DATABASE_URL constructed:", process.env.DATABASE_URL);
}

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// ✅ Correct location of schema file
const SCHEMA_FILE = path.join(__dirname, "config", "schema-setup.sql");

// ✅ Create DB pool using the now-guaranteed DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Must be off for Docker-local DB
});

async function initSchema() {
  console.log("🧱 Initializing lab configuration schema directly to DB...");

  // 1️⃣ Test DB before applying schema
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Database connection confirmed");
  } catch (err) {
    console.error("❌ DB Connection Failed Before Init:", err.message);
    process.exit(1);
  }

  // 2️⃣ Ensure schema file exists
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`❌ Schema file not found: ${SCHEMA_FILE}`);
    console.error("   Ensure backend/config/schema-setup.sql exists.");
    process.exit(1);
  }

  // 3️⃣ Execute schema SQL
  const schemaSql = fs.readFileSync(SCHEMA_FILE, "utf8");
  const client = await pool.connect();

  try {
    await client.query(schemaSql);
    console.log("✅ Application schema has been applied successfully.");
  } catch (err) {
    console.error("❌ Schema Execution Error:", err.message);
  } finally {
    client.release();
    await pool.end();
    console.log("⏹️ Database connection closed.");
  }
}

initSchema();
