import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Eye, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import pathologistService from "../../services/pathologistService";
import type {
  StatusCounts,
  WorklistItem,
  WorklistFilters,
} from "../../services/pathologistService";
import { useSocket } from "../../context/SocketContext";

// =============================================================
// 🧩 Helper Components
// =============================================================

/**
 * Returns full Tailwind class strings to work with JIT compiler.
 */
const getStatusColors = (color: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-100 text-blue-800";
    case "purple":
      return "bg-purple-100 text-purple-800";
    case "yellow":
      return "bg-yellow-100 text-yellow-800";
    case "teal":
      return "bg-teal-100 text-teal-800";
    case "gray":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const StatusBadge: React.FC<{ label: string; count?: number; color: string }> = ({
  label,
  count = 0,
  color,
}) => (
  <div
    className={`flex items-center justify-between space-x-2 p-3 rounded-lg shadow-sm ${getStatusColors(
      color
    )}`}
  >
    <span className="font-semibold">{label}:</span>
    <span className="font-bold text-xl">{count}</span>
    </div>
);

// =============================================================
// 🧠 Pathologist Worklist Page
// =============================================================
const PathologistWorklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🟢 FIX: Set initial status filter to empty string to show ALL relevant items by default.
  const [filters, setFilters] = useState<WorklistFilters>({
    from: "",
    to: "",
    status: "", 
    search: "",
  });

  // Retrieve user info from localStorage
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const token: string | null = userInfo?.token || null;
  const roleId: number | null = userInfo?.user?.role_id || null;
  const userDept: string | null = userInfo?.user?.department || null;

  // =============================================================
  // 📡 Fetch Worklist Data
  // =============================================================
  const loadWorklist = useCallback(
    async (isManualRefresh = false) => {
      if (!token) return;
      setLoading(true);

      try {
        const [worklistData, countsData] = await Promise.all([
          pathologistService.getWorklist(token, filters),
          pathologistService.getStatusCounts(token),
        ]);

        // Department-based filtering (if pathologist)
        const filteredWorklist =
          roleId === 3 && userDept
            ? worklistData.filter(
                (test) =>
                  test.department_name &&
                  test.department_name.toLowerCase() === userDept.toLowerCase()
              )
            : worklistData;

        setWorklist(filteredWorklist);
        setStatusCounts(countsData);
        setError(null);
        if (isManualRefresh) {
          toast.success("Worklist refreshed");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load worklist");
        if (isManualRefresh) {
          toast.error("Failed to refresh worklist");
        }
      } finally {
        setLoading(false);
      }
    },
    [token, filters, roleId, userDept]
  );

  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // =============================================================
  // ⚡ Socket.io Real-time Updates
  // =============================================================
  useEffect(() => {
    if (!socket) return;

    const handleWorklistUpdate = (data: any) => {
      const isRelevant =
        !userDept ||
        (data?.department_name &&
          data.department_name.toLowerCase() === userDept.toLowerCase());

      if (isRelevant) {
        toast.success("Worklist updated.", {
          id: "socket_worklist",
          icon: "🔔",
        });
        loadWorklist();
      }
    };

    socket.on("new_test_request", handleWorklistUpdate);
    socket.on("test_status_updated", handleWorklistUpdate);

    return () => {
      socket.off("new_test_request", handleWorklistUpdate);
      socket.off("test_status_updated", handleWorklistUpdate);
    };
  }, [socket, userDept, loadWorklist]);

  // =============================================================
  // 🧭 Handlers
  // =============================================================
  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const getStatusClass = (status: string) => {
    if (!status) return "bg-gray-200 text-gray-800";
    switch (status.toLowerCase()) {
      case "sample collected":
        return "bg-blue-200 text-blue-800";
      case "in progress":
        return "bg-purple-200 text-purple-800";
      case "completed":
        return "bg-yellow-200 text-yellow-800";
      case "under review":
        return "bg-cyan-200 text-cyan-800";
      case "reopened":
        return "bg-orange-200 text-orange-800";
      case "verified":
        return "bg-green-200 text-green-800";
      // Added Released status color
      case "released":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  // =============================================================
  // ⚙️ Handle Analyze Action (Start Entry)
  // =============================================================
  const handleAnalyze = async (requestId: number) => {
    if (!token) {
      toast.error("Not authenticated. Please log in.", { id: "analyze" });
      return;
    }

    try {
      toast.loading("Loading result entry form...", { id: "analyze" });

      toast.success("Loading result entry form.", { id: "analyze" });
      // The Result Entry Page route uses the REQUEST ID
      navigate(`/pathologist/results/${requestId}`);
    } catch (e: any) {
      console.error("❌ Analyze error:", e?.message ?? e);
      toast.error(e?.message || "Failed to start analysis", { id: "analyze" });
    }
  };
    
  // =============================================================
  // 🧭 Render
  // =============================================================
  if (error)
    return (
      <div className="p-6 text-red-500">❌ Error loading worklist: {error}</div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Pathologist Worklist</h1>
        <div className="flex items-center gap-4">
          {roleId === 3 && (
            <span className="px-4 py-2 rounded-full text-sm font-semibold bg-teal-100 text-teal-800 shadow">
              Department: {userDept || "Unassigned"}
            </span>
          )}
          <button
            onClick={() => loadWorklist(true)}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-50"
            title="Refresh worklist"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="date"
              name="from"
              value={filters.from}
              onChange={handleFilterChange}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="date"
              name="to"
              value={filters.to}
              onChange={handleFilterChange}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 p-2 w-full border rounded-md"
            >
              <option value="">All</option>
              <option value="Sample Collected">Sample Collected</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed (Pending Review)</option>
              <option value="Under Review">Under Review</option>
              <option value="Reopened">Reopened</option>
              <option value="Verified">Verified</option>
              <option value="Released">Released</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              name="search"
              placeholder="Search by name or Patient ID..."
              value={filters.search}
              onChange={handleFilterChange}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusBadge
          label="Sample Collected"
          count={statusCounts.sample_collected}
          color="blue"
        />
        <StatusBadge
          label="In Progress"
          count={statusCounts.in_progress}
          color="purple"
        />
        <StatusBadge
          label="Completed"
          count={statusCounts.completed}
          color="yellow"
        />
        <StatusBadge
          label="Verified"
          count={statusCounts.verified}
          color="teal"
        />
        <StatusBadge
          label="Released"
          count={statusCounts.released}
          color="gray"
        />
        </div>

      {/* Worklist Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-800 text-white font-bold text-lg">
          Tests Ready for Review ({worklist.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold">Date Ordered</th>
                <th className="p-4 font-semibold">Patient</th>
                <th className="p-4 font-semibold">Test</th>
                <th className="p-4 font-semibold">Department</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Loading worklist...
                  </td>
                </tr>
              ) : worklist.length > 0 ? (
                worklist.map((item) => {
                  const status = item.item_status || item.test_status;
                  const isForReview = ["Completed", "Under Review"].includes(
                    status
                  );
                  
                    // 🟢 FIX 1: Include 'Pending' to show the "Enter Result" button
                  const isForEntry = [
                    "Sample Collected",
                    "Pending", // <<< ADDED PENDING
                    "In Progress",
                    "Reopened",
                  ].includes(status);

                  return (
                    <tr
                      key={item.test_item_id}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(item.date_ordered).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{item.patient_name}</div>
                        <div className="text-xs text-gray-500">
                          ID: {item.patient_id || "N/A"}
                        </div>
                      </td>
                      <td className="p-4">{item.test_name}</td>
                      <td className="p-4">{item.department_name || "N/A"}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-4">
                        {isForEntry ? (
                          <button
                            // Using request_id as the route ID for the form page
                            onClick={() => handleAnalyze(item.request_id)} 
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Play className="w-4 h-4" />
                            Enter Result
                          </button>
                        ) : isForReview ? (
                          <Link
                            to={`/pathologist/review/${item.request_id}`}
                            className="flex items-center gap-1 text-cyan-700 hover:text-cyan-900 font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            {status === "Completed"
                              ? "Review"
                              : "Continue Review"}
                          </Link>
                        ) : (
                          // This will now show "Verified", "Released", etc.
                          <span className="flex items-center gap-1 text-gray-500 font-medium">
                            <CheckCircle className="w-4 h-4" />
                            {status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-gray-500 italic"
                  >
                    No test requests found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PathologistWorklistPage;