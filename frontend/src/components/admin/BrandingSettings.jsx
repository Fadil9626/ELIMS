import React, { useEffect, useState, useMemo } from "react";
import settingsService from "../../services/settingsService";
import { toast } from "react-hot-toast";

// Icons
import { HiOutlineUpload, HiCheckCircle, HiSwatch, HiPhotograph } from "react-icons/hi";

const FileCard = ({ title, description, currentImage, onUpload }) => {
  const fileInput = useMemo(() => React.createRef(), []);

  const handleChange = async (e) => {
    if (!e.target.files?.[0]) return;
    try {
      await onUpload(e.target.files[0]);
      toast.success(`${title} updated`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 rounded-xl border shadow-sm bg-white hover:shadow-md transition">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <button
          onClick={() => fileInput.current.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          <HiOutlineUpload className="w-4 h-4" />
          Upload
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-3">{description}</p>

      {currentImage ? (
        <img
          src={currentImage}
          alt={`${title} preview`}
          className="w-full h-28 object-contain rounded-md ring-1 ring-gray-300 bg-gray-50"
        />
      ) : (
        <div className="w-full h-28 rounded-md flex items-center justify-center text-gray-400 border border-dashed">
          No Image
        </div>
      )}

      <input type="file" className="hidden" ref={fileInput} onChange={handleChange} />
    </div>
  );
};

export default function BrandingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    system_app_title: "",
    system_login_title: "",
    system_login_subtitle: "",
    theme_primary_color: "#1E40FF",
    theme_mode: "light",
    system_login_logo_url: "",
    system_sidebar_logo_url: "",
    system_report_logo_url: "",
    system_report_signature_url: "",
  });

  const token = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"))?.token;
    } catch {
      return null;
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await settingsService.getSettings(token);
      setForm((f) => ({ ...f, ...resp }));
    } catch (err) {
      toast.error("Failed loading settings");
    } finally {
      setLoading(false);
    }
  };

  const saveBranding = async () => {
    try {
      setSaving(true);
      await settingsService.updateBranding(form, token);
      toast.success("Branding updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Upload handlers
  const uploadLoginLogo = (file) => settingsService.uploadLoginLogo(file, token).then(fetchData);
  const uploadSidebarLogo = (file) => settingsService.uploadSidebarLogo(file, token).then(fetchData);
  const uploadReportLogo = (file) => settingsService.uploadReportLogo(file, token).then(fetchData);
  const uploadReportSignature = (file) => settingsService.uploadReportSignature(file, token).then(fetchData);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading)
    return <div className="p-6 animate-pulse text-gray-500">Loading branding settings...</div>;

  return (
    <div className="space-y-8 p-4">
      {/* Titles + Theme */}
      <div className="p-5 bg-white rounded-xl border shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Branding & UI Identity</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Application Title"
            value={form.system_app_title}
            onChange={(e) => setForm({ ...form, system_app_title: e.target.value })}
            className="border rounded-lg px-3 py-2 w-full"
          />
          <input
            type="text"
            placeholder="Login Page Title"
            value={form.system_login_title}
            onChange={(e) => setForm({ ...form, system_login_title: e.target.value })}
            className="border rounded-lg px-3 py-2 w-full"
          />
          <input
            type="text"
            placeholder="Login Subtitle"
            value={form.system_login_subtitle}
            onChange={(e) => setForm({ ...form, system_login_subtitle: e.target.value })}
            className="border rounded-lg px-3 py-2 w-full"
          />

          {/* Primary Color */}
          <div className="flex items-center gap-3">
            <label className="text-gray-600">Primary Theme Color:</label>
            <input
              type="color"
              value={form.theme_primary_color}
              onChange={(e) => setForm({ ...form, theme_primary_color: e.target.value })}
              className="h-10 w-10 cursor-pointer border rounded"
            />
          </div>

          {/* Theme Mode */}
          <select
            value={form.theme_mode}
            onChange={(e) => setForm({ ...form, theme_mode: e.target.value })}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="light">Light Mode</option>
            <option value="dark">Dark Mode</option>
            <option value="auto">Auto (System Match)</option>
          </select>
        </div>

        <button
          onClick={saveBranding}
          disabled={saving}
          className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Upload Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <FileCard
          title="Login Screen Logo"
          description="Shown on login page"
          currentImage={form.system_login_logo_url}
          onUpload={uploadLoginLogo}
        />

        <FileCard
          title="Sidebar Logo"
          description="Displayed on application sidebar"
          currentImage={form.system_sidebar_logo_url}
          onUpload={uploadSidebarLogo}
        />

        <FileCard
          title="Report Header Logo"
          description="Appears on printed reports"
          currentImage={form.system_report_logo_url}
          onUpload={uploadReportLogo}
        />

        <FileCard
          title="Digital Signature"
          description="Printed on lab reports"
          currentImage={form.system_report_signature_url}
          onUpload={uploadReportSignature}
        />
      </div>
    </div>
  );
}
