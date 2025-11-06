const express = require('express');
const router = express.Router();
const {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * ==========================================================
 * @route   /api/patients
 * @desc    Get all patients OR register a new one
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router
  .route('/')
  .get(protect, authorize('patients', 'view'), getAllPatients)
  .post(protect, authorize('patients', 'create'), registerPatient);

/**
 * ==========================================================
 * @route   /api/patients/:id
 * @desc    View, update, or delete a specific patient record
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router
  .route('/:id')
  .get(protect, authorize('patients', 'view'), getPatientById)
  .put(protect, authorize('patients', 'edit'), updatePatient)
  .delete(protect, authorize('patients', 'delete'), deletePatient);

/**
 * ==========================================================
 * @route   /api/patients/:id/test-requests
 * @desc    View test request history for a specific patient
 * @access  Private (Role/Permission-based)
 * ==========================================================
 */
router.get(
  '/:id/test-requests',
  protect,
  authorize('patients', 'view'),
  getPatientTestHistory
);

module.exports = router;
