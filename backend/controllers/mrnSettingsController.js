// controllers/settingsMrnController.js (or wherever you keep this)
const pool = require("../config/database");
const { logAuditEvent } = require("../utils/auditLogger");

// Ensure we always have a single MRN settings row
const ensureMRNSettingsRow = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM mrn_settings ORDER BY id LIMIT 1`
  );

  if (rows.length > 0) return rows[0];

  const insertRes = await pool.query(
    `
    INSERT INTO mrn_settings (facility_code, reset_yearly, last_sequence)
    VALUES ($1, $2, $3)
    RETURNING *;
  `,
    ["MTD", true, 0]
  );

  return insertRes.rows[0];
};

/**
 * @desc Get MRN settings
 * @route GET /api/settings/mrn
 * @access Private (Admin only)
 */
const getMRNSettings = async (req, res) => {
  try {
    const settings = await ensureMRNSettingsRow();
    return res.json(settings);
  } catch (error) {
    console.error("❌ getMRNSettings:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc Update MRN settings
 * @route PUT /api/settings/mrn
 * @access Private (Admin only)
 */
const updateMRNSettings = async (req, res) => {
  try {
    const current = await ensureMRNSettingsRow();

    let { facility_code, reset_yearly, last_sequence } = req.body;

    // Keep existing values when fields are omitted
    const facilityCode =
      (typeof facility_code === "string" && facility_code.trim()) ||
      current.facility_code;

    const resetYearly =
      typeof reset_yearly === "boolean"
        ? reset_yearly
        : current.reset_yearly;

    const lastSequence =
      typeof last_sequence === "number" ||
      (typeof last_sequence === "string" && last_sequence.trim() !== "")
        ? Number(last_sequence)
        : current.last_sequence;

    const { rows } = await pool.query(
      `
      UPDATE mrn_settings
      SET facility_code = $1,
          reset_yearly  = $2,
          last_sequence = $3,
          updated_at    = NOW()
      RETURNING *;
    `,
      [facilityCode, resetYearly, lastSequence]
    );

    const updated = rows[0];

    await logAuditEvent({
      user_id: req.user.id,
      action: "MRN_SETTINGS_UPDATED",
      details: updated,
      entity: "mrn_settings",
      entity_id: updated.id,
    });

    return res.json(updated);
  } catch (error) {
    console.error("❌ updateMRNSettings:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getMRNSettings,
  updateMRNSettings,
};
