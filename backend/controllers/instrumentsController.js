// controllers/instrumentsController.js
const pool = require("../config/database");

// Build WHERE clause for filters
function buildFilters({ q, active }) {
  const where = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    where.push(`(name ILIKE $${params.length} OR vendor ILIKE $${params.length} OR model ILIKE $${params.length})`);
  }
  if (active === "true") {
    where.push(`is_active = TRUE`);
  } else if (active === "false") {
    where.push(`is_active = FALSE`);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { clause, params };
}

exports.list = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const { clause, params } = buildFilters({
      q: (req.query.q || "").trim(),
      active: (req.query.active || "").trim(),
    });

    const countSql = `SELECT COUNT(*)::int AS total FROM public.instruments ${clause}`;
    const { rows: countRows } = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT id, created_at, updated_at, name, vendor, model, connection, host, port, notes, is_active
      FROM public.instruments
      ${clause}
      ORDER BY name ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    const { rows } = await pool.query(dataSql, [...params, limit, offset]);
    res.json({ total, limit, offset, items: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load instruments" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, created_at, updated_at, name, vendor, model, connection, host, port, notes, is_active
       FROM public.instruments WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Instrument not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load instrument" });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, vendor, model, connection, host, port, notes, is_active } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: "Instrument name is required" });

    const { rows } = await pool.query(
      `INSERT INTO public.instruments (name, vendor, model, connection, host, port, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, TRUE))
       RETURNING id, created_at, updated_at, name, vendor, model, connection, host, port, notes, is_active`,
      [name, vendor || null, model || null, connection || null, host || null, port || null, notes || null, is_active]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Instrument with this name already exists" });
    }
    res.status(500).json({ success: false, message: err.message || "Failed to create instrument" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, vendor, model, connection, host, port, notes, is_active } = req.body || {};

    const { rows } = await pool.query(
      `UPDATE public.instruments
       SET name = COALESCE($2, name),
           vendor = COALESCE($3, vendor),
           model = COALESCE($4, model),
           connection = COALESCE($5, connection),
           host = COALESCE($6, host),
           port = COALESCE($7, port),
           notes = COALESCE($8, notes),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, created_at, updated_at, name, vendor, model, connection, host, port, notes, is_active`,
      [id, name, vendor, model, connection, host, port, notes, is_active]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "Instrument not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Instrument with this name already exists" });
    }
    res.status(500).json({ success: false, message: err.message || "Failed to update instrument" });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(`DELETE FROM public.instruments WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ success: false, message: "Instrument not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to delete instrument" });
  }
};

// ============================================================
// 📦 FIX: Export the handlers defined using exports.functionName
// ============================================================
module.exports = {
    list: exports.list,
    getOne: exports.getOne,
    create: exports.create,
    update: exports.update,
    remove: exports.remove,
};