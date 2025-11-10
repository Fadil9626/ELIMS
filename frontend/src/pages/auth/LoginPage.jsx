import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../../assets/logo.png";

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || submitting) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      toast.success("Welcome back!");
      // AuthContext effect will redirect to "/"
    } catch (err) {
      toast.error(err?.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex justify-center items-center h-screen bg-[#0d1117] px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#1e2635,transparent_60%)] opacity-80 animate-pulse"></div>

      <div className="relative z-10 w-full max-w-md bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(37,99,235,0.3)] animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="ELIMS Logo" className="w-20 h-20 drop-shadow-md" />
          <h1 className="text-3xl font-semibold text-white mt-4">ELIMS Portal</h1>
          <p className="text-sm text-gray-400">Electronic Laboratory Access</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-gray-300 text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full px-4 py-3 bg-[#1a1f29] border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 transition mb-4 outline-none"
            placeholder="you@example.com"
            disabled={submitting}
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="block text-gray-300 text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full px-4 py-3 bg-[#1a1f29] border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 transition mb-6 outline-none"
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
            className="w-full py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          © {new Date().getFullYear()} MediTrust Diagnostics — All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
