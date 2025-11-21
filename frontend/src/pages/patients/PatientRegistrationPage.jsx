import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  Home,
  AlertCircle,
  Activity,
  Clock,
  HeartHandshake,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

/* -------------------------------------------------
 * 🔐 Auth-aware apiFetch helper (local)
 * ------------------------------------------------- */
const apiFetch = async (url, options = {}) => {
  let token = "";
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      token = parsed?.token || parsed?.accessToken || parsed?.access_token || "";
    }
  } catch (e) {
    console.error("Failed to parse elims_auth_v1:", e);
  }

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);

    // Special handling for 401
    if (response.status === 401) {
      console.warn("🔒 Unauthorized /api request:", url);
      toast.error("Session expired or unauthorized. Please log in again.");
      localStorage.removeItem("elims_auth_v1");
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      let errorText = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        errorText = errorJson.message || errorJson.error || errorText;
      } catch {
        const text = await response.text().catch(() => "");
        errorText = text || errorText;
      }
      throw new Error(errorText);
    }

    return response.status !== 204 ? await response.json() : null;
  } catch (error) {
    console.error("API Fetch Error:", error);
    throw error;
  }
};

/* -------------------------------------------------
 * 🔢 Helper: Calculates age in YEARS for backend payload
 * ------------------------------------------------- */
const calculateAgeYears = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  return years < 0 ? null : years;
};

/* -------------------------------------------------
 * 📅 Helper: Calculates human-friendly age (days/weeks/months/years)
 * ⚠️ EXPORTED for use in PatientDirectoryPage
 * ------------------------------------------------- */
