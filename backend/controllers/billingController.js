const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLogger'); // optional but recommended

// ============================================================
// 🧠 Utility Functions
// ============================================================

// Safely convert any value to a number or fallback
const safeNumber = (val, fallback = 0) =>
  val === null || val === undefined || isNaN(Number(val)) ? fallback : Number(val);

/**
 * Returns a [startDate, endDate] pair based on period or explicit from/to
 * Accepts query: period=day|week|month|year or from=YYYY-MM-DD, to=YYYY-MM-DD
 * If both provided, explicit from/to wins.
 */
const getRange = ({ period = 'month', from, to }) => {
  const now = new Date();
  let startDate, endDate;

  if (from || to) {
    // Normalize to full-day range if only date provided
    startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : now;
  } else {
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = now;
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = now;
    }
  }

  return { startDate, endDate };
};

// ============================================================
// 📊 Dashboard Summary
// ============================================================

const getDashboardStats = async (req, res) => {
  const { period = 'month', from, to } = req.query;
  const { startDate, endDate } = getRange({ period, from, to });

  try {
    const queries = {
      totalRevenue: `
        SELECT COALESCE(SUM(amount), 0) AS total_revenue
        FROM invoices
        WHERE created_at BETWEEN $1 AND $2;
      `,
      invoiceCount: `
        SELECT COUNT(*) AS invoice_count
        FROM invoices
        WHERE created_at BETWEEN $1 AND $2;
      `,
      newPatients: `
        SELECT COUNT(*) AS new_patients
        FROM patients
        WHERE registered_at BETWEEN $1 AND $2;
      `,
      // NOTE: Pending payments are usually interesting within the same period.
      // If you want lifetime pending, remove the WHERE date filter below.
      pendingPayments: `
        SELECT COUNT(*) AS pending_payments
        FROM invoices
        WHERE (amount IS NULL OR amount = 0)
          AND created_at BETWEEN $1 AND $2;
      `,
      completedTests: `
        SELECT COUNT(*) AS completed_tests
        FROM test_requests
        WHERE status ILIKE 'Completed'
          AND created_at BETWEEN $1 AND $2;
      `,
      pendingTests: `
        SELECT COUNT(*) AS pending_tests
        FROM test_requests
        WHERE status NOT ILIKE 'Completed'
          AND created_at BETWEEN $1 AND $2;
      `,
      totalStaff: `
        SELECT COUNT(*) AS total_staff
        FROM users
        WHERE is_active = true;
      `,
      activeUsers: `
        SELECT COUNT(*) AS active_users
        FROM users
        WHERE last_seen >= NOW() - INTERVAL '7 days';
      `,
    };

    const params = [startDate, endDate];

    const results = await Promise.all([
      pool.query(queries.totalRevenue, params),
      pool.query(queries.invoiceCount, params),
      pool.query(queries.newPatients, params),
      pool.query(queries.pendingPayments, params),
      pool.query(queries.completedTests, params),
      pool.query(queries.pendingTests, params),
      pool.query(queries.totalStaff),
      pool.query(queries.activeUsers),
    ]);

    const [
      totalRevenue,
      invoiceCount,
      newPatients,
      pendingPayments,
      completedTests,
      pendingTests,
      totalStaff,
      activeUsers,
    ] = results.map((r) => r.rows[0]);

    // Optional: Log audit event
    if (typeof logAuditEvent === 'function') {
      logAuditEvent({
        user_id: req.user?.id || null,
        action: 'DASHBOARD_VIEW',
        details: { period, from, to },
      }).catch(() => {});
    }

    res.json({
      totalRevenue: safeNumber(totalRevenue.total_revenue),
      invoiceCount: safeNumber(invoiceCount.invoice_count),
      newPatientCount: safeNumber(newPatients.new_patients),
      pendingPayments: safeNumber(pendingPayments.pending_payments),
      completedTests: safeNumber(completedTests.completed_tests),
      pendingTests: safeNumber(pendingTests.pending_tests),
      totalStaff: safeNumber(totalStaff.total_staff),
      activeUsers: safeNumber(activeUsers.active_users),
      currency: 'Le',
      period,
      range: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Dashboard Stats Error:', error.message);
    res.status(500).json({ message: 'Server error retrieving dashboard stats.' });
  }
};

// ============================================================
// 📈 Monthly Analytics (for Charts)
// ============================================================

const getMonthlyAnalytics = async (req, res) => {
  try {
    const revenueQuery = `
      SELECT 
        TO_CHAR(created_at, 'Mon') AS month_label,
        DATE_TRUNC('month', created_at) AS month_start,
        COALESCE(SUM(amount), 0) AS total_revenue,
        COUNT(*) AS total_invoices
      FROM invoices
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY month_label, month_start
      ORDER BY month_start;
    `;

    const patientsQuery = `
      SELECT 
        TO_CHAR(registered_at, 'Mon') AS month_label,
        DATE_TRUNC('month', registered_at) AS month_start,
        COUNT(*) AS new_patients
      FROM patients
      WHERE EXTRACT(YEAR FROM registered_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY month_label, month_start
      ORDER BY month_start;
    `;

    const testsQuery = `
      SELECT 
        TO_CHAR(created_at, 'Mon') AS month_label,
        DATE_TRUNC('month', created_at) AS month_start,
        COUNT(*) FILTER (WHERE status ILIKE 'Completed') AS completed_tests
      FROM test_requests
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY month_label, month_start
      ORDER BY month_start;
    `;

    const [revenue, patients, tests] = await Promise.all([
      pool.query(revenueQuery),
      pool.query(patientsQuery),
      pool.query(testsQuery),
    ]);

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const rMap = new Map(revenue.rows.map((r) => [r.month_label, r]));
    const pMap = new Map(patients.rows.map((p) => [p.month_label, p]));
    const tMap = new Map(tests.rows.map((t) => [t.month_label, t]));

    const data = months.map((m) => ({
      month: m,
      revenue: safeNumber(rMap.get(m)?.total_revenue),
      invoices: safeNumber(rMap.get(m)?.total_invoices),
      patients: safeNumber(pMap.get(m)?.new_patients),
      completed_tests: safeNumber(tMap.get(m)?.completed_tests),
    }));

    // Optional: Log audit event
    if (typeof logAuditEvent === 'function') {
      logAuditEvent({
        user_id: req.user?.id || null,
        action: 'ANALYTICS_VIEW',
        details: { year: new Date().getFullYear() },
      }).catch(() => {});
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Analytics Error:', error.message);
    res.status(500).json({ message: 'Failed to load analytics data.' });
  }
};

module.exports = { getDashboardStats, getMonthlyAnalytics };
