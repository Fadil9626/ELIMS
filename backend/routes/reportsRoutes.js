const express = require('express');
const router = express.Router();
const { 
  getAllCompletedReports, 
  getReportByRequestId 
} = require('../controllers/reportController'); // ✅ controller import
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * ==========================================================
 * @route   GET /api/reports
 * @desc    Get all completed lab reports with filters
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router.get('/', protect, authorize('reports', 'view'), getAllCompletedReports);

/**
 * ==========================================================
 * @route   GET /api/reports/test-request/:id
 * @desc    Get full report detail by Test Request ID
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router.get(
  '/test-request/:id',
  protect,
  authorize('reports', 'view'),
  getReportByRequestId
);

module.exports = router;
