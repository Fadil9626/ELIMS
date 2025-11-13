import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Search, Clock, Users, ArrowRight } from "lucide-react"; 
import patientService from "../../services/patientService";
import { useAuth } from "../../context/AuthContext"; 

const ReceptionDashboardPage = () => {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);

  const { user, can } = useAuth(); // Get the 'user' and 'can' function

  // ✅ Check for the necessary permission
  const canCreatePatient = can("Patients", "Create");

  // Use useCallback to ensure fetchPatients is memoized
  const fetchPatients = useCallback(async () => {
    // Wait for the user object to be loaded before running
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = user.token; 

      if (!token) {
        setError("Authentication token missing. Please log in again.");
        setLoading(false);
        return;
      }

      const data = await patientService.searchPatients({
        query,
        year: yearFilter,
        page,
        limit: 10,
        token
      });

      setPatients(data.results);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("❌ Reception Dashboard Fetch Error:", err);
      setError("Failed to fetch patient data. Check network or server permissions.");
    } finally {
      setLoading(false);
    }
  }, [query, page, yearFilter, user]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">

      {/* Header Row */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Patient Lookup & Registration</h1>

        {/* ✅ FIX: Conditionally render the button based on permission */}
        {canCreatePatient && (
          <Link
            to="/patients/register"
            className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
          >
            <UserPlus size={18} /> Register New Patient
          </Link>
        )}
      </div>
      
      {/* Error Message Display */}
      {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 font-medium">
              Error: {error}
          </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3">
        {/* ... (Search and filter inputs) ... */}
        <div className="flex items-center bg-white shadow-sm px-3 py-2 rounded-lg w-full border">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search by Name / MRN / Phone / Ward / Doctor"
            className="ml-2 w-full outline-none text-gray-700"
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
          />
        </div>

        <select
          value={yearFilter}
          onChange={(e) => {
              setPage(1);
              setYearFilter(e.target.value);
            }}
          className="border bg-white shadow-sm px-3 py-2 rounded-lg text-gray-700"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Patients Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 font-semibold">
            <tr>
              <th className="p-3 text-left">Patient (Lab ID)</th>
              <th className="p-3 text-left">Contact</th>
              <th className="p-3 text-left">Ward</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500 flex items-center justify-center gap-2"><Clock size={16} className="animate-spin" /> Loading…</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500 italic">No patients found matching your search.</td></tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">
                      {p.first_name} {p.last_name}
                      <span className="text-xs text-gray-500 block">{p.lab_id}</span>
                  </td>
                  <td className="p-3 text-gray-600">{p.contact_phone || "—"}</td>
                  <td className="p-3 text-gray-600">{p.ward_name || "—"}</td>
                  <td className="p-3 text-center">
                    <Link
                      to={`/patients/${p.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4">
        <button
          disabled={page === 1}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>

        <span className="text-gray-700 font-medium">Page {page} of {totalPages}</span>

        <button
          disabled={page === totalPages}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

    </div>
  );
};

export default ReceptionDashboardPage;