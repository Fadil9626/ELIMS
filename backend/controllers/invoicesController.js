// backend/controllers/invoiceController.js
const pool = require("../config/database");

// =============================================================
// 🔧 Helper: Unified error response
// =============================================================
const sendError = (res, handler, error, msg = "Server Error") => {
  console.error(`❌ ${handler}:`, error.message);
  return res.status(500).json({
    message: msg,
    error: error.message || error,
  });
};

// =============================================================
// 📌 GET ALL INVOICES  (Optional: ?status=Paid|Pending)
// =============================================================
const listInvoices = async (req, res) => {
  const { status } = req.query;

  try {
    const params = [];
    let where = "";

    if (status) {
      params.push(status);
      where = `WHERE inv.status = $${params.length}`;
    }

    const { rows } = await pool.query(
      `
      SELECT
        inv.id,
        inv.test_request_id,
        inv.total_amount,
        inv.amount_paid,
        inv.status,
        inv.created_at,

        (
          COALESCE(p.first_name,'') || ' ' ||
          COALESCE(p.middle_name || '','') || ' ' ||
          COALESCE(p.last_name,'')
        ) AS patient_name,

        p.mrn

      FROM invoices inv
      LEFT JOIN test_requests tr ON tr.id = inv.test_request_id
      LEFT JOIN patients p ON p.id = tr.patient_id
      ${where}
      ORDER BY inv.created_at DESC
      `,
      params
    );

    return res.json(rows);
  } catch (error) {
    return sendError(res, "listInvoices", error, "Failed to load invoices");
  }
};

// =============================================================
// 📌 GET INVOICE BY ID
// =============================================================
const getInvoiceById = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        inv.id,
        inv.test_request_id,
        inv.total_amount,
        inv.amount_paid,
        inv.status,
        inv.created_at,

        (
          COALESCE(p.first_name,'') || ' ' ||
          COALESCE(p.middle_name || '','') || ' ' ||
          COALESCE(p.last_name,'')
        ) AS patient_name,

        p.mrn

      FROM invoices inv
      LEFT JOIN test_requests tr ON tr.id = inv.test_request_id
      LEFT JOIN patients p ON p.id = tr.patient_id
      WHERE inv.id = $1
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Invoice not found" });

    return res.json(rows[0]);
  } catch (error) {
    return sendError(res, "getInvoiceById", error, "Failed to fetch invoice");
  }
};

// =============================================================
// 📌 GET OR BUILD INVOICE DATA FOR A TEST REQUEST
// =============================================================
const getInvoiceForTestRequest = async (req, res) => {
  const { id: requestId } = req.params;

  try {
    // --- Load Basic Test Request + Patient ---
    const { rows: baseRows } = await pool.query(
      `
      SELECT 
        tr.id AS request_id,
        tr.created_at,
        tr.status AS request_status,
        tr.payment_amount,
        tr.payment_status,
        tr.payment_method,

        p.id AS patient_id,
        p.mrn,
        p.phone AS patient_phone,

        (
          COALESCE(p.first_name,'') || ' ' ||
          COALESCE(p.middle_name || '','') || ' ' ||
          COALESCE(p.last_name,'')
        ) AS patient_name,

        w.name AS ward_name

      FROM test_requests tr
      LEFT JOIN patients p ON p.id = tr.patient_id
      LEFT JOIN wards w ON w.id = tr.ward_id
      WHERE tr.id = $1
      `,
      [requestId]
    );

    if (!baseRows.length) {
      return res.status(404).json({ message: "Test request not found" });
    }

    const request = baseRows[0];

    // --- Load Test Items (FIXED COLUMN NAME) ---
    const { rows: itemRows } = await pool.query(
      `
      SELECT 
        tri.id AS item_id,
        tc.id AS test_id,
        tc.name AS test_name,
        tc.price
      FROM test_request_items tri
      LEFT JOIN test_catalog tc ON tc.id = tri.test_catalog_id
      WHERE tri.test_request_id = $1
      `,
      [requestId]
    );

    const items = itemRows.map((i) => ({
      id: i.item_id,
      test_id: i.test_id,
      name: i.test_name,
      price: Number(i.price || 0),
    }));

    const total = items.reduce((sum, i) => sum + i.price, 0);
    const paid = Number(request.payment_amount || 0);

    // --- Create Full Invoice Response ---
    return res.json({
      invoice_code: `INV-${String(requestId).padStart(5, "0")}`,
      request_id: requestId,
      created_at: request.created_at,

      patient: {
        id: request.patient_id,
        mrn: request.mrn,
        name: request.patient_name.trim(),
        phone: request.patient_phone,
        ward: request.ward_name || "N/A",
      },

      items,
      billing: {
        amount_due: total,
        amount_paid: paid,
        balance: Math.max(total - paid, 0),
        payment_status: request.payment_status,
        payment_method: request.payment_method,
      },
    });

  } catch (error) {
    return sendError(res, "getInvoiceForTestRequest", error, "Failed retrieving invoice data");
  }
};

// =============================================================
// 📌 CREATE OR UPDATE INVOICE FOR TEST REQUEST
// =============================================================
const createOrUpdateInvoiceForTestRequest = async (req, res) => {
  const { id: requestId } = req.params;
  const { total_amount } = req.body;

  if (!total_amount || isNaN(total_amount))
    return res.status(400).json({ message: "Valid total_amount required" });

  try {
    const existing = await pool.query(
      `SELECT id FROM invoices WHERE test_request_id = $1`,
      [requestId]
    );

    let result;

    if (existing.rows.length) {
      result = await pool.query(
        `UPDATE invoices SET total_amount = $2 WHERE test_request_id = $1 RETURNING *`,
        [requestId, total_amount]
      );
    } else {
      result = await pool.query(
        `
        INSERT INTO invoices (test_request_id, total_amount, status, amount_paid)
        VALUES ($1, $2, 'Pending', 0)
        RETURNING *
        `,
        [requestId, total_amount]
      );
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return sendError(res, "createOrUpdateInvoiceForTestRequest", error);
  }
};

// =============================================================
// 💳 RECORD PAYMENT
// =============================================================
const recordPayment = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || isNaN(amount))
    return res.status(400).json({ message: "Valid payment amount required" });

  try {
    const { rows } = await pool.query(`SELECT * FROM invoices WHERE id = $1`, [id]);

    if (!rows.length) return res.status(404).json({ message: "Invoice not found" });

    const invoice = rows[0];
    const newPaid = Number(invoice.amount_paid) + Number(amount);
    const status = newPaid >= invoice.total_amount ? "Paid" : "Partial";

    const { rows: updated } = await pool.query(
      `
      UPDATE invoices 
      SET amount_paid = $2, status = $3 
      WHERE id = $1
      RETURNING *
      `,
      [id, newPaid, status]
    );

    return res.json(updated[0]);
  } catch (error) {
    return sendError(res, "recordPayment", error);
  }
};

module.exports = {
  listInvoices,
  getInvoiceById,
  getInvoiceForTestRequest,
  createOrUpdateInvoiceForTestRequest,
  recordPayment,
};
