const pool = require('../config/database');

/**
 * @desc Perform a global search across multiple tables (patients, test requests, staff)
 * @route GET /api/search?q=<query>
 * @access Private (Admins or authorized users)
 */
const globalSearch = async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ message: 'Search query is required.' });
  }

  try {
    const searchTerm = q.trim().toLowerCase();
    const likeQuery = `%${searchTerm}%`;
    console.log(`🔍 Global Search Query: "${searchTerm}" by User ID: ${req.user?.id}`);

    const [patientResults, requestResults, staffResults] = await Promise.all([
      // Search patients
      pool.query(
        `SELECT id, first_name, last_name, lab_id
         FROM patients
         WHERE LOWER(first_name) LIKE $1
            OR LOWER(last_name) LIKE $1
            OR LOWER(lab_id) LIKE $1
         ORDER BY id DESC
         LIMIT 10`,
        [likeQuery]
      ),

      // Search test requests (linked to patients)
      pool.query(
        `SELECT tr.id, p.first_name, p.last_name
         FROM test_requests tr
         JOIN patients p ON tr.patient_id = p.id
         WHERE CAST(tr.id AS TEXT) ILIKE $1
         ORDER BY tr.id DESC
         LIMIT 10`,
        [likeQuery]
      ),

      // Search staff (users)
      pool.query(
        `SELECT id, full_name, email, role_id
         FROM users
         WHERE LOWER(full_name) LIKE $1
            OR LOWER(email) LIKE $1
         ORDER BY id DESC
         LIMIT 10`,
        [likeQuery]
      ),
    ]);

    // ✅ Optional: create a unified list for easier frontend rendering
    const unifiedResults = [
      ...patientResults.rows.map(r => ({
        type: 'Patient',
        id: r.id,
        name: `${r.first_name} ${r.last_name}`,
        identifier: r.lab_id,
      })),
      ...requestResults.rows.map(r => ({
        type: 'Test Request',
        id: r.id,
        name: `${r.first_name} ${r.last_name}`,
        identifier: `TR-${r.id}`,
      })),
      ...staffResults.rows.map(r => ({
        type: 'Staff',
        id: r.id,
        name: r.full_name,
        identifier: r.email,
      })),
    ];

    res.status(200).json({
      summary: {
        total: unifiedResults.length,
        patients: patientResults.rowCount,
        test_requests: requestResults.rowCount,
        staff: staffResults.rowCount,
      },
      patients: patientResults.rows,
      test_requests: requestResults.rows,
      staff: staffResults.rows,
      unified: unifiedResults,
    });
  } catch (error) {
    console.error('❌ Global Search Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { globalSearch };
