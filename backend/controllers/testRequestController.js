const pool = require("../config/database");

/* =============================================================
 * 🔍 Helper Functions
 * ============================================================= */

/** Get reference range text (by age & gender) */
async function getSmartRefRange(client, analyteId, gender = null, ageYears = null) {
  if (!analyteId) return null;

  const g =
    gender?.toLowerCase().startsWith("m")
      ? "male"
      : gender?.toLowerCase().startsWith("f")
      ? "female"
      : null;

  const { rows } = await client.query(
    `
    SELECT range_type, min_value, max_value, qualitative_value, symbol_operator, range_label
    FROM normal_ranges
    WHERE (analyte_id = $1 OR test_catalog_id = $1)
      AND (gender IS NULL OR LOWER(gender) = $2)
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

  if (r.range_type?.toLowerCase() === "numeric") {
    if (r.min_value != null && r.max_value != null)
      text = `${r.min_value} – ${r.max_value}`;
    else if (r.min_value != null) text = `≥ ${r.min_value}`;
    else if (r.max_value != null) text = `≤ ${r.max_value}`;
  } else if (r.qualitative_value) {
    text = r.qualitative_value;
  } else if (r.symbol_operator && r.max_value != null) {
    text = `${r.symbol_operator} ${r.max_value}`;
  }

  if (r.range_label) text = text ? `${text} (${r.range_label})` : r.range_label;
  return text;
}

/** Write to audit log */
async function logAudit(client, userId, userName, action, entityType, entityId, description) {
  try {
    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, description, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW());`,
      [userId, userName, action, entityType, entityId, description]
    );
  } catch (err) {
    console.warn("⚠️ audit log failed:", err.message);
  }
}

/* =============================================================
 * @desc    Get all test requests
 * ============================================================= */
async function getAllTestRequests(req, res) {
  try {
    const { rowCount: hasWard } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='test_requests' AND column_name='ward_id';
    `);

    const sql = `
      SELECT
        tr.id, tr.status, tr.payment_status, tr.payment_amount,
        tr.payment_method, tr.created_at,
        p.id AS patient_id, CONCAT(p.first_name,' ',p.last_name) AS patient_name,
        DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age
        ${hasWard ? ", w.name AS ward_name" : ""}
      FROM test_requests tr
      LEFT JOIN patients p ON tr.patient_id = p.id
      ${hasWard ? "LEFT JOIN wards w ON tr.ward_id = w.id" : ""}
      ORDER BY tr.id DESC;
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("❌ getAllTestRequests:", err.message);
    res.status(500).json({ message: "Server error fetching test requests" });
  }
}

/* =============================================================
 * @desc    Create new test request (panels + analytes)
 * ============================================================= */
