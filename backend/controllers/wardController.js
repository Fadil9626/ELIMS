const pool = require('../config/database');

// ✅ Get all wards
// @route   GET /api/wards
// @access  Private
const getWards = async (req, res) => {
  try {
    // 🚀 UPDATE: Include 'type' in the select query
    const result = await pool.query(
      'SELECT id, name, type, created_at FROM wards ORDER BY name ASC'
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
  // 🚀 UPDATE: Accept 'type' from request body
  const { name, type } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Ward name is required.' });
  }

  try {
    // Prevent duplicate ward names
    const existing = await pool.query('SELECT * FROM wards WHERE LOWER(name) = LOWER($1)', [name]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Ward already exists.' });
    }

    // 🚀 UPDATE: Insert 'type' into database (default to 'General' if missing)
    const newWard = await pool.query(
      'INSERT INTO wards (name, type, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [name, type || 'General']
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
  // 🚀 UPDATE: Accept 'type' from request body
  const { name, type } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Ward name is required.' });
  }

  try {
    // 🚀 UPDATE: Update 'type' column as well
    const updated = await pool.query(
      'UPDATE wards SET name = $1, type = $2 WHERE id = $3 RETURNING *',
      [name, type || 'General', id]
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