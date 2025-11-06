// ============================================================
// 🛰️ Socket Event Broadcaster Utility
// ============================================================
//
// This utility provides a set of helper functions to emit real-time
// events to users, departments, or globally from any controller.
//
// Usage example inside a controller:
//   const { emitToDepartment, emitToUser, emitGlobal } = require("../utils/socketEmitter");
//   emitToDepartment(req, "chemistry", "result_saved", { test_id: 12, updated_by: "Dr. Jalloh" });
//
// ============================================================

/**
 * Emit event to a specific department room (e.g., dept-chemistry)
 */
function emitToDepartment(req, department, eventName, payload = {}) {
    try {
      const io = req.app.get("io");
      if (!io) return console.warn("⚠️ io instance not found in app context");
  
      const dept = (department || "").toLowerCase();
      if (!dept) return console.warn("⚠️ emitToDepartment called with no department");
  
      io.to(`dept-${dept}`).emit(eventName, payload);
      console.log(`📡 [emitToDepartment] → dept-${dept} | ${eventName}`);
    } catch (err) {
      console.error("❌ emitToDepartment error:", err.message);
    }
  }
  
  /**
   * Emit event to a specific user socket
   * (requires user to have joined room "user-{id}" on connect)
   */
  function emitToUser(req, userId, eventName, payload = {}) {
    try {
      const io = req.app.get("io");
      if (!io) return console.warn("⚠️ io instance not found in app context");
      if (!userId) return console.warn("⚠️ emitToUser called without userId");
  
      io.to(`user-${userId}`).emit(eventName, payload);
      console.log(`📡 [emitToUser] → user-${userId} | ${eventName}`);
    } catch (err) {
      console.error("❌ emitToUser error:", err.message);
    }
  }
  
  /**
   * Emit event to all connected sockets globally
   */
  function emitGlobal(req, eventName, payload = {}) {
    try {
      const io = req.app.get("io");
      if (!io) return console.warn("⚠️ io instance not found in app context");
  
      io.emit(eventName, payload);
      console.log(`🌍 [emitGlobal] | ${eventName}`);
    } catch (err) {
      console.error("❌ emitGlobal error:", err.message);
    }
  }
  
  /**
   * Emit to a custom room (useful for admin dashboards or specific pages)
   */
  function emitToRoom(req, roomName, eventName, payload = {}) {
    try {
      const io = req.app.get("io");
      if (!io) return console.warn("⚠️ io instance not found in app context");
      if (!roomName) return console.warn("⚠️ emitToRoom called with no room name");
  
      io.to(roomName).emit(eventName, payload);
      console.log(`🏷️ [emitToRoom] → ${roomName} | ${eventName}`);
    } catch (err) {
      console.error("❌ emitToRoom error:", err.message);
    }
  }
  
  module.exports = {
    emitToDepartment,
    emitToUser,
    emitGlobal,
    emitToRoom,
  };
  