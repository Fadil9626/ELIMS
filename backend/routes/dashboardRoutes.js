const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getStats, getAnalytics } = require("../controllers/dashboardController");

router.get("/stats", protect, getStats);
router.get("/analytics", protect, getAnalytics);

module.exports = router;
