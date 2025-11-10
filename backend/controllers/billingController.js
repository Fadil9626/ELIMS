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
// GET /api/billing/dashboard
// -------------------------------------------------------------
const getDashboardStats = async (req, res) => {
  try {
    const period = (req.query.period || "month").toLowerCase();
    const range = getPeriodStart(period);

    const q = async (sql) => (await pool.query(sql)).rows[0];

    // Total revenue (only PAID invoices)
    const revenue = await q(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total
      FROM invoices
      WHERE status = 'paid' AND created_at >= ${range}
    `);

    // Total invoices in period
    const invoiceCount = await q(`
      SELECT COUNT(*) AS count
      FROM invoices
      WHERE created_at >= ${range}
    `);

    // New patients in period
    const newPatients = await q(`
      SELECT COUNT(*) AS count
      FROM patients
      WHERE registered_at >= ${range}
    `);

    // Pending payments (unpaid/pending invoices)
    const pendingPayments = await q(`
      SELECT COUNT(*) AS count
      FROM invoices
      WHERE status = 'pending' AND created_at >= ${range}
    `);

    // Completed tests (test_requests.status = 'Completed')
    const completedTests = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE status = 'Completed' AND updated_at >= ${range}
    `);

    // Pending tests
    const pendingTests = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE status = 'Pending' AND created_at >= ${range}
    `);

    // Active users in last 15 minutes
    const activeUsers = await q(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE last_seen > NOW() - INTERVAL '15 minutes'
    `);

    // Total staff
    const totalStaff = await q(`
      SELECT COUNT(*) AS count
      FROM users
    `);

    return res.json({
      totalRevenue: Number(revenue.total) || 0,
      invoiceCount: Number(invoiceCount.count) || 0,
      newPatientCount: Number(newPatients.count) || 0,
      pendingPayments: Number(pendingPayments.count) || 0,
      completedTests: Number(completedTests.count) || 0,
      pendingTests: Number(pendingTests.count) || 0,
      activeUsers: Number(activeUsers.count) || 0,
      totalStaff: Number(totalStaff.count) || 0,
      currency: "Le",
    });
  } catch (err) {
    console.error("❌ Dashboard Stats Error:", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// -------------------------------------------------------------
// GET /api/billing/analytics
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

module.exports = {
  getDashboardStats,
  getMonthlyAnalytics,
};
