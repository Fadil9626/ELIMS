const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLogger');

/* ------------------------------------------------------------
 * | 🛠 UTILS & HELPERS
 * ------------------------------------------------------------
 */

function sanitizeSQL(sql) {
  return sql.replace(/[\uFEFF\u00A0\u200B\u200C\u200D]/g, ' ');
}

async function runQuery(sql, params = []) {
  const clean = sanitizeSQL(sql);
  return pool.query(clean, params);
}

function ageInYears(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// Gets reference range data for a single analyte
async function getRefRange(analyteId, gender, ageYears) {
  const sql = `SELECT nr.min_value AS low, nr.max_value AS high, u.symbol AS unit
           FROM normal_ranges nr
           LEFT JOIN units u ON u.id = nr.unit_id
           WHERE nr.analyte_id = $1
             AND (nr.gender = $2 OR nr.gender = 'Any' OR nr.gender IS NULL)
             AND ($3::INTEGER IS NULL OR nr.age_min IS NULL OR nr.age_min <= $3::INTEGER)
             AND ($3::INTEGER IS NULL OR nr.age_max IS NULL OR nr.age_max >= $3::INTEGER)
           ORDER BY
             CASE WHEN nr.gender = $2 THEN 0 ELSE 1 END,
             (CASE WHEN nr.age_min IS NULL AND nr.age_max IS NULL THEN 1 ELSE 0 END)
           LIMIT 1`;

  const ageParam = typeof ageYears === 'number' && ageYears >= 0 ? ageYears : null;

  try {
    const { rows } = await runQuery(sql, [analyteId, gender || 'Any', ageParam]);

    if (rows.length > 0) {
      const r = rows[0];
      r.ref_text = null; // Manually build the ref_text
      if (!r.ref_text) {
        if (r.low != null && r.high != null) r.ref_text = `${r.low} - ${r.high}`;
        else if (r.low != null) r.ref_text = `> ${r.low}`;
        else if (r.high != null) r.ref_text = `< ${r.high}`;
      }
      return r;
    }

    return { low: null, high: null, unit: null, ref_text: null };
  } catch (error) {
    if (error.code === '42P01') {
      console.error(
        `⚠️ Error in getRefRange: Table not found (normal_ranges or units). AnalyteId=${analyteId}`
      );
      return { low: null, high: null, unit: null, ref_text: null };
    }
    console.error(
      `💥 SQL Error in getRefRange for analyteId=${analyteId}:`,
      error.message
    );
    throw error;
  }
}

// Computes flag (H/L/N) for a quantitative result.
function computeFlag(value, low, high) {
  if (value === null || value === undefined || value === '') return '';
  const v = Number(value);
  if (Number.isNaN(v)) return '';
  if (low != null && v < Number(low)) return 'L';
  if (high != null && v > Number(high)) return 'H';
  return 'N';
}

/* ------------------------------------------------------------
 * | 📋 REPORT LIST
 * ------------------------------------------------------------
 */

const getAllCompletedReports = async (req, res) => {
  const { search = '', from, to, department } = req.query;
  const { role_id, department: userDept, id: userId } = req.user;

  try {
    let query = `
      SELECT
        tr.id AS request_id,
        tr.created_at AS report_date,
        p.first_name,
        p.last_name,
        p.lab_id,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        COALESCE(d.name, 'N/A') AS department_name,
        COUNT(tri.id) AS total_tests,
        MAX(tri.updated_at) AS last_verified,
        MAX(tri.verified_name) AS last_verified_by
      FROM test_requests tr
      JOIN patients p ON tr.patient_id = p.id
      JOIN test_request_items tri ON tr.id = tri.test_request_id
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      WHERE tr.status IN ('Completed', 'Released')
    `;

    const params = [];
    let idx = 1;

    if (role_id === 3 && userDept) {
      query += ` AND d.name = $${idx++}`;
      params.push(userDept);
    }

    if (department && role_id !== 3) {
      query += ` AND d.name = $${idx++}`;
      params.push(department);
    }

    if (from) {
      query += ` AND tr.created_at >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND tr.created_at <= $${idx++}`;
      params.push(to);
    }

    if (search) {
      query += ` AND (p.first_name ILIKE $${idx} OR p.last_name ILIKE $${idx} OR p.lab_id ILIKE $${idx})`;
      params.push(`%${search}%`);
    }

    query += `
      GROUP BY tr.id, p.first_name, p.last_name, p.lab_id, d.name
      ORDER BY tr.created_at DESC;
    `;

    const { rows } = await runQuery(query, params);

    const sanitized = rows.map((r) => ({
      request_id: r.request_id,
      report_date: r.report_date,
      lab_id: r.lab_id,
      patient_name:
        r.patient_name?.trim() ||
        [r.first_name, r.last_name].filter(Boolean).join(' ') ||
        'N/A',
      department_name: r.department_name || 'N/A',
      total_tests: r.total_tests,
      last_verified_by: r.last_verified_by || '—',
      last_verified: r.last_verified,
    }));

    await logAuditEvent({
      user_id: userId,
      action: 'REPORTS_VIEW_ALL',
      details: {
        total: sanitized.length,
        search,
        from,
        to,
        department,
        filtered_by: role_id === 3 ? userDept : department || 'All',
      },
    });

    res.status(200).json(sanitized);
  } catch (error) {
    console.error('❌ Error fetching completed reports:', error.message);
    await logAuditEvent({
      user_id: req.user.id,
      action: 'REPORTS_VIEW_ALL_FAILED',
      details: { error: error.message },
    });
    res.status(500).json({ message: 'Server Error' });
  }
};

/* ------------------------------------------------------------
 * | 📄 REPORT DETAIL
 * ------------------------------------------------------------
 */

const getReportByRequestId = async (req, res) => {
  const { id } = req.params;
  const { role_id, department: userDept } = req.user;
  const client = await pool.connect();

  try {
    // === QUERY 1: Get Patient/Request Info ===
    const { rows: reqRows } = await client.query(
      `SELECT tr.*, p.lab_id, p.first_name, p.last_name, p.gender, p.date_of_birth, p.phone, p.address
       FROM test_requests tr
       JOIN patients p ON tr.patient_id = p.id
       WHERE tr.id = $1`,
      [id]
    );

    if (!reqRows.length) {
      await logAuditEvent({
        user_id: req.user.id,
        action: 'REPORT_VIEW_FAILED',
        details: { request_id: id, reason: 'Not found' },
      });
      return res.status(404).json({ message: 'Report not found' });
    }

    const p = reqRows[0];
    const patientAge = ageInYears(p.date_of_birth);

    // === QUERY 2: Get ALL Top-Level Items (Panels & Single Tests) ===
    const { rows: allTopLevelItems } = await client.query(
      `SELECT
        tri.id AS request_item_id,
        tri.test_catalog_id,
        tc.name AS test_name,
        tc.is_panel,
        d.name AS department_name,
        tri.verified_name,
        tri.updated_at AS verified_at,
        tri.result_value,
        tri.status
      FROM test_request_items tri
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      WHERE tri.test_request_id = $1 AND tri.parent_id IS NULL
      ORDER BY tc.name ASC;`,
      [id]
    );

    // === QUERY 3: Get ALL Child Analytes for this Request ===
    const { rows: allChildItems } = await client.query(
      `SELECT
        tri.id AS request_item_id,
        tri.test_catalog_id,
        tc.name AS test_name,
        tri.parent_id,
        d.name AS department_name,
        tri.verified_name,
        tri.updated_at AS verified_at,
        tri.result_value,
        tri.status
      FROM test_request_items tri
      JOIN test_catalog tc ON tri.test_catalog_id = tc.id
      LEFT JOIN departments d ON tc.department_id = d.id
      WHERE tri.test_request_id = $1 AND tri.parent_id IS NOT NULL;`,
      [id]
    );

    // --- Authorization Filter (Only on Top-Level Items) ---
    let filteredTopLevelItems = allTopLevelItems;
    if (role_id === 3 && userDept) {
      filteredTopLevelItems = allTopLevelItems.filter(
        (r) => r.department_name?.toLowerCase() === userDept.toLowerCase()
      );
      if (!filteredTopLevelItems.length && allChildItems.length === 0) {
        await logAuditEvent({
          user_id: req.user.id,
          action: 'REPORT_VIEW_DENIED',
          details: {
            request_id: id,
            reason: 'Not authorized for this department',
            department: userDept,
          },
        });
        return res.status(403).json({
          message: 'Access denied: Not authorized for this department.',
        });
      }
    }

    // --- Patient & Report Header Info ---
    const patientInfo = {
      patient_lab_id: p.lab_id,
      patient_first_name: p.first_name,
      patient_last_name: p.last_name,
      patient_full_name: `${p.first_name} ${p.last_name}`.trim(),
      gender: p.gender || 'N/A',
      date_of_birth: p.date_of_birth || null,
      phone: p.phone || null,
      address: p.address || null,
    };
    const reportInfo = {
      request_id: p.id,
      report_date: p.created_at,
      report_status: p.status,
    };

    // --- Group Child Analytes by their Parent ID ---
    const childAnalyteMap = new Map();
    for (const child of allChildItems) {
      if (!childAnalyteMap.has(child.parent_id)) {
        childAnalyteMap.set(child.parent_id, []);
      }
      childAnalyteMap.get(child.parent_id).push(child);
    }

    // --- Build Report Items using Parent/Child Logic ---
    const items = [];

    // Loop through all FILTERED TOP-LEVEL items
    for (const r of filteredTopLevelItems) {
      // --- 1. If it's a PANEL ---
      if (r.is_panel) {
        // Find its children from the map
        const childAnalytesRaw = childAnalyteMap.get(r.request_item_id) || [];
        let processedAnalytes = [];

        // Process all found children
        if (childAnalytesRaw.length > 0) {
          for (const child of childAnalytesRaw) {
            const range = await getRefRange(
              child.test_catalog_id,
              p.gender,
              patientAge
            );
            const flag = computeFlag(child.result_value, range.low, range.high);

            processedAnalytes.push({
              analyte_id: child.test_catalog_id,
              analyte_name: child.test_name,
              // --- 💡 Tiny Tweak: Add .trim() for safety ---
              value: child.result_value?.trim() ?? '',
              unit: range.unit || '',
              ref_low: range.low,
              ref_high: range.high,
              ref_range: range.ref_text,
              flag,
              note: '',
              verified_name: child.verified_name,
              verified_at: child.verified_at,
            });
          }

          // Add the panel with its children
          items.push({
            test_name: r.test_name,
            department_name: r.department_name || 'N/A',
            verified_name:
              r.verified_name || // Use panel's verification
              (processedAnalytes.length // Or find latest child verification
                ? processedAnalytes.sort(
                    (a, b) => new Date(b.verified_at) - new Date(a.verified_at)
                  )[0].verified_name
                : '—'),
            verified_at:
              r.verified_at ||
              (processedAnalytes.length
                ? processedAnalytes.sort(
                    (a, b) => new Date(b.verified_at) - new Date(a.verified_at)
                  )[0].verified_at
                : null),
            analytes: processedAnalytes,
          });
        }
        // FALLBACK: If NO children, but panel itself has a result (e.g., "N/A")
        else if (r.result_value) {
          const range = await getRefRange(
            r.test_catalog_id,
            p.gender,
            patientAge
          );
          const flag = computeFlag(r.result_value, range.low, range.high);
          items.push({
            test_name: r.test_name,
            department_name: r.department_name || 'N/A',
            verified_name: r.verified_name || '—',
            verified_at: r.verified_at,
            analytes: [
              {
                analyte_id: r.test_catalog_id,
                analyte_name: r.test_name,
                // --- 💡 Tiny Tweak: Add .trim() for safety ---
                value: r.result_value?.trim() ?? '',
                unit: range.unit || '',
                ref_low: range.low,
                ref_high: range.high,
                ref_range: range.ref_text,
                flag,
                note: '',
              },
            ],
          });
        }
        // ELSE: (no children AND no panel result) - we skip it.
      }

      // --- 2. If it's a SINGLE TEST (and not a panel) ---
      else {
        const range = await getRefRange(
          r.test_catalog_id,
          p.gender,
          patientAge
        );
        const flag = computeFlag(r.result_value, range.low, range.high);
        items.push({
          test_name: r.test_name,
          department_name: r.department_name || 'N/A',
          verified_name: r.verified_name || '—',
          verified_at: r.verified_at,
          analytes: [
            {
              analyte_id: r.test_catalog_id,
              analyte_name: r.test_name,
              // --- 💡 Tiny Tweak: Add .trim() for safety ---
              value: r.result_value?.trim() ?? '',
              unit: range.unit || '',
              ref_low: range.low,
              ref_high: range.high,
              ref_range: range.ref_text,
              flag,
              note: '',
            },
          ],
        });
      }
    }

    // --- Final Assembly ---

    // Find last verification
    const lastVerification = items.reduce(
      (latest, item) => {
        const t = new Date(item.verified_at || 0);
        if (!latest.verified_at || t > new Date(latest.verified_at))
          return item;
        return latest;
      },
      { verified_name: '—', verified_at: null }
    );

    const fullReport = {
      ...patientInfo,
      ...reportInfo,
      last_verified_by: lastVerification.verified_name,
      last_verified_at: lastVerification.verified_at,
      items,
    };

    await logAuditEvent({
      user_id: req.user.id,
      action: 'REPORT_VIEW',
      details: {
        request_id: id,
        department: userDept || 'N/A',
        item_count: items.length,
        last_verified_by: lastVerification.verified_name,
      },
    });

    res.status(200).json(fullReport);
  } catch (error) {
    console.error('❌ Error fetching report detail:', error.message);

    await logAuditEvent({
      user_id: req.user.id,
      action: 'REPORT_VIEW_FAILED',
      details: { request_id: id, error: error.message },
    });

    res.status(500).json({ message: 'Server Error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllCompletedReports,
  getReportByRequestId,
};