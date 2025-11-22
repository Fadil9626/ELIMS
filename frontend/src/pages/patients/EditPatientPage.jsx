import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiFetch from "../../services/apiFetch";
import toast from "react-hot-toast";
import { 
  Save, 
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Activity, 
  Stethoscope 
} from "lucide-react";

const EditPatientPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Data State
  const [wards, setWards] = useState([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    contactInfo: "",
    wardId: "",
    referringDoctor: "",
    mrn: "", // Added MRN for display/editing if needed
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Load Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Patient and Wards in parallel
        const [patientData, wardsRes] = await Promise.all([
          apiFetch(`/api/patients/${id}`),
          apiFetch("/api/wards").catch(() => []) // Fallback to empty array if wards fail
        ]);

        // Format date for input (YYYY-MM-DD)
        const formattedDate = patientData.date_of_birth
          ? new Date(patientData.date_of_birth).toISOString().split("T")[0]
          : "";

        // Populate Form
        setFormData({
          firstName: patientData.first_name || "",
          lastName: patientData.last_name || "",
          dateOfBirth: formattedDate,
          gender: patientData.gender || "",
          contactInfo: patientData.contact_phone || patientData.contact_info || "", // Check standard field name
          wardId: patientData.ward_id || "",
          referringDoctor: patientData.referring_doctor || "",
          mrn: patientData.mrn || patientData.lab_id || ""
        });

        // Handle Wards (support both array directly or { data: [...] } shape)
        const wardsList = Array.isArray(wardsRes) ? wardsRes : (wardsRes.data || []);
        setWards(wardsList);

      } catch (err) {
        console.error("Load Error:", err);
        toast.error("Failed to load patient data.");
        navigate("/patients"); // Redirect on critical failure
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Map form state back to API expected payload (snake_case usually)
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      date_of_birth: formData.dateOfBirth,
      gender: formData.gender,
      contact_phone: formData.contactInfo,
      ward_id: formData.wardId ? Number(formData.wardId) : null,
      referring_doctor: formData.referringDoctor,
    };

    try {
      await apiFetch(`/api/patients/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      
      toast.success("Patient updated successfully!");
      // Navigate back to details page instead of list for better UX
      navigate(`/patients/${id}`); 
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update patient.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Activity className="w-10 h-10 mb-4 text-indigo-500 animate-spin" />
        <p className="font-medium">Loading Patient Record...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Patient</h1>
            <p className="text-sm text-gray-500">
              {formData.firstName} {formData.lastName} <span className="font-mono bg-gray-100 px-1 rounded ml-1">{formData.mrn}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Section: Personal Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2 mb-4 flex items-center gap-2">
                <User size={16} className="text-indigo-600"/> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                      className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Contact & Admission */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-600"/> Admission & Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone / Email</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="contactInfo"
                      value={formData.contactInfo}
                      onChange={handleChange}
                      placeholder="+232..."
                      className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Location</label>
                  <select
                    name="wardId"
                    value={formData.wardId}
                    onChange={handleChange}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">-- Outpatient --</option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referring Doctor</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="referringDoctor"
                      value={formData.referringDoctor}
                      onChange={handleChange}
                      placeholder="Dr. Name"
                      className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Stethoscope className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 flex items-center justify-end gap-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Activity className="animate-spin" size={18} /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Save Changes
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
};

export default EditPatientPage;