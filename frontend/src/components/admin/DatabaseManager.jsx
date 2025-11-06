import React, { useMemo, useState } from "react";
import databaseService from "../../services/databaseService";
import {
  HiDownload,
  HiDatabase,
  HiCheckCircle,
  HiExclamationCircle,
  HiChevronDown,
  HiCog,
} from "react-icons/hi";

const DatabaseManager = () => {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("sql"); // 'sql' | 'custom'
  const [gzip, setGzip] = useState(true);
  const [dbOverride, setDbOverride] = useState("");
  const [filename, setFilename] = useState("backup");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const buttonLabel = useMemo(() => {
    const ext = format === "custom" ? "pgdump" : "sql";
    return loading ? "Preparing…" : `Download ${ext}${gzip ? ".gz" : ""}`;
  }, [format, gzip, loading]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    // rudimentary filename check
    if (!filename || /[^a-zA-Z0-9._-]/.test(filename)) return false;
    return true;
  }, [loading, filename]);

  const handleBackupClick = async () => {
    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const token = userInfo ? userInfo.token : null;
      if (!token) throw new Error("You are not authenticated.");

      await databaseService.createBackup(token, {
        format,
        gzip,
        db: dbOverride.trim() || undefined,
        filename: filename.trim() || "backup",
        timeoutMs: 10 * 60 * 1000, // 10 minutes
      });

      setDone(true);
    } catch (err) {
      setError(err?.message || "Backup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
            <HiDatabase className="h-6 w-6 text-blue-600" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Database Backup & Restore
            </h2>
            <p className="text-sm text-gray-600">
              Create a downloadable backup of your PostgreSQL database. Use the
              options below to choose format, compression, and advanced
              parameters.
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700">
            Backup format
          </span>
          <select
            className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={loading}
          >
            <option value="sql">Plain SQL (.sql)</option>
            <option value="custom">Custom Archive (.pgdump)</option>
          </select>
          <span className="mt-1 block text-xs text-gray-500">
            Use <strong>Plain SQL</strong> for simple restores via <code>psql</code>.
            Use <strong>Custom Archive</strong> for <code>pg_restore</code>.
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700">
            Filename prefix
          </span>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            disabled={loading}
            className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            placeholder="backup"
            inputMode="latin"
            pattern="[A-Za-z0-9._-]+"
            title="Only letters, numbers, dot, underscore, and dash are allowed"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Letters, numbers, <code>.</code> <code>_</code> <code>-</code> only.
            The date/time and extension are added automatically.
          </span>
        </label>
      </div>

      {/* Advanced */}
      <div className="mt-4">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          onClick={() => setShowAdvanced((s) => !s)}
          aria-expanded={showAdvanced}
        >
          <HiChevronDown
            className={`h-4 w-4 transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
          Advanced options
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-gray-200 p-4 bg-gray-50">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={gzip}
                onChange={(e) => setGzip(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Enable gzip compression
              </span>
            </label>

            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-gray-700">
                Override database name (optional)
              </span>
              <input
                type="text"
                value={dbOverride}
                onChange={(e) => setDbOverride(e.target.value)}
                disabled={loading}
                className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Leave blank to use server default"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Useful if your server isn’t using <code>DATABASE_URL</code> and
                you manage multiple DBs.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Status / Alerts */}
      <div className="mt-4 space-y-2">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <HiExclamationCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Backup failed</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
        {!error && done && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <HiCheckCircle className="h-5 w-5" />
            <p>Backup started and download delivered successfully.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={handleBackupClick}
          disabled={!canSubmit}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white transition ${
            canSubmit
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <>
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <span>Preparing…</span>
            </>
          ) : (
            <>
              <HiDownload className="h-5 w-5" />
              <span>{buttonLabel}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setDone(false);
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
          title="Clear status"
        >
          <HiCog className="h-5 w-5" />
          Reset status
        </button>

        <span className="text-xs text-gray-500 ml-auto">
          Restore tips: <code>psql -f backup.sql</code> or{" "}
          <code>pg_restore -d db backup.pgdump</code>
        </span>
      </div>
    </div>
  );
};

export default DatabaseManager;
