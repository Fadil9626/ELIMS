import React, { useContext } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./assets/styles/index.css";

// ============================================================
// PAGE IMPORTS
// ============================================================
import LoginPage from "./pages/auth/LoginPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import MaintenancePage from "./pages/MaintenancePage";

import DashboardRouter from "./pages/dashboard/DashboardRouter";

import PatientDirectoryPage from "./pages/patients/PatientDirectoryPage";
import PatientRegistrationPage from "./pages/patients/PatientRegistrationPage";
import PatientDetailPage from "./pages/patients/PatientDetailPage";
import EditPatientPage from "./pages/patients/EditPatientPage";

import TestManagementPage from "./pages/tests/TestManagementPage";
import RequestTestPage from "./pages/tests/RequestTestPage";
import TestRequestDetailPage from "./pages/tests/TestRequestDetailPage";

import PathologistWorklistPage from "./pages/pathologist/PathologistWorklistPage";
import ResultListPage from "./pages/pathologist/ResultListPage";
import ResultEntryPage from "./pages/pathologist/ResultEntryPage";
import PathologistReviewPage from "./pages/pathologist/PathologistReviewPage";

import PhlebotomyWorklistPage from "./pages/phlebotomy/PhlebotomyWorklistPage";

import InventoryPage from "./pages/inventory/InventoryPage";

import SettingsPage from "./pages/admin/SettingsPage";
import LabConfigDashboard from "./pages/admin/LabConfigDashboard";
import TestCatalogManager from "./pages/admin/TestCatalogManager";

import AllReportsPage from "./pages/reports/AllReportsPage";
import TestReportPage from "./pages/reports/ReportPage";

import ProfilePage from "./pages/profile/ProfilePage";

// ============================================================
// LAYOUT / CONTEXT
// ============================================================
import Sidebar from "./components/layout/Sidebar";
import DashboardHeader from "./components/layout/DashboardHeader";
import ProtectedRoute from "./components/ProtectedRoute";
import RequirePermission from "./components/auth/RequirePermission";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider, SettingsContext } from "./context/SettingsContext";
import { SocketProvider } from "./context/SocketContext";
import { Toaster } from "react-hot-toast";

// ============================================================
// APP LAYOUT
// ============================================================
const AppLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true);

  const isLoginPage = location.pathname === "/login";
  const mainContentMargin = isSidebarExpanded ? "md:ml-64" : "md:ml-20";

  return (
    <div className={!isLoginPage ? "flex min-h-screen" : "min-h-screen"}>
      {!isLoginPage && (
        <Sidebar
          isExpanded={isSidebarExpanded}
          toggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        />
      )}

      <main
        className={
          !isLoginPage
            ? `flex-grow bg-gray-50 transition-all duration-300 ${mainContentMargin}`
            : "flex-grow"
        }
      >
        {!isLoginPage && (
          <DashboardHeader
            userName={user?.full_name || user?.email}
            userImageUrl={user?.profile_image_url}
          />
        )}

        <div className={!isLoginPage ? "p-6" : ""}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ✅ Dashboard Router */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />

            {/* Patients */}
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <RequirePermission module="patients" action="view">
                    <PatientDirectoryPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients/register"
              element={
                <ProtectedRoute>
                  <RequirePermission module="patients" action="create">
                    <PatientRegistrationPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="patients" action="view">
                    <PatientDetailPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients/:id/edit"
              element={
                <ProtectedRoute>
                  <RequirePermission module="patients" action="update">
                    <EditPatientPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients/:id/request-test"
              element={
                <ProtectedRoute>
                  <RequirePermission module="tests" action="create">
                    <RequestTestPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* Tests */}
            <Route
              path="/tests/management"
              element={
                <ProtectedRoute>
                  <RequirePermission module="tests" action="view">
                    <TestManagementPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tests/requests/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="tests" action="view">
                    <TestRequestDetailPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* Pathologist Workflow */}
            <Route
              path="/pathologist/worklist"
              element={
                <ProtectedRoute>
                  <RequirePermission module="pathologist" action="view">
                    <PathologistWorklistPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pathologist/results"
              element={
                <ProtectedRoute>
                  <RequirePermission module="results" action="enter">
                    <ResultListPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pathologist/results/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="results" action="enter">
                    <ResultEntryPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pathologist/review/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="results" action="verify">
                    <PathologistReviewPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* Phlebotomy */}
            <Route
              path="/phlebotomy/worklist"
              element={
                <ProtectedRoute>
                  <RequirePermission module="phlebotomy" action="view">
                    <PhlebotomyWorklistPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* Inventory */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <RequirePermission module="inventory" action="view">
                    <InventoryPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* Admin Settings */}
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <RequirePermission module="settings" action="view">
                    <SettingsPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/lab-config"
              element={
                <ProtectedRoute>
                  <RequirePermission module="settings" action="view">
                    <LabConfigDashboard />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/lab-config/catalog"
              element={
                <ProtectedRoute>
                  <RequirePermission module="settings" action="edit">
                    <TestCatalogManager />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* Reporting */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <RequirePermission module="reports" action="view">
                    <AllReportsPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/test-request/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="reports" action="view">
                    <TestReportPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* User Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// ============================================================
// MAINTENANCE WRAPPER
// ============================================================
const MaintenanceWrapper = () => {
  const { settings, loading } = useContext(SettingsContext);
  const location = useLocation();
  const { user } = useAuth();

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (location.pathname === "/login") return <AppLayout />;
  if (settings?.maintenance_mode === "true" && user?.role_id > 2) return <MaintenancePage />;
  return <AppLayout />;
};

// ============================================================
// APP ENTRY
// ============================================================
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SettingsProvider>
        <SocketProvider>
          <MaintenanceWrapper />
          <Toaster position="top-right" />
        </SocketProvider>
      </SettingsProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
