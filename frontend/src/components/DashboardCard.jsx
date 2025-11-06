import React, { useState, useEffect } from 'react';
import billingService from '../../services/billingService';

const StatCard = ({ title, value, a }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-lg font-semibold text-gray-600">{title}</h2>
    <p className="text-3xl font-bold mt-2">{a}{value}</p>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('day'); // 'day', 'week', or 'month'
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
  }, [period]); // This effect re-runs whenever the 'period' state changes

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setPeriod('day')} className={`py-2 px-4 rounded-md ${period === 'day' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Today</button>
        <button onClick={() => setPeriod('week')} className={`py-2 px-4 rounded-md ${period === 'week' ? 'bg-blue-600 text-white' : 'bg-white'}`}>This Week</button>
        <button onClick={() => setPeriod('month')} className={`py-2 px-4 rounded-md ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-white'}`}>This Month</button>
      </div>

      {loading && <div>Loading stats...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Revenue" value={parseFloat(stats.totalrevenue).toFixed(2)} a="$"/>
          <StatCard title="Invoice Count" value={stats.invoicecount} />
          <StatCard title="New Patients" value={stats.newpatientcount} />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
