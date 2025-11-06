const express = require('express');
const router = express.Router();
const { getAnalytes, createAnalyte } = require('../controllers/analytesController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, authorize(1, 2), getAnalytes)
    .post(protect, authorize(1, 2), createAnalyte);

module.exports = router;
