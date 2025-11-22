import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import apiFetch from "../../services/apiFetch";
import ConfirmModal from "../../components/layout/ConfirmModal";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

import {
  Phone, User, Calendar, Hospital, Stethoscope, ArrowLeft,
  Edit, Trash2, PlusCircle, CalendarPlus, Clock, HeartPulse,
  ClipboardCheck, FileText, AlertCircle, Mail, MapPin, Activity,
  StickyNote, X, Pencil, ChevronRight, AlertTriangle, Pill, FilePlus,
  Save // 👈 Fixed: Added missing import
} from "lucide-react";

// --- 🛡️ Permission Helper Component ---
const Can = ({ module, action, children }) => {
  const { user } = useAuth();
  const targetCode = `${module}:${action}`;
  
  if (user?.role_id === 1) return children;

  const permissionsList = Array.isArray(user?.permissions) ? user.permissions : [];

  const hasPermission = 
    permissionsList.includes(targetCode) ||
    permissionsList.some(p => 
      (typeof p === 'object' && p.code === targetCode) || 
      (typeof p === 'object' && p.module === module && p.action === action)
    ) ||
    user?.permissions_map?.[targetCode];

  return hasPermission ? children : null;
};

// --- UI Components ---

const SectionHeader = ({ title, action }) => (
  <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
    <h3 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h3>
    {action}
  </div>
);

const InfoCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
    <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold border-b border-gray-100 pb-3">
      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
        <Icon size={18} />
      </div>
      {title}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 group">
    {Icon && <div className="mt-0.5 text-gray-400 group-hover:text-gray-600 transition-colors"><Icon size={16}/></div>}
    <div className="flex-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value || "—"}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const s = (status || "Pending").toLowerCase();
  const styles = {
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
    released: "bg-emerald-100 text-emerald-700 border-emerald-200",
    inprogress: "bg-blue-50 text-blue-700 border-blue-200",
    samplereceived: "bg-purple-50 text-purple-700 border-purple-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const style = styles[s] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} inline-flex items-center gap-1`}>
      <div className={`w-1.5 h-1.5 rounded-full ${s === 'completed' ? 'bg-emerald-500' : 'bg-current'}`}></div>
      {status}
    </span>
  );
};

