// src/pages/admin/SettingsPage.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  HiOutlineUsers,
  HiOutlineBeaker,
  HiOutlineCog,
  HiOutlineColorSwatch,
  HiOutlineLink,
  HiOutlineOfficeBuilding,
  HiOutlineInformationCircle,
  HiOutlineDatabase,
  HiOutlineDesktopComputer,
  HiOutlineBell,
  HiOutlineArrowLeft,
} from "react-icons/hi";
import { HiOutlineLockClosed, HiOutlineCreditCard } from "react-icons/hi2";

// Context
import { SettingsContext } from "../../context/SettingsContext";

// Admin section components (existing in your project)
import StaffManagementPage from "./StaffManagementPage";
import RoleManager from "../../components/admin/RoleManager";
import TestConfigurationPage from "./TestConfigurationPage";
import SystemSettingsForm from "../../components/SystemSettingsForm";
import AuditLogPage from "../../components/admin/AuditLogPage";
import DatabaseManager from "../../components/admin/DatabaseManager";
import SecuritySettingsForm from "../../components/admin/SecuritySettingsForm";
import BillingManager from "../../components/admin/BillingManager";
import ReportCustomizer from "../../components/admin/ReportCustomizer";
import InstrumentsManager from "../../components/admin/InstrumentsManager";
import IngestEventsPage from "../../components/admin/IngestEventsPage";

// ✅ New: central Lab Config dashboard (TSX file)
import LabConfigDashboard from "./labconfig/LabConfigDashboard";

/* ------------------------------------------------------------------ */
/* Small UI helpers                                                   */
/* ------------------------------------------------------------------ */

const PlaceholderContent = ({ title, note }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm ring-1 ring-gray-200">
    <div className="flex items-start gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
        <HiOutlineInformationCircle className="h-5 w-5 text-gray-600" />
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-gray-600">
          {note ||
            "This feature is under development and will be available soon."}
        </p>
      </div>
    </div>
  </div>
);

const SubtabPills = ({ tabs, active, onChange }) => (
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

const SectionHeader = ({ icon: Icon, title, description, right = null }) => (
  <div className="mb-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
          <Icon className="h-6 w-6 text-blue-600" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-gray-600 mt-0.5">{description}</p>
          )}
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

/* ------------------------------------------------------------------ */
/* MRN / Lab ID Settings Panel                                        */
/* ------------------------------------------------------------------ */

