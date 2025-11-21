/**
 * SETTINGS SERVICE (FINAL + PATCHED)
 * Auto-handles token + headers because apiFetch already inserts them.
 */

import apiFetch from "../services/apiFetch";

const BASE = "/api/settings";

/* ------------------------------------------------------------
   GENERAL SYSTEM SETTINGS
------------------------------------------------------------ */
export const getSettings = () => apiFetch(`${BASE}`);

export const updateSettingsValues = (values) =>
  apiFetch(`${BASE}`, {
    method: "PUT",
    body: JSON.stringify(values),
  });

/* ------------------------------------------------------------
   LAB PROFILE (logos, address, invoice header)
------------------------------------------------------------ */
export const getLabProfile = async () => {
  const data = await apiFetch(`${BASE}/lab-profile`);

  // 🔥 FIX: Normalize backend keys
  return {
    lab_name: data.lab_name || "",
    lab_address: data.lab_address || "",
    lab_phone: data.lab_phone || "",
    lab_email: data.lab_email || "",
    lab_logo_light: data.logo_light || "", // FIXED MAPPING
    lab_logo_dark: data.logo_dark || "",   // FIXED MAPPING
  };
};

export const updateLabProfile = (payload) =>
  apiFetch(`${BASE}/lab-profile`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const uploadLabLogoLight = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`${BASE}/lab-profile/logo/light`, {
    method: "POST",
    body: fd,
  });
};

export const uploadLabLogoDark = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`${BASE}/lab-profile/logo/dark`, {
    method: "POST",
    body: fd,
  });
};

/* ------------------------------------------------------------
   LOGIN SCREEN BRANDING
------------------------------------------------------------ */
export const getLoginBranding = () => apiFetch(`${BASE}/branding/login`);

export const updateLoginBranding = (data) =>
  apiFetch(`${BASE}/branding/login`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const uploadLoginBrandingLogo = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`${BASE}/branding/login/logo`, {
    method: "POST",
    body: fd,
  });
};

/* ------------------------------------------------------------
   SIDEBAR BRANDING
------------------------------------------------------------ */
export const updateSidebarBranding = (data) =>
  apiFetch(`${BASE}/branding/sidebar`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const uploadSidebarBrandingLogo = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`${BASE}/branding/sidebar/logo`, {
    method: "POST",
    body: fd,
  });
};

/* ------------------------------------------------------------
   LEGAL (Reports + Invoices)
------------------------------------------------------------ */
export const saveLegalBranding = (data) =>
  apiFetch(`${BASE}/branding/legal`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const uploadLegalBrandingLogo = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`${BASE}/branding/legal/logo`, {
    method: "POST",
    body: fd,
  });
};

export const uploadLegalBrandingSignature = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`${BASE}/branding/legal/signature`, {
    method: "POST",
    body: fd,
  });
};

/* ------------------------------------------------------------
   EXPORT ALL
------------------------------------------------------------ */
const settingsService = {
  getSettings,
  updateSettingsValues,

  getLabProfile,
  updateLabProfile,
  uploadLabLogoLight,
  uploadLabLogoDark,

  getLoginBranding,
  updateLoginBranding,
  uploadLoginBrandingLogo,

  updateSidebarBranding,
  uploadSidebarBrandingLogo,

  saveLegalBranding,
  uploadLegalBrandingLogo,
  uploadLegalBrandingSignature,
};

export default settingsService;
