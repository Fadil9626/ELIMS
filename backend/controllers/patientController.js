const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc Register a new patient and generate a Lab ID
 * @route POST /api/patients
 * @access Private
 */
const registerPatient = async (req, res) => {
  // 🟢 FIX: Include all fields from the database schema
  let { firstName, lastName, dateOfBirth, gender, contactInfo, wardId, referringDoctor } = req.body;
  const registeredBy = req.user.id;

  if (!firstName || !lastName || !dateOfBirth) {
    return res.status(400).json({ message: 'Please provide first name, last name, and date of birth' });
  }

  if (wardId === '') wardId = null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const newPatient = await client.query(
      `INSERT INTO patients 
        (first_name, last_name, date_of_birth, gender, contact_info, registered_by, ward_id, referring_doctor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        firstName,
        lastName,
        dateOfBirth,
        gender || null,
        JSON.stringify(contactInfo || {}), // Ensure contactInfo is stored as JSON
        registeredBy,
        wardId,
        referringDoctor || null
      ]
    );

    const patient = newPatient.rows[0];
    // Generate Lab ID
    const labId = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${patient.id}`;

    const updatedPatient = await client.query(
      'UPDATE patients SET lab_id = $1 WHERE id = $2 RETURNING *',
      [labId, patient.id]
    );

    await client.query('COMMIT');

    // ✅ Log successful patient creation
    await logAuditEvent({
      user_id: registeredBy,
      action: 'PATIENT_CREATE',
      details: {
        patient_id: patient.id,
        patient_name: `${firstName} ${lastName}`,
        lab_id: labId,
      },
    });

    res.status(201).json(updatedPatient.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Register Patient Error:', error.message);
    await logAuditEvent({
      user_id: registeredBy,
      action: 'PATIENT_CREATE_FAILED',
      details: { error: error.message },
    });
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
};

/**
 * @desc Get all patients (with ward name + latest request)
 * @route GET /api/patients
 * @access Private
 */
const getAllPatients = async (req, res) => {
  try {
    const query = `
      WITH LatestRequest AS (
        SELECT patient_id, id, status,
               ROW_NUMBER() OVER(PARTITION BY patient_id ORDER BY created_at DESC) AS rn
        FROM test_requests
      )
      SELECT 
        p.id, p.first_name, p.last_name, p.lab_id, p.date_of_birth, p.gender,
        p.contact_info, p.referring_doctor, p.ward_id, w.name AS ward_name,
        lr.id AS latest_request_id, lr.status AS latest_request_status, p.registered_at
      FROM patients p
      LEFT JOIN wards w ON p.ward_id = w.id
      LEFT JOIN LatestRequest lr ON p.id = lr.patient_id AND lr.rn = 1
      ORDER BY p.registered_at DESC;
    `;
    const result = await pool.query(query);

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_VIEW_ALL',
      details: { count: result.rows.length },
    });

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ GetAllPatients Error:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_VIEW_ALL_FAILED',
      details: { error: error.message },
    });
    res.status(500).send('Server Error');
  }
};

/**
 * @desc Get patient by ID (with ward name)
 * @route GET /api/patients/:id
 * @access Private
 */
const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, w.name AS ward_name
      FROM patients p
      LEFT JOIN wards w ON p.ward_id = w.id
      WHERE p.id = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      await logAuditEvent({
        user_id: req.user.id,
        action: 'PATIENT_VIEW_FAILED',
        details: { patient_id: id, reason: 'Not found' },
      });
      return res.status(404).json({ message: 'Patient not found' });
    }

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_VIEW',
      details: { patient_id: id },
    });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ GetPatientById Error:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_VIEW_FAILED',
      details: { error: error.message },
    });
    res.status(500).send('Server Error');
  }
};

/**
 * @desc Update patient details (including ward)
 * @route PUT /api/patients/:id
 * @access Private
 */
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    let { firstName, lastName, dateOfBirth, gender, contactInfo, wardId, referringDoctor } = req.body;
    if (wardId === '') wardId = null;

    const result = await pool.query(
      `UPDATE patients
       SET first_name=$1, last_name=$2, date_of_birth=$3, gender=$4,
           contact_info=$5, ward_id=$6, referring_doctor=$7
       WHERE id=$8
       RETURNING *`,
      [
        firstName,
        lastName,
        dateOfBirth,
        gender || null,
        JSON.stringify(contactInfo || {}),
        wardId,
        referringDoctor || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      await logAuditEvent({
        user_id: req.user.id,
        action: 'PATIENT_UPDATE_FAILED',
        details: { patient_id: id, reason: 'Not found' },
      });
      return res.status(404).json({ message: 'Patient not found' });
    }

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_UPDATE',
      details: { patient_id: id, updated_fields: req.body },
    });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ UpdatePatient Error:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_UPDATE_FAILED',
      details: { error: error.message },
    });
    res.status(500).send('Server Error');
  }
};

/**
 * @desc Delete a patient
 * @route DELETE /api/patients/:id
 * @access Private
 */
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      await logAuditEvent({
        user_id: req.user.id,
        action: 'PATIENT_DELETE_FAILED',
        details: { patient_id: id, reason: 'Not found' },
      });
      return res.status(404).json({ message: 'Patient not found' });
    }

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_DELETE',
      details: { patient_id: id },
    });

    res.status(200).json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('❌ DeletePatient Error:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_DELETE_FAILED',
      details: { error: error.message },
    });
    res.status(500).send('Server Error');
  }
};

/**
 * @desc Get a patient's test history
 * @route GET /api/patients/:id/test-requests
 * @access Private
 */
const getPatientTestHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await pool.query(
      'SELECT id, status, created_at FROM test_requests WHERE patient_id = $1 ORDER BY created_at DESC',
      [id]
    );

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_VIEW_HISTORY',
      details: { patient_id: id, count: history.rows.length },
    });

    res.status(200).json(history.rows);
  } catch (error) {
    console.error('❌ GetPatientTestHistory Error:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'PATIENT_VIEW_HISTORY_FAILED',
      details: { error: error.message },
    });
    res.status(500).send('Server Error');
  }
};

module.exports = {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
};