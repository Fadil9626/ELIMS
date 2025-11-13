// backend/migrations/seeds/seedRunner.js
const pool = require("../../src/config/database");
const chemistryTests = require("./chemistryTests");
const normalRanges = require("./normalRanges");
const panels = require("./panels");

async function seedChemistry() {
  console.log("🌱 Seeding Chemistry Analytes, Normal Ranges, and Panels...");

  try {
    // 🧪 1. Insert or update chemistry analytes
    const testIds = {};
    for (const test of chemistryTests) {
      const res = await pool.query(
        `INSERT INTO test_catalog (name, unit_id, department_id, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (name) DO UPDATE SET is_active = TRUE
         RETURNING id`,
        [test.name, test.unit_id, test.department_id]
      );

      const testId = res.rows[0].id;
      testIds[test.name] = testId;

      // Normal Ranges
      const related = normalRanges.filter((r) => r.name === test.name);
      for (const r of related) {
        await pool.query(
          `INSERT INTO normal_ranges (test_catalog_id, gender, min_value, max_value)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [testId, r.gender, r.min, r.max]
        );
      }
    }

    // 🧩 2. Insert Chemistry Panels
    for (const panel of panels) {
      const { rows } = await pool.query(
        `INSERT INTO panels (name, description, department_id, is_active)
         VALUES ($1, $2, 1, TRUE)
         ON CONFLICT (name) DO UPDATE SET is_active = TRUE
         RETURNING id`,
        [panel.name, panel.description]
      );
      const panelId = rows[0].id;

      // Link analytes to panel_items
      for (const analyteName of panel.analytes) {
        const testId = testIds[analyteName];
        if (!testId) {
          console.warn(`⚠️ Missing analyte ${analyteName} for panel ${panel.name}`);
          continue;
        }
        await pool.query(
          `INSERT INTO panel_items (panel_id, test_catalog_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [panelId, testId]
        );
      }

      console.log(`✅ Panel: ${panel.name} linked to ${panel.analytes.length} analytes`);
    }

    console.log("✅ Chemistry analytes, normal ranges & panels successfully seeded!");
  } catch (err) {
    console.error("❌ Error in seedChemistry:", err.message);
  } finally {
    pool.end();
  }
}

seedChemistry();
