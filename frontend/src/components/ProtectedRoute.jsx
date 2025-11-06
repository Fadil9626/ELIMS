// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ✅ FIX: Import useAuth

// ❌ FIX: Removed all the buggy, localStorage-reading helper functions
// (readUserInfo, deriveMe, etc.)

/**
 * Usage:
 * <ProtectedRoute>
 * <SomePage/>
 * </ProtectedRoute>
 *
 * Behavior:
 * - If auth is loading -> show loading spinner
 * - If no user (not logged in) -> redirect to /login
 * - Else -> allow
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  
  // ✅ FIX: Read from the AuthContext, not localStorage
  const { user, loading, hasGlobalAll } = useAuth();

  // 1. While context is loading user, wait.
  // This is the key to fixing the race condition.
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Loading User...
      </div>
    );
  }

  // 2. Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. SuperAdmin/Admin bypass (from context)
  if (hasGlobalAll) {
    return <>{children}</>;
  }

  // 4. If specific roles are required, check them
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (allowedRoles.includes(user.role_id)) {
      return <>{children}</>;
    }
    // 4b. Role check failed
    return <Navigate to="/unauthorized" replace />;
  }

  // 5. Authenticated & no role restriction
  return <>{children}</>;
}