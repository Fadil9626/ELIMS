// backend/routes/messageRoutes.js
const express = require("express");
const router = express.Router();

const {
  getUnreadCount,
  getMessageHistory,
  sendMessage,
  markMessagesAsRead,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

// @route   GET /api/messages/unread/count
// @desc    Get count of unread messages for header
// @access  Private
router.get("/unread/count", protect, getUnreadCount);

// @route   GET /api/messages/history
// @desc    Get all DMs and broadcasts for user
// @access  Private
router.get("/history", protect, getMessageHistory);

// @route   POST /api/messages/send
// @desc    Send a DM or broadcast
// @access  Private
router.post("/send", protect, sendMessage);

// @route   PUT /api/messages/mark-read
// @desc    Mark conversation(s) as read
// @access  Private
router.put("/mark-read", protect, markMessagesAsRead);

module.exports = router;
