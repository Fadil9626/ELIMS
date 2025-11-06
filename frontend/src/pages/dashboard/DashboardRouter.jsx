import React from "react";
import { useAuth } from "../../context/AuthContext";

// lightweight dash tiles
const SuperAdminDashboard = () => <div className="p-6">Super Admin overview (all stats)</div>;
const AdminDashboard      = () => <div className="p-6">Admin KPIs & actions</div>;
const PathologistDash     = () => <div className="p-6">Pathologist worklist, cases, verifications</div>;
const PhlebotomyDash      = () => <div className="p-6">Phlebotomy queue, collections, prints</div>;
const ReceptionDash       = () => <div className="p-6">Reception today’s registrations & invoices</div>;
const FinanceDash         = () => <div className="p-6">Finance: AR, invoices, receipts</div>;
const InventoryDash       = () => <div className="p-6">Inventory: stock alerts & POs</div>;
const ClinicianDash       = () => <div className="p-6">Clinician: patient results & follow-ups</div>;

export default function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;

  // pick by role first, then by department
  switch (user.role_name) {
    case "SuperAdministrator":
    case "Super Admin":
      return <SuperAdminDashboard />;
    case "Administrator":
    case "Admin":
      return <AdminDashboard />;
    case "Pathologist":
      return <PathologistDash />;
    case "Phlebotomist":
      return <PhlebotomyDash />;
    case "Receptionist":
      return <ReceptionDash />;
    case "Accountant":
    case "Finance":
      return <FinanceDash />;
    case "Inventory":
      return <InventoryDash />;
    case "Clinician":
      return <ClinicianDash />;
    default:
      // fallbacks by department if you prefer
      if (/hemo|chem|micro/i.test(user.department || "")) return <PathologistDash />;
      return <AdminDashboard />;
  }
}
