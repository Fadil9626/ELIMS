import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import testRequestService from "../../services/testRequestService";
import PatientSearchModal from "../../components/modals/PatientSearchModal"; // ✅ NEW

// Icons
import {
  FileText,
  PlusCircle,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Beaker,
  Calendar,
  ArrowRight
} from "lucide-react";

const TestManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        const token = userInfo ? userInfo.token : null;
        if (!token) {
          setError("Authentication token not found.");
          return;
        }

        const data = await testRequestService.getAllTestRequests(token);
        setRequests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "SampleCollected":
      case "InProgress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "Verified":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "Cancelled":
      case "Unpaid":
      case "Awaiting Payment":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <Clock size={14} />;
      case "SampleCollected":
        return <Beaker size={14} />;
      case "Completed":
      case "Verified":
        return <CheckCircle size={14} />;
      case "Cancelled":
        return <XCircle size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  if (loading)
    return (
      <div className="p-8 text-lg font-medium text-blue-600 flex items-center gap-2">
        <Clock size={20} className="animate-spin" /> Loading all test requests...
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-red-700 bg-red-50 border border-red-300 rounded-lg shadow-sm">
        Error fetching data: {error}
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
          <FileText size={32} className="text-blue-600" /> Test Request Dashboard
        </h1>

        {/* ✅ OPEN PATIENT SEARCH MODAL */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white py-2.5 px-4 rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md"
        >
          <PlusCircle size={20} /> New Test Request
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
            <tr>
              <th className="p-4 font-bold">Request ID</th>
              <th className="p-4 font-bold">Patient Name</th>
              <th className="p-4 font-bold">Age</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Date Requested</th>
              <th className="p-4 font-bold text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {requests.length > 0 ? (
              requests.map((req, index) => {
                const requestId = req.request_id || req.id;
                const patientName =
                  req.patient_name ||
                  `${req.patient?.first_name || ""} ${
                    req.patient?.last_name || ""
                  }`.trim() ||
                  "N/A";

                return (
                  <tr key={requestId || index} className="hover:bg-blue-50 transition duration-150">
                    <td className="p-4 font-mono text-gray-700">{requestId}</td>
                    <td className="p-4 font-medium text-gray-900 flex items-center gap-2">
                      <User size={16} className="text-blue-500" />
                      {patientName}
                    </td>
                    <td className="p-4 text-gray-600">{req.patient?.age || "—"} yrs</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClass(
                          req.status
                        )}`}
                      >
                        {getStatusIcon(req.status)}
                        {req.status || "Unknown"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {req.created_at
                          ? new Date(req.created_at).toLocaleDateString()
                          : "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {req.created_at
                          ? new Date(req.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Link to={`/tests/requests/${requestId}`}>
                        <button className="bg-blue-600 text-white py-1.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center mx-auto hover:bg-blue-700 transition shadow-sm">
                          View Details <ArrowRight size={16} className="ml-1" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500 italic">
                  No test requests found in the system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ PATIENT SEARCH MODAL */}
      <PatientSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(patient) => {
          setIsModalOpen(false);
          navigate(`/patients/${patient.id}/request-test`);
        }}
      />
    </div>
  );
};

export default TestManagementPage;
