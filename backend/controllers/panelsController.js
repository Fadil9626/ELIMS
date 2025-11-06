const pool = require("../config/database");

/* ============================================================
 * 🧱 Ensure schema we rely on (idempotent)
 * ========================================================== */
const ensureIsPanelColumn = async () => {
  await pool.query(`
    ALTER TABLE test_catalog
    ADD COLUMN IF NOT EXISTS is_panel BOOLEAN NOT NULL DEFAULT FALSE
  `);
};

/* ============================================================
 * 🔹 PANELS CRUD OPERATIONS
 * ============================================================ */

// 🧾 Get all panels (is_panel = true)
const getPanels = async (req, res) => {
  try {
    await ensureIsPanelColumn();
    const result = await pool.query(`
      SELECT
        tc.id,
        tc.name,
        tc.description,
        tc.is_active,
        COALESCE(pm.cnt, 0)::int AS analyte_count
      FROM test_catalog tc
      LEFT JOIN (
        SELECT panel_id, COUNT(*) AS cnt
        FROM panel_members
        GROUP BY panel_id
      ) pm ON pm.panel_id = tc.id
      WHERE tc.is_panel = TRUE
      ORDER BY tc.name ASC;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ getPanels Error:", error);
    res.status(500).json({ message: "Failed to fetch panels: " + error.message });
  }
};

// ➕ Create a new panel (Sets is_panel = true)
const createPanel = async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "Panel name is required" });
  }

  try {
    await ensureIsPanelColumn();
    const result = await pool.query(
      `
      INSERT INTO test_catalog (name, description, price, is_active, is_panel)
      VALUES ($1, $2, 0, TRUE, TRUE)
      RETURNING id, name, description, is_active, is_panel;
      `,
      [name.trim(), description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ createPanel Error:", error);
    if (error.code === '23505') {
      return res.status(400).json({ message: `A test or panel named "${name}" already exists.` });
    }
    res.status(500).json({ message: "Failed to create panel: " + error.message });
  }
};

// ✏️ Update an existing panel (updates test_catalog)
const updatePanel = async (req, res) => {
  const panelId = parseInt(req.params.id, 10);
  const { name, description } = req.body;

  if (!Number.isFinite(panelId)) {
    return res.status(400).json({ message: "Invalid Panel ID" });
  }
  if (!name?.trim()) {
    return res.status(400).json({ message: "Panel name cannot be empty" });
  }

  try {
    await ensureIsPanelColumn();
    const result = await pool.query(
      `
      UPDATE test_catalog
      SET name = $1, description = $2
      WHERE id = $3 AND is_panel = TRUE
      RETURNING id, name, description, is_active, is_panel;
      `,
      [name.trim(), description || null, panelId]
    );

    if (result.rowCount === 0) {
      const checkExists = await pool.query(
        'SELECT is_panel FROM test_catalog WHERE id = $1',
        [panelId]
      );
      if (checkExists.rowCount > 0 && checkExists.rows[0].is_panel === false) {
        return res.status(400).json({ message: `Item ID ${panelId} exists but is not marked as a panel.` });
      }
      return res.status(404).json({ message: "Panel not found in Test Catalog or not marked as a panel." });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ updatePanel Error:", error);
    if (error.code === '23505' && error.constraint === 'test_catalog_name_key') {
      return res.status(400).json({ message: `Another test or panel with the name "${name}" already exists.` });
    }
    res.status(500).json({ message: "Failed to update panel: " + error.message });
  }
};

// 🗑️ Delete a panel and its analyte links (FK-safe: soft delete if referenced)
const deletePanel = async (req, res) => {
  const panelId = parseInt(req.params.id, 10);
  if (!Number.isFinite(panelId)) {
    return res.status(400).json({ message: "Invalid Panel ID" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Confirm it's a panel
    const { rows: panelRows } = await client.query(
      `SELECT id, name, is_panel, is_active FROM test_catalog WHERE id = $1`,
      [panelId]
    );
    if (panelRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Panel not found or already deleted" });
    }
    if (panelRows[0].is_panel !== true) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "This item is not a panel." });
    }

    // Count references
    const { rows: refRows } = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM test_request_items WHERE test_catalog_id = $1`,
      [panelId]
    );
    const inUse = (refRows[0]?.cnt ?? 0) > 0;

    // Always remove panel_members links
    await client.query(`DELETE FROM panel_members WHERE panel_id = $1`, [panelId]);

    if (inUse) {
      // Soft delete: deactivate panel, keep catalog row
      await client.query(
        `UPDATE test_catalog SET is_active = FALSE WHERE id = $1 AND is_panel = TRUE`,
        [panelId]
      );
      await client.query('COMMIT');
      return res.status(200).json({
        message:
          "Panel is referenced by existing test requests. It has been deactivated and its analyte associations were removed.",
        soft_deleted: true,
        id: panelId,
      });
    }

    // Hard delete: safe when no references
    const del = await client.query(
      `DELETE FROM test_catalog WHERE id = $1 AND is_panel = TRUE`,
      [panelId]
    );
    await client.query('COMMIT');

    if (del.rowCount === 0) {
      return res.status(404).json({ message: "Panel not found or not marked as a panel" });
    }

    res.json({
      message: "Panel and its associations deleted successfully",
      soft_deleted: false,
      id: panelId,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ deletePanel Error:", error);
    if (error.code === '23503') {
      return res.status(400).json({
        message:
          "Cannot delete: This panel is referenced in existing test requests. It has not been removed.",
      });
    }
    res.status(500).json({ message: "Failed to delete panel: " + error.message });
  } finally {
    client.release();
  }
};

/* ============================================================
 * 🔹 ANALYTE / TEST MANAGEMENT (Using panel_members)
 * ============================================================ */

// 🧠 Get analytes linked to a specific panel
const getAnalytesForPanel = async (req, res) => {
  const { panelId } = req.params;
  if (!Number.isFinite(Number(panelId))) {
    return res.status(400).json({ message: "Invalid Panel ID" });
  }
  try {
    const result = await pool.query(
      `
      SELECT
        tc.id,
        tc.name AS test_name,
        tc.price,
        u.unit_name,
        u.symbol AS unit_symbol,
        d.name AS department_name
      FROM panel_members pm
      JOIN test_catalog tc   ON tc.id = pm.member_id
      LEFT JOIN units u       ON u.id = tc.unit_id
      LEFT JOIN departments d ON d.id = tc.department_id
      WHERE pm.panel_id = $1
      ORDER BY tc.name ASC;
      `,
      [panelId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ getAnalytesForPanel Error:", error);
    res.status(500).json({ message: "Failed to fetch analytes for panel: " + error.message });
  }
};

// ➕ Add analyte to a panel
const addAnalyteToPanel = async (req, res) => {
  const { panelId } = req.params;
  const { analyteId } = req.body;

  const pid = Number(panelId);
  const aid = Number(analyteId);

  if (!Number.isFinite(pid)) {
    return res.status(400).json({ message: "Invalid panelId" });
  }
  if (!Number.isFinite(aid)) {
    return res.status(400).json({ message: "Analyte ID (member_id) is required and must be numeric." });
  }

  try {
    // Verify: panel is a panel; analyte is NOT a panel; both exist
    const { rows: checks } = await pool.query(
      `SELECT id, is_panel FROM test_catalog WHERE id = ANY($1::int[])`,
      [[pid, aid]]
    );
    const panelRow = checks.find(r => r.id === pid);
    const analyteRow = checks.find(r => r.id === aid);

    if (!panelRow) {
      return res.status(404).json({ message: `Panel ID ${pid} does not exist.` });
    }
    if (!panelRow.is_panel) {
      return res.status(400).json({ message: `Item ID ${pid} is not a panel.` });
    }
    if (!analyteRow) {
      return res.status(404).json({ message: `Analyte ID ${aid} does not exist.` });
    }
    if (analyteRow.is_panel) {
      return res.status(400).json({ message: `Cannot add a panel (ID ${aid}) as an analyte.` });
    }

    await pool.query(
      `
      INSERT INTO panel_members (panel_id, member_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
      `,
      [pid, aid]
    );
    res.status(201).json({ message: "Analyte added to panel successfully" });
  } catch (error) {
    console.error("❌ addAnalyteToPanel Error:", error);
    if (error.code === '23503') {
      return res.status(400).json({
        message: "Failed to add analyte: Ensure both the panel and the analyte IDs exist in the Test Catalog."
      });
    }
    res.status(500).json({ message: "Failed to add analyte: " + error.message });
  }
};

// ❌ Remove analyte from a panel
const removeAnalyteFromPanel = async (req, res) => {
  const { panelId, analyteId } = req.params;
  const pid = Number(panelId);
  const aid = Number(analyteId);

  if (!Number.isFinite(pid) || !Number.isFinite(aid)) {
    return res.status(400).json({ message: "Invalid panelId or analyteId" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM panel_members WHERE panel_id = $1 AND member_id = $2`,
      [pid, aid]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Analyte association not found in this panel" });
    }
    res.json({ message: "Analyte removed from panel successfully" });
  } catch (error) {
    console.error("❌ removeAnalyteFromPanel Error:", error);
    res.status(500).json({ message: "Failed to remove analyte: " + error.message });
  }
};

/* ============================================================
 * ✅ EXPORT MODULE
 * ============================================================ */
module.exports = {
  getPanels,
  createPanel,
  updatePanel,
  deletePanel,
  getAnalytesForPanel,
  addAnalyteToPanel,
  removeAnalyteFromPanel,
};
