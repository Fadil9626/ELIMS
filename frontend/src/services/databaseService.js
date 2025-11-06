// src/services/databaseService.js
// Service for handling database operations like backups.

function parseFilenameFromContentDisposition(cd, fallback) {
  if (!cd) return fallback;

  // RFC 5987: filename*=UTF-8''<url-encoded>
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star && star[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* ignore and try plain filename */
    }
  }

  // Plain: filename="foo.sql"
  const plain = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (plain && plain[2]) return plain[2];

  return fallback;
}

/**
 * Create and download a database backup.
 * @param {string} token - Bearer token
 * @param {object} [opts]
 * @param {'sql'|'custom'} [opts.format='sql'] - 'sql' (plain) or 'custom' (pg_dump -Fc)
 * @param {boolean} [opts.gzip=true] - gzip the stream
 * @param {string} [opts.db] - override DB name if not using DATABASE_URL on the server
 * @param {string} [opts.filename] - filename prefix (server adds db + timestamp + ext)
 * @param {number} [opts.timeoutMs=120000] - request timeout in ms
 */
const createBackup = async (token, opts = {}) => {
  const {
    format = 'sql',
    gzip = true,
    db,
    filename,
    timeoutMs = 120000,
  } = opts;

  const params = new URLSearchParams();
  params.set('format', format === 'custom' ? 'custom' : 'sql');
  params.set('gzip', gzip ? '1' : '0');
  if (db) params.set('db', db);
  if (filename) params.set('filename', filename);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api/database/backup?${params.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      // Try to surface meaningful server error text/json
      const contentType = res.headers.get('content-type') || '';
      let message = `Failed to create database backup (HTTP ${res.status})`;
      try {
        if (contentType.includes('application/json')) {
          const j = await res.json();
          if (j?.message) message = j.message;
          else if (j?.error) message = j.error;
        } else {
          const t = await res.text();
          if (t) message = t;
        }
      } catch {
        /* ignore parse errors */
      }
      throw new Error(message);
    }

    const cd = res.headers.get('content-disposition');
    const fallbackName =
      `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.${format === 'custom' ? 'pgdump' : 'sql'}${gzip ? '.gz' : ''}`;
    const downloadName = parseFilenameFromContentDisposition(cd, fallbackName);

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } finally {
    clearTimeout(timer);
  }
};

const databaseService = { createBackup };
export default databaseService;
