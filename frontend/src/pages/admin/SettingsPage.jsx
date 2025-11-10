import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  HiOutlineUsers,
  HiOutlineBeaker,
  HiOutlineCog,
  HiOutlineShieldCheck,
  HiOutlineCurrencyDollar,
  HiOutlineColorSwatch,
  HiOutlineLink,
  HiOutlineOfficeBuilding,
  HiOutlineInformationCircle,
  HiOutlineDatabase,
  HiOutlineDesktopComputer,
  HiOutlineBell,
  HiOutlineArrowLeft, // Import Back Arrow
} from "react-icons/hi";
import { HiOutlineLockClosed, HiOutlineCreditCard } from "react-icons/hi2";

// Context
import { SettingsContext } from "../../context/SettingsContext";

// Admin section components (existing)
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

const NavCard = ({ icon: Icon, label, description, onClick }) => (
  <button
    onClick={onClick}
    className="group w-full flex items-start gap-4 p-4 rounded-lg text-left transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white hover:bg-gray-50 shadow-sm ring-1 ring-gray-200"
  >
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
        <Icon className="h-6 w-6 text-blue-600" />
    </span>
    <div>
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <p className="text-sm text-gray-600">{description}</p>
    </div>
  </button>
);


/* -------------------- MRN / Lab ID Settings Panel (inline) -------------------- */
const MRNSettingsPanel = () => {
    // ... (MRNSettingsPanel implementation is long, assumed correct, and copied here)
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
  
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    const token = userInfo?.token || "";
  
    const [form, setForm] = useState({
      prefix: "MRN",
      separator: "-",
      padding: 5,
      nextNumber: 1,
      enabled: true,
      labIdPrefix: "LAB",
      labIdSeparator: "-",
      labIdPadding: 4,
      labIdNextNumber: 1,
    });
  
    const previewMRN = useMemo(() => {
      const num = String(form.nextNumber ?? 1).padStart(Number(form.padding || 0), "0");
      return `${form.prefix || ""}${form.separator || ""}${num}`;
    }, [form]);
  
    const previewLabId = useMemo(() => {
      const num = String(form.labIdNextNumber ?? 1).padStart(Number(form.labIdPadding || 0), "0");
      return `${form.labIdPrefix || ""}${form.labIdSeparator || ""}${num}`;
    }, [form]);
  
    const onChange = (e) => {
      const { name, value, type, checked } = e.target;
      setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    };
  
    const fetchSettings = async () => {
      setLoading(true);
      setErr("");
      setOk("");
      try {
        const res = await fetch("/api/settings/mrn", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load MRN settings (${res.status})`);
        const data = await res.json();
        setForm((f) => ({
          ...f,
          prefix: data?.prefix ?? f.prefix,
          separator: data?.separator ?? f.separator,
          padding: data?.padding ?? f.padding,
          nextNumber: data?.nextNumber ?? f.nextNumber,
          enabled: data?.enabled ?? f.enabled,
          labIdPrefix: data?.labIdPrefix ?? f.labIdPrefix,
          labIdSeparator: data?.labIdSeparator ?? f.labIdSeparator,
          labIdPadding: data?.labIdPadding ?? f.labIdPadding,
          labIdNextNumber: data?.labIdNextNumber ?? f.labIdNextNumber,
        }));
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };
  
    const save = async () => {
      setSaving(true);
      setErr("");
      setOk("");
      try {
        const res = await fetch("/api/settings/mrn", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prefix: form.prefix,
            separator: form.separator,
            padding: Number(form.padding),
            nextNumber: Number(form.nextNumber),
            enabled: !!form.enabled,
            labIdPrefix: form.labIdPrefix,
            labIdSeparator: form.labIdSeparator,
            labIdPadding: Number(form.labIdPadding),
            labIdNextNumber: Number(form.labIdNextNumber),
          }),
        });
        if (!res.ok) throw new Error(`Failed to save MRN settings (${res.status})`);
        setOk("Settings saved successfully.");
      } catch (e) {
        setErr(e.message);
      } finally {
        setSaving(false);
      }
    };
  
    const resetCounters = (type) => {
      if (type === "mrn") {
        setForm((f) => ({ ...f, nextNumber: 1 }));
      } else if (type === "lab") {
        setForm((f) => ({ ...f, labIdNextNumber: 1 }));
      }
    };
  
    useEffect(() => {
      fetchSettings();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
        <SectionHeader
          icon={HiOutlineInformationCircle}
          title="Identifiers (MRN & Lab ID)"
          description="Configure and control the MRN and Lab ID sequences used across the system."
          right={
            <div className="flex gap-2">
              <button
                onClick={fetchSettings}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                disabled={loading || saving}
              >
                Refresh
              </button>
              <button
                onClick={save}
                className={`px-3 py-1.5 rounded-lg text-sm text-white ${
                  saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={saving || loading}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          }
        />
  
        {err && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">
            {err}
          </div>
        )}
        {ok && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-700">
            {ok}
          </div>
        )}
  
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-1/3 bg-gray-100 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-24 bg-gray-100 rounded" />
              <div className="h-24 bg-gray-100 rounded" />
            </div>
            <div className="h-24 bg-gray-100 rounded" />
          </div>
        ) : (
          <>
            {/* MRN block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">MRN Settings</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Prefix</label>
                    <input
                      name="prefix"
                      value={form.prefix}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="MRN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Separator</label>
                    <input
                      name="separator"
                      value={form.separator}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Padding</label>
                    <input
                      type="number"
                      min={0}
                      name="padding"
                      value={form.padding}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Next Number</label>
                    <input
                      type="number"
                      min={1}
                      name="nextNumber"
                      value={form.nextNumber}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      id="mrn-enabled"
                      type="checkbox"
                      name="enabled"
                      checked={!!form.enabled}
                      onChange={onChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="mrn-enabled" className="text-sm text-gray-700">
                      Enable automatic MRN generation
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Preview:</span>{" "}
                    <code className="px-2 py-1 rounded bg-gray-50 ring-1 ring-gray-200">{previewMRN}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCounters("mrn")}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Reset MRN Counter
                  </button>
                </div>
              </div>
  
              {/* Lab ID block */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Lab ID Settings</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Prefix</label>
                    <input
                      name="labIdPrefix"
                      value={form.labIdPrefix}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="LAB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Separator</label>
                    <input
                      name="labIdSeparator"
                      value={form.labIdSeparator}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Padding</label>
                    <input
                      type="number"
                      min={0}
                      name="labIdPadding"
                      value={form.labIdPadding}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Next Number</label>
                    <input
                      type="number"
                      min={1}
                      name="labIdNextNumber"
                      value={form.labIdNextNumber}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Preview:</span>{" "}
                    <code className="px-2 py-1 rounded bg-gray-50 ring-1 ring-gray-200">{previewLabId}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCounters("lab")}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Reset Lab ID Counter
                  </button>
                </div>
              </div>
            </div>
  
            {/* Note */}
            <div className="mt-6 text-xs text-gray-500">
              Changes take effect immediately for new records. Existing MRNs/Lab IDs are not modified.
            </div>
          </>
        )}
      </div>
    );
  };
