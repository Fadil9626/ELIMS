const pool = require("../config/database");

// =============================================================
// 🧩 Error Helper
// =============================================================
const sendError = (res, handlerName, error, msg = "Internal Server Error") => {
  console.error(`❌ ${handlerName}:`, error.message);
  res.status(500).json({
    success: false,
    message: msg,
    error: error.message || "Unexpected error",
  });
};

// =============================================================
// 🧱 Ensure Schema (Safe Guard Setup)
// =============================================================
let schemaInitialized = false;

const ensureSchema = async () => {
  if (schemaInitialized) return;

  try {
    // --- Core columns on test_catalog (✅ FIXED: Added description column)
    await pool.query(`
      ALTER TABLE test_catalog
        ADD COLUMN IF NOT EXISTS is_panel BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS sample_type_id INTEGER REFERENCES sample_types(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS test_type TEXT DEFAULT 'quantitative',
        ADD COLUMN IF NOT EXISTS qualitative_value TEXT,
        ADD COLUMN IF NOT EXISTS description TEXT, -- ✅ Added this line
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    // --- Panel auto-recalc & Dynamic Price toggles
    await pool.query(`
      ALTER TABLE test_catalog
        ADD COLUMN IF NOT EXISTS panel_auto_recalc BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS price_is_dynamic BOOLEAN NOT NULL DEFAULT FALSE
    `);

    // --- Panel ↔ Analyte map
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_panel_analytes (
        id SERIAL PRIMARY KEY,
        panel_id INTEGER NOT NULL REFERENCES test_catalog(id) ON DELETE CASCADE,
        analyte_id INTEGER NOT NULL REFERENCES test_catalog(id) ON DELETE CASCADE,
        UNIQUE(panel_id, analyte_id)
      )
    `);

    // --- Normal ranges flexible columns
    await pool.query(`
      ALTER TABLE normal_ranges
        ADD COLUMN IF NOT EXISTS analyte_id INTEGER REFERENCES test_catalog(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS range_type TEXT DEFAULT 'numeric',
        ADD COLUMN IF NOT EXISTS qualitative_value TEXT,
        ADD COLUMN IF NOT EXISTS symbol_operator TEXT,
        ADD COLUMN IF NOT EXISTS range_label TEXT,
        ADD COLUMN IF NOT EXISTS note TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    // --- Panel range overrides
    await pool.query(`
      CREATE TABLE IF NOT EXISTS panel_range_overrides (
        id SERIAL PRIMARY KEY,
        panel_id INT NOT NULL REFERENCES test_catalog(id) ON DELETE CASCADE,
        analyte_id INT NOT NULL REFERENCES test_catalog(id) ON DELETE CASCADE,
        override_range JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(panel_id, analyte_id)
      )
    `);

    // --- Config Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sample_types (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wards (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        unit_name TEXT UNIQUE NOT NULL,
        symbol TEXT,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add columns if table already exists but is missing them
    await pool.query(`
      ALTER TABLE units
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    schemaInitialized = true;
  } catch (err) {
    console.error("❌ ensureSchema:", err.message);
    throw err;
  }
};

// Small helper
const toNumberOrNull = (v) =>
  v === undefined || v === null || v === "" ? null : Number(v);

// =============================================================
// 💰 PRICE CALCULATION HELPERS
// =============================================================

/**
 * Calculate total price from a list of analyte IDs (Used during creation/update)
 */
const calculatePanelPrice = async (client, analyteIds) => {
  if (!analyteIds || analyteIds.length === 0) return 0;
  
  // Fetch prices for all selected analytes
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(price), 0) as total 
     FROM test_catalog 
     WHERE id = ANY($1::int[])`,
    [analyteIds]
  );
  return Number(rows[0].total) || 0;
};

/**
 * Internal helper to recalculate and update a panel's price
 * from the sum of its existing database links.
 */
const _recalculatePanelPrice = async (panelId) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT SUM(tc.price)::numeric(10,2) AS total
      FROM test_panel_analytes tpa
      JOIN test_catalog tc ON tpa.analyte_id = tc.id
      WHERE tpa.panel_id = $1
      `,
      [panelId]
    );

    const total = Number(rows[0]?.total || 0);

    await pool.query(
      `
      UPDATE test_catalog
      SET price = $1, updated_at = NOW()
      WHERE id = $2 AND is_panel = TRUE
      `,
      [total, panelId]
    );

    console.log(`✅ Recalculated price for panel ${panelId} to ${total}`);
    return total;
  } catch (err) {
    console.error(`❌ Error recalculating price for panel ${panelId}:`, err.message);
  }
};

