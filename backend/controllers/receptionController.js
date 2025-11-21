// backend/controllers/receptionController.js
const pool = require("../config/database");
const { logAuditEvent } = require("../utils/auditLogger");

// ---------------------------------------------------------
// HUMAN-READABLE LABELS FOR UI
// ---------------------------------------------------------
const STATUS_LABELS = {
  Pending: "Registered",
  SampleCollected: "Sample Collected",
  SampleReceived: "Sample Received",
  Processing: "Processing",
  Completed: "Results Completed",
  Verified: "Verified by Pathologist",
  Released: "Released to Reception",
  Printed: "Printed & Archived",
  Cancelled: "Cancelled",
  UnderReview: "Under Review",
  Reopened: "Reopened",
};

// ---------------------------------------------------------
// CONTROLLED WORKFLOW TRANSITIONS (Workflow B)
// ---------------------------------------------------------
const allowedTransitions = {
  Pending: ["SampleCollected"],          // Reception / Phlebotomy
  SampleCollected: ["SampleReceived"],   // Phlebotomy / Lab receiving
  SampleReceived: ["Processing"],        // Lab starts work
  Processing: ["Completed"],             // Lab finishes
  Completed: ["Verified"],               // Pathologist
  Verified: ["Released"],                // Pathologist / Lab QA
  Released: ["Printed"],                 // Reception AFTER preview
  Printed: [],                           // Final
  Cancelled: [],
  UnderReview: [],
  Reopened: [],
};

// ---------------------------------------------------------
// DASHBOARD SUMMARY
// GET /api/reception/dashboard-stats?date=YYYY-MM-DD
// ---------------------------------------------------------
exports.getReceptionDashboardStats = async (req, res) => {
  try {
    const targetDate =
      req.query.date || new Date().toISOString().split("T")[0];

    const sql = `
      SELECT
        -- How many patients were registered on this date
        (SELECT COUNT(*) 
           FROM patients 
          WHERE DATE(registered_at) = $1
        ) AS registered_today,

        -- Test requests still at 'Pending' = billing not yet settled
        (SELECT COUNT(*) 
           FROM test_requests 
          WHERE status = 'Pending'
        ) AS pending_billing,

        -- Sample has been ordered/collected but not yet fully received
        (SELECT COUNT(*) 
           FROM test_requests 
          WHERE status = 'SampleCollected'
        ) AS pending_sample,

        -- How many were fully completed on this date
        (SELECT COUNT(*) 
           FROM test_requests 
          WHERE status = 'Completed' 
            AND DATE(updated_at) = $1
        ) AS completed_today
    `;

    const result = await pool.query(sql, [targetDate]);

    return res.json({
      success: true,
      data: result.rows[0] || {
        registered_today: 0,
        pending_billing: 0,
        pending_sample: 0,
        completed_today: 0,
      },
    });
  } catch (error) {
    console.error("❌ Reception Dashboard Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to load dashboard stats" });
  }
};

