// src/components/layout/Sidebar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  HiMenu,
  HiOutlineViewGrid,
  HiOutlineUsers,
  HiOutlineBeaker,
  HiOutlineArchive,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineBriefcase,
  HiOutlineDocumentReport,
  HiOutlineClipboardCheck,
  HiOutlineCollection,
  HiOutlineDatabase,
  HiChevronDown,
  HiChevronRight,
  HiX,
} from "react-icons/hi";
import { RiLogoutBoxLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";

const SidebarLink = ({ to, icon: Icon, children, isExpanded, onClick }) => (
  <li onClick={onClick}>
    <NavLink
      to={to}
      className={({ isActive }) =>
        `
        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 
        ${isExpanded ? "justify-start" : "justify-center"} 
        ${
          isActive
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
            : "text-gray-300 hover:bg-gray-700 hover:text-white"
        }
      `
      }
      title={!isExpanded ? String(children) : ""}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {isExpanded && <span className="text-sm font-medium">{children}</span>}
    </NavLink>
  </li>
);

const Sidebar = ({ isExpanded, toggleSidebar }) => {
  const { can, hasGlobalAll, logout } = useAuth();
  const FORCE_ALL = localStorage.getItem("FORCE_ALL_NAV") === "1";

  const [labOpen, setLabOpen] = useState(false);
  const [pathologyOpen, setPathologyOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [patientOpen, setPatientOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const canView = (module, action) =>
    FORCE_ALL || hasGlobalAll || module === "dashboard" || can(module, action);

  const sidebarWidth = isExpanded ? "w-64" : "w-20";

  const handleLogout = () => {
    localStorage.removeItem("FORCE_ALL_NAV");
    logout(true, true);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-blue-600 text-white p-2 rounded-md shadow-md hover:bg-blue-700 transition"
      >
        <HiMenu className="w-6 h-6" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 flex flex-col bg-gray-900 text-gray-100
          shadow-2xl transition-all duration-300 ease-in-out z-40
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${sidebarWidth}
        `}
      >
        {/* Header */}
        <div
          className={`flex items-center border-b border-gray-700 px-3 py-4 ${
            isExpanded ? "justify-between" : "justify-center"
          } bg-gradient-to-r from-blue-700 to-blue-800`}
        >
          {isExpanded && (
            <h1 className="text-xl font-bold tracking-wide text-white">
              ELIMS
            </h1>
          )}
          <button
            onClick={mobileOpen ? () => setMobileOpen(false) : toggleSidebar}
            className="p-2 rounded hover:bg-blue-600 transition"
          >
            {mobileOpen ? (
              <HiX className="w-5 h-5 text-white" />
            ) : (
              <HiMenu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-grow overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <ul className="space-y-1">
            {canView("dashboard", "view") && (
              <SidebarLink
                to="/"
                icon={HiOutlineViewGrid}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Dashboard
              </SidebarLink>
            )}

            {/* 👤 Patients + Nested Test Management */}
            {canView("patients", "view") && (
              <li>
                <button
                  onClick={() => setPatientOpen((p) => !p)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition
                    ${isExpanded ? "text-gray-300 hover:bg-gray-700" : "justify-center text-gray-300 hover:text-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <HiOutlineUsers className="w-5 h-5" />
                    {isExpanded && <span>Patients</span>}
                  </div>
                  {isExpanded &&
                    (patientOpen ? (
                      <HiChevronDown className="w-4 h-4" />
                    ) : (
                      <HiChevronRight className="w-4 h-4" />
                    ))}
                </button>

                {patientOpen && isExpanded && (
                  <ul className="ml-8 mt-1 space-y-1">
                    <SidebarLink
                      to="/patients"
                      icon={HiOutlineUsers}
                      isExpanded
                      onClick={handleNavClick}
                    >
                      Patient List
                    </SidebarLink>
                    {canView("tests", "view") && (
                      <SidebarLink
                        to="/tests/management"
                        icon={HiOutlineBeaker}
                        isExpanded
                        onClick={handleNavClick}
                      >
                        Test Management
                      </SidebarLink>
                    )}
                  </ul>
                )}
              </li>
            )}

            {canView("phlebotomy", "view") && (
              <SidebarLink
                to="/phlebotomy/worklist"
                icon={HiOutlineClipboardCheck}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Phlebotomy Worklist
              </SidebarLink>
            )}

            {/* 🧫 Pathology */}
            {(canView("pathologist", "view") || canView("results", "enter")) && (
              <li>
                <button
                  onClick={() => setPathologyOpen((p) => !p)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition 
                    ${isExpanded ? "text-gray-300 hover:bg-gray-700" : "justify-center text-gray-300 hover:text-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <HiOutlineClipboardList className="w-5 h-5" />
                    {isExpanded && <span>Pathology</span>}
                  </div>
                  {isExpanded &&
                    (pathologyOpen ? (
                      <HiChevronDown className="w-4 h-4" />
                    ) : (
                      <HiChevronRight className="w-4 h-4" />
                    ))}
                </button>

                {pathologyOpen && isExpanded && (
                  <ul className="ml-8 mt-1 space-y-1">
                    <SidebarLink
                      to="/pathologist/worklist"
                      icon={HiOutlineClipboardList}
                      isExpanded
                      onClick={handleNavClick}
                    >
                      Worklist
                    </SidebarLink>
                    <SidebarLink
                      to="/pathologist/results"
                      icon={HiOutlineClipboardCheck}
                      isExpanded
                      onClick={handleNavClick}
                    >
                      Result Entry
                    </SidebarLink>
                  </ul>
                )}
              </li>
            )}

            {/* 📊 Reports */}
            {canView("reports", "view") && (
              <SidebarLink
                to="/reports"
                icon={HiOutlineDocumentReport}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Reports
              </SidebarLink>
            )}

            {/* 📦 Inventory */}
            {canView("inventory", "view") && (
              <SidebarLink
                to="/inventory"
                icon={HiOutlineArchive}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Inventory
              </SidebarLink>
            )}

            {/* 🧑‍💼 Staff */}
            {canView("staff", "view") && (
              <SidebarLink
                to="/admin/staff"
                icon={HiOutlineBriefcase}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Staff Management
              </SidebarLink>
            )}

            {/* ⚙️ System Settings */}
            {canView("settings", "view") && (
              <li>
                <button
                  onClick={() => setSystemOpen((p) => !p)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-gray-300 
                    hover:bg-gray-700 transition ${isExpanded ? "" : "justify-center"}`}
                >
                  <div className="flex items-center gap-3">
                    <HiOutlineCog className="w-5 h-5" />
                    {isExpanded && <span>System Settings</span>}
                  </div>
                  {isExpanded &&
                    (systemOpen ? (
                      <HiChevronDown className="w-4 h-4" />
                    ) : (
                      <HiChevronRight className="w-4 h-4" />
                    ))}
                </button>

                {systemOpen && isExpanded && (
                  <ul className="ml-8 mt-1 space-y-1">
                    <SidebarLink
                      to="/admin/settings"
                      icon={HiOutlineCog}
                      isExpanded
                      onClick={handleNavClick}
                    >
                      General Settings
                    </SidebarLink>

                    <li>
                      <button
                        onClick={() => setLabOpen((p) => !p)}
                        className="flex items-center justify-between w-full text-gray-300 px-3 py-2 rounded hover:bg-gray-700 hover:text-white transition"
                      >
                        <span className="flex items-center gap-3">
                          <HiOutlineCollection className="w-5 h-5" />
                          Lab Configuration
                        </span>
                        {labOpen ? (
                          <HiChevronDown className="w-4 h-4" />
                        ) : (
                          <HiChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {labOpen && (
                        <ul className="ml-8 mt-1 space-y-1">
                          <SidebarLink
                            to="/admin/lab-config/catalog"
                            icon={HiOutlineDatabase}
                            isExpanded
                            onClick={handleNavClick}
                          >
                            Test Catalog
                          </SidebarLink>
                          <SidebarLink
                            to="/admin/lab-config"
                            icon={HiOutlineCog}
                            isExpanded
                            onClick={handleNavClick}
                          >
                            Config Dashboard
                          </SidebarLink>
                        </ul>
                      )}
                    </li>
                  </ul>
                )}
              </li>
            )}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg text-white bg-red-600 
              hover:bg-red-700 transition duration-200 shadow-sm ${
                isExpanded ? "justify-start" : "justify-center"
              }`}
          >
            <RiLogoutBoxLine className="w-5 h-5" />
            {isExpanded && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