// =============================================================
// 🧪 TESTS / ANALYTES
// =============================================================
const getAllTests = async (req, res) => {
  try {
    await ensureSchema();

    const { rows } = await pool.query(`
      SELECT 
        tc.id,
        tc.name AS test_name,
        tc.name, -- alias for compatibility
        tc.price,
        tc.price_is_dynamic,
        tc.test_type,
        tc.qualitative_value,
        tc.is_active,
        tc.is_panel,
        tc.department_id,
        tc.sample_type_id,
        tc.unit_id,
        COALESCE(u.symbol, '') AS unit_symbol,
        COALESCE(u.unit_name, '') AS unit_name,
        COALESCE(d.name, 'General') AS department,
        COALESCE(st.name, '') AS sample_type
      FROM test_catalog tc
      LEFT JOIN units u ON u.id = tc.unit_id
      LEFT JOIN departments d ON d.id = tc.department_id
      LEFT JOIN sample_types st ON st.id = tc.sample_type_id
      ORDER BY tc.id DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, "getAllTests", err, "Failed to fetch all tests");
  }
};

const getAnalytes = async (req, res) => {
  try {
    await ensureSchema();

    const sql = `
      SELECT 
        t.id,
        t.name,
        t.price,
        t.is_active,
        t.is_panel,
        t.department_id,
        t.sample_type_id,
        t.unit_id,
        COALESCE(d.name, 'General') AS department_name,
        COALESCE(st.name, '') AS sample_type_name,
        COALESCE(u.symbol, '') AS unit_symbol
      FROM test_catalog t
      LEFT JOIN departments d ON d.id = t.department_id
      LEFT JOIN sample_types st ON st.id = t.sample_type_id
      LEFT JOIN units u ON u.id = t.unit_id
      WHERE t.is_panel = FALSE
      ORDER BY t.name
    `;

    const { rows } = await pool.query(sql);
    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, "getAnalytes", err, "Failed to fetch analytes");
  }
};

const createAnalyte = async (req, res) => {
  const { name, price, department_id, sample_type_id, unit_id, test_type, qualitative_value } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required" });
  }

  try {
    await ensureSchema();

    const { rows } = await pool.query(
      `
      INSERT INTO test_catalog 
        (name, price, is_active, is_panel, department_id, sample_type_id, unit_id, test_type, qualitative_value, created_at, updated_at)
      VALUES
        ($1, $2, TRUE, FALSE, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
      RETURNING *
      `,
      [
        name,
        toNumberOrNull(price) ?? 0,
        toNumberOrNull(department_id),
        toNumberOrNull(sample_type_id),
        toNumberOrNull(unit_id),
        test_type || 'quantitative',
        qualitative_value
      ]
    );

    if (rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "❗ Test with this name already exists",
      });
    }

    res.status(201).json({
      success: true,
      message: "✅ Analyte created successfully",
      data: rows[0],
    });
  } catch (err) {
    sendError(res, "createAnalyte", err, "Failed to create analyte");
  }
};

const updateAnalyte = async (req, res) => {
  const { id } = req.params;
  const { name, price, department_id, sample_type_id, unit_id, is_active, test_type, qualitative_value } = req.body;

  try {
    await ensureSchema();

    const { rows } = await pool.query(
      `
      UPDATE test_catalog
      SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        department_id = COALESCE($3, department_id),
        sample_type_id = COALESCE($4, sample_type_id),
        unit_id = COALESCE($5, unit_id),
        is_active = COALESCE($6, is_active),
        test_type = COALESCE($7, test_type),
        qualitative_value = COALESCE($8, qualitative_value),
        updated_at = NOW()
      WHERE id = $9 AND is_panel = FALSE
      RETURNING *
      `,
      [
        name || null,
        toNumberOrNull(price),
        toNumberOrNull(department_id),
        toNumberOrNull(sample_type_id),
        toNumberOrNull(unit_id),
        typeof is_active === "boolean" ? is_active : null,
        test_type,
        qualitative_value,
        id,
      ]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Analyte not found" });
    }

    // Recalculate parent panels if price changed
    if (price !== undefined) {
      console.log(`Price changed for analyte ${id}, finding parent panels...`);
      const { rows: parentPanels } = await pool.query(
        `
        SELECT tpa.panel_id
        FROM test_panel_analytes tpa
        JOIN test_catalog panel ON tpa.panel_id = panel.id
        WHERE tpa.analyte_id = $1 AND (panel.panel_auto_recalc = TRUE OR panel.price_is_dynamic = TRUE)
        `,
        [id]
      );

      for (const panel of parentPanels) {
        await _recalculatePanelPrice(panel.panel_id);
      }
    }

    res.json({
      success: true,
      message: "✅ Analyte updated successfully",
      data: rows[0],
    });
  } catch (err) {
    sendError(res, "updateAnalyte", err, "Failed to update analyte");
  }
};

// TOGGLE STATUS (Generic for Tests and Panels)
const toggleTestStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      "UPDATE test_catalog SET is_active = $1 WHERE id = $2 RETURNING *",
      [is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Test not found" });
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    sendError(res, "toggleStatus", err, "Failed to toggle status");
  }
};

const deleteAnalyte = async (req, res) => {
  const { id } = req.params;

  try {
    await ensureSchema();

    const { rows: kind } = await pool.query(
      `
      SELECT is_panel
      FROM test_catalog
      WHERE id = $1
      `,
      [id]
    );

    if (!kind.length) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    if (kind[0].is_panel) {
      return res.status(400).json({
        success: false,
        message: "Use panel endpoints to remove a panel.",
      });
    }

    const { rows: r1 } = await pool.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM test_request_items
      WHERE test_catalog_id = $1
      `,
      [id]
    );

    const { rows: r2 } = await pool.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM test_panel_analytes
      WHERE analyte_id = $1
      `,
      [id]
    );

    const inUse = (r1[0]?.cnt ?? 0) > 0 || (r2[0]?.cnt ?? 0) > 0;

    if (inUse) {
      const { rows } = await pool.query(
        `
        UPDATE test_catalog
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, is_active
        `,
        [id]
      );

      return res.status(200).json({
        success: true,
        soft_deleted: true,
        message:
          "Analyte is referenced by requests or panels. It has been deactivated instead of deleted.",
        data: rows[0],
      });
    }

    const del = await pool.query(
      `
      DELETE FROM test_catalog
      WHERE id = $1
      `,
      [id]
    );

    if (del.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    res.json({
      success: true,
      soft_deleted: false,
      message: "Analyte deleted successfully.",
    });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        message:
          "This analyte cannot be deleted because it is referenced by other items. It has been kept.",
        error: err.detail,
      });
    }
    sendError(res, "deleteAnalyte", err, "Failed to delete analyte");
  }
};

// =============================================================
// 🧩 PANELS
// =============================================================
const getPanels = async (req, res) => {
  try {
    await ensureSchema();

    const { rows } = await pool.query(`
      SELECT 
        tc.id,
        tc.name,
        tc.department_id,
        tc.price,
        tc.price_is_dynamic,
        tc.is_active,
        tc.panel_auto_recalc,
        tc.description,
        COALESCE(d.name, 'General') AS department_name,
        COALESCE(
          json_agg(
            json_build_object('id', a.id, 'name', a.name, 'price', a.price)
          ) FILTER (WHERE a.id IS NOT NULL), 
          '[]'
        ) as analytes
      FROM test_catalog tc
      LEFT JOIN departments d ON d.id = tc.department_id
      LEFT JOIN test_panel_analytes tpa ON tc.id = tpa.panel_id
      LEFT JOIN test_catalog a ON tpa.analyte_id = a.id
      WHERE tc.is_panel = TRUE
      GROUP BY tc.id, d.name
      ORDER BY tc.name
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, "getPanels", err, "Failed to fetch panels");
  }
};

