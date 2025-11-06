const pool = require("../config/database");

// Return only active departments
const getDepartments = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name
       FROM departments
       WHERE COALESCE(is_active, true) = true
       ORDER BY name ASC`
    );
    return res.status(200).json(rows);
  } catch (e) {
    console.error("❌ getDepartments error:", e.message);
    return res.status(500).json({ message: "Server error fetching departments" });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Department name is required" });
    }
    const dup = await pool.query(
      `SELECT 1 FROM departments WHERE LOWER(name)=LOWER($1) AND COALESCE(is_active, true)=true`,
      [name]
    );
    if (dup.rowCount > 0) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const { rows } = await pool.query(
      `INSERT INTO departments (name, is_active)
       VALUES ($1, true)
       RETURNING id, name`,
      [name.trim()]
    );
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error("❌ createDepartment error:", e.message);
    return res.status(500).json({ message: "Server error creating department" });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const { rows } = await pool.query(
      `UPDATE departments
       SET name = $1
       WHERE id = $2
       RETURNING id, name`,
      [name.trim(), id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    return res.status(200).json(rows[0]);
  } catch (e) {
    console.error("❌ updateDepartment error:", e.message);
    return res.status(500).json({ message: "Server error updating department" });
  }
};

// Soft delete (hide from lists)
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: block delete if referenced by tests
    const ref = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM test_catalog WHERE department_id = $1`,
      [id]
    );
    if (ref.rows[0].cnt > 0) {
      // Either block, or nullify references. Here we BLOCK to be explicit:
      return res.status(400).json({
        message:
          "Cannot delete department: it is still used by tests. Reassign or remove references first.",
      });
    }

    const result = await pool.query(
      `UPDATE departments
       SET is_active = false
       WHERE id = $1 AND COALESCE(is_active, true) = true`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Department not found or already deleted" });
    }

    return res.status(200).json({ message: "Department deleted successfully" });
  } catch (e) {
    console.error("❌ deleteDepartment error:", e.message);
    return res.status(500).json({ message: "Server error deleting department" });
  }
};

// Optional: restore
const restoreDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE departments
       SET is_active = true
       WHERE id = $1 AND COALESCE(is_active, true) = false`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Department not found or already active" });
    }
    return res.status(200).json({ message: "Department restored successfully" });
  } catch (e) {
    console.error("❌ restoreDepartment error:", e.message);
    return res.status(500).json({ message: "Server error restoring department" });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
};
