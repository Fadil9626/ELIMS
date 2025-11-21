import React, { createContext, useContext, useEffect, useState } from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const STORAGE_KEY = "elims_auth_v1";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------
  // Restore login session on refresh
  // -------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed.token) {
        setToken(parsed.token);
        loadUser(parsed.token); // loadUser will call the fixed authService.getMe
        return;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    setLoading(false);
  }, []);

  // -------------------------------------------------------
  // Load "/me" profile using token
  // -------------------------------------------------------
  const loadUser = async (jwt) => {
    try {
      // This now uses the fixed authService.getMe()
      const res = await authService.getMe(); 
      setUser(res.user);
    } catch (err) {
      console.warn("Failed to load /me:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // Login (correct signature)
  // -------------------------------------------------------
  const login = async ({ email, password }) => {
    setLoading(true);

    // 🚀 FIXED: Pass the object { email, password } to authService
    const res = await authService.login({ email, password });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: res.token, user: res.user })
    );

    setToken(res.token);
    setUser(res.user);

    setLoading(false);
  };

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const can = (module, action) => {
    if (!user || !user.permission_slugs) return false;
    if (user.permission_slugs.includes("*:*")) return true;
    return user.permission_slugs.includes(`${module}:${action}`);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        can,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};