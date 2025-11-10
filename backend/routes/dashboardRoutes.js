const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getStats, getAnalytics } = require("../controllers/dashboardController");

// ✅ MAIN ADMIN DASHBOARD ROUTES
router.get("/billing/dashboard", protect, getStats);
router.get("/billing/analytics", protect, getAnalytics);

module.exports = router;