export const calculateHumanAge = (dob) => {
  if (!dob) return "";
  const birthDate = new Date(dob);
  const today = new Date();

  if (birthDate > today) {
    return "";
  }

  const diffMs = today.getTime() - birthDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    const days = diffDays;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} wk${weeks === 1 ? "" : "s"}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} mo${months === 1 ? "" : "s"}`;
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  return `${years} yr${years === 1 ? "" : "s"}`;
};

// --------------- SectionCard -----------------
const SectionCard = ({ title, icon: Icon, children, stepNumber, description }) => (
  <div className="bg-white p-6 md:p-7 rounded-2xl shadow-md border border-slate-100">
    <div className="flex items-start justify-between gap-4 mb-5 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm border border-indigo-100">
          {stepNumber}
        </div>
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-indigo-600" />}
            <h3 className="text-lg md:text-xl font-semibold text-slate-800">
              {title}
            </h3>
          </div>
          {description && (
            <p className="text-xs md:text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
    {children}
  </div>
);

// --------------- Input class ---------------
const InputClass =
  "w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder-slate-400 bg-white";

// --------------- Main Component ---------------
const PatientRegistrationPage = () => {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    ageDisplay: "",
    gender: "",
    maritalStatus: "",
    occupation: "",
    contactPhone: "",
    contactAddress: "",
    contactEmail: "",
    admissionType: "OPD",
    priority: "ROUTINE",
    wardId: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    referringDoctor: "",
  });

  // what to do after successful save: "back" | "order"
  const [nextAction, setNextAction] = useState("back");

  // Load wards from secured API
  useEffect(() => {
    const loadWards = async () => {
      try {
        const data = await apiFetch("/api/wards");
        setWards(data || []);
      } catch (err) {
        console.error("Failed to load wards:", err);
        toast.error(
          err.message === "Unauthorized"
            ? "You are not authorized to view wards."
            : "Failed to load wards. Please check network or Admin settings."
        );
        setWards([]);
      } finally {
        setLoading(false);
      }
    };
    loadWards();
  }, []);

  // Age display
  const handleDobChange = (e) => {
    const dob = e.target.value;
    const ageDisplay = calculateHumanAge(dob);

    setFormData((prev) => ({
      ...prev,
      dateOfBirth: dob,
      ageDisplay: ageDisplay,
    }));
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Priority toggler
  const setPriority = (level) =>
    setFormData((prev) => ({ ...prev, priority: level }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const ageYears = formData.dateOfBirth
        ? calculateAgeYears(formData.dateOfBirth)
        : null;

      const payload = {
        ...formData,
        ageDisplay: undefined,
        wardId:
          formData.admissionType === "Inpatient" && formData.wardId
            ? Number(formData.wardId)
            : null,
        age: ageYears,
        priority: formData.priority,
      };

      const patient = await apiFetch("/api/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`Patient ${patient.mrn} registered successfully!`);

      // persist context for test ordering
      try {
        sessionStorage.setItem(
          "elims_last_registered_patient",
          JSON.stringify({
            id: patient.id,
            mrn: patient.mrn,
            first_name: patient.first_name,
            last_name: patient.last_name,
            priority: formData.priority,
          })
        );
      } catch (e) {
        console.warn("Could not persist last registered patient:", e);
      }

      if (formData.priority === "URGENT") {
        toast.custom(
          () => (
            <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-bold text-lg">URGENT patient registered</p>
                <p className="text-sm opacity-90">
                  Escalate to triage immediately and order tests.
                </p>
              </div>
            </div>
          ),
          { duration: 5000 }
        );
      }

      if (nextAction === "order") {
        navigate(
          `/tests/requests/new?patientId=${patient.id}&priority=${formData.priority}`,
          { replace: true }
        );
      } else {
        setTimeout(() => navigate(-1), 800);
      }
    } catch (err) {
      const msg =
        err?.message || "Registration failed. Please recheck the form.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-500 animate-pulse">
          <Activity className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
          Loading registration form...
        </div>
      </div>
    );
  }

  const isUrgent = formData.priority === "URGENT";

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-8 font-sans text-slate-800">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top bar with quick glance chips */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to previous page
            </button>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              New Patient Registration
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Capture demographics, contact details, and triage level to start
              the visit.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isUrgent
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Priority: {isUrgent ? "URGENT" : "Routine"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
              <Home className="w-3.5 h-3.5" />
              Admission: {formData.admissionType || "OPD"}
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div className="hidden md:block">
          <ol className="flex items-center justify-between text-xs text-slate-500">
            {[
              "Triage & Visit",
              "Demographics",
              "Contact",
              "Admission",
              "Emergency Contact",
            ].map((label, idx) => (
              <li key={label} className="flex-1 flex items-center">
                <div className="flex flex-col items-center w-full">
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full border text-[11px] font-semibold ${
                      idx === 0
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-300"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="mt-1.5 text-[11px] uppercase tracking-wide">
                    {label}
                  </span>
                </div>
                {idx < 4 && (
                  <div className="flex-1 h-[1px] bg-slate-200 mx-1.5" />
                )}
              </li>
            ))}
          </ol>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-sm">
            <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mb-6">
          {/* SECTION 1: TRIAGE & PRIORITY */}
          <SectionCard
            title="Triage & Visit"
            icon={Activity}
            stepNumber={1}
            description="Choose the visit priority and link any referring doctor."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Priority cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 ml-0.5">
                  Visit Priority Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPriority("ROUTINE")}
                    className={`flex flex-col items-start justify-between h-full rounded-2xl border px-4 py-3 text-left text-sm transition-all shadow-sm ${
                      formData.priority === "ROUTINE"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-emerald-100"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">Routine</span>
                    </div>
                    <p className="text-[11px] leading-tight text-slate-500">
                      Standard visit. Patient will appear in all normal queues.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority("URGENT")}
                    className={`flex flex-col items-start justify-between h-full rounded-2xl border px-4 py-3 text-left text-sm transition-all shadow-sm ${
                      formData.priority === "URGENT"
                        ? "border-red-500 bg-red-50 text-red-800 shadow-red-100 animate-pulse-slow"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-semibold">Urgent</span>
                    </div>
                    <p className="text-[11px] leading-tight text-slate-500">
                      Time-sensitive case. Highlighted across reception,
                      phlebotomy and lab queues.
                    </p>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 ml-0.5">
                  The priority setting is carried into the lab worklists and
                  reports.
                </p>
              </div>

              {/* Referring doctor */}
              <div className="flex flex-col justify-end gap-2">
                <label className="block text-xs font-semibold text-slate-600 ml-0.5">
                  Referring Doctor / Clinic <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  className={InputClass}
                  placeholder="e.g. Dr. Sesay / City Clinic"
                  name="referringDoctor"
                  value={formData.referringDoctor}
                  onChange={handleChange}
                />
                <p className="text-[11px] text-slate-400 ml-0.5">
                  Helps link this visit to external clinicians or facilities.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* SECTION 2: PATIENT INFO */}
          <SectionCard
            title="Patient Demographic Information"
            icon={User}
            stepNumber={2}
            description="Record the patient's basic identity and demographic details."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={InputClass}
                  placeholder="First name"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Middle Name
                  <span className="text-slate-400 text-[10px] ml-1">(optional)</span>
                </label>
                <input
                  className={InputClass}
                  placeholder="Middle name"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={InputClass}
                  placeholder="Last name"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={InputClass}
                  name="dateOfBirth"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleDobChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Calculated Age
                </label>
                <input
                  className={`${InputClass} bg-slate-50 text-slate-500 cursor-not-allowed`}
                  placeholder="Age"
                  value={formData.ageDisplay || "--"}
                  readOnly
                  tabIndex={-1}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  className={InputClass}
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender...</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mt-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Marital Status
                </label>
                <select
                  className={InputClass}
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                >
                  <option value="">Select status...</option>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Occupation
                </label>
                <input
                  className={InputClass}
                  placeholder="Occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                />
              </div>
            </div>
          </SectionCard>

          {/* SECTION 3: CONTACT INFO */}
          <SectionCard
            title="Contact Information"
            icon={Phone}
            stepNumber={3}
            description="Capture how to reach the patient for follow-up and notifications."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  className={InputClass}
                  placeholder="Primary phone number"
                  name="contactPhone"
                  required
                  value={formData.contactPhone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Email
                  <span className="text-slate-400 text-[10px] ml-1">(optional)</span>
                </label>
                <input
                  className={InputClass}
                  type="email"
                  placeholder="Email address"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Home Address
                </label>
                <input
                  className={InputClass}
                  placeholder="Residential address"
                  name="contactAddress"
                  value={formData.contactAddress}
                  onChange={handleChange}
                />
              </div>
            </div>
          </SectionCard>

          {/* SECTION 4: ADMISSION DETAILS */}
          <SectionCard
            title="Admission & Assignment"
            icon={MapPin}
            stepNumber={4}
            description="Specify whether the visit is outpatient or inpatient and assign a ward if needed."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Admission Type
                </label>
                <select
                  className={InputClass}
                  name="admissionType"
                  value={formData.admissionType}
                  onChange={handleChange}
                >
                  <option value="OPD">OPD (Outpatient)</option>
                  <option value="Inpatient">Inpatient (Admit)</option>
                </select>
              </div>

              {formData.admissionType === "Inpatient" && (
                <div className="space-y-1 animate-fade-in-down">
                  <label className="text-xs font-medium text-slate-600 ml-0.5">
                    Assign Ward <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`${InputClass} border-blue-400 bg-blue-50 focus:ring-blue-100`}
                    name="wardId"
                    required
                    value={formData.wardId}
                    onChange={handleChange}
                  >
                    <option value="">Select ward...</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 ml-0.5">
                    Inpatients must be linked to a ward bed or location.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* SECTION 5: EMERGENCY CONTACT */}
          <SectionCard
            title="Emergency Contact Details"
            icon={HeartHandshake}
            stepNumber={5}
            description="Add a trusted contact in case we are unable to reach the patient."
          >
            <p className="text-xs md:text-sm text-slate-500 mb-4">
              This contact will be used for urgent communication or if there are
              complications during care.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Contact Name
                </label>
                <input
                  className={InputClass}
                  placeholder="Full name"
                  name="emergencyName"
                  value={formData.emergencyName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Relationship
                </label>
                <input
                  className={InputClass}
                  placeholder="e.g. Spouse, Brother, Parent"
                  name="emergencyRelationship"
                  value={formData.emergencyRelationship}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 ml-0.5">
                  Phone
                </label>
                <input
                  className={InputClass}
                  placeholder="Emergency phone"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </SectionCard>

          {/* FOOTER ACTIONS */}
          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent px-0 pt-4 pb-0 mt-2">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-3 border-t border-slate-200 pt-4">
              {/* Primary: register */}
              <button
                type="submit"
                onClick={() => setNextAction("back")}
                disabled={saving}
                className={`w-full md:flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 md:py-3.5 text-sm md:text-base font-semibold text-white shadow-lg transition-all 
                  ${
                    saving
                      ? "bg-slate-400 cursor-not-allowed"
                      : isUrgent
                      ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-400/50"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-400/50"
                  }`}
              >
                {saving ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Saving registration...
                  </>
                ) : isUrgent ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Register URGENT Patient
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Register Patient
                  </>
                )}
              </button>

              {/* Secondary: register & order tests */}
              <button
                type="submit"
                onClick={() => setNextAction("order")}
                disabled={saving}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 md:py-3.5 border-2 border-indigo-500 text-indigo-700 font-semibold bg-white hover:bg-indigo-50 shadow-sm text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Working...
                  </>
                ) : (
                  <>
                    <Stethoscope className="w-4 h-4" />
                    Register &amp; Order Tests
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0.7; transform: translateY(-1px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PatientRegistrationPage;
