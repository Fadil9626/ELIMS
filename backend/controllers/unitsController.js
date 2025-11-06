const pool = require('../config/database');

// @desc    Get all units
// @route   GET /api/lab-config/units
const getUnits = async (req, res) => {
    try {
        const units = await pool.query('SELECT * FROM units ORDER BY name');
        res.status(200).json(units.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Create a new unit
// @route   POST /api/lab-config/units
const createUnit = async (req, res) => {
    const { name } = req.body;
    try {
        const newUnit = await pool.query('INSERT INTO units (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(newUnit.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { getUnits, createUnit };
