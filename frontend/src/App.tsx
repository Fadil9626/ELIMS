import React, { useState, useContext } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./assets/styles/index.css";

// ============================================================
// 📄 PAGE IMPORTS
// ============================================================

// --- Authentication ---
import LoginPage from "./pages/auth/LoginPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import MaintenancePage from "./pages/MaintenancePage";

// --- Dashboards ---
import DashboardPage from "./pages/dashboard/DashboardPage";
import AdminDashboardPage from "./pages/dashboard/AdminDashboardPage";

// --- Patients ---
import PatientDirectoryPage from "./pages/patients/PatientDirectoryPage";
import PatientRegistrationPage from "./pages/patients/PatientRegistrationPage";
import PatientDetailPage from "./pages/patients/PatientDetailPage";
import EditPatientPage from "./pages/patients/EditPatientPage";

// --- Tests & Requests ---
import TestManagementPage from "./pages/tests/TestManagementPage";
import TestRequestDetailPage from "./pages/tests/TestRequestDetailPage";
import RequestTestPage from "./pages/tests/RequestTestPage";

// --- Pathologist ---
import PathologistWorklistPage from "./pages/pathologist/PathologistWorklistPage";
import PathologistReviewPage from "./pages/pathologist/PathologistReviewPage";
import ResultListPage from "./pages/pathologist/ResultListPage";
import ResultEntryPage from "./pages/pathologist/ResultEntryPage";

// --- Phlebotomy ---
import PhlebotomyWorklistPage from "./pages/phlebotomy/PhlebotomyWorklistPage";

// --- Inventory ---
import InventoryPage from "./pages/inventory/InventoryPage";
import EditInventoryItemPage from "./pages/inventory/EditInventoryItemPage";

// --- Admin ---
import StaffManagementPage from "./pages/admin/StaffManagementPage";
import TestConfigurationPage from "./pages/admin/TestConfigurationPage";
import TestRangeConfigurator from "./pages/lab/TestRangeConfigurator";
import SettingsPage from "./pages/admin/SettingsPage";
import ImportUploadPage from "./pages/admin/ImportUploadPage";
import LabConfigDashboard from "./pages/admin/LabConfigDashboard";

// 🔹 NEW: Test Catalog Manager
import TestCatalogManager from "./pages/admin/TestCatalogManager";

// --- Reports / Invoices ---
import InvoicePage from "./pages/invoices/InvoicePage";
import ReportPage from "./pages/reports/ReportPage";
import AllReportsPage from "./pages/reports/AllReportsPage";

// --- Profile ---
import ProfilePage from "./pages/profile/ProfilePage";

// ============================================================
// 🧭 LAYOUT / CONTEXT
// ============================================================
import ProtectedRoute from "./components/ProtectedRoute";
import RequirePermission from "./components/auth/RequirePermission";
import Sidebar from "./components/layout/Sidebar";
import DashboardHeader from "./components/layout/DashboardHeader";
import { SettingsProvider, SettingsContext } from "./context/SettingsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import useCan from "./hooks/useCan";

// --- Toast Notifications ---
import { Toaster } from "react-hot-toast";

// ============================================================
// 🌐 APP LAYOUT
// ============================================================
const AppLayout = () => {
  const location = useLocation();
  const auth = useAuth();
  const user = auth?.user ?? null;
  const { can } = useCan();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const toggleSidebar = () => setIsSidebarExpanded((prev) => !prev);

  // ✅ This logic is now controlled by MaintenanceWrapper
  const isLoginPage = location.pathname === "/login";
  const mainContentMargin = isSidebarExpanded ? "md:ml-64" : "md:ml-20";

  const userName = user?.name || user?.full_name || "User";
  const userImageUrl = user?.profile_image_url || null;

  const DashboardComponent = () =>
    can("settings", "view") ? <AdminDashboardPage /> : <DashboardPage />;

  return (
    <div className={!isLoginPage ? "flex min-h-screen" : "min-h-screen"}>
      {!isLoginPage && (
        <Sidebar isExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />
      )}

      <main
        className={
          !isLoginPage
            ? `flex-grow bg-gray-50 transition-all duration-300 ease-in-out ${mainContentMargin}`
            : "flex-grow"
        }
      >
        {!isLoginPage && (
          <DashboardHeader
            userName={userName}
            userImageUrl={userImageUrl}
            onNotificationsClick={() => {}}
          />
        )}

        <div className={!isLoginPage ? "p-6" : ""}>
          <Routes>
            {/* Authentication */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardComponent />
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
                  <RequirePermission module="pathologist" action="view">
                    <PathologistWorklistPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pathologist/review/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="pathologist" action="view">
                    <PathologistReviewPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* 🧪 Result Entry Worklist */}
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

            {/* 🩸 Phlebotomy Worklist */}
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
            <Route
              path="/inventory/:id/edit"
              element={
                <ProtectedRoute>
                  <RequirePermission module="inventory" action="update">
                    <EditInventoryItemPage />
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
              path="/admin/staff"
              element={
                <ProtectedRoute>
                  <RequirePermission module="staff" action="view">
                    <StaffManagementPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* ✅ Lab Config Dashboard */}
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

            {/* 🔹 NEW: Test Catalog Manager */}
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

            {/* ✅ Test Range Configurator */}
            <Route
              path="/admin/lab-config/ranges/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="settings" action="edit">
                    <TestRangeConfigurator />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/import"
              element={
                <ProtectedRoute>
                  <RequirePermission module="tests" action="manage">
                    <ImportUploadPage />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />

            {/* Reports */}
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

            {/* === 👇 THIS IS THE NEW ROUTE YOU NEEDED === */}
            <Route
              path="/reports/test-request/:id"
              element={
                <ProtectedRoute>
                  <RequirePermission module="reports" action="view">
                    <ReportPage />
                  </RequirePermission>
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
// 🛠 MAINTENANCE WRAPPER
// ============================================================
const MaintenanceWrapper = () => {
  const { settings, loading } = useContext(SettingsContext);
  const location = useLocation();
  const { user } = useAuth();

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Loading Application...
      </div>
    );

  // ✅ FIX: Check if we are on a public auth page
  const isAuthPage = location.pathname === "/login";

  // ✅ FIX: If on an auth page, render *only* the AppLayout (which contains the router)
  // This prevents the sidebar/header from flashing
  if (isAuthPage) {
    return <AppLayout />;
  }

  // ✅ FIX: If in maintenance, show the MaintenancePage
  if (settings?.maintenance_mode === "true" && user?.role_id > 2)
    return <MaintenancePage />;

  // ✅ FIX: Otherwise, render the full AppLayout (with sidebar/header)
  return <AppLayout />;
};

// ============================================================
// 🚀 APP ENTRY
// ============================================================
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SocketProvider>
            <MaintenanceWrapper />
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          </SocketProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;