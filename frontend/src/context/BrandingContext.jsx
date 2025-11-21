import React, { createContext, useEffect, useState } from "react";
import settingsService from "../services/settingsService";

export const BrandingContext = createContext();

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(true);

  const token = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"))?.token || null;
    } catch {
      return null;
    }
  })();

  const applyTheme = (data) => {
    if (!data) return;

    document.documentElement.style.setProperty(
      "--primary-color",
      data.theme_primary_color || "#1E40FF"
    );

    document.body.dataset.theme = data.theme_mode || "light";
  };

  const loadBranding = async () => {
    try {
      const resp = await settingsService.getSettings(token);
      setBranding(resp);
      applyTheme(resp);
    } catch (e) {
      console.warn("Branding load failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, reloadBranding: loadBranding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};
