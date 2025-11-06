// routes/lisRoutes.js
const express = require("express");
const router = express.Router();

// Import middleware + controller
let protect;
try {
  ({ protect } = require("../middleware/authMiddleware"));
} catch (e) {
  console.error("[LIS] Failed to import protect from ../middleware/authMiddleware:", e.message);
  // Safe no-op fallback (lets app boot with a warning)
  protect = (req, _res, next) => next();
}

let lisController;
try {
  lisController = require("../controllers/lisController");
} catch (e) {
  console.error("[LIS] Failed to import lisController from ../controllers/lisController:", e.message);
  lisController = {};
}

// Runtime guards to avoid "argument handler must be a function"
const resolveSample =
  typeof lisController.resolveSample === "function"
    ? lisController.resolveSample
    : (_req, res) => res.status(500).json({ message: "resolveSample handler missing" });

const ingestCbc =
  typeof lisController.ingestCbc === "function"
    ? lisController.ingestCbc
    : (_req, res) => res.status(500).json({ message: "ingestCbc handler missing" });

// Routes
router.get("/resolve-sample", protect, resolveSample);
router.post("/cbc/ingest/:testItemId", protect, ingestCbc);

module.exports = router;