const createPanel = async (req, res) => {
  const { name, department_id, price, panel_auto_recalc, price_is_dynamic, analyte_ids, description } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Panel name is required" });
  }

  const client = await pool.connect();
  try {
    await ensureSchema();
    await client.query('BEGIN');

    // 1. Determine Final Price
    let finalPrice = Number(price) || 0;
    
    // If price is dynamic, calculate sum of analytes
    if (price_is_dynamic === true && analyte_ids && analyte_ids.length > 0) {
       finalPrice = await calculatePanelPrice(client, analyte_ids);
    }

    const { rows } = await client.query(
      `
      INSERT INTO test_catalog
        (name, department_id, price, price_is_dynamic, is_active, is_panel, panel_auto_recalc, description, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, TRUE, TRUE, COALESCE($5, FALSE), $6, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
      RETURNING *
      `,
      [
        name,
        toNumberOrNull(department_id),
        finalPrice,
        !!price_is_dynamic,
        !!panel_auto_recalc,
        description
      ]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: "❗ Panel with this name already exists",
      });
    }

    const panelId = rows[0].id;

    // 3. Link Analytes
    if (analyte_ids && analyte_ids.length > 0) {
      for (const analyteId of analyte_ids) {
        await client.query(
          `INSERT INTO test_panel_analytes (panel_id, analyte_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [panelId, analyteId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: "✅ Panel created successfully",
      data: rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    sendError(res, "createPanel", err, "Failed to create panel");
  } finally {
    client.release();
  }
};

const updatePanel = async (req, res) => {
  const { id } = req.params;
  const { name, price, department_id, is_active, panel_auto_recalc, price_is_dynamic, analyte_ids, description } = req.body;

  const client = await pool.connect();
  try {
    await ensureSchema();
    await client.query('BEGIN');

    // 1. Determine Final Price (Recalculate if Dynamic)
    let finalPrice = Number(price) || 0;
    
    // If price_is_dynamic is explicitly set to true, force calculation
    if (price_is_dynamic === true && analyte_ids && analyte_ids.length > 0) {
       finalPrice = await calculatePanelPrice(client, analyte_ids);
    } else if (price_is_dynamic === undefined) {
        // Use existing price if undefined
        const current = await client.query('SELECT price_is_dynamic, price FROM test_catalog WHERE id = $1', [id]);
        if (current.rows[0]?.price_is_dynamic && analyte_ids) {
             finalPrice = await calculatePanelPrice(client, analyte_ids);
        } else {
             finalPrice = price !== undefined ? price : current.rows[0]?.price;
        }
    }

    const { rows } = await client.query(
      `
      UPDATE test_catalog
      SET
        name = COALESCE($1, name),
        price = $2,
        department_id = COALESCE($3, department_id),
        is_active = COALESCE($4, is_active),
        panel_auto_recalc = COALESCE($5, panel_auto_recalc),
        price_is_dynamic = COALESCE($6, price_is_dynamic),
        description = COALESCE($7, description),
        updated_at = NOW()
      WHERE id = $8 AND is_panel = TRUE
      RETURNING *
      `,
      [
        name || null,
        finalPrice,
        toNumberOrNull(department_id),
        typeof is_active === "boolean" ? is_active : null,
        typeof panel_auto_recalc === "boolean" ? panel_auto_recalc : null,
        typeof price_is_dynamic === "boolean" ? price_is_dynamic : null,
        description,
        id,
      ]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ success: false, message: "Panel not found" });
    }

    // 3. Update Links
    if (analyte_ids) {
      await client.query(`DELETE FROM test_panel_analytes WHERE panel_id = $1`, [id]);
      
      if (analyte_ids.length > 0) {
        for (const analyteId of analyte_ids) {
          await client.query(
            `INSERT INTO test_panel_analytes (panel_id, analyte_id) VALUES ($1, $2)`,
            [id, analyteId]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: "✅ Panel updated",
      data: rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    sendError(res, "updatePanel", err, "Failed to update panel");
  } finally {
    client.release();
  }
};

const recalcPanelPrice = async (req, res) => {
  const { id } = req.params;

  try {
    await ensureSchema();

    const total = await _recalculatePanelPrice(id);
    res.json({
      success: true,
      message: "✅ Panel price recalculated",
      total,
    });
  } catch (err) {
    sendError(res, "recalcPanelPrice", err, "Failed to recalc panel price");
  }
};

// 🔗 PANEL–ANALYTE LINKING
const getPanelAnalytes = async (req, res) => {
  const { id } = req.params;

  try {
    await ensureSchema();

    const { rows } = await pool.query(
      `
      SELECT 
        a.id,
        a.name,
        a.price,
        a.is_active,
        COALESCE(
          json_agg(
            json_build_object(
              'id', nr.id,
              'range_type', nr.range_type,
              'min_value', nr.min_value,
              'max_value', nr.max_value,
              'qualitative_value', nr.qualitative_value,
              'symbol_operator', nr.symbol_operator,
              'gender', nr.gender,
              'min_age', nr.min_age,
              'max_age', nr.max_age,
              'range_label', nr.range_label,
              'note', nr.note
            )
          ) FILTER (WHERE nr.id IS NOT NULL),
          '[]'
        ) AS normal_ranges
      FROM test_panel_analytes tpa
      JOIN test_catalog a ON a.id = tpa.analyte_id
      LEFT JOIN normal_ranges nr ON nr.analyte_id = a.id
      WHERE tpa.panel_id = $1
      GROUP BY a.id
      ORDER BY a.name
      `,
      [id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, "getPanelAnalytes", err, "Failed to fetch panel analytes");
  }
};

const addPanelAnalyte = async (req, res) => {
  const { id } = req.params; // panel id
  const analyteId = req.body.analyte_id || req.body.analyteId;

  if (!analyteId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing analyte ID" });
  }

  try {
    await ensureSchema();

    // Add link
    await pool.query(
      `
      INSERT INTO test_panel_analytes (panel_id, analyte_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [id, analyteId]
    );

    // Auto recalc if enabled OR price is dynamic
    const { rows: p } = await pool.query(
      `
      SELECT panel_auto_recalc, price_is_dynamic
      FROM test_catalog
      WHERE id = $1 AND is_panel = TRUE
      `,
      [id]
    );

    if (p[0]?.panel_auto_recalc || p[0]?.price_is_dynamic) {
      await _recalculatePanelPrice(id);
    }

    res.json({
      success: true,
      message: "✅ Analyte added to panel successfully.",
    });
  } catch (err) {
    sendError(res, "addPanelAnalyte", err, "Failed to add analyte to panel");
  }
};

const removePanelAnalyte = async (req, res) => {
  const { id: panelId, analyte_id: analyteId } = req.params;

  try {
    await ensureSchema();

    const result = await pool.query(
      `
      DELETE FROM test_panel_analytes
      WHERE panel_id = $1 AND analyte_id = $2
      `,
      [panelId, analyteId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Analyte not found in panel",
      });
    }

    // Auto recalc if enabled
    const { rows: p } = await pool.query(
      `
      SELECT panel_auto_recalc, price_is_dynamic
      FROM test_catalog
      WHERE id = $1 AND is_panel = TRUE
      `,
      [panelId]
    );

    if (p[0]?.panel_auto_recalc || p[0]?.price_is_dynamic) {
      await _recalculatePanelPrice(panelId);
    }

    res.json({
      success: true,
      message: "🗑️ Analyte removed from panel successfully.",
    });
  } catch (err) {
    sendError(
      res,
      "removePanelAnalyte",
      err,
      "Failed to remove analyte from panel"
    );
  }
};

