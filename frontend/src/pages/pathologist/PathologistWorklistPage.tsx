import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Eye,
  RefreshCw,
  Search, // Add Search icon for filter bar
  Beaker, // Add Beaker icon for worklist title
} from "lucide-react";
import toast from "react-hot-toast";

import pathologistService from "../../services/pathologistService";
import { useAuth } from "../../context/AuthContext"; // ✅ UNCOMMENTED useAuth
import { useSocket } from "../../context/SocketContext";

// ------------------------------------------------------------
// STATUS COLORS & BADGES (omitted for brevity)
// ------------------------------------------------------------
const getStatusClass = (status) => {
  if (!status) return "bg-gray-200 text-gray-800";
  switch (status.toLowerCase().replace(/\s/g, "")) {
    case "samplecollected":
      return "bg-blue-200 text-blue-800";
    case "inprogress":
      return "bg-purple-200 text-purple-800";
    case "completed":
      return "bg-yellow-200 text-yellow-800";
    case "underreview":
      return "bg-cyan-200 text-cyan-800";
    case "reopened":
      return "bg-orange-200 text-orange-800";
    case "verified":
      return "bg-green-200 text-green-800";
    case "released":
      return "bg-gray-200 text-gray-800";
    default:
      return "bg-gray-200 text-gray-800";
  }
};

