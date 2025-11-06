import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import settingsService from "../../services/settingsService";

const emptyProfile = {
  lab_name: "",
  lab_address: "",
  lab_phone: "",
  lab_email: "",
  logo_url: "",
};

const Label = ({ children }) => (
  <label className="block text-gray-700 font-medium mb-1">{children}</label>
);

export default function LabInfoSettings() {
  const token = useMemo(
    () => JSON.parse(localStorage.getItem("userInfo"))?.token,
    []
  );

  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  // Load current profile
  useEffect(() => {
    (async () => {
      try {
        const data = await settingsService.getLabProfile(token);
        setProfile({
          lab_name: data?.lab_name || data?.name || "",
          lab_address: data?.lab_address || data?.address || "",
          lab_phone: data?.lab_phone || data?.phone || "",
          lab_email: data?.lab_email || data?.email || "",
          logo_url: data?.logo_url || data?.logo || "",
        });
      } catch (e) {
        toast.error(e.message || "Failed to load lab profile");
        setProfile(emptyProfile);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onChange = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    // basic sanity checks
    if (!profile.lab_name?.trim()) return toast.error("Lab name is required");
    if (profile.lab_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.lab_email))
      return toast.error("Invalid email address");

    setSaving(true);
    try {
      await settingsService.saveLabProfile(
        {
          lab_name: profile.lab_name.trim(),
          lab_address: profile.lab_address.trim(),
          lab_phone: profile.lab_phone.trim(),
          lab_email: profile.lab_email.trim(),
          logo_url: profile.logo_url || "",
        },
        token
      );
      toast.success("Lab profile saved");
    } catch (e) {
      toast.error(e.message || "Failed to save lab profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast.error("Please pick an image file");
    if (file.size > 3 * 1024 * 1024) return toast.error("Max logo size is 3 MB");

    setLogoFile(file);

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setProfile((p) => ({ ...p, logo_url: objectUrl }));

    // Upload to server
    setUploading(true);
    try {
      const { logo_url } = await settingsService.uploadLabLogo(file, token);
      setProfile((p) => ({ ...p, logo_url })); // set final URL from server
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error(e.message || "Logo upload failed");
      // Revert preview if server rejected
      setProfile((p) => ({ ...p, logo_url: "" }));
      setLogoFile(null);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-6">Loading lab info…</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-xl font-semibold mb-4">Laboratory Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: fields */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <Label>Lab Name</Label>
            <input
              type="text"
              value={profile.lab_name}
              onChange={(e) => onChange("lab_name", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="e.g., MediTrust Diagnostics"
            />
          </div>
          <div>
            <Label>Address</Label>
            <input
              type="text"
              value={profile.lab_address}
              onChange={(e) => onChange("lab_address", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Street, City"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Phone Number</Label>
              <input
                type="text"
                value={profile.lab_phone}
                onChange={(e) => onChange("lab_phone", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="+232 …"
              />
            </div>
            <div>
              <Label>Email</Label>
              <input
                type="email"
                value={profile.lab_email}
                onChange={(e) => onChange("lab_email", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="info@yourlab.com"
              />
            </div>
          </div>
        </div>

        {/* Right: Logo */}
        <div>
          <Label>Logo</Label>
          <div className="border rounded-md p-3 flex flex-col items-center gap-3">
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Lab Logo"
                className="w-28 h-28 object-contain"
              />
            ) : (
              <div className="w-28 h-28 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                No logo
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoSelect(e.target.files?.[0])}
              disabled={uploading}
            />
            {uploading && <div className="text-xs text-gray-500">Uploading…</div>}
          </div>
        </div>
      </div>

      <div className="mt-6 text-right">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 ${
            saving ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {saving ? "Saving…" : "Save Lab Info"}
        </button>
      </div>
    </div>
  );
}
