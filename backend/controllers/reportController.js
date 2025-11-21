const pool = require("../config/database");

/* ------------------------------------------------------------
 * 🧹 SQL SANITIZER
 * ------------------------------------------------------------ */
function sanitizeSQL(sql) {
  return sql.replace(/[\uFEFF\u00A0\u200B\u200C\u200D]/g, " ").trim();
}

async function runQuery(sql, params = []) {
  const clean = sanitizeSQL(sql);
  return pool.query(clean, params);
}

/* ------------------------------------------------------------
 * 🧮 Helper: Calculate Age
 * ------------------------------------------------------------ */
function getAgeInYears(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : 0;
}

/* ------------------------------------------------------------
 * 🛠️ Helper: Resolve Department Name
 * ------------------------------------------------------------ */
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

/* ------------------------------------------------------------
 * 🧮 Helper: Smart Reference Details
 * ------------------------------------------------------------ */
async function getSmartRefDetails(analyteId, resultValue, gender = null, ageYears = null) {
  if (!analyteId) return { text: null, flag: null };

  const g = gender && typeof gender === "string"
      ? gender.toLowerCase().startsWith("m") ? "male" : gender.toLowerCase().startsWith("f") ? "female" : null
      : null;
      
  const safeAge = ageYears !== null ? ageYears : -1;

  let sql = `
    SELECT range_type, min_value, max_value,
            qualitative_value, symbol_operator, reference_range_text, gender
     FROM normal_ranges
     WHERE analyte_id = $1
       AND (
         $2::text IS NULL 
         OR LOWER(gender::text) = $2::text 
         OR gender::text = 'Any'
       )
       AND (
         $3::int = -1 
         OR (min_age IS NULL OR $3::int >= min_age) 
         AND (max_age IS NULL OR $3::int <= max_age)
       )
     ORDER BY CASE WHEN gender::text = 'Any' THEN 1 ELSE 0 END, id ASC
     LIMIT 1
  `;

  let { rows } = await runQuery(sql, [analyteId, g, safeAge]);

  if (!rows.length) {
      const fallbackSql = `
        SELECT range_type, min_value, max_value, qualitative_value, symbol_operator, reference_range_text
        FROM normal_ranges 
        WHERE analyte_id = $1 
        ORDER BY id ASC 
        LIMIT 1
      `;
      const fallbackRes = await runQuery(fallbackSql, [analyteId]);
      rows = fallbackRes.rows;
  }

  if (!rows.length) return { text: null, flag: null };
  const r = rows[0];
  let text = null;
  let flag = null; 

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

/* ------------------------------------------------------------
 * 🧠 SMART REPORT CLUSTERING LOGIC
 * ------------------------------------------------------------ */

// 1. Define Nice Titles
const DISPLAY_NAMES = {
    'chemistry': 'CLINICAL CHEMISTRY',
    'clinical chemistry': 'CLINICAL CHEMISTRY',
    'immunology': 'IMMUNOLOGY',
    'microbiology': 'MICROBIOLOGY',
    'serology': 'SEROLOGY',
    'hematology': 'HAEMATOLOGY',
    'haematology': 'HAEMATOLOGY',
    'histopathology': 'HISTOPATHOLOGY',
    'parasitology': 'PARASITOLOGY'
};

// 2. Define the Clusters (Who gets grouped with whom)
const CLUSTERS = [
    { id: 'CHEM_IMMUNO', keywords: ['chemistry', 'immunology', 'chemical pathology'] },
    { id: 'MICRO_SERO', keywords: ['microbiology', 'serology', 'virology', 'parasitology'] },
    { id: 'HAEM', keywords: ['hematology', 'haematology', 'blood bank'] }
];

// Helper: Get Cluster ID and Pretty Name for a department string
function getSmartSectionData(departmentName) {
    const dept = (departmentName || "").toLowerCase();
    
    const cluster = CLUSTERS.find(c => c.keywords.some(k => dept.includes(k)));
    
    let displayName = departmentName.toUpperCase();
    for (const [key, val] of Object.entries(DISPLAY_NAMES)) {
        if (dept.includes(key)) {
            displayName = val;
            break;
        }
    }

    return {
        clusterId: cluster ? cluster.id : dept, // If no cluster found, it is its own island
        displayName: displayName
    };
}

/* =============================================================================
 * 📋 GET ALL REPORTS (List View - FIXED)
 * =============================================================================
 */
const getAllReports = async (req, res) => {
  const { search } = req.query;
  try {
    const params = [];
    // 🚀 FIX: Added Joins to fetch and aggregate departments
    let sql = `
      SELECT 
        tr.id AS request_id, tr.created_at AS report_date, tr.status,
        p.lab_id, CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        ARRAY_AGG(DISTINCT d.name) AS raw_departments,
        (SELECT verified_name FROM test_request_items WHERE test_request_id = tr.id AND verified_name IS NOT NULL ORDER BY verified_at DESC LIMIT 1) AS last_verified_by
      FROM test_requests tr
      JOIN patients p ON tr.patient_id = p.id
      JOIN test_request_items tri ON tr.id = tri.test_request_id
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      WHERE tr.status IN ('Verified', 'Released')
    `;

    if (search) {
      sql += ` AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR p.lab_id ILIKE $1 OR tr.id::text ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    sql += ` 
      GROUP BY tr.id, p.lab_id, p.first_name, p.last_name
      ORDER BY tr.created_at DESC 
      LIMIT 50
    `;

    const { rows } = await runQuery(sql, params);

    // 🚀 Post-process to create nice department strings
    const processedRows = rows.map(row => {
        const rawDepts = row.raw_departments || [];
        const displayNames = new Set();
        
        rawDepts.forEach(d => {
            if (d) {
                const { displayName } = getSmartSectionData(d);
                displayNames.add(displayName);
            }
        });

        // Convert Set to String (e.g., "CLINICAL CHEMISTRY, HAEMATOLOGY")
        // If no departments found, fallback to "LABORATORY" (better than General)
        const deptStr = Array.from(displayNames).sort().join(', ') || "LABORATORY";

        return {
            ...row,
            department_name: deptStr // Override for frontend
        };
    });

    res.json(processedRows);
  } catch (error) {
    console.error("❌ Error fetching reports list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =============================================================================
 * 🖨️ GET SINGLE REPORT (Secure, Grouped & Filtered)
 * =============================================================================
 */
const getReportByRequestId = async (req, res) => {
    const { id } = req.params;
    
    // 🔐 SECURITY CONTEXT
    const { department: userDeptId, permissions_map } = req.user;
    const isSuperAdmin = permissions_map?.["*:*"] === true;

    try {
        // 1. Determine User's Allowed Cluster
        let userAllowedClusterId = null;
        
        if (!isSuperAdmin) {
            if (userDeptId) {
                const userDeptName = await resolveDeptName(userDeptId);
                if (userDeptName) {
                    const { clusterId } = getSmartSectionData(userDeptName);
                    userAllowedClusterId = clusterId;
                }
            }
        }

        // 2. Fetch Header
        const headerSql = `SELECT tr.id, tr.created_at AS request_date, tr.status AS report_status, NULL AS clinical_note, tr.updated_at AS report_date, CONCAT(p.first_name, ' ', p.last_name) AS patient_full_name, p.lab_id AS patient_lab_id, p.date_of_birth, p.gender, p.contact_phone AS phone, p.contact_address AS address, (SELECT verified_name FROM test_request_items WHERE test_request_id = tr.id AND verified_name IS NOT NULL ORDER BY verified_at DESC LIMIT 1) AS last_verified_by FROM test_requests tr JOIN patients p ON tr.patient_id = p.id WHERE tr.id = $1`;
        const headerRes = await runQuery(headerSql, [id]);
        if (!headerRes.rows.length) return res.status(404).json({ message: "Report not found" });
        const header = headerRes.rows[0];

        const age = getAgeInYears(header.date_of_birth);
        const gender = header.gender;

        // 3. Fetch Items
        const itemsSql = `
          SELECT 
            tri.id AS request_item_id, tri.parent_id,
            tc.id AS test_id, tc.name AS test_name, tc.is_panel,
            tri.result_value AS value, tri.status,
            u.unit_name AS unit_symbol, 
            d.name AS department_name,
            tri.result_data
          FROM test_request_items tri
          JOIN test_catalog tc ON tri.test_catalog_id = tc.id
          LEFT JOIN units u ON tc.unit_id = u.id
          LEFT JOIN departments d ON tc.department_id = d.id
          WHERE tri.test_request_id = $1
          ORDER BY d.name ASC, tc.is_panel DESC, tri.id ASC
        `;
        const itemsRes = await runQuery(itemsSql, [id]);
        const allItems = itemsRes.rows;

        // Helper: Process Item Row
        const processItem = async (item) => {
            let extra = {};
            try { extra = item.result_data || {}; } catch (e) {}
            const details = await getSmartRefDetails(item.test_id, item.value, gender, age);
            let flag = details.flag || extra.flag || null;
            if (flag === 'N') flag = null; 
            return {
                analyte_id: item.test_id,
                analyte_name: item.test_name,
                value: item.value,
                unit: item.unit_symbol || "",
                status: item.status,
                flag: flag,
                ref_range: details.text || extra.ref_range || null,
                note: extra.note || null,
            };
        };

        // 4. GROUPING & SECURITY FILTERING
        const buckets = {};

        for (const item of allItems) {
            const { clusterId, displayName } = getSmartSectionData(item.department_name);

            // 🛑 SECURITY CHECK:
            if (!isSuperAdmin && userAllowedClusterId) {
                if (clusterId !== userAllowedClusterId) {
                    continue; // Skip this item
                }
            }

            if (!buckets[clusterId]) {
                buckets[clusterId] = {
                    titles: new Set(),
                    panelItems: [],
                    standaloneItems: []
                };
            }

            buckets[clusterId].titles.add(displayName);

            if (item.is_panel && !item.parent_id) {
                buckets[clusterId].panelItems.push(item);
            } else if (!item.is_panel && !item.parent_id) {
                buckets[clusterId].standaloneItems.push(item);
            }
        }

        // 5. Format Final Sections
        const finalSections = [];

        for (const [clusterId, bucket] of Object.entries(buckets)) {
            const formattedItems = [];

            // Process Standalones
            for (const item of bucket.standaloneItems) {
                formattedItems.push({
                    test_name: item.test_name,
                    is_panel: false,
                    analytes: [await processItem(item)]
                });
            }

            // Process Panels
            for (const panel of bucket.panelItems) {
                const children = allItems.filter(i => i.parent_id === panel.request_item_id);
                const processedChildren = await Promise.all(children.map(c => processItem(c)));
                formattedItems.push({
                    test_name: panel.test_name,
                    is_panel: true,
                    analytes: processedChildren
                });
            }

            if (formattedItems.length > 0) {
                const smartHeader = Array.from(bucket.titles).sort().join(' / ');
                finalSections.push({
                    report_header: smartHeader,
                    items: formattedItems
                });
            }
        }

        res.json({ ...header, sections: finalSections });

    } catch (error) {
        console.error("❌ Report Generation Error:", error);
        res.status(500).json({ message: "Server error generating report" });
    }
};

module.exports = {
    getAllReports,
    getReportByRequestId,
};