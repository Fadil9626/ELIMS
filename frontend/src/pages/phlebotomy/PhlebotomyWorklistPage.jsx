import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Droplet,
  CheckCircle,
  ArrowRight,
  XCircle,
  RefreshCcw,
  Search,
  Printer,
  User,
  FlaskConical,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import apiFetch from "../../services/apiFetch";
import PatientHoverTag from "./PatientHoverTag";

// --- Helpers for Priority ---

const normalizePriority = (priority) => {
  const val = (priority || "").toString().trim().toUpperCase();
  if (["URGENT", "STAT", "EMERG", "EMERGENCY"].includes(val)) return "URGENT";
  return "ROUTINE";
};

const isUrgentPriority = (priority) => normalizePriority(priority) === "URGENT";

// --- Helper Components ---

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:scale-[1.01]">
    <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

const PriorityBadge = ({ priority }) => {
  const norm = normalizePriority(priority);
  const urgent = norm === "URGENT";

  return (
    <span
      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1 border
      ${
        urgent
          ? "bg-red-100 text-red-700 border-red-200"
          : "bg-blue-50 text-blue-600 border-blue-100"
      }`}
    >
      {urgent && <AlertTriangle size={11} />}
      {norm}
    </span>
  );
};

// --- Main Page Component ---

export default function PhlebotomyWorklistPage() {
  const [worklist, setWorklist] = useState([]);
  const [summary, setSummary] = useState({
    pending: 0,
    collected: 0,
    collectionsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("SampleReceived");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorklist = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, worklistData] = await Promise.all([
        apiFetch("/api/phlebotomy/summary"),
        apiFetch(`/api/phlebotomy/worklist?status=${statusFilter}`),
      ]);

      setSummary({
        pending: summaryData.pending || 0,
        collected: summaryData.collected || 0,
        collectionsToday: summaryData.collectionsToday || 0,
      });

      const list = Array.isArray(worklistData)
        ? worklistData
        : worklistData.items || [];

      setWorklist(list);
    } catch (err) {
      console.error("❌ Phlebotomy Fetch Error:", err);
      setError(err.message || "Failed to load worklist.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchWorklist();
  }, [fetchWorklist]);

  // --- HANDLERS ---

  const openCollectionModal = (item) => {
    setSelectedRequest(item);
    setIsModalOpen(true);
  };

  const closeCollectionModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleConfirmCollection = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      const response = await apiFetch(
        `/api/phlebotomy/collect/${selectedRequest.id}`,
        { method: "PUT" }
      );
      toast.success(response.message || "✅ Sample collected!");
      fetchWorklist();
      closeCollectionModal();
    } catch (err) {
      toast.error(err.message || `Failed to collect sample.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintLabel = (e, item) => {
    e.stopPropagation();
    toast("Printing Label...", { icon: "🖨️" });
  };

  // 🔑 FIX: Combine filtering and sorting into a single useMemo block
  const sortedAndFilteredWorklist = useMemo(() => {
    // 1. Filtering
    const term = searchTerm.toLowerCase();
    const filtered = worklist.filter((item) => {
      const fullName = `${item.first_name || ""} ${
        item.last_name || ""
      }`.toLowerCase();
      const labId = (item.lab_id || "").toLowerCase();
      return fullName.includes(term) || labId.includes(term);
    });

    // 2. Sorting (slice() creates a shallow copy before sorting)
    const sorted = filtered.slice().sort((a, b) => {
      const pa = isUrgentPriority(a.priority) ? 1 : 0;
      const pb = isUrgentPriority(b.priority) ? 1 : 0;
      
      // Primary sort: urgent first
      if (pa !== pb) return pb - pa; 
      
      // Secondary sort: Created date (newer first)
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    return sorted;
  }, [worklist, searchTerm]);

  const urgentWaitingCount = worklist.filter((w) =>
    isUrgentPriority(w.priority)
  ).length;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Phlebotomy Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Manage patient queues and sample collection. Urgent cases are
            highlighted.
          </p>
          <p className="text-xs text-red-600 mt-1">
            {urgentWaitingCount > 0
              ? `${urgentWaitingCount} urgent case${
                  urgentWaitingCount > 1 ? "s" : ""
                } waiting for collection.`
              : "No urgent cases in the queue."}
          </p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-xs font-mono text-gray-500 bg-white border px-3 py-1.5 rounded-lg">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
          <XCircle size={20} /> <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pending Requests"
          value={summary.pending}
          icon={Clock}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <StatCard
          title="URGENT Cases"
          value={urgentWaitingCount}
          icon={AlertTriangle}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
        <StatCard
          title="Collected Today"
          value={summary.collectionsToday}
          icon={CheckCircle}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Search patient name or ID..."
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 bg-white p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="Pending">Pending (Payment)</option>
            <option value="SampleReceived">Sample Received (Queue)</option>
            <option value="SampleCollected">Sample Collected</option>
            <option value="All">All Requests</option>
          </select>

          <button
            onClick={fetchWorklist}
            className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-100"
          >
            <RefreshCcw
              size={20}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && worklist.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-500">
                  <Clock
                    size={24}
                    className="inline mb-2 animate-spin text-indigo-500"
                  />
                  <br />
                  Loading queue...
                </td>
              </tr>
            ) : sortedAndFilteredWorklist.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="p-12 text-center text-gray-400 italic"
                >
                  No matching patients found.
                </td>
              </tr>
            ) : (
              sortedAndFilteredWorklist.map((item) => {
                const urgent = isUrgentPriority(item.priority);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-indigo-50/30 transition-colors group ${
                      urgent ? "bg-red-50/60 border-l-4 border-red-600" : ""
                    }`}
                  >
                    {/* Patient + popover */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            urgent ? 'bg-red-200 text-red-800' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                          {item.first_name ? (
                            item.first_name.charAt(0)
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            <PatientHoverTag
                              name={`${item.first_name || ""} ${
                                item.last_name || ""
                              }`.trim()}
                              labId={item.lab_id}
                              gender={item.gender}
                              dateOfBirth={item.date_of_birth}
                              wardName={item.ward_name}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 font-mono">
                              ID: {item.lab_id}
                            </span>
                            {urgent && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-semibold uppercase shadow-sm">
                                <AlertTriangle size={11} /> Urgent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                        {item.ward_name || "OPD / Walk-in"}
                      </span>
                    </td>

                    {/* Tests */}
                    <td className="px-6 py-4">
                      <div
                        className="text-sm text-gray-900 max-w-xs truncate"
                        title={item.tests ? item.tests.join(", ") : ""}
                      >
                        {item.tests ? (
                          item.tests.join(", ")
                        ) : (
                          <span className="text-gray-400 italic">
                            None listed
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityBadge priority={item.priority} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={(e) => handlePrintLabel(e, item)}
                          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          title="Print Label"
                        >
                          <Printer size={18} />
                        </button>
                        {item.status === "Pending" ||
                        item.status === "SampleReceived" ? (
                          <button
                            onClick={() => openCollectionModal(item)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1.5 ${
                              urgent
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            <Droplet size={14} /> Collect
                          </button>
                        ) : (
                          <Link
                            to={`/tests/requests/${item.id}`}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 hover:underline"
                          >
                            View <ArrowRight size={14} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
              <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                <Droplet size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Confirm Collection
                </h2>
                <p className="text-xs text-gray-500">
                  Please verify patient identity and tests.
                </p>
              </div>
            </div>

            {/* Patient + Lab ID */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">
                    Patient Name
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedRequest.first_name} {selectedRequest.last_name}
                  </p>
                  
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold">
                    Lab ID
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-700 bg-white px-2 py-0.5 rounded border">
                    {selectedRequest.lab_id}
                  </p>
                </div>
              </div>
              
              {/* Priority in Modal Header */}
              {isUrgentPriority(selectedRequest.priority) && (
                <div className="flex items-center justify-between mt-3 p-2 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle size={16} /> URGENT PRIORITY
                    </p>
                    <PriorityBadge priority={selectedRequest.priority} />
                </div>
              )}

              {/* Tests list */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                  <FlaskConical size={14} className="text-indigo-500" />
                  Tests to Collect
                </p>
                {Array.isArray(selectedRequest.tests) &&
                selectedRequest.tests.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedRequest.tests.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mt-1">
                    No tests listed for this request.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCollectionModal}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCollection}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-70 ${
                    isUrgentPriority(selectedRequest?.priority) 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? (
                  <Clock className="animate-spin" size={18} />
                ) : (
                  <CheckCircle size={18} />
                )}
                {isSubmitting ? "Processing..." : "Confirm & Collect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}