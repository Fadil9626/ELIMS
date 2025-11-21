// frontend/src/pages/reception/ReceptionDashboardPage.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Calendar,
  RefreshCw,
  Users,
  FileText,
  Activity,
  Search,
  UserPlus,
  FlaskConical,
  DollarSign,
  CheckCircle,
  Printer,
  Eye,
  TestTube
} from "lucide-react";

import apiFetch from "../../services/apiFetch";
import { useSocket } from "../../context/SocketContext";
import { getStatusBadge, getNextStatus } from "../../utils/statusBadge";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
const ReceptionDashboardPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const soundRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [filteredQueue, setFilteredQueue] = useState([]);
  const [search, setSearch] = useState("");

  const [date, setDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Load notification chime
  useEffect(() => {
    soundRef.current = new Audio("/sounds/queue-notify.mp3");
  }, []);

  const playSound = () => {
    if (soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(() => {});
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await apiFetch(`/api/reception/dashboard-stats?date=${date}`);
      setStats(res?.data || null);
    } catch {
      toast.error("Failed to load dashboard stats.");
    } finally {
      setLoadingStats(false);
    }
  };

  // Load queue
  const loadQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await apiFetch(`/api/reception/queue?date=${date}`);
      const data = res?.data || res || [];
      setQueue(data);
      setFilteredQueue(data);
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoadingQueue(false);
    }
  };

  // Debounced search filter
  const applyFilter = debounce((term, source) => {
    if (!term.trim()) return setFilteredQueue(source);

    const t = term.toLowerCase();
    setFilteredQueue(
      source.filter(
        (row) =>
          row.patient_name?.toLowerCase().includes(t) ||
          row.contact_phone?.toLowerCase().includes(t)
      )
    );
  }, 300);

  useEffect(() => applyFilter(search, queue), [search, queue]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadQueue();
  }, [date]);

  // WebSocket live updates
  useEffect(() => {
    if (!socket) return;

    const handler = () => {
      playSound();
      loadStats();
      loadQueue();
    };

    socket.on("reception:queue-updated", handler);

    return () => socket.off("reception:queue-updated", handler);
  }, [socket, date]);

  // Status Update
  const handleAdvanceStatus = async (req) => {
    const next = getNextStatus(req.status);
    if (!next) return;

    if (!window.confirm(`Move this request to "${next.replace("_", " ")}"?`))
      return;

    try {
      await apiFetch(`/api/reception/queue/${req.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ next_status: next }),
      });

      toast.success("Status updated.");
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const formatTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  // Handle open report
  const openReport = (id) => window.open(`/reports/test-request/${id}`, "_blank");

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <HeaderSection
        date={date}
        setDate={setDate}
        reload={() => {
          loadStats();
          loadQueue();
        }}
      />

      {/* QUICK ACTIONS */}
      <QuickActions navigate={navigate} />

      {/* SEARCH BAR */}
      <SearchBar value={search} onChange={setSearch} />

      {/* SUMMARY CARDS */}
      <SummaryGrid stats={stats} loading={loadingStats} />

      {/* QUEUE TABLE */}
      <QueueTable
        loading={loadingQueue}
        filteredQueue={filteredQueue}
        formatTime={formatTime}
        handleAdvanceStatus={handleAdvanceStatus}
        openReport={openReport}
        navigate={navigate}
      />
    </div>
  );
};

// -------------------------------------------------------------
// COMPONENT SECTIONS
// -------------------------------------------------------------

const HeaderSection = ({ date, setDate, reload }) => (
  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
    <div>
      <h1 className="text-2xl font-semibold text-gray-800">Reception Dashboard</h1>
      <p className="text-sm text-gray-500">Registrations • Billing • Workflow</p>
    </div>

    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white shadow-sm">
        <Calendar className="w-4 h-4 text-gray-500" />
        <input
          type="date"
          className="border-0 bg-transparent text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <button
        onClick={reload}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </button>
    </div>
  </div>
);

// Quick action buttons
const QuickActions = ({ navigate }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <ActionButton
      icon={UserPlus}
      label="New Patient"
      color="bg-blue-600"
      onClick={() => navigate("/patients/register")}
    />

    <ActionButton
      icon={FlaskConical}
      label="Book Test"
      color="bg-green-600"
      onClick={() => navigate("/patients")}
    />

    <ActionButton
      icon={DollarSign}
      label="Reports"
      color="bg-yellow-600"
      onClick={() => navigate("/invoices")}
    />
  </div>
);

// Search bar
const SearchBar = ({ value, onChange }) => (
  <div className="flex items-center w-full md:w-96 border shadow-sm rounded-lg px-3 py-2 bg-white gap-2">
    <Search className="w-4 h-4 text-gray-500" />
    <input
      type="text"
      placeholder="Search name / phone"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-0 focus:ring-0 text-sm"
    />
  </div>
);

// Summary cards grid
const SummaryGrid = ({ stats, loading }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <SummaryCard icon={Users} label="Registered Today" value={stats?.registered_today ?? 0} loading={loading} accent="bg-blue-100 text-blue-800" />
    <SummaryCard icon={FileText} label="Billing Pending" value={stats?.pending_billing ?? 0} loading={loading} accent="bg-yellow-100 text-yellow-800" />
    <SummaryCard icon={Activity} label="Awaiting Sample" value={stats?.pending_sample ?? 0} loading={loading} accent="bg-indigo-100 text-indigo-800" />
    <SummaryCard icon={Activity} label="Completed Today" value={stats?.completed_today ?? 0} loading={loading} accent="bg-green-100 text-green-800" />
  </div>
);

// Queue Table
const QueueTable = ({ loading, filteredQueue, formatTime, handleAdvanceStatus, openReport, navigate }) => (
  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
    <div className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold">
      Today&apos;s Queue
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-2 text-left">Time</th>
            <th className="px-4 py-2 text-left">Patient</th>
            <th className="px-4 py-2 text-left">Phone</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="text-center py-6 text-gray-500">Loading...</td></tr>
          ) : filteredQueue.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-6 text-gray-400">No records found</td></tr>
          ) : (
            filteredQueue.map((req) => {
              const badge = getStatusBadge(req.status);
              const next = getNextStatus(req.status);

              return (
                <tr key={req.id} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2">{formatTime(req.created_at)}</td>
                  <td className="px-4 py-2 font-medium">{req.patient_name}</td>
                  <td className="px-4 py-2">{req.contact_phone}</td>

                  <td className="px-4 py-2 flex gap-2 items-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>

                    {/* Show icons */}
                    {req.sample_collected && <TestTube className="text-indigo-600 w-4 h-4" />}
                    {req.report_ready && <CheckCircle className="text-green-600 w-4 h-4" />}
                  </td>

                  <td className="px-4 py-2 text-center flex gap-2 justify-center">
                    {next && (
                      <button
                        onClick={() => handleAdvanceStatus(req)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700"
                      >
                        Move to {next.replace("_", " ")}
                      </button>
                    )}

                    {req.report_ready && (
                      <button
                        onClick={() => openReport(req.id)}
                        className="px-2 py-1 text-xs border rounded-md hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {req.report_ready && (
                      <button
                        onClick={() => openReport(req.id)}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
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

// Action Button
const ActionButton = ({ icon: Icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className={`p-4 text-white rounded-lg shadow flex items-center gap-3 hover:opacity-90 transition ${color}`}
  >
    <Icon className="w-6 h-6" />
    <span className="font-medium">{label}</span>
  </button>
);

// Summary Card
const SummaryCard = ({ icon: Icon, label, value, loading, accent }) => (
  <div className="bg-white rounded-xl shadow-sm border px-4 py-3 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{loading ? "…" : value}</p>
    </div>
  </div>
);

export default ReceptionDashboardPage;
