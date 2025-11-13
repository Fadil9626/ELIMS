const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const pool = require("../config/database");

// CREATE VISIT
router.post("/", protect, async (req, res) => {
  try {
    const { patient_id, visit_type, doctor_name } = req.body;

    if (!patient_id) {
      return res.status(400).json({ message: "patient_id is required" });
    }

    const result = await pool.query(
      `INSERT INTO visits (patient_id, visit_type, doctor_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [patient_id, visit_type || "Outpatient", doctor_name || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create visit error:", err.message);
    res.status(500).json({ message: "Server error creating visit" });
  }
});

// LIST VISITS FOR ONE PATIENT
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

module.exports = router;
