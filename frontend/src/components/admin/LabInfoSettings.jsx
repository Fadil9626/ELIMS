import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Upload, Save, Building2, Phone, Mail, MapPin, Loader2, Type, AlertTriangle } from "lucide-react";

const API_BASE = "http://localhost:5000";

// ==================================================================
// API WRAPPER
// ==================================================================
const apiFetch = async (url, options = {}) => {
  let token = "";
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    token = raw ? JSON.parse(raw).token : "";
  } catch {}

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
  };

  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

  const res = await fetch(fullUrl, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    try {
      const err = JSON.parse(text);
      throw new Error(err.message || text);
    } catch {
      throw new Error(text || `API Error ${res.status}`);
    }
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
};

// ==================================================================
// SETTINGS SERVICE (MATCHES YOUR BACKEND EXACTLY)
// ==================================================================
const settingsService = {
  getLabProfile: () => apiFetch("/api/settings/lab-profile"),

  saveLabProfile: (data) =>
    apiFetch("/api/settings/lab-profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getLoginBranding: () => apiFetch("/api/settings/branding/login"),

  saveLoginBranding: (data) =>
    apiFetch("/api/settings/branding/login", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadLightLogo: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch("/api/settings/lab-profile/logo/light", {
      method: "POST",
      body: fd,
    });
  },

  uploadDarkLogo: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch("/api/settings/lab-profile/logo/dark", {
      method: "POST",
      body: fd,
    });
  },

  uploadLoginLogo: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch("/api/settings/branding/login/logo", {
      method: "POST",
      body: fd,
    });
  },
};

// ==================================================================
const Label = ({ children, icon: Icon }) => (
  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
    {Icon && <Icon size={16} className="text-blue-600" />}
    {children}
  </label>
);

const getImgUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

