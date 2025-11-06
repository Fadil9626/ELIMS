const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');
const { protect, authorize } = require('../middleware/authMiddleware');

// 🔍 Global Search Route
// @route   GET /api/search?q=<query>&page=<number>&limit=<number>
// @desc    Search patients, test requests, and staff
// @access  Private (Admins or users with permission)
router.get('/', protect, authorize('settings', 'view'), globalSearch);

module.exports = router;
