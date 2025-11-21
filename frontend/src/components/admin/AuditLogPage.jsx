import React, { useState, useEffect, useCallback } from "react";
import apiFetch from "../../services/apiFetch"; // 🚀 1. Import apiFetch
import {
  HiSearch,
  HiServer,
  HiRefresh,
  HiDownload,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    action: "",
    module: "",
    severity: "",
    user: "",
    role: "",
    from: "",
    to: "",
    page: 1,
    limit: 20,
  });

  const limitOptions = [20, 50, 100, 200];

  // Fetch logs
  const fetchLogs = useCallback(async () => { // 🚀 2. Added useCallback
    setLoading(true);

    try {
      // 🚀 3. REMOVED manual token logic. apiFetch handles it.

      // 🚀 4. Use URLSearchParams to build the query string from filters
      const queryParams = new URLSearchParams(filters).toString();
      
      // 🚀 5. Use apiFetch and the CORRECT URL
      const data = await apiFetch(`/api/audit-logs?${queryParams}`);

      setLogs(data.logs);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.message || "Error fetching audit logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]); // 🚀 6. Depend on the filters object

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]); // 🚀 7. Depend on the memoized fetchLogs

  const handleChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      page: key === "limit" ? 1 : prev.page,
      [key]: value,
    }));
  };

  const totalPages = Math.ceil(total / filters.limit);

  // Export logs
  const exportData = (type = "csv") => {
    const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}.${type}`;

    let content =
      type === "json"
        ? JSON.stringify(logs, null, 2)
        : logs
            .map((log) =>
              [
                log.username,
                log.role,
                log.module,
                log.action,
                log.severity,
                JSON.stringify(log.details || {}),
                log.ip_address,
                log.user_agent,
                new Date(log.created_at).toLocaleString(),
              ].join(",")
            )
            .join("\n");

    const blob = new Blob([content], {
      type: type === "json" ? "application/json" : "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <HiServer className="text-blue-600" /> System Audit Logs
        </h2>

        <div className="flex gap-3">
          <button
            onClick={() => exportData("csv")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <HiDownload /> CSV
          </button>

          <button
            onClick={() => exportData("json")}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
          >
            <HiDownload /> JSON
          </button>

          <button
            onClick={() => setRefreshing(true) || fetchLogs()}
            disabled={refreshing}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              refreshing
                ? "bg-blue-100 text-blue-600"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <HiRefresh className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border grid lg:grid-cols-6 md:grid-cols-3 sm:grid-cols-2 gap-4 mb-6">

        <div className="relative lg:col-span-2">
          <HiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search user, module, action..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="w-full p-2 pl-10 border rounded-lg"
          />
        </div>

        <select
          className="p-2 border rounded-lg"
          value={filters.module}
          onChange={(e) => handleChange("module", e.target.value)}
        >
          <option value="">All Modules</option>
          <option value="AUTH">Auth</option>
          <option value="PATIENT">Patients</option>
          <option value="TEST_REQUEST">Test Requests</option>
          <option value="RESULT">Results</option>
          <option value="BILLING">Billing</option>
          <option value="INVOICE">Invoices</option>
          <option value="INVENTORY">Inventory</option>
          <option value="USER">Users</option>
        </select>

        <select
          className="p-2 border rounded-lg"
          value={filters.severity}
          onChange={(e) => handleChange("severity", e.target.value)}
        >
          <option value="">All Severity</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(e) => handleChange("from", e.target.value)}
          className="p-2 border rounded-lg"
        />

        <input
          type="date"
          value={filters.to}
          onChange={(e) => handleChange("to", e.target.value)}
          className="p-2 border rounded-lg"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">

            <thead className="bg-gray-100">
              <tr className="text-xs uppercase text-gray-600 font-semibold tracking-wide">
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Module</th>
                <th className="p-3">Action</th>
                <th className="p-3">Severity</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">User Agent</th>
                <th className="p-3">Details</th>
                <th className="p-3 text-right">Time</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4" colSpan={9}>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    No logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{log.username}</td>
                    <td className="p-3 text-xs text-gray-600">{log.role}</td>
                    <td className="p-3">{log.module}</td>

                    <td className="p-3">
                      <span className="text-sm font-mono px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          log.severity === "CRITICAL"
                            ? "bg-red-100 text-red-700"
                            : log.severity === "WARNING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>

                    <td className="p-3 text-xs text-gray-700">
                      {log.ip_address}
                    </td>

                    <td className="p-3 text-xs text-gray-500 max-w-xs truncate">
                      {log.user_agent}
                    </td>

                    <td className="p-3 text-xs">
                      <pre className="bg-gray-50 p-2 rounded border max-w-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>

                    <td className="p-3 text-right text-gray-600 text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-3">
        <div className="text-sm text-gray-600">
          Page <b>{filters.page}</b> of <b>{totalPages}</b> — Total:{" "}
          <b>{total}</b>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filters.limit}
            onChange={(e) => handleChange("limit", Number(e.target.value))}
            className="p-2 border rounded-lg"
          >
            {limitOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <button
              disabled={filters.page === 1}
              onClick={() => handleChange("page", filters.page - 1)}
              className="p-2 bg-gray-200 rounded disabled:opacity-50"
            >
              <HiChevronLeft />
            </button>

            <span className="text-sm text-gray-700">
              {filters.page} / {totalPages}
            </span>

            <button
              disabled={filters.page >= totalPages}
              onClick={() => handleChange("page", filters.page + 1)}
              className="p-2 bg-gray-200 rounded disabled:opacity-50"
            >
              <HiChevronRight />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AuditLogPage;