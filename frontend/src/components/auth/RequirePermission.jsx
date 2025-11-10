import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequirePermission({ module, action, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // ✅ SuperAdmin bypass (backend marks it)
  if (user.permission_slugs?.includes("*:*")) return children;

  const key = `${module}:${action}`.toLowerCase();

  // ✅ Check permission map
  if (user.permissions_map && user.permissions_map[key]) {
    return children;
  }

  // ✅ Check permission slugs array fallback
  if (user.permission_slugs && user.permission_slugs.includes(key)) {
    return children;
  }

  // ❌ No permission → redirect
  return <Navigate to="/unauthorized" replace />;
}
