// backend/routes/invoicesRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getInvoiceForTestRequest } = require("../controllers/invoicesController");

// Ensure :id is numeric (avoids path-to-regexp issues)
router.param("id", (req, res, next, id) => {
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ message: "Invalid ID (must be numeric)" });
  }
  next();
});

// GET /api/invoices/test-request/:id
router.get(
  "/test-request/:id",
  protect,
  authorize("billing", "view"),
  getInvoiceForTestRequest
);

module.exports = router;
