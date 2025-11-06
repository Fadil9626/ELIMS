const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

// This route is now protected by a specific permission for viewing audit logs
router.get('/', protect, authorize('audit', 'view'), getAuditLogs);

module.exports = router;

