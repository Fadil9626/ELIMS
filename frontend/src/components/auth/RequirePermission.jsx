import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequirePermission({ module, action, children }) {
  const { user, can } = useAuth();

  // 🚪 Redirect to login if not authenticated
  if (!user) return <Navigate to="/login" replace />;

  // ✅ SuperAdmin bypass
  if (user.permission_slugs?.includes("*:*")) return children;

  const resource = (module || "").trim();
  const act = (action || "").trim();

  const variants = [
    `${resource}:${act}`,
    `${resource.toLowerCase()}:${act.toLowerCase()}`,
    `${resource.charAt(0).toUpperCase() + resource.slice(1)}:${act.charAt(0).toUpperCase() + act.slice(1)}`,
    `${resource.replace("_", "").toLowerCase()}:${act.toLowerCase()}`
  ];

  // ✅ Try can() helper first
  if (can && variants.some(v => can(...v.split(":")))) return children;

  // ✅ Check map & slugs
  const hasPermission =
    (user.permissions_map &&
      variants.some(v => user.permissions_map[v])) ||
    (user.permission_slugs &&
      variants.some(v => user.permission_slugs.includes(v)));

  if (hasPermission) return children;

  // 🚫 Log only once in a safe, ASCII format
  console.warn("Permission denied:", { module, action, variants });

  // 🧱 Do not render the protected page — redirect cleanly
  return <Navigate to="/unauthorized" replace />;
}
