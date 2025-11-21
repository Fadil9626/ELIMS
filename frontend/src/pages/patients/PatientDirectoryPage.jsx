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
  AlertTriangle, // Added for urgent icon
  Clock,         // Added for routine icon
} from "lucide-react";
import { toast } from "react-hot-toast";
import apiFetch from "../../services/apiFetch";
import { useAuth } from "../../context/AuthContext";

// 🔑 FIX 1: Import the human age calculation helper from the Registration page component
// Since the files are in different directories, we rely on the copied version below
// or you must adjust the path: import { calculateHumanAge } from '../patients/PatientRegistrationPage'; 

/* -------------------------------------------------
 * 📅 Helper: Calculates human-friendly age (days/weeks/months/years)
 * ⚠️ COPIED HERE for self-contained functionality, since direct import path is complex
 * ------------------------------------------------- */
const calculateHumanAgeFromDob = (dob) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();

    if (birthDate > today) {
        return "N/A";
    }

    const diffMs = today.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
        const days = diffDays;
        return `${days} day${days === 1 ? "" : "s"}`;
    }
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} wk${weeks === 1 ? "" : "s"}`; // wk for weeks
    }
    if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} mo${months === 1 ? "" : "s"}`; // mo for months
    }
    
    // 1+ years (exact)
    let years = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        years--;
    }
    return `${years} yr${years === 1 ? "" : "s"}`; // yr for years
};

