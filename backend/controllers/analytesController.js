const pool = require('../config/database');

// @desc    Get all analytes
// @route   GET /api/lab-config/analytes
const getAnalytes = async (req, res) => {
    try {
        const analytes = await pool.query(`
            SELECT a.id, a.name, u.name as unit_name 
            FROM test_analytes a
            LEFT JOIN units u ON a.unit_id = u.id
            ORDER BY a.name
        `);
        res.status(200).json(analytes.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Create a new analyte
// @route   POST /api/lab-config/analytes
const createAnalyte = async (req, res) => {
    const { name, unit_id } = req.body;
    try {
        const newAnalyte = await pool.query(
            'INSERT INTO test_analytes (name, unit_id) VALUES ($1, $2) RETURNING *',
            [name, unit_id]
        );
        res.status(201).json(newAnalyte.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { getAnalytes, createAnalyte };