const MRNSettingsPanel = () => {
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
    const num = String(form.nextNumber ?? 1).padStart(
      Number(form.padding || 0),
      "0"
    );
    return `${form.prefix || ""}${form.separator || ""}${num}`;
  }, [form]);

  const previewLabId = useMemo(() => {
    const num = String(form.labIdNextNumber ?? 1).padStart(
      Number(form.labIdPadding || 0),
      "0"
    );
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
              <h3 className="text-sm font-semibold text-gray-800">
                MRN Settings
              </h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Prefix
                  </label>
                  <input
                    name="prefix"
                    value={form.prefix}
                    onChange={onChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="MRN"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Separator
                  </label>
                  <input
                    name="separator"
                    value={form.separator}
                    onChange={onChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="-"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Padding
                  </label>
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
                  <label className="block text-sm text-gray-700 mb-1">
                    Next Number
                  </label>
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
                  <code className="px-2 py-1 rounded bg-gray-50 ring-1 ring-gray-200">
                    {previewMRN}
                  </code>
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
              <h3 className="text-sm font-semibold text-gray-800">
                Lab ID Settings
              </h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Prefix
                  </label>
                  <input
                    name="labIdPrefix"
                    value={form.labIdPrefix}
                    onChange={onChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="LAB"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Separator
                  </label>
                  <input
                    name="labIdSeparator"
                    value={form.labIdSeparator}
                    onChange={onChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="-"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Padding
                  </label>
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
                  <label className="block text-sm text-gray-700 mb-1">
                    Next Number
                  </label>
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
                  <code className="px-2 py-1 rounded bg-gray-50 ring-1 ring-gray-200">
                    {previewLabId}
                  </code>
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

          <div className="mt-6 text-xs text-gray-500">
            Changes take effect immediately for new records. Existing MRNs/Lab
            IDs are not modified.
          </div>
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Branding & Login Settings Panel                                    */
/* ------------------------------------------------------------------ */

const BrandingSettingsPanel = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const token = userInfo?.token || "";

  const [form, setForm] = useState({
    sidebarTitle: "ELIMS",
    loginTitle: "ELIMS Portal",
    loginSubtitle: "Electronic Laboratory Access",
    loginFooter: `© ${new Date().getFullYear()} MediTrust Diagnostics — All Rights Reserved`,
    loginLogoUrl: "",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // sync from global settings
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      sidebarTitle:
        settings?.system_sidebar_title ?? settings?.lab_name ?? prev.sidebarTitle,
      loginTitle:
        settings?.system_login_title ?? settings?.lab_name ?? prev.loginTitle,
      loginSubtitle: settings?.system_login_subtitle ?? prev.loginSubtitle,
      loginFooter: settings?.system_login_footer ?? prev.loginFooter,
      loginLogoUrl:
        settings?.system_login_logo_url ??
        settings?.lab_logo_light ??
        prev.loginLogoUrl,
    }));
  }, [settings]);

  const onTextChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      await updateSettings({
        system_sidebar_title: form.sidebarTitle,
        system_login_title: form.loginTitle,
        system_login_subtitle: form.loginSubtitle,
        system_login_footer: form.loginFooter,
      });
      setOk("Branding settings saved.");
    } catch (e) {
      setErr(e.message || "Failed to save branding settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErr("");
    setOk("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // ⭐ FIX: Changed endpoint from /login-logo to /login/logo
      const res = await fetch("/api/settings/branding/login/logo", { 
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const text = await res.text();
      if (!res.ok) {
        let message = text;
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || parsed.error || text;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }

      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      const url =
        data.system_login_logo_url ||
        data.lab_logo_light ||
        data.lab_logo_dark ||
        form.loginLogoUrl;

      setForm((f) => ({ ...f, loginLogoUrl: url }));
      setOk("Login logo updated.");
    } catch (e2) {
      setErr(e2.message || "Failed to upload login logo.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
      <SectionHeader
        icon={HiOutlineColorSwatch}
        title="Branding & Login Experience"
        description="Control the look and feel of the login screen and sidebar header for your laboratory."
        right={
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        }
      />

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {ok}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="rounded-2xl border border-gray-200 bg-[#0d1117] p-6 text-gray-100">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 mb-3 rounded-2xl bg-[#111827] flex items-center justify-center overflow-hidden border border-gray-700">
              {form.loginLogoUrl ? (
                <img
                  src={form.loginLogoUrl}
                  alt="Login logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-500">Logo</span>
              )}
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {form.loginTitle || "ELIMS Portal"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {form.loginSubtitle || "Electronic Laboratory Access"}
            </p>
          </div>

          <div className="space-y-3">
            <div className="h-3 w-3/4 rounded bg-[#1a1f29]" />
            <div className="h-3 w-2/3 rounded bg-[#1a1f29]" />
            <div className="h-10 w-full rounded-lg bg-blue-600/80 mt-4" />
          </div>

          <p className="text-[11px] text-gray-500 mt-6 text-center">
            {form.loginFooter}
          </p>
        </div>

        {/* Form fields */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Sidebar Header
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              This appears in the dark sidebar header (e.g., &ldquo;MediTrust
              ELIMS&rdquo;).
            </p>
            <input
              type="text"
              name="sidebarTitle"
              value={form.sidebarTitle}
              onChange={onTextChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Sidebar title (e.g. MediTrust ELIMS)"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Login Text
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Login Title
                </label>
                <input
                  type="text"
                  name="loginTitle"
                  value={form.loginTitle}
                  onChange={onTextChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="ELIMS Portal"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Login Subtitle
                </label>
                <input
                  type="text"
                  name="loginSubtitle"
                  value={form.loginSubtitle}
                  onChange={onTextChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Electronic Laboratory Access"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Footer Text
                </label>
                <textarea
                  name="loginFooter"
                  value={form.loginFooter}
                  onChange={onTextChange}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Login Logo
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Upload a logo for the login page. A square PNG with transparent
              background works best.
            </p>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
                <span>{uploading ? "Uploading..." : "Choose File"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleLogoUpload}
                />
              </label>
              {form.loginLogoUrl && (
                <span className="text-xs text-gray-500 truncate max-w-[220px]">
                  {form.loginLogoUrl}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            Changes to branding are applied immediately for new logins and
            refreshed pages.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Invoice Layout & Payment Rules Panel                               */
/* ------------------------------------------------------------------ */

const InvoiceSettingsPanel = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const [form, setForm] = useState({
    invoicePrefix: "INV",
    invoiceDueDays: 7,
    invoiceFooterText: "Thank you for choosing MediTrust Diagnostics.",
    invoiceNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      invoicePrefix: settings?.invoice_prefix ?? prev.invoicePrefix,
      invoiceDueDays:
        settings?.invoice_default_due_days ?? prev.invoiceDueDays,
      invoiceFooterText:
        settings?.invoice_footer_text ?? prev.invoiceFooterText,
      invoiceNotes: settings?.invoice_notes ?? prev.invoiceNotes,
    }));
  }, [settings]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === "invoiceDueDays"
          ? Number(value || 0)
          : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      await updateSettings({
        invoice_prefix: form.invoicePrefix,
        invoice_default_due_days: form.invoiceDueDays,
        invoice_footer_text: form.invoiceFooterText,
        invoice_notes: form.invoiceNotes,
      });
      setOk("Invoice settings saved.");
    } catch (e) {
      setErr(e.message || "Failed to save invoice settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
      <SectionHeader
        icon={HiOutlineCreditCard}
        title="Invoice Layout & Payment Rules"
        description="Configure invoice numbering, payment terms, and footer notes for clients."
        right={
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        }
      />

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {ok}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side: settings form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Invoice Prefix
            </label>
            <input
              type="text"
              name="invoicePrefix"
              value={form.invoicePrefix}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="INV"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Used to generate invoice numbers (e.g., INV-000045).
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Default Due Days
            </label>
            <input
              type="number"
              name="invoiceDueDays"
              min={0}
              value={form.invoiceDueDays}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Number of days after invoice date before payment is due.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Invoice Footer Text
            </label>
            <textarea
              name="invoiceFooterText"
              value={form.invoiceFooterText}
              onChange={onChange}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Internal Notes / Instructions
            </label>
            <textarea
              name="invoiceNotes"
              value={form.invoiceNotes}
              onChange={onChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Payment instructions, bank details, etc."
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Can be used in printed or emailed invoices, depending on your
              template.
            </p>
          </div>
        </div>

        {/* Right side: simple preview */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
          <h3 className="font-semibold text-gray-900 mb-3">
            Preview (example)
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2 shadow-sm">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Invoice</span>
              <span>#{form.invoicePrefix || "INV"}-000045</span>
            </div>
            <div className="text-xs text-gray-500">
              <div>Issue Date: 2025-01-01</div>
              <div>
                Due Date: 2025-01-01 + {form.invoiceDueDays || 0} days
              </div>
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="h-16 bg-gray-50 rounded-md border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
              Line items…
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="text-xs text-gray-500">
              {form.invoiceFooterText}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 mt-3">
            Actual invoice templates and PDF layout are controlled by the
            reporting configuration and billing module.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Tabs + Subtab metadata                                             */
/* ------------------------------------------------------------------ */

const MAIN_TABS = [
  { id: "system", label: "System & Organization", icon: HiOutlineCog },
  { id: "access", label: "Access & Security", icon: HiOutlineLockClosed },
  { id: "lab_finance", label: "Lab Operations & Finance", icon: HiOutlineBeaker },
];

const USER_SUBTABS = [
  { id: "staff", label: "Staff Accounts" },
  { id: "roles", label: "Roles & Permissions" },
];

const SECURITY_SUBTABS = [
  { id: "password", label: "Password Policy" },
  { id: "reset", label: "Password Management" },
  { id: "audit", label: "Audit Trail" },
];

const INTEGRATIONS_SUBTABS = [
  { id: "instruments", label: "Instruments" },
  { id: "ingest_events", label: "Ingest Events" },
];

/* ------------------------------------------------------------------ */
/* MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

const SettingsPage = () => {
  const { settings, loading, updateSettings } = useContext(SettingsContext);

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
    } catch {
      // ignore
    }
  };

  const [activeSectionId, setActiveSectionId] = useState(
    getLS("admin.activeSection", null) || null
  );
  const [activeMainTab, setActiveMainTab] = useState(
    getLS("admin.activeMainTab", "system")
  );
  const [activeUserSubTab, setActiveUserSubTab] = useState(
    getLS("admin.userSubTab", "staff")
  );
  const [activeSecuritySubTab, setActiveSecuritySubTab] = useState(
    getLS("admin.securitySubTab", "password")
  );
  const [activeIntegrationsSubTab, setActiveIntegrationsSubTab] = useState(
    getLS("admin.integrationsSubTab", "instruments")
  );
  const [searchQuery, setSearchQuery] = useState("");

  /* ---------- content builders (use subtab state and helpers) ---------- */

  const renderUserManagement = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <SubtabPills
          tabs={USER_SUBTABS}
          active={activeUserSubTab}
          onChange={setActiveUserSubTab}
        />
        </div>
      <div className="mt-4">
        {activeUserSubTab === "staff" && <StaffManagementPage />}
        {activeUserSubTab === "roles" && <RoleManager />}
      </div>
    </>
  );

  const renderSecurity = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <SubtabPills
          tabs={SECURITY_SUBTABS}
          active={activeSecuritySubTab}
          onChange={setActiveSecuritySubTab}
        />
      </div>
      <div className="mt-4">
        {activeSecuritySubTab === "password" && (
          <SecuritySettingsForm settings={settings} onUpdate={updateSettings} />
        )}
        {activeSecuritySubTab === "reset" && (
          <PlaceholderContent title="Password Management" />
        )}
        {activeSecuritySubTab === "audit" && <AuditLogPage />}
      </div>
    </>
  );

  const renderIntegrations = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <SubtabPills
          tabs={INTEGRATIONS_SUBTABS}
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

  /* ---------- card config ---------- */

  const settingsItems = useMemo(
    () => [
      // SYSTEM & ORGANIZATION
      {
        tab: "system",
        id: "system_management",
        label: "General Settings",
        icon: HiOutlineCog,
        desc: "Core app configuration, lab profile, and system behavior.",
        component: () => (
          <SystemSettingsForm settings={settings} onUpdate={updateSettings} />
        ),
      },
      {
        tab: "system",
        id: "branding",
        label: "Branding & Login UI",
        icon: HiOutlineColorSwatch,
        desc: "Login screen, sidebar title, and visuals.",
        component: BrandingSettingsPanel,
      },
      {
        tab: "system",
        id: "report_layout",
        label: "Report & Certificate Layout",
        icon: HiOutlineColorSwatch,
        desc: "Configure report templates, logos, and signatures.",
        component: ReportCustomizer,
      },
      {
        tab: "system",
        id: "organization",
        label: "Organization Profile",
        icon: HiOutlineOfficeBuilding,
        desc: "Company details, addresses, and contact information.",
        component: () => (
          <PlaceholderContent
            title="Organization Profile"
            note="Use the Lab Profile section in General Settings for now."
          />
        ),
      },
      {
        tab: "system",
        id: "identifiers",
        label: "Identifiers (MRN / Lab ID)",
        icon: HiOutlineInformationCircle,
        desc: "Prefixes, counters, and formatting for IDs.",
        component: MRNSettingsPanel,
      },

      // ACCESS & SECURITY
      {
        tab: "access",
        id: "user_management",
        label: "User & Role Management",
        icon: HiOutlineUsers,
        desc: "Manage staff accounts, roles, and permissions.",
        component: renderUserManagement,
      },
      {
        tab: "access",
        id: "security",
        label: "Security Policies",
        icon: HiOutlineLockClosed,
        desc: "Password policies, login rules, and audit trails.",
        component: renderSecurity,
      },
      {
        tab: "access",
        id: "database",
        label: "Backup & Database",
        icon: HiOutlineDatabase,
        desc: "Database backups and maintenance tools.",
        component: DatabaseManager,
      },

      // LAB OPERATIONS & FINANCE
      {
        tab: "lab_finance",
        id: "lab_config",
        label: "Lab Configuration",
        icon: HiOutlineBeaker,
        desc: "Panels, analytes, units, sample types, and departments.",
        component: () => <LabConfigDashboard />,
      },
      {
        tab: "lab_finance",
        id: "integrations",
        label: "Instrument Integration",
        icon: HiOutlineLink,
        desc: "Connect analyzers and manage data ingestion.",
        component: renderIntegrations,
      },
      {
        tab: "lab_finance",
        id: "invoice_layout",
        label: "Invoice Layout & Rules",
        icon: HiOutlineCreditCard,
        desc: "Invoice numbering, due dates, and footer notes.",
        component: InvoiceSettingsPanel,
      },
      {
        tab: "lab_finance",
        id: "billing",
        label: "Billing & Pricing",
        icon: HiOutlineCreditCard,
        desc: "Pricing, billing rules, and revenue settings.",
        component: BillingManager,
      },
      {
        tab: "lab_finance",
        id: "monitoring",
        label: "System Monitoring",
        icon: HiOutlineDesktopComputer,
        desc: "System health, performance, and usage.",
        component: () => <PlaceholderContent title="System Monitoring" />,
      },
      {
        tab: "lab_finance",
        id: "notifications",
        label: "Notifications & Alerts",
        icon: HiOutlineBell,
        desc: "Email / SMS alerts and delivery rules.",
        component: () => (
          <PlaceholderContent title="Notifications & Alerts" />
        ),
      },
    ],
    [
      settings,
      updateSettings,
      activeUserSubTab,
      activeSecuritySubTab,
      activeIntegrationsSubTab,
    ]
  );

  /* ---------- localStorage persistence ---------- */

  useEffect(() => {
    setActiveSectionId(null);
    setSearchQuery("");
    setLS("admin.activeMainTab", activeMainTab);
  }, [activeMainTab]);

  useEffect(() => {
    setLS("admin.activeSection", activeSectionId || "");
  }, [activeSectionId]);

  useEffect(() => {
    setLS("admin.userSubTab", activeUserSubTab);
  }, [activeUserSubTab]);

  useEffect(() => {
    setLS("admin.securitySubTab", activeSecuritySubTab);
  }, [activeSecuritySubTab]);

  useEffect(() => {
    setLS("admin.integrationsSubTab", activeIntegrationsSubTab);
  }, [activeIntegrationsSubTab]);

  /* ---------- active view ---------- */

  const activeTabMeta = MAIN_TABS.find((t) => t.id === activeMainTab);
  const tabItems = settingsItems.filter((s) => s.tab === activeMainTab);

  const currentItems = useMemo(() => {
    if (!searchQuery.trim()) return tabItems;
    const q = searchQuery.toLowerCase();
    return tabItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    );
  }, [tabItems, searchQuery]);

  const currentSectionMeta = settingsItems.find(
    (s) => s.id === activeSectionId
  );

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
        {SectionComponent && <SectionComponent />}
      </div>
    );
  };

  /* ---------- render ---------- */

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Top Page Header */}
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-gray-900">
          System Administration
        </h1>
        <p className="text-gray-600 mt-1">
          Configure users, tests, security, identifiers, integrations, branding,
          reports, and invoices for your laboratory.
        </p>

        {/* Breadcrumbs */}
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span>Admin</span>
          <span>/</span>
          <span>System Administration</span>
          {activeTabMeta && (
            <>
              <span>/</span>
              <span>{activeTabMeta.label}</span>
            </>
          )}
          {activeSectionId && currentSectionMeta && (
            <>
              <span>/</span>
              <span className="font-medium text-gray-700">
                {currentSectionMeta.label}
              </span>
            </>
          )}
        </div>
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

      {/* Main content area */}
      <div className="mt-6 px-6 pb-8">
        <div className="grid [grid-template-areas:'stack']">
          {/* VIEW 1: GRID DASHBOARD */}
          <div
            className={`[grid-area:stack] transition-all duration-300 ease-in-out ${
              activeSectionId
                ? "opacity-0 scale-95 pointer-events-none"
                : "opacity-100 scale-100 delay-150"
            }`}
          >
            {/* Search bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pl-3 pr-3 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Cards */}
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
              {currentItems.length === 0 && (
                <div className="col-span-full text-sm text-gray-500">
                  No settings matched your search.
                </div>
              )}
            </div>
          </div>

          {/* VIEW 2: FOCUSED SECTION */}
          <div
            className={`[grid-area:stack] transition-all duration-300 ease-in-out ${
              activeSectionId
                ? "opacity-100 scale-100 delay-150"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
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