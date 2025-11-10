// controllers/testRequestController.js
const pool = require("../config/database");

/* =============================================================
 * Helper: Smart Reference Range  (aligned to your schema)
 * ============================================================= */
async function getSmartRefRange(client, analyteId, gender = null, ageYears = null) {
  if (!analyteId) return null;

  const g =
    gender?.toLowerCase().startsWith("m")
      ? "male"
      : gender?.toLowerCase().startsWith("f")
      ? "female"
      : null;

  // NOTE: your table has: range_type, min_value, max_value, qualitative_value,
  // symbol_operator, reference_range_text, gender, min_age, max_age, analyte_id
  const { rows } = await client.query(
    `
    SELECT range_type, min_value, max_value,
           qualitative_value, symbol_operator, reference_range_text
    FROM normal_ranges
    WHERE analyte_id = $1
      AND ($2 IS NULL OR LOWER(gender) = $2 OR gender IS NULL)
      AND (min_age IS NULL OR $3 >= min_age)
      AND (max_age IS NULL OR $3 <= max_age)
    ORDER BY gender NULLS FIRST, id ASC
    LIMIT 1;
    `,
    [analyteId, g, ageYears]
  );

  if (!rows.length) return null;
  const r = rows[0];

  let text = null;
  if ((r.range_type || "").toLowerCase() === "numeric") {
    if (r.min_value != null && r.max_value != null) text = `${r.min_value} – ${r.max_value}`;
    else if (r.min_value != null) text = `≥ ${r.min_value}`;
    else if (r.max_value != null) text = `≤ ${r.max_value}`;
  } else if (r.qualitative_value) {
    text = r.qualitative_value;
  } else if (r.symbol_operator && r.max_value != null) {
    text = `${r.symbol_operator} ${r.max_value}`;
  }

  if (r.reference_range_text) text = text ? `${text} (${r.reference_range_text})` : r.reference_range_text;
  return text;
}

/* =============================================================
 * Helper: Audit Log (aligned to your audit_logs schema)
 * columns: user_id, action, details JSONB, entity, entity_id, entity_type, user_name
 * ============================================================= */
async function logAudit(client, userId, userName, action, entityType, entityId, detailsObj = {}) {
  try {
    await client.query(
      `
      INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, entity, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $4, $6::jsonb, NOW());
      `,
      [userId || null, userName || null, action, entityType, entityId, JSON.stringify(detailsObj)]
    );
  } catch {
    // swallow audit errors
  }
}

/* =============================================================
 * GET ALL TEST REQUESTS
 * ============================================================= */
async function getAllTestRequests(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT tr.id, tr.status, tr.payment_status, tr.payment_amount,
             tr.payment_method, tr.created_at,
             p.id AS patient_id,
             CONCAT(p.first_name,' ',p.last_name) AS patient_name,
             DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age
      FROM test_requests tr
      LEFT JOIN patients p ON tr.patient_id = p.id
      ORDER BY tr.id DESC;
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ getAllTestRequests:", err.message);
    res.status(500).json({ message: "Server error fetching test requests" });
  }
}

/* =============================================================
 * GET TEST REQUESTS BY PATIENT ID
 * ============================================================= */
async function getTestRequestsByPatientId(req, res) {
  const patientId = parseInt(req.params.id || req.params.patientId, 10);
  if (isNaN(patientId)) return res.status(400).json({ message: "Invalid Patient ID" });

  try {
    const { rows } = await pool.query(
      `
      SELECT tr.id, tr.status, tr.payment_status, tr.created_at,
             COALESCE((
               SELECT STRING_AGG(tc.name, ', ')
               FROM test_request_items tri
               JOIN test_catalog tc ON tri.test_catalog_id = tc.id
               WHERE tri.test_request_id = tr.id AND tri.parent_id IS NULL
             ), '') AS ordered_tests,
             COALESCE(p.first_name, 'Unknown') AS patient_first_name,
             COALESCE(p.last_name, 'Patient')  AS patient_last_name,
             DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age
      FROM test_requests tr
      LEFT JOIN patients p ON tr.patient_id = p.id
      WHERE tr.patient_id = $1
      ORDER BY tr.created_at DESC;
      `,
      [patientId]
    );

    if (!rows.length) console.log(`No test requests found for patient ID ${patientId}`);
    res.json(rows);
  } catch (err) {
    console.error("❌ getTestRequestsByPatientId:", err.message);
    res.status(500).json({ message: "Server error fetching patient's test requests" });
  }
}

/* =============================================================
 * CREATE TEST REQUEST
 * ============================================================= */
