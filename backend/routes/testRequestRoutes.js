const express = require("express");
const router = express.Router();
const testRequestController = require("../controllers/testRequestController");
const { protect, authorize } = require("../middleware/authMiddleware");

/* =============================================================
 * ROUTE PARAM VALIDATION (keep safe numeric ID)
 * ============================================================= */
// Original 'id' validation is fine for general use, but we'll add a 'patientId' param validator.
router.param("id", (req, res, next, id) => {
    if (!/^\d+$/.test(String(id))) {
        return res.status(400).json({ message: "Invalid ID (must be numeric)" });
    }
    next();
});

// 💡 NEW: Param validation for patientId to ensure it's numeric
router.param("patientId", (req, res, next, patientId) => {
    if (!/^\d+$/.test(String(patientId))) {
        return res.status(400).json({ message: "Invalid Patient ID (must be numeric)" });
    }
    next();
});

/* =============================================================
 * ROUTES
 * ============================================================= */

// 🔹 Get ALL test requests
router.get(
    "/",
    protect,
    authorize("tests", "view"),
    testRequestController.getAllTestRequests
);

// 🔹 Create test request
router.post(
    "/",
    protect,
    authorize("tests", "create"),
    testRequestController.createTestRequest
);

// 💡 FIX: Add route to get ALL requests for a specific patient
router.get(
    "/patient/:patientId",
    protect,
    authorize("patients", "view"), // Use patient view permission
    testRequestController.getTestRequestsByPatientId 
);

// 🔹 Get single request (details page)
router.get(
    "/:id",
    protect,
    authorize("tests", "view"),
    testRequestController.getTestRequestById
);


module.exports = router;