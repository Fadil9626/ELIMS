// init-lab-schema.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 💡 FIX: The Node.js working directory inside Docker is /usr/src/app. 
// We rely on the schema file being copied to the expected path inside the container.
const SCHEMA_FILE = path.join(__dirname, 'config', 'schema-setup.sql'); 

// Connect directly using the environment variable set by Docker Compose
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initSchema() {
  console.log("🧱 Initializing lab configuration schema directly to DB...");
  
  // 1. Check pool connection before attempting to read files
  try {
    // Attempt a quick connection test
    await pool.query('SELECT 1 + 1 AS result'); 
  } catch (err) {
    console.error("❌ DB Connection Failed Before Init:", err.message);
    process.exit(1); // Exit if connection is fundamentally broken
  }
  
  // 2. Load schema file and execute query
  const client = await pool.connect();
  try {
    
    // Check if the schema file exists (CRITICAL CHECK)
    if (!fs.existsSync(SCHEMA_FILE)) {
      console.error(`❌ DB Initialization Failed: Schema file not found at ${SCHEMA_FILE}`);
      console.error(`   Please ensure backend/config/schema-setup.sql exists and was copied.`);
      return; // Stop initialization
    }

    // Read the entire SQL schema file (CREATE TABLE, INSERT data, etc.)
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');

    // Execute the full schema script (ensuring we don't start transaction if not needed)
    // NOTE: If your SQL dump uses transactions internally, client.query is sufficient.
    await client.query(schemaSql);
    
    console.log("✅ Application schema loaded directly into DB.");
    
  } catch (err) {
    // Log error if schema execution fails (e.g., table already exists, syntax error)
    console.error("❌ Schema Execution Failed:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

initSchema();