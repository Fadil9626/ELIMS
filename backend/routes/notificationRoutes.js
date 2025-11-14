const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  getUnreadNotificationCount,
  markAllAsRead,
  markOneAsRead,
  createNotification,
} = require("../controllers/notificationController");

// 🔔 Get all notifications for logged-in user
router.get("/", protect, getNotifications);

// 🔔 Get unread badge count
router.get("/unread/count", protect, getUnreadNotificationCount);

// 🔔 Mark all notifications as read
router.put("/read/all", protect, markAllAsRead);

// 🔔 Mark a single notification as read
router.put("/read/:id", protect, markOneAsRead);

// (Admin/system) Create a notification
router.post("/", protect, createNotification);

module.exports = router;
