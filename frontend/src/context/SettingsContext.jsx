// frontend/src/context/SettingsContext.jsx
import React, { createContext, useCallback, useEffect, useState } from "react";
import settingsService from "../services/settingsService";

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);   // lab profile + legacy map
  const [loading, setLoading] = useState(true);

  const token = (() => {
    try { return JSON.parse(localStorage.getItem("userInfo"))?.token || null; }
    catch { return null; }
  })();

  const load = useCallback(async () => {
    try {
      if (!token) { setSettings({}); return; }
      // load v2 lab profile
      const profile = await settingsService.getLabProfile(token);
      // also load legacy map for any old screens
      const legacy = await settingsService.getSettings(token).catch(() => ({}));
      setSettings({ ...legacy, ...profile });
    } catch (e) {
      console.error("Settings load failed:", e);
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Save profile (name/address/phone/email/logo_url)
  const saveProfile = async (payload) => {
    if (!token) throw new Error("No token");
    const res = await settingsService.saveLabProfile(payload, token);
    await load();
    return res;
  };

  // Upload logo -> returns {logo_url}, then persist into profile
  const uploadLogo = async (file) => {
    if (!token) throw new Error("No token");
    const { logo_url } = await settingsService.uploadLabLogo(file, token);
    await saveProfile({ logo_url });
    return { logo_url };
  };

  // legacy batch update (optional)
  const updateSettings = async (kv) => {
    if (!token) throw new Error("No token");
    await settingsService.updateSettings(kv, token);
    await load();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, saveProfile, uploadLogo, updateSettings }}>
      {!loading && children}
    </SettingsContext.Provider>
  );
};
