import React from "react";
import { NavLink } from "react-router-dom";
import { Layers, FlaskConical, Ruler, Building2 } from "lucide-react";

const LabConfigNav: React.FC = () => {
  const base =
    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150";

  const active =
    "bg-blue-50 text-blue-600 border-b-2 border-blue-600 shadow-sm";
  const inactive =
    "text-gray-600 hover:bg-gray-50 hover:text-blue-500";

  return (
    <nav className="flex gap-2 border-b border-gray-200 pb-2 mb-6 overflow-x-auto">
      <NavLink
        to="/admin/lab-config/panels"
        className={({ isActive }) =>
          `${base} ${isActive ? active : inactive}`
        }
      >
        <Layers size={16} />
        Panels
      </NavLink>

      <NavLink
        to="/admin/lab-config/analytes"
        className={({ isActive }) =>
          `${base} ${isActive ? active : inactive}`
        }
      >
        <FlaskConical size={16} />
        Analytes
      </NavLink>

      <NavLink
        to="/admin/lab-config/ranges"
        className={({ isActive }) =>
          `${base} ${isActive ? active : inactive}`
        }
      >
        <Ruler size={16} />
        Normal Ranges
      </NavLink>

      <NavLink
        to="/admin/departments"
        className={({ isActive }) =>
          `${base} ${isActive ? active : inactive}`
        }
      >
        <Building2 size={16} />
        Departments
      </NavLink>
    </nav>
  );
};

export default LabConfigNav;
