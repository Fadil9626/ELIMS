import React from "react";
import { useAuth } from "../../context/AuthContext";

// ✅ Real full Admin Dashboard
import AdminDashboardPage from "./AdminDashboardPage";

// ✅ Default dashboard for normal staff
import DashboardPage from "./DashboardPage";

// ✅ Optional focused dashboards (can replace later)
const PathologistDash = () => <div className="p-6">Pathologist Worklist</div>;
const PhlebotomyDash  = () => <div className="p-6">Phlebotomy Collection Queue</div>;
const ReceptionDash   = () => <div className="p-6">Reception - Patient Intake</div>;
const FinanceDash     = () => <div className="p-6">Finance Dashboard</div>;
const InventoryDash   = () => <div className="p-6">Inventory Overview</div>;
const ClinicianDash   = () => <div className="p-6">Clinician Follow-ups</div>;

export default function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;

  // ✅ Extract permission list safely
  const permissions = user.permission_slugs || [];

  // Debug Logs
  console.log("🟢 USER:", user);
  console.log("🔑 PERMISSION SLUGS:", permissions);

  // ✅ Super Admin / Admin detected by permission authority
  if (permissions.some(p => 
    p.startsWith("settings") || 
    p.startsWith("admin") ||
    p.startsWith("billing")
  )) {
    return <AdminDashboardPage />;
  }

  // ✅ Pathologist
  if (permissions.some(p => p.includes("results:verify"))) {
    return <PathologistDash />;
  }

  // ✅ Phlebotomist
  if (permissions.some(p => p.startsWith("phlebotomy"))) {
    return <PhlebotomyDash />;
  }

  // ✅ Receptionist
  if (permissions.some(p => p.startsWith("patients:view")) &&
      !permissions.some(p => p.startsWith("results"))) {
    return <ReceptionDash />;
  }

  // ✅ Finance / Billing
  if (permissions.some(p => p.startsWith("finance") || p.startsWith("billing"))) {
    return <FinanceDash />;
  }

  // ✅ Inventory
  if (permissions.some(p => p.startsWith("inventory"))) {
    return <InventoryDash />;
  }

  // ✅ Clinician
  if (permissions.some(p => p.startsWith("clinician"))) {
    return <ClinicianDash />;
  }

  // ✅ Default fallback dashboard
  return <DashboardPage />;
}
