const pool = require("../config/database");
const { emitToDepartment } = require("../utils/socketEmitter"); 

// ------------------------------------------------------------
// 🔗 Department Clusters (The "Smart Combine" Logic)
// ------------------------------------------------------------
const DEPT_CLUSTERS = {
    "chemistry": ["chemistry", "clinical chemistry", "immunology", "chemical pathology"],
    "clinical chemistry": ["chemistry", "clinical chemistry", "immunology", "chemical pathology"],
    "immunology": ["chemistry", "clinical chemistry", "immunology", "chemical pathology"],
    "chemical pathology": ["chemistry", "clinical chemistry", "immunology", "chemical pathology"],
    "microbiology": ["microbiology", "serology", "virology", "parasitology"],
    "serology": ["microbiology", "serology", "virology"],
    "hematology": ["hematology", "haematology", "blood transfusion", "blood bank"],
    "haematology": ["hematology", "haematology", "blood transfusion", "blood bank"]
};

function getAccessScope(userDeptName) {
    if (!userDeptName) return [];
    const lower = userDeptName.toLowerCase().trim();
    if (DEPT_CLUSTERS[lower]) return DEPT_CLUSTERS[lower];
    for (const [key, cluster] of Object.entries(DEPT_CLUSTERS)) {
        if (lower.includes(key)) return cluster;
    }
    return [lower];
}

// ------------------------------------------------------------
// 🛠️ Helper: Resolve Department Name
// ------------------------------------------------------------
async function resolveDeptName(deptInput) {
  if (!deptInput) return null;
  if (typeof deptInput === 'string' && isNaN(parseInt(deptInput))) {
      return deptInput.trim();
  }
  try {
    const { rows } = await pool.query('SELECT name FROM departments WHERE id = $1', [deptInput]);
    return rows.length > 0 ? rows[0].name.trim() : null;
  } catch (e) {
    return null;
  }
}

