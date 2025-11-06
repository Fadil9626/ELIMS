import React, { useState, useEffect } from "react";
import phlebotomyService from "../../services/phlebotomyService";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import ConfirmModal from "../../components/layout/ConfirmModal";
import toast from "react-hot-toast";
import { HiOutlineClock, HiOutlineCheckCircle, HiOutlineUserGroup, HiOutlineArchive } from 'react-icons/hi'; 

const PhlebotomyWorklistPage = () => {
    const [summary, setSummary] = useState({});
    const [requests, setRequests] = useState([]);
    const [statusFilter, setStatusFilter] = useState("Awaiting Sample Collection");
    const [dateRange, setDateRange] = useState("all");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

    // --- Color/Icon Map for Stat Cards ---
    const CARD_MAP = [
        { 
            title: "Pending Samples", 
            key: 'pending', 
            colorClasses: "bg-yellow-50 border-yellow-300 text-yellow-700", 
            Icon: HiOutlineClock 
        },
        { 
            title: "Collected Today", 
            key: 'collected', 
            colorClasses: "bg-green-50 border-green-300 text-green-700", 
            Icon: HiOutlineCheckCircle 
        },
        { 
            title: "Awaiting Assignment", 
            key: 'awaiting_assignment', 
            colorClasses: "bg-blue-50 border-blue-300 text-blue-700", 
            Icon: HiOutlineUserGroup 
        },
        { 
            title: "Total Requests", 
            key: 'total', 
            colorClasses: "bg-gray-50 border-gray-300 text-gray-700", 
            Icon: HiOutlineArchive 
        },
    ];
    // -------------------------------------------------------------------------------------

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [statusFilter, dateRange, token]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryData, worklistData] = await Promise.all([
                phlebotomyService.getSummary(token),
                phlebotomyService.getWorklist(token, { status: statusFilter, dateRange }),
            ]);
            setSummary(summaryData);
            setRequests(worklistData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (setter) => (e) => setter(e.target.value);

    const openConfirmModal = (request) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleConfirmCollect = async () => {
        try {
            await phlebotomyService.markSampleAsCollected(selectedRequest.id, token);
            toast.success(`✅ Sample collected for ${selectedRequest.first_name} ${selectedRequest.last_name}`);
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Update Error:", error);
            toast.error("❌ Failed to update sample");
        }
    };

    const getStatusClasses = (status) => {
        if (status === "Sample Collected") return "text-green-600 bg-green-100";
        return "text-yellow-600 bg-yellow-100";
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header and Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-white p-4 rounded-xl shadow-md">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4 sm:mb-0">Phlebotomy Worklist</h1>
                <div className="flex flex-wrap gap-3">
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={handleFilterChange(setStatusFilter)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="Awaiting Sample Collection">Pending</option>
                        <option value="Sample Collected">Collected</option>
                        <option value="All">All</option>
                    </select>
                    {/* Date Range Filter */}
                    <select
                        value={dateRange}
                        onChange={handleFilterChange(setDateRange)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                    {/* Export CSV Button */}
                    <Button
                        onClick={() => phlebotomyService.exportCollected(token)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition duration-200"
                    >
                        Export CSV
                    </Button>
                </div>
            </div>
            
            {/* --- Summary Cards --- */}
            <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-6 mb-8">
                {CARD_MAP.map((item) => {
                    const value = summary[item.key] || 0;
                    return (
                        <Card key={item.key} className={`rounded-xl shadow-lg border-l-4 p-4 ${item.colorClasses}`}>
                            <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider">
                                    {item.title}
                                </CardTitle>
                                <item.Icon className="h-5 w-5 opacity-80" />
                            </CardHeader>
                            <CardContent className="p-0 pt-2">
                                <p className="text-3xl font-extrabold">
                                    {value}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* --- Worklist (Table View) --- */}
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Requests ({requests.length})</h2>
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                {loading ? (
                    <div className="text-center text-blue-600 py-8 text-lg">Loading worklist...</div>
                ) : requests.length === 0 ? (
                    <div className="text-center text-gray-500 italic py-8">No requests found matching the filter criteria.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wider">Patient Name</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wider">Lab ID</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wider">Tests</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition duration-150">
                                        <td className="p-4 font-semibold text-gray-900">
                                            {r.first_name} {r.last_name}
                                        </td>
                                        <td className="p-4 font-mono text-gray-600">
                                            {r.lab_id}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(r.status)}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-700 max-w-xs truncate">
                                            {r.tests?.join(", ") || "—"}
                                        </td>
                                        <td className="p-4 text-center">
                                            {r.status === "Awaiting Sample Collection" && (
                                                <Button
                                                    onClick={() => openConfirmModal(r)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm font-semibold shadow-sm"
                                                >
                                                    Collect Sample
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {selectedRequest && (
                <ConfirmModal
                    isOpen={isModalOpen}
                    title="Confirm Sample Collection"
                    message={
                        `Are you sure you want to mark the sample for ${selectedRequest.first_name} ${selectedRequest.last_name} (ID: ${selectedRequest.id}) as collected? This action cannot be easily undone.`
                    }
                    onConfirm={handleConfirmCollect}
                    onCancel={() => setIsModalOpen(false)}
                    confirmText="Yes, Mark as Collected"
                />
            )}
        </div>
    );
};

export default PhlebotomyWorklistPage;