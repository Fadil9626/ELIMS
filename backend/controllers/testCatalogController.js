const pool = require('../config/database');

// ============================================================
// ✅ Get all tests (returns qualitative_values too)
// ============================================================
const getAllTests = async (req, res) => {
  try {
    const query = `
      SELECT 
        tc.id,
        tc.code,
        tc.name AS test_name,
        d.name AS department_name,
        s.name AS sample_type_name,
        u.symbol AS unit_symbol,
        tc.normal_range_min,
        tc.normal_range_max,
        tc.method,
        tc.price,
        tc.status,
        tc.is_active,
        tc.department_id,
        tc.sample_type_id,
        tc.unit_id,
        tc.qualitative_values  -- ✅ NEW
      FROM test_catalog tc
      LEFT JOIN departments d ON tc.department_id = d.id
      LEFT JOIN sample_types s ON tc.sample_type_id = s.id
      LEFT JOIN units u ON tc.unit_id = u.id
      ORDER BY d.name ASC, tc.name ASC;
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching test catalog:', error.message);
    res.status(500).json({ message: 'Server Error fetching test catalog' });
  }
};

// ============================================================
// ✅ Create a new test (supports qualitative & quantitative)
// ============================================================
const createTest = async (req, res) => {
  let {
    code,
    name,
    test_name,
    department_id,
    sample_type_id,
    unit_id,
    normal_range_min,
    normal_range_max,
    method,
    price,
    status,
    is_active,
    qualitative_values // ✅ NEW
  } = req.body;

  // Normalize name
  name = name || test_name;

  if (!name || !department_id || !price) {
    return res.status(400).json({ message: 'Name, Department, and Price are required.' });
  }

  try {
    const insertQuery = `
      INSERT INTO test_catalog 
        (code, name, department_id, sample_type_id, unit_id, 
         normal_range_min, normal_range_max, method, price, status, is_active, qualitative_values)
      VALUES 
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, TRUE), $12)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      code || null,
      name,
      department_id,
      sample_type_id || null,
      unit_id || null,
      normal_range_min || null,
      normal_range_max || null,
      method || null,
      price,
      status || 'ACTIVE',
      is_active,
      Array.isArray(qualitative_values) && qualitative_values.length ? qualitative_values : null // ✅
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error creating test:', error.message);
    res.status(500).json({ message: 'Server Error creating test' });
  }
};

// ============================================================
// ✅ Update a test (supports qualitative & quantitative)
// ============================================================
const updateTest = async (req, res) => {
  const { id } = req.params;

  let {
    code,
    name,
    test_name,
    department_id,
    sample_type_id,
    unit_id,
    normal_range_min,
    normal_range_max,
    method,
    price,
    status,
    is_active,
    qualitative_values // ✅ NEW
  } = req.body;

  name = name || test_name;

  try {
    const updateQuery = `
      UPDATE test_catalog
      SET code=$1, name=$2, department_id=$3, sample_type_id=$4, unit_id=$5,
          normal_range_min=$6, normal_range_max=$7, method=$8, price=$9, 
          status=$10, is_active=$11, qualitative_values=$12
      WHERE id=$13 RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      code || null,
      name,
      department_id,
      sample_type_id || null,
      unit_id || null,
      normal_range_min || null,
      normal_range_max || null,
      method || null,
      price,
      status || 'ACTIVE',
      is_active,
      Array.isArray(qualitative_values) && qualitative_values.length ? qualitative_values : null, // ✅
      id,
    ]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Test not found' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating test:', error.message);
    res.status(500).json({ message: 'Server Error updating test' });
  }
};

// ============================================================
// ✅ Delete test (SAFE — soft delete if in use)
// ============================================================
const deleteTest = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: refRows } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM test_request_items WHERE test_catalog_id = $1`,
      [id]
    );

    const inUse = (refRows[0]?.cnt ?? 0) > 0;

    if (inUse) {
      const { rows } = await pool.query(
        `UPDATE test_catalog SET is_active = FALSE WHERE id = $1 RETURNING *`,
        [id]
      );

      if (!rows.length)
        return res.status(404).json({ message: 'Test not found' });

      return res.status(200).json({
        message: 'Test is in use. It has been deactivated (soft-deleted).',
        soft_deleted: true
      });
    }

    const result = await pool.query(`DELETE FROM test_catalog WHERE id = $1`, [id]);

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Test not found' });

    res.status(200).json({
      message: 'Test permanently deleted.',
      soft_deleted: false
    });

  } catch (error) {
    console.error('❌ Error deleting test:', error.message);

    if (error.code === '23503') {
      return res.status(400).json({
        message: 'This test is referenced by other records. Remove those associations first.',
        error: error.detail
      });
    }

    res.status(500).json({ message: 'Server Error deleting test' });
  }
};

module.exports = {
  getAllTests,
  createTest,
  updateTest,
  deleteTest,
};