// =============================================================
// 🧠 PANEL RANGE OVERRIDES
// =============================================================
const getPanelRanges = async (req, res) => {
  const { id } = req.params;

  try {
    const sql = `
      SELECT
        tpa.analyte_id,
        a.name AS analyte_name,
        COALESCE(pro.override_range, json_agg(nr.*)) AS range_data
      FROM test_panel_analytes tpa
      JOIN test_catalog a ON a.id = tpa.analyte_id
      LEFT JOIN normal_ranges nr ON nr.analyte_id = a.id
      LEFT JOIN panel_range_overrides pro 
        ON pro.panel_id = tpa.panel_id AND pro.analyte_id = a.id
      WHERE tpa.panel_id = $1
      GROUP BY tpa.analyte_id, a.name, pro.override_range
      ORDER BY a.name ASC
    `;

    const { rows } = await pool.query(sql, [id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, "getPanelRanges", err, "Failed to fetch panel ranges");
  }
};

const setPanelRangeOverride = async (req, res) => {
  const { id, analyte_id } = req.params;
  const { override_range } = req.body;

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO panel_range_overrides (panel_id, analyte_id, override_range)
      VALUES ($1, $2, $3)
      ON CONFLICT (panel_id, analyte_id)
      DO UPDATE
        SET override_range = EXCLUDED.override_range,
            updated_at = NOW()
      RETURNING *
      `,
      [id, analyte_id, override_range]
    );

    res.json({
      success: true,
      data: rows[0],
      message: "✅ Override saved",
    });
  } catch (err) {
    sendError(
      res,
      "setPanelRangeOverride",
      err,
      "Failed to set override"
    );
  }
};

const deletePanelRangeOverride = async (req, res) => {
  const { id, analyte_id } = req.params;

  try {
    await pool.query(
      `
      DELETE FROM panel_range_overrides
      WHERE panel_id = $1 AND analyte_id = $2
      `,
      [id, analyte_id]
    );

    res.json({
      success: true,
      message: "🗑️ Override removed",
    });
  } catch (err) {
    sendError(
      res,
      "deletePanelRangeOverride",
      err,
      "Failed to delete override"
    );
  }
};

// =============================================================
// 🧠 NORMAL RANGES
// =============================================================
const getNormalRanges = async (req, res) => {
  const analyteId = parseInt(req.params.id, 10);

  if (isNaN(analyteId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid analyte ID" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        nr.id,
        nr.analyte_id,
        a.name AS analyte_name,
        nr.range_type,
        nr.min_value,
        nr.max_value,
        nr.qualitative_value,
        nr.symbol_operator,
        nr.gender,
        nr.min_age,
        nr.max_age,
        nr.range_label,
        nr.note,
        nr.created_at,
        nr.updated_at,
        u.unit_name,
        u.symbol AS unit_symbol
      FROM normal_ranges nr
      LEFT JOIN test_catalog a ON a.id = nr.analyte_id
      LEFT JOIN units u ON u.id = nr.unit_id
      WHERE nr.analyte_id = $1
      ORDER BY nr.gender, nr.min_age, nr.range_label
      `,
      [analyteId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, "getNormalRanges", err, "Failed to fetch analyte ranges");
  }
};

