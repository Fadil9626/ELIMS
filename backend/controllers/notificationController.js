const pool = require("../config/database");

const getNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications 
       WHERE recipient_user_id = $1 
       ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getUnreadNotificationCount = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE recipient_user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ count: Number(rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE recipient_user_id = $1`,
      [req.user.id]
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const markOneAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: "Notification updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin/system sends notification
const createNotification = async (req, res) => {
  const { title, body, recipient_user_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (title, body, recipient_user_id)
       VALUES ($1,$2,$3) RETURNING *`,
      [title, body, recipient_user_id]
    );

    // 🔥 Push real-time notification
    req.io.to(`user_${recipient_user_id}`).emit("new_notification", rows[0]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getNotifications,
  getUnreadNotificationCount,
  markAllAsRead,
  markOneAsRead,
  createNotification,
};
