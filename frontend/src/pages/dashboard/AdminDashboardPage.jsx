import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
// CHANGE 1: Import your specific service
import billingService from "../../services/billingService"; 
import {
  DollarSign,
  Activity,
  ClipboardList,
  Users,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Wifi,          // New Icon
  Zap,           // New Icon
  AlertTriangle, // New Icon
  ArrowRight     // New Icon
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const safeNum = (v) => Number(v || 0);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await billingService.getDashboardStats({ period });
      setStats(data || {});
    } catch (err) {
      console.error("Admin dashboard load error:", err);
      setError(err?.message || "Failed to load dashboard data.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // --- DERIVED DATA CALCULATIONS ---
  const totalRevenue = safeNum(stats?.totalRevenue);
  const completedTests = safeNum(stats?.completedTests);
  const pendingTests = safeNum(stats?.pendingTests);
  const totalTests = completedTests + pendingTests;
  const newPatients = safeNum(stats?.newPatientCount);
  const activeUsers = safeNum(stats?.activeUsers);
  const invoiceCount = safeNum(stats?.invoiceCount);
  const pendingPayments = safeNum(stats?.pendingPayments); 
  const totalStaff = safeNum(stats?.totalStaff);

  const completionRate =
    totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

  const collectionRate =
    totalRevenue > 0
      ? Math.round(((totalRevenue - pendingPayments) / totalRevenue) * 100)
      : 0;

  const revenuePerInvoice =
    invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

  const revenuePerPatient =
    newPatients > 0 ? totalRevenue / newPatients : 0;

  const chartData = (stats?.revenueTrend || []).map(item => ({
    name: item.label || item.date,
    value: Number(item.amount || 0)
  }));

  const activityFeed = stats?.recentActivity || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {user?.full_name || user?.username || "Admin"}.
          </p>
        </div>

        {/* Period Selector */}
        <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
          {["day", "week", "month", "year"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                period === p
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* --- REPLACEMENT: LIVE OPERATIONS STRIP --- */}
      {/* This replaces the old "Quick Actions" with a real-time status monitor */}
      {stats && (
        <div className="bg-slate-900 rounded-xl p-4 shadow-lg text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* 1. System Pulse */}
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-white">System Live</span>
             </div>
             <div className="h-4 w-px bg-slate-700 hidden md:block"></div>
             <div className="flex items-center gap-2 text-sm">
                <Wifi className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Active Staff:</span>
                <span className="font-bold text-white">{activeUsers} / {totalStaff}</span>
             </div>
          </div>

          {/* 2. Bottleneck Indicators */}
          <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-4 md:justify-center">
             
             {/* Pending Tests Warning */}
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${pendingTests > 5 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {pendingTests > 5 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{pendingTests} Pending Tests</span>
             </div>

             {/* Unpaid Warning */}
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${pendingPayments > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <DollarSign className="w-3.5 h-3.5" />
                <span>Le {pendingPayments.toLocaleString(undefined, { notation: "compact" })} Outstanding</span>
             </div>
          </div>

          {/* 3. Compact Action Button */}
          <div>
             <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20">
               <Zap className="w-4 h-4 fill-current" />
               <span>Quick Actions</span>
             </button>
          </div>
        </div>
      )}

      {loading && !stats && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <span className="text-sm">Loading dashboard data...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Revenue"
              value={`Le ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="emerald"
            />
            <KPICard
              label="Total Tests"
              value={totalTests.toLocaleString()}
              subValue={`${completedTests} completed`}
              icon={Activity}
              color="blue"
            />
            <KPICard
              label="New Patients"
              value={newPatients.toLocaleString()}
              icon={Users}
              color="indigo"
            />
            <KPICard
              label="Pending Tasks"
              value={pendingTests.toLocaleString()}
              icon={ClipboardList}
              color="amber"
              alert={pendingTests > 0}
            />
          </div>

          {/* CHARTS & FINANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DashboardCard title="Revenue Trend" icon={TrendingUp}>
                <div className="h-[300px] w-full p-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: "#64748b" }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: "#64748b" }} 
                          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                          formatter={(value) => [`Le ${Number(value).toLocaleString()}`, "Revenue"]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#0ea5e9" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
                      <Activity className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">No trend data available</p>
                    </div>
                  )}
                </div>
              </DashboardCard>
            </div>

            <div className="lg:col-span-1 space-y-6">
               <DashboardCard title="Financial Health" icon={DollarSign}>
                <div className="p-6 space-y-6">
                  <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Collection Rate
                    </span>
                    <span className={`text-3xl font-bold ${collectionRate > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {collectionRate}%
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Target: 90%</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Outstanding</span>
                      <span className="font-semibold text-slate-900">
                         Le {pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                      <FinanceRow label="Avg Rev / Invoice" value={revenuePerInvoice} />
                      <FinanceRow label="Avg Rev / Patient" value={revenuePerPatient} />
                  </div>
                </div>
              </DashboardCard>
            </div>
          </div>

          {/* OPERATIONS & ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardCard title="Lab Operations" icon={Activity}>
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-3xl font-bold text-slate-900">{completionRate}%</span>
                      <span className="text-sm text-slate-500 ml-2">Completion Rate</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-sky-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <StatBox 
                    label="Completed" 
                    value={completedTests} 
                    icon={CheckCircle2} 
                    color="text-emerald-600" 
                    bg="bg-emerald-50" 
                  />
                  <StatBox 
                    label="Pending" 
                    value={pendingTests} 
                    icon={Clock} 
                    color="text-amber-600" 
                    bg="bg-amber-50" 
                  />
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="Recent Activity" icon={MoreHorizontal}>
              <div className="p-4">
                {activityFeed.length > 0 ? (
                  <div className="space-y-6">
                    {activityFeed.map((item, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        {idx !== activityFeed.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-slate-200" />
                        )}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 
                          ${item.type === 'medical' ? 'bg-sky-100 text-sky-600' : 
                            item.type === 'finance' ? 'bg-emerald-100 text-emerald-600' : 
                            'bg-slate-100 text-slate-500'}`}>
                           <div className="w-2 h-2 rounded-full bg-current" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-800">
                            <span className="font-semibold">{item.user}</span> {item.action}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                   <div className="text-center py-6 text-slate-400 text-sm">
                     No recent activity.
                   </div>
                )}
              </div>
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
};

// --- Reusable Components ---

const KPICard = ({ label, value, subValue, icon: Icon, color = "blue", alert = false }) => {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {alert && (
           <span className="flex h-2 w-2 relative">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
           </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
};

const DashboardCard = ({ title, icon: Icon, children, action }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      {action}
    </div>
    <div className="flex-1">
      {children}
    </div>
  </div>
);

const StatBox = ({ label, value, icon: Icon, color, bg }) => (
  <div className={`rounded-lg p-4 border border-transparent ${bg} flex items-center gap-3`}>
    <div className={`p-1.5 rounded-md bg-white shadow-sm ${color}`}>
       <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value.toLocaleString()}</p>
    </div>
  </div>
);

const FinanceRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
     <span className="text-xs text-slate-500">{label}</span>
     <span className="text-sm font-medium text-slate-900">
       Le {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
     </span>
  </div>
);

export default AdminDashboardPage;