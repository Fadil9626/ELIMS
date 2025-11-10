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
import { useAuth } from "../../context/AuthContext"; // ✅ ADDED

// =============================================================
// 🧩 Helper Components
// =============================================================

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
  <div className={`flex items-center justify-between space-x-2 p-3 rounded-lg shadow-sm ${getStatusColors(color)}`}>
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
  const { can } = useAuth(); // ✅ ADDED
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<WorklistFilters>({
    from: "",
    to: "",
    status: "",
    search: "",
  });

  // ✅ PERMISSION ENFORCEMENT (IMPORTANT)
  if (!can("lab_work", "view")) {
    return (
      <div className="p-6 text-center text-red-600 font-medium">
        🚫 Access Denied — You do not have permission to view the Lab Worklist.
      </div>
    );
  }

  // Retrieve user info (for department filtering if needed)
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
        if (isManualRefresh) toast.success("Worklist refreshed");
      } catch (err: any) {
        setError(err.message || "Failed to load worklist");
        if (isManualRefresh) toast.error("Failed to refresh worklist");
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
  // 🔄 Real-time Updates via Socket.io
  // =============================================================
  useEffect(() => {
    if (!socket) return;

    const handleWorklistUpdate = () => {
      toast.success("Worklist updated", { id: "socket_worklist" });
      loadWorklist();
    };

    socket.on("new_test_request", handleWorklistUpdate);
    socket.on("test_status_updated", handleWorklistUpdate);

    return () => {
      socket.off("new_test_request", handleWorklistUpdate);
      socket.off("test_status_updated", handleWorklistUpdate);
    };
  }, [socket, loadWorklist]);

  // =============================================================
  // Handlers
  // =============================================================
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "samplecollected":
        return "bg-blue-200 text-blue-800";
      case "inprogress":
        return "bg-purple-200 text-purple-800";
      case "completed":
        return "bg-yellow-200 text-yellow-800";
      case "underreview":
        return "bg-cyan-200 text-cyan-800";
      case "verified":
        return "bg-green-200 text-green-800";
      case "released":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const handleAnalyze = (requestId: number) => {
    navigate(`/pathologist/results/${requestId}`);
  };

  const handleReviewNavigation = (requestId: number) => {
    navigate(`/pathologist/review/${requestId}`);
  };

  const handleMarkForReview = async (testItemId: number, requestId: number) => {
    try {
      toast.loading("Marking for review...", { id: "review" });
      await pathologistService.markForReview(token!, testItemId);
      toast.success("Marked for review", { id: "review" });
      handleReviewNavigation(requestId);
      loadWorklist();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark for review", { id: "review" });
    }
  };

  // =============================================================
  // UI
  // =============================================================
  if (error)
    return <div className="p-6 text-red-500">❌ Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pathologist Worklist</h1>

        <button
          onClick={() => loadWorklist(true)}
          disabled={loading}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* === Filters === */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="p-2 border rounded" />
          <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="p-2 border rounded" />
          <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded">
            <option value="">All</option>
            <option value="SampleCollected">Sample Collected</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="UnderReview">Under Review</option>
            <option value="Verified">Verified</option>
            <option value="Released">Released</option>
          </select>
          <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search patient..." className="p-2 border rounded md:col-span-2" />
        </div>
      </div>

      {/* === Summary === */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusBadge label="Sample Collected" count={statusCounts.samplecollected} color="blue" />
        <StatusBadge label="In Progress" count={statusCounts.inprogress} color="purple" />
        <StatusBadge label="Completed" count={statusCounts.completed} color="yellow" />
        <StatusBadge label="Verified" count={statusCounts.verified} color="teal" />
        <StatusBadge label="Released" count={statusCounts.released} color="gray" />
      </div>

      {/* === Worklist Table === */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 font-medium">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Test</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>
            ) : worklist.length > 0 ? (
              worklist.map((item) => {
                const status = item.item_status || item.test_status;
                const isForReview = ["Completed", "UnderReview"].includes(status);
                const isForEntry = ["SampleCollected", "Pending", "InProgress", "Reopened"].includes(status);

                return (
                  <tr key={item.test_item_id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3">{new Date(item.date_ordered).toLocaleString()}</td>
                    <td className="p-3">{item.patient_name}</td>
                    <td className="p-3">{item.test_name}</td>
                    <td className="p-3">{item.department_name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusClass(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {isForEntry ? (
                        <button onClick={() => handleAnalyze(item.request_id)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 justify-center">
                          <Play className="w-4 h-4" /> Enter Result
                        </button>
                      ) : isForReview ? (
                        status === "Completed" ? (
                          <button onClick={() => handleMarkForReview(item.test_item_id, item.request_id)} className="text-cyan-600 hover:text-cyan-900 flex items-center gap-1 justify-center">
                            <Eye className="w-4 h-4" /> Review
                          </button>
                        ) : (
                          <button onClick={() => handleReviewNavigation(item.request_id)} className="text-cyan-600 hover:text-cyan-900 flex items-center gap-1 justify-center">
                            <Eye className="w-4 h-4" /> Continue Review
                          </button>
                        )
                      ) : (
                        <span className="text-gray-500 flex items-center gap-1 justify-center">
                          <CheckCircle className="w-4 h-4" /> {status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="p-4 text-center italic">No tests in queue.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PathologistWorklistPage;
