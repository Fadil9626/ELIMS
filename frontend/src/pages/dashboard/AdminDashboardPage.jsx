import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import apiFetch from "../../services/apiFetch"; // <-- 1. Import the correct fetch helper
import { FiTrendingUp, FiUsers, FiClipboard, FiDollarSign } from "react-icons/fi";
import { MdPendingActions, MdPeopleAlt } from "react-icons/md";

const AdminDashboardPage = () => {
  const { user } = useAuth(); // <-- 2. Removed 'authedFetch' from here
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const fetchStats = async () => {
    setLoading(true);
    try {
      // ❌ OLD, INCORRECT URL
      // const res = await authedFetch(`/api/dashboard/admin?period=${period}`);
      
      // ✅ NEW, CORRECT URL (matches your server.js)
      // <-- 3. Renamed to 'apiFetch'
      const data = await apiFetch(`/api/billing/dashboard-stats?period=${period}`);

      // 🚀 FIXED: 'apiFetch' already returns the parsed JSON data.
      // No need to call .text() or JSON.parse().
      setStats(data);

    } catch (err) {
      console.error("Dashboard Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome, {user?.full_name}</h1>

      <div className="flex gap-3">
        {["day", "week", "month", "year"].map((key) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${
              period === key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <StatCard icon={<FiDollarSign />} label="Total Revenue" value={`Le ${Number(stats.totalRevenue).toLocaleString()}`} />
        <StatCard icon={<FiClipboard />} label="Completed Tests" value={stats.completedTests} />
        <StatCard icon={<MdPendingActions />} label="Pending Tests" value={stats.pendingTests} />
        <StatCard icon={<FiUsers />} label="New Patients" value={stats.newPatientCount} />
        <StatCard icon={<MdPeopleAlt />} label="Active Users" value={stats.activeUsers} />
        <StatCard icon={<FiTrendingUp />} label="Invoices" value={stats.invoiceCount} />
        <StatCard icon={<FiDollarSign />} label="Pending Payments" value={stats.pendingPayments} />
        <StatCard icon={<MdPeopleAlt />} label="Total Staff" value={stats.totalStaff} />
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="flex items-center gap-4 bg-white p-5 rounded-xl shadow border hover:shadow-md transition">
    <div className="text-blue-600 text-3xl">{icon}</div>
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  </div>
);

export default AdminDashboardPage;