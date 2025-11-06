/**
 * ELIMS Chemistry/Biochemistry Import
 * -----------------------------------
 * Creates tests under /api/lab-config/tests and posts their reference ranges.
 *
 * Usage:
 *   node scripts/import_chemistry.js "<JWT_TOKEN>" "<PATH_TO_tests.csv>" "<PATH_TO_ranges.csv>"
 *
 * Optional environment variables:
 *   API_URL=http://localhost:5000/api
 *   DEPARTMENT_OVERRIDE="Biochemistry"  // maps all incoming department names to this one
 *
 * CSV columns accepted:
 *   tests.csv  (any of these header variants are OK)
 *     name | test_name | analyte_name
 *     price
 *     unit_symbol | unit | unitabbr
 *     department_name | department
 *     sample_type_name | sample_type | specimen
 *     is_active (optional)
 *
 *   reference_ranges.csv (any of these header variants are OK)
 *     analyte_name | test_name | name
 *     range_type
 *     gender
 *     age_min
 *     age_max
 *     unit_symbol | unit | unitabbr
 *     min_value
 *     max_value
 *     symbol_operator
 *     qualitative_value
 *     note
 */

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

// ---- fetch polyfill for Node < 18 -----------------------------------------
let fetchFn = global.fetch;
async function fetchPolyfill(...args) {
  if (!fetchFn) {
    const mod = await import("node-fetch");
    fetchFn = mod.default;
  }
  return fetchFn(...args);
}
const fetch = (...args) => fetchPolyfill(...args);

// ---- Config ----------------------------------------------------------------
const API = process.env.API_URL || "http://localhost:5000/api";
const LAB = `${API}/lab-config`;
// sample-types route may be mounted outside /lab-config in your server
const SAMPLE_TYPES_API = `${API.replace("/api", "")}/api/sample-types`;
const DEPARTMENT_OVERRIDE = process.env.DEPARTMENT_OVERRIDE || "Biochemistry";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

