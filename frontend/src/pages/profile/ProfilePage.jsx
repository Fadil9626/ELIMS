// frontend/src/pages/profile/ProfilePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import userService from "../../services/userService";
import {
  HiOutlineUserCircle,
  HiPencil,
  HiCheck,
  HiX,
  HiOutlineLockClosed,
  HiOutlineIdentification,
  HiExclamationCircle,
  HiClipboardCopy,
  HiClipboardCheck,
  HiPhotograph,
  HiTrash,
  HiBadgeCheck,
  HiMail,
  HiUser,
  HiCalendar,
  HiLogin,
  HiOutlineKey,
} from "react-icons/hi";
import ChangePasswordModal from "../../components/profile/ChangePasswordModal";
import ApiKeyManager, { ApiKeyManager as NamedApiKeyManager } from "../../components/profile/ApiKeyManager"; // supports both default & named

/* ------------------------------ helpers ------------------------------ */
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "—");
const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v || "");
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/* Mapping of your role ids -> labels */
const ROLES = [
  { id: 1, name: "Super Administrator" },
  { id: 2, name: "Administrator" },
  { id: 3, name: "Pathologist" },
  { id: 4, name: "Receptionist" },
  { id: 5, name: "Doctor" },
  { id: 6, name: "Phlebotomist" },
];

function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "text-blue-700 bg-blue-50 ring-blue-200/80",
    gray: "text-gray-700 bg-gray-50 ring-gray-200/80",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="truncate text-sm font-semibold text-gray-900">{value || "—"}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ component ------------------------------ */
