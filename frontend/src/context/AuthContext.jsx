// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const AuthContext = createContext(null);
const STORAGE_KEY = "elims_auth_v1";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Restore session on refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.token && parsed?.user) {
        setToken(parsed.token);
        setUser(parsed.user);
      }
    } catch (e) {
      console.error("Error restoring auth:", e);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // 🔌 Create Socket.IO connection when user/token is available
  useEffect(() => {
    if (!token) return;

    const newSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () =>
      console.log("🔌 Socket connected:", newSocket.id)
    );

    newSocket.on("disconnect", () =>
      console.log("❌ Socket disconnected")
    );

    return () => newSocket.disconnect();
  }, [token]);

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

      const normalizedUser = {
        id: data.user?.id,
        full_name: data.user?.full_name,
        email: data.user?.email,
        role_name: data.user?.role_name || null,
        role_slug: data.user?.role_slug || null,
        roles: data.user?.roles || [],
        permission_slugs: data.user?.permission_slugs || [],
      };

      setUser(normalizedUser);
      setToken(data.token);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token: data.token, user: normalizedUser })
      );

      return normalizedUser;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Permission helper
  const can = (module, action) => {
    if (!user) return false;

    const roleName = (user.role_name || "").toLowerCase();
    const roleSlug = (user.role_slug || "").toLowerCase();

    if (roleName === "super admin" || roleSlug === "super_admin") return true;
    if (user.permission_slugs?.includes("*:*")) return true;

    const base = module?.toLowerCase().trim();
    if (!base) return false;
    const slugs = user.permission_slugs || [];

    if (action) {
      const full = `${base}:${String(action).toLowerCase().trim()}`;
      if (slugs.includes(full)) return true;
    }
    return slugs.includes(base);
  };

  const authedFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    });

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authLoading,
        login,
        logout,
        can,
        authedFetch,
        socket, // ⬅️ Export socket
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
