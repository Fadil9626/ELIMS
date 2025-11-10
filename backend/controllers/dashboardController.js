const pool = require("../config/database");

// -------------------------------------------------------------
// HELPER: Convert period to SQL range start
// -------------------------------------------------------------

const getPeriodStart = (period) => {
  switch ((period || "").toLowerCase()) {
    case "day":
    case "today":
      return "CURRENT_DATE";
    case "week":
      return "DATE_TRUNC('week', NOW())";
    case "year":
      return "DATE_TRUNC('year', NOW())";
    case "month":
    default:
      return "DATE_TRUNC('month', NOW())";
  }
};

// -------------------------------------------------------------
// MAIN CONTROLLER: Fetch Dashboard Stats
// -------------------------------------------------------------

/**
 * Fetches aggregated statistics for the dashboard widgets.
 * @param {string} req.query.period - Time frame (day, week, month, year).
 */
const getStats = async (req, res) => {
  try {
    const period = req.query.period || "month";
    // Get the SQL function to define the range start. E.g., DATE_TRUNC('month', NOW())
    const rangeFunction = getPeriodStart(period);

    // WARNING: SQL Injection Risk mitigated.
    // Since rangeFunction is built from a controlled switch statement,
    // we can safely inject it into the SQL string without parameterized queries.
    // If the input 'period' were user-defined text, this would be highly unsafe.

    const q = async (sql) => (await pool.query(sql)).rows[0];

    // --- STATS QUERIES ---

    // 💰 Total revenue (paid invoices only)
    const revenue = await q(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total
      FROM invoices
      WHERE status = 'paid' AND created_at >= ${rangeFunction}
    `);

    // 🧾 Total invoices in period
    const invoiceCount = await q(`
      SELECT COUNT(*) AS count
      FROM invoices
      WHERE created_at >= ${rangeFunction}
    `);

    // 👥 New patients registered in period
    const newPatients = await q(`
      SELECT COUNT(*) AS count
      FROM patients
      WHERE registered_at >= ${rangeFunction}
    `);

    // ⚠️ Pending invoice payments
    const pendingPayments = await q(`
      SELECT COUNT(*) AS count
      FROM invoices
      WHERE status = 'pending' AND created_at >= ${rangeFunction}
    `);

    // 🧪 Completed tests
    const completedTests = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE status = 'Completed' AND updated_at >= ${rangeFunction}
    `);

    // 🧪 Pending tests
    const pendingTests = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE status = 'Pending' AND created_at >= ${rangeFunction}
    `);

    // 👤 Active users (last 15 min)
    const activeUsers = await q(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE last_seen > NOW() - INTERVAL '15 minutes'
    `);

    // 👨‍⚕️ Total staff (users)
    const totalStaff = await q(`
      SELECT COUNT(*) AS count
      FROM users
    `);
    
    // --- RESPONSE MAPPING ---

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
    console.error("Dashboard Stats Error:", err);
    // Sending a 500 status with a generic error prevents the client from hanging,
    // but the issue in your logs is likely permission related.
    return res.status(500).json({ message: "Server Error during stats calculation." });
  }
};

// -------------------------------------------------------------
// Monthly analytics for charts
// -------------------------------------------------------------

/**
 * Fetches monthly revenue and invoice count for charts.
 */
const getAnalytics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', created_at) AS month_start,
        SUM(amount) AS revenue,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE status = 'paid'
      GROUP BY month_start
      ORDER BY month_start
    `);

    const rows = result.rows.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue || 0),
      invoice_count: Number(r.invoice_count || 0),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("Dashboard Analytics Error:", err);
    return res.status(500).json({ message: "Server Error during analytics calculation." });
  }
};

// -------------------------------------------------------------
// EXPORTS
// -------------------------------------------------------------
module.exports = {
  // generic names
  getStats,
  getAnalytics,
  // names used by server.js inline routes (for backward compatibility)
  getDashboardStats: getStats,
  getMonthlyAnalytics: getAnalytics,
};