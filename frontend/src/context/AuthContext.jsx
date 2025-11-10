import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "elims_auth_v1";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Load auth from localStorage on first load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setAuthLoading(false);
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed?.token && parsed?.user) {
        setToken(parsed.token);
        setUser(parsed.user);
      }
    } catch (err) {
      console.error("Error restoring auth:", err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // LOGIN
  // Expects backend response: { token, user, permission_slugs[] }
  // ---------------------------------------------------------------------------
  const login = async ({ email, password }) => {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Invalid credentials");

      const permission_slugs =
        data.permission_slugs ||
        data.user?.permission_slugs ||
        [];

      const normalizedUser = {
        ...data.user,
        permission_slugs,
      };

      setUser(normalizedUser);
      setToken(data.token);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: data.token,
          user: normalizedUser,
        })
      );

      return normalizedUser;
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // ---------------------------------------------------------------------------
  // RBAC: can(module, action) → checks permission_slugs
  // Example slug: "patients:view", "settings:edit"
  // ---------------------------------------------------------------------------
  const can = (module, action) => {
    if (!user) return false;

    const roleName = (user.role_name || user.role || "").toLowerCase();
    const roleSlug = (user.role_slug || "").toLowerCase();

    // Super Admin bypass
    if (roleName === "super admin" || roleSlug === "super_admin") {
      return true;
    }

    const slugs = user.permission_slugs || [];
    const base = module?.toLowerCase().trim();
    if (!base || !Array.isArray(slugs)) return false;

    if (action) {
      const full = `${base}:${String(action).toLowerCase().trim()}`;
      if (slugs.includes(full)) return true;
    }

    if (slugs.includes(base)) return true;

    return false;
  };

  // ---------------------------------------------------------------------------
  // ✅ Authenticating Fetch Helper
  // Automatically attaches Authorization: Bearer <token>
  // ---------------------------------------------------------------------------
  const authedFetch = async (url, options = {}) => {
    const finalOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    };

    return fetch(url, finalOptions);
  };

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------
  const value = {
    user,
    token,
    authLoading,
    login,
    logout,
    can,
    authedFetch, // ✅ now available everywhere
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
