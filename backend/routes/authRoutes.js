// ============================================================
// AUTH ROUTES (RBAC + Audit Safe)
// /api/auth/login    → Public
// /api/auth/register → Admin Only (RBAC Protected)
// /api/auth/me       → Authenticated User Profile
// ============================================================

const express = require("express");
const router = express.Router();

// Controller
const {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
} = require("../controllers/authController");

// Auth Middleware
const { protect, authorize } = require("../middleware/authMiddleware");

// ------------------------------------------------------------
// PUBLIC ROUTES
// ------------------------------------------------------------
router.post("/login", loginUser);

// ------------------------------------------------------------
// PROTECTED ROUTES
// ------------------------------------------------------------

// Create new user (Admin/SuperAdmin or role with users:create)
router.post(
  "/register",
  protect,
  authorize("users", "create"),
  registerUser
);

// Get logged-in user profile
router.get("/me", protect, getMe);

// Logout user
router.post("/logout", protect, logoutUser);

// ------------------------------------------------------------
// EXPORT ROUTER
// ------------------------------------------------------------
module.exports = router;
