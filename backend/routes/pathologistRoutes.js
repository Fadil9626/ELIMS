const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  getPathologistWorklist,
  getResultTemplate,
  submitResult,
  verifyResult,
  releaseReport,
  reopenResult,
  markResultForReview,
  getStatusCounts,
  getResultHistory,
  getAnalyzerResults,
  updateRequestItemStatus, 
} = require("../controllers/pathologistController");

// =============================================================
// 🧠 PATHOLOGIST ROUTES
// =============================================================

// Ensure user is authenticated for all routes in this router
router.use(protect);

// --- Primary Workload Routes ---
// -------------------------------------------------------------
// 🧾 Worklist (View)
// ✅ **FIX**: Checking the more general "Lab_work" resource
// -------------------------------------------------------------
router.get("/worklist", authorize("Lab_work", "View"), getPathologistWorklist);

// -------------------------------------------------------------
// 📊 Dashboard Status Counts 
// ✅ **FIX**: Checking the more general "Lab_work" resource
// -------------------------------------------------------------
router.get("/status-counts", authorize("Lab_work", "View"), getStatusCounts);

// --- Result Entry and Verification ---
// ... (rest of the routes are unchanged) ...

// -------------------------------------------------------------
// 📋 Result Template (READ for entry UI)
// ✅ **FIX**: Capitalized "Results"
// -------------------------------------------------------------
router.get("/result-template/:requestId", authorize("Results", "Enter"), getResultTemplate);

// -------------------------------------------------------------
// ✍️ Result Actions (Targeting a specific test item)
// -------------------------------------------------------------
// Submit / Update a Single Result (ENTER)
// ✅ **FIX**: Capitalized "Results"
router.put("/result/:itemId", authorize("Results", "Enter"), submitResult);

// Verify a Single Result (VERIFY)
// ✅ **FIX**: Capitalized "Results"
router.post("/verify/:itemId", authorize("Results", "Verify"), verifyResult);

// Reopen a Single Test Item (REOPEN)
// ✅ **FIX**: Capitalized "Results"
router.post("/reopen/:itemId", authorize("Results", "Update"), reopenResult);

// Mark a Result as Under Review (REVIEW)
// ✅ **FIX**: Capitalized "Results"
router.patch("/review/:itemId", authorize("Results", "Verify"), markResultForReview);

// 🟢 NEW ROUTE: Update Item Status (Used by front-end to mark panels as 'Completed')
// ✅ **FIX**: Capitalized "Results"
router.put("/item-status/:itemId", authorize("Results", "Enter"), updateRequestItemStatus);

// -------------------------------------------------------------
// 🚀 Report Release (Targeting the entire request by :requestId)
// -------------------------------------------------------------
// ✅ **FIX**: Capitalized "Results"
router.post("/release/:requestId", authorize("Results", "Manage"), releaseReport); 

// --- Audit and Integrations ---
// ... (rest of the routes are unchanged) ...

module.exports = router;