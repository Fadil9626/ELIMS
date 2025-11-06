const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { listKeys, createKey, revokeKey } = require("../controllers/apiKeysController");

// All endpoints are user-scoped via JWT; raw keys are only returned on create

router.get("/", protect, listKeys);
router.post("/", protect, createKey);
router.delete("/:id", protect, revokeKey);

module.exports = router;
