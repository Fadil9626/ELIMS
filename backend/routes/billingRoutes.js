const express = require('express');
const router = express.Router();
const { getDashboardStats, getMonthlyAnalytics } = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// MATCHES: billingService.js (API_URL + "/dashboard")
router.get('/dashboard', protect, authorize('admin', 'manager'), getDashboardStats);

router.get('/analytics', protect, authorize('admin', 'manager'), getMonthlyAnalytics);

module.exports = router;