const path = require("path");
const fs = require("fs");
const pool = require("../config/database");

// Ensure table exists (runs once)
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS professional_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      credentials TEXT,
      license_number TEXT,
      license_state TEXT,
      license_expiry DATE,
      specialization TEXT,
      signature_image_url TEXT,
      show_on_reports BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  ensured = true;
}

function sanitize(row = {}) {
  return {
    title: row.title || "",
    credentials: row.credentials || "",
    license_number: row.license_number || "",
    license_state: row.license_state || "",
    license_expiry: row.license_expiry || null,
    specialization: row.specialization || "",
    signature_image_url: row.signature_image_url || "",
    show_on_reports: typeof row.show_on_reports === "boolean" ? row.show_on_reports : true,
  };
}

// GET /api/profile/professional
async function getProfessionalProfile(req, res) {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      "SELECT * FROM professional_profiles WHERE user_id = $1",
      [req.user.id]
    );
    return res.json(rows[0] ? sanitize(rows[0]) : sanitize({}));
  } catch (e) {
    console.error("getProfessionalProfile error:", e);
    return res.status(500).json({ message: "Failed to load professional profile" });
  }
}

// PATCH /api/profile/professional
async function updateProfessionalProfile(req, res) {
  try {
    await ensureTable();
    const {
      title = "",
      credentials = "",
      license_number = "",
      license_state = "",
      license_expiry = null,
      specialization = "",
      show_on_reports = true,
    } = req.body || {};

    const sql = `
      INSERT INTO professional_profiles (
        user_id, title, credentials, license_number, license_state,
        license_expiry, specialization, show_on_reports, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        title = EXCLUDED.title,
        credentials = EXCLUDED.credentials,
        license_number = EXCLUDED.license_number,
        license_state = EXCLUDED.license_state,
        license_expiry = EXCLUDED.license_expiry,
        specialization = EXCLUDED.specialization,
        show_on_reports = EXCLUDED.show_on_reports,
        updated_at = now()
      RETURNING *;
    `;
    const params = [
      req.user.id,
      title,
      credentials,
      license_number,
      license_state,
      license_expiry || null,
      specialization,
      !!show_on_reports,
    ];
    const { rows } = await pool.query(sql, params);
    return res.json(sanitize(rows[0]));
  } catch (e) {
    console.error("updateProfessionalProfile error:", e);
    return res.status(500).json({ message: "Failed to save professional profile" });
  }
}

// POST /api/profile/professional/signature  (file field: 'file')
async function uploadSignature(req, res) {
  try {
    await ensureTable();

    // Store relative URL used by frontend
    const relUrl = `/uploads/signatures/${req.file.filename}`;

    // Upsert URL into profile
    const { rows } = await pool.query(
      `
      INSERT INTO professional_profiles (user_id, signature_image_url, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (user_id) DO UPDATE SET
        signature_image_url = EXCLUDED.signature_image_url,
        updated_at = now()
      RETURNING signature_image_url
      `,
      [req.user.id, relUrl]
    );

    return res.json({ signature_image_url: rows[0].signature_image_url });
  } catch (e) {
    console.error("uploadSignature error:", e);
    return res.status(500).json({ message: "Failed to upload signature" });
  }
}

module.exports = {
  getProfessionalProfile,
  updateProfessionalProfile,
  uploadSignature,
};
