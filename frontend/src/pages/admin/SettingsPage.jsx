import React, { useEffect, useMemo, useState } from "react";
import {
  HiOutlineUsers,
  HiOutlineBeaker,
  HiOutlineCog,
  HiOutlineShieldCheck,
  HiOutlineCurrencyDollar,
  HiOutlineColorSwatch,
  HiOutlineLink,
  HiOutlineOfficeBuilding,
  HiOutlineDesktopComputer,
  HiOutlineBell,
  HiOutlineDatabase,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineInformationCircle,
} from "react-icons/hi";

// Context
import { SettingsContext } from "../../context/SettingsContext";

// Admin section components
import StaffManagementPage from "./StaffManagementPage";
import RoleManager from "../../components/admin/RoleManager";
import TestConfigurationPage from "./TestConfigurationPage";
import SystemSettingsForm from "../../components/admin/SystemSettingsForm";
import AuditLogPage from "../../components/admin/AuditLogPage";
import DatabaseManager from "../../components/admin/DatabaseManager";
import SecuritySettingsForm from "../../components/admin/SecuritySettingsForm";
import BillingManager from "../../components/admin/BillingManager";
import ReportCustomizer from "../../components/admin/ReportCustomizer";
import InstrumentsManager from "../../components/admin/InstrumentsManager";
import TestPanelsManager from "../../components/admin/TestPanelsManager";
import UnitsManager from "../../components/admin/UnitsManager";
import IngestEventsPage from "../../components/admin/IngestEventsPage";

/* --------------------------- small UI helpers --------------------------- */

const PlaceholderContent = ({ title, note }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm ring-1 ring-gray-200">
    <div className="flex items-start gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
        <HiOutlineInformationCircle className="h-5 w-5 text-gray-600" />
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-gray-600">
          {note || "This feature is under development and will be available soon."}
        </p>
      </div>
    </div>
  </div>
);

