const express = require('express');
const router = express.Router();
const { getRangesForAnalyte, createRange } = require('../controllers/normalRangesController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize(1, 2), createRange);

router.route('/:analyteId')
    .get(protect, authorize(1, 2), getRangesForAnalyte);

module.exports = router;
