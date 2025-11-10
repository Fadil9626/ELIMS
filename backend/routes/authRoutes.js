// ============================================================
// AUTH ROUTES
// /api/login  → public
// /api/register → protected (admin only)
// /api/me     → protected
// ============================================================

const express = require("express");
const router = express.Router();

// Import controller functions
const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authController");

// Import auth middleware
const { protect } = require("../middleware/authMiddleware");

// ---------------------------------------------------
// PUBLIC ROUTES
// ---------------------------------------------------
router.post("/login", loginUser);

// ---------------------------------------------------
// PROTECTED ROUTES
// ---------------------------------------------------
// Register new user (admin only)
router.post("/register", protect, registerUser);

// Get current user
router.get("/me", protect, getMe);

// ---------------------------------------------------
// EXPORT
// ---------------------------------------------------
module.exports = router;