const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("info"); // info | professional | security | keys

  // core profile
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: "none", msg: "" });

  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "" });
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);

  // professional
  const [proLoading, setProLoading] = useState(false);
  const [proSaving, setProSaving] = useState(false);
  const [pro, setPro] = useState({
    title: "",
    credentials: "",
    license_number: "",
    license_state: "",
    license_expiry: "",
    specialization: "",
    signature_image_url: "",
    show_on_reports: true,
  });
  const [proOrig, setProOrig] = useState(null);

  // modals & inputs
  const [pwdOpen, setPwdOpen] = useState(false);
  const fileInputRef = useRef(null);

  const token = useMemo(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    return userInfo ? userInfo.token : null;
  }, []);

  const roleName = useMemo(
    () => ROLES.find((r) => r.id === profile?.role_id)?.name || "Unknown Role",
    [profile?.role_id]
  );

  const avatarSrc = profile?.profile_image_url ? `${API_BASE_URL}${profile.profile_image_url}` : null;
  const signatureSrc = pro?.signature_image_url ? `${API_BASE_URL}${pro.signature_image_url}` : null;

  const personalDirty =
    profile &&
    (formData.fullName !== (profile.full_name || "") || formData.email !== (profile.email || ""));

  const proDirty = useMemo(() => {
    if (!proOrig) return false;
    const keys = Object.keys(proOrig);
    return keys.some((k) => String(pro[k] ?? "") !== String(proOrig[k] ?? ""));
  }, [pro, proOrig]);

  /* --------------------------- load initial data --------------------------- */
  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await userService.getProfile(token);
      setProfile(data);
      setFormData({ fullName: data.full_name || "", email: data.email || "" });
    } catch (e) {
      setBanner({ type: "error", msg: e.message || "Failed to load profile" });
    } finally {
      setLoading(false);
    }
  };

  const loadProfessional = async () => {
    setProLoading(true);
    try {
      const data = await userService.getProfessionalProfile(token); // 200 or 404
      const next = {
        title: data.title || "",
        credentials: data.credentials || "",
        license_number: data.license_number || "",
        license_state: data.license_state || "",
        license_expiry: data.license_expiry || "",
        specialization: data.specialization || "",
        signature_image_url: data.signature_image_url || "",
        show_on_reports: typeof data.show_on_reports === "boolean" ? data.show_on_reports : true,
      };
      setPro(next);
      setProOrig(next);
    } catch {
      // fresh users: keep defaults
      const next = { ...pro };
      setProOrig(next);
    } finally {
      setProLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadProfessional();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ validation ------------------------------ */
  const validatePersonal = () => {
    const next = {};
    if (!formData.fullName.trim()) next.fullName = "Full name is required.";
    if (!formData.email.trim()) next.email = "Email is required.";
    else if (!emailOk(formData.email)) next.email = "Please enter a valid email.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validatePro = () => {
    if (!pro.license_expiry) return true;
    try {
      const d = new Date(pro.license_expiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) {
        setBanner({ type: "error", msg: "License expiry cannot be in the past." });
        setTimeout(() => setBanner({ type: "none", msg: "" }), 3000);
        return false;
      }
      return true;
    } catch {
      setBanner({ type: "error", msg: "Invalid license expiry date." });
      setTimeout(() => setBanner({ type: "none", msg: "" }), 3000);
      return false;
    }
  };

  /* -------------------------------- actions -------------------------------- */
  const savePersonal = async () => {
    if (!validatePersonal()) return;
    try {
      await userService.updateProfile({ fullName: formData.fullName, email: formData.email }, token);
      setIsEditMode(false);
      setBanner({ type: "success", msg: "Profile updated successfully." });
      await loadProfile();
    } catch (err) {
      setBanner({ type: "error", msg: err.message || "Failed to update profile." });
    } finally {
      setTimeout(() => setBanner({ type: "none", msg: "" }), 3500);
    }
  };

  const handlePictureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await userService.uploadProfilePicture(file, token);
      setBanner({ type: "success", msg: "Profile picture updated." });
      await loadProfile();
    } catch (error) {
      setBanner({ type: "error", msg: error.message || "Failed to upload picture." });
    } finally {
      event.target.value = "";
      setTimeout(() => setBanner({ type: "none", msg: "" }), 3000);
    }
  };

  const saveProfessional = async () => {
    if (!validatePro()) return;
    setProSaving(true);
    try {
      await userService.updateProfessionalProfile(
        {
          title: pro.title,
          credentials: pro.credentials,
          license_number: pro.license_number,
          license_state: pro.license_state,
          license_expiry: pro.license_expiry || null,
          specialization: pro.specialization,
          show_on_reports: !!pro.show_on_reports,
        },
        token
      );
      setBanner({ type: "success", msg: "Professional profile saved." });
      setProOrig({ ...pro });
    } catch (e) {
      setBanner({ type: "error", msg: e.message || "Failed to save professional profile." });
    } finally {
      setProSaving(false);
      setTimeout(() => setBanner({ type: "none", msg: "" }), 3000);
    }
  };

  const uploadSignature = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resp = await userService.uploadSignature(file, token);
      setPro((prev) => ({ ...prev, signature_image_url: resp.signature_image_url }));
      setBanner({ type: "success", msg: "Signature uploaded." });
    } catch (err) {
      setBanner({ type: "error", msg: err.message || "Failed to upload signature." });
    } finally {
      e.target.value = "";
      setTimeout(() => setBanner({ type: "none", msg: "" }), 2500);
    }
  };

  const removeSignature = () => {
    setPro((p) => ({ ...p, signature_image_url: "" }));
    setBanner({ type: "success", msg: "Signature removed." });
    setTimeout(() => setBanner({ type: "none", msg: "" }), 2000);
  };

  /* -------------------------------- renderers ------------------------------- */
  if (loading && !profile) return <div className="p-6">Loading profile…</div>;
  if (!profile) return <div className="p-6">Could not load profile data.</div>;

  const reportDisplayName = [profile.full_name, pro.credentials].filter(Boolean).join(", ");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">Account Settings</h1>
      <p className="text-gray-600 mb-4">Manage your personal info, professional details, and security.</p>

      {banner.type !== "none" && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            banner.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {banner.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* LEFT RAIL */}
          <aside className="md:w-64">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-white shadow">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <HiOutlineUserCircle className="w-full h-full text-gray-300" />
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePictureUpload}
                className="hidden"
                accept="image/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white text-sm px-3 py-1.5 hover:bg-blue-700"
                title="Upload new picture"
              >
                <HiPhotograph className="w-4 h-4" />
                Upload
              </button>
            </div>

            <nav className="mt-6 space-y-2">
              {[
                { id: "info", label: "Personal Info", icon: HiOutlineIdentification },
                { id: "professional", label: "Identity & Professional", icon: HiBadgeCheck },
                { id: "security", label: "Security", icon: HiOutlineLockClosed },
                { id: "keys", label: "API Keys", icon: HiOutlineKey },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-2 ${
                    activeTab === t.id
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  <t.icon className="h-5 w-5" />
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* RIGHT CONTENT */}
          <main className="flex-1 md:border-l md:pl-6">
            {/* PERSONAL */}
            {activeTab === "info" && (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Personal Information</h2>
                    <p className="text-gray-600 mt-1">Your basic identity and contact details.</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Badge>{roleName}</Badge>
                    <Badge tone="gray">{(profile.department || "No Department").toUpperCase()}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Summary */}
                  <div className="space-y-3">
                    <Stat icon={HiUser} label="Full Name" value={profile.full_name} />
                    <Stat icon={HiMail} label="Email Address" value={profile.email} />
                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(profile.email || "");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1200);
                          }}
                          className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                        >
                          {copied ? <HiClipboardCheck className="h-4 w-4" /> : <HiClipboardCopy className="h-4 w-4" />}
                          Copy email
                        </button>
                        <span className="text-gray-300">•</span>
                        <button onClick={() => setPwdOpen(true)} className="text-gray-700 hover:underline">
                          Change password
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Stat icon={HiCalendar} label="Joined" value={fmtDate(profile.created_at)} />
                      <Stat icon={HiLogin} label="Last Login" value={fmtDate(profile.last_login_at)} />
                    </div>
                  </div>

                  {/* Form */}
                  <div className="lg:col-span-2 rounded-2xl ring-1 ring-gray-200 p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Contact & Identity</h3>
                      {isEditMode ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={savePersonal}
                            disabled={!personalDirty}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white ${
                              personalDirty ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <HiCheck className="h-5 w-5" /> Save
                          </button>
                          <button
                            onClick={() => {
                              setIsEditMode(false);
                              setFormData({ fullName: profile.full_name || "", email: profile.email || "" });
                              setErrors({});
                            }}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
                          >
                            <HiX className="h-5 w-5" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditMode(true)}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <HiPencil className="h-5 w-5" /> Edit Profile
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Full Name</label>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                            placeholder="Your full name"
                          />
                        ) : (
                          <p className="mt-1 text-lg font-medium text-gray-900">{profile.full_name || "—"}</p>
                        )}
                        {errors.fullName && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <HiExclamationCircle className="h-3.5 w-3.5" /> {errors.fullName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600">Email Address</label>
                        {isEditMode ? (
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                            placeholder="name@example.com"
                          />
                        ) : (
                          <p className="mt-1 text-lg font-medium text-gray-900">{profile.email || "—"}</p>
                        )}
                        {errors.email && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <HiExclamationCircle className="h-3.5 w-3.5" /> {errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* IDs */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg bg-gray-50 p-3 ring-1 ring-gray-100">
                        <p className="text-xs text-gray-500">User ID</p>
                        <p className="text-sm font-mono text-gray-900">{profile.id || "—"}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 ring-1 ring-gray-100">
                        <p className="text-xs text-gray-500">Username</p>
                        <p className="text-sm text-gray-900">{profile.username || "—"}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 ring-1 ring-gray-100">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="text-sm text-gray-900">
                          {profile.is_active === false ? "Inactive" : "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROFESSIONAL */}
            {activeTab === "professional" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Identity & Professional Details</h2>
                    <p className="text-gray-600 mt-1">These appear on patient reports and internal documents.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Signature & visibility */}
                  <div className="lg:col-span-1">
                    <div className="rounded-2xl ring-1 ring-gray-200 p-5 bg-white">
                      <h3 className="font-semibold mb-3">Signature</h3>
                      <div className="rounded-lg border border-dashed border-gray-300 p-3 flex items-center justify-center h-40 bg-gray-50">
                        {signatureSrc ? (
                          <img src={signatureSrc} alt="Signature" className="max-h-36 object-contain" />
                        ) : (
                          <span className="text-gray-400 text-sm">No signature uploaded</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input id="sig-upload" type="file" accept="image/*" className="hidden" onChange={uploadSignature} />
                        <label
                          htmlFor="sig-upload"
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                        >
                          <HiPhotograph className="h-5 w-5" />
                          Upload Signature
                        </label>
                        {signatureSrc && (
                          <button
                            onClick={removeSignature}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
                          >
                            <HiTrash className="h-5 w-5" />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="mt-5">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!pro.show_on_reports}
                            onChange={(e) => setPro((p) => ({ ...p, show_on_reports: e.target.checked }))}
                          />
                          Show details on reports
                        </label>
                      </div>

                      {/* Report footer preview */}
                      <div className="mt-6">
                        <p className="text-xs text-gray-500 mb-2">Preview:</p>
                        <div className="rounded-lg border bg-gray-50 p-3 text-center">
                          {signatureSrc && (
                            <img src={signatureSrc} alt="sig" className="mx-auto mb-2 max-h-12 object-contain" />
                          )}
                          <p className="text-sm font-semibold text-gray-900">{reportDisplayName || "—"}</p>
                          <p className="text-xs text-gray-600">{pro.title || "—"}</p>
                          <p className="text-[11px] text-gray-500">
                            {pro.license_number ? `License: ${pro.license_number}` : "License: —"}
                            {pro.license_state ? ` • ${pro.license_state}` : ""}
                            {pro.license_expiry ? ` • Expires ${new Date(pro.license_expiry).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="lg:col-span-2 rounded-2xl ring-1 ring-gray-200 p-6 bg-white">
                    {proLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-5 w-40 bg-gray-200 rounded" />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="h-10 bg-gray-200 rounded" />
                          <div className="h-10 bg-gray-200 rounded" />
                          <div className="h-10 bg-gray-200 rounded" />
                          <div className="h-10 bg-gray-200 rounded" />
                          <div className="h-10 bg-gray-200 rounded" />
                          <div className="h-10 bg-gray-200 rounded" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Professional Title</label>
                            <input
                              type="text"
                              value={pro.title}
                              onChange={(e) => setPro((p) => ({ ...p, title: e.target.value }))}
                              className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                              placeholder="e.g., Consultant Pathologist"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Credentials</label>
                            <input
                              type="text"
                              value={pro.credentials}
                              onChange={(e) => setPro((p) => ({ ...p, credentials: e.target.value }))}
                              className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                              placeholder="MBChB, FCPath"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">License Number</label>
                            <input
                              type="text"
                              value={pro.license_number}
                              onChange={(e) => setPro((p) => ({ ...p, license_number: e.target.value }))}
                              className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                              placeholder="e.g., SLMC-12345"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">License State/Board</label>
                            <input
                              type="text"
                              value={pro.license_state}
                              onChange={(e) => setPro((p) => ({ ...p, license_state: e.target.value }))}
                              className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                              placeholder="e.g., Sierra Leone Medical Council"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">License Expiry</label>
                            <input
                              type="date"
                              value={pro.license_expiry || ""}
                              onChange={(e) => setPro((p) => ({ ...p, license_expiry: e.target.value }))}
                              className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Specialization</label>
                            <input
                              type="text"
                              value={pro.specialization}
                              onChange={(e) => setPro((p) => ({ ...p, specialization: e.target.value }))}
                              className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                              placeholder="e.g., Hematology"
                            />
                          </div>
                        </div>

                        <div className="mt-6">
                          <button
                            onClick={saveProfessional}
                            disabled={!proDirty || proSaving}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white ${
                              !proDirty || proSaving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            <HiCheck className="h-5 w-5" />
                            {proSaving ? "Saving…" : "Save Professional Details"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY */}
            {activeTab === "security" && (
              <div>
                <h2 className="text-2xl font-semibold mb-2">Security</h2>
                <p className="text-gray-600 mb-4">Manage your password and 2FA settings.</p>

                <div className="rounded-2xl ring-1 ring-gray-200 p-6 bg-white">
                  <button onClick={() => setPwdOpen(true)} className="bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-black">
                    Change Password
                  </button>
                  {/* 2FA UI can be added here later */}
                </div>
              </div>
            )}

            {/* API KEYS */}
            {activeTab === "keys" && <ApiKeyManager />}
            {/* If tree-shaking gets confused in your setup, you can use:
                {activeTab === "keys" && <NamedApiKeyManager />} */}
          </main>
        </div>
      </div>

      <ChangePasswordModal isOpen={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
};

export default ProfilePage;
