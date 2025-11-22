import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import testRequestService from "../../services/testRequestService";
import { Clock, CheckCircle, XCircle, FileText, DollarSign, ArrowLeft, Users, Beaker, Layers, AlertTriangle, Minus } from "lucide-react";
import useCan from "../../hooks/useCan";

// --- Helpers ---
function safeNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function formatLe(amount) {
  const num = safeNumber(amount, 0);
  return `${num.toLocaleString(undefined, { minimumFractionDigits: 2 })} Le`; 
}

/** Attempt to read a human-ish value out of various result_data shapes */
function resultCell(result_data) {
  if (result_data == null) return "Pending / N/A";

  // string or number
  if (typeof result_data === "string" || typeof result_data === "number") {
    return String(result_data);
  }

  // array of objects (e.g., panels)
  if (Array.isArray(result_data)) {
    if (result_data.length === 0) return "Pending / N/A";
    // join simple values; otherwise JSON fallback
    const simple = result_data
      .map((r) => (typeof r === "object" && r !== null ? r.value ?? r.result ?? "" : r))
      .filter(Boolean);
    return simple.length ? simple.join(", ") : JSON.stringify(result_data);
  }

  // object: common keys
  if (typeof result_data === "object") {
    const value =
      result_data.value ??
      result_data.result ??
      result_data.measured ??
      result_data.reportedValue ??
      null;
    const unit = result_data.unit || result_data.units || "";
    if (value != null) return unit ? `${value} ${unit}` : String(value);

    // last resort
    return JSON.stringify(result_data);
  }

  return "Pending / N/A";
}

/**
 * 🎨 Helper Component for Status Badges
 */
