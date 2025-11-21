// src/pages/admin/panels/UserManagement.jsx
import React, { useState } from "react";
import StaffManagementPage from "../../admin/StaffManagementPage";
import RoleManager from "../../../components/admin/RoleManager";
import SubtabPills from "../../../components/shared/SubtabPills";

export default function UserManagement() {
  const [tab, setTab] = useState("staff");

  return (
    <div>
      <SubtabPills
        tabs={[
          { id: "staff", label: "Staff Accounts" },
          { id: "roles", label: "Roles & Permissions" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {tab === "staff" && <StaffManagementPage />}
        {tab === "roles" && <RoleManager />}
      </div>
    </div>
  );
}
