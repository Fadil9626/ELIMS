import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const RequirePerm = ({ moduleName, action, children }) => {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!can(moduleName, action)) return <Navigate to="/403" replace />;
  return children;
};

// For conditional rendering inside pages
export const ShowIfCan = ({ moduleName, action, children }) => {
  const { can } = useAuth();
  return can(moduleName, action) ? children : null;
};
