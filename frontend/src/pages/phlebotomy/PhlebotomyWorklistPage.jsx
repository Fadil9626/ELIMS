import React, { 
  useState, 
  useEffect, 
  useMemo, // 💡 FIX: Ensure useMemo is imported
  useCallback, 
  useRef, 
  useContext 
} from "react";
import phlebotomyService from "../../services/phlebotomyService";
import ConfirmModal from "../../components/layout/ConfirmModal";
import toast from "react-hot-toast";
import {
  HiOutlineClock,
  HiOutlineBeaker,
  HiOutlineBadgeCheck,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineArchive,
  HiOutlineSearch,
  HiOutlinePrinter,
  HiOutlineRefresh,
  HiOutlineExclamation,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext"; 

// ============================================================
// STATUS CONFIGURATION
// ============================================================
const STATUS_CONFIG = {
  Pending: { color: "yellow", icon: HiOutlineClock, label: "Pending", key: "pending" },
  SampleCollected: { color: "blue", icon: HiOutlineBeaker, label: "Collected", key: "samplecollected" },
  InProgress: { color: "purple", icon: HiOutlineBadgeCheck, label: "In Progress", key: "inprogress" },
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

// Summary Card Component
const StatusCard = ({ label, count, color, icon: Icon, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-lg shadow-md w-full text-left transition-all duration-200 border-b-4 ${
      isActive
        ? `bg-blue-600 text-white border-blue-800 shadow-xl`
        : `bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600`
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${isActive ? 'text-white' : `text-${color}-600`}`} />
        <span className="text-lg font-medium">
          {label}
        </span>
      </div>
      <span className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
        {count}
      </span>
    </div>
  </button>
);

// ============================================================
// MAIN WORKLIST PAGE
// ============================================================
const PhlebotomyWorklistPage = () => {
  const [filters, setFilters] = useState({
    status: "Pending",
    dateRange: "today",
    search: "",
  });
  const [summary, setSummary] = useState({});
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const { token } = useAuth();

  // --- Data Fetching ---

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryData, requestsData] = await Promise.all([
        phlebotomyService.getSummary(token),
        phlebotomyService.getWorklist(token, filters),
      ]);
      setSummary(summaryData);
      setRequests(requestsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err.message);
      toast.error("Failed to load worklist data.");
    } finally {
      setLoading(false);
    }
  }, [token, filters.status, filters.dateRange, filters.search]); // Depend on filters

  // Fetch data on initial load and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filter and Action Handlers ---

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSearch = () => {
    fetchData(); // Manually trigger a refetch with the current search query
  };

  const printLabel = (request) => {
    if (!request) return;
    const zpl = `^XA
^FO50,50^FD${request.lab_id}^FS
^FO50,100^A0N,30,30^FD${request.first_name} ${request.last_name}^FS
^FO50,140^BY2^B3N,N,80,Y,N^FD${request.lab_id}^FS
^XZ`;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<pre>${zpl}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  const openConfirmModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCollect = async (id, andPrint = false) => {
    if (!id) return;
    
    try {
      await phlebotomyService.markSampleAsCollected(id, token);
      toast.success("Sample collected successfully!");
      
      if (andPrint) {
        printLabel(selectedRequest);
      }
      
      fetchData(); // Refresh all data to update counts and list
    } catch (err) {
      toast.error("Failed to collect sample.");
    }
  };

  // Sort requests to show "STAT" at the top
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      if (a.priority === "STAT" && b.priority !== "STAT") return -1;
      if (a.priority !== "STAT" && b.priority === "STAT") return 1;
      return 0;
    });
  }, [requests]);


  return (
    <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Phlebotomy Worklist
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Dashboard for sample collection.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg shadow-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          <HiOutlineRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Worklist
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.keys(STATUS_CONFIG).map((key) => {
          const config = STATUS_CONFIG[key];
          const count = summary[config.key] || 0;
          return (
            <StatusCard
              key={key}
              label={config.label}
              icon={config.icon}
              count={count}
              color={config.color}
              isActive={filters.status === key}
              onClick={() => setFilters(prev => ({...prev, status: key}))}
            />
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="relative md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search Requests</label>
            <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  name="search"
                  placeholder="Lab ID or Patient Name..."
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                />
            </div>
          </div>
          <div className="md:col-span-1">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time Period</label>
             <select
                name="dateRange"
                value={filters.dateRange}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
          </div>
          <button
            onClick={handleSearch}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-md hover:bg-blue-700 font-medium"
          >
            <HiOutlineSearch className="h-5 w-5" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Worklist Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="p-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">Patient</th>
                <th className="p-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">Lab ID</th>
                <th className="p-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">Tests</th>
                <th className="p-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2">Loading requests...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-red-500">
                    Error loading data: {error}
                  </td>
                </tr>
              ) : sortedRequests.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-slate-500">
                    <HiOutlineArchive className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-2 text-lg">No requests found</p>
                    <p className="text-sm">Try checking the 'Collected' status filter.</p>
                  </td>
                </tr>
              ) : (
                sortedRequests.map((r) => (
                  <tr key={r.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${r.priority === 'STAT' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {r.priority === "STAT" && (
                          <HiOutlineExclamation className="h-5 w-5 text-red-600" title="STAT" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {r.age} yrs • {r.gender}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">{r.lab_id}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {r.tests?.slice(0, 3).map((t, i) => (
                          <span
                            key={i}
                            className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded"
                          >
                            {t}
                          </span>
                        ))}
                        {r.tests?.length > 3 && (
                          <span className="text-xs text-slate-500">
                            +{r.tests.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {r.status === "Pending" && (
                          <>
                            <button
                              onClick={() => openConfirmModal(r)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700"
                            >
                              Collect Sample
                            </button>
                            <button
                              onClick={() => printLabel(r)}
                              className="bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-md border border-slate-300 dark:border-slate-500 hover:bg-slate-50"
                            >
                              <HiOutlinePrinter className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {r.status !== "Pending" && (
                             <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {STATUS_CONFIG[r.status]?.label || r.status}
                             </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ConfirmModal
          isOpen={isModalOpen}
          title="Confirm Collection"
          message={
            <div className="space-y-2">
              <p>Mark sample as collected for:</p>
              <p className="font-bold text-lg text-slate-900 dark:text-white">
                {selectedRequest?.first_name} {selectedRequest?.last_name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Lab ID: {selectedRequest?.lab_id}</p>
            </div>
          }
          confirmText="Yes, Collect"
          confirmSecondaryText="Collect & Print Label"
          onConfirm={() => {
            handleCollect(selectedRequest.id, false); // Collect only
            setIsModalOpen(false);
          }}
          onConfirmSecondary={() => {
            handleCollect(selectedRequest.id, true); // Collect AND Print
            setIsModalOpen(false);
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

// Debounce utility (kept for function completeness)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default PhlebotomyWorklistPage;