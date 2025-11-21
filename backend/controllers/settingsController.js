const path = require("path");
const pool = require("../config/database");

/* ---------------------------------------------------------
   DYNAMIC SETTINGS TABLE HELPERS
---------------------------------------------------------*/

async function ensureSettingsTable() {
  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS system_settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `.replace(/\s+/g, " ").trim()
  );
}

async function setSetting(key, value) {
  await ensureSettingsTable();
  await pool.query(
    `
      INSERT INTO system_settings(key, value)
      VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `.replace(/\s+/g, " ").trim(),
    [key, String(value ?? "")]
  );
}

async function setSettingsBulk(obj = {}) {
  await ensureSettingsTable();
  const keys = Object.keys(obj || {});
  if (!keys.length) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const k of keys) {
      await client.query(
        `
          INSERT INTO system_settings(key, value)
          VALUES ($1, $2)
          ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
        `.replace(/\s+/g, " ").trim(),
        [k, String(obj[k] ?? "")]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("setSettingsBulk:", e.message);
    throw e;
  } finally {
    client.release();
  }
}

async function getSettings(keys = []) {
  await ensureSettingsTable();
  if (!keys.length) return {};
  const { rows } = await pool.query(
    `SELECT key, value FROM system_settings WHERE key = ANY($1::text[])`,
    [keys]
  );
  return rows.reduce((acc, r) => {
    acc[r.key] = r.value;
    return acc;
  }, {});
}

async function getAllSettingsFromDB() {
  await ensureSettingsTable();
  const { rows } = await pool.query(`SELECT key, value FROM system_settings`);
  return rows.reduce((acc, r) => {
    acc[r.key] = r.value;
    return acc;
  }, {});
}

/* ---------------------------------------------------------
   GENERIC FILE UPLOAD → SETTINGS HELPER
   (used for all logos & signatures)
---------------------------------------------------------*/

const uploadFileAndSetSetting = async (req, res, settingKey, handlerName) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: `No file uploaded for ${settingKey}` });
    }

    // Assumes Multer (uploadLogo) saves to something like "uploads/logos"
    const relPath = path.posix.join(
      "/uploads",
      "logos",
      path.basename(req.file.path)
    );

    await setSetting(settingKey, relPath);

    return res.json({
      success: true,
      key: settingKey,
      value: relPath,
      message: `${settingKey} updated successfully`,
    });
  } catch (e) {
    console.error(`${handlerName}:`, e.message);
    return res.status(500).json({
      message: `Error updating ${settingKey}`,
      error: e.message,
    });
  }
};

/* ---------------------------------------------------------
   SYSTEM SETTINGS (GENERIC KEY/VALUE)
   GET /api/settings
   PUT /api/settings
---------------------------------------------------------*/

const getAllSettings = async (_req, res) => {
  try {
    const map = await getAllSettingsFromDB();
    return res.json(map);
  } catch (e) {
    console.error("getAllSettings:", e.message);
    return res.status(500).json({ message: "Failed fetching settings" });
  }
};

const updateAllSettings = async (req, res) => {
  try {
    const payload = req.body || {};
    await setSettingsBulk(payload);
    return res.json({
      success: true,
      updated: Object.keys(payload).length,
    });
  } catch (e) {
    console.error("updateAllSettings:", e.message);
    return res.status(500).json({ message: "Failed updating settings" });
  }
};

/* ---------------------------------------------------------
   LAB PROFILE (LEGACY – USED FOR REPORTS / INVOICES)
   GET  /api/settings/lab-profile
   PUT  /api/settings/lab-profile
   POST /api/settings/lab-profile/logo/light
   POST /api/settings/lab-profile/logo/dark

   Keys:
     lab_name
     lab_address
     lab_phone
     lab_email
     lab_logo_light
     lab_logo_dark
---------------------------------------------------------*/

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

    const map = await getSettings(keys);

    return res.json({
      lab_name: map.lab_name || "",
      lab_address: map.lab_address || "",
      lab_phone: map.lab_phone || "",
      lab_email: map.lab_email || "",
      logo_light: map.lab_logo_light || "",
      logo_dark: map.lab_logo_dark || "",
    });
  } catch (e) {
    console.error("getLabProfile:", e.message);
    return res.status(500).json({ message: "Failed to fetch lab profile" });
  }
};

const updateLabProfile = async (req, res) => {
  try {
    const { lab_name, lab_address, lab_phone, lab_email } = req.body || {};

    await setSettingsBulk({
      lab_name: lab_name ?? "",
      lab_address: lab_address ?? "",
      lab_phone: lab_phone ?? "",
      lab_email: lab_email ?? "",
    });

    return res.json({ success: true, message: "Lab profile updated" });
  } catch (e) {
    console.error("updateLabProfile:", e.message);
    return res.status(500).json({ message: "Failed to update lab profile" });
  }
};

const uploadLabLogoLight = async (req, res) =>
  uploadFileAndSetSetting(req, res, "lab_logo_light", "uploadLabLogoLight");

const uploadLabLogoDark = async (req, res) =>
  uploadFileAndSetSetting(req, res, "lab_logo_dark", "uploadLabLogoDark");

/* ---------------------------------------------------------
   🎨 BRANDING GROUPS
   (LOGIN, SIDEBAR, LEGAL/REPORT)
---------------------------------------------------------*/

/* ---------------------- LOGIN BRANDING ----------------------
   GET  /api/settings/branding/login
   PUT  /api/settings/branding/login
   POST /api/settings/branding/login/logo

   Keys:
     system_login_logo_url
     system_login_title
     system_login_subtitle
     system_login_footer
------------------------------------------------------------ */

const getLoginBranding = async (_req, res) => {
  try {
    const keys = [
      "system_login_logo_url",
      "system_login_title",
      "system_login_subtitle",
      "system_login_footer",
    ];
    const map = await getSettings(keys);

    return res.json({
      logo_url: map.system_login_logo_url || "",
      title: map.system_login_title || "",
      subtitle: map.system_login_subtitle || "",
      footer: map.system_login_footer || "",
    });
  } catch (e) {
    console.error("getLoginBranding:", e.message);
    return res.status(500).json({ message: "Failed to fetch login branding" });
  }
};

const updateLoginBranding = async (req, res) => {
  try {
    const { title, subtitle, footer } = req.body || {};

    await setSettingsBulk({
      system_login_title: title ?? "",
      system_login_subtitle: subtitle ?? "",
      system_login_footer: footer ?? "",
    });

    return res.json({ success: true, message: "Login branding updated" });
  } catch (e) {
    console.error("updateLoginBranding:", e.message);
    return res.status(500).json({ message: "Failed to update login branding" });
  }
};

const uploadLoginLogo = async (req, res) =>
  uploadFileAndSetSetting(
    req,
    res,
    "system_login_logo_url",
    "uploadLoginLogo"
  );

/* ---------------------- SIDEBAR BRANDING ----------------------
   GET  /api/settings/branding/sidebar
   PUT  /api/settings/branding/sidebar
   POST /api/settings/branding/sidebar/logo

   Keys:
     system_sidebar_logo_url
     system_sidebar_title
------------------------------------------------------------ */

const getSidebarBranding = async (_req, res) => {
  try {
    const keys = ["system_sidebar_logo_url", "system_sidebar_title"];
    const map = await getSettings(keys);

    return res.json({
      logo_url: map.system_sidebar_logo_url || "",
      title: map.system_sidebar_title || "",
    });
  } catch (e) {
    console.error("getSidebarBranding:", e.message);
    return res
      .status(500)
      .json({ message: "Failed to fetch sidebar branding" });
  }
};

const updateSidebarBranding = async (req, res) => {
  try {
    const { title } = req.body || {};

    await setSettingsBulk({
      system_sidebar_title: title ?? "",
    });

    return res.json({ success: true, message: "Sidebar branding updated" });
  } catch (e) {
    console.error("updateSidebarBranding:", e.message);
    return res
      .status(500)
      .json({ message: "Failed to update sidebar branding" });
  }
};

const uploadSidebarLogo = async (req, res) =>
  uploadFileAndSetSetting(
    req,
    res,
    "system_sidebar_logo_url",
    "uploadSidebarLogo"
  );

/* ---------------------- LEGAL / REPORT BRANDING ----------------------
   GET  /api/settings/branding/legal
   PUT  /api/settings/branding/legal
   POST /api/settings/branding/legal/logo
   POST /api/settings/branding/legal/signature

   Keys:
     system_report_logo_url
     system_report_signature_url
     legal_footer_text
     invoice_footer_text
--------------------------------------------------------------------- */

const getLegalBranding = async (_req, res) => {
  try {
    const keys = [
      "system_report_logo_url",
      "system_report_signature_url",
      "legal_footer_text",
      "invoice_footer_text",
    ];
    const map = await getSettings(keys);

    return res.json({
      report_logo_url: map.system_report_logo_url || "",
      signature_url: map.system_report_signature_url || "",
      legal_footer_text: map.legal_footer_text || "",
      invoice_footer_text: map.invoice_footer_text || "",
    });
  } catch (e) {
    console.error("getLegalBranding:", e.message);
    return res.status(500).json({ message: "Failed to fetch legal branding" });
  }
};

const updateLegalBranding = async (req, res) => {
  try {
    const { legal_footer_text, invoice_footer_text } = req.body || {};

    await setSettingsBulk({
      legal_footer_text: legal_footer_text ?? "",
      invoice_footer_text: invoice_footer_text ?? "",
    });

    return res.json({ success: true, message: "Legal branding updated" });
  } catch (e) {
    console.error("updateLegalBranding:", e.message);
    return res
      .status(500)
      .json({ message: "Failed to update legal branding" });
  }
};

const uploadLegalLogo = async (req, res) =>
  uploadFileAndSetSetting(
    req,
    res,
    "system_report_logo_url",
    "uploadLegalLogo"
  );

const uploadLegalSignature = async (req, res) =>
  uploadFileAndSetSetting(
    req,
    res,
    "system_report_signature_url",
    "uploadLegalSignature"
  );
  


/* ---------------------------------------------------------
   EXPORT
---------------------------------------------------------*/

module.exports = {
  // Generic system settings
  getAllSettings,
  updateAllSettings,

  // Lab profile (legacy, used for reports/invoices)
  getLabProfile,
  updateLabProfile,
  uploadLabLogoLight,
  uploadLabLogoDark,

  // Login branding
  getLoginBranding,
  updateLoginBranding,
  uploadLoginLogo,

  // Sidebar branding
  getSidebarBranding,
  updateSidebarBranding,
  uploadSidebarLogo,

  // Legal / report branding
  getLegalBranding,
  updateLegalBranding,
  uploadLegalLogo,
  uploadLegalSignature,
};