const express = require('express');
const router = express.Router();
const { getAllTests, createTest, updateTest, deleteTest } = require('../controllers/testCatalogController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ✅ Unified and simplified routes
router
  .route('/')
  .get(protect, authorize('labConfig', 'view'), getAllTests)
  .post(protect, authorize('labConfig', 'create'), createTest);

router
  .route('/:id')
  .put(protect, authorize('labConfig', 'edit'), updateTest)
  .delete(protect, authorize('labConfig', 'delete'), deleteTest);

module.exports = router;
