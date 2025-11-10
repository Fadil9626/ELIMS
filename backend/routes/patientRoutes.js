const express = require('express');
const router = express.Router();

const {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
  getPatientByMRN,
} = require('../controllers/patientController');

const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * ==========================================================
 * SPECIAL ROUTES MUST COME FIRST
 * ==========================================================
 */

/** Patient Search by MRN / Barcode */
router.get(
  '/mrn/:mrn',
  protect,
  authorize('patients', 'view'),
  getPatientByMRN
);

/** NEW REQUEST MODE — Prevents numeric route from capturing */
router.get(
  '/new-request',
  protect,
  authorize('patients', 'view'),
  (req, res) => {
    return res.json({ mode: "new-request" });
  }
);

/**
 * ==========================================================
 * PATIENT LIST + CREATE
 * ==========================================================
 */
router
  .route('/')
  .get(protect, authorize('patients', 'view'), getAllPatients)
  .post(protect, authorize('patients', 'create'), registerPatient);

/**
 * ==========================================================
 * PATIENT HISTORY (needs to come before numeric :id validation)
 * ==========================================================
 */
router.get(
  '/:id/test-requests',
  protect,
  authorize('patients', 'view'),
  getPatientTestHistory
);

/**
 * ==========================================================
 * STRICT NUMERIC PATIENT ID ROUTE
 * ==========================================================
 */
router.get(
  '/:id',
  protect,
  authorize('patients', 'view'),
  (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }
    next();
  },
  getPatientById
);

router.put(
  '/:id',
  protect,
  authorize('patients', 'edit'),
  (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }
    next();
  },
  updatePatient
);

router.delete(
  '/:id',
  protect,
  authorize('patients', 'delete'),
  (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }
    next();
  },
  deletePatient
);

module.exports = router;
