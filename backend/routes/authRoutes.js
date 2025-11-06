// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

/**
 * ==========================================================
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Private (Admin only)
 * ==========================================================
 */
router.post('/register', registerUser);

/**
 * ==========================================================
 * @route   POST /api/auth/login
 * @desc    Log in an existing user
 * @access  Public
 * ==========================================================
 */
router.post('/login', loginUser);

module.exports = router;
