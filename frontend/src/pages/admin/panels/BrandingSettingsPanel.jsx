// src/pages/admin/panels/BrandingSettingsPanel.jsx
import React, { useEffect, useState } from "react";
import settingsService from "../../../services/settingsService";

export default function BrandingSettingsPanel() {
  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token;

  const [form, setForm] = useState({
    sidebarTitle: "",
    loginTitle: "",
    loginSubtitle: "",
    loginFooter: "",
    logo: "",
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await settingsService.getLoginBranding(token);
    setForm({
      sidebarTitle: res.title || "ELIMS",
      loginTitle: res.title,
      loginSubtitle: res.subtitle,
      loginFooter: res.footer,
      logo: res.logo_url,
    });
  };

  const save = async () => {
    setSaving(true);

    await settingsService.updateLoginBranding(
      {
        title: form.loginTitle,
        subtitle: form.loginSubtitle,
        footer: form.loginFooter,
      },
      token
    );

    setSaving(false);
    setMsg("Branding updated.");
  };

  useEffect(() => load(), []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Branding Configuration</h2>

      {msg && <p className="text-green-600">{msg}</p>}

      <div className="space-y-4 max-w-md">
        <input
          className="input"
          placeholder="Sidebar Title"
          value={form.sidebarTitle}
          onChange={(e) => setForm({ ...form, sidebarTitle: e.target.value })}
        />

        <input
          className="input"
          placeholder="Login Title"
          value={form.loginTitle}
          onChange={(e) => setForm({ ...form, loginTitle: e.target.value })}
        />

        <input
          className="input"
          placeholder="Subtitle"
          value={form.loginSubtitle}
          onChange={(e) => setForm({ ...form, loginSubtitle: e.target.value })}
        />

        <textarea
          className="input"
          placeholder="Footer"
          value={form.loginFooter}
          onChange={(e) => setForm({ ...form, loginFooter: e.target.value })}
        />

        {/* TODO: File upload later */}
      </div>

      <button className="btn-primary mt-6" disabled={saving} onClick={save}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