// ---------- HTTP helpers ----------------------------------------------------
async function getJson(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${url} -> ${res.status} ${txt}`);
  }
  return res.json();
}

async function postJson(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res;
}

// ---------- Mapping helpers -------------------------------------------------
const lc = (v) => (v == null ? "" : String(v).trim().toLowerCase());

function buildCaseInsensitiveMap(list, keyFn, valFn) {
  const m = new Map();
  for (const row of list) m.set(lc(keyFn(row)), valFn(row));
  return m;
}

function getOrThrow(map, rawKey, label) {
  if (rawKey == null || rawKey === "") return null; // allow optional fields (e.g., unit for qualitative ranges)
  const key = lc(rawKey);
  const v = map.get(key);
  if (v == null) throw new Error(`Missing ${label}: "${rawKey}"`);
  return v;
}

function getFirstOf(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
  }
  return "";
}

// ============================================================================
// Main
// ============================================================================
(async function main() {
  const TOKEN = process.argv[2] || die(`Missing JWT token.
Usage: node scripts/import_chemistry.js "<JWT>" "<tests.csv>" "<ranges.csv>"`);

  const testsCsv = path.resolve(process.argv[3] || die("Missing tests.csv path."));
  const rangesCsv = path.resolve(process.argv[4] || die("Missing reference_ranges.csv path."));

  // 1) Load lookups
  console.log("↻ Loading lookups (units, departments, sample types)…");

  const units = await getJson(`${LAB}/units`, TOKEN);
  const unitMap = buildCaseInsensitiveMap(units, (u) => u.symbol, (u) => u.id); // by symbol

  const departments = await getJson(`${API}/departments`, TOKEN);
  const deptMap = buildCaseInsensitiveMap(departments, (d) => d.name, (d) => d.id);

  if (DEPARTMENT_OVERRIDE && !deptMap.has(lc(DEPARTMENT_OVERRIDE))) {
    die(`Department "${DEPARTMENT_OVERRIDE}" not found. Create it first in the UI or via API.`);
  }

  const sampleTypes = await getJson(SAMPLE_TYPES_API, TOKEN);
  const sampleTypeMap = buildCaseInsensitiveMap(sampleTypes, (s) => s.name, (s) => s.id);

  console.log(
    `   Units: ${units.length}, Departments: ${departments.length}, SampleTypes: ${sampleTypes.length}`
  );

  // 2) Read CSVs
  console.log("↻ Reading CSVs…");
  const testsRows = readCsv(testsCsv);
  const rangeRows = readCsv(rangesCsv);

  if (!testsRows.length) die("tests.csv is empty.");
  const testsHeaders = Object.keys(testsRows[0]);
  const nameHeaderPresent = testsHeaders.some((k) =>
    ["name", "test_name", "analyte_name"].includes(k.toLowerCase())
  );
  if (!nameHeaderPresent) {
    die(
      `tests.csv is missing a name column. Expected one of: name, test_name, analyte_name.
Headers found: ${testsHeaders.join(", ")}`
    );
  }

  if (!rangeRows.length) die("reference_ranges.csv is empty.");
  const rangeHeaders = Object.keys(rangeRows[0]);
  const rangeNameHeaderPresent = rangeHeaders.some((k) =>
    ["analyte_name", "test_name", "name"].includes(k.toLowerCase())
  );
  if (!rangeNameHeaderPresent) {
    die(
      `reference_ranges.csv is missing an analyte name column. Expected one of: analyte_name, test_name, name.
Headers found: ${rangeHeaders.join(", ")}`
    );
  }

  console.log(`   Tests: ${testsRows.length}, Ranges: ${rangeRows.length}`);

  // 3) Create/ensure tests
  console.log("\n=== Creating/Ensuring Tests ===");
  const createdByName = new Map(); // key: lowercased analyte name, val: test id

  // preload current tests to reduce calls
  const preload = await getJson(`${LAB}/tests`, TOKEN);
  const preloadByLcName = new Map();
  for (const t of preload) {
    const nm = t.test_name || t.name;
    if (nm) preloadByLcName.set(lc(nm), t);
  }

  for (const row of testsRows) {
    // Accept header variants
    const rawName = getFirstOf(row, ["name", "test_name", "analyte_name"]);
    if (!rawName) {
      console.error("! Skipping row with missing name:", row);
      continue;
    }
    const nameKey = lc(rawName);

    const unitSymbol = getFirstOf(row, ["unit_symbol", "unit", "unitabbr"]);
    const deptName =
      process.env.DEPARTMENT_OVERRIDE ||
      getFirstOf(row, ["department_name", "department"]);
    const sampleName = getFirstOf(row, ["sample_type_name", "sample_type", "specimen"]);

    // Lookups (case-insensitive)
    const unitId = getOrThrow(unitMap, unitSymbol, "unit");
    const deptId = getOrThrow(deptMap, deptName, "department");
    const sampleTypeId = getOrThrow(sampleTypeMap, sampleName, "sample type");

    let existing = preloadByLcName.get(nameKey);

    if (!existing) {
      const payload = {
        name: rawName,
        price: Number(row.price) || 0,
        unit_id: unitId,
        department_id: deptId,
        sample_type_id: sampleTypeId,
      };
      const res = await postJson(`${LAB}/tests`, TOKEN, payload);

      if (res.status === 201) {
        existing = await res.json();
        console.log(`✓ Created: ${rawName}`);
        preloadByLcName.set(nameKey, existing);
      } else if (res.status === 400 || res.status === 409) {
        // likely duplicate (race/unique)
        const all = await getJson(`${LAB}/tests`, TOKEN);
        const found = all.find((t) => lc(t.test_name || t.name) === nameKey);
        if (!found) {
          const txt = await res.text();
          throw new Error(
            `Failed to resolve existing test "${rawName}". Server said: ${res.status} ${txt}`
          );
        }
        existing = found;
        console.log(`• Exists:  ${rawName}`);
      } else {
        const txt = await res.text();
        throw new Error(`Create test failed for "${rawName}" -> ${res.status} ${txt}`);
      }
    } else {
      console.log(`• Exists:  ${rawName}`);
    }

    createdByName.set(nameKey, existing.id);
    await sleep(30);
  }

  // 4) Create reference ranges
  console.log("\n=== Creating Reference Ranges ===");
  for (const r of rangeRows) {
    const testName = getFirstOf(r, ["analyte_name", "test_name", "name"]);
    if (!testName) {
      console.warn("! Skipping range row with no analyte/test name:", r);
      continue;
    }

    const testId = createdByName.get(lc(testName));
    if (!testId) {
      console.warn(`! Skipping range; test not found for "${testName}"`);
      continue;
    }

    const unitSymbol = getFirstOf(r, ["unit_symbol", "unit", "unitabbr"]);

    const payload = {
      // the backend route /tests/:testId/ranges uses path param as source of truth
      test_id: testId, // harmless to send, server will ignore in favor of :testId
      range_type: r.range_type || "numeric",
      gender: r.gender || "Any",
      age_min: r.age_min !== "" && r.age_min != null ? Number(r.age_min) : null,
      age_max: r.age_max !== "" && r.age_max != null ? Number(r.age_max) : null,
      unit_id: unitSymbol ? getOrThrow(unitMap, unitSymbol, "unit") : null,
      min_value: r.min_value !== "" && r.min_value != null ? Number(r.min_value) : null,
      max_value: r.max_value !== "" && r.max_value != null ? Number(r.max_value) : null,
      symbol_operator: r.symbol_operator || null,
      qualitative_value: r.qualitative_value || null,
      note: r.note || null,
    };

    const res = await postJson(`${LAB}/tests/${testId}/ranges`, TOKEN, payload);
    if (res.status !== 201) {
      const txt = await res.text();
      console.warn(
        `! Range add failed (${res.status}) ${testName} [${payload.gender}${
          payload.note ? " / " + payload.note : ""
        }] -> ${txt}`
      );
    } else {
      console.log(
        `  ↳ range: ${testName} (${payload.gender}${payload.note ? " / " + payload.note : ""})`
      );
    }
    await sleep(25);
  }

  console.log("\n✅ Import complete.");
})().catch((err) => {
  console.error("\n💥 Import failed:", err.message);
  process.exit(1);
});
