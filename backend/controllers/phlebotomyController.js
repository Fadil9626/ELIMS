// controllers/phlebotomyController.js
const pool = require("../config/database");
const { Parser } = require("json2csv");
const { logAuditEvent } = require("../utils/auditLogger");

// ===================================================
// STATUS MAP — UI → DB STATUS (Authoritative)
// ===================================================
const STATUS_MAP = {
  Pending: "Pending",
  SampleReceived: "SampleReceived",
  "Sample Received": "SampleReceived",

  SampleCollected: "SampleCollected",
  "Sample Collected": "SampleCollected",

  InProgress: "InProgress",
  "In Progress": "InProgress",

  Completed: "Completed",
  Verified: "Verified",
  Cancelled: "Cancelled",
  All: "All",
};

// ===================================================
// GET SUMMARY — Counts for Dashboard
// ===================================================
const getSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('Pending','SampleReceived')) AS pending,
        COUNT(*) FILTER (WHERE status = 'SampleCollected') AS collected,
        COUNT(*) FILTER (WHERE status = 'InProgress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'Verified') AS verified,
        COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled,
        COUNT(*) AS total
      FROM test_requests;
    `);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error fetching summary:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ===================================================
// GET WORKLIST — Phlebotomy Queue
// ===================================================
const getWorklist = async (req, res) => {
  const { search = "", status = "SampleReceived", dateRange = "all" } = req.query;
  const dbStatus = STATUS_MAP[status] || "SampleReceived";

  try {
    // Date Filter
    let dateCondition = "";
    if (dateRange === "today") {
      dateCondition = "AND tr.created_at >= CURRENT_DATE";
    } else if (dateRange === "week") {
      dateCondition = "AND tr.created_at >= NOW() - INTERVAL '7 days'";
    } else if (dateRange === "month") {
      dateCondition = "AND tr.created_at >= NOW() - INTERVAL '1 month'";
    }

    // Base Query (Priority added + uppercased)
    let query = `
      SELECT
        tr.id,
        tr.status,
        UPPER(tr.priority) AS priority,
        tr.sample_collected_at,

        p.first_name,
        p.last_name,
        p.lab_id,
        w.name AS ward_name,

        (
          SELECT json_agg(tc.name)
          FROM test_request_items tri
          JOIN test_catalog tc ON tri.test_catalog_id = tc.id
          WHERE tri.test_request_id = tr.id
        ) AS tests

      FROM test_requests tr
      JOIN patients p ON tr.patient_id = p.id
      LEFT JOIN wards w ON p.ward_id = w.id
      WHERE 1=1
      ${dateCondition}
    `;

    const params = [];
    let idx = 1;

    // Status filter
    if (dbStatus !== "All") {
      query += ` AND tr.status = $${idx}::test_request_status`;
      params.push(dbStatus);
      idx++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        p.first_name ILIKE $${idx}
        OR p.last_name ILIKE $${idx}
        OR p.lab_id ILIKE $${idx}
        OR w.name ILIKE $${idx}
      )`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY 
                 CASE WHEN UPPER(tr.priority) = 'URGENT' THEN 0 ELSE 1 END,
                 tr.created_at ASC`;

    const result = await pool.query(query, params);

    await logAuditEvent({
      user_id: req.user.id,
      action: "PHLEBOTOMY_VIEW_WORKLIST",
      details: { status: dbStatus, dateRange, count: result.rows.length },
    });

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching worklist:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ===================================================
// MARK SAMPLE AS COLLECTED
// ===================================================
const markSampleAsCollected = async (req, res) => {
  const { id } = req.params;
  const collectedBy = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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

    if (result.rows.length === 0) throw new Error("Request not found");

    await client.query("COMMIT");

    await logAuditEvent({
      user_id: collectedBy,
      action: "SAMPLE_COLLECTED",
      details: { request_id: id },
    });

    return res.status(200).json({
      message: "✅ Sample marked as collected",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error marking sample as collected:", error.message);
    return res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

// ===================================================
// EXPORT COLLECTED SAMPLES TO CSV
// ===================================================
const exportCollectedSamples = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tr.id AS request_id,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.lab_id,
        tr.priority,
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

    res.header("Content-Type", "text/csv");
    res.attachment(`collected_samples_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error("❌ Error exporting samples:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getSummary,
  getWorklist,
  markSampleAsCollected,
  exportCollectedSamples,
};
