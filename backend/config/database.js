// backend/config/database.js
const { Pool } = require("pg");

const pool = new Pool({
  // This reads the DATABASE_URL provided by your docker-compose.yml
  connectionString: process.env.DATABASE_URL,

  // SSL settings for production (if needed)
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});

module.exports = pool;