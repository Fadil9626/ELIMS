import React, { useState } from "react";
import {
  Layers,
  Ruler,
  FlaskConical,
  Building2,
  Activity,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";

// =============================================================
// 📦 INDIVIDUAL CONFIGURATION TABS
// =============================================================
// ✅ Test Panels
import PanelsTab from "./tabs/PanelsTab";

// ✅ Enhanced Analytes Tab (with range configuration)
import AnalytesTab from "./tabs/AnalytesTab";

// ✅ Supporting Configurations
import UnitsTab from "./tabs/UnitsTab";
import SampleTypesTab from "./tabs/SampleTypesTab";
import DepartmentsTab from "./tabs/DepartmentsTab";

// =============================================================
// ⚙️ LAB CONFIG DASHBOARD
// =============================================================
const LabConfigDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("panels");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1 text-gray-800">
          🧪 Laboratory Configuration
        </h1>
        <p className="text-gray-500 text-sm">
          Manage your test panels, analytes, units, sample types, and departments — all in one place.
        </p>
      </div>

      {/* Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="panels"
      >
        {/* ============================== */}
        {/* TAB NAVIGATION */}
        {/* ============================== */}
        <TabsList className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg shadow-sm">
          <TabsTrigger
            value="panels"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "panels"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-white"
            }`}
          >
            <Layers size={16} /> Test Panels
          </TabsTrigger>

          <TabsTrigger
            value="analytes"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "analytes"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-white"
            }`}
          >
            <Activity size={16} /> Analytes
          </TabsTrigger>

          <TabsTrigger
            value="units"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "units"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-white"
            }`}
          >
            <Ruler size={16} /> Units
          </TabsTrigger>

          <TabsTrigger
            value="samples"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "samples"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-white"
            }`}
          >
            <FlaskConical size={16} /> Sample Types
          </TabsTrigger>

          <TabsTrigger
            value="departments"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
              activeTab === "departments"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-white"
            }`}
          >
            <Building2 size={16} /> Departments
          </TabsTrigger>
        </TabsList>

        {/* ============================== */}
        {/* TAB CONTENT */}
        {/* ============================== */}
        <div className="mt-6">
          {/* Panels Tab */}
          <TabsContent value="panels">
            <PanelsTab />
          </TabsContent>

          {/* ✅ Enhanced Analytes Tab */}
          <TabsContent value="analytes">
            <AnalytesTab />
          </TabsContent>

          {/* Units Tab */}
          <TabsContent value="units">
            <UnitsTab />
          </TabsContent>

          {/* Sample Types Tab */}
          <TabsContent value="samples">
            <SampleTypesTab />
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <DepartmentsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default LabConfigDashboard;
