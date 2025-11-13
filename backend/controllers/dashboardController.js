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
const getStats = async (req, res) => {
  try {
    const period = req.query.period || "month";
    const rangeFunction = getPeriodStart(period);

    const q = async (sql) => (await pool.query(sql.trim())).rows[0];

    // ---------------------------------------------------------
    // 💰 FIXED: Total revenue should come from test_requests
    // ---------------------------------------------------------
    const revenue = await q(`
      SELECT COALESCE(SUM(payment_amount), 0)::numeric AS total
      FROM test_requests
      WHERE payment_status = 'Paid'
        AND payment_date >= ${rangeFunction}
    `);

    // ---------------------------------------------------------
    // 🧾 Invoice count = number of PAID test requests
    // ---------------------------------------------------------
    const invoiceCount = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE payment_status = 'Paid'
        AND payment_date >= ${rangeFunction}
    `);

    // ---------------------------------------------------------
    // 👥 New patients registered in period
    // ---------------------------------------------------------
    const newPatients = await q(`
      SELECT COUNT(*) AS count
      FROM patients
      WHERE registered_at >= ${rangeFunction}
    `);

    // ---------------------------------------------------------
    // ⚠️ Pending payments = unpaid test requests
    // ---------------------------------------------------------
    const pendingPayments = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE payment_status = 'Unpaid'
        AND created_at >= ${rangeFunction}
    `);

    // ---------------------------------------------------------
    // 🧪 Completed tests
    // ---------------------------------------------------------
    const completedTests = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE status = 'Completed'
        AND updated_at >= ${rangeFunction}
    `);

    // ---------------------------------------------------------
    // 🧪 Pending tests
    // ---------------------------------------------------------
    const pendingTests = await q(`
      SELECT COUNT(*) AS count
      FROM test_requests
      WHERE status = 'Pending'
        AND created_at >= ${rangeFunction}
    `);

    // ---------------------------------------------------------
    // 👤 Active users
    // ---------------------------------------------------------
    const activeUsers = await q(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE last_seen > NOW() - INTERVAL '15 minutes'
    `);

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
    console.error("Dashboard Stats Error:", err);
    return res.status(500).json({
      message: "Server Error during stats calculation.",
    });
  }
};

// -------------------------------------------------------------
// MONTHLY ANALYTICS
// -------------------------------------------------------------
const getAnalytics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', payment_date), 'Mon YYYY') AS month,
        DATE_TRUNC('month', payment_date) AS month_start,
        SUM(payment_amount) AS revenue,
        COUNT(*) as invoice_count
      FROM test_requests
      WHERE payment_status = 'Paid'
      GROUP BY month_start
      ORDER BY month_start;
    `);

    const rows = result.rows.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue || 0),
      invoice_count: Number(r.invoice_count || 0),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("Dashboard Analytics Error:", err);
    return res.status(500).json({
      message: "Server Error during analytics calculation.",
    });
  }
};

module.exports = {
  getStats,
  getAnalytics,
  getDashboardStats: getStats,
  getMonthlyAnalytics: getAnalytics,
};