const createNormalRange = async (req, res) => {
  const analyteId = parseInt(req.params.id, 10);

  if (isNaN(analyteId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid analyte ID" });
  }

  const {
    range_type = "numeric",
    min_value,
    max_value,
    qualitative_value,
    symbol_operator,
    gender = "Any",
    min_age,
    max_age,
    range_label,
    note,
    unit_id,
  } = req.body;

  try {
    await ensureSchema();

    const { rows } = await pool.query(
      `
      INSERT INTO normal_ranges (
        analyte_id,
        range_type,
        min_value,
        max_value,
        qualitative_value,
        symbol_operator,
        gender,
        min_age,
        max_age,
        range_label,
        note,
        unit_id,
        created_at,
        updated_at
      )
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
      RETURNING *
      `,
      [
        analyteId,
        range_type,
        range_type === "numeric" ? toNumberOrNull(min_value) : null,
        range_type === "numeric" ? toNumberOrNull(max_value) : null,
        range_type === "qualitative" ? qualitative_value ?? null : null,
        symbol_operator || null,
        gender || null,
        toNumberOrNull(min_age),
        toNumberOrNull(max_age),
        range_label || null,
        note || null,
        toNumberOrNull(unit_id),
      ]
    );

    res.status(201).json({
      success: true,
      message: "✅ Range created successfully",
      data: rows[0],
    });
  } catch (err) {
    sendError(res, "createNormalRange", err, "Failed to create normal range");
  }
};

const updateNormalRange = async (req, res) => {
  const { rangeId } = req.params;

  const {
    range_type,
    min_value,
    max_value,
    qualitative_value,
    symbol_operator,
    gender,
    min_age,
    max_age,
    range_label,
    note,
    unit_id,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `
      UPDATE normal_ranges
      SET
        range_type = COALESCE($1, range_type),
        min_value = $2,
        max_value = $3,
        qualitative_value = $4,
        symbol_operator = $5,
        gender = COALESCE($6, gender),
        min_age = $7,
        max_age = $8,
        range_label = $9,
        note = $10,
        unit_id = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
      `,
      [
        range_type || null,
        range_type === "numeric" ? toNumberOrNull(min_value) : null,
        range_type === "numeric" ? toNumberOrNull(max_value) : null,
        range_type === "qualitative" ? qualitative_value ?? null : null,
        symbol_operator || null,
        gender || null,
        toNumberOrNull(min_age),
        toNumberOrNull(max_age),
        range_label || null,
        note || null,
        toNumberOrNull(unit_id),
        rangeId,
      ]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Range not found" });
    }

    res.json({
      success: true,
      data: rows[0],
      message: "✅ Range updated",
    });
  } catch (err) {
    sendError(res, "updateNormalRange", err, "Failed to update range");
  }
};

