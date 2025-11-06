const pool = require('../config/database');
const { Parser } = require('json2csv');
const { logAuditEvent } = require('../utils/auditLogger');

// ===================================================
// @desc    Get Phlebotomy Summary
// @route   GET /api/phlebotomy/summary
// @access  Private
// ===================================================
const getSummary = async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'Awaiting Sample Collection') AS pending,
        COUNT(*) FILTER (WHERE status = 'Sample Collected') AS collected,
        COUNT(*) FILTER (WHERE status = 'Paid') AS awaiting_assignment,
        COUNT(*) AS total
      FROM test_requests;
    `;
    const result = await pool.query(query);

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PHLEBOTOMY_VIEW_SUMMARY',
      details: { summary: result.rows[0] },
    });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching summary:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'PHLEBOTOMY_VIEW_SUMMARY_FAILED',
      details: { error: error.message },
    });
    res.status(500).json({ message: 'Server Error' });
  }
};

// ===================================================
// @desc    Get Worklist by Status + Date Filter
// @route   GET /api/phlebotomy/worklist
// @access  Private
// ===================================================
const getWorklist = async (req, res) => {
  const { search = '', status = 'Awaiting Sample Collection', dateRange = 'all' } = req.query;
  try {
    let dateCondition = '';
    if (dateRange === 'today') dateCondition = "AND tr.created_at >= CURRENT_DATE";
    else if (dateRange === 'week') dateCondition = "AND tr.created_at >= NOW() - INTERVAL '7 days'";
    else if (dateRange === 'month') dateCondition = "AND tr.created_at >= NOW() - INTERVAL '1 month'";

    let query = `
      SELECT
        tr.id,
        tr.status,
        tr.sample_collected_at,
        p.first_name,
        p.last_name,
        p.lab_id,
        (
          SELECT json_agg(tc.name)
          FROM test_request_items tri
          JOIN test_catalog tc ON tri.test_catalog_id = tc.id
          WHERE tri.test_request_id = tr.id
        ) AS tests
      FROM test_requests tr
      JOIN patients p ON tr.patient_id = p.id
      WHERE ($1 = 'All' OR tr.status = $1)
      ${dateCondition}
    `;
    const params = [status];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length} OR p.lab_id ILIKE $${params.length})`;
    }

    query += ` ORDER BY tr.created_at DESC`;

    const result = await pool.query(query, params);

    await logAuditEvent({
      user_id: req.user.id,
      action: 'PHLEBOTOMY_VIEW_WORKLIST',
      details: { status, dateRange, count: result.rows.length },
    });

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching worklist:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'PHLEBOTOMY_VIEW_WORKLIST_FAILED',
      details: { error: error.message },
    });
    res.status(500).json({ message: 'Server Error' });
  }
};

// ===================================================
// @desc    Mark Sample as Collected
// @route   PUT /api/phlebotomy/collect/:id
// @access  Private
// ===================================================
const markSampleAsCollected = async (req, res) => {
  const { id } = req.params;
  const collectedBy = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        UPDATE test_requests
        SET status = 'Sample Collected',
            sample_collected_at = NOW(),
            collected_by = $1
        WHERE id = $2
        RETURNING *;
      `,
      [collectedBy, id]
    );

    if (result.rows.length === 0) throw new Error('Request not found');

    await client.query('COMMIT');

    await logAuditEvent({
      user_id: collectedBy,
      action: 'SAMPLE_COLLECTED',
      details: { request_id: id },
    });

    res.status(200).json({ message: '✅ Sample marked as collected', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error marking sample as collected:', error.message);
    await logAuditEvent({
      user_id: collectedBy,
      action: 'SAMPLE_COLLECT_FAILED',
      details: { request_id: id, error: error.message },
    });
    res.status(500).json({ message: 'Server Error' });
  } finally {
    client.release();
  }
};

// ===================================================
// @desc    Export Collected Samples to CSV
// @route   GET /api/phlebotomy/export
// @access  Private
// ===================================================
const exportCollectedSamples = async (req, res) => {
  try {
    const query = `
      SELECT
        tr.id AS request_id,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.lab_id,
        tr.status,
        tr.sample_collected_at,
        u.full_name AS collected_by
      FROM test_requests tr
      JOIN patients p ON tr.patient_id = p.id
      LEFT JOIN users u ON tr.collected_by = u.id
      WHERE tr.status = 'Sample Collected'
      ORDER BY tr.sample_collected_at DESC;
    `;
    const result = await pool.query(query);

    const parser = new Parser();
    const csv = parser.parse(result.rows);

    await logAuditEvent({
      user_id: req.user.id,
      action: 'EXPORT_COLLECTED_SAMPLES',
      details: { count: result.rows.length },
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`collected_samples_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('❌ Error exporting samples:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'EXPORT_COLLECTED_SAMPLES_FAILED',
      details: { error: error.message },
    });
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getSummary,
  getWorklist,
  markSampleAsCollected,
  exportCollectedSamples,
};
