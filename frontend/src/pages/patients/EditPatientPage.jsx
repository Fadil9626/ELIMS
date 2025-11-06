import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import patientService from '../../services/patientService';
import wardsService from '../../services/wardService';

const EditPatientPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    contactInfo: '',
    wardId: '',
    referringDoctor: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const token = userInfo ? userInfo.token : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientData, wardList] = await Promise.all([
          patientService.getPatientById(id, token),
          wardsService.getWards(token),
        ]);

        const formattedDate = patientData.date_of_birth
          ? new Date(patientData.date_of_birth).toISOString().split('T')[0]
          : '';

        setFormData({
          firstName: patientData.first_name || '',
          lastName: patientData.last_name || '',
          dateOfBirth: formattedDate,
          gender: patientData.gender || '',
          contactInfo: patientData.contact_info || '',
          wardId: patientData.ward_id || '',
          referringDoctor: patientData.referring_doctor || '',
        });
        setWards(wardList);
      } catch (err) {
        console.error(err);
        setError('Failed to load patient or wards');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientService.updatePatient(id, formData, token);
      navigate('/patients', { state: { message: 'Patient updated successfully!' } });
    } catch {
      setError('Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading patient data...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Patient</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-8 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Ward</label>
            <select
              name="wardId"
              value={formData.wardId}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select ward (optional)</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Referring Doctor</label>
            <input
              type="text"
              name="referringDoctor"
              value={formData.referringDoctor}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-gray-700 font-semibold mb-2">Contact Info</label>
            <input
              type="text"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleChange}
              placeholder="Phone, email, etc."
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-2 px-4 rounded-md text-white ${
                saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              } transition`}
            >
              {saving ? 'Updating...' : 'Update Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPatientPage;
