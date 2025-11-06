const pool = require('../config/database');

/**
 * Logs an action to the audit_logs table.
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - A short code for the action (e.g., 'PATIENT_CREATE').
 * @param {object} [details={}] - Optional JSON object with more details.
 */
const logAction = async (userId, action, details = {}) => {
  try {
    const query = 'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)';
    await pool.query(query, [userId, action, details]);
  } catch (error) {
    // Log the error to the console, but don't stop the main application
    console.error('Audit logging failed:', error.message);
  }
};

module.exports = { logAction };
