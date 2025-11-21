// ============================================================================
// SETTINGS CONTEXT (FINAL VERSION)
// Central storage for all system settings
// Supports: lab profile, branding, legal text, misc system settings
// ============================================================================

import React, { createContext, useCallback, useEffect, useState } from "react";
import settingsService from "../services/settingsService";
import { useAuth } from "./AuthContext";

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const { token, loading: authLoading } = useAuth();

  // --------------------------------------------------------------------------
  // LOAD ALL SETTINGS
  // --------------------------------------------------------------------------
  const load = useCallback(async () => {
    if (authLoading) return;

    // Not logged in → blank
    if (!token) {
      setSettings({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch everything from backend
      const sys = await settingsService.getSettings();             // key/value system settings
      const profile = await settingsService.getLabProfile().catch(() => ({})); // lab profile fallback

      // Merge both
      setSettings({ ...sys, ...profile });
    } catch (err) {
      console.error("⚠️ Settings load failed:", err.message);
    } finally {
      setLoading(false);
    }
  }, [token, authLoading]);

  useEffect(() => {
    load();
  }, [load]);

  // --------------------------------------------------------------------------
  // CONTEXT ACTIONS
  // --------------------------------------------------------------------------

  // Generic settings updater (used by ReportCustomizer.jsx)
  const updateSettings = async (kv) => {
    await settingsService.updateSettingsValues(kv);
    await load();
  };

  // Update text-only settings (alias to updateSettings)
  const updateTextSettings = async (kv) => {
    await settingsService.updateSettingsValues(kv);
    await load();
  };

  // Save Lab profile (Name, Address, Phone, Email)
  const saveLabProfile = async (payload) => {
    await settingsService.updateLabProfile(payload);
    await load();
  };

  // Reload everything on demand
  const reloadSettings = load;

  // --------------------------------------------------------------------------
  // PROVIDER
  // --------------------------------------------------------------------------
  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,

        // FUNCTIONS AVAILABLE TO ALL COMPONENTS
        updateSettings,        // <–– REQUIRED BY ReportCustomizer.jsx
        updateTextSettings,    
        saveLabProfile,
        reloadSettings,
      }}
    >
      {!loading && !authLoading && children}
    </SettingsContext.Provider>
  );
};
