import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Phone, 
  Home, 
  AlertCircle, 
  Activity, 
  Clock, 
  HeartHandshake, 
  ArrowLeft,
  CheckCircle2,
  Save,
  ArrowRight
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

    if (response.status === 401) {
      console.warn("🔒 Unauthorized /api request:", url);
      toast.error("Session expired. Please log in again.");
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
 * 🔢 Helper Functions
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

export const calculateHumanAge = (dob) => {
  if (!dob) return "";
  const birthDate = new Date(dob);
  const today = new Date();
  if (birthDate > today) return "";
  const diffMs = today.getTime() - birthDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk${Math.floor(diffDays / 7) === 1 ? "" : "s"}`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo${Math.floor(diffDays / 30) === 1 ? "" : "s"}`;
  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) years--;
  return `${years} yr${years === 1 ? "" : "s"}`;
};

// --------------- UI Components ---------------

const InputGroup = ({ label, required, error, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const SectionCard = ({ id, title, icon: Icon, children, stepNumber, themeColor = "indigo" }) => (
  <div id={id} className={`bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md scroll-mt-24`}>
    <div className={`flex items-center mb-6 border-b border-gray-100 pb-4`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold text-lg border bg-white
          ${themeColor === 'red' ? 'text-red-600 border-red-200' : 'text-indigo-600 border-indigo-200'}
      `}>
          {stepNumber}
      </div>
      <div className={`p-2 rounded-lg bg-${themeColor}-50 text-${themeColor}-600 mr-4`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    </div>
    {children}
  </div>
);

// --------------- Main Component ---------------
const PatientRegistrationPage = () => {
  const navigate = useNavigate();
  
  // Refs for scrolling
  const sectionsRef = {
    triage: useRef(null),
    demographics: useRef(null),
    contact: useRef(null),
    admission: useRef(null),
    emergency: useRef(null)
  };

  // State
  const [wards, setWards] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("triage");

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

  // Dynamic Theme based on Priority
  const isUrgent = formData.priority === "URGENT";
  const themeColor = isUrgent ? "red" : "indigo";

  // Load Data
  useEffect(() => {
    const loadWards = async () => {
      try {
        const data = await apiFetch("/api/wards");
        setWards(data || []);
      } catch (err) {
        console.error("Failed to load wards:", err);
        setWards([]);
      } finally {
        setLoading(false);
      }
    };
    loadWards();
  }, []);

  // Scroll Spy (Simplified)
  const scrollToSection = (sectionKey) => {
    const element = document.getElementById(`section-${sectionKey}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionKey);
    }
  };

  // Handlers
  const handleDobChange = (e) => {
    const dob = e.target.value;
    const ageDisplay = calculateHumanAge(dob);
    setFormData((prev) => ({ ...prev, dateOfBirth: dob, ageDisplay }));
  };

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const setPriority = (level) => setFormData((prev) => ({ ...prev, priority: level }));

  const validateForm = () => {
    if (!formData.firstName) return { msg: "First Name is required", section: "demographics" };
    if (!formData.lastName) return { msg: "Last Name is required", section: "demographics" };
    if (!formData.dateOfBirth) return { msg: "Date of Birth is required", section: "demographics" };
    if (!formData.gender) return { msg: "Gender is required", section: "demographics" };
    if (!formData.contactPhone) return { msg: "Phone Number is required", section: "contact" };
    if (formData.admissionType === "Inpatient" && !formData.wardId) return { msg: "Ward is required for Inpatients", section: "admission" };
    return null;
  };

  // 🔑 KEY FIX: Pass 'action' ("back" or "order") directly to the submit function
  // instead of relying on async state updates.
  const handleSubmission = async (e, action) => {
    e.preventDefault();
    setError(null);

    const validation = validateForm();
    if (validation) {
      setError(validation.msg);
      toast.error(validation.msg);
      scrollToSection(validation.section);
      return;
    }

    setSaving(true);

    try {
      const ageYears = calculateAgeYears(formData.dateOfBirth);
      const payload = {
        ...formData,
        ageDisplay: undefined,
        wardId: formData.admissionType === "Inpatient" && formData.wardId ? Number(formData.wardId) : null,
        age: ageYears,
        priority: formData.priority,
      };

      const patient = await apiFetch("/api/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`Patient ${patient.mrn} registered!`);

      // Cache for convenience
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
      } catch (e) {}

      // Urgent Alert
      if (formData.priority === "URGENT") {
        toast.custom(
          (t) => (
            <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center animate-bounce">
              <AlertCircle className="w-6 h-6 mr-3" />
              <div>
                <p className="font-bold text-lg">URGENT Case Logged</p>
                <p className="text-sm opacity-90">Notify Triage / Phlebotomy immediately.</p>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      }

      // 🔑 FIX: Navigation Logic based on the passed 'action' argument
      if (action === "order") {
        console.log("Navigating to order page...");
        navigate(`/tests/requests/new?patientId=${patient.id}&priority=${formData.priority}`, { replace: true });
      } else {
        console.log("Going back to directory...");
        setTimeout(() => navigate(-1), 800);
      }

    } catch (err) {
      const msg = err?.message || "Registration failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Common Styles
  const inputClass = `w-full p-3 border rounded-xl focus:ring-4 focus:outline-none transition-all duration-200 text-gray-800 bg-white
    ${isUrgent 
      ? "border-gray-300 focus:ring-red-100 focus:border-red-400 placeholder-red-200" 
      : "border-gray-300 focus:ring-indigo-100 focus:border-indigo-500 placeholder-gray-400"
    }`;

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <Activity className={`w-10 h-10 mb-4 text-${themeColor}-500 animate-spin`} />
      <p className="font-medium">Initializing Registration Form...</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50/50 pb-32 font-sans text-slate-800 ${isUrgent ? 'selection:bg-red-100 selection:text-red-900' : 'selection:bg-indigo-100 selection:text-indigo-900'}`}>
      <Toaster position="top-right" />

      {/* --- 1. Sticky Header --- */}
      <header className={`sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 md:px-8 py-3 transition-colors duration-500 ${isUrgent ? 'border-t-4 border-t-red-500' : 'border-t-4 border-t-indigo-500'}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <User size={20} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-none">Patient Intake</h1>
              <p className="text-xs text-gray-500 mt-1">New Registration</p>
            </div>
          </div>
          
          {/* Navigation Pills (Desktop) */}
          <div className="hidden md:flex gap-2 bg-gray-100 p-1 rounded-full">
            {['triage', 'demographics', 'contact', 'admission'].map((key) => (
              <button
                key={key}
                onClick={() => scrollToSection(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                  activeSection === key 
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center transition px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={16} className="mr-1" /> Cancel
          </button>
        </div>
      </header>

      {/* --- 2. Main Form --- */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Validation Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <form id="regForm" className="space-y-8">
          
          {/* 1. TRIAGE */}
          <SectionCard id="section-triage" title="Triage & Priority" icon={Activity} stepNumber="1" themeColor={themeColor}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="Visit Priority" required>
                  <div className="flex gap-4 h-[50px]">
                    <button
                      type="button"
                      onClick={() => setPriority("ROUTINE")}
                      className={`flex-1 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                        formData.priority === "ROUTINE"
                          ? "border-green-500 bg-green-50 text-green-700 font-bold shadow-sm ring-1 ring-green-200"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <Clock size={18} /> Routine
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority("URGENT")}
                      className={`flex-1 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                        formData.priority === "URGENT"
                          ? "border-red-500 bg-red-50 text-red-700 font-bold shadow-md animate-pulse"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <AlertCircle size={18} /> URGENT
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 ml-1">
                    *Urgent status will flag this patient across all dashboards (Lab, Phlebotomy).
                  </p>
                </InputGroup>

                <InputGroup label="Referring Doctor">
                  <input
                    className={inputClass}
                    placeholder="Dr. Name or Clinic"
                    name="referringDoctor"
                    value={formData.referringDoctor}
                    onChange={handleChange}
                  />
                </InputGroup>
             </div>
          </SectionCard>

          {/* 2. DEMOGRAPHICS */}
          <SectionCard id="section-demographics" title="Demographics" icon={User} stepNumber="2" themeColor={themeColor}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <InputGroup label="First Name" required>
                <input className={inputClass} placeholder="Jane" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </InputGroup>
              <InputGroup label="Middle Name">
                <input className={inputClass} placeholder="Marie" name="middleName" value={formData.middleName} onChange={handleChange} />
              </InputGroup>
              <InputGroup label="Last Name" required>
                <input className={inputClass} placeholder="Doe" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </InputGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputGroup label="Date of Birth" required>
                <input type="date" className={inputClass} name="dateOfBirth" value={formData.dateOfBirth} onChange={handleDobChange} required />
              </InputGroup>
              <InputGroup label="Calculated Age">
                <input className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200`} value={formData.ageDisplay || "--"} readOnly tabIndex={-1} />
              </InputGroup>
              <InputGroup label="Gender" required>
                <select className={inputClass} name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select...</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </InputGroup>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
               <InputGroup label="Marital Status">
                 <select className={inputClass} name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                 </select>
               </InputGroup>
               <InputGroup label="Occupation">
                 <input className={inputClass} placeholder="e.g. Teacher" name="occupation" value={formData.occupation} onChange={handleChange} />
               </InputGroup>
            </div>
          </SectionCard>

          {/* 3. CONTACT */}
          <SectionCard id="section-contact" title="Contact Info" icon={Phone} stepNumber="3" themeColor={themeColor}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <InputGroup label="Phone Number" required>
                 <input className={inputClass} placeholder="0XX-XXX-XXXX" name="contactPhone" value={formData.contactPhone} onChange={handleChange} required />
              </InputGroup>
              <InputGroup label="Email Address">
                 <input className={inputClass} type="email" placeholder="name@example.com" name="contactEmail" value={formData.contactEmail} onChange={handleChange} />
              </InputGroup>
            </div>
            <InputGroup label="Home Address">
               <input className={inputClass} placeholder="Street, City, Area" name="contactAddress" value={formData.contactAddress} onChange={handleChange} />
            </InputGroup>
          </SectionCard>

          {/* 4. ADMISSION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SectionCard id="section-admission" title="Admission" icon={Home} stepNumber="4" themeColor={themeColor}>
               <div className="space-y-6">
                 <InputGroup label="Admission Type">
                    <select className={inputClass} name="admissionType" value={formData.admissionType} onChange={handleChange}>
                      <option value="OPD">OPD (Outpatient)</option>
                      <option value="Inpatient">Inpatient (Admit)</option>
                    </select>
                 </InputGroup>

                 {formData.admissionType === "Inpatient" && (
                   <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                     <InputGroup label="Assign Ward" required>
                       <select 
                          className={`${inputClass} border-${themeColor}-300 bg-${themeColor}-50`} 
                          name="wardId" 
                          value={formData.wardId} 
                          onChange={handleChange}
                          required
                       >
                         <option value="">Select Ward...</option>
                         {wards.map((w) => (
                           <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                         ))}
                       </select>
                     </InputGroup>
                   </div>
                 )}
               </div>
            </SectionCard>

            <SectionCard id="section-emergency" title="Emergency Contact" icon={HeartHandshake} stepNumber="5" themeColor={themeColor}>
              <div className="space-y-4">
                <InputGroup label="Contact Name">
                  <input className={inputClass} placeholder="Name" name="emergencyName" value={formData.emergencyName} onChange={handleChange} />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Relationship">
                    <input className={inputClass} placeholder="e.g. Spouse" name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} />
                  </InputGroup>
                  <InputGroup label="Phone">
                    <input className={inputClass} placeholder="Phone" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} />
                  </InputGroup>
                </div>
              </div>
            </SectionCard>
          </div>

        </form>
      </main>

      {/* --- 3. Sticky Footer Actions --- */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 transition-colors duration-500 ${isUrgent ? 'border-t-red-400 bg-red-50/90' : ''}`}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="hidden md:block text-sm text-gray-500">
            {isUrgent ? (
               <span className="flex items-center gap-2 text-red-700 font-bold animate-pulse">
                 <AlertCircle size={18} /> PRIORITY: URGENT
               </span>
            ) : (
               <span className="flex items-center gap-2">
                 <CheckCircle2 size={16} className="text-green-500" />
                 Ready to register
               </span>
            )}
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            {/* Save & Close Button */}
            <button
              // 🔑 KEY FIX: Pass "back" to handler
              onClick={(e) => handleSubmission(e, "back")}
              disabled={saving}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm disabled:opacity-50 text-sm`}
            >
              Save & Close
            </button>

            {/* Save & Order Button */}
            <button
              // 🔑 KEY FIX: Pass "order" to handler
              onClick={(e) => handleSubmission(e, "order")}
              disabled={saving}
              className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm
                ${isUrgent ? 'bg-gradient-to-r from-red-600 to-red-700 hover:to-red-800' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:to-blue-700'}
              `}
            >
              {saving ? (
                 <Activity className="animate-spin w-5 h-5" /> 
              ) : (
                 <React.Fragment>
                   Save & Order Tests <ArrowRight size={18} />
                 </React.Fragment>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PatientRegistrationPage;