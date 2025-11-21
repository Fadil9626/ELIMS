// frontend/src/components/layout/Sidebar.jsx
import React, { useState, useContext, useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  HiMenu,
  HiOutlineViewGrid,
  HiOutlineUsers,
  HiOutlineBeaker,
  HiOutlineArchive,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineDocumentReport,
  HiOutlineClipboardCheck,
  HiChevronDown,
  HiChevronRight,
  HiX,
} from "react-icons/hi";
import { HiPaperAirplane } from "react-icons/hi2";
import { RiLogoutBoxLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import { SettingsContext } from "../../context/SettingsContext";

/* ============================================================
    Reusable Sidebar Link
============================================================ */
const SidebarLink = ({
  to,
  icon: Icon,
  children,
  isExpanded,
  onClick,
  end,
}) => (
  <li onClick={onClick}>
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `
        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 
        ${isExpanded ? "justify-start" : "justify-center"}
        ${
          isActive
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-300 hover:bg-gray-700 hover:text-white"
        }
      `
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      {isExpanded && (
        <span className="text-sm font-medium truncate">{children}</span>
      )}
    </NavLink>
  </li>
);

/* ============================================================
    MAIN SIDEBAR
============================================================ */
const Sidebar = ({ isExpanded, toggleSidebar }) => {
  const { logout, can } = useAuth();
  const { settings } = useContext(SettingsContext);

  const [patientOpen, setPatientOpen] = useState(false);
  const [pathologyOpen, setPathologyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = isExpanded ? "w-64" : "w-20";
  const theme = settings?.theme_mode || "dark";

  const sidebarTitle = useMemo(
    () => settings?.system_sidebar_title || settings?.lab_name || "ELIMS",
    [settings]
  );

  /* ----------------- Role Logic ------------------ */
  const isReception =
    can("patients", "view") ||
    can("patients", "register") ||
    can("billing", "create");

  const isPhleb = can("phlebotomy", "view");
  const isPathologist = can("pathologist", "view");
  const isResultEntry = can("results", "enter");
  const isReports = can("reports", "view");
  const isSettings = can("settings", "view");
  const isPatients = can("patients", "view");

  const showMessages =
    can("messages", "view") ||
    can("messages", "send") ||
    can("messages", "manage");

  // 🧠 Dashboard is always /dashboard; role redirect happens in DashboardPage
  const dashboardRoute = "/dashboard";

  const handleNavClick = () => {
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE BUTTON */}
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

      {/* SIDEBAR PANEL */}
      <aside
        className={`fixed inset-y-0 left-0 flex flex-col shadow-xl z-40 transition-all duration-300
          ${sidebarWidth}
          ${
            theme === "light"
              ? "bg-white text-gray-900"
              : "bg-gray-900 text-gray-100"
          }
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* HEADER */}
        <div
          className={`flex items-center gap-3 px-4 py-4 border-b ${
            theme === "light"
              ? "border-gray-200 bg-gray-50"
              : "border-gray-700 bg-gray-800"
          } ${isExpanded ? "justify-between" : "justify-center"}`}
        >
          {isExpanded ? (
            <h1 className="font-semibold text-sm truncate max-w-[9rem]">
              {sidebarTitle}
            </h1>
          ) : (
            <span className="text-lg font-bold">
              {sidebarTitle.charAt(0)}
            </span>
          )}

          <button
            onClick={mobileOpen ? () => setMobileOpen(false) : toggleSidebar}
            className="p-2 rounded hover:bg-blue-600/60 transition"
          >
            {mobileOpen ? (
              <HiX className="w-5 h-5" />
            ) : (
              <HiMenu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-grow overflow-y-auto p-3 custom-scrollbar">
          <ul className="space-y-1">
            {/* DASHBOARD (always /dashboard) */}
            <SidebarLink
              to={dashboardRoute}
              end
              icon={HiOutlineViewGrid}
              isExpanded={isExpanded}
              onClick={handleNavClick}
            >
              Dashboard
            </SidebarLink>

            {/* MESSAGES */}
            {showMessages && (
              <SidebarLink
                to="/messages"
                icon={HiPaperAirplane}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Messages
              </SidebarLink>
            )}

            {/* PATIENT MANAGEMENT (Reception Only) */}
            {isPatients && isReception && (
              <li>
                <button
                  onClick={() => setPatientOpen((prev) => !prev)}
                  className={`flex items-center w-full px-3 py-2.5 rounded-lg hover:bg-gray-700 transition
                  ${isExpanded ? "justify-start" : "justify-center"}`}
                >
                  <HiOutlineUsers className="w-5 h-5" />
                  {isExpanded && (
                    <span className="ml-3 text-sm">Patients</span>
                  )}
                  {isExpanded && (
                    <span className="ml-auto">
                      {patientOpen ? <HiChevronDown /> : <HiChevronRight />}
                    </span>
                  )}
                </button>

                {patientOpen && isExpanded && (
                  <ul className="ml-8 space-y-1 mt-1">
                    <SidebarLink
                      to="/patients"
                      icon={HiOutlineUsers}
                      isExpanded={true}
                      onClick={handleNavClick}
                    >
                      Patient Directory
                    </SidebarLink>
                    <SidebarLink
                      to="/patients/register"
                      icon={HiOutlineUsers}
                      isExpanded={true}
                      onClick={handleNavClick}
                    >
                      Register Patient
                    </SidebarLink>
                  </ul>
                )}
              </li>
            )}

            {/* PHLEBOTOMY */}
            {isPhleb && (
              <SidebarLink
                to="/phlebotomy/worklist"
                icon={HiOutlineClipboardCheck}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Phlebotomy Worklist
              </SidebarLink>
            )}

            {/* PATHOLOGY */}
            {(isPathologist || isResultEntry) && (
              <li>
                <button
                  onClick={() => setPathologyOpen((prev) => !prev)}
                  className={`flex items-center w-full px-3 py-2.5 rounded-lg hover:bg-gray-700 transition
                  ${isExpanded ? "justify-start" : "justify-center"}`}
                >
                  <HiOutlineBeaker className="w-5 h-5" />
                  {isExpanded && (
                    <span className="ml-3 text-sm">Pathology</span>
                  )}
                  {isExpanded && (
                    <span className="ml-auto">
                      {pathologyOpen ? <HiChevronDown /> : <HiChevronRight />}
                    </span>
                  )}
                </button>

                {pathologyOpen && isExpanded && (
                  <ul className="ml-8 space-y-1 mt-1">
                    {isPathologist && (
                      <SidebarLink
                        to="/pathologist/worklist"
                        icon={HiOutlineClipboardList}
                        isExpanded={true}
                        onClick={handleNavClick}
                      >
                        Worklist
                      </SidebarLink>
                    )}
                    {isResultEntry && (
                      <SidebarLink
                        to="/pathologist/results"
                        icon={HiOutlineArchive}
                        isExpanded={true}
                        onClick={handleNavClick}
                      >
                        Result Entry
                      </SidebarLink>
                    )}
                  </ul>
                )}
              </li>
            )}

            {/* REPORTS */}
            {isReports && (
              <SidebarLink
                to="/reports"
                icon={HiOutlineDocumentReport}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                Reports
              </SidebarLink>
            )}

            {/* SETTINGS */}
            {isSettings && (
              <SidebarLink
                to="/admin/settings"
                icon={HiOutlineCog}
                isExpanded={isExpanded}
                onClick={handleNavClick}
              >
                System Settings
              </SidebarLink>
            )}
          </ul>
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => logout(true, true)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition
            ${isExpanded ? "justify-start" : "justify-center"}`}
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