const deleteNormalRange = async (req, res) => {
  const { rangeId } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM normal_ranges
      WHERE id = $1
      RETURNING id
      `,
      [rangeId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Range not found" });
    }

    res.json({
      success: true,
      message: "🗑️ Range deleted",
    });
  } catch (err) {
    sendError(res, "deleteNormalRange", err, "Failed to delete range");
  }
};

// =============================================================
// ⚙️ CONFIG TABLES (Units / Departments / Sample Types / Wards)
// =============================================================
const getAllUnits = async (req, res) => {
  try {
    await ensureSchema(); // Ensure units table exists
    const { rows } = await pool.query(`
      SELECT 
        id,
        symbol,
        unit_name,
        description
      FROM units
      ORDER BY symbol
    `);
    
    res.json(rows);
  } catch (err) {
    sendError(res, "getAllUnits", err, "Failed to fetch units");
  }
};

// 🚀 --- NEW FUNCTIONS FOR UNITS --- 🚀

const createUnit = async (req, res) => {
  const { unit_name, symbol, description } = req.body;

  if (!unit_name) {
    return res
      .status(400)
      .json({ success: false, message: "Unit name is required" });
  }

  try {
    await ensureSchema(); // Ensure units table exists
    const { rows } = await pool.query(
      `
      INSERT INTO units (unit_name, symbol, description, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (unit_name) DO NOTHING
      RETURNING *
      `,
      [unit_name, symbol || null, description || null]
    );

    if (!rows.length) {
      return res.status(409).json({
        success: false,
        message: "Unit with this name already exists",
      });
    }

    res.status(201).json({
      success: true,
      data: rows[0],
      message: "✅ Unit created",
    });
  } catch (err) {
    sendError(res, "createUnit", err, "Failed to create unit");
  }
};

const updateUnit = async (req, res) => {
  const { id } = req.params;
  const { unit_name, symbol, description } = req.body;

  try {
    await ensureSchema(); // Ensure units table exists
    const { rows } = await pool.query(
      `
      UPDATE units
      SET
        unit_name = COALESCE($1, unit_name),
        symbol = COALESCE($2, symbol),
        description = COALESCE($3, description),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [unit_name || null, symbol || null, description || null, id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Unit not found" });
    }

    res.json({
      success: true,
      data: rows[0],
      message: "✅ Unit updated",
    });
  } catch (err) {
    sendError(res, "updateUnit", err, "Failed to update unit");
  }
};

