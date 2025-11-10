import React from "react";
import { Link } from "react-router-dom";

/**
 * Hospital-clean tile with soft teal accents (HC-3)
 * - Tooltip animation on hover (group + transition)
 * - Subtle shadow, rounded-2xl, focus-visible ring
 */
const DepartmentTile = ({ to, icon: Icon, title, desc, disabled = false }) => {
  const base =
    "group relative rounded-2xl border bg-white shadow-sm transition hover:shadow-md focus-within:shadow-md";
  const state = disabled
    ? "opacity-50 cursor-not-allowed"
    : "hover:-translate-y-0.5";
  return (
    <div className={`${base} ${state}`}>
      <Link
        to={disabled ? "#" : to}
        className="block p-5 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 rounded-2xl"
        tabIndex={disabled ? -1 : 0}
      >
        <div className="flex items-center gap-4">
          <div className="rounded-xl border bg-teal-50 text-teal-700 p-3">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{title}</div>
            <div className="text-sm text-slate-500">{desc}</div>
          </div>
        </div>

        {/* Tooltip (slides in) */}
        <div className="pointer-events-none absolute right-3 top-3 translate-y-1 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
          <span className="rounded-md bg-slate-900/90 px-2 py-1 text-xs text-white shadow">
            Open {title}
          </span>
        </div>
      </Link>
    </div>
  );
};

export default DepartmentTile;