async function createTestRequest(req, res) {
  const { patientId, testIds, tests, panels, selectedTests, selectedPanels } = req.body;
  const userId = req.user?.id || null;
  const userName = req.user?.full_name || "System";

  const allIds = [
    ...(Array.isArray(testIds) ? testIds : []),
    ...(Array.isArray(tests) ? tests : []),
    ...(Array.isArray(panels) ? panels : []),
    ...(Array.isArray(selectedTests) ? selectedTests : []),
    ...(Array.isArray(selectedPanels) ? selectedPanels : []),
  ]
    .map(Number)
    .filter(Boolean);

  if (!patientId || allIds.length === 0)
    return res
      .status(400)
      .json({ message: "At least one test or panel must be selected" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create header
    const { rows: hdr } = await client.query(
      `INSERT INTO test_requests (patient_id, status, payment_status, created_by)
       VALUES ($1,'Awaiting Payment','Unpaid',$2) RETURNING id;`,
      [patientId, userId]
    );
    const requestId = hdr[0].id;

    // Get test metadata
    const { rows: catalogTests } = await client.query(
      `SELECT id, name, is_panel, COALESCE(price,0) AS price FROM test_catalog WHERE id = ANY($1::int[])`,
      [allIds]
    );

    let totalCost = 0;

    // Insert top-level items
    for (const t of catalogTests) {
      totalCost += Number(t.price) || 0;
      await client.query(
        `INSERT INTO test_request_items (test_request_id, test_catalog_id, status)
         VALUES ($1,$2,'Pending');`,
        [requestId, t.id]
      );
    }

    // Expand panels
    const { rows: foundPanels } = await client.query(
      `SELECT tri.id AS parent_item_id, tri.test_catalog_id AS panel_id
       FROM test_request_items tri
       JOIN test_catalog tc ON tc.id = tri.test_catalog_id
       WHERE tc.is_panel = true AND tri.test_request_id = $1;`,
      [requestId]
    );

    for (const p of foundPanels) {
      const { rows: analytes } = await client.query(
        `SELECT tc.id AS analyte_id, COALESCE(tc.price,0) AS price
         FROM test_panel_analytes tpa
         JOIN test_catalog tc ON tc.id = tpa.analyte_id
         WHERE tpa.panel_id = $1;`,
        [p.panel_id]
      );

      for (const a of analytes) {
        totalCost += Number(a.price) || 0;
        await client.query(
          `INSERT INTO test_request_items (test_request_id, test_catalog_id, parent_id, status)
           VALUES ($1,$2,$3,'Pending');`,
          [requestId, a.analyte_id, p.parent_item_id]
        );
      }
    }

    // Update total cost
    await client.query(
      `UPDATE test_requests SET payment_amount=$1 WHERE id=$2;`,
      [totalCost, requestId]
    );

    await logAudit(
      client,
      userId,
      userName,
      "CREATE",
      "TestRequest",
      requestId,
      `Created test request (${allIds.length} items, total $${totalCost})`
    );

    await client.query("COMMIT");
    res.status(201).json({
      success: true,
      message: "✅ Test request created successfully",
      request_id: requestId,
      total: totalCost,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ createTestRequest:", err.message);
    res.status(500).json({ message: "Server error creating test request" });
  } finally {
    client.release();
  }
}

/* =============================================================
 * @desc    Get single test request (header + items)
 * ============================================================= */
async function getTestRequestById(req, res) {
  const { id } = req.params;
  try {
    const header = await pool.query(
      `SELECT tr.*, p.first_name, p.last_name, p.gender, p.date_of_birth
       FROM test_requests tr
       LEFT JOIN patients p ON tr.patient_id=p.id
       WHERE tr.id=$1;`,
      [id]
    );

    if (!header.rows.length)
      return res.status(404).json({ message: "Test request not found" });

    const items = await pool.query(
      `SELECT tri.id AS item_id, tc.id AS test_id, tc.name AS test_name,
              d.name AS department, COALESCE(tc.price,0) AS price
       FROM test_request_items tri
       LEFT JOIN test_catalog tc ON tri.test_catalog_id=tc.id
       LEFT JOIN departments d ON tc.department_id=d.id
       WHERE tri.test_request_id=$1
       ORDER BY tri.id;`,
      [id]
    );

    res.json({ ...header.rows[0], items: items.rows });
  } catch (err) {
    console.error("❌ getTestRequestById:", err.message);
    res.status(500).json({ message: "Server error fetching test request" });
  }
}

/* =============================================================
 * @desc    Get result entry template (expand panels)
 * ============================================================= */
async function getResultEntry(req, res) {
  const requestId = parseInt(req.params.id, 10);
  if (isNaN(requestId))
    return res.status(400).json({ message: "Invalid request ID" });

  const client = await pool.connect();
  try {
    const { rows: hdr } = await client.query(
      `SELECT p.gender, DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age_years
       FROM test_requests tr
       JOIN patients p ON tr.patient_id = p.id
       WHERE tr.id = $1;`,
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
       ORDER BY tri.parent_id NULLS FIRST, tc.name;`,
      [requestId]
    );

    if (!items.length)
      return res.status(404).json({ message: "No tests found for this request" });

    const panels = {};
    const general = [];

    for (const item of items) {
      if (item.is_panel && !item.parent_id)
        panels[item.request_item_id] = { ...item, analytes: [] };
    }

    for (const item of items) {
      const ref = await getSmartRefRange(client, item.test_id, gender, ageYears);
      if (item.parent_id && panels[item.parent_id]) {
        panels[item.parent_id].analytes.push({ ...item, ref_range: ref });
      } else if (!item.is_panel && !item.parent_id) {
        general.push({ ...item, ref_range: ref, analytes: [] });
      }
    }

    const finalItems = [...general, ...Object.values(panels)];
    res.json({ request_id: requestId, items: finalItems });
  } catch (err) {
    console.error("❌ getResultEntry:", err.message);
    res.status(500).json({ message: "Server error loading result entry data" });
  } finally {
    client.release();
  }
}

/* =============================================================
 * Remaining CRUD functions
 * ============================================================= */
async function saveResultEntry(req, res) {
  const requestId = parseInt(req.params.id, 10);
  const { results } = req.body;
  const userId = req.user?.id;
  const userName = req.user?.full_name || "System";

  if (!Array.isArray(results) || !results.length)
    return res.status(400).json({ message: "Results array required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const r of results) {
      if (!r.request_item_id || r.value === null || r.value === undefined) continue;
      await client.query(
        `UPDATE test_request_items
         SET result_value=$1, status='Completed',
             entered_by=$2, entered_at=NOW(), reviewed_by=COALESCE(reviewed_by,$3)
         WHERE id=$4 AND test_request_id=$5;`,
        [r.value, userId || null, userName, r.request_item_id, requestId]
      );
    }

    await client.query(`UPDATE test_requests SET status='Completed' WHERE id=$1;`, [requestId]);
    await logAudit(client, userId, userName, "UPDATE", "TestRequest", requestId, "Saved lab results");
    await client.query("COMMIT");
    res.json({ message: "✅ Results saved successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ saveResultEntry:", err.message);
    res.status(500).json({ message: "Server error saving results" });
  } finally {
    client.release();
  }
}

async function verifyResults(req, res) {
  const requestId = parseInt(req.params.id, 10);
  const { action } = req.body;
  const verifierId = req.user?.id;
  const verifierName = req.user?.full_name || "Verifier";

  if (!["verify", "reject"].includes(action))
    return res.status(400).json({ message: "Invalid action" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const newStatus = action === "verify" ? "Verified" : "Rejected";

    await client.query(
      `UPDATE test_request_items
       SET verified_by=$1, verified_name=$2, verified_at=NOW(), status=$3
       WHERE test_request_id=$4;`,
      [verifierId, verifierName, newStatus, requestId]
    );

    await client.query(`UPDATE test_requests SET status=$1 WHERE id=$2;`, [newStatus, requestId]);
    await logAudit(client, verifierId, verifierName, newStatus, "TestRequest", requestId, `Results ${newStatus.toLowerCase()}`);
    await client.query("COMMIT");
    res.json({ success: true, message: `Results ${newStatus.toLowerCase()}` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ verifyResults:", err.message);
    res.status(500).json({ message: "Server error verifying results" });
  } finally {
    client.release();
  }
}

async function updateTestRequestStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: "Status is required" });

  try {
    const { rows } = await pool.query(
      "SELECT id, payment_status FROM test_requests WHERE id=$1;",
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    const { payment_status } = rows[0];
    await pool.query("UPDATE test_requests SET status=$1 WHERE id=$2;", [status, id]);
    res.json({ success: true, message: `Status updated to ${status}`, payment_status });
  } catch (err) {
    console.error("❌ updateTestRequestStatus:", err.message);
    res.status(500).json({ message: "Server error updating status" });
  }
}

async function processPayment(req, res) {
  const { id } = req.params;
  const { amount, paymentMethod } = req.body;
  if (!amount || !paymentMethod)
    return res.status(400).json({ message: "Amount and payment method required" });

  try {
    const { rows } = await pool.query("SELECT payment_status FROM test_requests WHERE id=$1;", [id]);
    if (!rows.length) return res.status(404).json({ message: "Test request not found" });
    if (rows[0].payment_status === "Paid")
      return res.status(400).json({ message: "Already marked as paid" });

    await pool.query(
      `UPDATE test_requests
       SET payment_status='Paid', payment_amount=$1, payment_method=$2,
           payment_date=NOW(), status='Awaiting Sample Collection'
       WHERE id=$3;`,
      [amount, paymentMethod, id]
    );

    res.json({
      success: true,
      message: "✅ Payment processed successfully",
      status: "Awaiting Sample Collection",
    });
  } catch (err) {
    console.error("❌ processPayment:", err.message);
    res.status(500).json({ message: "Server error processing payment" });
  }
}

/* =============================================================
 * ✅ EXPORTS
 * ============================================================= */
module.exports = {
  getAllTestRequests,
  createTestRequest,
  getTestRequestById,
  getResultEntry,
  saveResultEntry,
  verifyResults,
  updateTestRequestStatus,
  processPayment,
};
