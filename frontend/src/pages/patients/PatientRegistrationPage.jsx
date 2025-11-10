import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import patientService from "../../services/patientService";
import wardsService from "../../services/wardService";
import SectionCard from "../../components/SectionCard";
import { FiUser, FiPhone, FiHome, FiAlertCircle } from "react-icons/fi";

const PatientRegistrationPage = () => {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const token = userInfo?.token || null;

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    occupation: "",
    contactPhone: "",
    contactAddress: "",
    contactEmail: "",
    admissionType: "OPD",
    wardId: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    referringDoctor: "",
  });

  useEffect(() => {
    const loadWards = async () => {
      try {
        const data = await wardsService.getWards(token);
        setWards(data);
      } catch {
        setError("Failed to load wards.");
      } finally {
        setLoading(false);
      }
    };
    loadWards();
  }, [token]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientService.registerPatient(formData, token);
      navigate("/patients", { state: { message: "Patient registered successfully!" } });
    } catch {
      setError("Registration failed. Please recheck the form.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Register New Patient</h1>
        <button 
          onClick={() => navigate(-1)} 
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
        >
          ← Back
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        <SectionCard title="Patient Information" icon={FiUser}>
          <input className="input" placeholder="First Name" name="firstName" required value={formData.firstName} onChange={handleChange} />
          <input className="input" placeholder="Middle Name (optional)" name="middleName" value={formData.middleName} onChange={handleChange} />
          <input className="input" placeholder="Last Name" name="lastName" required value={formData.lastName} onChange={handleChange} />
          <input type="date" className="input" name="dateOfBirth" required value={formData.dateOfBirth} onChange={handleChange} />

          <select className="input" name="gender" required value={formData.gender} onChange={handleChange}>
            <option value="">Gender</option>
            <option>Male</option>
            <option>Female</option>
          </select>

          <select className="input" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
            <option value="">Marital Status</option>
            <option>Single</option>
            <option>Married</option>
            <option>Divorced</option>
            <option>Widowed</option>
          </select>

          <input className="input" placeholder="Occupation" name="occupation" value={formData.occupation} onChange={handleChange} />
        </SectionCard>

        <SectionCard title="Contact Information" icon={FiPhone}>
          <input className="input" placeholder="Phone Number" name="contactPhone" required value={formData.contactPhone} onChange={handleChange} />
          <input className="input" placeholder="Email (optional)" name="contactEmail" value={formData.contactEmail} onChange={handleChange} />
          <input className="input md:col-span-2" placeholder="Home Address" name="contactAddress" value={formData.contactAddress} onChange={handleChange} />
        </SectionCard>

        <SectionCard title="Admission Details" icon={FiHome}>
          <select className="input" name="admissionType" value={formData.admissionType} onChange={handleChange}>
            <option value="OPD">OPD (Outpatient)</option>
            <option value="Inpatient">Inpatient</option>
          </select>

          {formData.admissionType === "Inpatient" && (
            <select className="input" name="wardId" value={formData.wardId} onChange={handleChange}>
              <option value="">Select Ward</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </SectionCard>

        <SectionCard title="Emergency Contact" icon={FiAlertCircle}>
          <input className="input" placeholder="Contact Name" name="emergencyName" value={formData.emergencyName} onChange={handleChange} />
          <input className="input" placeholder="Relationship" name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} />
          <input className="input" placeholder="Phone Number" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} />
        </SectionCard>

        <button 
          type="submit"
          disabled={saving}
          className={`w-full py-3 text-white text-lg rounded-lg transition ${saving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
        >
          {saving ? "Saving..." : "Register Patient"}
        </button>

      </form>
    </div>
  );
};

export default PatientRegistrationPage;
