const pool = require('../config/database');

// ============================================================
// ✅ Get all tests (with department, unit, sample type names)
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
        tc.unit_id
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
// ✅ Create a new test (accepts both `name` and `test_name`)
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
  } = req.body;

  // 🧠 Normalize keys
  name = name || test_name;
  if (!name || !department_id || !price) {
    return res
      .status(400)
      .json({ message: 'Name, Department, and Price are required.' });
  }

  try {
    const insertQuery = `
      INSERT INTO test_catalog 
        (code, name, department_id, sample_type_id, unit_id, normal_range_min, normal_range_max, method, price, status, is_active)
      VALUES 
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, true))
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
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error creating test:', error.message);
    res.status(500).json({ message: 'Server Error creating test' });
  }
};

// ============================================================
// ✅ Update a test (accepts both `name` and `test_name`)
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
  } = req.body;

  // Normalize name field
  name = name || test_name;

  try {
    const updateQuery = `
      UPDATE test_catalog
      SET code=$1, name=$2, department_id=$3, sample_type_id=$4, unit_id=$5,
          normal_range_min=$6, normal_range_max=$7, method=$8, price=$9, status=$10, is_active=$11
      WHERE id=$12 RETURNING *;
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
      id,
    ]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Test not found' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating test:', error.message);
    res.status(500).json({ message: 'Server Error updating test' });
  }
};

// ============================================================
// ✅ Delete test
// ============================================================
const deleteTest = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM test_catalog WHERE id = $1', [
      id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Test not found' });
    res.status(200).json({ message: 'Test removed successfully' });
  } catch (error) {
    console.error('❌ Error deleting test:', error.message);
    res.status(500).json({ message: 'Server Error deleting test' });
  }
};

module.exports = {
  getAllTests,
  createTest,
  updateTest,
  deleteTest,
};
