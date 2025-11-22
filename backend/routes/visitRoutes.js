const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const pool = require("../config/database");

// =============================================================
// ➕ CREATE VISIT
// =============================================================
router.post("/", protect, async (req, res) => {
  try {
    // Added notes and diagnosis to the destructuring
    const { patient_id, visit_type, doctor_name, notes, diagnosis } = req.body;

    if (!patient_id) {
      return res.status(400).json({ message: "patient_id is required" });
    }

    const result = await pool.query(
      `INSERT INTO visits (patient_id, visit_type, doctor_name, notes, diagnosis, visit_date)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        patient_id,
        visit_type || "Outpatient",
        doctor_name || null,
        notes || null,
        diagnosis || null,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create visit error:", err.message);
    res.status(500).json({ message: "Server error creating visit" });
  }
});

// =============================================================
// 📋 LIST VISITS FOR ONE PATIENT
// =============================================================
router.get("/patient/:patient_id", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM visits WHERE patient_id = $1 ORDER BY visit_date DESC`,
      [req.params.patient_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("List visits error:", err.message);
    res.status(500).json({ message: "Server error loading visits" });
  }
});

// =============================================================
// 🔎 GET SINGLE VISIT (By ID)
// =============================================================
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Join with patients to get patient name just in case you need it
    const result = await pool.query(
      `SELECT v.*, p.first_name, p.last_name 
       FROM visits v
       LEFT JOIN patients p ON v.patient_id = p.id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Visit not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get single visit error:", err.message);
    res.status(500).json({ message: "Server error fetching visit" });
  }
});

// =============================================================
// ✏️ UPDATE VISIT
// =============================================================
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { visit_type, doctor_name, notes, diagnosis, visit_date } = req.body;

    // Check if visit exists
    const check = await pool.query("SELECT id FROM visits WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Visit not found" });
    }

    const result = await pool.query(
      `UPDATE visits 
       SET visit_type = $1, 
           doctor_name = $2, 
           notes = $3, 
           diagnosis = $4,
           visit_date = COALESCE($5, visit_date), -- Only update date if provided
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        visit_type, 
        doctor_name, 
        notes || null, 
        diagnosis || null, 
        visit_date || null, 
        id
      ]
    );

    res.json({ success: true, visit: result.rows[0] });
  } catch (err) {
    console.error("Update visit error:", err.message);
    res.status(500).json({ message: "Server error updating visit" });
  }
});

// =============================================================
// 🗑️ DELETE VISIT
// =============================================================
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM visits WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Visit not found" });
    }

    res.json({ success: true, message: "Visit deleted successfully" });
  } catch (err) {
    console.error("Delete visit error:", err.message);
    res.status(500).json({ message: "Server error deleting visit" });
  }
});

module.exports = router;