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
  // 🟢 NEW IMPORT: Handler for updating individual item status
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
// -------------------------------------------------------------
router.get("/worklist", authorize("pathologist", "view"), getPathologistWorklist);

// -------------------------------------------------------------
// 📊 Dashboard Status Counts 
// -------------------------------------------------------------
router.get("/status-counts", authorize("pathologist", "view"), getStatusCounts);

// --- Result Entry and Verification ---
// -------------------------------------------------------------
// 📋 Result Template (READ for entry UI)
// -------------------------------------------------------------
router.get("/result-template/:requestId", authorize("results", "enter"), getResultTemplate);

// -------------------------------------------------------------
// ✍️ Result Actions (Targeting a specific test item)
// -------------------------------------------------------------
// Submit / Update a Single Result (ENTER)
router.put("/result/:itemId", authorize("results", "enter"), submitResult);

// Verify a Single Result (VERIFY)
router.post("/verify/:itemId", authorize("results", "verify"), verifyResult);

// Reopen a Single Test Item (REOPEN)
router.post("/reopen/:itemId", authorize("results", "reopen"), reopenResult);

// Mark a Result as Under Review (REVIEW)
router.patch("/review/:itemId", authorize("results", "verify"), markResultForReview);

// 🟢 NEW ROUTE: Update Item Status (Used by front-end to mark panels as 'Completed')
router.put("/item-status/:itemId", authorize("results", "enter"), updateRequestItemStatus);

// -------------------------------------------------------------
// 🚀 Report Release (Targeting the entire request by :requestId)
// -------------------------------------------------------------
router.post("/release/:requestId", authorize("results", "release"), releaseReport);

// --- Audit and Integrations ---
// -------------------------------------------------------------
// 🧾 Audit Log: Result Change History (Targeting test item)
// -------------------------------------------------------------
router.get("/result-history/:itemId", authorize("results", "view"), getResultHistory);

// -------------------------------------------------------------
// 🔬 Analyzer Integration Results (Targeting test item)
// -------------------------------------------------------------
router.get("/items/:itemId/analyzer-results", authorize("results", "view"), getAnalyzerResults);


module.exports = router;