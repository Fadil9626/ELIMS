// backend/middleware/auditAutoLogger.js

/**
 * TEMPORARY NO-OP AUTO LOGGER
 *
 * This middleware is currently a pass-through only.
 * It does not touch the request, does not log to DB,
 * and cannot block or break any route.
 *
 * Once the app is fully stable again, we can safely
 * re-introduce the full logging logic.
 */

const auditAutoLogger = () => {
  return (req, res, next) => {
    // If you want basic console logging for debugging, uncomment:
    // console.log(`[AUDIT] ${req.method} ${req.originalUrl}`);

    next();
  };
};

module.exports = { auditAutoLogger };
