const pool = require('../config/database');
const { Parser } = require('json2csv');
const { logAuditEvent } = require('../utils/auditLogger');

// ===================================================
// ✅ STATUS MAP — UI → ENUM (Authoritative)
// ===================================================
const STATUS_MAP = {
    "Pending": "Pending",
    "Sample Collected": "SampleCollected",
    "In Progress": "InProgress",
    "Completed": "Completed",
    "Verified": "Verified",
    "Cancelled": "Cancelled",
    "All": "All",

    // Backwards compatibility
    "Awaiting Sample Collection": "Pending",
    "SampleCollected": "SampleCollected",
    "InProgress": "InProgress"
};

// ===================================================
// @desc    Get Phlebotomy Summary
// ===================================================
const getSummary = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'SampleCollected') AS collected,
                COUNT(*) FILTER (WHERE status = 'InProgress') AS in_progress,
                COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
                COUNT(*) FILTER (WHERE status = 'Verified') AS verified,
                COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled,
                COUNT(*) AS total
            FROM test_requests;
        `);

        await logAuditEvent({
            user_id: req.user.id,
            action: 'PHLEBOTOMY_VIEW_SUMMARY',
            details: result.rows[0]
        });

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error fetching summary:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ===================================================
// @desc    Get Worklist
// ===================================================
const getWorklist = async (req, res) => {
    const { search = '', status = 'Pending', dateRange = 'all' } = req.query;
    const dbStatus = STATUS_MAP[status] || 'Pending';

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
            WHERE ($1 = 'All' OR tr.status = $1::test_request_status)
            ${dateCondition}
        `;

        const params = [dbStatus];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.first_name ILIKE $${params.length} 
                        OR p.last_name ILIKE $${params.length}
                        OR p.lab_id ILIKE $${params.length})`;
        }

        query += ` ORDER BY tr.created_at DESC`;

        const result = await pool.query(query, params);

        await logAuditEvent({
            user_id: req.user.id,
            action: 'PHLEBOTOMY_VIEW_WORKLIST',
            details: { status: dbStatus, dateRange, count: result.rows.length }
        });

        res.status(200).json(result.rows);

    } catch (error) {
        console.error('❌ Error fetching worklist:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ===================================================
// @desc    Mark Sample as Collected
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
                SET status = 'SampleCollected',
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
            details: { request_id: id }
        });

        res.status(200).json({ message: '✅ Sample marked as collected', data: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error marking sample as collected:', error.message);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        client.release();
    }
};

// ===================================================
// @desc    Export Collected Samples to CSV
// ===================================================
const exportCollectedSamples = async (req, res) => {
    try {
        const result = await pool.query(`
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
            WHERE tr.status = 'SampleCollected'
            ORDER BY tr.sample_collected_at DESC;
        `);

        const csv = new Parser().parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.attachment(`collected_samples_${Date.now()}.csv`);
        return res.send(csv);

    } catch (error) {
        console.error('❌ Error exporting samples:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getSummary,
    getWorklist,
    markSampleAsCollected,
    exportCollectedSamples,
};
