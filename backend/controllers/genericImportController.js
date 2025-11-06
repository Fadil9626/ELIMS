// backend/controllers/importController.js
const { parse } = require("csv-parse/sync");
const pool = require("../config/database");

// helpers
const readCsvBuffer = (buf) =>
  parse(buf.toString("utf8"), { columns: true, skip_empty_lines: true, trim: true });

const toNumberOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const norm = (s) => (typeof s === "string" ? s.trim() : s);

async function importLabData(req, res) {
  try {
    // grab files
    const testsFile = req.files?.tests?.[0];
    const rangesFile = req.files?.ranges?.[0];

    if (!testsFile) {
      return res
        .status(400)
        .json({ message: "Missing 'tests' file field (tests.csv) in multipart form-data." });
    }
    if (!rangesFile) {
      return res
        .status(400)
        .json({ message: "Missing 'ranges' file field (ranges.csv) in multipart form-data." });
    }

    const testsRows = readCsvBuffer(testsFile.buffer);
    const rangesRows = readCsvBuffer(rangesFile.buffer);

    const departmentOverride = req.importDepartmentOverride
      ? String(req.importDepartmentOverride)
      : null;

    // Start transaction
    await pool.query("BEGIN");

    // Lookups
    const units = (await pool.query("SELECT id, unit_name, symbol FROM units")).rows;
    const departments = (await pool.query("SELECT id, name FROM departments")).rows;
    const sampleTypes = (await pool.query("SELECT id, name FROM sample_types")).rows;
    const testsExisting = (await pool.query("SELECT id, name FROM test_catalog")).rows;

    const unitBySymbol = new Map(units.map((u) => [String(u.symbol), u.id]));
    const deptByName = new Map(departments.map((d) => [String(d.name), d.id]));
    const stByName = new Map(sampleTypes.map((s) => [String(s.name), s.id]));
    const testByName = new Map(testsExisting.map((t) => [String(t.name), t.id]));

    // If department override is specified, validate it exists
    if (departmentOverride && !deptByName.has(departmentOverride)) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: `Department override "${departmentOverride}" not found. Create it first.`,
      });
    }

    // Upsert tests
    const createdByName = new Map(testByName); // seed with existing
    for (const row of testsRows) {
      const name = norm(row.name);
      if (!name) continue;

      if (!createdByName.has(name)) {
        const unitId =
          row.unit_symbol && unitBySymbol.has(row.unit_symbol)
            ? unitBySymbol.get(row.unit_symbol)
            : null;

        const deptName = departmentOverride || norm(row.department_name);
        const deptId = deptName && deptByName.has(deptName) ? deptByName.get(deptName) : null;

        const stName = norm(row.sample_type_name);
        const sampleTypeId = stName && stByName.has(stName) ? stByName.get(stName) : null;

        const price = toNumberOrNull(row.price) ?? 0;

        const ins = await pool.query(
          `INSERT INTO test_catalog (name, price, unit_id, department_id, sample_type_id, is_active)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (name) DO UPDATE SET
             price = EXCLUDED.price,
             unit_id = EXCLUDED.unit_id,
             department_id = EXCLUDED.department_id,
             sample_type_id = EXCLUDED.sample_type_id
           RETURNING id`,
          [name, price, unitId, deptId, sampleTypeId, String(row.is_active).toLowerCase() !== "false"]
        );
        createdByName.set(name, ins.rows[0].id);
      }
    }

    // Insert ranges
    // Backend schema expects analyte_id referencing test_catalog.id
    // normal_ranges columns: analyte_id, range_type, gender, age_min, age_max, unit_id, min_value, max_value, symbol_operator, qualitative_value, note
    for (const r of rangesRows) {
      const analyteName = norm(r.analyte_name);
      if (!analyteName) continue;

      const analyteId = createdByName.get(analyteName);
      if (!analyteId) {
        // Skip when matching test is missing
        continue;
      }

      const rangeType = norm(r.range_type) || "numeric";
      const gender = norm(r.gender) || "Any";

      const ageMin = toNumberOrNull(r.age_min);
      const ageMax = toNumberOrNull(r.age_max);

      const unitId =
        r.unit_symbol && unitBySymbol.has(r.unit_symbol)
          ? unitBySymbol.get(r.unit_symbol)
          : null;

      const minValue = toNumberOrNull(r.min_value);
      const maxValue = toNumberOrNull(r.max_value);

      const symbolOperator = norm(r.symbol_operator) || null;
      const qualitativeValue = norm(r.qualitative_value) || null;
      const note = norm(r.note) || null;

      await pool.query(
        `INSERT INTO normal_ranges
          (analyte_id, range_type, gender, age_min, age_max, unit_id, min_value, max_value, symbol_operator, qualitative_value, note)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT DO NOTHING`,
        [
          analyteId,
          rangeType.toLowerCase(), // "numeric" | "qualitative" etc
          gender,
          ageMin,
          ageMax,
          unitId,
          minValue,
          maxValue,
          symbolOperator,
          qualitativeValue,
          note,
        ]
      );
    }

    await pool.query("COMMIT");
    return res.status(200).json({
      message: "Import complete",
      tests_processed: testsRows.length,
      ranges_processed: rangesRows.length,
    });
  } catch (err) {
    try {
      await pool.query("ROLLBACK");
    } catch (_) {
      // ignore rollback error
    }
    console.error("Import error:", err);
    return res.status(500).json({ message: "Import failed", error: err.message });
  }
}

module.exports = { importLabData };
