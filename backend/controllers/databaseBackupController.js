const { spawn } = require("child_process");
const zlib = require("zlib");
const { logAuditEvent } = require("../utils/auditLogger"); // optional

// ---- helpers --------------------------------------------------

function safeBool(v, fallback = true) {
  if (v === true || v === "1" || v === 1 || v === "true") return true;
  if (v === false || v === "0" || v === 0 || v === "false") return false;
  return fallback;
}

function normalizeFormat(v) {
  return String(v).toLowerCase() === "custom" ? "custom" : "sql";
}

// Only allow simple filename prefixes
function sanitizePrefix(s, fallback = "backup") {
  if (!s) return fallback;
  const cleaned = String(s).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  return cleaned || fallback;
}

function buildPgDumpArgs({ dbUrl, dbName, format }) {
  const args = [];
  if (format === "custom") args.push("-Fc");

  if (dbUrl) {
    args.push(`--dbname=${dbUrl}`); // pg_dump parses URI
  } else {
    if (process.env.PGHOST) args.push("-h", process.env.PGHOST);
    if (process.env.PGPORT) args.push("-p", process.env.PGPORT);
    if (process.env.PGUSER) args.push("-U", process.env.PGUSER);
    args.push(dbName || process.env.PGDATABASE);
  }
  return args;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function buildFilename({ base = "backup", db, format, gzip }) {
  const ext = format === "custom" ? "pgdump" : "sql";
  return `${base}_${db || "db"}_${timestamp()}.${ext}${gzip ? ".gz" : ""}`;
}

function inferDbLabel({ dbOverride, dbUrl }) {
  if (dbOverride) return dbOverride;
  if (dbUrl) {
    try {
      const u = new URL(dbUrl);
      return u.pathname.replace(/^\//, "") || "db";
    } catch {
      /* ignore */
    }
  }
  return process.env.PGDATABASE || "db";
}

// ---- controller -----------------------------------------------

// POST /api/database/backup
// Query/body (optional):
//   format=sql|custom   (default sql)
//   gzip=0|1            (default 1)
//   db=<name>           (override DB name if not using DATABASE_URL)
//   filename=<prefix>   (default 'backup')
//   timeoutMs=<int>     (default 10 minutes)
async function createBackup(req, res) {
  const user = req.user || {};

  const format = normalizeFormat(req.query.format || req.body?.format || "sql");
  const gzip = safeBool(req.query.gzip ?? req.body?.gzip ?? "1", true);
  const dbOverride = (req.query.db || req.body?.db || "").trim() || null;
  const filenamePrefix = sanitizePrefix(req.query.filename || req.body?.filename || "backup");
  const timeoutMs = Number(req.query.timeoutMs || req.body?.timeoutMs || 600_000); // 10 min default

  const dbUrl = process.env.DATABASE_URL || "";
  const pgEnv = { ...process.env }; // PGPASSWORD honored here if set

  // choose execution method
  const container = process.env.POSTGRES_CONTAINER_NAME || "";
  const pgArgs = buildPgDumpArgs({ dbUrl, dbName: dbOverride, format });

  let cmd, args;
  if (container) {
    cmd = "docker";
    args = ["exec", "-i", container, "pg_dump", ...pgArgs];
  } else {
    cmd = "pg_dump";
    args = pgArgs;
  }

  const dbLabel = inferDbLabel({ dbOverride, dbUrl });
  const filename = buildFilename({ base: filenamePrefix, db: dbLabel, format, gzip });

  // headers
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Content-Type",
    gzip
      ? "application/gzip"
      : format === "custom"
      ? "application/octet-stream"
      : "application/sql"
  );

  // audit start (non-blocking)
  try {
    if (logAuditEvent) {
      await logAuditEvent({
        user_id: user.id,
        action: "DB_BACKUP_START",
        details: { format, gzip, run: container ? "docker" : "host", db: dbLabel },
      });
    }
  } catch {}

  const dump = spawn(cmd, args, { env: pgEnv });
  let finished = false;

  // optional timeout
  const killer =
    timeoutMs > 0
      ? setTimeout(() => {
          if (!finished) dump.kill("SIGTERM");
        }, timeoutMs)
      : null;

  // if client disconnects, stop pg_dump
  res.on("close", () => {
    if (!finished) dump.kill("SIGTERM");
  });

  dump.on("error", async (err) => {
    console.error("pg_dump spawn error:", err);
    if (!res.headersSent) res.status(500).end("pg_dump not found or failed to start");
    try {
      if (logAuditEvent) {
        await logAuditEvent({
          user_id: user.id,
          action: "DB_BACKUP_FAILED",
          details: { error: err.message },
        });
      }
    } catch {}
  });

  dump.stderr.on("data", (chunk) => process.stderr.write(chunk)); // keep server logs

  if (gzip) {
    const gz = zlib.createGzip({ level: 6 });
    dump.stdout.pipe(gz).pipe(res);

    gz.on("close", async () => {
      finished = true;
      if (killer) clearTimeout(killer);
      try {
        if (logAuditEvent) {
          await logAuditEvent({
            user_id: user.id,
            action: "DB_BACKUP_DONE",
            details: { format, gzip: true, file: filename, db: dbLabel },
          });
        }
      } catch {}
    });
  } else {
    dump.stdout.pipe(res);
    dump.stdout.on("close", async () => {
      finished = true;
      if (killer) clearTimeout(killer);
      try {
        if (logAuditEvent) {
          await logAuditEvent({
            user_id: user.id,
            action: "DB_BACKUP_DONE",
            details: { format, gzip: false, file: filename, db: dbLabel },
          });
        }
      } catch {}
    });
  }
}

module.exports = { createBackup };
