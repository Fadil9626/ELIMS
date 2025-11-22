const pool = require("../config/database");

/* =============================================================
 * 🛠️ HELPER FUNCTIONS
 * ============================================================= */

// 1. Resolve Department Name
async function resolveDeptName(deptInput) {
  if (!deptInput) return null;
  if (typeof deptInput === "string" && isNaN(parseInt(deptInput))) {
    return deptInput.trim();
  }
  try {
    const { rows } = await pool.query(
      "SELECT name FROM departments WHERE id = $1",
      [deptInput]
    );
    return rows.length > 0 ? rows[0].name.trim() : null;
  } catch (e) {
    return null;
  }
}

// 2. Calculate Age
function getAgeInYears(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : 0;
}

// 3. Smart Reference Range Logic
async function getSmartRefDetails(
  client,
  analyteId,
  resultValue,
  gender = null,
  ageYears = null
) {
  if (!analyteId) return { text: null, flag: null };

  const g =
    gender && typeof gender === "string"
      ? gender.toLowerCase().startsWith("m")
        ? "male"
        : gender.toLowerCase().startsWith("f")
        ? "female"
        : null
      : null;

  const { rows } = await client.query(
    `SELECT range_type,
            min_value,
            max_value,
            qualitative_value,
            symbol_operator,
            reference_range_text
     FROM normal_ranges
     WHERE analyte_id = $1
       AND ($2::text IS NULL OR LOWER(gender::text) = $2::text OR gender::text = 'Any')
       AND (min_age IS NULL OR $3::int >= min_age)
       AND (max_age IS NULL OR $3::int <= max_age)
     ORDER BY CASE WHEN gender::text = 'Any' THEN 1 ELSE 0 END,
              id ASC
     LIMIT 1`,
    [analyteId, g, ageYears]
  );

  if (!rows.length) return { text: null, flag: null };
  const r = rows[0];
  let text = null;
  let flag = null;

  const rt = (r.range_type || "").toLowerCase();
  if (rt === "numeric") {
    if (r.min_value != null && r.max_value != null) {
      text = `${r.min_value} – ${r.max_value}`;
    } else if (r.min_value != null) {
      text = `≥ ${r.min_value}`;
    } else if (r.max_value != null) {
      text = `≤ ${r.max_value}`;
    }
  }
  if (!text && r.qualitative_value) text = r.qualitative_value;
  if (!text && r.symbol_operator && r.max_value != null) {
    text = `${r.symbol_operator} ${r.max_value}`;
  }
  if (r.reference_range_text) {
    text = text
      ? `${text} (${r.reference_range_text})`
      : r.reference_range_text;
  }

  if (
    resultValue !== null &&
    resultValue !== undefined &&
    resultValue !== ""
  ) {
    if (rt === "numeric") {
      const num = parseFloat(resultValue);
      if (!isNaN(num)) {
        if (r.min_value != null && num < r.min_value) flag = "L";
        else if (r.max_value != null && num > r.max_value) flag = "H";
      }
    } else {
      if (r.qualitative_value) {
        const cleanRes = String(resultValue).toLowerCase().trim();
        const cleanRef = String(r.qualitative_value).toLowerCase().trim();
        if (cleanRes !== cleanRef && cleanRef !== "any") flag = "A";
      }
    }
  }
  return { text, flag };
}

/* =============================================================
 * 📋 REQUEST LISTING FUNCTIONS
 * ============================================================= */

