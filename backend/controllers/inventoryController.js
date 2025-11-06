const pool = require('../config/database');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
const getAllItems = async (req, res) => {
  try {
    const allItems = await pool.query('SELECT * FROM inventory_items ORDER BY name ASC');
    res.status(200).json(allItems.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single inventory item by ID
// @route   GET /api/inventory/:id
// @access  Private
const getItemById = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
    if (item.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json(item.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new inventory item
// @route   POST /api/inventory
// @access  Private
const createItem = async (req, res) => {
  let { name, category, supplier, quantity, low_stock_threshold, expiry_date, department } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  // Convert empty string to null for the optional date field
  if (expiry_date === '') {
    expiry_date = null;
  }

  try {
    const newItem = await pool.query(
      'INSERT INTO inventory_items (name, category, supplier, quantity, low_stock_threshold, expiry_date, department) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, category, supplier, quantity, low_stock_threshold, expiry_date, department]
    );
    res.status(201).json(newItem.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update an inventory item
// @route   PUT /api/inventory/:id
// @access  Private
const updateItem = async (req, res) => {
  const { id } = req.params;
  let { name, category, supplier, quantity, low_stock_threshold, expiry_date, department } = req.body;

  // Convert empty string to null for the optional date field
  if (expiry_date === '') {
    expiry_date = null;
  }

  try {
    const updatedItem = await pool.query(
      'UPDATE inventory_items SET name = $1, category = $2, supplier = $3, quantity = $4, low_stock_threshold = $5, expiry_date = $6, department = $7 WHERE id = $8 RETURNING *',
      [name, category, supplier, quantity, low_stock_threshold, expiry_date, department, id]
    );
    if (updatedItem.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json(updatedItem.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an inventory item
// @route   DELETE /api/inventory/:id
// @access  Private
const deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    const deleteResult = await pool.query('DELETE FROM inventory_items WHERE id = $1', [id]);
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json({ message: 'Inventory item removed' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};


module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};