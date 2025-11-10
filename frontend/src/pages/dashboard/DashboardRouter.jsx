import React from "react";
import { useAuth } from "../../context/AuthContext";

// ✅ Import your REAL admin dashboard UI
import AdminDashboardPage from "../dashboard/AdminDashboardPage";

// Later we will replace these placeholders:
const PathologistDash = () => <div className="p-6">Pathologist Worklist</div>;
const PhlebotomyDash = () => <div className="p-6">Phlebotomy Worklist</div>;
const ReceptionDash = () => <div className="p-6">Reception Dashboard</div>;
const FinanceDash = () => <div className="p-6">Finance Dashboard</div>;
const InventoryDash = () => <div className="p-6">Inventory Dashboard</div>;
const ClinicianDash = () => <div className="p-6">Doctor / Clinician View</div>;

export default function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;

  // Normalize role name
  const role = (user.role_name || "").toLowerCase().trim();

  // ✅ SUPER ADMIN + ADMIN both use Admin Dashboard
  if (role.includes("super")) return <AdminDashboardPage />;
  if (role.includes("admin")) return <AdminDashboardPage />;

  if (role.includes("reception")) return <ReceptionDash />;
  if (role.includes("phleb")) return <PhlebotomyDash />;
  if (role.includes("path")) return <PathologistDash />;
  if (role.includes("finance") || role.includes("account")) return <FinanceDash />;
  if (role.includes("inventory")) return <InventoryDash />;
  if (role.includes("doctor") || role.includes("clinician")) return <ClinicianDash />;
  if (role.includes("scientist") || role.includes("lab tech")) return <PathologistDash />;

  // Final fallback
  return <AdminDashboardPage />;
}