// ---------------------------------------------------------
// GET RECEPTION QUEUE FOR A DATE
// GET /api/reception/queue?date=YYYY-MM-DD
// ---------------------------------------------------------
exports.getReceptionQueue = async (req, res) => {
  try {
    const targetDate =
      req.query.date || new Date().toISOString().split("T")[0];

    const sql = `
      SELECT 
        tr.id,
        tr.status,
        
        -- 🔑 FIX: Use COALESCE to ensure these fields are never NULL, defaulting
        -- to 'Unpaid' and 0, respectively. This prevents front-end failures.
        COALESCE(tr.payment_status, 'Unpaid') AS payment_status,
        COALESCE(tr.payment_amount, 0) AS payment_amount,

        tr.created_at,
        tr.updated_at,
        p.mrn,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.contact_phone,

        -- Latest sample info, if any
        s.id        AS sample_id,
        s.status    AS sample_status,
        s.collected_at,
        s.received_at,

        -- Derived flags for UI
        CASE 
          WHEN tr.status IN ('Verified','Released','Printed') 
            THEN TRUE 
          ELSE FALSE 
        END AS has_report_ready,

        CASE 
          WHEN tr.status = 'Pending' THEN 'Billing Pending'
          WHEN tr.status = 'SampleCollected' AND s.id IS NULL THEN 'Awaiting Sample'
          WHEN tr.status = 'SampleCollected' AND s.id IS NOT NULL THEN 'Sample Collected'
          WHEN tr.status = 'SampleReceived' THEN 'Sample Received in Lab'
          WHEN tr.status = 'Processing' THEN 'Processing in Lab'
          WHEN tr.status = 'Completed' THEN 'Results Completed'
          WHEN tr.status = 'Verified' THEN 'Verified by Pathologist'
          WHEN tr.status = 'Released' THEN 'Released to Reception'
          WHEN tr.status = 'Printed' THEN 'Printed & Archived'
          ELSE tr.status::text
        END AS workflow_status

      FROM test_requests tr
      JOIN patients p 
        ON p.id = tr.patient_id

      -- Latest sample for each test request (if any)
      LEFT JOIN LATERAL (
        SELECT s2.*
          FROM samples s2
         WHERE s2.test_request_id = tr.id
         ORDER BY s2.id DESC
         LIMIT 1
      ) s ON TRUE

      WHERE DATE(tr.created_at) = $1

      ORDER BY 
        CASE tr.status
          WHEN 'Pending' THEN 1
          WHEN 'SampleCollected' THEN 2
          WHEN 'SampleReceived' THEN 3
          WHEN 'Processing' THEN 4
          WHEN 'Completed' THEN 5
          WHEN 'Verified' THEN 6
          WHEN 'Released' THEN 7
          WHEN 'Printed' THEN 8
          ELSE 99
        END,
        tr.created_at ASC
    `;

    const result = await pool.query(sql, [targetDate]);

    const formatted = result.rows.map((row) => ({
      ...row,
      status_label: STATUS_LABELS[row.status] || row.status,
      // Check for 'paid', 'Paid', or explicitly 'Unpaid'
      is_paid: row.payment_status === 'paid' || row.payment_status === 'Paid'
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("❌ Reception Queue Error:", error);
    return res.status(500).json({ message: "Failed to load queue" });
  }
};

// ---------------------------------------------------------
// UPDATE TEST REQUEST STATUS
// PATCH /api/reception/queue/:id/status
// Body: { next_status: "SampleCollected" | ..., preview_confirmed?: true }
// ---------------------------------------------------------
exports.updateTestRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { next_status, preview_confirmed } = req.body || {};

    if (!next_status) {
      return res
        .status(400)
        .json({ message: "next_status is required" });
    }

    // Fetch current status
    const { rows } = await pool.query(
      "SELECT status FROM test_requests WHERE id=$1",
      [id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ message: "Test request not found" });
    }

    const currentStatus = rows[0].status;

    // Check if transition is allowed in our workflow
    const allowedNext = allowedTransitions[currentStatus] || [];
    if (!allowedNext.includes(next_status)) {
      return res.status(403).json({
        message: `❌ Transition not allowed: ${currentStatus} → ${next_status}`,
      });
    }

    // EXTRA RULE: Released → Printed REQUIRES PREVIEW CONFIRMATION
    if (next_status === "Printed" && !preview_confirmed) {
      return res.status(403).json({
        message: "❌ You must preview the report before printing.",
      });
    }

    // Perform update
    await pool.query(
      "UPDATE test_requests SET status=$1, updated_at=NOW() WHERE id=$2",
      [next_status, id]
    );

    // Audit logging
    const auditAction =
      next_status === "Printed" ? "REPORT_PRINT" : "STATUS_UPDATE";

    await logAuditEvent({
      user_id: req.user?.id || null,
      action: auditAction,
      details: {
        test_request_id: Number(id),
        from: currentStatus,
        to: next_status,
        preview_confirmed: !!preview_confirmed,
      },
    });

    // Realtime broadcast for dashboards
    const io = req.app.get("io");
    if (io) {
      io.emit("reception:queue-updated", {
        id: Number(id),
        from: currentStatus,
        to: next_status,
      });
    }

    return res.json({
      success: true,
      message: `Updated → ${next_status}`,
    });
  } catch (error) {
    console.error("❌ Status Update Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update status" });
  }
};