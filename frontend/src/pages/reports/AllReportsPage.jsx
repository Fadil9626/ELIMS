import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Search } from "lucide-react"; // ✅ FIX: Consistent icons
import reportService from "../../services/reportService";
import { useAuth } from "../../context/AuthContext"; // ✅ FIX: Import useAuth

const AllReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "report_date",
    direction: "desc",
  });

  const { token } = useAuth(); // ✅ FIX: Get token from context

  useEffect(() => {
    // ✅ FIX: Guard against missing token
    if (!token) {
      setLoading(false);
      setReports([]);
      return;
    }

    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await reportService.getAllReports(token, {
          search: searchTerm,
        });
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchReports();
    }, 500); // Debounce search

    return () => clearTimeout(timer);
  }, [searchTerm, token]); // ✅ FIX: Add token to dependency array

  // ------------------------------------------------------------
  // 🔽 Sort handler
  // ------------------------------------------------------------
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // ------------------------------------------------------------
  // 🔍 Apply sorting before rendering
  // ------------------------------------------------------------
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const { key, direction } = sortConfig;
      const order = direction === "asc" ? 1 : -1;

      // Handle date
      if (key === "report_date") {
        return (new Date(a[key]) - new Date(b[key])) * order;
      }
      
      // Handle null/undefined values
      if (a[key] == null) return 1 * order;
      if (b[key] == null) return -1 * order;

      // Handle text
      if (typeof a[key] === "string" && typeof b[key] === "string") {
        return a[key].localeCompare(b[key]) * order;
      }

      // Fallback
      return (a[key] > b[key] ? 1 : -1) * order;
    });
  }, [reports, sortConfig]);

  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Completed Reports</h1>

      {/* 🔍 Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by Patient Name or Lab ID..."
          className="w-full p-3 pl-10 border border-gray-300 rounded-md" // Added pl-10 for icon
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {/* ✅ FIX: Added consistent search icon */}
        <Search className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
      </div>

      {/* 📋 Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                {[
                  { key: "patient_name", label: "Patient Name" },
                  { key: "lab_id", label: "Lab ID" },
                  { key: "department_name", label: "Department" },
                  { key: "last_verified_by", label: "Last Verified By" },
                  { key: "report_date", label: "Report Date" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`p-4 font-semibold cursor-pointer select-none ${
                      sortConfig.key === col.key ? "text-blue-600" : ""
                    }`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {/* ✅ FIX: Consistent icon */}
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                ))}
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    Loading reports...
                  </td>
                </tr>
              ) : sortedReports.length > 0 ? (
                sortedReports.map((report) => (
                  <tr
                    key={report.request_id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="p-4">{report.patient_name || "N/A"}</td>
                    <td className="p-4 font-mono">{report.lab_id}</td>
                    <td className="p-4">{report.department_name || "N/A"}</td>
                    <td className="p-4">{report.last_verified_by || "—"}</td>
                    <td className="p-4">
                      {new Date(report.report_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <Link to={`/reports/test-request/${report.request_id}`}>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm transition">
                          View Report
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="p-4 text-center text-gray-500 italic"
                  >
                    No completed reports found.
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

export default AllReportsPage;