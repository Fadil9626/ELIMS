import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Edit,
  Trash2,
  FileText,
  Search,
  UserPlus,
  CreditCard,
  Loader2,
  FileClock,
  CheckCircle,
  FileX,
  Beaker,
  AlertTriangle,
  Clock,
  Filter,
  MoreVertical,
  Printer // Added Printer icon
} from "lucide-react";
import { toast } from "react-hot-toast";
import apiFetch from "../../services/apiFetch";
import { useAuth } from "../../context/AuthContext";

// --- 📅 Helper: Human Friendly Age ---
const calculateHumanAgeFromDob = (dob) => {
  if (!dob) return "N/A";
  const birthDate = new Date(dob);
  const today = new Date();
  if (birthDate > today) return "N/A";

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
  const m = today.getMonth() - birthDate.getFullYear();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  return `${years} yr${years === 1 ? "" : "s"}`;
};

/* -----------------------------------------
   🎨 Status Badge Component
------------------------------------------ */
const StatusBadge = ({ status }) => {
  const s = (status || "pending").toLowerCase();
  let Icon = FileClock;
  let className = "bg-gray-100 text-gray-700 border-gray-200";
  let text = status || "Pending";

  if (s === "awaiting payment" || s === "unpaid") {
    Icon = CreditCard;
    className = "bg-amber-50 text-amber-700 border-amber-200";
    text = "Unpaid";
  } else if (s === "paid") {
    Icon = CheckCircle;
    className = "bg-emerald-50 text-emerald-700 border-emerald-200";
    text = "Paid";
  } else if (s === "awaiting sample collection" || s === "samplecollected") {
    Icon = Beaker;
    className = "bg-blue-50 text-blue-700 border-blue-200";
    text = "Sample Ready";
  } else if (s === "inprogress") {
    Icon = Loader2;
    className = "bg-indigo-50 text-indigo-700 border-indigo-200";
    text = "In Progress";
  } else if (s === "completed" || s === "verified") {
    Icon = CheckCircle;
    className = "bg-green-50 text-green-700 border-green-200";
    text = "Completed";
  } else if (s === "cancelled") {
    Icon = FileX;
    className = "bg-red-50 text-red-700 border-red-200";
    text = "Cancelled";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${className}`}>
      {s === "inprogress" ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {text}
    </span>
  );
};

/* -----------------------------------------
   ⚡ Priority Badge Component
------------------------------------------ */
const PriorityBadge = ({ priority }) => {
  const isUrgent = priority?.toUpperCase() === "URGENT";
  if (!isUrgent) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-red-100 text-red-700 border border-red-200 animate-pulse">
      <AlertTriangle size={10} /> Urgent
    </span>
  );
};

/* -----------------------------------------
   🔐 Safe Role Extractor
------------------------------------------ */
const extractUserRole = (user) => {
  if (!user) return "";
  if (typeof user.role === "string") return user.role;
  if (typeof user.primary_role === "string") return user.primary_role;
  if (Array.isArray(user.roles)) return user.roles[0];
  if (user.role && typeof user.role.name === "string") return user.role.name;
  return "";
};

const PatientDirectoryPage = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL"); // ALL, URGENT, ROUTINE
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [paymentData, setPaymentData] = useState({ amount: "", paymentMethod: "", items: [] });
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, can } = useAuth();

  const role = extractUserRole(user).toLowerCase();
  const isReceptionist = role === "receptionist";

  // Permissions
  const canCreatePatient = can("patients", "create");
  const canUpdatePatient = can("patients", "update");
  const canDeletePatient = can("patients", "delete");
  const canProcessPayment = can("billing", "create");
  const canViewBilling = can("billing", "view"); // Permission to view invoices

  // --- Load Patients ---
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await apiFetch("/api/patients");
        setPatients(data || []);
      } catch {
        toast.error("Failed to load patients.");
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // --- Actions ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this patient record?")) return;
    try {
      await apiFetch(`/api/patients/${id}`, { method: "DELETE" });
      setPatients((p) => p.filter((x) => x.id !== id));
      toast.success("Patient deleted.");
    } catch {
      toast.error("Failed to delete patient.");
    }
  };

  const openPaymentFor = async (patient) => {
    const requestId = patient.latest_request_id || patient.request_id;
    if (!requestId) return toast.error("No test request linked.");

    setSubmitting(true);
    setIsPaymentModalOpen(true);
    setSelectedPatient(patient);

    try {
      const reqDetails = await apiFetch(`/api/test-requests/${requestId}`);
      const total = Number(reqDetails.payment_amount) > 0
          ? Number(reqDetails.payment_amount)
          : (reqDetails.items || []).reduce((sum, item) => sum + Number(item.price || 0), 0);

      setPaymentData({
        amount: total.toFixed(2),
        paymentMethod: "Cash",
        items: reqDetails.items || [],
      });
    } catch (err) {
      toast.error("Could not load test request.");
      setIsPaymentModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const requestId = selectedPatient?.latest_request_id || selectedPatient?.request_id;
    if (!requestId) return toast.error("No test request found.");
    if (!paymentData.paymentMethod) return toast.error("Choose payment method.");

    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/test-requests/${requestId}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(paymentData.amount),
          paymentMethod: paymentData.paymentMethod,
        }),
      });

      toast.success("Payment recorded successfully.");
      const newStatus = response.payment_status || "Paid";

      setPatients((prev) => prev.map((p) => p.id === selectedPatient.id ? {
          ...p,
          payment_status: newStatus,
          latest_request_payment_status: newStatus,
          latest_request_status: response.next_status || p.latest_request_status,
      } : p));

      setIsPaymentModalOpen(false);
      setSelectedPatient(null);
    } catch {
      toast.error("Payment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Filtering & Sorting ---
  const filteredPatients = useMemo(() => {
    // 1. Filter
    const filtered = patients.filter((p) => {
      const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      const q = searchTerm.toLowerCase();
      const matchesSearch = fullName.includes(q) || 
                            (p.lab_id || "").toLowerCase().includes(q) || 
                            (p.mrn || "").toLowerCase().includes(q);
      
      const matchesPriority = filterPriority === "ALL" 
          ? true 
          : filterPriority === "URGENT" 
            ? p.priority?.toUpperCase() === "URGENT" 
            : p.priority?.toUpperCase() !== "URGENT";

      return matchesSearch && matchesPriority;
    });

    // 2. Sort (Urgent first)
    return filtered.sort((a, b) => {
      const pA = a.priority?.toUpperCase() === 'URGENT' ? 1 : 0;
      const pB = b.priority?.toUpperCase() === 'URGENT' ? 1 : 0;
      return pB - pA; 
    });
  }, [patients, searchTerm, filterPriority]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
      <Loader2 className="w-10 h-10 animate-spin mb-2 text-blue-600" />
      <p className="font-medium">Loading Directory...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/30">
      
      {/* --- Header Area --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="text-blue-600" /> Patient Directory
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage patient records, admissions, and billing.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search name, MRN..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm appearance-none cursor-pointer hover:border-gray-300"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="ROUTINE">Routine Only</option>
            </select>
          </div>

          {canCreatePatient && (
            <button
              onClick={() => navigate("/patients/register")}
              className="bg-gray-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl text-sm font-medium active:scale-95"
            >
              <UserPlus size={16} /> Add Patient
            </button>
          )}
        </div>
      </div>

      {/* --- Desktop Table --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient ID</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name & Age</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => {
                const isUrgent = p.priority?.toUpperCase() === 'URGENT';
                const ageDisplay = calculateHumanAgeFromDob(p.date_of_birth);
                const payStatus = p.payment_status || p.latest_request_payment_status || "";
                const isPaid = payStatus.toLowerCase() === "paid";
                const hasRequest = p.latest_request_id || p.request_id;
                const requestId = p.latest_request_id || p.request_id; // Get request ID for links

                return (
                  <tr key={p.id} className={`group transition-colors ${isUrgent ? "bg-red-50/30 hover:bg-red-50/60" : "hover:bg-gray-50/50"}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {isUrgent && <div className="w-1.5 h-8 bg-red-500 rounded-full"></div>}
                        <div>
                          <p className="font-mono text-xs font-bold text-gray-700">{p.lab_id || p.mrn || "—"}</p>
                          <PriorityBadge priority={p.priority} />
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <Link to={`/patients/${p.id}`} className="block">
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {p.gender === "Male" ? "M" : "F"} • {ageDisplay}
                        </p>
                      </Link>
                    </td>

                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {p.ward_name || <span className="text-gray-400 italic">Outpatient</span>}
                    </td>

                    <td className="p-4">
                      <StatusBadge status={p.latest_request_status} />
                    </td>

                    <td className="p-4">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                          <CheckCircle size={12}/> Paid
                        </span>
                      ) : canProcessPayment && hasRequest ? (
                        <button
                          onClick={() => openPaymentFor(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-rose-600 text-xs border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm font-medium"
                        >
                          <CreditCard size={12} /> Pay Now
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Due</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                         
                        {/* 🧾 PRINT INVOICE BUTTON (Visible when Paid) */}
                        {isPaid && canViewBilling && hasRequest && (
                           <Link to={`/invoices/test-request/${requestId}`}>
                             <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-green-600 transition-all border border-transparent hover:border-gray-200" title="Print Invoice">
                               <Printer size={16} />
                             </button>
                           </Link>
                        )}

                        {canUpdatePatient && !isPaid && !isReceptionist && (
                          <Link to={`/patients/${p.id}/edit`}>
                            <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-200">
                              <Edit size={16} />
                            </button>
                          </Link>
                        )}
                        {hasRequest && (
                          <Link to={`/tests/requests/${p.latest_request_id || p.request_id}`}>
                            <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-blue-600 transition-all border border-transparent hover:border-gray-200" title="View Request">
                              <FileText size={16} />
                            </button>
                          </Link>
                        )}
                        {canDeletePatient && !isPaid && !isReceptionist && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 hover:bg-red-50 hover:shadow-sm rounded-lg text-gray-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-16">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-gray-300" size={32} />
                  </div>
                  <p className="text-gray-500 font-medium">No patients found.</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Mobile Card View --- */}
      <div className="md:hidden space-y-4">
        {filteredPatients.map((p) => {
           const isUrgent = p.priority?.toUpperCase() === 'URGENT';
           const hasRequest = p.latest_request_id || p.request_id;
           const payStatus = p.payment_status || p.latest_request_payment_status || "";
           const isPaid = payStatus.toLowerCase() === "paid";
           const requestId = p.latest_request_id || p.request_id;

           return (
             <div key={p.id} className={`bg-white p-4 rounded-xl shadow-sm border ${isUrgent ? 'border-l-4 border-l-red-500 border-y-gray-200 border-r-gray-200' : 'border-gray-200'}`}>
               <div className="flex justify-between items-start mb-3">
                 <div>
                   <div className="flex items-center gap-2">
                     <h3 className="font-bold text-gray-900 text-lg">{p.first_name} {p.last_name}</h3>
                     {isUrgent && <AlertTriangle size={16} className="text-red-500 animate-pulse"/>}
                   </div>
                   <p className="text-xs text-gray-500 font-mono">{p.lab_id || p.mrn}</p>
                 </div>
                 <StatusBadge status={p.latest_request_status} />
               </div>

               <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                 <div className="bg-gray-50 p-2 rounded-lg">
                   <span className="text-xs text-gray-400 block uppercase">Age/Sex</span>
                   <span className="font-medium">{calculateHumanAgeFromDob(p.date_of_birth)} / {p.gender?.[0]}</span>
                 </div>
                 <div className="bg-gray-50 p-2 rounded-lg">
                   <span className="text-xs text-gray-400 block uppercase">Ward</span>
                   <span className="font-medium">{p.ward_name || "OPD"}</span>
                 </div>
               </div>

               <div className="flex items-center justify-between border-t pt-3 mt-2">
                 <div className="flex gap-1">
                    {/* Primary Actions on Mobile */}
                    {isPaid && canViewBilling && hasRequest ? (
                       <Link to={`/invoices/test-request/${requestId}`} className="p-2 bg-green-50 rounded text-green-600" title="Print Invoice">
                          <Printer size={16}/>
                       </Link>
                    ) : canProcessPayment && hasRequest && (
                      <button onClick={() => openPaymentFor(p)} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1">
                        <CreditCard size={12}/> Pay
                      </button>
                    )}

                    {/* Secondary Actions */}
                    <Link to={`/patients/${p.id}`} className="p-2 bg-blue-50 rounded text-blue-600"><User size={16}/></Link>
                    {canUpdatePatient && !isPaid && !isReceptionist && (
                      <Link to={`/patients/${p.id}/edit`} className="p-2 bg-gray-100 rounded text-gray-600"><Edit size={16}/></Link>
                    )}
                 </div>
                 
                 {isPaid ? (
                    <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Paid</span>
                 ) : canProcessPayment && hasRequest ? (
                    null // Pay button already placed above
                 ) : (
                    <span className="text-xs text-gray-400 italic">No Due</span>
                 )}
               </div>
             </div>
           )
        })}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Process Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FileX size={20}/></button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl mb-6 flex items-center justify-between">
              <span className="text-blue-700 font-medium text-sm">Total Due</span>
              <span className="text-2xl font-bold text-blue-900">Le {Number(paymentData.amount).toLocaleString()}</span>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Cash', 'Mobile Money', 'Card'].map(method => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentData({...paymentData, paymentMethod: method})}
                      className={`py-2.5 text-sm font-medium rounded-lg border transition-all ${
                        paymentData.paymentMethod === method 
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !paymentData.paymentMethod}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18}/>}
                {submitting ? "Processing..." : "Confirm Payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDirectoryPage;