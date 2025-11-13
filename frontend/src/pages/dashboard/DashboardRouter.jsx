import React from "react";
import { useAuth } from "../../context/AuthContext";

// ✅ Real dashboards
import AdminDashboardPage from "./AdminDashboardPage";
import ReceptionDashboardPage from "./ReceptionDashboardPage";

// ✅ New unified dashboard (Lab Tech + Pathologist)
import PathologyDashboardS3 from "../pathologist/PathologyDashboardS3";

import PhlebotomyWorklistPage from "../phlebotomy/PhlebotomyWorklistPage";
import InventoryPage from "../inventory/InventoryPage";

const Placeholder = ({ label }) => (
  <div className="p-6 text-gray-600 text-lg">{label}</div>
);

export default function DashboardRouter() {
  const { user, can } = useAuth(); 
  if (!user) return null; // Wait for user to be loaded

  // Check for permissions using the correct CAPITALIZED resource names
  const isSuperAdmin = can("*:*");
  const isAdmin = can("Admin", "View");
  const isReception = can("Patients", "Create");
  const isLabUser = can("Results", "Enter") || can("Pathologist", "Verify");
  const isPhlebotomist = can("Phlebotomy", "View");
  const isInventory = can("Inventory", "View");
  const isDoctor = can("Reports", "View");
  const isFinance = can("Billing", "Create");

  // ✅ **FIX: The 'isLabUser' check is now BEFORE 'isReception'**
  
  if (isSuperAdmin || isAdmin) {
    return <AdminDashboardPage />;
  }

  // If a user can enter/verify results, send them to the lab dashboard
  if (isLabUser) {
    return <PathologyDashboardS3 />;
  }

  // If a user can create patients (and is not a lab user), send them to reception
  if (isReception) {
    return <ReceptionDashboardPage />;
  }
  
  // Other roles
  if (isPhlebotomist) {
    return <PhlebotomyWorklistPage />;
  }
  if (isInventory) {
    return <InventoryPage />;
  }
  if (isFinance) {
    return <Placeholder label="Finance Dashboard" />; 
  }
  if (isDoctor) {
    return <Placeholder label="Clinician Dashboard" />;
  }

  // Fallback for any other roles (like "Viewer")
  return <Placeholder label={`Welcome, ${user.full_name}`} />;
}