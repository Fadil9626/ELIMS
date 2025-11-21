import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FlaskConical,
  FileCheck2,
  FileText,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Beaker,
  BadgeCheck,
  Info,
  Play,
  Eye,
} from "lucide-react";

// ==================================================================================
// 🔧 SELF-CONTAINED SERVICE & AUTH (Internal)
// ==================================================================================

const apiFetch = async (url, options = {}) => {
  let token = "";
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (raw) token = JSON.parse(raw)?.token || "";
  } catch (e) {}

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
};

const pathologistService = {
  getStatusCounts: async () => apiFetch("/api/pathologist/status-counts"),
  getWorklist: async (filters = {}) => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(
        ([_, v]) => v !== undefined && v !== null && v !== ""
      )
    );
    const query = new URLSearchParams(cleanFilters).toString();
    return apiFetch(`/api/pathologist/worklist?${query}`);
  },
};

const useAuthInternal = () => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("elims_auth_v1");
      if (raw) setUser(JSON.parse(raw).user);
    } catch (e) {}
  }, []);

  const can = (res, act) => {
    const map = user?.permissions_map || {};
    if (map["*:*"]) return true;
    const key = `${res}:${act}`.toLowerCase();
    return !!map[key];
  };

  return { user, can };
};

// ==================================================================================
// COMPONENT
// ==================================================================================

const cn = (...classes) => classes.filter(Boolean).join(" ");

const PathologistWorklistPage = () => {
  const navigate = useNavigate();
  const { user, can } = useAuthInternal();

  // Permissions
  const canEnter = can("pathologist", "enter") || can("results", "enter");
  const canVerify = can("pathology", "verify");
  const canOnlyView = !canEnter && !canVerify;

  // Filters & data
  const [filters, setFilters] = useState({
    status: "",
    order: "desc",
    sortBy: "updated_at",
    search: "",
  });
  const [worklist, setWorklist] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [c, w] = await Promise.all([
        pathologistService.getStatusCounts(),
        pathologistService.getWorklist(filters),
      ]);
      setCounts(c || {});
      setWorklist(Array.isArray(w) ? w : []);
    } catch (e) {
      console.error("Load Error:", e);
      // Optional: toast or silent
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigation Logic (entry vs review page)
  const handleNavigation = (row) => {
    const norm = (row.item_status || row.test_status || "")
      .toLowerCase()
      .replace(/\s/g, "");

    const isReviewState = ["completed", "underreview", "verified", "released"].includes(
      norm
    );

    if (isReviewState) {
      navigate(`/pathologist/review/${row.request_id}`);
    } else {
      navigate(`/pathologist/results/${row.request_id}`);
    }
  };

  const statusPills = [
    {
      key: "sample_collected",
      label: "Ready for Result",
      icon: Beaker,
      value: counts.sample_collected || 0,
    },
    {
      key: "in_progress",
      label: "In Progress",
      icon: FlaskConical,
      value: counts.in_progress || 0,
    },
    {
      key: "completed",
      label: "To Verify",
      icon: FileCheck2,
      value: counts.completed || 0,
    },
    {
      key: "verified",
      label: "Verified",
      icon: BadgeCheck,
      value: counts.verified || 0,
    },
    {
      key: "released",
      label: "Released",
      icon: FileText,
      value: counts.released || 0,
    },
  ];

  if (!user)
    return (
      <div className="p-12 text-center text-gray-500">Loading session...</div>
    );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Lab Worklist
          </h1>
          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <Info size={14} />
            <span>
              Viewing as:{" "}
              <span className="font-medium">
                {user.full_name || user.name || user.email}
              </span>{" "}
              ({user.department || "General"})
            </span>
          </div>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-white border shadow-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw
            className={cn("h-4 w-4", loading && "animate-spin text-blue-600")}
          />{" "}
          Refresh
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusPills.map((p) => (
          <button
            type="button"
            key={p.key}
            className={cn(
              "rounded-xl bg-white border p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-all",
              filters.status === p.key && "ring-2 ring-blue-500 border-blue-300"
            )}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === p.key ? "" : p.key,
              }))
            }
          >
            <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
              <p.icon className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-xs font-medium text-gray-500 uppercase">
                {p.label}
              </div>
              <div className="text-2xl font-bold text-gray-900">{p.value}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              placeholder="Search patient, lab ID..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 ring-blue-500"
            />
          </div>
          <button
            onClick={() => setExpandedFilters((v) => !v)}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 hover:bg-gray-100"
          >
            <Filter className="h-4 w-4" /> Filters{" "}
            {expandedFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
        {expandedFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="">All</option>
                {/* ✅ keep keys aligned with backend & statusCounts */}
                <option value="sample_collected">Sample Collected</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
                <option value="released">Released</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border overflow-hidden shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-3">Patient</th>
              <th className="px-6 py-3">Lab ID</th>
              <th className="px-6 py-3">Test</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && worklist.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No items found.
                </td>
              </tr>
            )}

            {!loading &&
              worklist.map((row) => {
                const normStatus = (row.item_status || row.test_status || "")
                  .toLowerCase()
                  .replace(/\s/g, "");

                const isReviewState = [
                  "completed",
                  "underreview",
                  "verified",
                  "released",
                ].includes(normStatus);

                const statusBadgeClass =
                  row.item_status === "Completed"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : row.item_status === "Verified"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : row.item_status === "SampleReceived"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : row.item_status === "Released"
                    ? "bg-teal-100 text-teal-800 border-teal-200"
                    : "bg-yellow-100 text-yellow-800 border-yellow-200";

                // Button behavior based on permissions + status
                let label = "Enter Result";
                let Icon = Play;
                let disabled = false;

                if (canOnlyView) {
                  label = "View";
                  Icon = Eye;
                  disabled = false; // can still navigate, just not perform sensitive actions
                } else if (isReviewState && canVerify) {
                  label = "Review";
                  Icon = Eye;
                } else if (isReviewState && !canVerify && canEnter) {
                  // Can enter but cannot verify → treat as read-only on completed stuff
                  label = "View";
                  Icon = Eye;
                } else if (!isReviewState && canEnter) {
                  label = "Enter Result";
                  Icon = Play;
                } else {
                  label = "View";
                  Icon = Eye;
                }

                return (
                  <tr
                    key={`${row.request_id}-${row.test_item_id}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {row.patient_name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {row.lab_id}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {row.test_name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          statusBadgeClass
                        )}
                      >
                        {row.item_status || row.test_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleNavigation(row)}
                        disabled={disabled}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors",
                          disabled
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isReviewState
                            ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PathologistWorklistPage;
