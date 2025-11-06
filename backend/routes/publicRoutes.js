// backend/routes/publicRoutes.js
const express = require("express");
const router = express.Router();
const {
  verifyApiKey,
  ingestSample,
  reprocessEvent,
} = require("../controllers/publicApiController");

// Simple ping that never requires auth (handy for curl)
router.get("/_ping", (req, res) => res.json({ ok: true, from: "publicRoutes" }));

// Verify an API key (header: X-API-Key: <fullKey>)
router.post("/keys/verify", verifyApiKey);

// Ingest from instruments (header: X-API-Key required)
router.post("/instruments/ingest", ingestSample);

// Optional: admin-only in future — reprocess a specific event
router.post("/instruments/reprocess/:id", reprocessEvent);

module.exports = router;
