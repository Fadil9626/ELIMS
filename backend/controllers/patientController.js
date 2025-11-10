const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLogger');

/** ===========================================================
 *  MRN Generator
 * ========================================================== */
const generateMRN = async () => {
  const { rows } = await pool.query(`SELECT * FROM mrn_settings LIMIT 1`);
  const s = rows[0];

  let seq = s.last_sequence + 1;
  const year = new Date().getFullYear();
  const mrn = `${s.facility_code}-${year}-${String(seq).padStart(6, '0')}`;

  await pool.query(
    `UPDATE mrn_settings SET last_sequence=$1, updated_at=NOW() WHERE id=$2`,
    [seq, s.id]
  );

  return mrn;
};

/** ===========================================================
 *  Ensure numeric ID
 * ========================================================== */
const ensureNumericId = (id) => {
  if (!/^\d+$/.test(String(id))) {
    const err = new Error('Invalid ID');
    err.statusCode = 400;
    throw err;
  }
  return Number(id);
};

/** ===========================================================
 *  REGISTER PATIENT
 * ========================================================== */
const registerPatient = async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    gender,
    maritalStatus,
    occupation,
    contactPhone,
    contactAddress,
    contactEmail,
    admissionType,
    wardId,
    referringDoctor,
    emergencyName,
    emergencyRelationship,
    emergencyPhone,

    // ✅ NEW CONFIDENTIALITY FIELDS
    is_confidential = false,
    restricted_doctor_id = null
  } = req.body;

  const registeredBy = req.user.id;

  if (!firstName || !lastName || !dateOfBirth) {
    return res.status(400).json({
      message: 'First name, last name, and date of birth are required.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mrn = await generateMRN();

    const inserted = await client.query(
      `
      INSERT INTO patients (
        mrn, first_name, middle_name, last_name, date_of_birth, gender,
        marital_status, occupation,
        contact_phone, contact_address, contact_email,
        admission_type, ward_id,
        emergency_name, emergency_relationship, emergency_phone,
        referring_doctor, registered_by,
        is_confidential, restricted_doctor_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,
        $9,$10,$11,
        $12,$13,
        $14,$15,$16,
        $17,$18,
        $19,$20
      )
      RETURNING *
      `,
      [
        mrn,
        firstName,
        middleName || null,
        lastName,
        dateOfBirth,
        gender || null,
        maritalStatus || null,
        occupation || null,
        contactPhone || null,
        contactAddress || null,
        contactEmail || null,
        admissionType || 'OPD',
        wardId || null,
        emergencyName || null,
        emergencyRelationship || null,
        emergencyPhone || null,
        referringDoctor || null,
        registeredBy,
        is_confidential,
        restricted_doctor_id || null,
      ]
    );

    const patient = inserted.rows[0];

    const now = new Date();
    const labId = `${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${patient.id}`;

    const updated = await client.query(
      `UPDATE patients SET lab_id=$1 WHERE id=$2 RETURNING *`,
      [labId, patient.id]
    );

    await client.query('COMMIT');

    await logAuditEvent({
      user_id: registeredBy,
      action: 'PATIENT_CREATE',
      details: { patient_id: patient.id, mrn, lab_id: labId },
    });

    return res.status(201).json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ RegisterPatient Error:', error.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
};

/** ===========================================================
 *  GET ALL PATIENTS
 * ========================================================== */
const getAllPatients = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.mrn,
        p.lab_id,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.contact_phone,
        p.contact_address,
        p.contact_email,
        p.admission_type,
        w.name AS ward_name,

        -- ✅ return confidentiality status
        p.is_confidential,
        p.restricted_doctor_id,

        tr.id AS latest_request_id,
        tr.status AS latest_request_status,
        tr.payment_status AS latest_request_payment_status,
        tr.payment_amount AS latest_request_total,
        tr.created_at AS latest_request_date

      FROM patients p
      LEFT JOIN wards w ON p.ward_id = w.id
      LEFT JOIN LATERAL (
        SELECT id, status, payment_status, payment_amount, created_at
        FROM test_requests
        WHERE patient_id = p.id
        ORDER BY id DESC
        LIMIT 1
      ) tr ON TRUE

      ORDER BY p.id DESC;
    `;

    const result = await pool.query(query);

    await logAuditEvent({ user_id: req.user.id, action: 'PATIENT_VIEW_ALL' });

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ GetAllPatients Error:', err.message);
    return res.status(500).send('Server Error');
  }
};

/** ===========================================================
 *  GET PATIENT BY ID
 * ========================================================== */
const getPatientById = async (req, res) => {
  try {
    const id = ensureNumericId(req.params.id);

    const result = await pool.query(
      `
      SELECT p.*, w.name AS ward_name
      FROM patients p
      LEFT JOIN wards w ON p.ward_id = w.id
      WHERE p.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    const status = err.statusCode || 500;
    if (!err.statusCode) {
      console.error('❌ GetPatientById Error:', err.message);
    }
    return res.status(status).send(
      err.statusCode ? { message: 'Invalid patient ID' } : 'Server Error'
    );
  }
};

