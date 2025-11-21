import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import apiFetch from '../../services/apiFetch'; // 🚀 1. Import apiFetch
import ConfirmModal from '../../components/layout/ConfirmModal';

import {
  Phone, User, Calendar, Hospital, Stethoscope, ArrowLeft, Edit, Trash2,
  PlusCircle, CalendarPlus, Clock, HeartPulse, ClipboardCheck, ArrowUpRight,
  FileText, CheckCircle, Clock5
} from 'lucide-react';

// --- Visit Card Component (for clean rendering) ---
const VisitCard = ({ visit }) => (
    <div className="relative pl-6 py-2">
        {/* Timeline Dot & Line */}
        <div className="absolute left-0 top-0 h-full w-0.5 bg-indigo-200"></div>
        <div className="absolute left-[-5px] top-4 h-3 w-3 rounded-full bg-indigo-600 border-2 border-white shadow"></div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-gray-800">
                        {visit.visit_type} Visit
                    </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                    {new Date(visit.visit_date).toLocaleString()}
                </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Doctor:</span> {visit.doctor_name || "N/A"}
            </p>
        </div>
    </div>
);


const PatientDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [patient, setPatient] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Visit creation modal
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({ visit_type: "Outpatient", doctor_name: "" });

  const isCreationPage = id === 'new-request';
  
  // 🚀 2. REMOVED manual token management. apiFetch handles it.

  // --- DATA FETCHING (useCallback is essential here) ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 🚀 3. Use apiFetch for all data
      const patientData = await apiFetch(`/api/patients/${id}`);
      setPatient(patientData);

      // 🚀 3. Use apiFetch for test history
      // ✅ FIXED: Removed "test-" to match the backend route "/:id/history"
      const historyData = await apiFetch(`/api/patients/${id}/history`);
      setTestHistory(historyData);
      
      // 🚀 3. Use apiFetch for visits
      try {
        const visitData = await apiFetch(`/api/visits/patient/${id}`);
        setVisits(Array.isArray(visitData) ? visitData : []);
      } catch (visitErr) {
        console.warn('⚠️ Visits API failed (check backend route /api/visits/patient/:id):', visitErr);
        setVisits([]);
      }

      // If redirected after test submission → refresh cleanly
      if (location.state?.testSubmitted) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        navigate(location.pathname, { replace: true, state: {} });
      }

    } catch (err) {
      console.error('❌ Error fetching patient:', err);
      setError('Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, location.pathname, location.state, setError]); // 🚀 4. REMOVED 'token' from dependencies

  useEffect(() => {
    if (isCreationPage) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [isCreationPage, fetchData]);

  // --- HANDLERS ---
  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const handleConfirmDelete = async () => {
    setIsDeleteModalOpen(false);
    try {
      // 🚀 3. Use apiFetch for delete
      await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
      navigate('/patients', { state: { message: `Patient deleted successfully.` } });
    } catch (err) {
      setError(err.message || 'Failed to delete patient.');
    }
  };

  const handleCancelDelete = () => setIsDeleteModalOpen(false);
  
  /**
   * FIX APPLIED HERE: Calls fetchData() to ensure page state is fully refreshed
   * after creating a new visit.
   */
  const handleSaveVisit = async () => {
    try {
      // 🚀 3. Use apiFetch to create visit (assuming POST /api/visits)
      await apiFetch('/api/visits', {
          method: 'POST',
          body: JSON.stringify({ patient_id: patient.id, ...visitForm })
      });
      
      // ✅ FIX: Trigger the main data fetching logic to update visits state
      // This ensures the new visit shows up immediately.
      fetchData(); 

      setShowVisitModal(false);
      setVisitForm({ visit_type: "Outpatient", doctor_name: "" }); 
    } catch (err) {
      console.error('Error creating visit:', err);
      setError('Failed to create visit.');
    }
  };


  if (loading)
    return (
      <div className="p-8 text-gray-600 flex items-center justify-center min-h-screen">
        <Clock size={24} className="animate-spin mr-2" /> Loading patient data...
      </div>
    );

  if (error) return <div className="p-8 text-red-600 bg-red-50 rounded-lg">{error}</div>;
  if (!patient) return <div className="p-8 text-gray-600">Patient not found.</div>;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto bg-gray-50 min-h-screen">

      {/* Header & Actions */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
          <User size={40} className="text-blue-600 bg-blue-100 p-1 rounded-full" />
          {patient.first_name} {patient.last_name}
        </h1>

        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-md">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-700 p-2 rounded-lg flex items-center gap-1 hover:bg-gray-100 transition text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <Link to={`/patients/${patient.id}/request-test`} className="flex">
            <button className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition text-sm font-medium shadow-blue-300/50 shadow-lg">
              <PlusCircle size={16} /> New Test
            </button>
          </Link>

          <Link to={`/patients/${patient.id}/edit`} className="flex">
            <button className="text-yellow-600 p-2 rounded-lg flex items-center hover:bg-yellow-50 transition text-sm font-medium">
              <Edit size={16} /> Edit
            </button>
          </Link>

          <button
            onClick={handleDeleteClick}
            className="text-red-600 p-2 rounded-lg flex items-center hover:bg-red-50 transition text-sm font-medium"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --------------------------- COLUMN 1 & 2: INFO & HISTORY --------------------------- */}
        <div className="lg:col-span-2 space-y-8">
          {/* Patient Info Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold mb-5 border-b pb-2 text-gray-800 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-gray-500" /> Essential Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-10 text-gray-700">

              <InfoItem icon={User} color="text-blue-600" label="Lab ID" value={patient.lab_id} />
              <InfoItem icon={Calendar} color="text-green-600" label="Date of Birth" value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'} />
              <InfoItem icon={User} color="text-purple-600" label="Gender" value={patient.gender} />
              <InfoItem icon={Hospital} color="text-indigo-600" label="Ward" value={patient.ward_name} />
              <InfoItem icon={Stethoscope} color="text-amber-600" label="Referring Doctor" value={patient.referring_doctor} />
              <InfoItem icon={Phone} color="text-emerald-600" label="Contact" value={patient.contact_phone || patient.contact_info} />
            </div>
          </div>

          {/* Test History Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold mb-5 border-b pb-2 text-gray-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-gray-500" /> Test History
            </h2>
              <TestHistoryTable history={testHistory} />
          </div>
        </div>

        {/* --------------------------- COLUMN 3: VISIT TIMELINE --------------------------- */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 sticky top-4">
            <div className="flex justify-between items-center mb-5 border-b pb-2">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                    <CalendarPlus className="w-6 h-6 text-indigo-500" /> Visits Timeline
                </h2>
              <button
                onClick={() => setShowVisitModal(true)}
                className="text-blue-600 p-2 rounded-lg flex items-center gap-1 hover:bg-blue-50 transition text-sm font-medium"
              >
                <PlusCircle size={16} /> New
              </button>
            </div>

            <div className="relative pt-2">
                {visits.length === 0 ? (
                    <p className="text-gray-500 text-sm italic py-4">No visits recorded.</p>
                ) : (
                    <div className="space-y-4">
                        {visits.map((v) => <VisitCard key={v.id} visit={v} />)}
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    
      {/* New Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">Record New Visit</h3>

            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:ring-blue-500 focus:border-blue-500"
              value={visitForm.visit_type}
              onChange={(e) => setVisitForm({ ...visitForm, visit_type: e.target.value })}
            >
              <option>Outpatient</option>
              <option>Inpatient</option>
              <option>Emergency</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Doctor Name (optional)"
              value={visitForm.doctor_name}
              onChange={(e) => setVisitForm({ ...visitForm, doctor_name: e.target.value })}
            />

            <div className="flex justify-end gap-3">
              <button className="text-gray-700 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition" onClick={() => setShowVisitModal(false)}>Cancel</button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                onClick={handleSaveVisit}
              >
                Save Visit
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete Patient: ${patient.first_name} ${patient.last_name}`}
        message="Are you sure? This will also delete all test records."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Yes, Delete Permanently"
      />
    </div>
  );
};

// --- Sub-Components (Cleaned up) ---

const InfoItem = ({ icon: Icon, color, label, value }) => (
    <div className="flex items-start gap-3 text-gray-700">
        <Icon className={`${color} w-5 h-5 mt-1 flex-shrink-0`} />
        <div>
            <span className="font-medium text-sm text-gray-500 block">{label}</span>
            <span className="text-gray-800 text-base font-semibold">{value || 'N/A'}</span>
        </div>
    </div>
);

const TestHistoryTable = ({ history }) => (
    <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-600">Request ID</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-600">Status</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-600">Date Requested</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-600 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {history.length > 0 ? (
                    history.map((test) => (
                        <tr key={test.id} className="hover:bg-blue-50">
                            <td className="p-4 font-mono text-gray-800">{test.id}</td>
                            <td className="p-4">
                                <TestStatus status={test.status} />
                            </td>
                            <td className="p-4 text-gray-600">{new Date(test.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-center">
                                <Link
                                    to={`/tests/requests/${test.id}`}
                                    className="text-blue-600 inline-flex items-center gap-1 font-medium hover:text-blue-700 transition"
                                >
                                    View <ArrowUpRight size={14} />
                                </Link>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="4" className="p-6 text-center text-gray-500 italic">No test history found.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const TestStatus = ({ status }) => {
    const isCompleted = status === 'Verified' || status === 'Completed';
    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1 ${
                isCompleted 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}
        >
            {isCompleted ? <CheckCircle size={12} /> : <Clock5 size={12} />}
            {status}
        </span>
    );
};

export default PatientDetailPage;