// ------------------------------------------------------------
// 🧮 Helper: Smart Reference Details
// ------------------------------------------------------------
async function getSmartRefDetails(client, analyteId, resultValue, gender = null, ageYears = null) {
  if (!analyteId) return { text: null, flag: null };

  const g = gender && typeof gender === "string"
      ? gender.toLowerCase().startsWith("m") ? "male" : gender.toLowerCase().startsWith("f") ? "female" : null
      : null;

  const { rows } = await client.query(
    `SELECT range_type, min_value, max_value, qualitative_value, symbol_operator, reference_range_text
     FROM normal_ranges
     WHERE analyte_id = $1
       AND ($2::text IS NULL OR LOWER(gender::text) = $2::text OR gender::text = 'Any')
       AND (min_age IS NULL OR $3::int >= min_age)
       AND (max_age IS NULL OR $3::int <= max_age)
     ORDER BY CASE WHEN gender::text = 'Any' THEN 1 ELSE 0 END, id ASC
     LIMIT 1`,
    [analyteId, g, ageYears]
  );

  if (!rows.length) return { text: null, flag: null };
  const r = rows[0];
  let text = null, flag = null;

  const rt = (r.range_type || "").toLowerCase();
  if (rt === "numeric") {
    if (r.min_value != null && r.max_value != null) text = `${r.min_value} – ${r.max_value}`;
    else if (r.min_value != null) text = `≥ ${r.min_value}`;
    else if (r.max_value != null) text = `≤ ${r.max_value}`;
  }
  if (!text && r.qualitative_value) text = r.qualitative_value;
  if (!text && r.symbol_operator && r.max_value != null) text = `${r.symbol_operator} ${r.max_value}`;
  if (r.reference_range_text) text = text ? `${text} (${r.reference_range_text})` : r.reference_range_text;

  if (resultValue !== null && resultValue !== undefined && resultValue !== "") {
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

// ============================================================
// 🔬 GET RESULT TEMPLATE (Fixed Patient Data Mapping)
// ============================================================
const getResultTemplate = async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  if (isNaN(requestId)) return res.status(400).json({ message: "Invalid Request ID" });

  const { department: userDeptId, permissions_map, full_name } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  const client = await pool.connect();
  try {
    // 1. Fetch Header (Patient Info)
    const { rows: hdr } = await client.query(
      `SELECT 
         p.first_name, p.last_name, p.lab_id, p.date_of_birth, p.gender,
         DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth))::int AS age_years
       FROM test_requests tr 
       JOIN patients p ON tr.patient_id = p.id 
       WHERE tr.id = $1`,
      [requestId]
    );

    if (!hdr.length) return res.status(404).json({ message: "Request not found." });
    const patient = hdr[0];
    const { gender, age_years } = patient;

    // 2. Department Access Check
    const params = [requestId];
    let deptFilterQuery = "";

    if (!isSuperAdmin) {
        if (!userDeptId) return res.status(403).json({ message: "No department assigned." });
        const userDeptName = await resolveDeptName(userDeptId);
        if (!userDeptName) return res.status(403).json({ message: "Invalid department ID." });
        const accessScope = getAccessScope(userDeptName);
        
        params.push(accessScope);
        deptFilterQuery = ` AND d.name ILIKE ANY($${params.length}) `; 
    }

    // 3. Fetch Items
    const { rows: items } = await client.query(
      `SELECT tri.id AS request_item_id, tri.parent_id,
             tc.id AS test_id, tc.name AS test_name,
             COALESCE(tc.is_panel,false) AS is_panel,
             d.name AS department_name,
             u.symbol AS unit_symbol, 
             tri.result_value, tri.status,
             tc.department_id,
             tri.updated_at
       FROM test_request_items tri
       JOIN test_catalog tc ON tc.id = tri.test_catalog_id
       LEFT JOIN departments d ON d.id = tc.department_id
       LEFT JOIN units u ON u.id = tc.unit_id
       WHERE tri.test_request_id = $1
       ${deptFilterQuery} 
       ORDER BY tri.parent_id NULLS FIRST, tc.name`,
      params
    );

    console.log(`📊 Items fetched: ${items.length}`);

    if (!items.length) {
        return res.json({ request_id: requestId, items: [] });
    }

    const panels = {};
    const general = [];

    for (const item of items) {
      if (item.is_panel && !item.parent_id) panels[item.request_item_id] = { ...item, analytes: [] };
    }

    for (const item of items) {
      const details = await getSmartRefDetails(client, item.test_id, item.result_value, gender, age_years);
      item.ref_range = details.text;
      item.flag = details.flag;

      if (item.parent_id && panels[item.parent_id]) {
        panels[item.parent_id].analytes.push(item);
      } else if (!item.is_panel && !item.parent_id) {
        general.push(item);
      }
    }

    // 🚀 FIX: Mapped keys to what Frontend expects
    res.json({ 
        request_id: requestId, 
        patient_info: {
            name: `${patient.first_name} ${patient.last_name}`,
            patient_id: patient.lab_id,       // Key Fix: Frontend looks for 'patient_id', not 'lab_id'
            date_of_birth: patient.date_of_birth, // Key Fix: Frontend looks for 'date_of_birth'
            gender: patient.gender,
            age: age_years
        },
        items: [...general, ...Object.values(panels)] 
    });

  } catch (err) {
    console.error("❌ getResultTemplate:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ============================================================
// 🧪 SUBMIT RESULT
// ============================================================
const submitResult = async (req, res) => {
  const { itemId: testItemId } = req.params;
  const { result } = req.body;
  const { department: userDeptId, permissions_map } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  if (result === undefined || result === null) return res.status(400).json({ message: "Result required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT tri.test_request_id, tc.department_id, d.name AS department_name
       FROM test_request_items tri
       JOIN test_catalog tc ON tri.test_catalog_id = tc.id
       LEFT JOIN departments d ON tc.department_id = d.id
       WHERE tri.id = $1`,
      [testItemId]
    );

    if (!rows.length) throw new Error("Test item not found.");
    const itemData = rows[0];

    if (!isSuperAdmin) {
        const userDeptName = await resolveDeptName(userDeptId);
        const accessScope = getAccessScope(userDeptName);
        const targetDeptName = (itemData.department_name || "").toLowerCase();

        if (!accessScope.includes(targetDeptName)) {
            throw new Error("Permission denied: Test belongs to restricted department.");
        }
    }

    const cleanResult = String(result).trim();
    await client.query(
      `UPDATE test_request_items
       SET result_value = $1, status = 'Completed', updated_at = NOW()
       WHERE id = $2`,
      [cleanResult, testItemId]
    );

    await client.query(
      `UPDATE test_requests SET status = 'Completed' 
       WHERE id = $1 
       AND (SELECT COUNT(*) FROM test_request_items WHERE test_request_id = $1 AND status NOT IN ('Completed', 'Verified', 'Cancelled')) = 0`,
      [itemData.test_request_id]
    );

    await client.query("COMMIT");

    try {
       if (emitToDepartment) {
           emitToDepartment(req, itemData.department_name, "test_status_updated", {
               request_id: itemData.test_request_id,
               test_item_id: testItemId
           });
       }
    } catch(e) {}

    res.json({ message: "✅ Result saved." });
  } catch (error) {
    await client.query("ROLLBACK");
    const status = error.message.includes("Permission") ? 403 : 500;
    res.status(status).json({ message: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// ✅ VERIFY RESULT
// ============================================================
const verifyResult = async (req, res) => {
  const { itemId: id } = req.params;
  const { full_name, department: userDeptId, permissions_map, roles, role_name } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  const userRoles = (roles || []).map(r => r.toLowerCase());
  if (role_name) userRoles.push(role_name.toLowerCase());
  const isSenior = userRoles.some(r => r.includes("admin") || r.includes("pathologist") || r.includes("scientist") || r.includes("hematologist"));

  if (!isSuperAdmin && !isSenior) return res.status(403).json({ message: "Permission denied" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
        `SELECT tri.test_request_id, d.name AS department_name 
         FROM test_request_items tri
         JOIN test_catalog tc ON tri.test_catalog_id = tc.id
         LEFT JOIN departments d ON tc.department_id = d.id
         WHERE tri.id = $1`, 
        [id]
    );

    if (!rows.length) throw new Error("Test not found");
    const { test_request_id, department_name } = rows[0];

    if (!isSuperAdmin) {
        const userDeptName = await resolveDeptName(userDeptId);
        const accessScope = getAccessScope(userDeptName);
        const targetDeptName = (department_name || "").toLowerCase();

        if (!accessScope.includes(targetDeptName)) {
            throw new Error("Permission denied: Cannot verify tests outside your cluster.");
        }
    }

    await client.query(
      `UPDATE test_request_items
       SET status = 'Verified', verified_name = $1, verified_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [full_name, id]
    );

    await client.query(
        `UPDATE test_requests SET status = 'Verified' 
         WHERE id = $1 
         AND (SELECT COUNT(*) FROM test_request_items WHERE test_request_id = $1 AND status != 'Verified') = 0`,
        [test_request_id]
    );

    await client.query("COMMIT");
    res.json({ message: "✅ Verified." });

  } catch (error) {
    await client.query("ROLLBACK");
    const status = error.message.includes("Permission") ? 403 : 500;
    res.status(status).json({ message: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 📊 STATUS COUNTS
// ============================================================
const getStatusCounts = async (req, res) => {
  const { department: userDeptId, permissions_map } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  try {
    const params = [];
    let deptFilter = "";

    if (!isSuperAdmin) {
       if (!userDeptId) return res.json({});
       const userDeptName = await resolveDeptName(userDeptId);
       const accessScope = getAccessScope(userDeptName);
       params.push(accessScope);
       deptFilter = ` AND d.name ILIKE ANY($${params.length}) `;
    }

    const sql = `
      SELECT tri.status, COUNT(tri.id)::int AS count
      FROM test_request_items tri
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      WHERE 1=1 ${deptFilter}
      GROUP BY tri.status
    `;

    const { rows } = await pool.query(sql, params);
    const counts = { sample_collected:0, in_progress:0, completed:0, verified:0, released:0 };
    
    rows.forEach(r => {
       let k = r.status.toLowerCase().replace(/\s/g, "_");
       if (k === 'samplereceived') k = 'sample_collected';
       if (k === 'pending') k = 'in_progress';
       if (counts[k] !== undefined) counts[k] += r.count;
    });

    res.json(counts);
  } catch (e) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ============================================================
// 📋 WORKLIST
// ============================================================
const getPathologistWorklist = async (req, res) => {
  const { status, search, sortBy = 'updated_at', order = 'desc' } = req.query;
  const { department: userDeptId, permissions_map } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  try {
    const params = [];
    let whereClause = "WHERE 1=1";

    if (!isSuperAdmin) {
       if (!userDeptId) return res.json([]);
       const userDeptName = await resolveDeptName(userDeptId);
       const accessScope = getAccessScope(userDeptName);
       params.push(accessScope);
       whereClause += ` AND d.name ILIKE ANY($${params.length}) `;
    }

    if (status) {
       let dbStatus = status;
       if (status === 'sample_collected') dbStatus = 'SampleReceived';
       if (status === 'verified') dbStatus = 'Verified';
       if (status === 'in_progress') dbStatus = 'Pending';
       params.push(dbStatus);
       whereClause += ` AND tri.status = $${params.length} `;
    }

    if (search) {
       params.push(`%${search}%`);
       whereClause += ` AND (p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length} OR p.lab_id ILIKE $${params.length}) `;
    }

    const sortCol = sortBy === 'patient_name' ? 'p.last_name' : 'tri.updated_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const sql = `
      SELECT 
        tri.id AS test_item_id,
        tr.id AS request_id,
        tr.created_at,
        tri.updated_at,
        tri.status AS item_status,
        tc.name AS test_name,
        p.lab_id,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        d.name AS department
      FROM test_request_items tri
      JOIN test_requests tr ON tri.test_request_id = tr.id
      JOIN patients p ON tr.patient_id = p.id
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir} LIMIT 100
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// ♻️ UPDATE ITEM STATUS
// ============================================================
const updateRequestItemStatus = async (req, res) => {
  const { itemId } = req.params;
  const { status } = req.body;
  const { department: userDeptId, permissions_map } = req.user;
  const isSuperAdmin = permissions_map?.["*:*"] === true;

  if (!status) return res.status(400).json({ message: "Status required" });

  try {
     if (!isSuperAdmin) {
        const check = await pool.query(`SELECT d.name AS department_name FROM test_request_items tri JOIN test_catalog tc ON tri.test_catalog_id = tc.id LEFT JOIN departments d ON tc.department_id = d.id WHERE tri.id = $1`, [itemId]);
        if (!check.rows.length) return res.status(404).json({message:"Not found"});
        
        const userDeptName = await resolveDeptName(userDeptId);
        const accessScope = getAccessScope(userDeptName);
        
        if (!accessScope.includes(check.rows[0].department_name.toLowerCase())) {
            return res.status(403).json({ message: "Permission denied" });
        }
     }

     await pool.query(`UPDATE test_request_items SET status = $1, updated_at = NOW() WHERE id = $2`, [status, itemId]);
     res.json({ message: "Status updated" });
  } catch (e) {
     res.status(500).json({ message: "Server Error" });
  }
};

const reopenResult = async (req, res) => {
  req.body.status = "Reopened";
  return updateRequestItemStatus(req, res);
};

const markResultForReview = async (req, res) => {
  req.body.status = "UnderReview";
  return updateRequestItemStatus(req, res);
};

const getResultHistory = async (req, res) => {
   try {
       const { itemId } = req.params;
       const { rows } = await pool.query(
           `SELECT * FROM result_audit_logs WHERE test_item_id = $1 ORDER BY created_at DESC`, 
           [itemId]
       );
       res.json(rows);
   } catch(e) { res.json([]); }
};

const getAnalyzerResults = async (req, res) => {
   res.status(404).json({ message: "No analyzer data" });
};

const releaseReport = async (req, res) => {
   res.status(400).json({ message: "Use /api/test-requests/:id/status to release." });
};

module.exports = {
  getResultTemplate,
  submitResult,
  verifyResult,
  getStatusCounts,
  getPathologistWorklist,
  updateRequestItemStatus,
  reopenResult,
  markResultForReview,
  getResultHistory,
  getAnalyzerResults,
  releaseReport
};