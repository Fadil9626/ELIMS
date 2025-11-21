// frontend/src/pages/dashboard/DashboardRouter.jsx
import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Placeholder = ({ label }) => (
  <div className="p-6 text-gray-600 text-lg">{label}</div>
);

export default function DashboardRouter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Normalize slugs
  const slugs = (user.permission_slugs || [])
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  // -------- ROLE CHECKS --------
  const isSuperAdmin = slugs.includes("*:*");

  const isAdmin =
    isSuperAdmin ||
    slugs.includes("admin:*") ||
    slugs.includes("settings:manage");

  const isPhleb = slugs.includes("phlebotomy:view");

  const canRegisterPatients =
    slugs.includes("patients:view") ||
    slugs.includes("patients:create") ||
    slugs.includes("patients:register");

  const canProcessBilling =
    slugs.includes("billing:create") || slugs.includes("billing:view");

  const isLab =
    slugs.includes("results:enter") ||
    slugs.includes("results:verify") ||
    slugs.includes("pathologist:verify");

  const isInventory = slugs.includes("inventory:view");

  const isDoctor = slugs.includes("reports:view");

  // Finance: billing-only users
  const isFinance =
    canProcessBilling &&
    !canRegisterPatients &&
    !isPhleb &&
    !isAdmin &&
    !isLab;

  // 🔐 RECEPTION: must NOT be phleb, lab or admin
  const isReception =
    (canRegisterPatients || canProcessBilling) &&
    !isPhleb &&
    !isLab &&
    !isAdmin;

  useEffect(() => {
    // 🧠 Priority: Admin → Phleb → Lab → Reception → Inventory → Finance → Doctor
    if (isSuperAdmin || isAdmin) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    if (isPhleb) {
      navigate("/phlebotomy/worklist", { replace: true });
      return;
    }

    if (isLab) {
      navigate("/pathologist/worklist", { replace: true });
      return;
    }

    if (isReception) {
      navigate("/reception/dashboard", { replace: true });
      return;
    }

    if (isInventory) {
      navigate("/inventory", { replace: true });
      return;
    }

    if (isFinance) {
      navigate("/finance", { replace: true });
      return;
    }

    if (isDoctor) {
      navigate("/reports", { replace: true });
      return;
    }
  }, [
    isSuperAdmin,
    isAdmin,
    isPhleb,
    isLab,
    isReception,
    isInventory,
    isFinance,
    isDoctor,
    navigate,
  ]);

  // Small placeholder while redirect happens / if no role matched
  return <Placeholder label="Redirecting to your dashboard..." />;
}
