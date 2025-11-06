import React from "react";
import { NavLink } from "react-router-dom";
import {
  Building2,
  Droplet,
  Ruler,
  FlaskConical,
  Layers,
  Activity,
} from "lucide-react";

/**
 * 🧭 Lab Configuration Navigation Bar
 * ------------------------------------------------------------
 * Appears on top of all lab configuration pages:
 * Departments, Sample Types, Units, Test Catalog, Panels, Analytes
 */
const LabConfigNav: React.FC = () => {
  const baseClass =
    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition";
  const activeClass = "bg-blue-100 text-blue-700";
  const inactiveClass = "text-gray-700 hover:bg-gray-50";

  return (
    <nav className="flex flex-wrap gap-2 mb-6 border-b pb-3 bg-white/60 backdrop-blur-sm">
      <NavLink
        to="/admin/lab-config/departments"
        className={({ isActive }) =>
          `${baseClass} ${isActive ? activeClass : inactiveClass}`
        }
      >
        <Building2 size={16} /> Departments
      </NavLink>

      <NavLink
        to="/admin/lab-config/sample-types"
        className={({ isActive }) =>
          `${baseClass} ${isActive ? activeClass : inactiveClass}`
        }
      >
        <Droplet size={16} /> Sample Types
      </NavLink>

      <NavLink
        to="/admin/lab-config/units"
        className={({ isActive }) =>
          `${baseClass} ${isActive ? activeClass : inactiveClass}`
        }
      >
        <Ruler size={16} /> Units
      </NavLink>

      <NavLink
        to="/admin/lab-config/tests"
        className={({ isActive }) =>
          `${baseClass} ${isActive ? activeClass : inactiveClass}`
        }
      >
        <FlaskConical size={16} /> Test Catalog
      </NavLink>

      <NavLink
        to="/admin/lab-config/panels"
        className={({ isActive }) =>
          `${baseClass} ${isActive ? activeClass : inactiveClass}`
        }
      >
        <Layers size={16} /> Test Panels
      </NavLink>

      {/* ✅ NEW TAB */}
      <NavLink
        to="/admin/lab-config/analytes"
        className={({ isActive }) =>
          `${baseClass} ${isActive ? activeClass : inactiveClass}`
        }
      >
        <Activity size={16} /> Analytes
      </NavLink>
    </nav>
  );
};

export default LabConfigNav;
