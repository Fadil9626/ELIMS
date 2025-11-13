// src/pages/phlebotomy/PhlebotomyWorklistPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
// Using Lucide icons for consistency
import { 
    Clock, Droplet, Hospital, CheckCircle, ArrowRight, XCircle, 
    RefreshCcw 
} from "lucide-react"; 
import { toast } from "react-hot-toast";
import phlebotomyService from "../../services/phlebotomyService"; 

export default function PhlebotomyWorklistPage() {
    // --- STATE ---
    const [worklist, setWorklist] = useState([]);
    const [summary, setSummary] = useState({ 
        pending: 0, 
        collected: 0, 
        collectionsToday: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("Pending"); 

    // ✅ **NEW**: State for the confirmation modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

    // --- DATA FETCHING (Memoized & Parallel) ---
    const fetchWorklist = useCallback(async () => {
        setLoading(true);
        setError(null);
        if (!token) {
            setError("Authentication required.");
            setLoading(false);
            return;
        }
        
        try {
            const [summaryData, worklistData] = await Promise.all([
                phlebotomyService.getSummary(token),
                phlebotomyService.getWorklist({ status: statusFilter }, token)
            ]);
            
            setSummary({
                pending: summaryData.pending || 0,
                collected: summaryData.collected || 0,
                collectionsToday: summaryData.collectionsToday || 0 
            }); 

            setWorklist(worklistData || []);
        } catch (err) {
            console.error("❌ Phlebotomy Fetch Error:", err);
            const errorMsg = "Failed to load worklist. Check server connection or required 'phlebotomy:view' permissions.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, token]);

    useEffect(() => {
        fetchWorklist();
    }, [fetchWorklist]);

    // --- HANDLERS ---

    // ✅ **NEW**: Step 1 - Open the modal and store the item
    const openCollectionModal = (requestItem) => {
        setSelectedRequest(requestItem);
        setIsModalOpen(true);
    };

    // ✅ **NEW**: Close the modal
    const closeCollectionModal = () => {
        setIsModalOpen(false);
        setSelectedRequest(null);
    };

    // ✅ **NEW**: Step 2 - Run the API call from the modal
    const handleConfirmCollection = async () => {
        if (!selectedRequest) return;
        
        setIsSubmitting(true);
        try {
            const response = await phlebotomyService.markSampleAsCollected(selectedRequest.id, token);
            toast.success(response.message || "✅ Sample collected!");
            
            fetchWorklist(); // Refresh the main list
            closeCollectionModal(); // Close the popup
        } catch (err) {
            console.error("Collection error:", err);
            const errorMsg = err.message || `Failed to mark sample collection for Request #${selectedRequest.id}.`;
            toast.error(errorMsg);
            setError(errorMsg); 
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- RENDER HELPERS ---
    const StatusBadge = ({ status }) => {
        let color = "bg-gray-100 text-gray-700";
        if (status === "Pending") color = "bg-yellow-100 text-yellow-700";
        if (status === "SampleCollected") color = "bg-blue-100 text-blue-700";
        if (status === "Verified" || status === "Completed") color = "bg-green-100 text-green-700";
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                {status}
            </span>
        );
    };

    const KpiCard = ({ icon: Icon, value, label, colorClass, borderColorClass }) => (
        <div className={`p-4 bg-white rounded-xl shadow-md border-l-4 ${borderColorClass}`}>
            <div className={`flex items-center gap-3`}>
                <Icon size={20} className={colorClass} />
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>
    );
    

    return (
        <div className="p-6 md:p-8 bg-gray-50 min-h-screen space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-3 flex items-center gap-2">
                <Droplet size={30} className="text-red-500" /> Phlebotomy Worklist
            </h1>

            {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 font-medium">
                    <XCircle size={18} className="inline mr-2" /> Error: {error}
                </div>
            )}

            {/* KPI Cards (3-col grid, STAT removed) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard 
                    icon={Clock} 
                    value={summary.pending} 
                    label="Awaiting Collection" 
                    colorClass="text-yellow-600" 
                    borderColorClass="border-l-yellow-500" 
                />
                <KpiCard 
                    icon={Droplet} 
                    value={summary.collected} 
                    label="Total Collected" 
                    colorClass="text-blue-600" 
                    borderColorClass="border-l-blue-500" 
                />
                <KpiCard 
                    icon={CheckCircle} 
                    value={summary.collectionsToday} 
                    label="Collected Today" 
                    colorClass="text-green-600" 
                    borderColorClass="border-l-green-500" 
                />
            </div>

            {/* Filters and List Title */}
            <div className="flex justify-between items-center pt-4 border-t">
                <h2 className="text-xl font-semibold text-gray-700">Requests for Action</h2>
                <div className="flex items-center gap-3">
                    <button onClick={fetchWorklist} className="text-gray-600 hover:text-gray-900 transition">
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border bg-white p-2 rounded-lg text-sm"
                    >
                        <option value="Pending">Awaiting Sample Collection</option>
                        <option value="SampleCollected">Collected Samples</option>
                        <option value="All">View All Statuses</option>
                    </select>
                </div>
            </div>

            {/* Worklist Table */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Patient / ID</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Tests Required</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="p-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {loading && worklist.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500"><Clock size={16} className="inline mr-2 animate-spin" /> Loading worklist...</td></tr>
                        ) : worklist.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500 italic">No tasks found for the selected status.</td></tr>
                        ) : (
                            worklist.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono text-xs text-gray-800">{item.id}</td>
                                    <td className="p-3 text-sm text-gray-900">
                                        <p className="font-semibold">{item.first_name} {item.last_name}</p>
                                        <p className="text-xs text-gray-500">{item.lab_id}</p>
                                    </td>
                                    <td className="p-3 text-sm text-gray-700 flex items-center gap-1">
                                        <Hospital size={14} className="text-indigo-400" /> {item.ward_name || 'OPD'}
                                    </td>
                                    <td className="p-3 text-xs text-gray-600">{item.tests ? item.tests.join(', ') : 'N/A'}</td>
                                    <td className="p-3"><StatusBadge status={item.status} /></td>
                                    <td className="p-3 text-center">
                                        {item.status === 'Pending' ? (
                                            <button
                                                // ✅ **NEW**: Changed handler
                                                onClick={() => openCollectionModal(item)}
                                                className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center justify-center gap-1 mx-auto"
                                            >
                                                <CheckCircle size={14} /> Collect Sample
                                            </button>
                                        ) : (
                                            <Link to={`/tests/requests/${item.id}`} className="text-blue-600 hover:underline text-xs font-medium flex items-center justify-center gap-1 mx-auto">
                                                View Request <ArrowRight size={14} />
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- ✅ NEW Confirmation Modal --- */}
            {isModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <Droplet size={24} className="text-red-500" />
                            Confirm Sample Collection
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Please confirm collection for patient: <br />
                            <strong className="text-lg">{selectedRequest.first_name} {selectedRequest.last_name}</strong>
                            <span className="text-gray-500"> (ID: {selectedRequest.lab_id})</span>
                        </p>

                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto mb-6">
                            <h4 className="font-semibold mb-2 text-gray-700">Tests to Collect:</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {selectedRequest.tests && selectedRequest.tests.length > 0 ? (
                                    selectedRequest.tests.map((test, index) => (
                                    <li key={index}>{test}</li>
                                    ))
                                ) : (
                                    <li>No tests listed</li>
                                )}
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={closeCollectionModal}
                                disabled={isSubmitting}
                                className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 text-gray-800 font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCollection}
                                disabled={isSubmitting}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2 disabled:bg-gray-400"
                            >
                                {isSubmitting ? <Clock className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                {isSubmitting ? "Collecting..." : "Confirm Collection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- End of Modal --- */}

        </div>
    );
}