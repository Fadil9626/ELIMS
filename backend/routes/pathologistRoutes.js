const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

// ---------------------- Pathology Controller ----------------------
const {
  getPathologistWorklist,
  getResultTemplate,
  submitResult,
  verifyResult,
  reopenResult,
  markResultForReview,
  releaseReport,
  getStatusCounts,
  getResultHistory,
  getAnalyzerResults,
  updateRequestItemStatus,
} = require("../controllers/pathologistController");

// ==============================================================
// 🔬 PATHOLOGY ROUTES  (/api/pathologist)
// ==============================================================

router.use(protect);

// ------------------ VIEW (Matches DB: pathologist/view) ------------------
router.get("/worklist",
  authorize("pathologist", "view"),
  getPathologistWorklist
);

router.get("/status-counts",
  authorize("pathologist", "view"),
  getStatusCounts
);

router.get("/requests/:requestId/template",
  authorize("pathologist", "view"),
  getResultTemplate
);

router.get("/items/:itemId/history",
  authorize("pathologist", "view"),
  getResultHistory
);

router.get("/items/:itemId/analyzer-results",
  authorize("pathologist", "view"),
  getAnalyzerResults
);

// ------------------ ENTER (Matches DB: pathologist/enter) ------------------
router.post("/items/:itemId/submit",
  authorize("pathologist", "enter"),
  submitResult
);

router.post("/items/:itemId/review",
  authorize("pathologist", "enter"),
  markResultForReview
);

router.patch("/items/:itemId/status",
  authorize("pathologist", "enter"),
  updateRequestItemStatus
);

// ------------------ VERIFY (Matches DB: pathology/verify) ------------------
router.post("/items/:itemId/verify",
  authorize("pathology", "verify"),
  verifyResult
);

router.post("/items/:itemId/reopen",
  authorize("pathology", "verify"),
  reopenResult
);

router.post("/requests/:requestId/release",
  authorize("pathology", "verify"),
  releaseReport
);

module.exports = router;