// ==================================================================
// COMPONENT
// ==================================================================
export default function LabInfoSettings() {
  const [profile, setProfile] = useState({
    lab_name: "",
    lab_address: "",
    lab_phone: "",
    lab_email: "",
    logo_light: "",
    logo_dark: "",
    login_logo_url: "",
    login_title: "",
    login_subtitle: "",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({
    light: false,
    dark: false,
    login: false,
  });

  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // ==================================================================
  // LOAD SETTINGS
  // ==================================================================
  useEffect(() => {
    const load = async () => {
      try {
        const [lab, login] = await Promise.all([
          settingsService.getLabProfile(),
          settingsService.getLoginBranding(),
        ]);

        setProfile({
          lab_name: lab.lab_name || "",
          lab_address: lab.lab_address || "",
          lab_phone: lab.lab_phone || "",
          lab_email: lab.lab_email || "",
          logo_light: lab.logo_light || lab.lab_logo_light || "",
          logo_dark: lab.logo_dark || lab.lab_logo_dark || "",
          login_logo_url: login.logo_url || "",
          login_title: login.title || "",
          login_subtitle: login.subtitle || "",
        });
      } catch (e) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const onChange = (key, value) =>
    setProfile((p) => ({ ...p, [key]: value }));

  // ==================================================================
  // SAVE HANDLER
  // ==================================================================
  const handleSave = async () => {
    setShowConfirm(false);
    setSaving(true);

    const toastId = toast.loading("Saving settings...");

    try {
      await settingsService.saveLabProfile({
        lab_name: profile.lab_name,
        lab_address: profile.lab_address,
        lab_phone: profile.lab_phone,
        lab_email: profile.lab_email,
      });

      await settingsService.saveLoginBranding({
        title: profile.login_title,
        subtitle: profile.login_subtitle,
      });

      toast.success("Settings updated!", { id: toastId });
    } catch (e) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ==================================================================
  // UPLOAD HANDLER
  // ==================================================================
  const handleUpload = async (file, target) => {
    if (!file) return;

    setUploading((u) => ({ ...u, [target]: true }));

    let toastId = toast.loading("Uploading...");

    try {
      let res;

      if (target === "light") {
        res = await settingsService.uploadLightLogo(file);
        setProfile((p) => ({ ...p, logo_light: res.value || res.logo_url }));
      }

      if (target === "dark") {
        res = await settingsService.uploadDarkLogo(file);
        setProfile((p) => ({ ...p, logo_dark: res.value || res.logo_url }));
      }

      if (target === "login") {
        res = await settingsService.uploadLoginLogo(file);
        setProfile((p) => ({ ...p, login_logo_url: res.value || res.logo_url }));
      }

      toast.success("Logo uploaded", { id: toastId });
    } catch (e) {
      toast.error(`Upload failed: ${e.message}`, { id: toastId });
    } finally {
      setUploading((u) => ({ ...u, [target]: false }));
    }
  };

  if (loading)
    return (
      <div className="p-6 text-center text-gray-500">
        Loading configuration...
      </div>
    );

  // ==================================================================
  // UI RENDER
  // ==================================================================
  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">System Configuration</h1>
          <p className="text-sm text-gray-500">
            Manage the report header and login branding.
          </p>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          disabled={saving}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />}
          Save All
        </button>
      </div>

      {/*  GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT PANEL - REPORT HEADER */}
        <div className="bg-white p-6 rounded-xl shadow border space-y-6">

          <h3 className="font-semibold text-lg border-b pb-2">
            Report Header
          </h3>

          <div>
            <Label icon={Building2}>Lab Name</Label>
            <input
              value={profile.lab_name}
              onChange={(e) => onChange("lab_name", e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div>
            <Label icon={MapPin}>Address</Label>
            <textarea
              rows={2}
              value={profile.lab_address}
              onChange={(e) => onChange("lab_address", e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label icon={Phone}>Phone</Label>
              <input
                value={profile.lab_phone}
                onChange={(e) => onChange("lab_phone", e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <div>
              <Label icon={Mail}>Email</Label>
              <input
                value={profile.lab_email}
                onChange={(e) => onChange("lab_email", e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
          </div>

          {/* Logos */}
          <div className="grid grid-cols-2 gap-6">

            {/* Light Logo */}
            <div>
              <Label>Primary Logo (Left)</Label>
              <div className="relative bg-gray-50 border rounded-lg aspect-square flex items-center justify-center overflow-hidden">
                {profile.logo_light ? (
                  <img src={getImgUrl(profile.logo_light)} className="object-contain p-2" />
                ) : (
                  <span className="text-xs text-gray-400">No logo</span>
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleUpload(e.target.files[0], "light")}
                />
                {uploading.light && <Loader2 className="absolute animate-spin text-blue-600" />}
              </div>
            </div>

            {/* Dark Logo */}
            <div>
              <Label>Secondary Logo (Right)</Label>
              <div className="relative bg-gray-50 border rounded-lg aspect-square flex items-center justify-center overflow-hidden">
                {profile.logo_dark ? (
                  <img src={getImgUrl(profile.logo_dark)} className="object-contain p-2" />
                ) : (
                  <span className="text-xs text-gray-400">No logo</span>
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleUpload(e.target.files[0], "dark")}
                />
                {uploading.dark && <Loader2 className="absolute animate-spin text-blue-600" />}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - LOGIN BRANDING */}
        <div className="bg-white p-6 rounded-xl shadow border space-y-6">

          <h3 className="font-semibold text-lg border-b pb-2">Login Branding</h3>

          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 rounded-full border border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
              {profile.login_logo_url ? (
                <img src={getImgUrl(profile.login_logo_url)} className="object-cover" />
              ) : (
                <Upload className="text-gray-400 w-8 h-8" />
              )}
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => handleUpload(e.target.files[0], "login")}
              />
              {uploading.login && <Loader2 className="absolute animate-spin text-purple-600" />}
            </div>
            <p className="text-xs text-gray-500 mt-1">Login Logo</p>
          </div>

          <div>
            <Label icon={Type}>Login Title</Label>
            <input
              value={profile.login_title}
              onChange={(e) => onChange("login_title", e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Example: Welcome to ELIMS"
            />
          </div>

          <div>
            <Label icon={Type}>Login Subtitle</Label>
            <input
              value={profile.login_subtitle}
              onChange={(e) => onChange("login_subtitle", e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Example: Please log in"
            />
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center">

            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-semibold mb-1">Confirm Save</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will apply branding changes across the whole system.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
