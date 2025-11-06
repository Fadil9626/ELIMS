const express = require('express');
const router = express.Router();
const { getDashboardStats, getMonthlyAnalytics } = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/billing/dashboard
 * @desc    Get dashboard statistics (supports period=day|week|month|year or from/to)
 * @access  Private (Admin or authorized users)
 */
router.get('/dashboard', protect, authorize('settings', 'view'), getDashboardStats);

/**
 * @route   GET /api/billing/analytics
 * @desc    Get current-year monthly analytics for charts
 * @access  Private (Admin or authorized users)
 */
router.get('/analytics', protect, authorize('settings', 'view'), getMonthlyAnalytics);

module.exports = router;
