import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Beaker, Search, Play, Eye } from "lucide-react";
import pathologistService from "../../services/pathologistService";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext"; // ✅ 1. Import useAuth

const ResultListPage = () => {
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    status: "Sample Collected",
    search: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { socket } = useSocket();
  // ✅ 2. Get user and token from context (stable)
  const { user, token } = useAuth();

  // ✅ 3. Fetch result list (wrapped in useCallback)
  const fetchResults = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await pathologistService.getWorklist(token, filters);

      // ✅ 4. Filter for department using the stable 'user' object
      const userDept = user?.department;
      const roleId = user?.role_id;

      const filteredData = (roleId > 2 && userDept)
        ? data.filter(item => item.department_name === userDept)
        : data;

      setResults(filteredData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // ✅ 5. Update dependency array to use 'user'
  }, [token, filters, user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchResults();
    }, 400);
    return () => clearTimeout(debounce);
  }, [fetchResults]);

  // ✅ 6. Socket listener
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      // ✅ 7. Get department from stable 'user' object
      const userDept = user?.department;
      const isRelevant = !userDept || (data?.department_name && data.department_name === userDept);
      
      if (isRelevant) {
        fetchResults();
      }
    };

    socket.on("new_test_request", handleUpdate);
    socket.on("test_status_updated", handleUpdate);

    return () => {
      socket.off("new_test_request", handleUpdate);
      socket.off("test_status_updated", handleUpdate);
    };
    // ✅ 8. Update dependency array
  }, [socket, fetchResults, user]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const getStatusColor = (status) => {
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
      case "released":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Beaker className="text-blue-600" /> Test Result Entry
        </h1>
      </div>

      {/* --- Filters --- */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
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
              <option value="Reopened">Reopened</option>
              <option value="Completed">Completed</option>
              <option value="Under Review">Under Review</option>
              <option value="Verified">Verified</option>
              <option value="Released">Released</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Search
            </label>
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

      {/* --- Result Table --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-800 text-white font-semibold text-lg">
          Tests for Result Entry
        </div>

        {error && (
          <div className="text-red-500 p-4 border-b bg-red-50">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Patient</th>
                <th className="p-3 font-semibold">Test</th>
                <th className="p-3 font-semibold">Department</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    Loading results...
                  </td>
                </tr>
              ) : results.length > 0 ? (
                results.map((item) => {
                  const status = item.item_status || item.test_status;
                  const isEnterable = [
                    "Sample Collected",
                    "In Progress",
                    "Reopened",
                  ].includes(status);

                  return (
                    <tr key={item.test_item_id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(item.date_ordered).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{item.patient_name}</div>
                        <div className="text-xs text-gray-500">ID: {item.lab_id}</div>
                      </td>
                      <td className="p-3">{item.test_name}</td>
                      <td className="p-3">{item.department_name || "N/A"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {isEnterable ? (
                          <Link
                            to={`/pathologist/results/${item.request_id}`}
                            className="flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 transition"
                          >
                            <Play className="w-4 h-4" />
                            Enter Result
                          </Link>
                        ) : (
                          <Link
                            to={`/pathologist/review/${item.request_id}`}
                            className="flex items-center justify-center gap-1 bg-gray-500 text-white px-3 py-1 text-sm rounded hover:bg-gray-600 transition"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="p-4 text-center text-gray-500 italic"
                  >
                    No matching results found.
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

export default ResultListPage;