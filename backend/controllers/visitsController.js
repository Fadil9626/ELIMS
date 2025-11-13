const pool = require("../config/database");

// GET all visits for a patient
exports.getVisitsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM visits 
       WHERE patient_id = $1
       ORDER BY visit_date DESC`,
      [patientId]
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ getVisitsByPatient:", error.message);
    res.status(500).json({ success: false, message: "Failed to load visits." });
  }
};

// CREATE new visit
exports.createVisit = async (req, res) => {
  try {
    const { patient_id, visit_type, doctor_name } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO visits (patient_id, visit_type, doctor_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [patient_id, visit_type, doctor_name]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ createVisit:", error.message);
    res.status(500).json({ success: false, message: "Failed to create visit." });
  }
};