const StatusBadge = ({ status }) => {
    const normalizedStatus = (status || 'N/A').toLowerCase();
    let Icon = Clock;
    let classes = "bg-gray-100 text-gray-700";
    let text = status || 'Unknown';

    if (normalizedStatus.includes('pending')) {
        classes = "bg-yellow-100 text-yellow-700";
        Icon = Clock;
        text = 'Pending';
    } else if (normalizedStatus.includes('samplecollected')) {
        classes = "bg-blue-100 text-blue-700";
        Icon = Beaker;
        text = 'Sample Collected';
    } else if (normalizedStatus.includes('inprogress')) {
        classes = "bg-purple-100 text-purple-700";
        Icon = Layers;
        text = 'In Progress';
    } else if (normalizedStatus.includes('verified') || normalizedStatus.includes('completed')) {
        classes = "bg-green-100 text-green-700";
        Icon = CheckCircle;
        text = normalizedStatus.includes('verified') ? 'Verified' : 'Completed';
    } else if (normalizedStatus.includes('cancelled')) {
        classes = "bg-red-100 text-red-700";
        Icon = XCircle;
        text = 'Cancelled';
    }
    
    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${classes}`}>
            <Icon size={14} /> {text}
        </span>
    );
};

const TestRequestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = useCan?.() || { can: () => true };

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const requestId = useMemo(() => {
        const asNum = Number(id);
        return Number.isFinite(asNum) ? asNum : null;
    }, [id]);

    useEffect(() => {
        if (!requestId) {
            setError("Invalid test request ID.");
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                
                // ✅ FIX: Removed manual token check. apiFetch handles auth automatically.
                // We don't pass a token here; the service layer will pull it from elims_auth_v1.
                const data = await testRequestService.getTestRequestById(requestId);

                if (!cancelled) setRequest(data);
            } catch (err) {
                if (!cancelled) {
                    // Check if the error message is the specific bug message
                    if (err?.message?.includes("No linked test request found")) {
                       setError("Request not found, or patient link is broken.");
                    } else {
                       setError(err?.message || "Failed to load test request.");
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [requestId]);

    const totalPrice = useMemo(() => {
        if (!request?.items?.length) return 0;
        return safeNumber(request.payment_amount) || request.items.reduce((sum, item) => sum + safeNumber(item.price, 0), 0);
    }, [request]);

    if (loading) return <div className="p-6 text-blue-600 font-semibold flex items-center gap-2"><Clock size={20} className="animate-spin"/> Loading request details...</div>;
    if (error)
        return (
            <div className="p-6 bg-red-50 border border-red-300 rounded-lg text-red-700 space-y-4 shadow-md m-4">
                <div className="font-bold text-lg flex items-center gap-2"><AlertTriangle size={20} /> Error Loading Request</div>
                <div className="space-y-2">
                   <p>{error}</p>
                   <p className="text-sm text-red-500">Please verify the Request ID and your network connection.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 text-white py-1.5 px-4 rounded-lg hover:bg-blue-700 transition"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-gray-500 text-white py-1.5 px-4 rounded-lg hover:bg-gray-600 transition"
                    >
                        <ArrowLeft size={16} className="inline mr-1" /> Back
                    </button>
                </div>
            </div>
        );
    if (!request) return <div className="p-6 text-gray-600">Request not found.</div>;

    const patientName = [request.first_name, request.last_name]
        .filter(Boolean)
        .join(" ");
    
    const requestDate = request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A';
    const isUrgent = request.priority === 'URGENT';
    
    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header and Actions Bar */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-3 border-b border-gray-200 ${isUrgent ? 'border-l-4 border-l-red-500 pl-4' : ''}`}>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                        <FileText size={28} className="text-blue-600" />
                        Request #{request.id}
                    </h1>
                    {isUrgent && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold uppercase rounded-full animate-pulse border border-red-200">
                            <AlertTriangle size={12} /> Urgent
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={request.status} />

                    {can("reports", "view") && requestId && (
                        <Link
                            to={`/reports/test-request/${requestId}`}
                            className="bg-indigo-600 text-white py-2 px-3 rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition text-sm font-medium"
                        >
                            <FileText size={16} /> Report
                        </Link>
                    )}
                    {can("billing", "view") && requestId && (
                        <Link
                            to={`/invoices/test-request/${requestId}`}
                            className="bg-green-600 text-white py-2 px-3 rounded-lg flex items-center gap-1 hover:bg-green-700 transition text-sm font-medium"
                        >
                            <DollarSign size={16} /> Invoice
                        </Link>
                    )}
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-gray-500 text-white py-2 px-3 rounded-lg flex items-center gap-1 hover:bg-gray-600 transition text-sm font-medium"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>
            </div>

            {/* Patient & Request Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Card 1: Patient */}
                <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1"><Users size={16} /> PATIENT</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{patientName || "N/A"}</p>
                    <p className="text-xs text-gray-500">D.O.B: {request.date_of_birth ? new Date(request.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                </div>
                
                {/* Card 2: Status & Date */}
                <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-gray-400">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1"><Clock size={16} /> REQUEST DATE</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{requestDate}</p>
                    <p className="text-xs text-gray-500">Status: {request.status || 'N/A'}</p>
                </div>

                {/* Card 3: Doctor */}
                <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-purple-500">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1"><Users size={16} /> REFERRING DR.</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{request.doctor_id || request.referring_doctor || "N/A"}</p>
                    <p className="text-xs text-gray-500">Created by User #{request.created_by}</p>
                </div>

                {/* Card 4: Price */}
                <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1"><DollarSign size={16} /> TOTAL CHARGE</p>
                    <p className="text-xl font-bold text-green-700 mt-1">{formatLe(totalPrice)}</p>
                    <p className="text-xs text-gray-500">Payment: {request.payment_status || 'Unpaid'}</p>
                </div>
            </div>

            {/* Tests & Results Table */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <h2 className="text-xl font-bold p-4 bg-gray-50 border-b text-gray-800">
                    Requested Tests ({request.items?.length || 0})
                </h2>

                {!request.items?.length ? (
                    <div className="text-gray-600 p-6 italic">No test items on this request.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 font-semibold text-xs uppercase tracking-wider text-gray-600 w-1/3">Test Name / Type</th>
                                    <th className="p-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Department</th>
                                    <th className="p-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Result</th>
                                    <th className="p-3 font-semibold text-xs uppercase tracking-wider text-gray-600 text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {request.items.map((item) => {
                                    const dept = item.department || item.department_name || item.dept_name || "—";
                                    const isPanel = item.is_panel;
                                    const resultValue = resultCell(item.result_data);
                                    let resultClass = 'text-gray-800';
                                    let ResultIcon = Minus;

                                    if (resultValue.includes('Pending') || resultValue.includes('N/A')) {
                                        resultClass = 'text-gray-500 italic';
                                        ResultIcon = Clock;
                                    }
                                    
                                    return (
                                        <tr 
                                            key={item.id ?? `${item.test_id}-${item.test_name}`} 
                                            className={`border-b hover:bg-gray-50 transition ${isPanel ? 'bg-gray-100 font-bold' : ''}`}
                                        >
                                            <td className="p-3">
                                                <div className="font-semibold text-gray-900">{item.test_name || item.name || "Unnamed test"}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    {isPanel ? <Layers size={14} className="text-purple-500" /> : <Beaker size={14} className="text-teal-500" />}
                                                    {isPanel ? 'Panel' : 'Analyte'}
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-600">{dept}</td>
                                            <td className={`p-3 font-bold ${resultClass} flex items-center gap-1`}>
                                                <ResultIcon size={14} className="text-current/80" />
                                                {resultValue}
                                            </td>
                                            <td className="p-3 text-gray-700 text-right">{formatLe(item.price)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-200">
                                    <td className="p-3 font-bold text-base" colSpan={3}>
                                        TOTAL REQUEST CHARGE
                                    </td>
                                    <td className="p-3 font-extrabold text-base text-right text-green-700">{formatLe(totalPrice)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestRequestDetailPage;