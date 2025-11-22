const pool = require("../config/database");

// =============================================================
// 📖 READ: Get all visits for a specific patient
// =============================================================
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

// =============================================================
// 📖 READ: Get a SINGLE visit by ID
// =============================================================
exports.getVisitById = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT v.*, 
              p.first_name, p.last_name 
       FROM visits v
       LEFT JOIN patients p ON v.patient_id = p.id
       WHERE v.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ getVisitById:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch visit." });
  }
};

// =============================================================
// ➕ CREATE: Create a new visit
// =============================================================
exports.createVisit = async (req, res) => {
  try {
    // Added notes and diagnosis as optional fields
    const { patient_id, visit_type, doctor_name, notes, diagnosis } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO visits (patient_id, visit_type, doctor_name, notes, diagnosis, visit_date)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [patient_id, visit_type, doctor_name, notes || null, diagnosis || null]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ createVisit:", error.message);
    res.status(500).json({ success: false, message: "Failed to create visit." });
  }
};

// =============================================================
// ✏️ UPDATE: Edit an existing visit
// =============================================================
exports.updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { visit_type, doctor_name, visit_date, notes, diagnosis } = req.body;

    // Check if visit exists first
    const check = await pool.query("SELECT id FROM visits WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }

    // Perform Update
    const { rows } = await pool.query(
      `UPDATE visits 
       SET visit_type = $1, 
           doctor_name = $2, 
           visit_date = $3, 
           notes = $4, 
           diagnosis = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [visit_type, doctor_name, visit_date, notes, diagnosis, id]
    );

    res.json({ success: true, message: "Visit updated", visit: rows[0] });
  } catch (error) {
    console.error("❌ updateVisit:", error.message);
    res.status(500).json({ success: false, message: "Failed to update visit." });
  }
};

// =============================================================
// 🗑️ DELETE: Remove a visit
// =============================================================
exports.deleteVisit = async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM visits WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }

    res.json({ success: true, message: "Visit deleted successfully" });
  } catch (error) {
    console.error("❌ deleteVisit:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete visit." });
  }
};