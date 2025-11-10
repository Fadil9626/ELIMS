// controllers/ingestEventsController.js
const pool = require("../config/database");

// Build WHERE clause from filters (unchanged)
function buildFilters({ q, status, instrument, from, to }) {
  const where = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    where.push(
      `(sample_id ILIKE $${params.length} OR instrument ILIKE $${params.length} OR payload::text ILIKE $${params.length})`
    );
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (instrument) {
    params.push(instrument);
    where.push(`instrument ILIKE $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`created_at >= $${params.length}::timestamptz`);
  }
  if (to) {
    params.push(to);
    where.push(`created_at <= $${params.length}::timestamptz`);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { clause, params };
}

exports.list = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const { clause, params } = buildFilters({
      q: (req.query.q || "").trim(),
      status: (req.query.status || "").trim(),
      instrument: (req.query.instrument || "").trim(),
      from: (req.query.from || "").trim(),
      to: (req.query.to || "").trim(),
    });

    const countSql = `SELECT COUNT(*)::int AS total FROM public.ingest_events ${clause}`;
    const { rows: countRows } = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT
        id,
        created_at,
        instrument,
        sample_id,
        status,
        payload,
        COALESCE(user_id, NULL)    AS user_id,
        COALESCE(api_key_id, NULL) AS api_key_id
      FROM public.ingest_events
      ${clause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    const { rows } = await pool.query(dataSql, [...params, limit, offset]);

    res.json({ total, limit, offset, items: rows });
  } catch (err) {
    // If table still missing, surface a friendly message
    if (err?.code === "42P01") {
      return res.status(500).json({
        success: false,
        message:
          'Table "public.ingest_events" does not exist. Run the provided migration to create it.',
      });
    }
    res
      .status(500)
      .json({ success: false, message: err.message || "Failed to load ingest events" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, created_at, instrument, sample_id, status, payload,
              COALESCE(user_id,NULL) AS user_id,
              COALESCE(api_key_id,NULL) AS api_key_id
       FROM public.ingest_events
       WHERE id = $1`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Event not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err?.code === "42P01") {
      return res.status(500).json({
        success: false,
        message:
          'Table "public.ingest_events" does not exist. Run the provided migration to create it.',
      });
    }
    res
      .status(500)
      .json({ success: false, message: err.message || "Failed to load event" });
  }
};

// ============================================================
// 📦 FIX: Export the handlers defined using exports.functionName
// ============================================================
module.exports = {
    list: exports.list,
    getOne: exports.getOne,
};