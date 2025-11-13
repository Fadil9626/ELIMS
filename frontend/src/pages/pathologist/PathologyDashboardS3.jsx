import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import pathologistService from "../../services/pathologistService";
import { useAuth } from "../../context/AuthContext";
import { 
    Activity, FlaskConical, CheckCircle, Clock, FileText, RefreshCcw 
} from 'lucide-react';

// Status color mapping for DB enum values
const STATUS_COLORS = {
  samplecollected: "bg-blue-100 text-blue-800 border-blue-300",
  inprogress: "bg-purple-100 text-purple-800 border-purple-300",
  completed: "bg-yellow-100 text-yellow-800 border-yellow-300",
  underreview: "bg-cyan-100 text-cyan-800 border-cyan-300",
  verified: "bg-emerald-100 text-emerald-800 border-emerald-300",
  released: "bg-gray-100 text-gray-700 border-gray-300",
};

// Map keys to Lucide Icons
const STATUS_ICONS = {
    samplecollected: FlaskConical,
    inprogress: Activity,
    completed: Clock,
    verified: CheckCircle,
    released: FileText,
};

// --- Helper Component: KPI Card ---
const KpiCard = ({ count, label, statusKey }) => {
    const defaultColor = "bg-gray-100 text-gray-700 border-gray-400";
    const statusClass = STATUS_COLORS[statusKey] || defaultColor;
    const Icon = STATUS_ICONS[statusKey] || FileText;

    return (
        <div 
            className={`flex flex-col p-4 rounded-xl shadow-md ring-1 ${statusClass} border-l-4 border-l-current transition-all duration-300 hover:shadow-lg`}
        >
            <div className="flex items-center justify-between">
                <Icon className="w-6 h-6 opacity-70" />
                <span className="text-3xl font-extrabold">{count || 0}</span>
            </div>
            <p className="text-sm font-semibold mt-1">{label}</p>
        </div>
    );
};


const PathologyDashboardS3 = () => {
  // Get 'can' for permission checks
  const { token, user, can } = useAuth();
  const navigate = useNavigate();

  const [counts, setCounts] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Security Guard: Ensure necessary data is loaded
  if (!user || !can) return null;

  const userDept = user?.department?.toLowerCase() || null;
  
  // Define roles based on PERMISSIONS, checking SuperAdmin first
  const isSuperAdmin = can("*:*");
  const isPathologist = isSuperAdmin || can("Pathologist", "Verify");
  const isLabTech = isSuperAdmin || can("Results", "Enter");

  // Define this variable here so it's available in the JSX render function
  const shouldFilterByDept = !isSuperAdmin && (isPathologist || isLabTech); 


  // Load status summary + worklist
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const c = await pathologistService.getStatusCounts(token);
      const wl = await pathologistService.getWorklist(token, {});

      // Use the externally defined shouldFilterByDept
      const filtered = shouldFilterByDept && userDept
        ? wl.filter(
            (t) =>
              t.department_name &&
              t.department_name.toLowerCase() === userDept
          )
        : wl;

      setCounts(c || {});
      setItems(filtered || []);
    } catch (err) { // Correct JavaScript catch syntax
      console.error("Dashboard load error:", err.message);
      alert("Failed to load dashboard data. Please check connection.");
    } finally {
      setLoading(false);
    }
  }, [token, isSuperAdmin, isPathologist, isLabTech, userDept, shouldFilterByDept]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Smart click behavior (Updated to use permission flags)
  const handleRowClick = (requestId) => {
    // SuperAdmin and Pathologist review by default
    if (isPathologist) {
      navigate(`/pathologist/review/${requestId}`); 
    } 
    // Lab tech enters results
    else if (isLabTech) {
      navigate(`/pathologist/results/${requestId}`); 
    } 
    // Fallback
    else {
      navigate(`/pathologist/results/${requestId}`);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        
        {/* Header and Refresh Button */}
        <div className="flex justify-between items-center border-b pb-3">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FlaskConical className="w-8 h-8 text-indigo-600" /> Pathology Worklist
            </h1>
            <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 bg-white text-indigo-600 px-3 py-2 rounded-lg shadow-sm border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 transition"
            >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
                {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
        </div>

      {/* Summary Cards (Modernized) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          ["samplecollected", "Collected"],
          ["inprogress", "In Progress"],
          ["completed", "Pending Review"],
          ["verified", "Verified"],
          ["released", "Released"],
        ].map(([key, label]) => (
          <KpiCard 
                key={key}
                statusKey={key}
                label={label}
                count={counts[key]}
            />
        ))}
      </div>

      {/* Worklist Table (Cleaned up) */}
        <h2 className="text-xl font-semibold text-gray-700 pt-4">Active Tests ({items.length})</h2>
      <div className="bg-white rounded-xl shadow-lg ring-1 ring-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-indigo-50 border-b text-xs uppercase text-indigo-700">
            <tr>
              <th className="px-4 py-3">Patient / Req ID</th>
              <th className="px-4 py-3">Test Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                  <Clock className="inline w-4 h-4 mr-2 animate-spin" /> Loading data...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-500 italic">
                  No active tests found {shouldFilterByDept ? `for your department (${userDept}).` : 'globally.'}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const statusKey = (row.item_status || row.test_status || "")
                  .toLowerCase()
                  .replace(/\s/g, "");

                return (
                  <tr
                    key={row.test_item_id}
                    onClick={() => handleRowClick(row.request_id)}
                    className="border-b hover:bg-indigo-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-2 text-gray-900">
                        <p className="font-semibold">{row.patient_name}</p>
                        <p className="text-xs text-gray-500">Req ID: {row.request_id}</p>
                    </td>
                    <td className="px-4 py-2">{row.test_name}</td>
                    <td className="px-4 py-2">{row.department_name || "-"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          STATUS_COLORS[statusKey] || "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
                      >
                        {row.item_status || row.test_status}
                      </span>
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

export default PathologyDashboardS3;