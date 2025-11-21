import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Beaker, Search, Play, Eye, RefreshCw, Filter, Clock, CheckCircle 
} from "lucide-react";
import toast from "react-hot-toast";

// ==================================================================================
// 🔧 INTERNAL UTILITIES (To replace missing imports)
// ==================================================================================

// 1. Internal API Fetch Wrapper
const apiFetch = async (url, options = {}) => {
  let token = "";
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      token = parsed?.token || "";
    }
  } catch (e) {
    console.error("Error reading token", e);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    let message;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || text;
    } catch {
      message = text;
    }
    throw new Error(message || `API Error: ${res.status}`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
};

// 2. Internal Service
const pathologistService = {
  getWorklist: async (filters = {}) => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleanFilters).toString();
    return apiFetch(`/api/pathologist/worklist?${query}`);
  },
};

// 3. Internal Auth Hook
const useAuth = () => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("elims_auth_v1");
      if (raw) {
        setUser(JSON.parse(raw).user);
      }
    } catch (e) {
      console.error("Auth load error", e);
    }
  }, []);
  return { user };
};

// 4. Internal Socket Hook (Mocked for stability)
const useSocket = () => ({
  socket: {
    on: () => {},
    off: () => {}
  }
});

// ==================================================================================
// 🎨 UI HELPERS
// ==================================================================================
const getStatusColor = (status) => {
  if (!status) return "bg-gray-100 text-gray-600";
  const s = status.toLowerCase().replace(/\s/g, "");

  switch (s) {
    case "samplecollected": return "bg-blue-100 text-blue-700 border-blue-200";
    case "sample_collected": return "bg-blue-100 text-blue-700 border-blue-200";
    case "inprogress": return "bg-purple-100 text-purple-700 border-purple-200";
    case "in_progress": return "bg-purple-100 text-purple-700 border-purple-200";
    case "completed": return "bg-amber-100 text-amber-700 border-amber-200";
    case "underreview": return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "verified": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "released": return "bg-gray-100 text-gray-700 border-gray-200";
    case "reopened": return "bg-orange-100 text-orange-700 border-orange-200";
    default: return "bg-gray-100 text-gray-600";
  }
};

export default function ResultListPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    status: "", // Empty = All
    search: "",
    sortBy: "updated_at",
    order: "desc"
  });

  const { socket } = useSocket();
  const { user } = useAuth();

  // -------------------------------
  // 🔄 DATA LOADER
  // -------------------------------
  const fetchResults = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await pathologistService.getWorklist(filters);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      // toast.error("Failed to load worklist"); // Suppress toast on initial load to avoid spam
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  // Initial Load
  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Live refresh from socket
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
        fetchResults();
    };
    
    socket.on("test_status_updated", handleUpdate);
    socket.on("request_status_updated", handleUpdate);
    
    return () => {
      socket.off("test_status_updated", handleUpdate);
      socket.off("request_status_updated", handleUpdate);
    };
  }, [socket, fetchResults]);

  // -------------------------------
  // 🧠 ACTION LOGIC
  // -------------------------------
  const canEnterResult = (status) => {
    const s = (status || "").toLowerCase().replace(/\s/g, "");
    // Added 'samplereceived' here to match the new workflow
    return ["samplecollected", "samplereceived", "inprogress", "reopened", "sample_collected", "sample_received", "in_progress"].includes(s);
  };

  const canReview = (status) => {
    const s = (status || "").toLowerCase().replace(/\s/g, "");
    return ["completed", "underreview", "verified"].includes(s);
  };

  // -------------------------------
  // RENDER
  // -------------------------------
  if (!user) {
      return (
          <div className="p-8 text-center text-gray-500">
              <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2" />
              Loading session...
          </div>
      );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Beaker className="text-blue-600 h-7 w-7" /> Result Entry Worklist
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                Viewing as <span className="font-medium text-gray-900">{user.name}</span> • Department: <span className="font-medium text-gray-900">{user.department || "General"}</span>
            </p>
        </div>
        <button 
            onClick={fetchResults}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"
        >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                type="text"
                name="search"
                value={filters.search}
                placeholder="Search patient, lab ID, or test..."
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Status Filter */}
            <div className="relative">
                <select
                    name="status"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                >
                    <option value="">All Statuses</option>
                    <option value="SampleReceived">Sample Received</option>
                    <option value="SampleCollected">Sample Collected</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Verified">Verified</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Date Range */}
            <input
                type="date"
                name="from"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
            <input
                type="date"
                name="to"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                <th className="p-4 border-b">Date Ordered</th>
                <th className="p-4 border-b">Lab ID</th>
                <th className="p-4 border-b">Patient</th>
                <th className="p-4 border-b">Test</th>
                <th className="p-4 border-b">Department</th>
                <th className="p-4 border-b">Status</th>
                <th className="p-4 border-b text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {loading && results.length === 0 ? (
                    <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">
                            <div className="flex justify-center mb-2">
                                <RefreshCw className="animate-spin text-blue-500 h-6 w-6" />
                            </div>
                            Loading worklist...
                        </td>
                    </tr>
                ) : results.length === 0 ? (
                    <tr>
                        <td colSpan="7" className="p-12 text-center text-gray-500 italic">
                            <div className="mb-2">No items found.</div>
                            <div className="text-xs">Check your department filters or search terms.</div>
                        </td>
                    </tr>
                ) : (
                    results.map((item) => {
                        // Determine action type
                        const status = item.item_status || item.status || "";
                        const isEnter = canEnterResult(status);
                        const isReview = canReview(status);

                        return (
                            <tr key={`${item.request_id}-${item.test_item_id}`} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 text-gray-500 whitespace-nowrap">
                                {item.date_ordered ? new Date(item.date_ordered).toLocaleDateString() : "-"}
                                <div className="text-xs text-gray-400">
                                    {item.date_ordered ? new Date(item.date_ordered).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                                </div>
                            </td>
                            <td className="p-4 font-mono text-xs font-medium text-gray-600">
                                {item.lab_id || "-"}
                            </td>
                            <td className="p-4 font-medium text-gray-900">
                                {item.patient_name}
                            </td>
                            <td className="p-4 text-gray-700">
                                {item.test_name}
                            </td>
                            <td className="p-4">
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    {item.department_name}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                                    {status}
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                {isEnter ? (
                                    <Link
                                        to={`/pathologist/results/${item.request_id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        <Play className="w-3 h-3 fill-current" /> Enter
                                    </Link>
                                ) : isReview ? (
                                    <Link
                                        to={`/pathologist/review/${item.request_id}`} // Or results/id (view mode)
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <Eye className="w-3 h-3" /> Review
                                    </Link>
                                ) : (
                                    <span className="text-gray-400 text-xs">—</span>
                                )}
                            </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}