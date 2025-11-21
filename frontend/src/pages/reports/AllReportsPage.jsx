import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Search, FileText, Loader2, AlertCircle } from "lucide-react";
import reportService from "../../services/reportService";
import { useAuth } from "../../context/AuthContext";

const AllReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "report_date",
    direction: "desc",
  });

  // ✅ FIX: robustly retrieve token from context or user object
  const auth = useAuth();
  const token = auth?.token || auth?.user?.token;
  const user = auth?.user;

  useEffect(() => {
    // ✅ FIX: If no token, stop loading immediately so it doesn't hang
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportService.getAllReports(token, {
          search: searchTerm,
        });
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load reports. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      fetchReports();
    }, 500); 

    return () => clearTimeout(timer);
  }, [searchTerm, token]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const { key, direction } = sortConfig;
      const order = direction === "asc" ? 1 : -1;

      if (key === "report_date") {
        return (new Date(a[key]) - new Date(b[key])) * order;
      }
      
      if (a[key] == null) return 1 * order;
      if (b[key] == null) return -1 * order;

      if (typeof a[key] === "string" && typeof b[key] === "string") {
        return a[key].localeCompare(b[key]) * order;
      }

      return (a[key] > b[key] ? 1 : -1) * order;
    });
  }, [reports, sortConfig]);

  if (!user) return <div className="p-12 text-center text-gray-500">Loading session...</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold text-gray-900">Completed Reports</h1>
             <p className="text-sm text-gray-500 mt-1">Archive of all verified and released test results.</p>
          </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative max-w-lg">
            <input
              type="text"
              placeholder="Search by Patient Name or Lab ID..."
              className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute top-3 left-3 text-gray-400 w-4 h-4" />
          </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                {[
                  { key: "report_date", label: "Date" },
                  { key: "lab_id", label: "Lab ID" },
                  { key: "patient_name", label: "Patient Name" },
                  { key: "department_name", label: "Department" },
                  { key: "last_verified_by", label: "Verified By" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors ${
                      sortConfig.key === col.key ? "text-blue-600 bg-blue-50" : ""
                    }`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin h-6 w-6 text-blue-500"/> 
                        <span>Loading reports...</span>
                    </div>
                  </td>
                </tr>
              )}
              
              {!loading && error && (
                 <tr>
                    <td colSpan="6" className="p-8 text-center text-red-500">
                        <div className="flex items-center justify-center gap-2">
                            <AlertCircle className="h-5 w-5" /> {error}
                        </div>
                    </td>
                 </tr>
              )}

              {!loading && !error && sortedReports.length === 0 && (
                 <tr><td colSpan="6" className="p-12 text-center text-gray-400 italic">No completed reports found.</td></tr>
              )}

              {!loading && sortedReports.map((report) => (
                <tr key={report.request_id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(report.report_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-medium text-gray-600">
                      {report.lab_id}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                      {report.patient_name || "N/A"}
                  </td>
                  <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {report.department_name || "General"}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                      {report.last_verified_by || "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link to={`/reports/test-request/${report.request_id}`}>
                      <button className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors">
                        <FileText className="w-3.5 h-3.5" /> View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllReportsPage;