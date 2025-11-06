// backend/routes/importRoutes.js
const express = require("express");
const multer = require("multer");
const { importAll } = require("../controllers/importController");
const { protect } = require("../middleware/authMiddleware"); // if you have auth; otherwise remove

const router = express.Router();

// Use memory storage so we can parse the CSV buffers directly
const upload = multer({ storage: multer.memoryStorage() });

// Single endpoint that can take one or both files:
// field names: "tests" and "ranges"
router.post(
  "/",
  protect, // remove if your import is public (recommended to keep it protected)
  upload.fields([
    { name: "tests", maxCount: 1 },
    { name: "ranges", maxCount: 1 },
  ]),
  importAll
);

module.exports = router;
