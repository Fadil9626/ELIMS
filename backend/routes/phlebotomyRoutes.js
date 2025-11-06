const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getSummary,
  getWorklist,
  markSampleAsCollected,
  exportCollectedSamples,
} = require('../controllers/phlebotomyController');

/**
 * ==========================================================
 * @route   GET /api/phlebotomy/summary
 * @desc    Fetch overall phlebotomy summary stats
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router.get('/summary', protect, authorize('phlebotomy', 'view'), getSummary);

/**
 * ==========================================================
 * @route   GET /api/phlebotomy/worklist
 * @desc    Get all pending/collected samples (with filters)
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router.get('/worklist', protect, authorize('phlebotomy', 'view'), getWorklist);

/**
 * ==========================================================
 * @route   PUT /api/phlebotomy/collect/:id
 * @desc    Mark a sample as collected
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router.put('/collect/:id', protect, authorize('phlebotomy', 'update'), markSampleAsCollected);

/**
 * ==========================================================
 * @route   GET /api/phlebotomy/export
 * @desc    Export collected samples to CSV file
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router.get('/export', protect, authorize('phlebotomy', 'export'), exportCollectedSamples);

module.exports = router;
