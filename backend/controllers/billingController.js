const pool = require("../config/database");

// -------------------------------------------------------------
// Helper: map period → SQL expression for range start
// -------------------------------------------------------------
const getPeriodStart = (period) => {
  switch (period) {
    case "day":
    case "today":
      return "CURRENT_DATE";
    case "week":
      return "DATE_TRUNC('week', NOW())";
    case "month":
      return "DATE_TRUNC('month', NOW())";
    case "year":
      return "DATE_TRUNC('year', NOW())";
    default:
      return "DATE_TRUNC('month', NOW())";
  }
};

// -------------------------------------------------------------
// Helper: map period → Date format for Trend Graph
// -------------------------------------------------------------
const getDateFormat = (period) => {
  switch (period) {
    case "day": return "HH12 AM"; 
    case "week": return "Dy";
    case "month": return "DD Mon";
    case "year": return "Mon YYYY";
    default: return "DD Mon";
  }
};

// -------------------------------------------------------------
// 1. GET /api/billing/dashboard-stats
// -------------------------------------------------------------
const getDashboardStats = async (req, res) => {
  try {
    const period = (req.query.period || "month").toLowerCase();
    const range = getPeriodStart(period);
    const dateFormat = getDateFormat(period);

    const q = async (sql) => (await pool.query(sql)).rows[0];

    // --- SCALAR STATS ---
    // FIX APPLIED: Added ::text to cast Postgres ENUM to String for LOWER() function
    
    const revenue = await q(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total 
      FROM invoices 
      WHERE LOWER(status::text) = 'paid' AND created_at >= ${range}
    `);
    
    const pendingPayments = await q(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total 
      FROM invoices 
      WHERE LOWER(status::text) = 'pending' AND created_at >= ${range}
    `);
    
    const invoiceCount = await q(`SELECT COUNT(*) AS count FROM invoices WHERE created_at >= ${range}`);
    
    const newPatients = await q(`SELECT COUNT(*) AS count FROM patients WHERE registered_at >= ${range}`);
    
    const completedTests = await q(`SELECT COUNT(*) AS count FROM test_requests WHERE status = 'Completed' AND updated_at >= ${range}`);
    
    const pendingTests = await q(`SELECT COUNT(*) AS count FROM test_requests WHERE status = 'Pending' AND created_at >= ${range}`);
    
    const activeUsers = await q(`SELECT COUNT(*) AS count FROM users WHERE last_seen > NOW() - INTERVAL '15 minutes'`);
    
    const totalStaff = await q(`SELECT COUNT(*) AS count FROM users`);

    // --- TREND GRAPH ---
    // FIX APPLIED: Added ::text here as well
    const trendQuery = `
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') AS label, 
        COALESCE(SUM(amount), 0)::numeric AS amount
      FROM invoices 
      WHERE LOWER(status::text) = 'paid' AND created_at >= ${range}
      GROUP BY 1 
      ORDER BY MIN(created_at) ASC
    `;
    const trendResult = await pool.query(trendQuery);

    // --- ACTIVITY FEED ---
    // Fetches latest events from multiple tables to simulate an activity log
    const activityQuery = `
      (SELECT 'medical' as type, 'Completed test for ' || p.first_name as action, 'Lab Tech' as user, tr.updated_at as time 
       FROM test_requests tr JOIN patients p ON tr.patient_id = p.id WHERE tr.status = 'Completed' ORDER BY tr.updated_at DESC LIMIT 3)
      UNION ALL
      (SELECT 'finance' as type, 'Generated Invoice #' || id as action, 'System' as user, created_at as time 
       FROM invoices ORDER BY created_at DESC LIMIT 3)
      UNION ALL
      (SELECT 'admin' as type, 'Registered patient ' || first_name as action, 'Reception' as user, registered_at as time 
       FROM patients ORDER BY registered_at DESC LIMIT 3)
      ORDER BY time DESC LIMIT 6
    `;
    
    let formattedActivity = [];
    try {
        const activityResult = await pool.query(activityQuery);
        formattedActivity = activityResult.rows.map(row => ({
          type: row.type ? row.type.toLowerCase() : 'info',
          user: row.user,
          action: row.action,
          time: new Date(row.time).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) 
        }));
    } catch (activityError) {
        // Suppress error if tables are empty or columns missing, to keep dashboard alive
        console.warn("⚠️ Activity feed query failed:", activityError.message);
    }

    return res.json({
      totalRevenue: Number(revenue.total) || 0,
      pendingPayments: Number(pendingPayments.total) || 0,
      invoiceCount: Number(invoiceCount.count) || 0,
      newPatientCount: Number(newPatients.count) || 0,
      completedTests: Number(completedTests.count) || 0,
      pendingTests: Number(pendingTests.count) || 0,
      totalStaff: Number(totalStaff.count) || 0,
      activeUsers: Number(activeUsers.count) || 0,
      revenueTrend: trendResult.rows,
      recentActivity: formattedActivity,
      currency: "Le",
    });

  } catch (err) {
    console.error("❌ Dashboard Stats Error:", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// -------------------------------------------------------------
// 2. GET /api/billing/analytics
// -------------------------------------------------------------
const getMonthlyAnalytics = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        COALESCE(SUM(amount), 0)::numeric AS revenue,
        COUNT(*) AS invoice_count
      FROM invoices
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);
    return res.json(rows);
  } catch (err) {
    console.error("❌ Dashboard Analytics Error:", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// -------------------------------------------------------------
// EXPORTS
// -------------------------------------------------------------
module.exports = {
  getDashboardStats,
  getMonthlyAnalytics, 
};