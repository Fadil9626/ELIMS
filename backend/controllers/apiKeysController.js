const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const { genPrefix, genRawKey } = require("../utils/apiKey");

/**
 * GET /api/keys
 * List the current user's API keys (metadata only)
 */
const listKeys = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
         FROM api_keys
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    console.error("listKeys error:", e.message);
    res.status(500).json({ message: e.message || "Failed to load keys" });
  }
};

/**
 * POST /api/keys
 * Create a new API key for the current user.
 * Returns the one-time "fullKey" (prefix.secret) — store it client-side.
 */
const createKey = async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Key name is required" });
  }

  try {
    // Generate prefix + secret body
    const prefix = genPrefix();          // e.g., "sk_test_ab12"
    const secretBody = genRawKey();      // long random secret
    const fullKey = `${prefix}.${secretBody}`;

    // Hash the secret body only (never store the full key)
    const secret_hash = await bcrypt.hash(secretBody, 10);

    // Persist (no salt/key_hash columns; we store secret_hash)
    const { rows } = await pool.query(
      `INSERT INTO api_keys (user_id, name, key_prefix, secret_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, key_prefix, created_at`,
      [req.user.id, name.trim(), prefix, secret_hash]
    );

    const key = rows[0];
    return res.status(201).json({
      id: key.id,
      name: key.name,
      key_prefix: key.key_prefix,
      created_at: key.created_at,
      fullKey, // one-time reveal
    });
  } catch (e) {
    console.error("createKey error:", e.message);
    // Common failure: key_prefix unique violation (rare). Regenerate if needed.
    return res.status(500).json({ message: e.message || "Failed to generate key" });
  }
};

/**
 * DELETE /api/keys/:id
 * Soft-revoke an API key (sets revoked_at)
 */
const revokeKey = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      `UPDATE api_keys
          SET revoked_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND revoked_at IS NULL`,
      [id, req.user.id]
    );

    if (!rowCount) {
      return res
        .status(404)
        .json({ message: "Key not found or already revoked" });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error("revokeKey error:", e.message);
    return res.status(500).json({ message: e.message || "Failed to revoke key" });
  }
};

module.exports = { listKeys, createKey, revokeKey };
