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
// ----------------------------------------------------------

/** GET /summary: Fetch overall phlebotomy summary stats */
router.get(
    '/summary', 
    protect, 
    authorize('phlebotomy', 'view'), 
    getSummary
);

/** GET /worklist: Get all pending/collected samples (with filters) */
router.get(
    '/worklist', 
    protect, 
    authorize('phlebotomy', 'view'), 
    getWorklist
);

/** PUT /collect/:id: Mark a sample as collected */
router.put(
    '/collect/:id', 
    protect, 
    authorize('phlebotomy', 'update'), 
    markSampleAsCollected
);

/** GET /export: Export collected samples to CSV file */
router.get(
    '/export', 
    protect, 
    authorize('phlebotomy', 'export'), 
    exportCollectedSamples
);

module.exports = router;