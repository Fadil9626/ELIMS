import React, { useState } from "react";
import SubtabPills from "../../../components/shared/SubtabPills";

import TestConfigurationPage from "../../../pages/admin/TestConfigurationPage";
import TestPanelsManager from "../../../components/admin/TestPanelsManager";
import UnitsManager from "../../../components/admin/UnitsManager";

const LabConfigurationPanel = () => {
  const [active, setActive] = useState("tests");

  const tabs = [
    { id: "tests", label: "Test Catalog" },
    { id: "panels", label: "Test Panels" },
    { id: "units", label: "Units" },
  ];

  return (
    <div className="space-y-6">
      <SubtabPills tabs={tabs} active={active} onChange={setActive} />

      {active === "tests" && <TestConfigurationPage />}
      {active === "panels" && <TestPanelsManager />}
      {active === "units" && <UnitsManager />}
    </div>
  );
};

export default LabConfigurationPanel;
