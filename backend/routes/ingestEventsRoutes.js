// routes/ingestEventsRoutes.js
const express = require("express");
const router = express.Router();
const { list, getOne } = require("../controllers/ingestEventsController");

// Require auth (reuse your existing auth middleware)
const { protect } = require("../middleware/authMiddleware");

// Only logged-in users (e.g., admins) should access this
router.use(protect);

// GET /api/ingest-events
router.get("/", list);

// GET /api/ingest-events/:id
router.get("/:id", getOne);

module.exports = router;