/** ===========================================================
 *  UPDATE PATIENT (✅ supports confidential fields)
 * ========================================================== */
const updatePatient = async (req, res) => {
  const { id } = req.params;

  const {
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    gender,
    maritalStatus,
    occupation,
    contactPhone,
    contactAddress,
    contactEmail,
    admissionType,
    wardId,
    referringDoctor,
    emergencyName,
    emergencyRelationship,
    emergencyPhone,

    // ✅ NEW CONFIDENTIALITY FIELDS
    is_confidential = false,
    restricted_doctor_id = null
  } = req.body;

  try {
    const numericId = ensureNumericId(id);

    const result = await pool.query(
      `
      UPDATE patients SET
        first_name=$1, middle_name=$2, last_name=$3, date_of_birth=$4, gender=$5,
        marital_status=$6, occupation=$7,
        contact_phone=$8, contact_address=$9, contact_email=$10,
        admission_type=$11, ward_id=$12,
        emergency_name=$13, emergency_relationship=$14, emergency_phone=$15,
        referring_doctor=$16,
        is_confidential=$17,
        restricted_doctor_id=$18
      WHERE id=$19
      RETURNING *
      `,
      [
        firstName,
        middleName || null,
        lastName,
        dateOfBirth,
        gender || null,
        maritalStatus || null,
        occupation || null,
        contactPhone || null,
        contactAddress || null,
        contactEmail || null,
        admissionType || 'OPD',
        wardId || null,
        emergencyName || null,
        emergencyRelationship || null,
        emergencyPhone || null,
        referringDoctor || null,
        is_confidential,
        restricted_doctor_id || null,
        numericId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    const status = err.statusCode || 500;
    if (!err.statusCode) {
      console.error('❌ UpdatePatient Error:', err.message);
    }
    return res.status(status).send(
      err.statusCode ? { message: 'Invalid patient ID' } : 'Server Error'
    );
  }
};

/** ===========================================================
 *  DELETE PATIENT
 * ========================================================== */
const deletePatient = async (req, res) => {
  try {
    const id = ensureNumericId(req.params.id);

    const result = await pool.query(
      `DELETE FROM patients WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    return res.status(200).json({ message: 'Patient deleted successfully' });
  } catch (err) {
    const status = err.statusCode || 500;
    if (!err.statusCode) {
      console.error('❌ DeletePatient Error:', err.message);
    }
    return res.status(status).send(
      err.statusCode ? { message: 'Invalid patient ID' } : 'Server Error'
    );
  }
};

/** ===========================================================
 *  PATIENT TEST HISTORY (✅ restored)
 * ========================================================== */
const getPatientTestHistory = async (req, res) => {
  try {
    const id = ensureNumericId(req.params.id);

    const sql = `
      SELECT
        tr.id,
        tr.created_at,
        tr.status,
        tr.payment_status,
        COALESCE(COUNT(tri.id), 0) AS test_count
      FROM test_requests tr
      LEFT JOIN test_request_items tri
        ON tr.id = tri.test_request_id
      WHERE tr.patient_id = $1
      GROUP BY tr.id, tr.created_at, tr.status, tr.payment_status
      ORDER BY tr.created_at DESC;
    `;

    const result = await pool.query(sql, [id]);

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_VIEW_HISTORY',
      details: { patient_id: id },
    });

    return res.status(200).json(result.rows);
  } catch (err) {
    const status = err.statusCode || 500;

    if (!err.statusCode) {
      console.error('❌ getPatientTestHistory Error:', err.message);
    }

    return res.status(status).send(
      err.statusCode ? { message: 'Invalid patient ID' } : 'Server Error'
    );
  }
};

/** ===========================================================
 *  LOOKUP BY MRN
 * ========================================================== */
const getPatientByMRN = async (req, res) => {
  try {
    const { mrn } = req.params;
    const result = await pool.query(
      `
      SELECT p.*, w.name AS ward_name
      FROM patients p
      LEFT JOIN wards w ON p.ward_id = w.id
      WHERE p.mrn = $1
      LIMIT 1
      `,
      [mrn]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_LOOKUP_BY_MRN',
      details: { mrn },
    });

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('❌ getPatientByMRN Error:', err.message);
    return res.status(500).send('Server Error');
  }
};

/** ===========================================================
 *  EXPORTS
 * ========================================================== */
module.exports = {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
  getPatientByMRN,
};
