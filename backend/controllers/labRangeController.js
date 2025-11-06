const pool = require("../config/database");

// =============================================================
// @desc Get all normal ranges for a test or analyte
// =============================================================
exports.getTestRanges = async (req, res) => {
  const testId = parseInt(req.params.id, 10);
  if (isNaN(testId))
    return res.status(400).json({ message: "Invalid test ID" });

  try {
    const { rows } = await pool.query(
      `
      SELECT id, analyte_id, test_catalog_id,
             range_type, min_value, max_value,
             qualitative_value, symbol_operator,
             gender, min_age, max_age, range_label
      FROM normal_ranges
      WHERE analyte_id = $1 OR test_catalog_id = $1
      ORDER BY id;
      `,
      [testId]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ getTestRanges:", err.message);
    res.status(500).json({ message: "Server error fetching test ranges" });
  }
};

// =============================================================
// @desc Add new normal range
// =============================================================
exports.createTestRange = async (req, res) => {
  const testId = parseInt(req.params.id, 10);
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
  } = req.body;

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO normal_ranges (
        test_catalog_id, range_type, min_value, max_value,
        qualitative_value, symbol_operator, gender,
        min_age, max_age, range_label
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
      `,
      [
        testId,
        range_type || "numeric",
        min_value,
        max_value,
        qualitative_value,
        symbol_operator,
        gender,
        min_age,
        max_age,
        range_label,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ createTestRange:", err.message);
    res.status(500).json({ message: "Server error creating test range" });
  }
};

// =============================================================
// @desc Update an existing range
// =============================================================
exports.updateTestRange = async (req, res) => {
  const rangeId = parseInt(req.params.rangeId, 10);
  if (isNaN(rangeId))
    return res.status(400).json({ message: "Invalid range ID" });

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
  } = req.body;

  try {
    const { rowCount } = await pool.query(
      `
      UPDATE normal_ranges
      SET range_type=$1, min_value=$2, max_value=$3,
          qualitative_value=$4, symbol_operator=$5,
          gender=$6, min_age=$7, max_age=$8, range_label=$9
      WHERE id=$10;
      `,
      [
        range_type,
        min_value,
        max_value,
        qualitative_value,
        symbol_operator,
        gender,
        min_age,
        max_age,
        range_label,
        rangeId,
      ]
    );

    if (!rowCount) return res.status(404).json({ message: "Range not found" });
    res.json({ success: true, message: "✅ Range updated successfully" });
  } catch (err) {
    console.error("❌ updateTestRange:", err.message);
    res.status(500).json({ message: "Server error updating range" });
  }
};

// =============================================================
// @desc Delete range
// =============================================================
exports.deleteTestRange = async (req, res) => {
  const rangeId = parseInt(req.params.rangeId, 10);
  if (isNaN(rangeId))
    return res.status(400).json({ message: "Invalid range ID" });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM normal_ranges WHERE id=$1;`,
      [rangeId]
    );

    if (!rowCount) return res.status(404).json({ message: "Range not found" });
    res.json({ success: true, message: "🗑️ Range deleted successfully" });
  } catch (err) {
    console.error("❌ deleteTestRange:", err.message);
    res.status(500).json({ message: "Server error deleting range" });
  }
};
