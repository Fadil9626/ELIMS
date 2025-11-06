import React, { useState, useEffect } from 'react';
import billingService from '../../services/billingService';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';

// Stat Card Component
const StatCard = ({ title, value, a, color }) => (
  <div className={`p-6 rounded-lg shadow-md text-center ${color || 'bg-white'}`}>
    <h2 className="text-lg font-semibold text-gray-600">{title}</h2>
    <p className="text-3xl font-bold mt-2">{a}{value}</p>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo ? userInfo.token : null;
        const data = await billingService.getDashboardStats(period, token);
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {['day', 'week', 'month', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`py-2 px-4 rounded-md capitalize ${
              period === p ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}
          >
            {p === 'day'
              ? 'Today'
              : p === 'week'
              ? 'This Week'
              : p === 'month'
              ? 'This Month'
              : 'This Year'}
          </button>
        ))}
      </div>

      {/* Loading/Error */}
      {loading && <div>Loading stats...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {/* Statistic Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <StatCard title="Total Revenue" value={parseFloat(stats.totalrevenue).toFixed(2)} a="$" color="bg-blue-50" />
            <StatCard title="Invoice Count" value={stats.invoicecount} color="bg-green-50" />
            <StatCard title="New Patients" value={stats.newpatientcount} color="bg-yellow-50" />
            <StatCard title="Pending Payments" value={stats.pendingpayments} color="bg-red-50" />
            <StatCard title="Completed Tests" value={stats.completedtests} color="bg-indigo-50" />
            <StatCard title="Pending Tests" value={stats.pendingtests} color="bg-orange-50" />
            <StatCard title="Active Users" value={stats.activeusers} color="bg-cyan-50" />
            <StatCard title="Total Staff" value={stats.staffcount} color="bg-purple-50" />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Revenue & Invoices ({period})</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#4F46E5" name="Revenue ($)" />
                  <Bar dataKey="invoices" fill="#10B981" name="Invoices" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Patient Line Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Patient Registrations ({period})</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.patientData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="patients" stroke="#F59E0B" name="New Patients" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Test Status Pie Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md col-span-1 lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Test Status Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: stats.completedtests },
                      { name: 'Pending', value: stats.pendingtests },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
