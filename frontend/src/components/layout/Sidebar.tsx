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
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 
        ${isExpanded ? "justify-start" : "justify-center"} 
        ${
          isActive
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
            : "text-gray-300 hover:bg-gray-700 hover:text-white"
        }`
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      {isExpanded && <span className="text-sm font-medium">{children}</span>}
    </NavLink>
  </li>
);

const Sidebar = ({ isExpanded, toggleSidebar }) => {
  const { user, logout, can } = useAuth();

  const [patientOpen, setPatientOpen] = useState(false);
  const [pathologyOpen, setPathologyOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = isExpanded ? "w-64" : "w-20";

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

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 flex flex-col bg-gray-900 text-gray-100 shadow-2xl ${sidebarWidth}
        transition-all duration-300 ease-in-out z-40
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Header */}
        <div
          className={`flex items-center border-b border-gray-700 px-3 py-4 bg-gradient-to-r from-blue-700 to-blue-800 ${
            isExpanded ? "justify-between" : "justify-center"
          }`}
        >
          {isExpanded && <h1 className="text-xl font-bold">ELIMS</h1>}
          <button
            onClick={mobileOpen ? () => setMobileOpen(false) : toggleSidebar}
            className="p-2 rounded hover:bg-blue-600 transition"
          >
            {mobileOpen ? <HiX className="w-5 h-5" /> : <HiMenu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-grow overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <ul className="space-y-1">

            {/* ✅ FIXED: Dashboard now goes to real Admin Dashboard */}
            <SidebarLink
              to="/admin/dashboard"
              icon={HiOutlineViewGrid}
              isExpanded={isExpanded}
              onClick={handleNavClick}
            >
              Dashboard
            </SidebarLink>

            {/* Patients */}
            {can("patients", "view") && (
              <li>
                <button
                  onClick={() => setPatientOpen((p) => !p)}
                  className="flex items-center w-full px-3 py-2.5 rounded-lg hover:bg-gray-700 transition"
                >
                  <HiOutlineUsers className="w-5 h-5 shrink-0" />
                  {isExpanded && <span className="ml-3">Patients</span>}
                  {isExpanded && (patientOpen ? <HiChevronDown /> : <HiChevronRight />)}
                </button>

                {patientOpen && isExpanded && (
                  <ul className="ml-8 mt-1 space-y-1">
                    <SidebarLink to="/patients" icon={HiOutlineUsers} isExpanded onClick={handleNavClick}>
                      Patient List
                    </SidebarLink>

                    {can("tests", "view") && (
                      <SidebarLink to="/tests/management" icon={HiOutlineBeaker} isExpanded onClick={handleNavClick}>
                        Test Management
                      </SidebarLink>
                    )}
                  </ul>
                )}
              </li>
            )}

            {/* Phlebotomy */}
            {can("phlebotomy", "view") && (
              <SidebarLink to="/phlebotomy/worklist" icon={HiOutlineClipboardCheck} isExpanded={isExpanded} onClick={handleNavClick}>
                Phlebotomy Worklist
              </SidebarLink>
            )}

            {/* Pathology */}
            {(can("results", "verify") || can("results", "enter")) && (
              <li>
                <button
                  onClick={() => setPathologyOpen((p) => !p)}
                  className="flex items-center w-full px-3 py-2.5 rounded-lg hover:bg-gray-700 transition"
                >
                  <HiOutlineClipboardList className="w-5 h-5 shrink-0" />
                  {isExpanded && <span className="ml-3">Pathology</span>}
                  {isExpanded && (pathologyOpen ? <HiChevronDown /> : <HiChevronRight />)}
                </button>

                {pathologyOpen && (
                  <ul className="ml-8 mt-1 space-y-1">
                    <SidebarLink to="/pathologist/worklist" icon={HiOutlineClipboardList} isExpanded onClick={handleNavClick}>
                      Worklist
                    </SidebarLink>
                    <SidebarLink to="/pathologist/results" icon={HiOutlineClipboardCheck} isExpanded onClick={handleNavClick}>
                      Result Entry
                    </SidebarLink>
                  </ul>
                )}
              </li>
            )}

            {/* Reports */}
            {can("reports", "view") && (
              <SidebarLink to="/reports" icon={HiOutlineDocumentReport} isExpanded={isExpanded} onClick={handleNavClick}>
                Reports
              </SidebarLink>
            )}

            {/* Inventory */}
            {can("inventory", "view") && (
              <SidebarLink to="/inventory" icon={HiOutlineArchive} isExpanded={isExpanded} onClick={handleNavClick}>
                Inventory
              </SidebarLink>
            )}

            {/* Staff */}
            {can("admin", "users_manage") && (
              <SidebarLink to="/admin/staff" icon={HiOutlineBriefcase} isExpanded={isExpanded} onClick={handleNavClick}>
                Staff Management
              </SidebarLink>
            )}

            {/* System Settings */}
            {can("settings", "view") && (
              <li>
                <button
                  onClick={() => setSystemOpen((p) => !p)}
                  className="flex items-center w-full px-3 py-2.5 rounded-lg hover:bg-gray-700 transition"
                >
                  <HiOutlineCog className="w-5 h-5 shrink-0" />
                  {isExpanded && <span className="ml-3">System Settings</span>}
                  {isExpanded && (systemOpen ? <HiChevronDown /> : <HiChevronRight />)}
                </button>

                {systemOpen && (
                  <ul className="ml-8 mt-1 space-y-1">
                    <SidebarLink to="/admin/settings" icon={HiOutlineCog} isExpanded onClick={handleNavClick}>
                      General Settings
                    </SidebarLink>

                    <li>
                      <button
                        onClick={() => setLabOpen((p) => !p)}
                        className="flex items-center w-full px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition"
                      >
                        <HiOutlineCollection className="w-5 h-5" />
                        {isExpanded && <span className="ml-3">Lab Configuration</span>}
                        {isExpanded && (labOpen ? <HiChevronDown /> : <HiChevronRight />)}
                      </button>

                      {labOpen && (
                        <ul className="ml-8 mt-1 space-y-1">
                          <SidebarLink to="/admin/lab-config/catalog" icon={HiOutlineDatabase} isExpanded onClick={handleNavClick}>
                            Test Catalog
                          </SidebarLink>
                          <SidebarLink to="/admin/lab-config" icon={HiOutlineCog} isExpanded onClick={handleNavClick}>
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

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => logout(true, true)}
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg text-white bg-red-600 hover:bg-red-700 transition duration-200 ${
              isExpanded ? "justify-start" : "justify-center"
            }`}
          >
            <RiLogoutBoxLine className="w-5 h-5 shrink-0" />
            {isExpanded && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
