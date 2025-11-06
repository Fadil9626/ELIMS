const express = require('express');
const router = express.Router();
const {
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
  getItemById,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Defines routes for the base '/api/inventory' path
// Each action is now protected and authorized with specific permissions
router.route('/')
  .get(protect, authorize('inventory', 'view'), getAllItems)
  .post(protect, authorize('inventory', 'create'), createItem);

// Defines routes for paths with a specific item ID
router.route('/:id')
  .get(protect, authorize('inventory', 'view'), getItemById)
  .put(protect, authorize('inventory', 'edit'), updateItem)
  .delete(protect, authorize('inventory', 'delete'), deleteItem);

module.exports = router;
