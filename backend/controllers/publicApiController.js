// backend/controllers/publicApiController.js
const pool = require("../config/database");
const crypto = require("crypto");

// We will verify keys stored as (key_prefix, key_hash, salt, revoked_at, user_id, name)
// and gracefully support older "secret_hash" if present.
function hmacSHA256(key, salt) {
  // deterministic HMAC used for stored hash = HMAC_SHA256(salt, fullKey)
  return crypto.createHmac("sha256", String(salt)).update(String(key)).digest("hex");
}

// Load key row by prefix
async function loadKeyByPrefix(prefix) {
  const { rows } = await pool.query(
    `
    SELECT id, user_id, name, key_prefix, key_hash, salt, secret_hash, revoked_at, last_used_at
    FROM api_keys
    WHERE key_prefix = $1
    LIMIT 1
    `,
    [prefix]
  );
  return rows[0] || null;
}

// Verify an API key string like: "sk_test_XXXX.YYYYYYYYY"
async function verifyApiKeyString(fullKey) {
  if (!fullKey || typeof fullKey !== "string" || !fullKey.includes(".")) {
    return { ok: false, reason: "Malformed key" };
  }
  const [prefix, body] = fullKey.split(".");
  if (!prefix || !body) return { ok: false, reason: "Malformed key" };

  const row = await loadKeyByPrefix(prefix);
  if (!row) return { ok: false, reason: "Not found" };
  if (row.revoked_at) return { ok: false, reason: "Revoked" };

  // Prefer key_hash+salt; fallback to secret_hash (older migration)
  const candidateHash = hmacSHA256(fullKey, row.salt || ""); // produces hex

  if (row.key_hash && crypto.timingSafeEqual(Buffer.from(row.key_hash), Buffer.from(candidateHash))) {
    return { ok: true, row, prefix };
  }
  if (row.secret_hash && crypto.timingSafeEqual(Buffer.from(row.secret_hash), Buffer.from(candidateHash))) {
    return { ok: true, row, prefix };
  }
  return { ok: false, reason: "Hash mismatch" };
}

exports.verifyApiKey = async (req, res) => {
  try {
    const fullKey = req.get("X-API-Key") || req.body?.api_key || "";
    const check = await verifyApiKeyString(fullKey);
    if (!check.ok) {
      return res.status(401).json({ success: false, message: "Key revoked or invalid" });
    }

    // touch last_used_at
    await pool.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [check.row.id]);

    return res.json({
      success: true,
      key_prefix: check.prefix,
      user_id: check.row.user_id,
      name: check.row.name,
    });
  } catch (e) {
    console.error("verifyApiKey error:", e.message);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

// Minimal schema check (no external dependency)
function validateIngestBody(body) {
  if (!body || typeof body !== "object") return "Body must be a JSON object";
  if (!body.instrument || typeof body.instrument !== "string") return "instrument is required";
  if (!body.sample_id || typeof body.sample_id !== "string") return "sample_id is required";
  if (!body.result || typeof body.result !== "object") return "result must be an object";
  return null;
}

exports.ingestSample = async (req, res) => {
  const client = await pool.connect();
  try {
    const fullKey = req.get("X-API-Key") || "";
    const check = await verifyApiKeyString(fullKey);
    if (!check.ok) return res.status(401).json({ success: false, message: "Key revoked or invalid" });

    // update last_used_at
    await client.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [check.row.id]);

    // basic body validation
    const err = validateIngestBody(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const { instrument, sample_id, result } = req.body;

    await client.query("BEGIN");

    // Persist raw event (audit + possible reprocess)
    const insertEv = await client.query(
      `
      INSERT INTO instrument_ingest_events
        (key_id, user_id, instrument, sample_id, payload, status)
      VALUES ($1, $2, $3, $4, $5, 'queued')
      RETURNING id
      `,
      [check.row.id, check.row.user_id, instrument, sample_id, req.body]
    );

    const eventId = insertEv.rows[0].id;

    // ---- Optional lightweight processor ----
    // Here we simply mark as processed. You can expand this to map codes and
    // push directly into test_request_items.
    await client.query(
      `UPDATE instrument_ingest_events SET status = 'processed' WHERE id = $1`,
      [eventId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      accepted: true,
      received: { sample_id, instrument },
      event_id: eventId,
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("ingestSample error:", e.message);
    return res.status(500).json({ success: false, message: "Internal error" });
  } finally {
    client.release();
  }
};

// (Optional) batch reprocess queued/failed events
exports.reprocessEvent = async (req, res) => {
  const { id } = req.params;
  try {
    // For now just flip to processed if exists.
    const { rowCount } = await pool.query(
      `UPDATE instrument_ingest_events SET status='processed', error_msg=NULL WHERE id=$1`,
      [id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: "Event not found" });
    return res.json({ success: true });
  } catch (e) {
    console.error("reprocessEvent error:", e.message);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

// ============================================================
// 📦 FIX: Export the handlers defined above
// ============================================================
module.exports = {
  verifyApiKey: exports.verifyApiKey,
  ingestSample: exports.ingestSample,
  reprocessEvent: exports.reprocessEvent,
};