const deleteUnit = async (req, res) => {
  const { id } = req.params;

  try {
    await ensureSchema(); // Ensure units table exists
    await pool.query(
      `
      DELETE FROM units
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Unit deleted",
    });
  } catch (err) {
    // Handle foreign key violation (if unit is in use)
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        message:
          "This unit cannot be deleted because it is referenced by other items.",
        error: err.detail,
      });
    }
    sendError(res, "deleteUnit", err, "Failed to delete unit");
  }
};


// ---- Departments
const getDepartments = async (req, res) => {
  try {
    await ensureSchema();

    const { rows } = await pool.query(`
      SELECT id, name, description
      FROM departments
      ORDER BY name
    `);

    res.json(rows);
  } catch (err) {
    sendError(res, "getDepartments", err, "Failed to fetch departments");
  }
};

const createDepartment = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required" });
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO departments (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING
      RETURNING *
      `,
      [name, description || null]
    );

    if (!rows.length) {
      return res.status(409).json({
        success: false,
        message: "Department already exists",
      });
    }

    res.status(201).json({
      success: true,
      data: rows[0],
      message: "✅ Department created",
    });
  } catch (err) {
    sendError(res, "createDepartment", err, "Failed to create department");
  }
};

const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { rows } = await pool.query(
      `
      UPDATE departments
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description)
      WHERE id = $3
      RETURNING *
      `,
      [name || null, description || null, id]
    );

    if (!rows.length) {
      return res
        .status(404) 
        .json({ success: false, message: "Department not found" });
    }

    res.json({
      success: true,
      data: rows[0],
      message: "✅ Department updated",
    });
  } catch (err) {
    sendError(res, "updateDepartment", err, "Failed to update department");
  }
};

