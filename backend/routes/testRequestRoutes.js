const express = require("express");
const router = express.Router();
const testRequestController = require("../controllers/testRequestController");
const { protect, authorize } = require("../middleware/authMiddleware");

/* =============================================================
 * ROUTE PARAM VALIDATION
 * ============================================================= */
router.param("id", (req, res, next, id) => {
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ message: "Invalid ID (must be numeric)" });
  }
  next();
});

/* =============================================================
 * ROUTES
 * ============================================================= */

// 🔹 Get all test requests
router.get(
  "/",
  protect,
  authorize("tests", "view"),
  testRequestController.getAllTestRequests
);

// 🔹 Create new test request
router.post(
  "/",
  protect,
  authorize("tests", "create"),
  testRequestController.createTestRequest
);

// 🔹 Get a single test request (with items)
router.get(
  "/:id",
  protect,
  authorize("tests", "view"),
  testRequestController.getTestRequestById
);

// 🔹 Get result entry data (grouped analytes)
router.get(
  "/:id/result-entry",
  protect,
  authorize("results", "enter"),
  testRequestController.getResultEntry
);

// 🔹 Save test results (bulk entry)
router.post(
  "/:id/results",
  protect,
  authorize("results", "enter"),
  testRequestController.saveResultEntry
);

// 🔹 Verify or reject test results
router.post(
  "/:id/verify-results",
  protect,
  authorize("results", "verify"),
  testRequestController.verifyResults
);

// 🔹 Update workflow status
router.put(
  "/:id",
  protect,
  authorize("tests", "edit"),
  testRequestController.updateTestRequestStatus
);

// 🔹 Process payment
router.post(
  "/:id/payment",
  protect,
  authorize("billing", "process"),
  testRequestController.processPayment
);

module.exports = router;