const StatusBadge = ({ label, count = 0, color }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    yellow: "bg-yellow-100 text-yellow-800",
    teal: "bg-teal-100 text-teal-800",
    gray: "bg-gray-100 text-gray-800",
  };
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg shadow-sm ${colors[color] || colors.gray}`}>
      <span className="font-semibold">{label}:</span>
      <span className="font-bold text-xl">{count}</span>
    </div>
  );
};

// ------------------------------------------------------------
// PAGE COMPONENT
// ------------------------------------------------------------
const PathologistWorklistPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth(); // ✅ Using useAuth for stable user data

  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token || null;
  
  // ✅ FIX 1: Defined state for filters
  const [worklist, setWorklist] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    from: "", 
    to: "", 
    status: "All", 
    search: "",
  });

  // Helper for department filtering (uses user from useAuth)
  const userDept = user?.department;
  const roleId = user?.role_id;

  // ------------------------------------------------------------
  // LOAD WORKLIST
  // ------------------------------------------------------------
  // ❗ FIX 2: loadWorklist MUST depend on 'filters'
  const loadWorklist = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);

      // Pass filters object to the service layer
      const [worklistData, countsData] = await Promise.all([
        pathologistService.getWorklist(token, filters),
        pathologistService.getStatusCounts(token),
      ]);

      // Client-side filtering logic remains for non-SuperAdmin/non-Dept users
      const filteredData = (roleId > 2 && userDept)
        ? worklistData.filter(item => item.department_name === userDept)
        : worklistData;

      setWorklist(filteredData);
      setStatusCounts(countsData);
    } catch (err) {
      toast.error(err.message || "Failed to load worklist");
    } finally {
      setLoading(false);
    }
    // ❗ Dependencies MUST include filters to recreate function when filters change
  }, [token, filters, userDept, roleId]); 

  // ------------------------------------------------------------
  // DEBOUNCE TRIGGER (The Fix for the Update Bug)
  // ------------------------------------------------------------
  useEffect(() => {
    // This useEffect now watches the 'filters' object.
    const debounceTimer = setTimeout(() => {
      loadWorklist();
    }, 400); 

    return () => clearTimeout(debounceTimer);
    // ❗ FIX 3: Dependency array includes filters
  }, [filters, loadWorklist]); 

  // ------------------------------------------------------------
  // REALTIME SOCKET UPDATES
  // ------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const update = () => loadWorklist();
    socket.on("new_test_request", update);
    socket.on("test_status_updated", update);
    return () => {
      socket.off("new_test_request", update);
      socket.off("test_status_updated", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, loadWorklist]);

  // ------------------------------------------------------------
  // ACTION HANDLERS
  // ------------------------------------------------------------
  const handleFilterChange = (e) => {
    // ✅ This updates the state, which triggers the useEffect debounce
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };
  
  const handleAnalyze = (requestId: any) => navigate(`/pathologist/results/${requestId}`);

  const handleReviewNavigation = (requestId: any) =>
    navigate(`/pathologist/review/${requestId}`);

  const handleMarkForReview = async (testItemId: number, requestId: any) => {
    try {
      await pathologistService.markForReview(token, testItemId);
      toast.success("Marked for review.");
      handleReviewNavigation(requestId);
      loadWorklist();
    } catch (err) {
      toast.error(err.message || "Failed to mark for review.");
    }
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Beaker className="w-8 h-8 text-blue-600" /> Pathologist Worklist
        </h1>
        <button onClick={loadWorklist} className="p-2 rounded hover:bg-gray-100">
          <RefreshCw className={loading ? "animate-spin w-5 h-5" : "w-5 h-5"} />
        </button>
      </div>

      {/* ❗ FIX 4: FILTER INPUTS ADDED */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">From</label>
            <input
              type="date"
              name="from"
              value={filters.from}
              onChange={handleFilterChange}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="date"
              name="to"
              value={filters.to}
              onChange={handleFilterChange}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 p-2 w-full border rounded-md"
            >
              <option value="All">All</option>
              <option value="Sample Collected">Sample Collected</option>
              <option value="In Progress">In Progress</option>
              <option value="Reopened">Reopened</option>
              <option value="Completed">Completed</option>
              <option value="Under Review">Under Review</option>
              <option value="Verified">Verified</option>
              <option value="Released">Released</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <input
                type="text"
                name="search"
                placeholder="Search by patient name or Lab ID..."
                value={filters.search}
                onChange={handleFilterChange}
                className="mt-1 p-2 pl-10 w-full border rounded-md"
              />
              <Search className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* STATUS SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusBadge label="Sample Collected" count={statusCounts.samplecollected} color="blue" />
        <StatusBadge label="In Progress" count={statusCounts.inprogress} color="purple" />
        <StatusBadge label="Completed" count={statusCounts.completed} color="yellow" />
        <StatusBadge label="Verified" count={statusCounts.verified} color="teal" />
        <StatusBadge label="Released" count={statusCounts.released} color="gray" />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Test</th>
              <th className="p-3">Dept</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
            ) : worklist.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center">No records found</td></tr>
            ) : (
              worklist.map((item) => {
                const status = item.item_status || item.test_status;
                const isForEntry = ["samplecollected", "pending", "inprogress", "reopened"].includes(
                  status?.toLowerCase().replace(/\s/g, "")
                );
                const isForReview = ["completed", "underreview"].includes(
                  status?.toLowerCase().replace(/\s/g, "")
                );

                return (
                  <tr key={item.test_item_id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(item.date_ordered).toLocaleString()}</td>
                    <td className="p-3">{item.patient_name}</td>
                    <td className="p-3">{item.test_name}</td>
                    <td className="p-3">{item.department_name || "-"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3">
                      {isForEntry ? (
                        <button onClick={() => handleAnalyze(item.request_id)} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Play className="w-4 h-4" /> Enter Result
                        </button>
                      ) : isForReview ? (
                        status === "Completed" ? (
                          <button onClick={() => handleMarkForReview(item.test_item_id, item.request_id)} className="text-cyan-700 hover:underline flex items-center gap-1">
                            <Eye className="w-4 h-4" /> Review
                          </button>
                        ) : (
                          <button onClick={() => handleReviewNavigation(item.request_id)} className="text-cyan-700 hover:underline flex items-center gap-1">
                            <Eye className="w-4 h-4" /> Continue Review
                          </button>
                        )
                      ) : (
                        <span className="text-gray-500">{status}</span>
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
  );
};

export default PathologistWorklistPage;