// GET ALL TEST REQUESTS
async function getAllTestRequests(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        tr.id,
        tr.status,
        tr.payment_status,
        tr.payment_amount,
        tr.payment_method,
        tr.created_at,
        tr.priority,
        p.id AS patient_id,
        CONCAT(p.first_name,' ',p.last_name) AS patient_name,
        DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age
      FROM test_requests tr
      LEFT JOIN patients p ON tr.patient_id = p.id
      ORDER BY tr.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ getAllTestRequests:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// GET POPULAR TESTS
async function getPopularTests(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT 
        tc.id, 
        tc.name, 
        COALESCE(tc.price, 0) as price, 
        COALESCE(tc.is_panel, false) as is_panel, 
        d.name as department_name, 
        COUNT(tri.id) as usage_count
      FROM test_catalog tc
      LEFT JOIN test_request_items tri ON tc.id = tri.test_catalog_id
      LEFT JOIN departments d ON tc.department_id = d.id
      GROUP BY tc.id, tc.name, tc.price, tc.is_panel, d.name
      ORDER BY usage_count DESC, tc.name ASC
      LIMIT 8
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ getPopularTests:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// GET REQUESTS BY PATIENT
async function getTestRequestsByPatientId(req, res) {
  const patientId = parseInt(req.params.id || req.params.patientId, 10);
  if (isNaN(patientId))
    return res.status(400).json({ message: "Invalid Patient ID" });
  try {
    const { rows } = await pool.query(
      `SELECT
          tr.id,
          tr.status,
          tr.payment_status,
          tr.priority,
          tr.created_at,
          COALESCE(
            (
              SELECT STRING_AGG(tc.name, ', ')
              FROM test_request_items tri
              JOIN test_catalog tc ON tri.test_catalog_id = tc.id
              WHERE tri.test_request_id = tr.id
                AND tri.parent_id IS NULL
            ),
            ''
          ) AS ordered_tests,
          COALESCE(p.first_name, 'Unknown') AS patient_first_name,
          COALESCE(p.last_name, 'Patient') AS patient_last_name,
          DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age
        FROM test_requests tr
        LEFT JOIN patients p ON tr.patient_id = p.id
        WHERE tr.patient_id = $1
        ORDER BY tr.created_at DESC`,
      [patientId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ getTestRequestsByPatientId:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

/* =============================================================
 * 🏥 ORDER MANAGEMENT (Create, Update, Delete)
 * ============================================================= */

// 🚀 CREATE TEST REQUEST (FIXED: NOW CREATES INVOICE)
async function createTestRequest(req, res) {
  const { patientId, testIds, priority } = req.body;
  const userId = req.user?.id || null;

  if (!patientId || !Array.isArray(testIds) || testIds.length === 0) {
    return res.status(400).json({ message: "Select tests" });
  }

  let dbPriority = "Routine";
  if (priority) {
    const p = String(priority).trim().toUpperCase();
    if (["URGENT", "STAT", "EMERG", "EMERGENCY"].includes(p)) {
      dbPriority = "URGENT";
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: pRows } = await client.query(
      `SELECT ward_id, referring_doctor FROM patients WHERE id = $1`,
      [patientId]
    );
    if (!pRows.length) throw new Error("Patient not found");

    // 1. Create Test Request Header
    const { rows: hdr } = await client.query(
      `INSERT INTO test_requests
          (patient_id, status, payment_status, created_by, ward_id, referring_doctor, priority)
        VALUES
          ($1, 'Pending', 'Unpaid', $2, $3, $4, $5)
        RETURNING id, priority`,
      [patientId, userId, pRows[0].ward_id, pRows[0].referring_doctor, dbPriority]
    );
    const requestId = hdr[0].id;

    // 2. Calculate Total Cost (Needed for Invoice)
    const { rows: catalogTests } = await client.query(
      `SELECT id, price FROM test_catalog WHERE id = ANY($1::int[])`,
      [testIds]
    );
    
    let totalCost = 0;
    for (const t of catalogTests) {
      totalCost += Number(t.price) || 0;
    }

    // 3. Insert Items (Using Helper)
    await insertRequestItems(client, requestId, testIds);

    // 4. [FIX] Create PENDING Invoice
    // This connects the request to the billing dashboard immediately
    await client.query(
      `INSERT INTO invoices (patient_id, amount, status, created_at)
       VALUES ($1, $2, 'pending', NOW())`,
      [patientId, totalCost]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "✅ Created",
      request_id: requestId,
      priority: dbPriority,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ createTestRequest:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

// UPDATE TEST REQUEST (Edit Order)
async function updateTestRequest(req, res) {
  const { id } = req.params;
  const { testIds, priority } = req.body;

  if (!Array.isArray(testIds) || testIds.length === 0) {
    return res.status(400).json({ message: "Select at least one test." });
  }

  let dbPriority = "Routine";
  if (priority) {
    const p = String(priority).trim().toUpperCase();
    if (["URGENT", "STAT", "EMERG", "EMERGENCY"].includes(p)) {
      dbPriority = "URGENT";
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check Status - Only allow editing if Pending or SampleReceived
    const { rows: check } = await client.query(
      `SELECT status FROM test_requests WHERE id = $1`,
      [id]
    );
    if (!check.length) throw new Error("Request not found");
    
    if (check[0].status !== "Pending" && check[0].status !== "SampleReceived") {
        throw new Error("Cannot edit request. Samples already processed or completed.");
    }

    // 2. Update Priority
    await client.query(
        `UPDATE test_requests SET priority = $1, updated_at = NOW() WHERE id = $2`,
        [dbPriority, id]
    );

    // 3. Clear existing items
    await client.query(`DELETE FROM test_request_items WHERE test_request_id = $1`, [id]);

    // 4. Re-insert items & Update Cost
    await insertRequestItems(client, id, testIds);

    // Note: To be fully consistent, we should also update the invoice amount here.
    // However, since invoices might be separate entities in some workflows, 
    // we assume the invoice logic handles updates or deletions separately in future features.

    await client.query("COMMIT");
    res.json({ success: true, message: "✅ Request updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ updateTestRequest:", err.message);
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    client.release();
  }
}

// DELETE TEST REQUEST (Cancel Order)
async function deleteTestRequest(req, res) {
    const { id } = req.params;
    try {
        const { rows: check } = await pool.query(
            `SELECT status FROM test_requests WHERE id = $1`,
            [id]
        );
        if (!check.length) return res.status(404).json({ message: "Not found" });

        if (check[0].status !== 'Pending' && check[0].status !== 'SampleReceived') {
            return res.status(400).json({ message: "Cannot delete. Processing has started or completed." });
        }

        await pool.query(`DELETE FROM test_requests WHERE id = $1`, [id]);
        // Note: You may want to delete the associated Pending invoice here as well.
        
        res.json({ success: true, message: "Request deleted successfully." });
    } catch (err) {
        console.error("❌ deleteTestRequest:", err.message);
        res.status(500).json({ message: "Server error" });
    }
}

// ⚙️ HELPER: Insert Items & Calculate Cost
async function insertRequestItems(client, requestId, testIds) {
    const { rows: catalogTests } = await client.query(
      `SELECT id, name, is_panel, COALESCE(price,0) AS price
       FROM test_catalog
       WHERE id = ANY($1::int[])`,
      [testIds]
    );

    let totalCost = 0;
    const panels = [];

    for (const t of catalogTests) {
      totalCost += Number(t.price) || 0;

      const { rows: ins } = await client.query(
        `INSERT INTO test_request_items
           (test_request_id, test_catalog_id, status)
         VALUES ($1,$2,'Pending')
         RETURNING id`,
        [requestId, t.id]
      );

      if (t.is_panel && ins.length) {
        panels.push({ parent_item_id: ins[0].id, panel_id: t.id });
      }
    }

    // Expand Panels
    for (const p of panels) {
      const { rows: analytes } = await client.query(
        `SELECT tc.id AS analyte_id
         FROM test_panel_analytes tpa
         JOIN test_catalog tc ON tc.id = tpa.analyte_id
         WHERE tpa.panel_id = $1`,
        [p.panel_id]
      );

      for (const a of analytes) {
        await client.query(
          `INSERT INTO test_request_items
             (test_request_id, test_catalog_id, parent_id, status)
           VALUES ($1,$2,$3,'Pending')`,
          [requestId, a.analyte_id, p.parent_item_id]
        );
      }
    }

    await client.query(
      `UPDATE test_requests SET payment_amount = $1 WHERE id = $2`,
      [totalCost, requestId]
    );
}

/* =============================================================
 * 🔎 REQUEST DETAILS
 * ============================================================= */

async function getTestRequestById(req, res) {
  const { id } = req.params;
  try {
    const header = await pool.query(
      `SELECT tr.*,
              p.first_name,
              p.last_name,
              p.gender,
              p.date_of_birth
       FROM test_requests tr
       LEFT JOIN patients p ON tr.patient_id = p.id
       WHERE tr.id = $1`,
      [id]
    );
    if (!header.rows.length)
      return res.status(404).json({ message: "Not found" });

    const items = await pool.query(
      `SELECT tri.id AS item_id,
              tri.parent_id,
              tc.id AS test_id,
              tc.name AS test_name,
              COALESCE(tc.is_panel, FALSE) AS is_panel,
              d.name AS department,
              COALESCE(tc.price,0) AS price
       FROM test_request_items tri
       LEFT JOIN test_catalog tc ON tri.test_catalog_id = tc.id
       LEFT JOIN departments d ON tc.department_id = d.id
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
 * 🔬 RESULT ENTRY & LAB WORKFLOW
 * ============================================================= */

async function getResultEntry(req, res) {
  const requestId = parseInt(req.params.id, 10);
  if (isNaN(requestId)) return res.status(400).json({ message: "Invalid ID" });

  const { department: userDeptId, permissions_map, full_name } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  console.log("🛡️ SECURITY AUDIT [getResultEntry]");
  console.log(`👤 User: ${full_name} (Dept ID: ${userDeptId})`);

  const client = await pool.connect();
  try {
    const { rows: hdr } = await client.query(
      `SELECT p.gender,
              DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age_years
       FROM test_requests tr
       JOIN patients p ON tr.patient_id = p.id
       WHERE tr.id = $1`,
      [requestId]
    );
    if (!hdr.length)
      return res.status(404).json({ message: "Request not found." });
    const { gender, age_years } = hdr[0];

    const params = [requestId];
    let deptFilterQuery = "";

    if (!isSuperAdmin) {
      if (!userDeptId) {
        return res
          .status(403)
          .json({ message: "Access denied: No department assigned." });
      }
      params.push(userDeptId);
      deptFilterQuery = ` AND tc.department_id = $${params.length} `;
    }

    const { rows: items } = await client.query(
      `SELECT tri.id AS request_item_id,
              tri.parent_id,
              tc.id AS test_id,
              tc.name AS test_name,
              COALESCE(tc.is_panel,false) AS is_panel,
              d.name AS department_name,
              u.symbol AS unit_symbol,
              tri.result_value,
              tri.status,
              tc.department_id
       FROM test_request_items tri
       JOIN test_catalog tc ON tc.id = tri.test_catalog_id
       LEFT JOIN departments d ON d.id = tc.department_id
       LEFT JOIN units u ON u.id = tc.unit_id
       WHERE tri.test_request_id = $1
       ${deptFilterQuery}
       ORDER BY tri.parent_id NULLS FIRST, tc.name`,
      params
    );

    if (!items.length) return res.json({ request_id: requestId, items: [] });

    const panels = {};
    const general = [];

    for (const item of items) {
      if (item.is_panel && !item.parent_id) {
        panels[item.request_item_id] = { ...item, analytes: [] };
      }
    }

    for (const item of items) {
      const details = await getSmartRefDetails(
        client,
        item.test_id,
        item.result_value,
        gender,
        age_years
      );
      item.ref_range = details.text;
      item.flag = details.flag;

      if (item.parent_id && panels[item.parent_id]) {
        panels[item.parent_id].analytes.push(item);
      } else if (!item.is_panel && !item.parent_id) {
        general.push(item);
      }
    }

    res.json({
      request_id: requestId,
      items: [...general, ...Object.values(panels)],
    });
  } catch (err) {
    console.error("❌ getResultEntry:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

async function saveResultEntry(req, res) {
  const requestId = parseInt(req.params.id, 10);
  const { results } = req.body;
  const { department: userDeptId, permissions_map, full_name } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  if (!Array.isArray(results) || !results.length)
    return res.status(400).json({ message: "Results required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (!isSuperAdmin) {
      if (!userDeptId)
        throw new Error("Permission denied: No department assigned.");

      const itemIds = results.map((r) => r.request_item_id);

      const { rows } = await client.query(
        `SELECT COUNT(tri.id)::int AS count
         FROM test_request_items tri
         JOIN test_catalog tc ON tri.test_catalog_id = tc.id
         WHERE tri.id = ANY($1::int[])
           AND tc.department_id = $2`,
        [itemIds, userDeptId]
      );

      if (rows[0].count !== itemIds.length)
        throw new Error(
          "Security violation: You are attempting to save results outside your department."
        );
    }

    for (const r of results) {
      await client.query(
        `UPDATE test_request_items
         SET result_value = $1,
             status = 'Completed',
             updated_at = NOW()
         WHERE id = $2
           AND test_request_id = $3`,
        [r.value, r.request_item_id, requestId]
      );
    }

    await client.query(
      `UPDATE test_requests
       SET status = 'Completed'
       WHERE id = $1
         AND (
           SELECT COUNT(*)
           FROM test_request_items
           WHERE test_request_id = $1
             AND status NOT IN ('Completed', 'Verified', 'Cancelled')
         ) = 0`,
      [requestId]
    );

    await client.query("COMMIT");
    res.json({ message: "✅ Results saved" });
  } catch (err) {
    await client.query("ROLLBACK");
    if (
      err.message.startsWith("Security violation") ||
      err.message.startsWith("Permission")
    ) {
      return res.status(403).json({ message: err.message });
    }
    console.error("❌ saveResultEntry:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

async function verifyResults(req, res) {
  const requestId = parseInt(req.params.id, 10);
  const { action } = req.body;
  const {
    id: userId,
    full_name: userName,
    department: userDeptId,
    permissions_map,
    role_name,
    roles,
  } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  const userRoles = (roles || []).map((r) => r.toLowerCase());
  if (role_name) userRoles.push(role_name.toLowerCase());
  const isSeniorStaff = userRoles.some(
    (r) =>
      r.includes("admin") ||
      r.includes("pathologist") ||
      r.includes("scientist") ||
      r.includes("hematologist")
  );

  if (!isSuperAdmin && !isSeniorStaff)
    return res.status(403).json({ message: "Permission denied" });

  if (!["verify", "reject"].includes(action))
    return res.status(400).json({ message: "Invalid action" });

  const newStatus = action === "verify" ? "Verified" : "Cancelled";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    let updateQuery;
    let queryParams;

    if (isSuperAdmin) {
      updateQuery = `
        UPDATE test_request_items
        SET verified_by = $1,
            verified_name = $2,
            verified_at = NOW(),
            status = $3
        WHERE test_request_id = $4
      `;
      queryParams = [userId, userName, newStatus, requestId];
    } else {
      if (!userDeptId) throw new Error("Department required.");

      updateQuery = `
        UPDATE test_request_items tri
        SET verified_by = $1,
            verified_name = $2,
            verified_at = NOW(),
            status = $3
        FROM test_catalog tc
        WHERE tri.test_catalog_id = tc.id
          AND tc.department_id = $5
          AND tri.test_request_id = $4
      `;
      queryParams = [userId, userName, newStatus, requestId, userDeptId];
    }

    const result = await client.query(updateQuery, queryParams);

    await client.query(
      `UPDATE test_requests
       SET status = $1
       WHERE id = $2
         AND (
           SELECT COUNT(*)
           FROM test_request_items
           WHERE test_request_id = $2
             AND status != $1
         ) = 0`,
      [newStatus, requestId]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: `Processed ${result.rowCount} items.` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ verifyResults:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

async function updateTestRequestStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: "Status required" });

  const { permissions_map, role_name, roles } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  if (["Released", "Verified"].includes(status)) {
    const userRoles = (roles || []).map((r) => r.toLowerCase());
    if (role_name) userRoles.push(role_name.toLowerCase());
    const isAuthorized =
      isSuperAdmin ||
      userRoles.some(
        (r) =>
          r.includes("admin") ||
          r.includes("pathologist") ||
          r.includes("scientist") ||
          r.includes("hematologist") ||
          r.includes("manager") ||
          r.includes("director")
      );
    if (!isAuthorized) {
      return res.status(403).json({
        message: `Permission denied: You cannot set status to ${status}.`,
      });
    }
  }

  try {
    await pool.query(`UPDATE test_requests SET status = $1 WHERE id = $2`, [
      status,
      id,
    ]);
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    console.error("❌ updateTestRequestStatus:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// 💰 PROCESS PAYMENT (FIXED: NOW UPDATES/CREATES INVOICE)
async function processPayment(req, res) {
  const { id } = req.params;
  const { amount, paymentMethod } = req.body;
  if (amount == null || !paymentMethod)
    return res.status(400).json({ message: "Missing data" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Get current details
    const cur = await client.query(
      `SELECT status, patient_id, payment_status FROM test_requests WHERE id = $1`,
      [id]
    );
    if (!cur.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Not found" });
    }

    const { status, patient_id, payment_status } = cur.rows[0];

    // Optional: Avoid double processing
    if (payment_status === 'Paid') {
       await client.query("ROLLBACK");
       return res.json({ success: true, status: status, message: "Already paid" });
    }

    const newStatus =
      status === "Pending"
        ? "SampleReceived"
        : status;

    // 2. Update Test Request
    await client.query(
      `UPDATE test_requests
       SET payment_status = 'Paid',
           payment_amount = $1,
           payment_method = $2,
           payment_date = NOW(),
           status = $4,
           updated_at = NOW()
       WHERE id = $3`,
      [amount, paymentMethod, id, newStatus]
    );

    // 3. [FIX] Upsert Invoice (Update Pending or Create Paid)
    // Try to find a pending invoice for this patient and same amount to update it
    const checkInvoice = await client.query(
      `UPDATE invoices 
       SET status = 'paid', created_at = NOW() 
       WHERE patient_id = $1 AND status = 'pending' AND amount = $2
       RETURNING id`,
       [patient_id, amount]
    );

    // If no matching pending invoice found, insert a fresh paid one
    if (checkInvoice.rowCount === 0) {
      await client.query(
        `INSERT INTO invoices (patient_id, amount, status, created_at)
         VALUES ($1, $2, 'paid', NOW())`,
        [patient_id, amount]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, status: newStatus });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ processPayment:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

module.exports = {
  getAllTestRequests,
  getPopularTests,
  createTestRequest,
  updateTestRequest,
  deleteTestRequest,
  getTestRequestsByPatientId,
  getTestRequestById,
  getResultEntry,
  saveResultEntry,
  verifyResults,
  updateTestRequestStatus,
  processPayment,
};