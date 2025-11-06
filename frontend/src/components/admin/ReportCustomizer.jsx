import React, { useState, useEffect, useContext } from "react";
import settingsService from "../../services/settingsService";
import { SettingsContext } from "../../context/SettingsContext";

const ReportCustomizer = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const [labName, setLabName] = useState("");
  const [labAddress, setLabAddress] = useState("");
  const [labPhone, setLabPhone] = useState("");
  const [labEmail, setLabEmail] = useState("");
  const [logoLight, setLogoLight] = useState("");
  const [logoDark, setLogoDark] = useState("");

  const API_BASE_URL = "http://localhost:5000";

  useEffect(() => {
    if (!settings) return;
    setLabName(settings.lab_name || "");
    setLabAddress(settings.lab_address || "");
    setLabPhone(settings.lab_phone || "");
    setLabEmail(settings.lab_email || "");
    setLogoLight(settings.lab_logo_light || "");
    setLogoDark(settings.lab_logo_dark || "");
  }, [settings]);

  const handleSaveText = () => {
    updateSettings({
      lab_name: labName,
      lab_address: labAddress,
      lab_phone: labPhone,
      lab_email: labEmail,
    });
  };

  const handleLogoUpload = async (e, logoType) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

    const uploadFn =
      logoType === "light"
        ? settingsService.uploadLabLogoLight
        : settingsService.uploadLabLogoDark;

    const key = logoType === "light" ? "lab_logo_light" : "lab_logo_dark";

    try {
      const result = await uploadFn(file, token);
      updateSettings({ [key]: result[key] });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Report & Invoice Branding</h2>

      {/* Header Preview */}
      <div className="border rounded-lg p-4 mb-6">
        <h3 className="text-lg text-center text-gray-600 mb-3 font-semibold">
          Live Header Preview
        </h3>

        <div className="flex items-center justify-between p-4 border-b">
          {logoLight ? (
            <img
              src={`${API_BASE_URL}${logoLight}?t=${Date.now()}`}
              className="h-20 max-w-[180px] object-contain"
            />
          ) : (
            <div className="h-20 w-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
              Primary Logo
            </div>
          )}

          <div className="text-center flex-grow mx-4">
            <p className="font-bold text-2xl">{labName || "Your Lab Name"}</p>
            <p className="text-sm text-gray-700">
              {labAddress || "123 Lab Street, Freetown"}
            </p>
            <p className="text-sm text-gray-600">
              Contact: {labPhone || "+123 456 7890"} | {labEmail || "email@lab.com"}
            </p>
          </div>

          {logoDark ? (
            <img
              src={`${API_BASE_URL}${logoDark}?t=${Date.now()}`}
              className="h-20 max-w-[180px] object-contain"
            />
          ) : (
            <div className="h-20 w-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
              Secondary Logo
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <input
          value={labName}
          onChange={(e) => setLabName(e.target.value)}
          placeholder="Lab Name"
          className="w-full p-2 border rounded-md"
        />

        <input
          value={labAddress}
          onChange={(e) => setLabAddress(e.target.value)}
          placeholder="Lab Address"
          className="w-full p-2 border rounded-md"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={labPhone}
            onChange={(e) => setLabPhone(e.target.value)}
            placeholder="Lab Phone"
            className="w-full p-2 border rounded-md"
          />
          <input
            value={labEmail}
            onChange={(e) => setLabEmail(e.target.value)}
            placeholder="Lab Email"
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="block mb-1 font-medium">Primary Logo (Light)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e, "light")}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Secondary Logo (Dark)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e, "dark")}
            />
          </div>
        </div>

        <div className="text-right pt-4 border-t">
          <button
            onClick={handleSaveText}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-semibold"
          >
            Save Branding Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportCustomizer;
