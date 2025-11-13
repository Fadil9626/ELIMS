// src/pages/patients/PatientDirectoryPage.jsx
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
} from "lucide-react";
import { toast } from "react-hot-toast";
import patientService from "../../services/patientService";
import testRequestService from "../../services/testRequestService";
import { useAuth } from "../../context/AuthContext";

/* -----------------------------------------
   🔢 Helper: Calculate Age
------------------------------------------ */
const calculateAge = (dob) => {
    if (!dob) return "N/A";
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return "N/A";
    const t = new Date();
    let age = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
    return age;
};

/* -----------------------------------------
   🎨 Status Badge Component
------------------------------------------ */
const StatusBadge = ({ status }) => {
    const s = (status || "pending").toLowerCase();
    let Icon = FileClock;
    let className = "bg-gray-100 text-gray-800 border-gray-200";
    let text = status;

    if (s === "awaiting payment") {
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
        className = "bg-cyan-100 text-cyan-900 border-cyan-200 animate-spin";
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
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${className}`}>
            <Icon size={14} />
            {text}
        </span>
    );
};

const PatientDirectoryPage = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [paymentData, setPaymentData] = useState({ amount: "", paymentMethod: "", items: [] });
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const { can } = useAuth();

    const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token;

    const canCreatePatient = can("Patients", "Create");
    const canUpdatePatient = can("Patients", "Update");
    const canDeletePatient = can("Patients", "Delete");
    const canProcessPayment = can("Billing", "Create");

    /* -----------------------------------------
       🔄 Load Patients
    ------------------------------------------ */
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await patientService.getAllPatients(token);
                setPatients(data);
            } catch {
                toast.error("Failed to load patients.");
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchPatients();
    }, [token]);

    /* -----------------------------------------
       ❌ Delete Patient
    ------------------------------------------ */
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this patient?")) return;
        try {
            await patientService.deletePatient(id, token);
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
            const reqDetails = await testRequestService.getTestRequestById(requestId, token);

            // Calculate total correctly (panel price or sum analytes)
            const total =
                Number(reqDetails.payment_amount) > 0
                    ? Number(reqDetails.payment_amount)
                    : reqDetails.items?.reduce((sum, item) => sum + Number(item.price || 0), 0);

            setPaymentData({
                amount: total.toFixed(2),
                paymentMethod: "Cash",
                items: reqDetails.items || [],
            });
        } catch (err) {
            toast.error(err.message || "Could not load test request.");
            setIsPaymentModalOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    /* -----------------------------------------
       💳 Process Payment (NO RECEIPT)
    ------------------------------------------ */
    const handleProcessPayment = async (e) => {
        e.preventDefault();

        const requestId = selectedPatient?.latest_request_id || selectedPatient?.request_id;
        if (!requestId) return toast.error("No test request found.");
        if (!paymentData.paymentMethod) return toast.error("Choose payment method.");

        setSubmitting(true);
        try {
            await testRequestService.processPayment(
                requestId,
                {
                    amount: parseFloat(paymentData.amount),
                    paymentMethod: paymentData.paymentMethod,
                },
                token
            );

            toast.success("Payment recorded successfully.");

            // Update local list
            setPatients((prev) =>
                prev.map((p) =>
                    p.id === selectedPatient.id
                        ? { ...p, payment_status: "Paid", latest_request_payment_status: "Paid" }
                        : p
                )
            );

            setIsPaymentModalOpen(false);
            setSelectedPatient(null);
        } catch (err) {
            toast.error(err.message || "Payment failed.");
        } finally {
            setSubmitting(false);
        }
    };

    /* -----------------------------------------
       🔍 Search Filter
    ------------------------------------------ */
    const filteredPatients = useMemo(
        () =>
            patients.filter((p) => {
                const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
                return (
                    fullName.includes(searchTerm.toLowerCase()) ||
                    p.lab_id?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }),
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
                            placeholder="Search by name or Lab ID..."
                            className="w-full pl-10 pr-4 py-2.5 border rounded-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {canCreatePatient && (
                        <button
                            onClick={() => navigate("/patients/register")}
                            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2"
                        >
                            <UserPlus size={18} /> Add Patient
                        </button>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600">
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
                                const ageDisplay = p.age ?? calculateAge(p.date_of_birth);
                                const isPaid = (p.payment_status || p.latest_request_payment_status) === "Paid";

                                return (
                                    <tr key={p.id} className="hover:bg-blue-50">
                                        <td className="p-4 font-mono">{p.lab_id || "-"}</td>

                                        <td className="p-4">
                                            <Link
                                                to={`/patients/${p.id}`}
                                                className="text-blue-700 font-medium"
                                            >
                                                {p.first_name} {p.last_name}
                                            </Link>
                                        </td>

                                        <td className="p-4">{ageDisplay} yrs</td>
                                        <td className="p-4">{p.ward_name || "N/A"}</td>

                                        <td className="p-4">
                                            <StatusBadge status={p.latest_request_status} />
                                        </td>

                                        <td className="p-4">
                                            {isPaid ? (
                                                <StatusBadge status="Paid" />
                                            ) : canProcessPayment ? (
                                                <button
                                                    onClick={() => openPaymentFor(p)}
                                                    className="inline-flex gap-2 px-3 py-1 rounded bg-rose-100 text-rose-800 text-xs border border-rose-200"
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
                                                {canUpdatePatient && (
                                                    <Link to={`/patients/${p.id}/edit`}>
                                                        <button className="p-2 bg-gray-100 rounded hover:bg-gray-200">
                                                            <Edit size={16} />
                                                        </button>
                                                    </Link>
                                                )}

                                                {(p.latest_request_id || p.request_id) && (
                                                    <Link
                                                        to={`/tests/requests/${p.latest_request_id || p.request_id}`}
                                                    >
                                                        <button className="p-2 bg-gray-100 rounded hover:bg-gray-200">
                                                            <FileText size={16} />
                                                        </button>
                                                    </Link>
                                                )}

                                                {canDeletePatient && (
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        className="p-2 bg-red-100 rounded hover:bg-red-200"
                                                    >
                                                        <Trash2 size={16} className="text-red-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center p-8 text-gray-500">
                                    {searchTerm ? "No matching patients." : "No patients found."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* -------------------------------------------------------
                💳 PAYMENT MODAL (RECEIPT REMOVED)
            ------------------------------------------------------- */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Process Payment</h2>

                        <form onSubmit={handleProcessPayment} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-600">Amount</label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    className="w-full border p-2 rounded mt-1"
                                    readOnly
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-600">Payment Method *</label>
                                <select
                                    value={paymentData.paymentMethod}
                                    onChange={(e) =>
                                        setPaymentData({ ...paymentData, paymentMethod: e.target.value })
                                    }
                                    className="w-full border p-2 rounded"
                                    required
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Card">Card</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="px-4 py-2 bg-gray-200 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded"
                                >
                                    {submitting ? "Processing…" : "Confirm Payment"}
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
