const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getSummary,
  getWorklist,
  markSampleAsCollected,
  exportCollectedSamples,
} = require('../controllers/phlebotomyController');

// ----------------------------------------------------------
// Core Phlebotomy Routes
// Base: /api/phlebotomy
// ----------------------------------------------------------

/**
 * GET /summary
 * Fetch overall phlebotomy summary stats
 * Permission: phlebotomy:view
 */
router.get(
  '/summary',
  protect,
  authorize('phlebotomy', 'view'),
  getSummary
);

/**
 * GET /worklist
 * Get all pending / collected samples (with filters)
 * Permission: phlebotomy:view
 */
router.get(
  '/worklist',
  protect,
  authorize('phlebotomy', 'view'),
  getWorklist
);

/**
 * PUT /collect/:id
 * Mark a sample as collected
 * ✅ Changed from 'update' → 'collect' to match RBAC v7 (PHLEB_COLLECT)
 */
router.put(
  '/collect/:id',
  protect,
  authorize('phlebotomy', 'collect'),
  markSampleAsCollected
);

/**
 * GET /export
 * Export collected samples to CSV
 * ✅ Use 'view' permission so any phlebotomist who can see worklist can export it
 *    (no separate 'export' permission in RBAC v7)
 */
router.get(
  '/export',
  protect,
  authorize('phlebotomy', 'view'),
  exportCollectedSamples
);

module.exports = router;
