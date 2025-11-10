import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-hot-toast";

const MRNSettingsPage: React.FC = () => {
  const { authedFetch } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    authedFetch("/api/settings/mrn")
      .then(setSettings)
      .catch(() => toast.error("Failed to load MRN settings"));
  }, [authedFetch]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await authedFetch("/api/settings/mrn", {
        method: "PUT",
        body: JSON.stringify(settings),
        headers: { "Content-Type": "application/json" },
      });
      toast.success("MRN settings saved successfully!");
    } catch {
      toast.error("Failed to save MRN settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-4 text-gray-600">Loading MRN settings...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">MRN Configuration</h3>

      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200 space-y-5">

        <div>
          <label className="block text-gray-700 font-medium mb-1">Facility Prefix</label>
          <input
            type="text"
            maxLength={10}
            value={settings.facility_code}
            onChange={(e) =>
              setSettings({ ...settings, facility_code: e.target.value.toUpperCase() })
            }
            className="border rounded-lg p-2 w-full focus:ring focus:ring-blue-300"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Last Sequence</label>
          <input
            type="number"
            value={settings.last_sequence}
            onChange={(e) =>
              setSettings({ ...settings, last_sequence: Number(e.target.value) })
            }
            className="border rounded-lg p-2 w-full focus:ring focus:ring-blue-300"
          />
        </div>

        <label className="flex items-center gap-2 text-gray-700">
          <input
            type="checkbox"
            checked={settings.reset_yearly}
            onChange={(e) =>
              setSettings({ ...settings, reset_yearly: e.target.checked })
            }
          />
          Reset Sequence Every Year
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default MRNSettingsPage;