const SubtabPills = ({ tabs, active, onChange }) => {
  // collapse to a <select> on very narrow screens
  return (
    <div className="w-full flex items-center justify-between gap-2">
      <div className="hidden xs:flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${
                active === t.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            aria-pressed={active === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="xs:hidden w-full">
        <select
          value={active}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {tabs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, description, right = null }) => (
  <div className="mb-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
          <Icon className="h-6 w-6 text-blue-600" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-gray-600 mt-0.5">{description}</p>}
        </div>
      </div>
      {right}
    </div>
  </div>
);

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
      ${active ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"}
    `}
    aria-current={active ? "page" : undefined}
  >
    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-white" : "text-gray-600 group-hover:text-gray-800"}`} />
    {!collapsed && <span className="truncate">{label}</span>}
  </button>
);

/* --------------------------------- page --------------------------------- */

const SettingsPage = () => {
  const { settings, loading, updateSettings } = React.useContext(SettingsContext);

  // persist last visited section/sub-tab
  const getLS = (k, fallback) => {
    try {
      const v = localStorage.getItem(k);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };
  const setLS = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };

  const [activeSection, setActiveSection] = useState(getLS("admin.activeSection", "user_management"));
  const [activeUserSubTab, setActiveUserSubTab] = useState(getLS("admin.userSubTab", "staff"));
  const [activeLabSubTab, setActiveLabSubTab] = useState(getLS("admin.labSubTab", "tests"));
  const [activeSecuritySubTab, setActiveSecuritySubTab] = useState(getLS("admin.securitySubTab", "password"));
  const [activeIntegrationsSubTab, setActiveIntegrationsSubTab] = useState(
    getLS("admin.integrationsSubTab", "instruments")
  );
  const [navCollapsed, setNavCollapsed] = useState(getLS("admin.navCollapsed", "0") === "1");

  useEffect(() => setLS("admin.activeSection", activeSection), [activeSection]);
  useEffect(() => setLS("admin.userSubTab", activeUserSubTab), [activeUserSubTab]);
  useEffect(() => setLS("admin.labSubTab", activeLabSubTab), [activeLabSubTab]);
  useEffect(() => setLS("admin.securitySubTab", activeSecuritySubTab), [activeSecuritySubTab]);
  useEffect(() => setLS("admin.integrationsSubTab", activeIntegrationsSubTab), [activeIntegrationsSubTab]);
  useEffect(() => setLS("admin.navCollapsed", navCollapsed ? "1" : "0"), [navCollapsed]);

  const sections = [
    { id: "system_management", label: "System Management", icon: HiOutlineCog, desc: "Core app configuration and organization profile." },
    { id: "user_management", label: "User & Role Management", icon: HiOutlineUsers, desc: "Manage staff, roles, and access levels." },
    { id: "lab_config", label: "Laboratory Configuration", icon: HiOutlineBeaker, desc: "Test catalog, panels, and measurement units." },
    { id: "billing", label: "Billing & Finance", icon: HiOutlineCurrencyDollar, desc: "Pricing, invoices, and revenue settings." },
    { id: "security", label: "Security & Compliance", icon: HiOutlineShieldCheck, desc: "Password policies and audit trail." },
    { id: "database", label: "Backup & Restore", icon: HiOutlineDatabase, desc: "Create on-demand backups and download securely." },
    { id: "integrations", label: "Integration Settings", icon: HiOutlineLink, desc: "Connect instruments and third-party systems." },
    { id: "customization", label: "UI & Customization", icon: HiOutlineColorSwatch, desc: "Logos, headers, and report templates." },
    { id: "organization", label: "Organization", icon: HiOutlineOfficeBuilding, desc: "Company details and locations." },
    { id: "monitoring", label: "System Monitoring", icon: HiOutlineDesktopComputer, desc: "Health, performance, and usage." },
    { id: "notifications", label: "Notifications & Alerts", icon: HiOutlineBell, desc: "Email/SMS alerts and delivery rules." },
  ];

  const userSubTabs = [
    { id: "staff", label: "Staff Accounts" },
    { id: "roles", label: "Roles & Permissions" },
  ];

  const labSubTabs = [
    { id: "tests", label: "Test Catalog" },
    { id: "panels", label: "Test Panels" },
    { id: "units", label: "Units" },
  ];

  const securitySubTabs = [
    { id: "password", label: "Password Policy" },
    { id: "reset", label: "Password Management" },
    { id: "audit", label: "Audit Trail" },
  ];

  const integrationsSubTabs = [
    { id: "instruments", label: "Instruments" },
    { id: "ingest_events", label: "Ingest Events" },
  ];

  const currentSectionMeta = useMemo(
    () => sections.find((s) => s.id === activeSection) || sections[0],
    [activeSection]
  );

  /* --------------------------------- content builders --------------------------------- */

  const renderUserManagement = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
      <SectionHeader
        icon={HiOutlineUsers}
        title="User & Role Management"
        description="Create accounts, assign roles, and control access to features."
      />
      <div className="flex items-center justify-between mb-4">
        <SubtabPills tabs={userSubTabs} active={activeUserSubTab} onChange={setActiveUserSubTab} />
      </div>
      <div className="mt-4">
        {activeUserSubTab === "staff" && <StaffManagementPage />}
        {activeUserSubTab === "roles" && <RoleManager />}
      </div>
    </div>
  );

  const renderLabConfig = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
      <SectionHeader
        icon={HiOutlineBeaker}
        title="Laboratory Configuration"
        description="Maintain your test catalog, panels, and supported units."
      />
      <div className="flex items-center justify-between mb-4">
        <SubtabPills tabs={labSubTabs} active={activeLabSubTab} onChange={setActiveLabSubTab} />
      </div>
      <div className="mt-4">
        {activeLabSubTab === "tests" && <TestConfigurationPage />}
        {activeLabSubTab === "panels" && <TestPanelsManager />}
        {activeLabSubTab === "units" && <UnitsManager />}
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
      <SectionHeader
        icon={HiOutlineShieldCheck}
        title="Security & Compliance"
        description="Harden access, enforce policies, and review activity logs."
      />
      <div className="flex items-center justify-between mb-4">
        <SubtabPills tabs={securitySubTabs} active={activeSecuritySubTab} onChange={setActiveSecuritySubTab} />
      </div>
      <div className="mt-4">
        {activeSecuritySubTab === "password" && (
          <SecuritySettingsForm settings={settings} onUpdate={updateSettings} />
        )}
        {activeSecuritySubTab === "reset" && <PlaceholderContent title="Password Management" />}
        {activeSecuritySubTab === "audit" && <AuditLogPage />}
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
      <SectionHeader
        icon={HiOutlineLink}
        title="Integration Settings"
        description="Connect analyzers and external services."
      />
      <div className="flex items-center justify-between mb-4">
        <SubtabPills
          tabs={integrationsSubTabs}
          active={activeIntegrationsSubTab}
          onChange={setActiveIntegrationsSubTab}
        />
      </div>
      <div className="mt-4">
        {activeIntegrationsSubTab === "instruments" && <InstrumentsManager />}
        {activeIntegrationsSubTab === "ingest_events" && <IngestEventsPage />}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="bg-white p-10 rounded-2xl shadow-sm ring-1 ring-gray-200">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-40 bg-gray-100 rounded" />
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case "system_management":
        return (
          <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
            <SectionHeader
              icon={HiOutlineCog}
              title="System Management"
              description="General application configuration and identity."
            />
            <SystemSettingsForm settings={settings} onUpdate={updateSettings} />
          </div>
        );
      case "user_management":
        return renderUserManagement();
      case "lab_config":
        return renderLabConfig();
      case "billing":
        return (
          <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
            <SectionHeader
              icon={HiOutlineCurrencyDollar}
              title="Billing & Finance"
              description="Manage prices, invoicing, and financial parameters."
            />
            <BillingManager />
          </div>
        );
      case "security":
        return renderSecurity();
      case "database":
        return (
          <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
            <SectionHeader
              icon={HiOutlineDatabase}
              title="Backup & Restore"
              description="Create secure, on-demand database backups. Restores coming soon."
            />
            <DatabaseManager />
          </div>
        );
      case "customization":
        return (
          <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
            <SectionHeader
              icon={HiOutlineColorSwatch}
              title="UI & Customization"
              description="Logos, headers, report branding, and themes."
            />
            <ReportCustomizer />
          </div>
        );
      case "integrations":
        return renderIntegrations();
      case "organization":
        return <PlaceholderContent title="Organization" />;
      case "monitoring":
        return <PlaceholderContent title="System Monitoring" />;
      case "notifications":
        return <PlaceholderContent title="Notifications & Alerts" />;
      default:
        return <PlaceholderContent title="Settings" />;
    }
  };

  /* --------------------------------- render --------------------------------- */

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Top header */}
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
        <p className="text-gray-600 mt-1">
          Configure users, tests, security, and integrations for your laboratory.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 px-6 pb-8">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-4 h-max">
          <div className="bg-white p-3 rounded-2xl shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-medium text-gray-700">Navigation</span>
              <button
                onClick={() => setNavCollapsed((s) => !s)}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                title={navCollapsed ? "Expand menu" : "Collapse menu"}
              >
                {navCollapsed ? (
                  <HiOutlineChevronRight className="h-4 w-4" />
                ) : (
                  <HiOutlineChevronLeft className="h-4 w-4" />
                )}
                {navCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>

            <ul className="space-y-1 max-h-[70vh] overflow-auto pr-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <NavItem
                    icon={s.icon}
                    label={s.label}
                    active={activeSection === s.id}
                    onClick={() => setActiveSection(s.id)}
                    collapsed={navCollapsed}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Context hint */}
          <div className="hidden lg:block mt-3 text-xs text-gray-500 px-1">
            {currentSectionMeta?.desc}
          </div>
        </aside>

        {/* Main content (independent scroll) */}
        <main className="space-y-6 min-h-[60vh]">{renderContent()}</main>
      </div>
    </div>
  );
};

export default SettingsPage;
