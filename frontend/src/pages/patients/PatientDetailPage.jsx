import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Phone, User, Calendar, Hospital, Stethoscope, FileText } from 'lucide-react';
import patientService from '../../services/patientService';
import ConfirmModal from '../../components/layout/ConfirmModal';

const PatientDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo?.token;

        const [patientData, historyData] = await Promise.all([
          patientService.getPatientById(id, token),
          patientService.getPatientTestHistory(id, token),
        ]);

        setPatient(patientData);
        setTestHistory(historyData);
      } catch (err) {
        console.error('❌ Error fetching patient:', err);
        setError('Failed to load patient details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const handleConfirmDelete = async () => {
    setIsDeleteModalOpen(false);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      await patientService.deletePatient(id, token);
      navigate('/patients', { state: { message: `Patient ${patient.first_name} deleted successfully.` } });
    } catch (err) {
      setError(err.message || 'Failed to delete patient.');
    }
  };

  const handleCancelDelete = () => setIsDeleteModalOpen(false);

  if (loading) return <div className="p-6 text-gray-600">Loading patient data...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!patient) return <div className="p-6 text-gray-600">Patient not found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header + Back */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {patient.first_name} {patient.last_name}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition"
          >
            ← Back
          </button>
          <Link to={`/patients/${patient.id}/edit`}>
            <button className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition">
              Edit
            </button>
          </Link>
          <Link to={`/patients/${patient.id}/request-test`}>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
              New Test
            </button>
          </Link>
          <button
            onClick={handleDeleteClick}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-10 text-gray-700">
          <div className="flex items-center gap-2">
            <User className="text-blue-600 w-5 h-5" />
            <span><strong>Lab ID:</strong> {patient.lab_id || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="text-green-600 w-5 h-5" />
            <span>
              <strong>Date of Birth:</strong>{' '}
              {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <User className="text-purple-600 w-5 h-5" />
            <span><strong>Gender:</strong> {patient.gender || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Hospital className="text-indigo-600 w-5 h-5" />
            <span><strong>Ward:</strong> {patient.ward_name || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Stethoscope className="text-amber-600 w-5 h-5" />
            <span><strong>Referring Doctor:</strong> {patient.referring_doctor || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="text-emerald-600 w-5 h-5" />
            <span><strong>Contact Info:</strong> {patient.contact_info || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Test History */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Test History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Request ID</th>
                <th className="p-4 font-semibold text-gray-700">Status</th>
                <th className="p-4 font-semibold text-gray-700">Date Requested</th>
                <th className="p-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testHistory.length > 0 ? (
                testHistory.map((test) => (
                  <tr key={test.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{test.id}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-md text-sm font-medium ${
                          test.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : test.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {new Date(test.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Link
                        to={`/tests/requests/${test.id}`}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" /> View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="p-6 text-center text-gray-500 italic"
                  >
                    No test history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete Patient: ${patient.first_name} ${patient.last_name}`}
        message="Are you sure you want to delete this patient and all related test history? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default PatientDetailPage;
