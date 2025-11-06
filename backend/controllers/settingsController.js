const path = require("path");
const pool = require("../config/database");

/* --------------------------- TABLE HELPERS --------------------------- */
// These are local helpers, so they don't need to be exported.
async function ensureSettingsTable() {
  // FIX: Cleaned SQL query
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key   text PRIMARY KEY,
      value text NOT NULL
    );
  `.replace(/\s+/g, " ").trim());
}

async function getSettingsMap(keys) {
  await ensureSettingsTable();
  if (!keys?.length) return {};
  // FIX: Cleaned SQL query
  const { rows } = await pool.query(
    `SELECT key, value FROM system_settings WHERE key = ANY($1::text[])`.replace(/\s+/g, " ").trim(),
    [keys]
  );
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

async function setSetting(key, value) {
  await ensureSettingsTable();
  // FIX: Cleaned SQL query
  await pool.query(
    `INSERT INTO system_settings(key,value)
     VALUES($1,$2)
     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`.replace(/\s+/g, " ").trim(),
    [key, String(value ?? "")]
  );
}

async function setSettingsBulk(obj = {}) {
  await ensureSettingsTable();
  const keys = Object.keys(obj);
  if (!keys.length) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const k of keys) {
      // FIX: Cleaned SQL query
      await client.query(
        `INSERT INTO system_settings(key,value)
         VALUES($1,$2)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`.replace(/\s+/g, " ").trim(),
        [k, String(obj[k] ?? "")]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/* --------------------------- LEGACY ENDPOINTS --------------------------- */
// 🟢 FIX: Changed to const definition
const getAllSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    // FIX: Cleaned SQL query
    const { rows } = await pool.query(`SELECT key, value FROM system_settings ORDER BY key ASC`.replace(/\s+/g, " ").trim());
    res.json(rows.reduce((acc, r) => ((acc[r.key] = r.value), acc), {}));
  } catch (e) {
    console.error("getAllSettings:", e.message);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

// 🟢 FIX: Changed to const definition
const updateAllSettings = async (req, res) => {
  try {
    await setSettingsBulk(req.body || {});
    res.json({ success: true, updated: Object.keys(req.body || {}).length });
  } catch (e) {
    console.error("updateAllSettings:", e.message);
    res.status(500).json({ message: "Failed to update settings" });
  }
};

/* --------------------------- LAB PROFILE v2 --------------------------- */
// 🟢 FIX: Changed to const definition
const getLabProfile = async (_req, res) => {
  try {
    const keys = [
      "lab_name",
      "lab_address",
      "lab_phone",
      "lab_email",
      "lab_logo_light",
      "lab_logo_dark",
    ];
    const map = await getSettingsMap(keys);
    res.json({
      lab_name: map.lab_name || "",
      lab_address: map.lab_address || "",
      lab_phone: map.lab_phone || "",
      lab_email: map.lab_email || "",
      logo_light: map.lab_logo_light || "",
      logo_dark: map.lab_logo_dark || "",
    });
  } catch (e) {
    console.error("getLabProfile:", e.message);
    res.status(500).json({ message: "Failed to fetch lab profile" });
  }
};

// 🟢 FIX: Changed to const definition
const updateLabProfile = async (req, res) => {
  try {
    const { lab_name, lab_address, lab_phone, lab_email } = req.body || {};
    await setSettingsBulk({
      lab_name: lab_name ?? "",
      lab_address: lab_address ?? "",
      lab_phone: lab_phone ?? "",
      lab_email: lab_email ?? "",
    });
    res.json({ success: true, message: "Lab profile updated" });
  } catch (e) {
    console.error("updateLabProfile:", e.message);
    res.status(500).json({ message: "Failed to update lab profile" });
  }
};

/* --------------------------- LOGO UPLOADS --------------------------- */
// 🟢 FIX: Changed to const definition
const uploadLabLogoLight = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No logo file uploaded" });

    const rel = path.posix.join("/uploads", "logos", path.basename(req.file.path));
    await setSetting("lab_logo_light", rel);

    res.json({ logo_light: rel });
  } catch (e) {
    console.error("uploadLabLogoLight:", e.message);
    res.status(500).json({ message: "Failed to upload light logo" });
  }
};

// 🟢 FIX: Changed to const definition
const uploadLabLogoDark = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No logo file uploaded" });

    // 🟢 FIX: Removed stray 'Boolean' text
    const rel = path.posix.join("/uploads", "logos", path.basename(req.file.path));
    await setSetting("lab_logo_dark", rel);

    res.json({ logo_dark: rel });
  } catch (e) {
    console.error("uploadLabLogoDark:", e.message);
    res.status(500).json({ message: "Failed to upload dark logo" });
  }
};

/* --------------------------- EXPORT BLOCK --------------------------- */
// 🟢 FIX: This block will now work correctly
module.exports = {
  getAllSettings,
  updateAllSettings,
  getLabProfile,
  updateLabProfile,
  uploadLabLogoLight,
  uploadLabLogoDark,
};