const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `
      DELETE FROM departments
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Department deleted",
    });
  } catch (err) {
    sendError(res, "deleteDepartment", err, "Failed to delete department");
  }
};

// ---- Sample Types
const getSampleTypes = async (req, res) => {
  try {
    await ensureSchema();

    const { rows } = await pool.query(`
      SELECT id, name, description
      FROM sample_types
      ORDER BY name
    `);

    res.json(rows);
  } catch (err) {
    sendError(res, "getSampleTypes", err, "Failed to fetch sample types");
  }
};

const createSampleType = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required" });
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO sample_types (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING
      RETURNING *
      `,
      [name, description || null]
    );

    if (!rows.length) {
      return res.status(409).json({
        success: false,
        message: "Sample type already exists",
      });
    }

    res.status(201).json({
      success: true,
      data: rows[0],
      message: "✅ Sample type created",
      });
  } catch (err) {
    sendError(res, "createSampleType", err, "Failed to create sample type");
  }
};

const updateSampleType = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { rows } = await pool.query(
      `
      UPDATE sample_types
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description)
      WHERE id = $3
      RETURNING *
      `,
      [name || null, description || null, id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Sample type not found" });
    }

    res.json({
      success: true,
      data: rows[0],
      message: "✅ Sample type updated",
    });
  } catch (err) {
    sendError(res, "updateSampleType", err, "Failed to update sample type");
  }
};

const deleteSampleType = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `
      DELETE FROM sample_types
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Sample type deleted",
    });
  } catch (err) {
    sendError(res, "deleteSampleType", err, "Failed to delete sample type");
  }
};

// ---- Wards
const getWards = async (req, res) => {
  try {
    await ensureSchema();

    const { rows } = await pool.query(`
      SELECT id, name, description
      FROM wards
      ORDER BY name
    `);

    res.json(rows); 
  } catch (err) {
    sendError(res, "getWards", err, "Failed to fetch wards");
  }
};

const createWard = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO wards (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { sendError(res, "createWard", err); }
};

const updateWard = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    await pool.query("UPDATE wards SET name = $1 WHERE id = $2", [name, id]);
    res.json({ message: "Ward updated" });
  } catch (err) { sendError(res, "updateWard", err); }
};

const deleteWard = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM wards WHERE id = $1", [id]);
    res.json({ message: "Ward deleted" });
  } catch (err) { sendError(res, "deleteWard", err); }
};


// =============================================================
// ✅ EXPORT MODULE
// =============================================================
module.exports = {
  // 🧪 Tests / Analytes
  getAllTests,
  getAnalytes,
  createAnalyte,
  updateAnalyte,
  deleteAnalyte,
  toggleTestStatus,

  // 🧩 Panels
  getPanels,
  createPanel,
  updatePanel,
  recalcPanelPrice,
  getPanelAnalytes,
  addPanelAnalyte,
  removePanelAnalyte,

  // 🧠 Panel Range Overrides
  getPanelRanges,
  setPanelRangeOverride,
  deletePanelRangeOverride,

  // 🧠 Normal Ranges
  getNormalRanges,
  createNormalRange,
  updateNormalRange,
  deleteNormalRange,

  // ⚙️ Config Tables
  getAllUnits,
  createUnit,   
  updateUnit,   
  deleteUnit,   

  // Departments
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Sample Types
  getSampleTypes,
  createSampleType,
  updateSampleType,
  deleteSampleType,

  // Wards
  getWards,
  createWard,
  updateWard,
  deleteWard,
};