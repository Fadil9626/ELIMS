const pool = require("../config/database");
const { parse } = require("csv-parse/sync");

/**
 * Normalize helpers
 */
const toStr = (v) => (v == null ? "" : String(v).trim());
const toNum = (v) =>
  v === "" || v == null ? null : Number(String(v).trim().replace(/[, ]/g, ""));
const toBool = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return true;
  return ["true", "1", "yes", "y"].includes(s);
};
const normGender = (v) => {
  const s = toStr(v).toLowerCase();
  if (!s) return "Any";
  if (["male", "m"].includes(s)) return "Male";
  if (["female", "f"].includes(s)) return "Female";
  return "Any";
};
const normRangeType = (v) => {
  const s = toStr(v).toLowerCase();
  if (!s) return "numeric";
  if (["numeric", "num", "number"].includes(s)) return "numeric";
  if (["qualitative", "qual", "text"].includes(s)) return "qualitative";
  return "numeric";
};

/**
 * Load lookups (units, departments, sample types) once per request
 */
async function loadLookups(client) {
  const [units, depts, samples] = await Promise.all([
    client.query(`SELECT id, unit_name, symbol FROM units WHERE is_active IS DISTINCT FROM false`),
    client.query(`SELECT id, name FROM departments WHERE is_active IS DISTINCT FROM false`),
    client.query(`SELECT id, name FROM sample_types WHERE is_active IS DISTINCT FROM false`),
  ]);

  const unitBySymbol = new Map();
  units.rows.forEach((u) => unitBySymbol.set(toStr(u.symbol), u.id));

  const deptByName = new Map();
  depts.rows.forEach((d) => deptByName.set(toStr(d.name), d.id));

  const sampleByName = new Map();
  samples.rows.forEach((s) => sampleByName.set(toStr(s.name), s.id));

  return { unitBySymbol, deptByName, sampleByName };
}

/**
 * Ensure test exists, return its id.
 */
