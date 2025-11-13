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
import StaffManagementPage from "./pages/admin/StaffManagementPage"; 

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

// Assuming a basic structure for User type (replace with your actual type if known)
interface User {
  full_name?: string;
  email?: string;
  profile_image_url?: string;
  role_id?: number;
}

// ============================================================
// MAIN LAYOUT
// ============================================================
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth() as { user: User | null }; // Type casting for better handling
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

            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Dashboard Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
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

            {/* Pathologist */}
            <Route
              path="/pathologist/worklist"
              element={
                <ProtectedRoute>
                  <PathologistWorklistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pathologist/results"
              element={
                <ProtectedRoute>
                  <ResultListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pathologist/results/:id"
              element={
                <ProtectedRoute>
                  <ResultEntryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pathologist/review/:id"
              element={
                <ProtectedRoute>
                  <PathologistReviewPage />
                </ProtectedRoute>
              }
            />

            {/* Phlebotomy */}
            <Route
              path="/phlebotomy/worklist"
              element={
                <ProtectedRoute>
                  <PhlebotomyWorklistPage />
                </ProtectedRoute>
              }
            />

            {/* Inventory */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route 
                path="/admin/staff"
                element={
                    <ProtectedRoute>
                        <RequirePermission module="users" action="view">
                            <StaffManagementPage />
                        </RequirePermission>
                    </ProtectedRoute>
                }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/lab-config"
              element={
                <ProtectedRoute>
                  <LabConfigDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/lab-config/catalog"
              element={
                <ProtectedRoute>
                  <TestCatalogManager />
                </ProtectedRoute>
              }
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AllReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/test-request/:id"
              element={
                <ProtectedRoute>
                  <TestReportPage />
                </ProtectedRoute>
              }
            />

            {/* Profile */}
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
// MAINTENANCE MODE
// ============================================================
const MaintenanceWrapper: React.FC = () => {
  const { settings, loading } = useContext(SettingsContext);
  const location = useLocation();
  const { user } = useAuth() as { user: User | null };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (location.pathname === "/login") return <AppLayout />;
  // Assuming role_id > 2 is non-admin/non-super-admin
  if (settings?.maintenance_mode === "true" && (user?.role_id ?? 0) > 2) return <MaintenancePage />;
  return <AppLayout />;
};

// ============================================================
// APP ENTRY
// ============================================================
const App: React.FC = () => (
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