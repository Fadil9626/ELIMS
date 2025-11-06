// backend/middleware/apiKeyAuth.js
const pool = require("../config/database");
const bcrypt = require("bcryptjs");

/**
 * Reads X-API-Key ("prefix.secret") and sets req.apiKey = { row, user }
 */
module.exports = async function apiKeyAuth(req, res, next) {
  try {
    const header = req.get("X-API-Key") || "";
    const [key_prefix, secret] = header.split(".");
    if (!key_prefix || !secret) {
      return res.status(401).json({ success: false, message: "Missing or malformed X-API-Key" });
    }

    const { rows } = await pool.query(
      `SELECT k.*, u.id AS user_id, u.full_name, u.email
         FROM api_keys k
         JOIN users u ON u.id = k.user_id
        WHERE k.key_prefix = $1
        LIMIT 1`,
      [key_prefix]
    );

    const row = rows[0];
    if (!row) return res.status(401).json({ success: false, message: "Invalid API key" });
    if (row.revoked_at) return res.status(401).json({ success: false, message: "API key revoked" });

    const ok = await bcrypt.compare(secret, row.secret_hash);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid API key" });

    // Touch last_used_at (best-effort)
    pool.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [row.id]).catch(() => {});

    req.apiKey = {
      key: { id: row.id, key_prefix: row.key_prefix, name: row.name },
      user: { id: row.user_id, full_name: row.full_name, email: row.email },
    };
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Key auth failed" });
  }
};
