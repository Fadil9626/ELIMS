const pool = require('../config/database');

/**
 * Logs an event to the audit_logs table.
 * @param {Object} options
 * @param {number|null} options.user_id - ID of the user (null for guests/system)
 * @param {string} options.action - Action performed (e.g., "LOGIN_SUCCESS", "CREATE_PATIENT")
 * @param {Object} options.details - Additional metadata about the action
 */
const logAuditEvent = async ({ user_id = null, action, details = {} }) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [user_id, action, details]
    );
  } catch (error) {
    console.error('⚠️ Failed to write audit log:', error.message);
  }
};

module.exports = { logAuditEvent };
