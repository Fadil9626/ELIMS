import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FiTrendingUp, FiUsers, FiClipboard, FiDollarSign } from "react-icons/fi";
import { MdPendingActions, MdPeopleAlt } from "react-icons/md";

const AdminDashboardPage = () => {
  const { authedFetch, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month"); // ✅ FIXED

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await authedFetch(`/api/billing/dashboard?period=${period}`, {
        method: "GET",
      });

      const text = await res.text();

      // ✅ Prevents “Unexpected token <” when backend returns HTML
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Invalid JSON response:", text);
        throw new Error("Backend did not return JSON (check route)");
      }

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

      {/* Time Filter Buttons */}
      <div className="flex gap-3">
        {[
          { key: "day", label: "Today" },
          { key: "week", label: "This Week" },
          { key: "month", label: "This Month" },
          { key: "year", label: "This Year" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${
              period === key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <StatCard icon={<FiDollarSign />} label="Total Revenue" value={`Le ${Number(stats.totalRevenue).toLocaleString()}`} />
        <StatCard icon={<FiClipboard />} label="Completed Tests" value={stats.completedTests} />
        <StatCard icon={<MdPendingActions />} label="Pending Tests" value={stats.pendingTests} />
        <StatCard icon={<FiUsers />} label="New Patients" value={stats.newPatientCount} />
        <StatCard icon={<MdPeopleAlt />} label="Active Users" value={stats.activeUsers} />
        <StatCard icon={<FiTrendingUp />} label="Invoice Count" value={stats.invoiceCount} />
        <StatCard icon={<FiDollarSign />} label="Pending Payments" value={stats.pendingPayments} />
        <StatCard icon={<MdPeopleAlt />} label="Total Staff" value={stats.totalStaff} />
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-3">Revenue (Current Year)</h2>
          <p className="text-gray-400 text-sm">Chart coming next…</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-3">Patient Registrations (Current Year)</h2>
          <p className="text-gray-400 text-sm">Chart coming next…</p>
        </div>
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
