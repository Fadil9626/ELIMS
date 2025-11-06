// ============================================================
// 🧠 Pathologist Controller (Final Complete Version)
// ============================================================

const pool = require("../config/database");
const { emitToDepartment } = require("../utils/socketEmitter");

// ------------------------------------------------------------
// 🧮 Helper: Reference details (range / qualitative)
// ------------------------------------------------------------
async function getRefDetails(client, analyteId, value) {
  let ref_text = null;
  let type = "quantitative";
  let qualitative_values = [];
  let flag = null;

  const { rows } = await client.query(
    `SELECT range_type, min_value, max_value, qualitative_value, symbol_operator
     FROM normal_ranges
     WHERE analyte_id = $1
     ORDER BY id`,
    [analyteId]
  );

  if (rows.length) {
    const r = rows[0];
    type = (r.range_type || "").toLowerCase().includes("num")
      ? "quantitative"
      : "qualitative";

    if (type === "quantitative") {
      if (r.min_value != null && r.max_value != null)
        ref_text = `${r.min_value} – ${r.max_value}`;
      else if (r.min_value != null) ref_text = `≥ ${r.min_value}`;
      else if (r.max_value != null) ref_text = `≤ ${r.max_value}`;
      else if (r.symbol_operator && r.max_value != null)
        ref_text = `${r.symbol_operator} ${r.max_value}`;

      const numVal = parseFloat(value);
      if (!Number.isNaN(numVal)) {
        if (r.min_value != null && numVal < r.min_value) flag = "L";
        else if (r.max_value != null && numVal > r.max_value) flag = "H";
        else flag = "N";
      }
    } else {
      const allQualValues = rows
        .map((row) => row.qualitative_value)
        .filter(Boolean)
        .flatMap((v) => v.split(/[;,/]/).map((x) => x.trim()))
        .filter(Boolean);

      qualitative_values = [...new Set(allQualValues)];
      ref_text = qualitative_values.join(" / ") || "—";

      if (value != null && value !== "") {
        const v = String(value).toLowerCase();
        const expected = qualitative_values.map((x) => x.toLowerCase());
        flag = expected.includes(v) ? "N" : "A";
      }
    }
  }

  // fallback to test_catalog if no normal_range data
  if (!qualitative_values.length) {
    const { rows: tcRows } = await client.query(
      `SELECT qualitative_value FROM test_catalog WHERE id = $1`,
      [analyteId]
    );
    if (tcRows.length) {
      const qv = tcRows[0].qualitative_value || [];
      if (Array.isArray(qv) && qv.length) {
        qualitative_values = qv;
        if (!ref_text) ref_text = qv.join(" / ");
      }
      if (type === "qualitative" && value && !flag) {
        const v = String(value).toLowerCase();
        const expected = qualitative_values.map((x) => String(x).toLowerCase());
        flag = expected.includes(v) ? "N" : "A";
      }
    }
  }

  return { ref_text, type, qualitative_values, flag };
}

