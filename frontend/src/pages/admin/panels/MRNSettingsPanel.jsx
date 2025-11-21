import React, { useEffect, useMemo, useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";

const MRNSettingsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token || "";

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
    const num = String(form.nextNumber).padStart(form.padding, "0");
    return `${form.prefix}${form.separator}${num}`;
  }, [form]);

  const previewLabId = useMemo(() => {
    const num = String(form.labIdNextNumber).padStart(form.labIdPadding, "0");
    return `${form.labIdPrefix}${form.labIdSeparator}${num}`;
  }, [form]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch("/api/settings/mrn", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unable to load settings");
      setForm(await res.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setErr("");
      const res = await fetch("/api/settings/mrn", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Unable to save settings");
      setOk("✔ Settings saved successfully");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center mb-4">
        <HiOutlineInformationCircle className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-lg font-semibold">Identifiers (MRN & Lab ID)</h2>
      </div>

      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
      {ok && <p className="text-green-600 text-sm mb-2">{ok}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            {/* MRN */}
            <div>
              <h3 className="font-medium mb-2">MRN Format</h3>
              <div className="space-y-3">
                <input
                  name="prefix"
                  value={form.prefix}
                  onChange={onChange}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="MRN Prefix"
                />
                <input
                  name="separator"
                  value={form.separator}
                  onChange={onChange}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Separator"
                />
                <input
                  type="number"
                  name="padding"
                  value={form.padding}
                  onChange={onChange}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Zero Padding"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Preview: <code className="bg-gray-100 px-2 py-1 rounded">{previewMRN}</code>
              </p>
            </div>

            {/* LAB ID */}
            <div>
              <h3 className="font-medium mb-2">Lab ID Format</h3>
              <div className="space-y-3">
                <input
                  name="labIdPrefix"
                  value={form.labIdPrefix}
                  onChange={onChange}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Lab Prefix"
                />
                <input
                  name="labIdSeparator"
                  value={form.labIdSeparator}
                  onChange={onChange}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Separator"
                />
                <input
                  type="number"
                  name="labIdPadding"
                  value={form.labIdPadding}
                  onChange={onChange}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Zero Padding"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Preview:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">{previewLabId}</code>
              </p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            className="mt-6 bg-blue-600 text-white px-5 py-2 rounded-lg"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </>
      )}
    </div>
  );
};

export default MRNSettingsPanel;
