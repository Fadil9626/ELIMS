import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import billingService from '../../services/billingService';
import ActiveUsersWidget from '../../components/dashboard/ActiveUsersWidget';
import GlobalSearch from '../../components/dashboard/GlobalSearch';
import { Link } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineBeaker, HiOutlineClipboardList } from 'react-icons/hi';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const StatCard = ({ title, value, prefix = '', color = '' }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-center text-center">
    <h3 className="text-gray-500 text-lg font-medium">{title}</h3>
    <p className={`text-3xl font-bold mt-2 ${color}`}>{prefix}{value}</p>
  </div>
);

const QuickActionButton = ({ to, icon: Icon, label }) => (
  <Link to={to} className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition">
    <Icon className="w-8 h-8 text-blue-600 mb-2" />
    <span className="font-semibold text-gray-700">{label}</span>
  </Link>
);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const { settings } = useContext(SettingsContext);
  const { can } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const statsData = await billingService.getDashboardStats(period);
        const analyticsData = await billingService.getMonthlyAnalytics();
        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [period]);

  if (!can('settings', 'view')) {
    return <div className="p-6">Access Denied. This dashboard is for administrators only.</div>;
  }

  const handlePeriodChange = (p) => setPeriod(p);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <GlobalSearch />
        <div className="flex justify-center space-x-2">
          {['day', 'week', 'month', 'year'].map((p, i) => (
            <button
              key={i}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-md font-semibold capitalize ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionButton to="/patients/register" icon={HiOutlineUsers} label="Register Patient" />
        <QuickActionButton to="/admin/staff" icon={HiOutlineUsers} label="Manage Staff" />
        <QuickActionButton to="/admin/settings" icon={HiOutlineBeaker} label="Lab Config" />
        <QuickActionButton to="/reports" icon={HiOutlineClipboardList} label="View Reports" />
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading dashboard data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <StatCard title="Total Revenue" value={stats.totalRevenue || 0} prefix={`${stats.currency || 'Le'} `} color="text-green-600" />
          <StatCard title="Invoices" value={stats.invoiceCount || 0} color="text-blue-600" />
          <StatCard title="New Patients" value={stats.newPatientCount || 0} color="text-indigo-600" />
          <StatCard title="Pending Payments" value={stats.pendingPayments || 0} color="text-yellow-600" />
          <StatCard title="Completed Tests" value={stats.completedTests || 0} color="text-green-700" />
          <StatCard title="Pending Tests" value={stats.pendingTests || 0} color="text-orange-600" />
          <StatCard title="Active Users" value={stats.activeUsers || 0} color="text-pink-600" />
          <StatCard title="Total Staff" value={stats.totalStaff || 0} color="text-purple-600" />
        </div>
      )}

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue, Invoices & Tests (by Month)</h3>
          {analytics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" />
                <Line type="monotone" dataKey="invoices" stroke="#3B82F6" name="Invoices" />
                <Line type="monotone" dataKey="completed_tests" stroke="#F97316" name="Completed Tests" />
                <Line type="monotone" dataKey="patients" stroke="#8B5CF6" name="New Patients" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-10">No data available.</div>
          )}
        </div>

        {/* Active Users */}
        <div>
          <ActiveUsersWidget />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
