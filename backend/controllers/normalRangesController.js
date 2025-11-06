const pool = require('../config/database');

// @desc    Get all normal ranges for a specific analyte
// @route   GET /api/lab-config/normal-ranges/:analyteId
const getRangesForAnalyte = async (req, res) => {
    const { analyteId } = req.params;
    try {
        const ranges = await pool.query('SELECT * FROM normal_ranges WHERE analyte_id = $1', [analyteId]);
        res.status(200).json(ranges.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Create a new normal range
// @route   POST /api/lab-config/normal-ranges
const createRange = async (req, res) => {
    const { analyte_id, min_age, max_age, gender, lower_bound, upper_bound } = req.body;
    try {
        const newRange = await pool.query(
            'INSERT INTO normal_ranges (analyte_id, min_age, max_age, gender, lower_bound, upper_bound) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [analyte_id, min_age, max_age, gender, lower_bound, upper_bound]
        );
        res.status(201).json(newRange.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { getRangesForAnalyte, createRange };
