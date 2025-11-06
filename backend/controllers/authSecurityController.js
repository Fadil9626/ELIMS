const pool = require('../config/database');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { logAuditEvent } = require('../utils/auditLogger');

// ----------------------------- Sessions (minimal) -----------------------------
// NOTE: This minimal implementation returns only the *current* session.
// If you want true multi-session tracking, add a user_sessions table and record on login.
exports.listSessions = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString();
  const now = new Date().toISOString();

  const item = {
    id: 'current',             // placeholder ID
    device: ua.includes('Mobile') ? 'Mobile' : 'Desktop',
    ip,
    user_agent: ua,
    last_seen: now,
    current: true,
  };
  res.json([item]);
};

exports.revokeSession = async (req, res) => {
  // With a real sessions store, you'd delete the row by :id or mark token invalid.
  if (logAuditEvent) {
    await logAuditEvent({
      user_id: req.user.id,
      action: 'SESSION_REVOKE',
      details: { session_id: req.params.id },
    });
  }
  res.json({ ok: true });
};

exports.revokeAllSessions = async (req, res) => {
  // With a real store, remove all sessions except current.
  if (logAuditEvent) {
    await logAuditEvent({
      user_id: req.user.id,
      action: 'SESSIONS_REVOKE_ALL',
    });
  }
  res.json({ ok: true });
};

// ------------------------------- 2FA (TOTP) ----------------------------------

function makeRecoveryCodes(n = 8) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    // 4 chunks of 4: XXXX-XXXX-XXXX-XXXX
    const chunk = () =>
      Math.random().toString(36).slice(2, 6).toUpperCase();
    codes.push(`${chunk()}-${chunk()}-${chunk()}-${chunk()}`);
  }
  return codes;
}

// POST /api/auth/2fa/setup
exports.twoFASetup = async (req, res) => {
  const userId = req.user.id;

  const { rows } = await pool.query(
    'SELECT email, two_factor_enabled FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) return res.status(404).json({ message: 'User not found' });

  if (rows[0].two_factor_enabled) {
    return res.json({ alreadyEnabled: true });
  }

  // Create a temp secret; user must confirm with a code
  const secret = speakeasy.generateSecret({
    name: `ELIMS (${rows[0].email})`,
    length: 20,
  });

  // Save temp secret
  await pool.query(
    'UPDATE users SET two_factor_temp_secret = $1 WHERE id = $2',
    [secret.base32, userId]
  );

  // Build QR as Data URL (SVG for crisp print)
  const otpauth = secret.otpauth_url;
  const qrSvg = await qrcode.toString(otpauth, { type: 'svg' });

  if (logAuditEvent) {
    await logAuditEvent({
      user_id: userId,
      action: '2FA_SETUP_START',
    });
  }

  res.json({ qrSvg, secret: secret.base32 });
};

// POST /api/auth/2fa/enable { code }
exports.twoFAEnable = async (req, res) => {
  const userId = req.user.id;
  const code = String(req.body?.code || '').trim();

  const { rows } = await pool.query(
    'SELECT two_factor_temp_secret FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) return res.status(404).json({ message: 'User not found' });
  const tempSecret = rows[0].two_factor_temp_secret;
  if (!tempSecret) return res.status(400).json({ message: '2FA setup not initiated' });

  const verified = speakeasy.totp.verify({
    secret: tempSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!verified) {
    return res.status(400).json({ message: 'Invalid 2FA code' });
  }

  const recovery = makeRecoveryCodes(8);
  await pool.query(
    `UPDATE users
     SET two_factor_enabled = true,
         two_factor_secret = $1,
         two_factor_temp_secret = NULL,
         two_factor_recovery_codes = $2
     WHERE id = $3`,
    [tempSecret, recovery, userId]
  );

  if (logAuditEvent) {
    await logAuditEvent({
      user_id: userId,
      action: '2FA_ENABLED',
    });
  }

  res.json({ recovery_codes: recovery });
};

// DELETE /api/auth/2fa/disable
exports.twoFADisable = async (req, res) => {
  const userId = req.user.id;
  await pool.query(
    `UPDATE users
     SET two_factor_enabled = false,
         two_factor_secret = NULL,
         two_factor_temp_secret = NULL,
         two_factor_recovery_codes = NULL
     WHERE id = $1`,
    [userId]
  );

  if (logAuditEvent) {
    await logAuditEvent({
      user_id: userId,
      action: '2FA_DISABLED',
    });
  }

  res.json({ ok: true });
};

// POST /api/auth/2fa/recovery
exports.twoFARegenerateRecovery = async (req, res) => {
  const userId = req.user.id;

  const { rows } = await pool.query(
    'SELECT two_factor_enabled FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) return res.status(404).json({ message: 'User not found' });
  if (!rows[0].two_factor_enabled) {
    return res.status(400).json({ message: '2FA is not enabled' });
  }

  const recovery = makeRecoveryCodes(8);
  await pool.query(
    'UPDATE users SET two_factor_recovery_codes = $1 WHERE id = $2',
    [recovery, userId]
  );

  if (logAuditEvent) {
    await logAuditEvent({
      user_id: userId,
      action: '2FA_RECOVERY_REGENERATED',
    });
  }

  res.json({ recovery_codes: recovery });
};
