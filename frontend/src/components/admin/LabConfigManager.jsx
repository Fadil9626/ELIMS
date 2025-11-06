import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Layers,
  Building2,
  Ruler,
} from "lucide-react";

// Import existing modules
import TestPanelsManager from "./TestPanelsManager";
import UnitsManager from "./UnitsManager";
import DepartmentManager from "./DepartmentManager";

// Import your existing 3-column test configuration layout
import TestConfigurationPage from "./TestConfigurationPage"; // You’ll extract your current logic into this file next

const tabs = [
  { key: "tests", label: "Tests", icon: FlaskConical },
  { key: "panels", label: "Panels", icon: Layers },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "units", label: "Units", icon: Ruler },
];

const LabConfigManager = () => {
  const [activeTab, setActiveTab] = useState("tests");

  const renderContent = () => {
    switch (activeTab) {
      case "tests":
        return <TestConfigurationPage />;
      case "panels":
        return <TestPanelsManager />;
      case "departments":
        return <DepartmentManager />;
      case "units":
        return <UnitsManager />;
      default:
        return <TestConfigurationPage />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-semibold text-gray-800 flex items-center gap-2">
          <FlaskConical className="text-blue-600" />
          Laboratory Configuration
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-md border">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LabConfigManager;
