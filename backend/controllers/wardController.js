const pool = require('../config/database');

// ✅ Get all wards
// @route   GET /api/wards
// @access  Private
const getWards = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM wards ORDER BY name ASC'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Ward Fetch Error:', error.message);
    res.status(500).json({ message: 'Server error fetching wards' });
  }
};

// ✅ Create a new ward
// @route   POST /api/wards
// @access  Private (Admin only)
const createWard = async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Ward name is required.' });
  }

  try {
    // Prevent duplicate ward names
    const existing = await pool.query('SELECT * FROM wards WHERE LOWER(name) = LOWER($1)', [name]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Ward already exists.' });
    }

    const newWard = await pool.query(
      'INSERT INTO wards (name, created_at) VALUES ($1, NOW()) RETURNING *',
      [name]
    );
    res.status(201).json(newWard.rows[0]);
  } catch (error) {
    console.error('❌ Ward Creation Error:', error.message);
    res.status(500).json({ message: 'Server error creating ward.' });
  }
};

// ✅ Update ward
// @route   PUT /api/wards/:id
// @access  Private (Admin only)
const updateWard = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Ward name is required.' });
  }

  try {
    const updated = await pool.query(
      'UPDATE wards SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: 'Ward not found.' });
    }

    res.status(200).json(updated.rows[0]);
  } catch (error) {
    console.error('❌ Ward Update Error:', error.message);
    res.status(500).json({ message: 'Server error updating ward.' });
  }
};

// ✅ Delete ward
// @route   DELETE /api/wards/:id
// @access  Private (Admin only)
const deleteWard = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await pool.query('DELETE FROM wards WHERE id = $1', [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: 'Ward not found.' });
    }
    res.status(200).json({ message: 'Ward deleted successfully.' });
  } catch (error) {
    console.error('❌ Ward Deletion Error:', error.message);
    res.status(500).json({ message: 'Server error deleting ward.' });
  }
};

module.exports = {
  getWards,
  createWard,
  updateWard,
  deleteWard,
};