// ============================================================
// 📋 Worklist
// ============================================================
const getPathologistWorklist = async (req, res) => {
  const { from, to, status, search } = req.query;
  const { role_id, department } = req.user || {};

  try {
    const where = [];
    const params = [];
    let i = 1;

    if (role_id === 3 && department) {
      where.push(`d.name = $${i++}`);
      params.push(department);
    }

    where.push(`COALESCE(tc.is_panel, FALSE) = FALSE`);

    if (status) {
      where.push(`(tr.status ILIKE $${i} OR tri.status ILIKE $${i})`);
      params.push(`%${status}%`);
      i++;
    }
    if (from) {
      where.push(`tr.created_at >= $${i++}`);
      params.push(from);
    }
    if (to) {
      where.push(`tr.created_at <= $${i++}`);
      params.push(to);
    }
    if (search) {
      where.push(
        `(p.first_name ILIKE $${i} OR p.last_name ILIKE $${i} OR p.lab_id ILIKE $${i})`
      );
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        tr.id AS request_id,
        tr.created_at AS date_ordered,
        p.lab_id,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        tc.name AS test_name,
        tri.id AS test_item_id,
        tri.status AS item_status,
        tr.status AS test_status,
        COALESCE(d.name, 'N/A') AS department_name,
        tri.updated_at
      FROM test_requests tr
      JOIN patients p ON tr.patient_id = p.id
      JOIN test_request_items tri ON tr.id = tri.test_request_id
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      ${whereClause}
      ORDER BY tr.created_at DESC;
    `;

    const { rows } = await pool.query(sql, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error fetching worklist:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// ============================================================
// 📄 Build Result Template
// ============================================================
const getResultTemplate = async (req, res) => {
  const { requestId } = req.params;
  const client = await pool.connect();

  try {
    const { rows: allItems } = await client.query(
      `SELECT tri.id AS request_item_id, tri.test_catalog_id AS test_id, tc.name AS test_name,
              tc.is_panel, tc.department_id, d.name AS department_name, tri.result_value, tri.status
       FROM test_request_items tri
       JOIN test_catalog tc ON tc.id = tri.test_catalog_id
       LEFT JOIN departments d ON tc.department_id = d.id
       WHERE tri.test_request_id = $1
       ORDER BY tc.is_panel DESC, tri.id`,
      [requestId]
    );

    const panelItems = allItems.filter((i) => i.is_panel);
    const standaloneItems = allItems.filter((i) => !i.is_panel);
    const panelAnalyteIds = new Set();
    const outputItems = [];

    for (const item of panelItems) {
      const base = {
        ...item,
        analytes: [],
        type: "quantitative",
        qualitative_values: [],
        ref_range: null,
        flag: null,
      };

      const { rows: analytes } = await client.query(
        `SELECT tpa.analyte_id AS test_id, a.name AS test_name, u.symbol AS unit_symbol,
                tri_a.id AS request_item_id, tri_a.result_value, tri_a.status
         FROM test_panel_analytes tpa
         JOIN test_catalog a ON a.id = tpa.analyte_id
         LEFT JOIN units u ON u.id = a.unit_id
         LEFT JOIN test_request_items tri_a
            ON tri_a.parent_id = $2 AND tri_a.test_catalog_id = tpa.analyte_id
         WHERE tpa.panel_id = $1
         ORDER BY a.name`,
        [item.test_id, item.request_item_id]
      );

      for (const a of analytes) {
        panelAnalyteIds.add(a.test_id);
        const ref = await getRefDetails(client, a.test_id, a.result_value);
        base.analytes.push({
          ...a,
          ref_range: ref.ref_text,
          type: ref.type,
          qualitative_values: ref.qualitative_values,
          flag: ref.flag,
        });
      }
      outputItems.push(base);
    }

    const remainingItems = standaloneItems.filter(
      (i) => !panelAnalyteIds.has(i.test_id)
    );

    for (const item of remainingItems) {
      const { rows: u } = await client.query(
        `SELECT u.symbol FROM test_catalog t LEFT JOIN units u ON u.id = t.unit_id WHERE t.id = $1`,
        [item.test_id]
      );
      const ref = await getRefDetails(client, item.test_id, item.result_value);
      outputItems.push({
        ...item,
        unit_symbol: u[0]?.symbol || null,
        ref_range: ref.ref_text,
        type: ref.type,
        qualitative_values: ref.qualitative_values,
        flag: ref.flag,
        analytes: [],
      });
    }

    res.json({ request_id: Number(requestId), items: outputItems });
  } catch (e) {
    console.error("❌ getResultTemplate error:", e.message);
    res.status(500).json({ message: "Failed to build result template" });
  } finally {
    client.release();
  }
};

// ============================================================
// 🧪 Submit Result (Fixed SQL Syntax + JSONB Safe)
// ============================================================
const submitResult = async (req, res) => {
  const { itemId: testItemId } = req.params;
  const { result } = req.body;
  const { id: userId, full_name, role_id, department } = req.user || {};

  if (!result || String(result).trim() === "")
    return res.status(400).json({ message: "Result data is required." });

  const cleanResult = String(result).trim();
  const newResultJson = JSON.stringify({ value: cleanResult });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT tri.test_request_id, tri.result_value, d.name AS department_name
       FROM test_request_items tri
       JOIN test_catalog tc ON tri.test_catalog_id = tc.id
       LEFT JOIN departments d ON tc.department_id = d.id
       WHERE tri.id = $1`,
      [testItemId]
    );

    if (!rows.length) throw new Error("Test not found.");

    const { test_request_id, result_value, department_name } = rows[0];
    if (role_id === 3 && department && department !== department_name)
      throw new Error("Unauthorized for this department.");

    const oldJson = JSON.stringify({ value: result_value ?? null });

    await client.query(
      `UPDATE test_request_items
       SET result_value = $1,
           result_data  = $2::jsonb,
           status       = 'Completed',
           updated_at   = NOW()
       WHERE id = $3`,
      [cleanResult, newResultJson, testItemId]
    );

    await client.query(
      `INSERT INTO result_audit_logs
         (test_item_id, old_result, new_result, changed_by, changed_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW())`,
      [testItemId, oldJson, newResultJson, userId]
    );

    await client.query("COMMIT");

    emitToDepartment(req, department_name, "result_saved", {
      event: "result_saved",
      request_id: test_request_id,
      test_item_id: testItemId,
      department: department_name,
      updated_by: full_name,
      timestamp: new Date().toISOString(),
      message: `${full_name} saved a result.`,
    });

    res.status(200).json({ message: "✅ Result saved successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error submitting result:", error.message);
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// ✅ Remaining Core Functions
// ============================================================

// verify
const verifyResult = async (req, res) => {
  const { itemId: id } = req.params;
  const { full_name, department } = req.user || {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT result_value, test_request_id FROM test_request_items WHERE id = $1`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Test not found" });

    if (!rows[0].result_value)
      return res
        .status(400)
        .json({ message: "Cannot verify: missing result value." });

    const testRequestId = rows[0].test_request_id;

    await client.query(
      `UPDATE test_request_items
       SET status = 'Verified', verified_name = $1, verified_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [full_name, id]
    );

    const { rows: check } = await client.query(
      `SELECT COUNT(*) FILTER (WHERE status <> 'Verified') AS unverified
       FROM test_request_items WHERE test_request_id = $1`,
      [testRequestId]
    );

    if (parseInt(check[0].unverified) === 0) {
      await client.query(
        `UPDATE test_requests SET status = 'Completed', updated_at = NOW() WHERE id = $1`,
        [testRequestId]
      );
    }

    await client.query("COMMIT");

    emitToDepartment(req, department, "result_verified", {
      event: "result_verified",
      test_item_id: id,
      request_id: testRequestId,
      verified_by: full_name,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ message: "✅ Result verified." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Verify error:", error.message);
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

// reopen
const reopenResult = async (req, res) => {
  const { itemId: id } = req.params;
  const { department, full_name } = req.user || {};

  try {
    const { rows } = await pool.query(
      `UPDATE test_request_items
       SET status = 'Reopened', verified_name = NULL, verified_at = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Item not found" });

    emitToDepartment(req, department, "test_reopened", {
      event: "test_reopened",
      test_item_id: id,
      request_id: rows[0].test_request_id,
      department,
      reopened_by: full_name,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ message: "🔓 Item reopened.", item: rows[0] });
  } catch (e) {
    console.error("❌ Reopen error:", e.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// mark for review
const markResultForReview = async (req, res) => {
  const { itemId: id } = req.params;
  const { full_name, department } = req.user || {};

  try {
    const { rows } = await pool.query(
      `UPDATE test_request_items
       SET status = 'Under Review', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [full_name, id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Test not found" });

    emitToDepartment(req, department, "result_reviewed", {
      event: "result_reviewed",
      test_item_id: id,
      request_id: rows[0].test_request_id,
      department,
      reviewed_by: full_name,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ message: "✅ Result marked Under Review." });
  } catch (e) {
    console.error("❌ Review error:", e.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// release report
const releaseReport = async (req, res) => {
  const { requestId } = req.params;
  const { department } = req.user || {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rowCount } = await client.query(
      `SELECT 1 FROM test_requests WHERE id = $1`,
      [requestId]
    );
    if (!rowCount)
      return res.status(404).json({ message: "Request not found" });

    await client.query(
      `UPDATE test_request_items
       SET status = 'Released', updated_at = NOW()
       WHERE test_request_id = $1 AND status IN ('Completed','Verified','Under Review')`,
      [requestId]
    );

    await client.query(
      `UPDATE test_requests SET status = 'Released', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );

    await client.query("COMMIT");

    emitToDepartment(req, department, "report_released", {
      event: "report_released",
      request_id: requestId,
      department,
      timestamp: new Date().toISOString(),
      message: "Report released.",
    });

    res.status(200).json({ message: "✅ Report released." });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Release error:", e.message);
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

// status counts
const getStatusCounts = async (req, res) => {
  const { role_id, department } = req.user || {};
  const isPathologist = role_id === 3 && department;

  try {
    const where = [];
    const params = [];
    if (isPathologist) {
      where.push("d.name = $1");
      params.push(department);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT tri.status, COUNT(tri.id) AS count
      FROM test_request_items tri
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      ${clause}
      GROUP BY tri.status
    `;

    const { rows } = await pool.query(sql, params);
    const counts = {};
    rows.forEach((r) => (counts[r.status.toLowerCase()] = parseInt(r.count)));

    res.status(200).json(counts);
  } catch (e) {
    console.error("❌ Status count error:", e.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// result history
const getResultHistory = async (req, res) => {
  const { itemId: id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT ral.old_result, ral.new_result, ral.changed_at, u.full_name AS changed_by
       FROM result_audit_logs ral
       LEFT JOIN users u ON ral.changed_by = u.id
       WHERE ral.test_item_id = $1
       ORDER BY ral.changed_at DESC`,
      [id]
    );
    res.status(200).json(rows);
  } catch (e) {
    console.error("❌ History error:", e.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// analyzer results
const getAnalyzerResults = async (req, res) => {
  try {
    const id = parseInt(req.params.itemId, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ message: "Invalid testItemId" });

    const { rows } = await pool.query(
      `SELECT test_item_id, instrument, sample_id, results, analyzer_meta, updated_at
       FROM test_item_results WHERE test_item_id = $1`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "No analyzer results" });
    res.json(rows[0]);
  } catch (e) {
    console.error("❌ Analyzer error:", e.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// update item status
const updateRequestItemStatus = async (req, res) => {
  const { itemId } = req.params;
  const { status } = req.body;
  const { full_name, department } = req.user || {};

  if (!status)
    return res.status(400).json({ message: "Status is required." });

  try {
    const { rows } = await pool.query(
      `UPDATE test_request_items
       SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING test_request_id, id`,
      [status, itemId]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Item not found" });

    emitToDepartment(req, department, "status_updated", {
      event: "item_status_updated",
      test_item_id: rows[0].id,
      request_id: rows[0].test_request_id,
      department,
      updated_by: full_name,
      new_status: status,
    });

    res.status(200).json({ message: `✅ Status updated to ${status}.` });
  } catch (e) {
    console.error("❌ Status update error:", e.message);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getPathologistWorklist,
  getResultTemplate,
  submitResult,
  verifyResult,
  reopenResult,
  markResultForReview,
  releaseReport,
  getStatusCounts,
  getResultHistory,
  getAnalyzerResults,
  updateRequestItemStatus,
};