// End of MRNSettingsPanel

/* --------------------------------- page --------------------------------- */

// 💡 NEW CATEGORIES FOR HORIZONTAL TABS
const MAIN_TABS = [
    { id: "system", label: "System & Organization", icon: HiOutlineCog },
    { id: "access", label: "Access & Security", icon: HiOutlineLockClosed },
    { id: "lab_finance", label: "Lab Operations & Finance", icon: HiOutlineBeaker },
];

const SettingsPage = () => {
  const { settings, loading, updateSettings } = useContext(SettingsContext);

  // --- STATE ---
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
  
  // 💡 NEW STATE: activeSection is now the 'view', null means show grid
  const [activeSectionId, setActiveSectionId] = useState(null); 
  const [activeMainTab, setActiveMainTab] = useState(getLS("admin.activeMainTab", "system"));

  // Sub-tab states remain the same
  const [activeUserSubTab, setActiveUserSubTab] = useState(getLS("admin.userSubTab", "staff"));
  const [activeLabSubTab, setActiveLabSubTab] = useState(getLS("admin.labSubTab", "tests"));
  const [activeSecuritySubTab, setActiveSecuritySubTab] = useState(getLS("admin.securitySubTab", "password"));
  const [activeIntegrationsSubTab, setActiveIntegrationsSubTab] = useState(
    getLS("admin.integrationsSubTab", "instruments")
  );
  
  /* --------------------------------- content builders --------------------------------- */

  // 💡 FIX: Moved these function declarations *before* they are referenced.
  const renderUserManagement = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <SubtabPills tabs={userSubTabs} active={activeUserSubTab} onChange={setActiveUserSubTab} />
      </div>
      <div className="mt-4">
        {activeUserSubTab === "staff" && <StaffManagementPage />}
        {activeUserSubTab === "roles" && <RoleManager />}
      </div>
    </>
  );

  const renderLabConfig = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <SubtabPills tabs={labSubTabs} active={activeLabSubTab} onChange={setActiveLabSubTab} />
      </div>
      <div className="mt-4">
        {activeLabSubTab === "tests" && <TestConfigurationPage />}
        {activeLabSubTab === "panels" && <TestPanelsManager />}
        {activeLabSubTab === "units" && <UnitsManager />}
      </div>
    </>
  );

  const renderSecurity = () => (
    <>
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
    </>
  );

  const renderIntegrations = () => (
    <>
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
    </>
  );

  // --- CONFIGURATION ---
  const settingsItems = useMemo(() => [
    // SYSTEM & ORGANIZATION
    { tab: "system", id: "system_management", label: "General Settings", icon: HiOutlineCog, desc: "Core app configuration, logos, and maintenance.", component: () => <SystemSettingsForm settings={settings} onUpdate={updateSettings} /> },
    { tab: "system", id: "organization", label: "Organization Profile", icon: HiOutlineOfficeBuilding, desc: "Company details, addresses, and contacts.", component: () => <PlaceholderContent title="Organization Profile" /> },
    { tab: "system", id: "identifiers", label: "Identifiers (MRN/Lab ID)", icon: HiOutlineInformationCircle, desc: "Prefixes, counters, and formatting.", component: MRNSettingsPanel },
    { tab: "system", id: "customization", label: "Report Customization", icon: HiOutlineColorSwatch, desc: "Report branding, signatures, and themes.", component: ReportCustomizer },
    
    // SECURITY & ACCESS
    { tab: "access", id: "user_management", label: "User & Role Management", icon: HiOutlineUsers, desc: "Manage staff, roles, and access levels.", component: renderUserManagement },
    { tab: "access", id: "security", label: "Security Policies", icon: HiOutlineLockClosed, desc: "Password policies and login rules.", component: renderSecurity },
    { tab: "access", id: "database", label: "Backup & Audit", icon: HiOutlineDatabase, desc: "Database backups and activity logs.", component: () => <AuditLogPage /> },
    
    // LAB OPERATIONS & FINANCE
    { tab: "lab_finance", id: "lab_config", label: "Test Catalog & Units", icon: HiOutlineBeaker, desc: "Test definitions, panels, and units.", component: renderLabConfig },
    { tab: "lab_finance", id: "integrations", label: "Instrument Integration", icon: HiOutlineLink, desc: "Connect analyzers and manage data ingestion.", component: renderIntegrations },
    { tab: "lab_finance", id: "billing", label: "Billing & Pricing", icon: HiOutlineCreditCard, desc: "Pricing, invoicing, and revenue settings.", component: () => <BillingManager /> },
    { tab: "lab_finance", id: "monitoring", label: "System Monitoring", icon: HiOutlineDesktopComputer, desc: "Health, performance, and usage.", component: () => <PlaceholderContent title="System Monitoring" /> },
    { tab: "lab_finance", id: "notifications", label: "Notifications & Alerts", icon: HiOutlineBell, desc: "Email/SMS alerts and delivery rules.", component: () => <PlaceholderContent title="Notifications & Alerts" /> },
  ], [settings, updateSettings, activeUserSubTab, activeLabSubTab, activeSecuritySubTab, activeIntegrationsSubTab]); // 💡 FIX: Added sub-tab states to dependency array

  // --- LOCAL STORAGE PERSISTENCE ---
  useEffect(() => {
    // When tab changes, reset the view to the grid
    setActiveSectionId(null);
    setLS("admin.activeMainTab", activeMainTab);
  }, [activeMainTab]);

  useEffect(() => {
    // Persist the specific section being viewed
    setLS("admin.activeSection", activeSectionId);
  }, [activeSectionId]);


  // --- SUBTAB DEFINITIONS (Used in render functions) ---
  const userSubTabs = [{ id: "staff", label: "Staff Accounts" }, { id: "roles", label: "Roles & Permissions" }];
  const labSubTabs = [{ id: "tests", label: "Test Catalog" }, { id: "panels", label: "Test Panels" }, { id: "units", label: "Units" }];
  const securitySubTabs = [{ id: "password", label: "Password Policy" }, { id: "reset", label: "Password Management" }, { id: "audit", label: "Audit Trail" }];
  const integrationsSubTabs = [{ id: "instruments", label: "Instruments" }, { id: "ingest_events", label: "Ingest Events" }];

  // --- CURRENT ACTIVE VIEW ---
  const currentItems = settingsItems.filter(s => s.tab === activeMainTab);
  const currentSectionMeta = settingsItems.find((s) => s.id === activeSectionId);

  const renderActiveContent = () => {
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

    const SectionComponent = currentSectionMeta?.component;

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
        {currentSectionMeta && (
          <SectionHeader
            icon={currentSectionMeta.icon}
            title={currentSectionMeta.label}
            description={currentSectionMeta.desc}
          />
        )}
        
        {/* Render the actual content component */}
        {SectionComponent && <SectionComponent />}
        
      </div>
    );
  };

  /* --------------------------------- render --------------------------------- */

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Top Page Header */}
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
        <p className="text-gray-600 mt-1">
          Configure users, tests, security, identifiers, and integrations for your laboratory.
        </p>
      </div>

      {/* Level 1: Horizontal Tab Navigation */}
      <div className="mt-6 px-6 pb-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition duration-150 ease-in-out 
              ${
                activeMainTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
              }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 💡 FIX: Main content area uses a CSS grid to stack views for transitions */}
      <div className="mt-6 px-6 pb-8">
        <div className="grid [grid-template-areas:'stack']">
          
          {/* VIEW 1: GRID DASHBOARD */}
          <div className={`
            [grid-area:stack]
            transition-all duration-300 ease-in-out
            ${activeSectionId ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 delay-150'}
          `}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentItems.map((item) => (
                <NavCard
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  description={item.desc}
                  onClick={() => setActiveSectionId(item.id)}
                />
              ))}
            </div>
          </div>

          {/* VIEW 2: FOCUSED SECTION */}
          <div className={`
            [grid-area:stack]
            transition-all duration-300 ease-in-out
            ${activeSectionId ? 'opacity-100 scale-100 delay-150' : 'opacity-0 scale-95 pointer-events-none'}
          `}>
            {/* Only render content if an ID is set */}
            {activeSectionId && (
              <>
                <button
                  onClick={() => setActiveSectionId(null)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 font-medium"
                >
                  <HiOutlineArrowLeft className="w-4 h-4" />
                  Back to All Settings
                </button>
                {renderActiveContent()}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;