async function createTestRequest(req, res) {
  const { patientId, testIds } = req.body;
  const userId = req.user?.id || null;
  const userName = req.user?.full_name || "System";

  if (!patientId || !Array.isArray(testIds) || testIds.length === 0) {
    return res.status(400).json({ message: "Select at least one test or panel" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Patient info (for ward/referring doctor)
    const { rows: patientRows } = await client.query(
      `SELECT ward_id, referring_doctor FROM patients WHERE id = $1`,
      [patientId]
    );
    if (!patientRows.length) throw new Error("Patient not found for test request.");

    const wardId = patientRows[0].ward_id || null;
    const referringDoctor = patientRows[0].referring_doctor || null;

    // Header
    const { rows: hdr } = await client.query(
      `
      INSERT INTO test_requests (
        patient_id, status, payment_status, created_by, ward_id, referring_doctor
      ) VALUES ($1, 'Pending', 'Unpaid', $2, $3, $4)
      RETURNING id;
      `,
      [patientId, userId, wardId, referringDoctor]
    );
    if (!hdr.length) throw new Error("Failed to create request header.");
    const requestId = hdr[0].id;

    // Selected catalog rows
    const { rows: catalogTests } = await client.query(
      `SELECT id, name, is_panel, COALESCE(price,0) AS price FROM test_catalog WHERE id = ANY($1::int[])`,
      [testIds]
    );

    let totalCost = 0;
    const panels = [];

    // Insert top-level items
    for (const t of catalogTests) {
      totalCost += Number(t.price) || 0;

      const { rows: ins } = await client.query(
        `INSERT INTO test_request_items (test_request_id, test_catalog_id, status)
         VALUES ($1,$2,'Pending') RETURNING id`,
        [requestId, t.id]
      );

      if (t.is_panel && ins.length) {
        panels.push({ parent_item_id: ins[0].id, panel_id: t.id });
      }
    }

    // Expand panels to analytes
    for (const p of panels) {
      const { rows: analytes } = await client.query(
        `
        SELECT tc.id AS analyte_id, COALESCE(tc.price,0) AS price
        FROM test_panel_analytes tpa
        JOIN test_catalog tc ON tc.id = tpa.analyte_id
        WHERE tpa.panel_id = $1;
        `,
        [p.panel_id]
      );

      for (const a of analytes) {
        await client.query(
          `INSERT INTO test_request_items (test_request_id, test_catalog_id, parent_id, status)
           VALUES ($1,$2,$3,'Pending')`,
          [requestId, a.analyte_id, p.parent_item_id]
        );
      }
    }

    // Billing
    await client.query(`UPDATE test_requests SET payment_amount = $1 WHERE id = $2`, [
      totalCost,
      requestId,
    ]);

    await logAudit(client, userId, userName, "CREATE", "TestRequest", requestId, {
      patientId,
      testIds,
      totalCost,
    });

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "✅ Test request created successfully",
      request_id: requestId,
      total: totalCost,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("=========================================");
    console.error("❌ CRITICAL TRANSACTION FAILURE (ROLLBACK)");
    console.error("Error Message:", err.message);
    console.error("=========================================");
    res.status(500).json({ message: "Server error creating test request: " + err.message });
  } finally {
    client.release();
  }
}

/* =============================================================
 * GET SINGLE REQUEST (header + items)
 * ============================================================= */
async function getTestRequestById(req, res) {
  const { id } = req.params;
  try {
    const header = await pool.query(
      `SELECT tr.*, p.first_name, p.last_name, p.gender, p.date_of_birth
       FROM test_requests tr
       LEFT JOIN patients p ON tr.patient_id = p.id
       WHERE tr.id = $1`,
      [id]
    );
    if (!header.rows.length) return res.status(404).json({ message: "Request not found" });

    const items = await pool.query(
      `SELECT tri.id AS item_id, tri.parent_id,
              tc.id AS test_id, tc.name AS test_name,
              COALESCE(tc.is_panel, FALSE) AS is_panel,
              d.name AS department, COALESCE(tc.price,0) AS price
       FROM test_request_items tri
       LEFT JOIN test_catalog  tc ON tri.test_catalog_id = tc.id
       LEFT JOIN departments   d  ON tc.department_id       = d.id
       WHERE tri.test_request_id = $1
       ORDER BY tri.parent_id NULLS FIRST, tri.id`,
      [id]
    );

    res.json({ ...header.rows[0], items: items.rows });
  } catch (err) {
    console.error("❌ getTestRequestById:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

/* =============================================================
 * RESULT ENTRY (for a request)
 * ============================================================= */
async function getResultEntry(req, res) {
  const requestId = parseInt(req.params.id, 10);
  if (isNaN(requestId)) return res.status(400).json({ message: "Invalid ID" });

  const client = await pool.connect();
  try {
    const { rows: hdr } = await client.query(
      `SELECT p.gender, DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age_years
       FROM test_requests tr
       JOIN patients p ON tr.patient_id = p.id
       WHERE tr.id = $1`,
      [requestId]
    );

    const gender = hdr[0]?.gender || null;
    const ageYears = hdr[0]?.age_years || null;

    const { rows: items } = await client.query(
      `SELECT tri.id AS request_item_id, tri.parent_id,
              tc.id AS test_id, tc.name AS test_name,
              COALESCE(tc.is_panel,false) AS is_panel,
              d.name AS department_name,
              u.unit_name, u.symbol AS unit_symbol,
              tri.result_value, tri.status
       FROM test_request_items tri
       JOIN test_catalog tc ON tc.id = tri.test_catalog_id
       LEFT JOIN departments d ON d.id = tc.department_id
       LEFT JOIN units u ON u.id = tc.unit_id
       WHERE tri.test_request_id = $1
       ORDER BY tri.parent_id NULLS FIRST, tc.name`,
      [requestId]
    );

    if (!items.length) return res.status(404).json({ message: "No tests found" });

    const panels = {};
    const general = [];

    for (const item of items) {
      if (item.is_panel && !item.parent_id) panels[item.request_item_id] = { ...item, analytes: [] };
    }

    for (const item of items) {
      const ref = await getSmartRefRange(client, item.test_id, gender, ageYears);
      if (item.parent_id && panels[item.parent_id]) {
        panels[item.parent_id].analytes.push({ ...item, ref_range: ref });
      } else if (!item.is_panel && !item.parent_id) {
        general.push({ ...item, ref_range: ref, analytes: [] });
      }
    }

    res.json({ request_id: requestId, items: [...general, ...Object.values(panels)] });
  } catch (err) {
    console.error("❌ getResultEntry:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

/* =============================================================
 * SAVE RESULTS  (no entered_by/entered_at columns in your schema)
 * ============================================================= */
async function saveResultEntry(req, res) {
  const requestId = parseInt(req.params.id, 10);
  const { results } = req.body;

  if (!Array.isArray(results) || !results.length)
    return res.status(400).json({ message: "Results required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const r of results) {
      await client.query(
        `UPDATE test_request_items
         SET result_value = $1, status = 'Completed', updated_at = NOW()
         WHERE id = $2 AND test_request_id = $3`,
        [r.value, r.request_item_id, requestId]
      );
    }

    await client.query(`UPDATE test_requests SET status = 'Completed' WHERE id = $1`, [requestId]);
    await client.query("COMMIT");
    res.json({ message: "✅ Results saved" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ saveResultEntry:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

/* =============================================================
 * VERIFY RESULTS
 * ============================================================= */
async function verifyResults(req, res) {
  const requestId = parseInt(req.params.id, 10);
  const { action } = req.body;
  const verifierId = req.user?.id || null;
  const verifierName = req.user?.full_name || "Verifier";

  if (!["verify", "reject"].includes(action))
    return res.status(400).json({ message: "Invalid action" });

  const newStatus = action === "verify" ? "Verified" : "Cancelled";

  try {
    await pool.query(
      `UPDATE test_request_items
       SET verified_by = $1, verified_name = $2, verified_at = NOW(), status = $3
       WHERE test_request_id = $4`,
      [verifierId, verifierName, newStatus, requestId]
    );

    await pool.query(`UPDATE test_requests SET status = $1 WHERE id = $2`, [newStatus, requestId]);

    res.json({ success: true, message: `Results ${newStatus.toLowerCase()}` });
  } catch (err) {
    console.error("❌ verifyResults:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

/* =============================================================
 * UPDATE REQUEST STATUS
 * ============================================================= */
async function updateTestRequestStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "Status is required" });

  try {
    await pool.query(`UPDATE test_requests SET status = $1 WHERE id = $2`, [status, id]);
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    console.error("❌ updateTestRequestStatus:", err.message);
    res.status(500).json({ message: "Server error updating status" });
  }
}

/* =============================================================
 * PROCESS PAYMENT
 * ============================================================= */
async function processPayment(req, res) {
  const { id } = req.params;
  const { amount, paymentMethod } = req.body;

  if (!amount || !paymentMethod)
    return res.status(400).json({ message: "Amount and payment method required" });

  try {
    await pool.query(
      `UPDATE test_requests
       SET payment_status = 'Paid',
           payment_amount = $1,
           payment_method = $2,
           payment_date   = NOW(),
           status         = 'Pending'
       WHERE id = $3`,
      [amount, paymentMethod, id]
    );

    res.json({ success: true, message: "✅ Payment processed", status: "Pending" });
  } catch (err) {
    console.error("❌ processPayment:", err.message);
    res.status(500).json({ message: "Server error processing payment" });
  }
}

/* =============================================================
 * EXPORTS
 * ============================================================= */
module.exports = {
  getAllTestRequests,
  createTestRequest,
  getTestRequestById,
  getTestRequestsByPatientId,
  getResultEntry,
  saveResultEntry,
  verifyResults,
  updateTestRequestStatus,
  processPayment,
};
