const express = require('express');
const router = express.Router();
const { getUnits, createUnit } = require('../controllers/unitsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, authorize(1, 2), getUnits)
    .post(protect, authorize(1, 2), createUnit);

module.exports = router;
