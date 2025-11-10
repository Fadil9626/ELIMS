const pool = require("../config/database");

/**
 * Confidential Patient Access Enforcement
 *
 * Doctors:
 *  - Can see all patients in the list
 *  - BUT cannot open/view/edit confidential cases
 *    unless they are the assigned doctor.
 *
 * Other roles:
 *  - No restriction (Admin, Receptionist, Pathologist, etc.)
 */
const enforceConfidentialPatient = async (req, res, next) => {
  try {
    // Resolve patientId whether request uses params or body
    const patientId = req.params.id || req.body.patient_id || req.body.id;

    if (!patientId) return next();

    const { rows } = await pool.query(
      `SELECT is_confidential, restricted_doctor_id FROM patients WHERE id = $1`,
      [patientId]
    );

    if (rows.length === 0) return next(); // Patient not found yet → continue

    const { is_confidential, restricted_doctor_id } = rows[0];
    const user = req.user;

    // ✅ Rule only applies to Doctors
    if (user.role === "Doctor" && is_confidential) {
      if (restricted_doctor_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: "🔒 Access denied. This patient record is confidential and restricted."
        });
      }
    }

    return next();
  } catch (error) {
    console.error("❌ Confidential Access Middleware Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error while checking confidentiality",
    });
  }
};

module.exports = enforceConfidentialPatient;
