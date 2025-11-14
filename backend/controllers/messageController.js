const pool = require("../config/database");

/**
 * Helper: Safe socket emission
 */
const emitSocketEvent = (req, room, event, data) => {
  try {
    req?.io?.to(room).emit(event, data);
  } catch (socketError) {
    console.error("Socket emit error:", socketError.message);
  }
};

// =============================================================
// GET /api/messages/unread/count
// =============================================================
const getUnreadCount = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM messages
      WHERE is_read = FALSE
        AND (
          receiver_id = $1
          OR (is_general = TRUE AND (sender_id IS NULL OR sender_id <> $1))
        )
      `,
      [userId]
    );

    return res.json({ count: Number(result.rows[0]?.count || 0) });
  } catch (err) {
    console.error("getUnreadCount error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// =============================================================
// GET /api/messages/history
// =============================================================
const getMessageHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        m.*,
        u.full_name AS sender_name,
        (m.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Freetown') AS timestamp 
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE 
        m.receiver_id = $1
        OR m.sender_id = $1
        OR m.is_general = TRUE
      ORDER BY m.created_at ASC
      `,
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error("getMessageHistory error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// =============================================================
// POST /api/messages/send
// =============================================================
const sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { receiver_id, content, is_general } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Message content cannot be empty." });
  }

  if (!is_general && !receiver_id) {
    return res.status(400).json({ message: "receiver_id required for private messages." });
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO messages (sender_id, receiver_id, content, is_general)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [senderId, is_general ? null : receiver_id, content.trim(), !!is_general]
    );

    const message = rows[0];

    if (is_general) {
      emitSocketEvent(req, "broadcast", "new_message", message);
    } else {
      emitSocketEvent(req, `user_${receiver_id}`, "new_message", message);
      emitSocketEvent(req, `user_${senderId}`, "new_message", message);
    }

    return res.status(201).json(message);
  } catch (err) {
    console.error("sendMessage error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// =============================================================
// PUT /api/messages/mark-thread-read
// Marks all messages between current user and another user
// =============================================================
const markThreadAsRead = async (req, res) => {
  const userId = req.user.id;
  const { peer_id } = req.body;

  if (!peer_id) {
    return res.status(400).json({ message: "peer_id is required." });
  }

  try {
    await pool.query(
      `
      UPDATE messages
      SET is_read = TRUE
      WHERE receiver_id = $1
        AND sender_id = $2
        AND is_read = FALSE
      `,
      [userId, peer_id]
    );

    emitSocketEvent(req, `user_${peer_id}`, "messages_read", { reader: userId });

    return res.json({ success: true });
  } catch (err) {
    console.error("markThreadAsRead error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// =============================================================
// PUT /api/messages/mark-all-read (optional bulk clear)
// =============================================================
const markMessagesAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      `
      UPDATE messages
      SET is_read = TRUE
      WHERE receiver_id = $1 
        OR is_general = TRUE
      `,
      [userId]
    );

    return res.json({ message: "All messages marked as read." });
  } catch (err) {
    console.error("markMessagesAsRead error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getUnreadCount,
  getMessageHistory,
  sendMessage,
  markMessagesAsRead,
  markThreadAsRead,
};