/* -----------------------------------------
   🎨 Status Badge Component
------------------------------------------ */
const StatusBadge = ({ status, priority }) => {
  const s = (status || "pending").toLowerCase();
  let Icon = FileClock;
  let className = "bg-gray-100 text-gray-800 border-gray-200";
  let text = status || "Pending";

  // 🔑 URGENT CHECK: Override based on Triage priority
  const isUrgent = priority?.toUpperCase() === 'URGENT';
  if (isUrgent) {
      Icon = AlertTriangle;
      className = "bg-red-50 text-red-700 border-red-300 font-bold shadow-sm";
      text = "URGENT";
  } else if (s === "awaiting payment" || s === "unpaid") {
    Icon = CreditCard;
    className = "bg-rose-100 text-rose-800 border-rose-200";
    text = "Awaiting Payment";
  } else if (s === "paid") {
    Icon = CheckCircle;
    className = "bg-green-100 text-green-800 border-green-200";
    text = "Paid";
  } else if (s === "awaiting sample collection" || s === "samplecollected") {
    Icon = Beaker;
    className = "bg-blue-100 text-blue-800 border-blue-200";
    text = "Awaiting Sample";
  } else if (s === "inprogress") {
    Icon = Loader2;
    className = "bg-cyan-100 text-cyan-900 border-cyan-200";
    text = "In Progress";
  } else if (s === "completed") {
    Icon = CheckCircle;
    className = "bg-emerald-100 text-emerald-900 border-emerald-200";
    text = "Completed";
  } else if (s === "verified") {
    Icon = CheckCircle;
    className = "bg-teal-100 text-teal-900 border-teal-200";
    text = "Verified";
  } else if (s === "cancelled") {
    Icon = FileX;
    className = "bg-red-100 text-red-800 border-red-200";
    text = "Cancelled";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${className} ${s === "inprogress" ? "animate-none" : ""}`}
    >
      {s === "inprogress" ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Icon size={14} />
      )}
      {text}
    </span>
  );
};

/* -----------------------------------------
   🔐 SAFE ROLE EXTRACTOR (FIX)
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
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "",
    items: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, can } = useAuth();

  // 🛡 Safe role extraction (no crash)
  const role = extractUserRole(user).toLowerCase();
  const isReceptionist = role === "receptionist";

  // RBAC-based permissions
  const canCreatePatient = can("patients", "create");
  const canUpdatePatient = can("patients", "update");
  const canDeletePatient = can("patients", "delete");
  const canProcessPayment = can("billing", "create");

  /* -----------------------------------------
     🔄 Load Patients
  ------------------------------------------ */
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // Assuming the patient API now returns 'priority'
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

  /* -----------------------------------------
     ❌ Delete Patient
  ------------------------------------------ */
  const handleDelete = async (id) => {
    // ⚠️ Changed window.confirm to a custom modal is highly recommended in production apps.
    if (!window.confirm("Delete this patient?")) return;
    try {
      await apiFetch(`/api/patients/${id}`, { method: "DELETE" });
      setPatients((p) => p.filter((x) => x.id !== id));
      toast.success("Patient deleted.");
    } catch {
      toast.error("Failed to delete patient.");
    }
  };

  /* -----------------------------------------
     💵 Open Payment Modal
  ------------------------------------------ */
  const openPaymentFor = async (patient) => {
    const requestId = patient.latest_request_id || patient.request_id;
    if (!requestId) return toast.error("No test request linked.");

    setSubmitting(true);
    setIsPaymentModalOpen(true);
    setSelectedPatient(patient);

    try {
      const reqDetails = await apiFetch(`/api/test-requests/${requestId}`);

      const total =
        Number(reqDetails.payment_amount) > 0
          ? Number(reqDetails.payment_amount)
          : (reqDetails.items || []).reduce(
              (sum, item) => sum + Number(item.price || 0),
              0
            );

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

  /* -----------------------------------------
     💳 Process Payment
  ------------------------------------------ */
  const handleProcessPayment = async (e) => {
    e.preventDefault();

    const requestId =
      selectedPatient?.latest_request_id || selectedPatient?.request_id;

    if (!requestId) return toast.error("No test request found.");
    if (!paymentData.paymentMethod)
      return toast.error("Choose payment method.");

    setSubmitting(true);

    try {
      const response = await apiFetch(
        `/api/test-requests/${requestId}/payment`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: parseFloat(paymentData.amount),
            paymentMethod: paymentData.paymentMethod,
          }),
        }
      );

      toast.success("Payment recorded successfully.");

      const newStatus = response.payment_status || "Paid";

      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatient.id
            ? {
                ...p,
                payment_status: newStatus,
                latest_request_payment_status: newStatus,
                latest_request_status:
                  response.next_status || p.latest_request_status,
              }
            : p
        )
      );

      setIsPaymentModalOpen(false);
      setSelectedPatient(null);
    } catch {
      toast.error("Payment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  /* -----------------------------------------
     🔍 Search Filter
  ------------------------------------------ */
  const filteredPatients = useMemo(
    () => {
        // 🔑 FIX 3: Sort patients by URGENT priority first
        const sortedPatients = [...patients].sort((a, b) => {
            const priorityA = a.priority?.toUpperCase() === 'URGENT' ? 1 : 0;
            const priorityB = b.priority?.toUpperCase() === 'URGENT' ? 1 : 0;
            // Sort URGENT (1) before ROUTINE (0)
            return priorityB - priorityA; 
        });

        return sortedPatients.filter((p) => {
            const fullName = `${p.first_name || ""} ${
              p.last_name || ""
            }`.toLowerCase();
            const q = searchTerm.toLowerCase();
            return (
              fullName.includes(q) ||
              (p.lab_id || "").toLowerCase().includes(q) ||
              (p.mrn || "").toLowerCase().includes(q) // Added MRN search
            );
        });
    },
    [patients, searchTerm]
  );

  if (loading)
    return (
      <div className="p-6 text-blue-600 flex items-center gap-2">
        <Loader2 className="animate-spin" /> Loading…
      </div>
    );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
          <User className="text-blue-600" /> Patient Directory
        </h1>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, Lab ID, or MRN..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {canCreatePatient && (
            <button
              onClick={() => navigate("/patients/register")}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
            >
              <UserPlus size={18} /> Add Patient
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-2xl border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-700">
            <tr>
              <th className="p-4">Lab ID</th>
              <th className="p-4">Patient</th>
              <th className="p-4">Age</th>
              <th className="p-4">Ward</th>
              <th className="p-4">Latest Status</th>
              <th className="p-4">Payment</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => {
                
                // 🔑 FIX 2: Use human age calculation
                const ageDisplay = calculateHumanAgeFromDob(p.date_of_birth);
                
                const payStatus =
                  p.payment_status ||
                  p.latest_request_payment_status ||
                  "";
                const isPaid =
                  payStatus.toLowerCase() === "paid";
                const hasRequest =
                  p.latest_request_id || p.request_id;
                
                // 🔑 FIX 4: Determine urgent status
                const isUrgent = p.priority?.toUpperCase() === 'URGENT';
                const rowClass = isUrgent 
                    ? "bg-red-50 hover:bg-red-100 border-l-4 border-red-500 transition-colors" 
                    : "hover:bg-blue-50 transition-colors";

                return (
                  <tr key={p.id} className={rowClass}>
                    <td className="p-4 font-mono font-semibold text-xs text-gray-700">
                        {isUrgent && <AlertTriangle size={14} className="inline mr-1 text-red-600 animate-pulse" title="Urgent Case"/>}
                      {p.lab_id || p.mrn || "-"}
                    </td>
                    <td className="p-4">
                      <Link
                        to={`/patients/${p.id}`}
                        className="text-blue-700 font-medium hover:underline"
                      >
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="p-4 text-gray-600">
                      {ageDisplay}
                    </td>
                    <td className="p-4 text-gray-600">
                      {p.ward_name || "N/A"}
                    </td>
                    <td className="p-4">
                      <StatusBadge
                        status={p.latest_request_status}
                        priority={p.priority} // Pass priority to badge component
                      />
                    </td>
                    <td className="p-4">
                      {isPaid ? (
                        <StatusBadge status="Paid" />
                      ) : canProcessPayment && hasRequest ? (
                        <button
                          onClick={() => openPaymentFor(p)}
                          className="inline-flex gap-2 px-3 py-1 rounded bg-rose-100 text-rose-800 text-xs border border-rose-200 hover:bg-rose-200 transition-colors font-semibold"
                        >
                          <CreditCard size={14} />
                          Process Payment
                        </button>
                      ) : (
                        <StatusBadge status="Awaiting Payment" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {/* ⛔ Receptionist OR PAID = cannot edit/delete */}
                        {canUpdatePatient &&
                          !isPaid &&
                          !isReceptionist && (
                            <Link
                              to={`/patients/${p.id}/edit`}
                            >
                              <button className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600 transition-colors" title="Edit Patient">
                                <Edit size={16} />
                              </button>
                            </Link>
                          )}

                        {hasRequest && (
                          <Link
                            to={`/tests/requests/${
                              p.latest_request_id ||
                              p.request_id
                            }`}
                          >
                            <button className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600 transition-colors" title="View Latest Request">
                              <FileText size={16} />
                            </button>
                          </Link>
                        )}

                        {canDeletePatient &&
                          !isPaid &&
                          !isReceptionist && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 bg-red-100 rounded hover:bg-red-200 transition-colors"
                              title="Delete Patient"
                            >
                              <Trash2
                                size={16}
                                className="text-red-600"
                              />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="text-center p-8 text-gray-500 bg-gray-50/50"
                >
                  {searchTerm
                    ? "No matching patients."
                    : "No patients found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              Process Payment
            </h2>
            <form
              onSubmit={handleProcessPayment}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-gray-600">
                  Amount
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  className="w-full border p-2 rounded mt-1 bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">
                  Payment Method *
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      paymentMethod: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded mt-1"
                  required
                >
                  <option value="">
                    -- Select Method --
                  </option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">
                    Mobile Money
                  </option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setIsPaymentModalOpen(false)
                  }
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? "Processing…"
                    : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDirectoryPage;