const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getAllReports, getReportByRequestId } = require("../controllers/reportController");

// Apply protection (auth check) to all routes in this file
router.use(protect);

// ✅ GET /api/reports/ - Fetches the list of all completed reports for the archive page
router.get("/", getAllReports);

// ✅ GET /api/reports/request/:id - Fetches details for a single report to print/view
router.get("/request/:id", getReportByRequestId);

module.exports = router;