const VisitTimelineItem = ({ visit, onEdit, onDelete }) => (
  <div className="relative pl-8 pb-8 last:pb-0 group">
    <div className="absolute left-[11px] top-3 h-full w-0.5 bg-gray-100 group-last:hidden"></div>
    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-indigo-50 border-4 border-white shadow-sm flex items-center justify-center text-indigo-600 z-10">
      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
    </div>
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 relative">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-base">{visit.visit_type}</span>
            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              {new Date(visit.visit_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
            <Stethoscope size={14} className="text-gray-400" /> 
            <span className="font-medium text-gray-700">{visit.doctor_name || "Unassigned"}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Can module="visits" action="update">
            <button onClick={() => onEdit(visit)} className="p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all" title="Edit">
              <Pencil size={16} />
            </button>
          </Can>
          <Can module="visits" action="delete">
            <button onClick={() => onDelete(visit.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all" title="Delete">
              <Trash2 size={16} />
            </button>
          </Can>
        </div>
      </div>
      {(visit.diagnosis || visit.notes) && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm border border-gray-100/50">
          {visit.diagnosis && (
            <div className="flex gap-2">
              <Activity size={16} className="text-indigo-500 mt-0.5 shrink-0" />
              <span className="text-gray-700 font-medium">{visit.diagnosis}</span>
            </div>
          )}
          {visit.notes && (
            <div className="flex gap-2">
              <StickyNote size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-600 italic">{visit.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

// --- 🆕 Medical Record Card Component ---
const MedicalRecordCard = ({ record, onEdit, onDelete }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all mb-4 group relative">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h4 className="font-bold text-gray-900 text-lg">{record.diagnosis}</h4>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <Clock size={12} /> Recorded on {new Date(record.created_at).toLocaleDateString()} by <span className="font-medium">{record.doctor_name}</span>
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Can module="medical_records" action="manage">
          <button onClick={() => onEdit(record)} className="p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all">
            <Pencil size={16}/>
          </button>
          <button onClick={() => onDelete(record.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all">
            <Trash2 size={16}/>
          </button>
        </Can>
      </div>
    </div>
    
    <div className="space-y-3">
      {record.medications && (
        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
          <div className="flex items-center gap-2 mb-1 text-blue-700 font-semibold text-xs uppercase tracking-wide">
            <Pill size={14} /> Medications
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap pl-1">{record.medications}</p>
        </div>
      )}
      
      {record.treatment_plan && (
        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50">
          <div className="flex items-center gap-2 mb-1 text-emerald-700 font-semibold text-xs uppercase tracking-wide">
            <ClipboardCheck size={14} /> Treatment Plan
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap pl-1">{record.treatment_plan}</p>
        </div>
      )}
      
      {record.next_visit_date && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100 mt-1">
          <Calendar size={12} /> Next Review: {new Date(record.next_visit_date).toLocaleDateString()}
        </div>
      )}
    </div>
  </div>
);

// --- Main Page ---

const PatientDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [visits, setVisits] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]); // New State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("history");
  
  // Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showMedRecordModal, setShowMedRecordModal] = useState(false); // New Modal

  // Forms
  const [visitForm, setVisitForm] = useState({ id: null, visit_type: "Outpatient", doctor_name: "", diagnosis: "", notes: "" });
  const [medRecordForm, setMedRecordForm] = useState({ id: null, diagnosis: "", medications: "", treatment_plan: "", next_visit_date: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all data in parallel. Med records will fail silently if unauthorized.
      const [patientData, testData, visitData, medData] = await Promise.all([
        apiFetch(`/api/patients/${id}`),
        apiFetch(`/api/test-requests/patient/${id}`),
        apiFetch(`/api/visits/patient/${id}`).catch(() => []),
        apiFetch(`/api/medical-records/patient/${id}`).catch(() => [])
      ]);
      setPatient(patientData);
      setTestHistory(Array.isArray(testData) ? testData : []);
      setVisits(Array.isArray(visitData) ? visitData : []);
      setMedicalRecords(Array.isArray(medData) ? medData : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Could not load patient record. It may have been deleted.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Handlers ---

  const handleDeletePatient = async () => {
    try {
      await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
      toast.success("Patient record deleted.");
      navigate('/patients');
    } catch (err) {
      toast.error(err.message || "Failed to delete patient.");
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const method = visitForm.id ? 'PUT' : 'POST';
      const url = visitForm.id ? `/api/visits/${visitForm.id}` : '/api/visits';
      const body = { ...visitForm, patient_id: id };
      
      await apiFetch(url, { method, body: JSON.stringify(body) });
      toast.success(visitForm.id ? "Visit updated" : "Visit recorded");
      setShowVisitModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if(!window.confirm("Are you sure you want to delete this visit record?")) return;
    try {
      await apiFetch(`/api/visits/${visitId}`, { method: "DELETE" });
      toast.success("Visit deleted");
      setVisits(prev => prev.filter(v => v.id !== visitId));
    } catch (err) {
      toast.error(err.message || "Could not delete visit");
    }
  };

  // --- New Medical Record Handlers ---
  const handleMedRecordSubmit = async (e) => {
    e.preventDefault();
    if(saving) return;
    try {
      setSaving(true);
      const method = medRecordForm.id ? 'PUT' : 'POST';
      const url = medRecordForm.id ? `/api/medical-records/${medRecordForm.id}` : '/api/medical-records';
      const body = { ...medRecordForm, patient_id: id };

      await apiFetch(url, { method, body: JSON.stringify(body) });
      toast.success("Medical record saved");
      setShowMedRecordModal(false);
      fetchData(); // Refresh data to show new record
    } catch(err) {
      toast.error(err.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedRecord = async (recId) => {
    if(!window.confirm("Delete this medical record?")) return;
    try {
      await apiFetch(`/api/medical-records/${recId}`, { method: "DELETE" });
      toast.success("Record deleted");
      setMedicalRecords(prev => prev.filter(r => r.id !== recId));
    } catch(err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <Activity className="w-10 h-10 mb-4 text-indigo-500 animate-spin" />
      <p className="font-medium animate-pulse">Loading Patient Record...</p>
    </div>
  );

  if (error) return (
    <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-red-50 p-6 rounded-full mb-6"><AlertCircle className="text-red-500 w-10 h-10" /></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Patient</h2>
      <p className="text-gray-500 mb-8 max-w-md">{error}</p>
      <button onClick={() => navigate('/patients')} className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-medium">
        Return to Directory
      </button>
    </div>
  );

  const ageDisplay = patient.date_of_birth 
    ? `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years`
    : "N/A";

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
      
      {/* --- Top Navigation Bar --- */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link to="/patients" className="hover:text-indigo-600 transition">Patients</Link>
                <ChevronRight size={14} />
                <span className="font-medium text-gray-900">Profile</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Can module="test_requests" action="create">
                <Link to={`/tests/requests/new?patientId=${patient.id}`}>
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all flex items-center gap-2 text-sm">
                    <PlusCircle size={16} /> New Order
                  </button>
                </Link>
              </Can>
              <div className="h-6 w-px bg-gray-200 mx-1"></div>
              <Can module="patients" action="update">
                <Link to={`/patients/${patient.id}/edit`}>
                  <button className="p-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition" title="Edit Patient">
                    <Edit size={18} />
                  </button>
                </Link>
              </Can>
              <Can module="patients" action="delete">
                <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition" title="Delete Record">
                  <Trash2 size={18} />
                </button>
              </Can>
            </div>
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* Patient Identity Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-indigo-200">
              {patient.first_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {patient.first_name} <span className="text-gray-600 font-medium">{patient.last_name}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono border border-gray-200">{patient.mrn || patient.lab_id}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><User size={14}/> {patient.gender}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar size={14}/> {ageDisplay}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full"><Hospital size={14}/> {patient.ward_name || "Outpatient"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Navigation & Profile Summary */}
          <div className="lg:col-span-3 space-y-6">
            <nav className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {[
                { id: 'history', label: 'Test History', icon: FileText, count: testHistory.length },
                { id: 'visits', label: 'Timeline & Visits', icon: CalendarPlus, count: visits.length },
                { id: 'records', label: 'Medical Records', icon: Activity, count: medicalRecords.length, permission: 'medical_records:view' },
                { id: 'profile', label: 'Detailed Profile', icon: ClipboardCheck },
              ].map(tab => {
                // Secure Tab visibility
                if (tab.permission) {
                   const targetCode = tab.permission;
                   const permissionsList = Array.isArray(user?.permissions) ? user.permissions : [];
                   const hasPerm = user?.role_id === 1 || 
                                   permissionsList.includes(targetCode) ||
                                   permissionsList.some(p => typeof p === 'object' && p.code === targetCode) ||
                                   user?.permissions_map?.[targetCode];
                   if (!hasPerm) return null;
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-between px-5 py-4 text-sm font-medium transition-all border-l-4 ${
                      activeTab === tab.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon size={18} className={activeTab === tab.id ? "text-indigo-600" : "text-gray-400"} />
                      {tab.label}
                    </div>
                    {tab.count !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Quick Contact Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Contact</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Phone size={16}/></div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{patient.contact_phone || "No number"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail size={16}/></div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{patient.contact_email || "No email"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Content Area */}
          <div className="lg:col-span-9">
            
            {/* --- TAB: HISTORY --- */}
            {activeTab === 'history' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">Lab Requests</h2>
                  <Can module="test_requests" action="create">
                    <Link to={`/tests/requests/new?patientId=${patient.id}`} className="text-sm text-indigo-600 font-medium hover:underline">
                      + Create New Request
                    </Link>
                  </Can>
                </div>

                {testHistory.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Requests Found</h3>
                    <p className="text-gray-500 mb-4">This patient has no lab test history yet.</p>
                    <Can module="test_requests" action="create">
                      <Link to={`/tests/requests/new?patientId=${patient.id}`}>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow-sm">Order First Test</button>
                      </Link>
                    </Can>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {testHistory.map((req) => (
                      <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">#{req.id}</span>
                              <StatusBadge status={req.status} />
                              {req.priority === 'URGENT' && (
                                <span className="flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                                  <AlertTriangle size={10} /> URGENT
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-gray-900 text-base mb-1">{req.ordered_tests || "General Request"}</h4>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Clock size={12}/> {new Date(req.created_at).toLocaleString()}</span>
                              <span className={`font-medium ${req.payment_status === 'Paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                • {req.payment_status || 'Unpaid'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:self-center">
                            <Can module="test_requests" action="update">
                              {(req.status === 'Pending' || req.status === 'SampleReceived') && (
                                <Link to={`/tests/requests/${req.id}/edit`}>
                                  <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-white hover:text-indigo-600 border border-transparent hover:border-indigo-200 rounded-lg transition-all">
                                    Edit
                                  </button>
                                </Link>
                              )}
                            </Can>
                            <Link to={`/tests/requests/${req.id}`}>
                              <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all">
                                View Report
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- TAB: MEDICAL RECORDS (NEW) --- */}
            {activeTab === 'records' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader 
                  title="Medical Records" 
                  action={
                    <Can module="medical_records" action="manage">
                      <button 
                        onClick={() => { setMedRecordForm({ id: null, diagnosis: "", medications: "", treatment_plan: "", next_visit_date: "" }); setShowMedRecordModal(true); }}
                        className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition flex items-center gap-2 border border-indigo-100"
                      >
                        <FilePlus size={16}/> Add Record
                      </button>
                    </Can>
                  } 
                />
                {medicalRecords.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Activity size={32} className="mx-auto mb-3 text-gray-300"/>
                    <p className="text-gray-500">No medical history records found.</p>
                  </div>
                ) : (
                  medicalRecords.map(rec => (
                    <MedicalRecordCard 
                      key={rec.id} 
                      record={rec} 
                      onEdit={(r) => { setMedRecordForm(r); setShowMedRecordModal(true); }} 
                      onDelete={handleDeleteMedRecord} 
                    />
                  ))
                )}
              </div>
            )}

            {/* --- TAB: VISITS --- */}
            {activeTab === 'visits' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader 
                  title="Clinical Timeline" 
                  action={
                    <Can module="visits" action="create">
                      <button 
                        onClick={() => { setVisitForm({ id: null, visit_type: "Outpatient", doctor_name: "", diagnosis: "", notes: "" }); setShowVisitModal(true); }}
                        className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition flex items-center gap-2"
                      >
                        <PlusCircle size={16}/> Add Visit
                      </button>
                    </Can>
                  } 
                />
                
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200/60">
                  {visits.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <CalendarPlus size={48} className="mx-auto mb-3 opacity-20" />
                      <p>No visit history recorded.</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {visits.map(v => (
                        <VisitTimelineItem 
                          key={v.id} 
                          visit={v} 
                          onEdit={() => { setVisitForm(v); setShowVisitModal(true); }} 
                          onDelete={handleDeleteVisit} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- TAB: PROFILE --- */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <InfoCard title="Personal Details" icon={User}>
                  <InfoRow label="Full Name" value={`${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}`} />
                  <InfoRow label="Date of Birth" value={`${new Date(patient.date_of_birth).toLocaleDateString()} (${ageDisplay})`} />
                  <InfoRow label="Gender" value={patient.gender} />
                  <InfoRow label="Marital Status" value={patient.marital_status} />
                  <InfoRow label="Occupation" value={patient.occupation} />
                </InfoCard>

                <InfoCard title="Contact Information" icon={MapPin}>
                  <InfoRow label="Address" value={patient.contact_address || patient.address} />
                  <InfoRow label="Primary Phone" value={patient.contact_phone} />
                  <InfoRow label="Email" value={patient.contact_email} />
                </InfoCard>

                <InfoCard title="Emergency Contact" icon={AlertCircle}>
                  <InfoRow label="Name" value={patient.emergency_name} />
                  <InfoRow label="Relationship" value={patient.emergency_relationship} />
                  <InfoRow label="Phone" value={patient.emergency_phone} />
                </InfoCard>

                <InfoCard title="Clinical Info" icon={Stethoscope}>
                  <InfoRow label="Referring Doctor" value={patient.referring_doctor} />
                  <InfoRow label="Admission Type" value={patient.admission_type || "Outpatient"} />
                  <InfoRow label="Current Ward" value={patient.ward_name} />
                </InfoCard>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* --- Visit Modal --- */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative transform transition-all scale-100">
            <button onClick={() => setShowVisitModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                <CalendarPlus size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{visitForm.id ? 'Update Visit Details' : 'Record New Visit'}</h3>
              <p className="text-sm text-gray-500">Enter clinical details for this interaction.</p>
            </div>
            
            <form onSubmit={handleVisitSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Visit Type</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={visitForm.visit_type}
                    onChange={e => setVisitForm({...visitForm, visit_type: e.target.value})}
                  >
                    <option>Outpatient</option>
                    <option>Inpatient</option>
                    <option>Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Doctor</label>
                  <input 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Dr. Name"
                    value={visitForm.doctor_name}
                    onChange={e => setVisitForm({...visitForm, doctor_name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Clinical Diagnosis (Optional)</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input 
                    className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g., Acute Malaria"
                    value={visitForm.diagnosis}
                    onChange={e => setVisitForm({...visitForm, diagnosis: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Clinical Notes</label>
                <textarea 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                  placeholder="Add any observation notes..."
                  value={visitForm.notes}
                  onChange={e => setVisitForm({...visitForm, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowVisitModal(false)} className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingVisit}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {savingVisit ? <Activity size={18} className="animate-spin"/> : <Save size={18}/>}
                  {savingVisit ? 'Saving...' : (visitForm.id ? 'Update Record' : 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Medical Record Modal --- */}
      {showMedRecordModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative transform transition-all scale-100">
            <button onClick={() => setShowMedRecordModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 mb-3">
                <ClipboardCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{medRecordForm.id ? 'Update Medical Record' : 'New Medical Record'}</h3>
              <p className="text-sm text-gray-500">Document diagnosis, treatment, and plans.</p>
            </div>
            
            <form onSubmit={handleMedRecordSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Diagnosis</label>
                <input 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  placeholder="Primary Diagnosis"
                  value={medRecordForm.diagnosis}
                  onChange={e => setMedRecordForm({...medRecordForm, diagnosis: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Medications</label>
                <textarea 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all h-20 resize-none"
                  placeholder="List medications..."
                  value={medRecordForm.medications}
                  onChange={e => setMedRecordForm({...medRecordForm, medications: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Treatment Plan</label>
                <textarea 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all h-20 resize-none"
                  placeholder="Plan details..."
                  value={medRecordForm.treatment_plan}
                  onChange={e => setMedRecordForm({...medRecordForm, treatment_plan: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Next Visit</label>
                <input 
                  type="date"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  value={medRecordForm.next_visit_date ? new Date(medRecordForm.next_visit_date).toISOString().split('T')[0] : ''}
                  onChange={e => setMedRecordForm({...medRecordForm, next_visit_date: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMedRecordModal(false)} className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-semibold shadow-md hover:bg-teal-700 hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Activity size={18} className="animate-spin"/> : <Save size={18}/>}
                  {saving ? 'Saving...' : (medRecordForm.id ? 'Update Record' : 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Patient Record"
        message="Are you sure? This will permanently remove the patient and all associated history. This action cannot be undone."
        onConfirm={handleDeletePatient}
        onCancel={() => setIsDeleteModalOpen(false)}
        confirmText="Delete Forever"
        confirmColor="bg-red-600 hover:bg-red-700"
      />

    </div>
  );
};

export default PatientDetailPage;