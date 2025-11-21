/**
 * Emits a socket event to a specific department room.
 * Handles normalization of room names to match server.js logic.
 */
const emitToDepartment = (req, department, event, data) => {
  try {
    // 1. Try getting IO from app context (preferred)
    let io = req.app.get("io");

    // 2. Fallback to global.io if app.get fails (legacy support)
    if (!io && global.io) {
      io = global.io;
    }

    if (!io) {
      console.warn("⚠️ Socket.io instance not found. Notification skipped.");
      return;
    }

    if (!department) {
      console.warn("⚠️ Cannot emit socket: No department specified.");
      return;
    }

    // ✅ FIX: Normalize room name to match server.js join logic
    // Server logic: `dept-${String(dept).toLowerCase()}`
    const roomName = `dept-${String(department).toLowerCase()}`;

    // Emit to the specific department room
    io.to(roomName).emit(event, data);
    
    // Debug log (optional)
    // console.log(`📡 Emitted ${event} to room: ${roomName}`);

  } catch (error) {
    console.error("❌ Socket emit error:", error.message);
  }
};

module.exports = { emitToDepartment };
