// src/context/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

const decodeJwt = (token) => {
  try {
    const payloadBase64 = token.split(".")[1];
    const json = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // ---- State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // initial bootstrap only

  // ---- Bootstrap from localStorage → validate → hydrate /api/me
  useEffect(() => {
    const boot = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem("userInfo"));
        const t = stored?.token || stored?.user?.token || null;
        if (!t) {
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }

        const payload = decodeJwt(t);
        const now = Math.floor(Date.now() / 1000);
        if (!payload || (payload.exp && payload.exp < now)) {
          localStorage.removeItem("userInfo");
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }

        setToken(t);
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const me = await res.json();
        setUser({ ...me, token: t });
      } catch {
        localStorage.removeItem("userInfo");
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  // ---- Helper: is token valid (returns token or null)
  const getToken = useCallback(() => {
    if (!token) return null;
    const payload = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    if (!payload || (payload.exp && payload.exp < now)) {
      toast.error("⚠️ Session expired. Please log in again.");
      localStorage.removeItem("userInfo");
      setUser(null);
      setToken(null);
      navigate("/login");
      return null;
    }
    return token;
  }, [token, navigate]);

  // ---- authedFetch with auto sign-out on 401/419
  const authedFetch = useCallback(
    async (url, options = {}) => {
      const t = getToken();
      const headers = {
        ...(options.headers || {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      };
      const res = await fetch(url, { ...options, headers });

      if (res.status === 401 || res.status === 419) {
        localStorage.removeItem("userInfo");
        setUser(null);
        setToken(null);
        toast.error("🔒 You’ve been signed out. Please log in again.");
        navigate("/login");
        throw new Error("Unauthorized");
      }
      return res;
    },
    [getToken, navigate]
  );

  // ---- Login
  const login = useCallback(
    async (userData) => {
      // ✅ FIX: Set context to "loading" *during* the login process
      setLoading(true); 
      
      const t = userData?.token || userData?.user?.token;
      if (!t) {
        toast.error("Login failed: missing token.");
        setLoading(false); // Make sure to stop loading on failure
        return;
      }
      localStorage.setItem("userInfo", JSON.stringify({ token: t }));
      setToken(t);

      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const me = await res.json();
        setUser({ ...me, token: t });
        
        setTimeout(() => toast.success("✅ Logged in successfully!"), 400);
        return { ...me, token: t }; // Return user data
        
      } catch (err) {
        localStorage.removeItem("userInfo");
        setUser(null);
        setToken(null);
        toast.error(`Login failed: ${err.message || 'Please try again.'}`);
        throw err; // Re-throw for LoginPage to catch
      } finally {
        // ✅ FIX: Set context loading to false *after* login is complete
        setLoading(false);
      }
    },
    [] // 'navigate' is removed, 'setLoading' is stable
  );

  // ---- Logout (optionally confirmed)
  const logout = useCallback(
    (showMessage = true, confirm = true) => {
      const doLogout = () => {
        localStorage.removeItem("userInfo");
        setUser(null);
        setToken(null);
        navigate("/login");
        if (showMessage) toast.success("🔒 Logged out successfully.");
      };

      if (!confirm) return doLogout();

      toast(
        (t) => (
          <div className="text-sm">
            <p>Are you sure you want to log out?</p>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  doLogout();
                }}
                className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
              >
                Yes, Logout
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="bg-gray-200 px-3 py-1 rounded text-xs hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ),
        { 
          duration: 8000,
          position: "bottom-center"
        }
      );
    },
    [navigate]
  );
  
  // ---- Permission logic (unchanged) ---
  const hasGlobalAll = useMemo(() => {
    if (!user) return false;
    if (user.role_id === 1 || user.role_id === 2) return true; // SA/Admin
    return !!user.effective_permissions?.__all;
  }, [user]);

  const can = useCallback(
    (moduleName, actionName) => {
      if (!user) return false;
      if (hasGlobalAll) return true;
      const m = user.permissions?.[moduleName];
      return !!(m && m[actionName]);
    },
    [user, hasGlobalAll]
  );

  // ---- Cross-tab sync (unchanged) ---
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== "userInfo") return;
      try {
        const next = e.newValue ? JSON.parse(e.newValue) : null;
        const t = next?.token || null;
        if (!t) {
          setUser(null);
          setToken(null);
          return;
        }
        setToken(t);
        (async () => {
          try {
            const res = await fetch("/api/me", {
              headers: { Authorization: `Bearer ${t}` },
            });
            if (!res.ok) throw new Error();
            const me = await res.json();
            setUser({ ...me, token: t });
          } catch {
            setUser(null);
            setToken(null);
          }
        })();
      } catch {
        setUser(null);
        setToken(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ---- Inactivity auto-logout (unchanged) ---
  useEffect(() => {
    let inactivityTimer;
    let warningTimer;
    let countdownTimer;
    let toastId = null;
    let countdownValue = 300; // 5 minutes

    const INACTIVITY_LIMIT = 45 * 60 * 1000; // 45 min
    const WARNING_TIME = 40 * 60 * 1000; // warn at 40 min

    const clearAll = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownTimer);
      if (toastId) toast.dismiss(toastId);
      toastId = null;
    };

    const resetTimers = () => {
      clearAll();
      warningTimer = setTimeout(() => {
        countdownValue = 300;
        toastId = toast.custom(
          (t) => {
            const minutes = Math.floor(countdownValue / 60);
            const seconds = countdownValue % 60;
            return (
              <div
                className="text-sm bg-white border p-3 rounded shadow cursor-pointer"
                onClick={() => {
                  clearAll();
                  toast.dismiss(t.id);
                  toast.success("✅ Session extended.");
                  resetTimers();
                }}
              >
                <p>⚠️ You’ve been inactive for a while.</p>
                <p>
                  Logging out in{" "}
                  <span className="font-bold text-red-600">
                    {minutes}:{String(seconds).padStart(2, "0")}
                  </span>
                </p>
                <p className="underline text-blue-500 mt-1">
                  Click here to stay logged in
                </p>
              </div>
            );
          },
          { duration: 600000, position: "bottom-center" }
        );

        countdownTimer = setInterval(() => {
          countdownValue -= 1;
          if (countdownValue <= 0) {
            clearAll();
            toast.error("🔒 You have been logged out due to inactivity.");
            logout(false, false);
          }
        }, 1000);
      }, WARNING_TIME);

      inactivityTimer = setTimeout(() => {
        clearAll();
        toast.error("🔒 You have been logged out due to inactivity.");
        logout(false, false);
      }, INACTIVITY_LIMIT);
    };

    if (token) {
      ["mousemove", "keydown", "click", "scroll"].forEach((evt) =>
        window.addEventListener(evt, resetTimers, { passive: true })
      );
      resetTimers();
    }

    return () => {
      ["mousemove", "keydown", "click", "scroll"].forEach((evt) =>
        window.removeEventListener(evt, resetTimers)
      );
      clearAll();
    };
  }, [token, logout]);
  
  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      can,
      hasGlobalAll, 
      getToken,
      authedFetch,
    }),
    [user, token, loading, login, logout, can, hasGlobalAll, getToken, authedFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);