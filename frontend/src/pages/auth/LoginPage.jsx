import React, { useState, useEffect, useContext } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import logoFallback from "../../assets/logo.png";
import { SettingsContext } from "../../context/SettingsContext";

const LoginPage = () => {
  const { login, user } = useAuth();
  const { settings } = useContext(SettingsContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  /* ---------------------------------------------------------
     🔧 Dynamic Branding
  ---------------------------------------------------------*/
  const loginLogo =
    (!logoError && (settings?.system_login_logo_url || settings?.lab_logo_light)) ||
    logoFallback;

  const loginTitle = settings?.system_login_title || settings?.lab_name || "ELIMS Portal";
  const loginSubtitle = settings?.system_login_subtitle || "Secure Laboratory Access";
  const loginFooter =
    settings?.system_login_footer ||
    `© ${new Date().getFullYear()} ${settings?.lab_name || "Your Laboratory"} — All Rights Reserved`;

  const theme = settings?.theme_mode || "dark";

  /* ---------------------------------------------------------
     🔄 Redirect if already logged in
  ---------------------------------------------------------*/
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  /* ---------------------------------------------------------
     🚪 Handle Login
  ---------------------------------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || submitting) return;

    setSubmitting(true);

    try {
      // 🚀 FIXED: Call login with an object, matching AuthContext's signature
      await login({ email: email.trim(), password });
      
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Invalid login credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative flex justify-center items-center h-screen px-4 overflow-hidden 
        ${theme === "light" ? "bg-gray-100" : "bg-[#0d1117]"}`}
    >
      {/* Background Glow */}
      {theme !== "light" && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#1e2635,transparent_60%)] opacity-80 animate-pulse" />
      )}

      <div
        className={`relative z-10 w-full max-w-md backdrop-blur-xl rounded-2xl p-8 shadow-lg border 
          ${
            theme === "light"
              ? "bg-white border-gray-200 shadow-gray-300"
              : "bg-[#111827]/80 border-white/10 shadow-[0_0_50px_-12px_rgba(37,99,235,0.3)]"
          }`}
      >
        <div className="flex flex-col items-center mb-8">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl border flex items-center justify-center overflow-hidden mb-3 bg-gray-800/30">
            <img
              src={loginLogo}
              alt="Brand Logo"
              className="w-full h-full object-contain"
              onError={() => setLogoError(true)}
            />
          </div>

          <h1
            className={`text-3xl font-semibold mt-1 ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}
          >
            {loginTitle}
          </h1>

          <p
            className={`text-sm mt-1 ${
              theme === "light" ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {loginSubtitle}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <label className="block text-gray-400 text-sm mb-1">Email</label>
          <input
            type="email"
            className={`w-full px-4 py-3 rounded-lg mb-4 outline-none border
              ${
                theme === "light"
                  ? "bg-gray-100 border-gray-300 text-gray-900"
                  : "bg-[#1a1f29] border-gray-600 text-gray-100"
              } focus:ring-2 focus:ring-blue-500 transition`}
            placeholder="you@example.com"
            disabled={submitting}
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="block text-gray-400 text-sm mb-1">Password</label>
          <input
            type="password"
            className={`w-full px-4 py-3 rounded-lg mb-6 outline-none border
              ${
                theme === "light"
                  ? "bg-gray-100 border-gray-300 text-gray-900"
                  : "bg-[#1a1f29] border-gray-600 text-gray-100"
              } focus:ring-2 focus:ring-blue-500 transition`}
            placeholder="••••••••"
            disabled={submitting}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 
            text-white transition shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs mt-6 text-gray-500">{loginFooter}</p>
      </div>
    </div>
  );
};

export default LoginPage;