async function ensureTest(client, name, price, unitId, deptId, sampleTypeId, isActive = true) {
  const testName = toStr(name);
  if (!testName) throw new Error("Test name is required.");

  // Try to find existing by name
  const find = await client.query(
    `SELECT id FROM test_catalog WHERE name = $1`,
    [testName]
  );
  if (find.rows.length) return find.rows[0].id;

  // Create new
  const ins = await client.query(
    `INSERT INTO test_catalog (name, price, unit_id, department_id, sample_type_id, is_active)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [testName, price ?? 0, unitId || null, deptId || null, sampleTypeId || null, isActive]
  );
  return ins.rows[0].id;
}

/**
 * Insert a normal range for a given test id.
 * Respects backend expectation: analyte_id == :testId from URL.
 */
async function insertRange(client, testId, row, lookups) {
  const range_type = normRangeType(row.range_type);
  const gender = normGender(row.gender);

  // Numbers (nullable)
  const age_min = toNum(row.age_min);
  const age_max = toNum(row.age_max);
  const min_value = toNum(row.min_value);
  const max_value = toNum(row.max_value);

  // Optional lookups
  const unit_symbol = toStr(row.unit_symbol);
  const unit_id = unit_symbol ? lookups.unitBySymbol.get(unit_symbol) || null : null;

  const symbol_operator = toStr(row.symbol_operator) || null;
  const qualitative_value = toStr(row.qualitative_value) || null;
  const note = toStr(row.note) || null;

  // --- ✅ FIX APPLIED HERE ---
  // The "ON CONFLICT" line was removed.
  const q = `
    INSERT INTO normal_ranges (
      analyte_id, range_type, gender, age_min, age_max,
      unit_id, min_value, max_value, symbol_operator, qualitative_value, note
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id
  `;
  const params = [
    testId,
    range_type,
    gender || "Any",
    age_min,
    age_max,
    unit_id,
    min_value,
    max_value,
    symbol_operator,
    qualitative_value,
    note,
  ];

  try {
    const res = await client.query(q, params);
    // If DO NOTHING happened (duplicate), RETURNING is empty. That's fine.
    return res.rows[0]?.id || null;
  } catch (err) {
    // If the unique index doesn't exist, you can fall back to a manual duplicate check, or rethrow
    if (err.code === "23505") {
      // Duplicate -> ignore
      return null;
    }
    // FK constraint for unit_id or analyte_id? Throw a cleaner message
    if (err.code === "23503") {
      throw new Error("Foreign key violation (check analyte_id and unit_id).");
    }
    throw err;
  }
}

/**
 * Parse a CSV buffer into objects
 */
function parseCsv(buffer) {
  const text = buffer.toString("utf8");
  if (!text.trim()) return [];
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

/**
 * POST /api/import
 * Fields:
 * tests   -> CSV file (name,price,unit_symbol,department_name,sample_type_name,is_active)
 * ranges  -> CSV file (analyte_name,range_type,gender,age_min,age_max,unit_symbol,min_value,max_value,symbol_operator,qualitative_value,note)
 * Optional body:
 * department_override (string) to force all tests into the provided department
 */
exports.importAll = async (req, res) => {
  const testsFile = req.files?.tests?.[0];
  const rangesFile = req.files?.ranges?.[0];
  const departmentOverride = toStr(req.body?.department_override);

  if (!testsFile && !rangesFile) {
    return res.status(400).json({ message: "Upload at least one CSV file (tests and/or ranges)." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lookups = await loadLookups(client);

    // Build dept override id if provided
    let deptOverrideId = null;
    if (departmentOverride) {
      deptOverrideId = lookups.deptByName.get(departmentOverride);
      if (!deptOverrideId) {
        throw new Error(`Department "${departmentOverride}" not found. Create it first.`);
      }
    }

    // 1) Tests
    const createdTests = [];
    const nameToId = new Map();

    if (testsFile) {
      const testRows = parseCsv(testsFile.buffer);
      for (const r of testRows) {
        const name = toStr(r.name);
        if (!name) continue;

        const unitId = toStr(r.unit_symbol)
          ? lookups.unitBySymbol.get(toStr(r.unit_symbol)) || null
          : null;

        const deptName = departmentOverride || toStr(r.department_name);
        const deptId = deptName ? lookups.deptByName.get(deptName) || null : null;

        const sampleId = toStr(r.sample_type_name)
          ? lookups.sampleByName.get(toStr(r.sample_type_name)) || null
          : null;

        const testId = await ensureTest(
          client,
          name,
          toNum(r.price) ?? 0,
          unitId,
          deptId,
          sampleId,
          toBool(r.is_active)
        );

        nameToId.set(name, testId);
        createdTests.push({ name, id: testId });
      }
    }

    // 2) Ranges
    const createdRanges = [];
    if (rangesFile) {
      // If tests file wasn’t uploaded this time, prime the map from DB
      if (nameToId.size === 0) {
        const existing = await client.query(`SELECT id, name FROM test_catalog`);
        existing.rows.forEach((t) => nameToId.set(toStr(t.name), t.id));
      }

      const rangeRows = parseCsv(rangesFile.buffer);
      for (const r of rangeRows) {
        const analyteName = toStr(r.analyte_name);
        if (!analyteName) continue;

        const testId = nameToId.get(analyteName);
        if (!testId) {
          // Skip but record
          createdRanges.push({ analyte: analyteName, skipped: true, reason: "Test not found" });
          continue;
        }

        try {
          const id = await insertRange(client, testId, r, lookups);
          createdRanges.push({ analyte: analyteName, id: id || "(duplicate skipped)" });
        } catch (e) {
          createdRanges.push({ analyte: analyteName, error: e.message || "insert failed" });
        }
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Import finished",
      tests: createdTests,
      ranges: createdRanges,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Import failed:", err.message);
    return res.status(500).json({ message: "Import failed", error: err.message });
  } finally {
    client.release();
  }
};