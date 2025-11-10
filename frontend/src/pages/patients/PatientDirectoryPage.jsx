// src/pages/patients/PatientDirectoryPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
// 💡 Switched to lucide-react for modern icons
import {
    User,
    Edit,
    Trash2,
    FileText,
    Printer,
    Search,
    PlusCircle,
    ArrowLeft,
    CreditCard,
    Calendar,
    Badge,
    FileClock,
    CheckCircle,
    XCircle,
    Loader2, // For loading states
    Beaker,
    FileCheck,
    FileX,
    UserPlus
} from "lucide-react";
import { toast } from "react-hot-toast";
import patientService from "../../services/patientService";
import testRequestService from "../../services/testRequestService";

/**
 * 🎨 Helper: Calculate Age
 */
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

/**
 * 🎨 Helper: Status Badge Component
 * A dedicated component for consistent status styling based on your schema.
 */
const StatusBadge = ({ status }) => {
    const s = (status || "Pending").toLowerCase();
    let Icon = FileClock;
    let className = "bg-gray-100 text-gray-800 border-gray-200";
    let text = status;

    if (s === "pending") {
        Icon = FileClock;
        className = "bg-yellow-100 text-yellow-800 border-yellow-200";
        text = "Pending";
    } else if (s === "awaiting payment") {
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
        className = "bg-cyan-100 text-cyan-800 border-cyan-200 animate-spin";
        text = "In Progress";
    } else if (s === "completed") {
        Icon = FileCheck;
        className = "bg-emerald-100 text-emerald-900 border-emerald-200";
        text = "Completed";
    } else if (s === "verified") {
        Icon = FileCheck;
        className = "bg-teal-100 text-teal-900 border-teal-200";
        text = "Verified";
    } else if (s === "cancelled") {
        Icon = FileX;
        className = "bg-red-100 text-red-800 border-red-200";
        text = "Cancelled";
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${className}`}>
            <Icon size={14} className={s === 'inprogress' ? 'animate-spin' : ''} />
            {text}
        </span>
    );
};


const PatientDirectoryPage = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [paymentData, setPaymentData] = useState({ amount: "", paymentMethod: "", items: [] });
    const [receiptData, setReceiptData] = useState(null);
    const [submitting, setSubmitting] = useState(false); // For payment modal

    const navigate = useNavigate();
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const token = userInfo?.token;

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
        if (token) {
            fetchPatients();
        } else {
            setLoading(false);
            toast.error("You are not logged in.");
            navigate('/login');
        }
    }, [token, navigate]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this patient?")) return;
        try {
            await patientService.deletePatient(id, token);
            setPatients((prev) => prev.filter((p) => p.id !== id));
            toast.success("Patient deleted successfully.");
        } catch {
            toast.error("Failed to delete patient.");
        }
    };

    const openPaymentFor = async (patient) => {
        // Find the latest unpaid request ID
        const requestId = patient.latest_request_id || patient.request_id;
        if (!requestId) return toast.error("No linked test request found.");

        setSubmitting(true); // Use submitting as the "calculating" flag
        setIsPaymentModalOpen(true);
        setSelectedPatient(patient);
        try {
            const reqDetails = await testRequestService.getTestRequestById(requestId, token);
            
            // Calculate total *only* from non-panel items and panel items. 
            // The previous logic double-counted by summing items AND their parents.
            const total = (reqDetails.items || []).reduce(
                (sum, item) => sum + (Number(item.price) || 0),
                0
            );

            setPaymentData({
                amount: total.toFixed(2),
                paymentMethod: "Cash", // Default to Cash
                items: reqDetails.items.filter(item => !item.parent_id) || [], // Show only top-level items
            });
        } catch (e) {
            toast.error(e.message || "Could not fetch test total.");
            setIsPaymentModalOpen(false);
        } finally {
            setSubmitting(false);
        }
    };
    
    // 💡 UX Improvement: Removed handleStatusChange. 
    // Status changes should happen on the Test Request page or Phlebotomy worklist, 
    // not on the main patient directory. This simplifies the UI significantly.

    const handleProcessPayment = async (e) => {
        e.preventDefault();
        const requestId = selectedPatient?.latest_request_id || selectedPatient?.request_id;
        if (!requestId) return toast.error("No linked test request found.");
        if (!paymentData.paymentMethod) return toast.error("Please select a payment method.");

        setSubmitting(true);
        try {
            const resp = await testRequestService.processPayment(
                requestId,
                {
                    amount: parseFloat(paymentData.amount),
                    paymentMethod: paymentData.paymentMethod,
                },
                token
            );

            const now = new Date();
            const receiptInfo = {
                patient: selectedPatient,
                items: paymentData.items,
                total: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                paymentDate: now.toLocaleString(),
                reference: `INV-${requestId}-${now.getTime()}`,
            };
            setReceiptData(receiptInfo);
            setIsReceiptModalOpen(true); // Open receipt *after* payment success

            // Update patient list in-place
            setPatients((prev) =>
                prev.map((p) =>
                    p.id === selectedPatient.id
                        ? {
                            ...p,
                            payment_status: "Paid",
                            latest_request_payment_status: "Paid",
                            latest_request_status: resp?.status || "Awaiting Sample Collection", // Use status from API response
                        }
                        : p
                )
            );

            toast.success(resp?.message || "Payment processed successfully!");
            setIsPaymentModalOpen(false);
            setSelectedPatient(null);
            setPaymentData({ amount: "", paymentMethod: "", items: [] });
        } catch (e) {
            toast.error(e.message || "Payment failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPatients = useMemo(() => 
        patients.filter((p) => {
            const fullName = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase();
            return (
                fullName.includes(searchTerm.toLowerCase()) ||
                p.lab_id?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }), [patients, searchTerm]);

    if (loading) return <div className="p-6 text-blue-600 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading patients...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header: Title, Search, and Add Patient */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                    <User size={32} className="text-blue-600" />
                    Patient Directory
                </h1>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by name or Lab ID..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Add Patient Button */}
                    <button
                        onClick={() => navigate("/patients/register")}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
                    >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Add Patient</span>
                    </button>
                </div>
            </div>

            {/* Patient Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                        <tr>
                            <th className="p-4 font-bold">Lab ID</th>
                            <th className="p-4 font-bold">Patient</th>
                            <th className="p-4 font-bold">Age</th>
                            <th className="p-4 font-bold">Ward</th>
                            <th className="p-4 font-bold">Latest Status</th>
                            <th className="p-4 font-bold">Payment</th>
                            <th className="p-4 font-bold text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredPatients.length > 0 ? (
                            filteredPatients.map((p) => {
                                const ageDisplay = p.age ?? calculateAge(p.date_of_birth || p.dob);
                                const paid = String(p.payment_status || p.latest_request_payment_status) === "Paid";
                                return (
                                    <tr key={p.id} className="hover:bg-blue-50 transition duration-150">
                                        <td className="p-4 font-mono text-gray-700">{p.lab_id || "-"}</td>
                                        <td className="p-4 font-medium text-gray-900">
                                            <Link to={`/patients/${p.id}`} className="text-blue-700 hover:underline flex items-center gap-2">
                                                {p.first_name} {p.last_name}
                                            </Link>
                                        </td>
                                        <td className="p-4 text-gray-600">{ageDisplay} yrs</td>
                                        <td className="p-4 text-gray-600">{p.ward_name || "N/A"}</td>
                                        
                                        {/* Read-only Status Badge */}
                                        <td className="p-4">
                                            <StatusBadge status={p.latest_request_status || "N/A"} />
                                        </td>

                                        {/* Payment Badge/Button */}
                                        <td className="p-4">
                                            {paid ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border bg-green-100 text-green-800 border-green-200">
                                                    <CheckCircle size={14} /> Paid
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => openPaymentFor(p)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200 hover:shadow-sm"
                                                    disabled={submitting}
                                                >
                                                    <CreditCard size={14} /> Process Payment
                                                </button>
                                            )}
                                        </td>

                                        {/* Action Buttons */}
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <Link to={`/patients/${p.id}/edit`}>
                                                    <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md" title="Edit Patient">
                                                        <Edit size={16} className="text-gray-700" />
                                                    </button>
                                                </Link>
                                                
                                                {/* Link to latest invoice/request */}
                                                {(p.latest_request_id || p.request_id) && (
                                                    <Link
                                                        to={`/tests/requests/${p.latest_request_id || p.request_id}`}
                                                        title="View Latest Request"
                                                    >
                                                        <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md">
                                                            <FileText size={16} className="text-gray-700" />
                                                        </button>
                                                    </Link>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-2 bg-red-100 hover:bg-red-200 rounded-md"
                                                    title="Delete Patient"
                                                >
                                                    <Trash2 size={16} className="text-red-700" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-gray-500 italic">
                                    {searchTerm ? "No patients match your search." : "No patients found."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 💳 Payment Modal */}
            {isPaymentModalOpen && selectedPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">
                            Process Payment
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            For: <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong> (ID: {selectedPatient.lab_id})
                        </p>

                        {/* Loading Overlay for modal */}
                        {submitting && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-xl">
                                <Loader2 className="animate-spin text-blue-600" size={40} />
                            </div>
                        )}

                        <form onSubmit={handleProcessPayment} className="space-y-4">
                            {/* 🧾 Itemized Breakdown */}
                            {paymentData.items && paymentData.items.length > 0 && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
                                    <h4 className="font-semibold mb-2 text-gray-700">Itemized Summary</h4>
                                    <ul className="divide-y divide-gray-200">
                                        {paymentData.items.map((item) => (
                                            <li
                                                key={item.id || item.test_id}
                                                className="flex justify-between py-1.5 text-sm text-gray-700"
                                            >
                                                <span>{item.test_name}</span>
                                                <span className="font-medium">{Number(item.price || 0).toLocaleString()} Le</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount Due (Le)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentData.amount}
                                    onChange={(e) =>
                                        setPaymentData({ ...paymentData, amount: e.target.value })
                                    }
                                    required
                                    className="w-full mt-1 border border-gray-300 rounded-lg p-2.5 bg-gray-100 font-bold text-lg focus:border-blue-500 focus:ring-blue-500"
                                    readOnly // Amount is calculated, not set
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Method
                                </label>
                                <select
                                    value={paymentData.paymentMethod}
                                    onChange={(e) =>
                                        setPaymentData({ ...paymentData, paymentMethod: e.target.value })
                                    }
                                    required
                                    className="w-full mt-1 border border-gray-300 rounded-lg p-2.5 bg-white focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="">Select...</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Insurance">Insurance</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    disabled={submitting}
                                    className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 text-gray-800 font-medium transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2 disabled:bg-gray-400"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                    {submitting ? "Processing..." : "Confirm Payment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🧾 Receipt Modal */}
            {isReceiptModalOpen && receiptData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white">
                    <div
                        id="receipt"
                        className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                    >
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Payment Receipt</h2>
                            <p className="text-sm text-gray-500">
                                Reference: <strong>{receiptData.reference}</strong>
                            </p>
                        </div>
                        
                        <div className="mb-4 text-sm text-gray-700 border-y py-3">
                            <p><strong>Patient:</strong> {receiptData.patient.first_name} {receiptData.patient.last_name}</p>
                            <p><strong>Date:</strong> {receiptData.paymentDate}</p>
                            <p><strong>Method:</strong> {receiptData.paymentMethod}</p>
                        </div>

                        <table className="w-full text-sm border-collapse mb-4">
                            <thead className="bg-gray-100 border-b">
                                <tr>
                                    <th className="p-2 text-left font-semibold">Test / Panel</th>
                                    <th className="p-2 text-right font-semibold">Price (Le)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receiptData.items.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.test_name}</td>
                                        <td className="p-2 text-right">{Number(item.price).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-gray-300">
                                <tr className="font-bold bg-gray-50 text-base">
                                    <td className="p-2 text-left">Total Paid</td>
                                    <td className="p-2 text-right">
                                        {Number(receiptData.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} Le
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        <p className="text-center text-gray-500 text-sm">
                            Thank you for your payment!
                        </p>

                        <div className="flex justify-end mt-6 gap-3 no-print">
                            <button
                                onClick={() => window.print()}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                            >
                                <Printer size={18} /> Print
                            </button>
                            <button
                                onClick={() => setIsReceiptModalOpen(false)}
                                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDirectoryPage;