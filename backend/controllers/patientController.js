const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLogger');

/* -----------------------------------------------------------
 * SQL SANITIZER – removes non-breaking / zero-width spaces
 * -------------------------------------------------------- */
function sanitizeSQL(sql) {
  return sql.replace(/[\uFEFF\u00A0\u200B\u200C\u200D]/g, ' ');
}

/* Small helper if you want to use it elsewhere in this file */
async function runQuery(sql, params = []) {
  const clean = sanitizeSQL(sql);
  return pool.query(clean, params);
}

/** ===========================================================
 * MRN Generator (NOW ATOMIC)
 * ========================================================== */
const generateMRN = async (client) => {
  const sql = sanitizeSQL(`
    UPDATE mrn_settings 
    SET last_sequence = last_sequence + 1, updated_at = NOW() 
    WHERE id = (SELECT id FROM mrn_settings LIMIT 1)
    RETURNING last_sequence, facility_code
  `);

  const result = await client.query(sql);
  const { last_sequence: seq, facility_code: s } = result.rows[0];
  const year = new Date().getFullYear();
  const mrn = `${s}-${year}-${String(seq).padStart(6, '0')}`;
  return mrn;
};

/** ===========================================================
 * Ensure numeric ID
 * ========================================================== */
const ensureNumericId = (id) => {
  if (!/^\d+$/.test(String(id))) {
    const err = new Error('Invalid ID');
    err.statusCode = 400;
    throw err;
  }
  return Number(id);
};

/**
 * Normalize admission type to DB Enum
 */
const normalizeAdmissionType = (type) => {
  if (!type) return 'OPD';
  const lower = String(type).toLowerCase().trim();
  if (lower === 'inpatient' || lower === 'ipd') return 'IPD';
  if (lower === 'emergency') return 'Emergency';
  return 'OPD';
};

/** ===========================================================
 * REGISTER PATIENT
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
    is_confidential = false,
    restricted_doctor_id = null,
    priority = 'ROUTINE',
  } = req.body;

  const registeredBy = req.user.id;

  if (!firstName || !lastName || !dateOfBirth) {
    return res.status(400).json({
      message: 'First name, last name, and date of birth are required.',
    });
  }

  const normalizedAdmissionType = normalizeAdmissionType(admissionType);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mrn = await generateMRN(client);

    const insertSql = sanitizeSQL(`
      INSERT INTO patients (
        mrn,
        first_name,
        middle_name,
        last_name,
        date_of_birth,
        gender,
        marital_status,
        occupation,
        contact_phone,
        contact_address,
        contact_email,
        admission_type,
        ward_id,
        referring_doctor,
        emergency_name,
        emergency_relationship,
        emergency_phone,
        registered_by,
        registered_at,
        is_active,
        phone,
        address,
        is_confidential,
        restricted_doctor_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,
        $9,$10,$11,
        $12,
        $13,
        $14,
        $15,$16,$17,
        $18,
        NOW(),
        TRUE,
        $19,
        $20,
        $21,
        $22
      )
      RETURNING *
    `);

    const inserted = await client.query(insertSql, [
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
      normalizedAdmissionType,
      wardId || null,
      referringDoctor || null,
      emergencyName || null,
      emergencyRelationship || null,
      emergencyPhone || null,
      registeredBy,
      contactPhone || null,
      contactAddress || null,
      is_confidential,
      restricted_doctor_id || null,
    ]);

    const patient = inserted.rows[0];

    // Generate Lab ID
    const now = new Date();
    const labId = `${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${patient.id}`;

    const updateSql = sanitizeSQL(
      `UPDATE patients SET lab_id = $1 WHERE id = $2 RETURNING *`
    );
    const updated = await client.query(updateSql, [labId, patient.id]);

    await client.query('COMMIT');

    await logAuditEvent({
      user_id: registeredBy,
      action: 'PATIENT_CREATE',
      details: { patient_id: patient.id, mrn, lab_id: labId, priority },
    });

    const finalPatient = { ...updated.rows[0], priority };
    return res.status(201).json(finalPatient);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ RegisterPatient Error:', error);
    return res.status(500).json({ message: 'Server Error registering patient' });
  } finally {
    client.release();
  }
};

/** ===========================================================
 * GET ALL PATIENTS
 * ========================================================== */
const getAllPatients = async (req, res) => {
  try {
    const sql = sanitizeSQL(`
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
        'ROUTINE' AS priority,
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
    `);

    const result = await pool.query(sql);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ GetAllPatients Error:', err.message);
    return res.status(500).send('Server Error');
  }
};

/** ===========================================================
 * GET PATIENT BY ID
 * ========================================================== */
const getPatientById = async (req, res) => {
  try {
    const id = ensureNumericId(req.params.id);

    const sql = sanitizeSQL(`
      SELECT p.*, w.name AS ward_name
      FROM patients p
      LEFT JOIN wards w ON p.ward_id = w.id
      WHERE p.id = $1
    `);

    const result = await pool.query(sql, [id]);

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
 * UPDATE PATIENT (Corrected for Payload Mismatch)
 * ========================================================== */
const updatePatient = async (req, res) => {
  const { id } = req.params;

  // 1. Destructure inputs handling both camelCase (Legacy) and snake_case (Frontend)
  const {
    firstName, first_name,
    middleName, middle_name,
    lastName, last_name,
    dateOfBirth, date_of_birth,
    gender,
    maritalStatus, marital_status,
    occupation,
    contactPhone, contact_phone,
    contactAddress, contact_address,
    contactEmail, contact_email,
    admissionType, admission_type,
    wardId, ward_id,
    referringDoctor, referring_doctor,
    emergencyName, emergency_name,
    emergencyRelationship, emergency_relationship,
    emergencyPhone, emergency_phone,
    is_confidential,
    restricted_doctor_id,
  } = req.body;

  try {
    const numericId = ensureNumericId(id);

    // 2. Normalize values (Prefer snake_case if available, else camelCase)
    const fName = first_name || firstName;
    const lName = last_name || lastName;
    const dob = date_of_birth || dateOfBirth;
    const mName = middle_name || middleName || null;
    const sex = gender || null;
    const mStatus = marital_status || maritalStatus || null;
    const job = occupation || null;
    const phone = contact_phone || contactPhone || null;
    const address = contact_address || contactAddress || null;
    const email = contact_email || contactEmail || null;
    const admType = normalizeAdmissionType(admission_type || admissionType);
    const wId = ward_id || wardId || null;
    const refDoc = referring_doctor || referringDoctor || null;
    const eName = emergency_name || emergencyName || null;
    const eRel = emergency_relationship || emergencyRelationship || null;
    const ePhone = emergency_phone || emergencyPhone || null;
    const isConfidential = is_confidential || false;
    const restrictedDocId = restricted_doctor_id || null;

    // 3. Validation
    if (!fName || !lName) {
      return res.status(400).json({ message: "First Name and Last Name are required" });
    }

    const sql = sanitizeSQL(`
      UPDATE patients SET
        first_name = $1,
        middle_name = $2,
        last_name = $3,
        date_of_birth = $4,
        gender = $5,
        marital_status = $6,
        occupation = $7,
        contact_phone = $8,
        contact_address = $9,
        contact_email = $10,
        admission_type = $11,
        ward_id = $12,
        emergency_name = $13,
        emergency_relationship = $14,
        emergency_phone = $15,
        referring_doctor = $16,
        is_confidential = $17,
        restricted_doctor_id = $18,
        updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `);

    const result = await pool.query(sql, [
      fName,
      mName,
      lName,
      dob,
      sex,
      mStatus,
      job,
      phone,
      address,
      email,
      admType,
      wId,
      eName,
      eRel,
      ePhone,
      refDoc,
      isConfidential,
      restrictedDocId,
      numericId,
    ]);

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
 * DELETE PATIENT
 * ========================================================== */
const deletePatient = async (req, res) => {
  try {
    const id = ensureNumericId(req.params.id);

    const sql = sanitizeSQL(
      `DELETE FROM patients WHERE id = $1 RETURNING *`
    );

    const result = await pool.query(sql, [id]);

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
 * PATIENT TEST HISTORY
 * ========================================================== */
const getPatientTestHistory = async (req, res) => {
  try {
    const id = ensureNumericId(req.params.id);

    const sql = sanitizeSQL(`
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
      ORDER BY tr.created_at DESC
    `);

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
 * LOOKUP BY MRN
 * ========================================================== */
const getPatientByMRN = async (req, res) => {
  try {
    const { mrn } = req.params;

    const sql = sanitizeSQL(`
      SELECT p.*, w.name AS ward_name
      FROM patients p
      LEFT JOIN wards w ON p.ward_id = w.id
      WHERE p.mrn = $1
      LIMIT 1
    `);

    const result = await pool.query(sql, [mrn]);

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
 * SEARCH + PAGINATION
 * ========================================================== */
const searchPatients = async (req, res) => {
  try {
    const { q = '', year, page = 1, limit = 10 } = req.query;

    const filterYear = parseInt(year, 10) || new Date().getFullYear();
    const safePage = parseInt(page, 10);
    const safeLimit = parseInt(limit, 10);
    const offset = (safePage - 1) * safeLimit;
    const searchTerm = `%${q.toLowerCase()}%`;

    const sqlList = sanitizeSQL(`
      SELECT 
        p.id,
        p.mrn,
        p.lab_id,
        p.first_name,
        p.last_name,
        p.contact_phone,
        w.name AS ward_name
      FROM patients p
      LEFT JOIN wards w ON w.id = p.ward_id
      WHERE 
        COALESCE(EXTRACT(YEAR FROM p.registered_at), $1) = $1
        AND (
          p.first_name ILIKE $2 OR
          p.last_name ILIKE $2 OR
          p.lab_id ILIKE $2 OR
          p.contact_phone ILIKE $2 OR
          COALESCE(p.referring_doctor, '') ILIKE $2 OR
          COALESCE(w.name, '') ILIKE $2
        )
      ORDER BY p.registered_at DESC NULLS LAST
      LIMIT $3 OFFSET $4
    `);

    const sqlCount = sanitizeSQL(`
      SELECT COUNT(*) AS total
      FROM patients p
      LEFT JOIN wards w ON w.id = p.ward_id
      WHERE 
        COALESCE(EXTRACT(YEAR FROM p.registered_at), $1) = $1
        AND (
          p.first_name ILIKE $2 OR
          p.last_name ILIKE $2 OR
          p.lab_id ILIKE $2 OR
          p.contact_phone ILIKE $2 OR
          COALESCE(p.referring_doctor, '') ILIKE $2 OR
          COALESCE(w.name, '') ILIKE $2
        )
    `);

    const patients = await pool.query(sqlList, [
      filterYear,
      searchTerm,
      safeLimit,
      offset,
    ]);

    const count = await pool.query(sqlCount, [filterYear, searchTerm]);

    return res.json({
      results: patients.rows,
      total: parseInt(count.rows[0].total, 10),
      page: safePage,
      totalPages: Math.ceil(count.rows[0].total / safeLimit) || 1,
    });
  } catch (err) {
    console.error('❌ searchPatients error:', err);
    return res.status(500).json({ message: 'Search failed' });
  }
};

/** ===========================================================
 * EXPORTS
 * ========================================================== */
module.exports = {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
  getPatientByMRN,
  searchPatients,
};