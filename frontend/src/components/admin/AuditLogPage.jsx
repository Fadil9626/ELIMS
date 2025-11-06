import React, { useState, useEffect } from "react";
import { getLogs } from "../../services/auditService";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const token = userInfo ? userInfo.token : null;
      if (!token) throw new Error("Missing authentication token.");

      const filters = {
        search: searchTerm,
        action: actionFilter,
        from: fromDate,
        to: toDate,
        page,
        limit,
      };

      const data = await getLogs(token, filters);
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch when filters or page change
  useEffect(() => {
    const timer = setTimeout(fetchLogs, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, actionFilter, fromDate, toDate, page, limit]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const exportData = (type = "csv") => {
    const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}.${type}`;
    const content =
      type === "json"
        ? JSON.stringify(logs, null, 2)
        : logs
            .map((log) =>
              [
                log.user_name,
                log.action,
                JSON.stringify(log.details).replace(/,/g, ";"),
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

  const totalLogs = logs.length;
  const totalPages = Math.ceil(totalLogs / limit) || 1;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h2 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">
          <HiServer className="text-blue-600" /> System Audit Logs
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => exportData("csv")}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <HiDownload className="w-5 h-5" /> Export CSV
          </button>
          <button
            onClick={() => exportData("json")}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            <HiDownload className="w-5 h-5" /> Export JSON
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              refreshing
                ? "bg-blue-100 text-blue-600 cursor-wait"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <HiRefresh className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 mb-6 grid sm:grid-cols-4 gap-4">
        <div className="relative sm:col-span-2">
          <HiSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search user, action, or details..."
            className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="LOGIN_SUCCESS">Login Success</option>
          <option value="LOGIN_FAILED">Login Failed</option>
          <option value="PATIENT_CREATE">Patient Create</option>
          <option value="TEST_REQUEST">Test Request</option>
          <option value="INVOICE_PAYMENT">Invoice Payment</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            className="p-2 border border-gray-300 rounded-lg w-1/2"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            type="date"
            className="p-2 border border-gray-300 rounded-lg w-1/2"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg font-medium">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr className="text-gray-600 uppercase text-xs font-semibold tracking-wide">
                <th className="p-4">User</th>
                <th className="p-4">Action</th>
                <th className="p-4">Details</th>
                <th className="p-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4">
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="h-3 bg-gray-200 rounded w-20 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs
                  .slice((page - 1) * limit, page * limit)
                  .map((log, i) => (
                    <tr
                      key={log.id || i}
                      className={`border-b hover:bg-gray-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="p-4 font-semibold text-gray-900">
                        {log.user_name}
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <pre className="whitespace-pre-wrap break-words bg-gray-50 p-2 rounded-md border border-gray-100">
                          {typeof log.details === "object"
                            ? JSON.stringify(log.details, null, 2)
                            : log.details}
                        </pre>
                      </td>
                      <td className="p-4 text-right text-gray-500 text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="p-6 text-center text-gray-500 font-medium"
                  >
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-3">
        <div className="text-gray-600 text-sm">
          Showing{" "}
          <span className="font-semibold">
            {(page - 1) * limit + 1}–
            {Math.min(page * limit, totalLogs)}
          </span>{" "}
          of <span className="font-semibold">{totalLogs}</span> logs
        </div>

        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="p-2 border border-gray-300 rounded-lg text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
            >
              <HiChevronLeft />
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
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
