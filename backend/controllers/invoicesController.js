// backend/controllers/invoicesController.js
const pool = require("../config/database");

async function loadOrgProfile(client) {
  // First: flat keys in system_settings (your current setup)
  try {
    const { rows } = await client.query(
      `SELECT key, value FROM system_settings
       WHERE key IN ('lab_name','lab_address','lab_phone','lab_email','lab_logo_url','tax_id')`
    );
    if (rows.length) {
      const m = rows.reduce((a, r) => ((a[r.key] = r.value), a), {});
      return {
        name: m.lab_name || "",
        address: m.lab_address || "",
        phone: m.lab_phone || "",
        email: m.lab_email || "",
        logo_url: m.lab_logo_url || "",
        tax_id: m.tax_id || "",
      };
    }
  } catch (_) {}

  // Fallbacks if you later store JSON payloads
  try {
    const { rows } = await client.query(
      `SELECT value FROM settings WHERE key IN ('lab_profile','org_profile') LIMIT 1`
    );
    if (rows[0]?.value) {
      const v = rows[0].value;
      return {
        name: v.name || v.lab_name || "",
        address: v.address || "",
        phone: v.phone || "",
        email: v.email || "",
        logo_url: v.logo_url || "",
        tax_id: v.tax_id || "",
      };
    }
  } catch (_) {}

  return { name: "", address: "", phone: "", email: "", logo_url: "", tax_id: "" };
}

exports.getInvoiceForTestRequest = async (req, res) => {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId)) return res.status(400).json({ message: "Invalid request id" });

  const client = await pool.connect();
  try {
    const headerSql = `
      SELECT
        tr.id AS request_id,
        tr.status, tr.payment_status, tr.payment_method, tr.payment_date,
        tr.created_at, tr.updated_at,
        p.id AS patient_id, p.first_name, p.last_name, p.gender, p.date_of_birth,
        w.name AS ward_name,
        u.full_name AS doctor_name
      FROM test_requests tr
      JOIN patients p ON p.id = tr.patient_id
      LEFT JOIN wards w ON w.id = p.ward_id
      LEFT JOIN users u ON u.id = tr.doctor_id
      WHERE tr.id = $1
      LIMIT 1`;
    const headerRes = await client.query(headerSql, [requestId]);
    if (headerRes.rowCount === 0) return res.status(404).json({ message: "Test request not found" });
    const header = headerRes.rows[0];

    const itemsSql = `
      SELECT tri.id AS item_id,
             tc.id AS test_id,
             tc.name AS test_name,
             COALESCE(tc.price,0)::numeric(12,2) AS price,
             tc.is_panel
      FROM test_request_items tri
      JOIN test_catalog tc ON tc.id = tri.test_catalog_id
      WHERE tri.test_request_id = $1
      ORDER BY tc.name ASC`;
    const itemsRes = await client.query(itemsSql, [requestId]);
    const items = itemsRes.rows.map(r => ({
      item_id: r.item_id,
      test_id: r.test_id,
      test_name: r.test_name,
      price: Number(r.price || 0),
      qty: 1,
      is_panel: !!r.is_panel,
      line_total: Number(r.price || 0),
    }));

    const subtotal = items.reduce((s, it) => s + it.line_total, 0);
    const tax = 0;
    const total = subtotal + tax;

    const org = await loadOrgProfile(client);

    res.json({
      header,
      items,
      totals: { subtotal, tax, total, currency: "Le" },
      org,
    });
  } catch (e) {
    console.error("❌ getInvoiceForTestRequest:", e.message);
    res.status(500).json({ message: "Server error generating invoice" });
  } finally {
    client.release();
  }
};
