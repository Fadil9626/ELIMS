// backend/routes/receptionRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getReceptionDashboardStats,
  getReceptionQueue,
  updateTestRequestStatus,
} = require("../controllers/receptionController");

// Dashboard summary stats
router.get("/dashboard-stats", protect, getReceptionDashboardStats);

// Daily queue
router.get("/queue", protect, getReceptionQueue);

// Workflow update (status change)
router.patch("/queue/:id/status", protect, updateTestRequestStatus);

module.exports = router;
