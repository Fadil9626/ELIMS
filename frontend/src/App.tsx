// frontend/src/App.tsx
import React, { useContext } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./assets/styles/index.css";

// ======================== PAGES ========================
import AdminDashboardPage from "./pages/dashboard/AdminDashboardPage";

import LoginPage from "./pages/auth/LoginPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import MaintenancePage from "./pages/MaintenancePage";

import DashboardRouter from "./pages/dashboard/DashboardRouter";
import MessagesPage from "./pages/messages/MessagesPage";

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
import LabConfigDashboard from "./pages/admin/labconfig/LabConfigDashboard";
import TestCatalogManager from "./pages/admin/TestCatalogManager";
import StaffManagementPage from "./pages/admin/StaffManagementPage";

import AllReportsPage from "./pages/reports/AllReportsPage";
import TestReportPage from "./pages/reports/ReportPage";
import InvoicePage from "./pages/invoices/InvoicePage";

import ProfilePage from "./pages/profile/ProfilePage";
import ReceptionDashboardPage from "./pages/reception/ReceptionDashboardPage";

// ======================== LAYOUT ========================
import Sidebar from "./components/layout/Sidebar";
import DashboardHeader from "./components/layout/DashboardHeader";
import ProtectedRoute from "./components/ProtectedRoute";
import RequirePermission from "./components/auth/RequirePermission";

// ======================== CONTEXT ========================
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider, SettingsContext } from "./context/SettingsContext";
import { BrandingProvider, BrandingContext } from "./context/BrandingContext";
import { SocketProvider } from "./context/SocketContext";
import { Toaster } from "react-hot-toast";

// ======================== TYPES ========================
interface User {
  full_name?: string;
  email?: string;
  profile_image_url?: string;
  role_id?: number;
}

// =========================================================
// 🌟 APP LAYOUT
// =========================================================
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth() as { user: User | null };
  const { branding } = useContext(BrandingContext);

  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true);
  const isLoginPage = location.pathname === "/login";

  const sidebarWidthClass =
    branding?.sidebar?.style === "compact" ? "md:ml-20" : "md:ml-64";

  const marginClass = isSidebarExpanded ? sidebarWidthClass : "md:ml-20";

  return (
    <div className={!isLoginPage ? "flex min-h-screen" : "min-h-screen"}>
      {!isLoginPage && (
        <Sidebar
          isExpanded={isSidebarExpanded}
          sidebarStyle={branding?.sidebar?.style ?? "default"}
          toggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        />
      )}

      <main
        className={
          !isLoginPage
            ? `flex-grow bg-gray-50 transition-all duration-300 ${marginClass}`
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
            {/* PUBLIC */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ROOT DASHBOARD ROUTER (after login / base url) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />

            {/* SIDEBAR DASHBOARD ENTRY */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />

            {/* RECEPTION DASHBOARD */}
            <Route
              path="/reception/dashboard"
              element={
                <ProtectedRoute>
                  <RequirePermission module="patients" action="view">
                    <ReceptionDashboardPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <RequirePermission module="admin" action="view">
                    <AdminDashboardPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* MESSAGES */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />

            {/* PATIENTS */}
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
                  <PatientDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients/:id/edit"
              element={
                <ProtectedRoute>
                  <EditPatientPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients/:id/request-test"
              element={
                <ProtectedRoute>
                  <RequestTestPage />
                </ProtectedRoute>
              }
            />

            {/* TEST REQUESTS */}
            <Route
              path="/tests/management"
              element={
                <ProtectedRoute>
                  <TestManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tests/requests/:id"
              element={
                <ProtectedRoute>
                  <TestRequestDetailPage />
                </ProtectedRoute>
              }
            />

            {/* PATHOLOGY */}
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

            {/* PHLEBOTOMY */}
            <Route
              path="/phlebotomy/worklist"
              element={
                <ProtectedRoute>
                  <PhlebotomyWorklistPage />
                </ProtectedRoute>
              }
            />

            {/* INVENTORY */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />

            {/* STAFF & ADMIN CONFIG */}
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute>
                  <StaffManagementPage />
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

            {/* REPORTS */}
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

            {/* INVOICES */}
            <Route
              path="/invoices/test-request/:id"
              element={
                <ProtectedRoute>
                  <InvoicePage />
                </ProtectedRoute>
              }
            />

            {/* PROFILE */}
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

// =========================================================
// 🛠 MAINTENANCE GATE
// =========================================================
const MaintenanceWrapper = () => {
  const { settings, loading } = useContext(SettingsContext);
  const { user } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  if (location.pathname === "/login") return <AppLayout />;

  if (settings?.maintenance_mode === "true" && (user?.role_id ?? 0) > 2)
    return <MaintenancePage />;

  return <AppLayout />;
};

// =========================================================
// 🚀 APP ROOT ENTRY
// =========================================================
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SettingsProvider>
        <BrandingProvider>
          <SocketProvider>
            <MaintenanceWrapper />
            <Toaster position="top-right" />
          </SocketProvider>
        </BrandingProvider>
      </SettingsProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
