const express = require('express');
const router = express.Router();
const { createBackup } = require('../controllers/databaseBackupController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Only users with the 'admin/backup' permission can download DB dumps
router.post('/backup', protect, authorize('admin', 'backup'), createBackup);

module.exports = router;
