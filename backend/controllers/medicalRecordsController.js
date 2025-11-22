const pool = require("../config/database");

// 1. Get Records for a Patient
exports.getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM patient_medical_records 
       WHERE patient_id = $1 
       ORDER BY created_at DESC`,
      [patientId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// 2. Create Record
exports.createRecord = async (req, res) => {
  try {
    const { patient_id, diagnosis, medications, treatment_plan, next_visit_date } = req.body;
    const doctor_name = req.user.full_name || "Unknown Doctor";
    const created_by = req.user.id;

    const { rows } = await pool.query(
      `INSERT INTO patient_medical_records 
       (patient_id, diagnosis, medications, treatment_plan, next_visit_date, doctor_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [patient_id, diagnosis, medications, treatment_plan, next_visit_date, doctor_name, created_by]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create record" });
  }
};

// 3. Update Record
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, medications, treatment_plan, next_visit_date } = req.body;

    const { rows } = await pool.query(
      `UPDATE patient_medical_records 
       SET diagnosis = $1, 
           medications = $2, 
           treatment_plan = $3, 
           next_visit_date = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [diagnosis, medications, treatment_plan, next_visit_date, id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Record not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update record" });
  }
};

// 4. Delete Record
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM patient_medical_records WHERE id = $1", [id]);
    
    if (rowCount === 0) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete record" });
  }
};