import React, { useState } from "react";
import {
  Layers,
  Ruler,
  FlaskConical,
  Building2,
  Activity,
  BedDouble,
  Beaker
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../components/ui/tabs";

// =============================================================
// 📦 INDIVIDUAL CONFIGURATION TABS
// =============================================================
import TestsTab from "../tabs/TestsTab"; // ✅ Corrected Path
import PanelsTab from "../tabs/PanelsTab";
import AnalytesTab from "../tabs/AnalytesTab";
import UnitsTab from "../tabs/UnitsTab";
import SampleTypesTab from "../tabs/SampleTypesTab";
import DepartmentsTab from "../tabs/DepartmentsTab";
import WardsTab from "../tabs/WardsTab";

// =============================================================
// ⚙️ LAB CONFIG DASHBOARD
// =============================================================
const LabConfigDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("tests");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
          🧪 Laboratory Configuration
        </h1>
        <p className="text-gray-500 text-sm">
          Manage your individual tests, panels, analytes, units, sample types, departments, and wards.
        </p>
      </div>

      {/* Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="tests"
        className="space-y-6"
      >
        {/* ============================== */}
        {/* TAB NAVIGATION */}
        {/* ============================== */}
        <TabsList className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-fit">
          
          <TabsTrigger
            value="tests"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "tests"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Beaker size={18} /> Tests
          </TabsTrigger>

          <TabsTrigger
            value="panels"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "panels"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Layers size={18} /> Panels
          </TabsTrigger>

          <TabsTrigger
            value="analytes"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "analytes"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Activity size={18} /> Analytes
          </TabsTrigger>

          <TabsTrigger
            value="units"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "units"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Ruler size={18} /> Units
          </TabsTrigger>

          <TabsTrigger
            value="samples"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "samples"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <FlaskConical size={18} /> Sample Types
          </TabsTrigger>

          <TabsTrigger
            value="departments"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "departments"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Building2 size={18} /> Departments
          </TabsTrigger>

          <TabsTrigger
            value="wards"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "wards"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <BedDouble size={18} /> Wards
          </TabsTrigger>
        </TabsList>

        {/* ============================== */}
        {/* TAB CONTENT */}
        {/* ============================== */}
        <div className="mt-6">
          <TabsContent value="tests" className="outline-none">
            <TestsTab />
          </TabsContent>

          <TabsContent value="panels" className="outline-none">
            <PanelsTab />
          </TabsContent>

          <TabsContent value="analytes" className="outline-none">
            <AnalytesTab />
          </TabsContent>

          <TabsContent value="units" className="outline-none">
            <UnitsTab />
          </TabsContent>

          <TabsContent value="samples" className="outline-none">
            <SampleTypesTab />
          </TabsContent>

          <TabsContent value="departments" className="outline-none">
            <DepartmentsTab />
          </TabsContent>
          
          <TabsContent value="wards" className="outline-none">
            <WardsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default LabConfigDashboard;