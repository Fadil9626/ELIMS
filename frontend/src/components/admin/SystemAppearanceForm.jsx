import React, { useState } from "react";
import settingsService from "../../services/settingsService";
import toast from "react-hot-toast";

const SystemAppearanceForm = ({ settings, reload }) => {
  const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

  const [form, setForm] = useState({
    theme_primary_color: settings?.theme_primary_color || "#2563eb",
    theme_accent_color: settings?.theme_accent_color || "#38bdf8",
    theme_mode: settings?.theme_mode || "light",
    theme_font_family: settings?.theme_font_family || "Inter",
    theme_sidebar_style: settings?.theme_sidebar_style || "classic",
    theme_button_style: settings?.theme_button_style || "rounded",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const save = async () => {
    try {
      await settingsService.updateBranding(form, token);
      toast.success("Appearance updated");
      reload();
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="space-y-6">
      {/* THEME MODE */}
      <div>
        <label className="font-medium">Theme Mode</label>
        <select name="theme_mode" value={form.theme_mode} onChange={onChange} className="input">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Automatic</option>
        </select>
      </div>

      {/* PRIMARY COLOR PICKER */}
      <div>
        <label className="font-medium">Primary Color</label>
        <input type="color" name="theme_primary_color" value={form.theme_primary_color} onChange={onChange} />
      </div>

      {/* ACCENT COLOR */}
      <div>
        <label className="font-medium">Accent Color</label>
        <input type="color" name="theme_accent_color" value={form.theme_accent_color} onChange={onChange} />
      </div>

      {/* BUTTON STYLE */}
      <div>
        <label className="font-medium">Button Style</label>
        <select name="theme_button_style" value={form.theme_button_style} onChange={onChange} className="input">
          <option value="rounded">Rounded</option>
          <option value="sharp">Sharp Corners</option>
          <option value="glass">Glassmorphism</option>
        </select>
      </div>

      {/* FONT */}
      <div>
        <label className="font-medium">Font Style</label>
        <select name="theme_font_family" value={form.theme_font_family} onChange={onChange} className="input">
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Nunito">Nunito</option>
          <option value="Poppins">Poppins</option>
        </select>
      </div>

      {/* SAVE */}
      <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">
        Save
      </button>
    </div>
  );
};

export default SystemAppearanceForm;
