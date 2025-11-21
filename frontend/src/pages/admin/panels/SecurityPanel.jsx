import React, { useState } from "react";
import SubtabPills from "../../../components/shared/SubtabPills";

import SecuritySettingsForm from "../../../components/admin/SecuritySettingsForm";
import AuditLogPage from "../../../components/admin/AuditLogPage";

const SecurityPanel = ({ settings, updateSettings }) => {
  const [active, setActive] = useState("password");

  const tabs = [
    { id: "password", label: "Password Policy" },
    { id: "audit", label: "Audit Logs" },
  ];

  return (
    <div className="space-y-6">
      <SubtabPills tabs={tabs} active={active} onChange={setActive} />

      {active === "password" && (
        <SecuritySettingsForm settings={settings} onUpdate={updateSettings} />
      )}

      {active === "audit" && <AuditLogPage />}
    </div>
  );
};

export default SecurityPanel;
