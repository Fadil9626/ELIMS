import React, { useState } from "react";
import SubtabPills from "../../../components/shared/SubtabPills";
import InstrumentsManager from "../../../components/admin/InstrumentsManager";
import IngestEventsPage from "../../../components/admin/IngestEventsPage";
import PlaceholderContent from "../../../components/shared/PlaceholderContent";

const IntegrationsPanel = () => {
  const [active, setActive] = useState("instruments");

  const tabs = [
    { id: "instruments", label: "Instruments" },
    { id: "ingest_events", label: "Ingest Events" },
  ];

  return (
    <div className="space-y-6">
      <SubtabPills tabs={tabs} active={active} onChange={setActive} />

      {/* Render Selected View */}
      {active === "instruments" && <InstrumentsManager />}
      {active === "ingest_events" && <IngestEventsPage />}
    </div>
  );
};

export default IntegrationsPanel;
