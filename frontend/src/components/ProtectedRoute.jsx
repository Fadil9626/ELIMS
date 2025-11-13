import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * 🔒 ProtectedRoute
 * - Ensures user is authenticated.
 * - Optionally enforces RBAC permissions if `resource` and `action` props are provided.
 *
 * Usage:
 * <ProtectedRoute resource="Patients" action="Create">
 *   <RegisterPatientPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ children, resource, action }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  // 🕓 1️⃣ Still show a loader during session check
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Checking session...
      </div>
    );
  }

  // 🚪 2️⃣ Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 🚫 3️⃣ Enforce RBAC check if resource/action provided
  if (resource && action && !can(resource, action)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center bg-gray-50">
        <div className="bg-white shadow-lg rounded-xl p-8 max-w-md border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            403 – Access Denied
          </h2>
          <p className="text-gray-500 mb-4">
            You don’t have permission to access this page.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // ✅ 4️⃣ Authorized → render the content
  return children;
}
