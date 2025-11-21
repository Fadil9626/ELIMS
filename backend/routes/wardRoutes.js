const express = require('express');
const router = express.Router();
const {
  getWards,
  createWard,
  updateWard,
  deleteWard,
} = require('../controllers/wardController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/wards
 * @desc    Get all wards
 * @access  Private (All authenticated users)
 */
router.get('/', protect, getWards);

/**
 * @route   POST /api/wards
 * @desc    Create a new ward
 * @access  Private (Admin or users with 'settings:edit' permission)
 */
router.post('/', protect, authorize('settings', 'edit'), createWard);

/**
 * @route   PUT /api/wards/:id
 * @desc    Update a ward
 * @access  Private (Admin or users with 'settings:edit' permission)
 */
router.put('/:id', protect, authorize('settings', 'edit'), updateWard);

/**
 * @route   DELETE /api/wards/:id
 * @desc    Delete a ward
 * @access  Private (Admin or users with 'settings:edit' permission)
 */
router.delete('/:id', protect, authorize('settings', 'edit'), deleteWard);

module.exports = router;