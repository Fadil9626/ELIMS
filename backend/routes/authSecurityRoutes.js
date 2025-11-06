const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  listSessions,
  revokeSession,
  revokeAllSessions,
  twoFASetup,
  twoFAEnable,
  twoFADisable,
  twoFARegenerateRecovery,
} = require('../controllers/authSecurityController');

// Sessions
router.get('/sessions', protect, listSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.delete('/sessions', protect, revokeAllSessions);

// TOTP 2FA
router.post('/2fa/setup', protect, twoFASetup);
router.post('/2fa/enable', protect, twoFAEnable);
router.delete('/2fa/disable', protect, twoFADisable);
router.post('/2fa/recovery', protect, twoFARegenerateRecovery);

module.exports = router;
