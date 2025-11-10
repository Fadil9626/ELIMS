import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import patientService from '../../services/patientService';
import ConfirmModal from '../../components/layout/ConfirmModal';

import {
  Phone,
  User,
  Calendar,
  Hospital,
  Stethoscope,
  FileText,
  ArrowLeft,
  Edit,
  Trash2,
  PlusCircle,
  Clock
} from 'lucide-react';

const PatientDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [patient, setPatient] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isCreationPage = id === 'new-request';

  useEffect(() => {
    if (isCreationPage) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

        // Fetch patient basic info
        const patientData = await patientService.getPatientById(id, token);
        setPatient(patientData);

        // If we came here right after test submission → wait so DB sync finishes cleanly
        if (location.state?.testSubmitted) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          navigate(location.pathname, { replace: true, state: {} });
        }

        // Fetch fresh test history
        const historyData = await patientService.getPatientTestHistory(id, token);
        setTestHistory(historyData);

      } catch (err) {
        console.error('❌ Error fetching patient:', err);
        setError('Failed to load patient details or test history.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]); // ✅ Only runs when patient ID changes

  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const handleConfirmDelete = async () => {
    setIsDeleteModalOpen(false);
    try {
      const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
      await patientService.deletePatient(id, token);
      navigate('/patients', { state: { message: `Patient ${patient.first_name} deleted successfully.` } });
    } catch (err) {
      setError(err.message || 'Failed to delete patient.');
    }
  };

  const handleCancelDelete = () => setIsDeleteModalOpen(false);

  if (loading)
    return (
      <div className="p-6 text-gray-600 flex items-center gap-2">
        <Clock size={20} className="animate-spin" /> Loading patient data...
      </div>
    );

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!patient) return <div className="p-6 text-gray-600">Patient not found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <User size={32} className="text-blue-600" />
          {patient.first_name} {patient.last_name}
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-gray-600 transition text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* ✅ Correct New Test Route */}
          <Link to={`/patients/${patient.id}/request-test`}>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition text-sm font-medium shadow-md">
              <PlusCircle size={16} /> New Test
            </button>
          </Link>

          <Link to={`/patients/${patient.id}/edit`}>
            <button className="bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-yellow-600 transition text-sm font-medium">
              <Edit size={16} /> Edit
            </button>
          </Link>

          <button
            onClick={handleDeleteClick}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-red-700 transition text-sm font-medium"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Patient Info */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 text-gray-800">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-10 text-gray-700 text-sm md:text-base">

          <div className="flex items-center gap-3">
            <User className="text-blue-600 w-5 h-5" />
            <span className="font-medium">Lab ID:</span> {patient.lab_id || 'N/A'}
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="text-green-600 w-5 h-5" />
            <span className="font-medium">Date of Birth:</span>
            {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}
          </div>

          <div className="flex items-center gap-3">
            <User className="text-purple-600 w-5 h-5" />
            <span className="font-medium">Gender:</span> {patient.gender || 'N/A'}
          </div>

          <div className="flex items-center gap-3">
            <Hospital className="text-indigo-600 w-5 h-5" />
            <span className="font-medium">Ward:</span> {patient.ward_name || 'N/A'}
          </div>

          <div className="flex items-center gap-3">
            <Stethoscope className="text-amber-600 w-5 h-5" />
            <span className="font-medium">Referring Doctor:</span> {patient.referring_doctor || 'N/A'}
          </div>

          <div className="flex items-center gap-3">
            <Phone className="text-emerald-600 w-5 h-5" />
            <span className="font-medium">Contact:</span> {patient.contact_phone || patient.contact_info || 'N/A'}
          </div>
        </div>
      </div>

      {/* Test History */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 text-gray-800">Test History</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-700">Request ID</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-700">Status</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-700">Date Requested</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-700 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {testHistory.length > 0 ? (
                testHistory.map((test) => (
                  <tr key={test.id} className="border-b hover:bg-blue-50">
                    <td className="p-4 font-mono text-gray-800">{test.id}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                          ${test.status === 'Verified' || test.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}
                      >
                        <FileText size={14} /> {test.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(test.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        to={`/tests/requests/${test.id}`}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition inline-flex items-center gap-1 shadow-sm"
                      >
                        <FileText size={14} /> View Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-500 italic">
                    No test history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete Patient: ${patient.first_name} ${patient.last_name}`}
        message="Are you absolutely sure you want to delete this patient and all related test history? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Yes, Permanently Delete"
      />

    </div>
  );
};

export default PatientDetailPage;
