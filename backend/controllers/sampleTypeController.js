// controllers/sampleTypeController.js
const pool = require("../config/database");

// LIST (only active)
const getSampleTypes = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, COALESCE(is_active,true) AS is_active, created_at
       FROM sample_types
       WHERE COALESCE(is_active,true) = true
       ORDER BY name ASC`
    );
    return res.status(200).json(rows);
  } catch (e) {
    console.error("❌ getSampleTypes error:", e.message);
    return res.status(500).json({ message: "Server error fetching sample types" });
  }
};

// CREATE
const createSampleType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Sample type name is required" });
    }

    const dup = await pool.query(
      `SELECT 1 FROM sample_types WHERE LOWER(name)=LOWER($1) AND COALESCE(is_active,true) = true`,
      [name]
    );
    if (dup.rowCount > 0) {
      return res.status(400).json({ message: "Sample type already exists" });
    }

    const { rows } = await pool.query(
      `INSERT INTO sample_types (name, description, is_active, created_at)
       VALUES ($1, $2, true, NOW())
       RETURNING id, name, description, is_active, created_at`,
      [name.trim(), description || null]
    );
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error("❌ createSampleType error:", e.message);
    return res.status(500).json({ message: "Server error creating sample type" });
  }
};

// UPDATE
const updateSampleType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { rows } = await pool.query(
      `UPDATE sample_types
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING id, name, description, is_active, created_at`,
      [name, description, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Sample type not found" });
    }
    return res.status(200).json(rows[0]);
  } catch (e) {
    console.error("❌ updateSampleType error:", e.message);
    return res.status(500).json({ message: "Server error updating sample type" });
  }
};

// DELETE (soft-delete; block if referenced by tests)
const deleteSampleType = async (req, res) => {
  try {
    const { id } = req.params;

    const ref = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM test_catalog WHERE sample_type_id = $1`,
      [id]
    );
    if (ref.rows[0].cnt > 0) {
      return res.status(400).json({
        message:
          "Cannot delete sample type: it is still used by tests. Reassign or remove references first.",
      });
    }

    const r = await pool.query(
      `UPDATE sample_types
       SET is_active = false
       WHERE id = $1 AND COALESCE(is_active,true) = true`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Sample type not found or already deleted" });
    }
    return res.status(200).json({ message: "Sample type deleted successfully" });
  } catch (e) {
    console.error("❌ deleteSampleType error:", e.message);
    return res.status(500).json({ message: "Server error deleting sample type" });
  }
};

// RESTORE (optional)
const restoreSampleType = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE sample_types
       SET is_active = true
       WHERE id = $1 AND COALESCE(is_active,true) = false`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Sample type not found or already active" });
    }
    return res.status(200).json({ message: "Sample type restored successfully" });
  } catch (e) {
    console.error("❌ restoreSampleType error:", e.message);
    return res.status(500).json({ message: "Server error restoring sample type" });
  }
};

module.exports = {
  getSampleTypes,
  createSampleType,
  updateSampleType,
  deleteSampleType,
  restoreSampleType,
};
