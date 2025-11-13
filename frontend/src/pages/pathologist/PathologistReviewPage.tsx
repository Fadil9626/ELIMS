import React, { useState, useEffect, useCallback, Fragment } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft as HiArrowLeft,
  ShieldCheck as HiShieldCheck,
  XCircle as HiXCircle,
  FileCheck as HiFileCheck,
  User as HiUser,
  Calendar as HiCalendar,
  Info as HiInfo,
  Edit as HiEdit,
} from "lucide-react";
import pathologistService from "../../services/pathologistService";
import type {
  ResultTemplate,
  ResultTemplateItem,
} from "../../services/pathologistService";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

// =============================================================
// 🧮 Helper Components (omitted for brevity)
// =============================================================

// StatusBadge and PatientInfoItem components omitted for brevity

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let bgColor = "bg-gray-200";
  let textColor = "text-gray-800";

  switch (status?.toLowerCase()) {
    case "verified":
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      break;
    case "pending":
    case "in progress":
    case "inprogress":
      bgColor = "bg-yellow-100";
      textColor = "text-yellow-800";
      break;
    case "completed":
      bgColor = "bg-purple-100";
      textColor = "text-purple-800";
      break;
    case "under review":
    case "underreview":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      break;
    case "rejected":
    case "reopened":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      break;
    case "released":
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      break;
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
    >
      {status || "Unknown"}
    </span>
  );
};

const PatientInfoItem: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-gray-500" />
    <span className="text-sm">
      <span className="font-semibold text-gray-700">{label}:</span>{" "}
      <span className="text-gray-600">{value}</span>
    </span>
  </div>
);


// =============================================================
// 🧠 Pathologist Review Page (Live Update Enabled)
// =============================================================
const PathologistReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // requestId
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [request, setRequest] = useState<ResultTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get auth context
  const { user, token, can } = useAuth();
  
  // Security Guard: Ensure auth context is ready
  if (!user || !can) {
    return <div className="p-6">Loading permissions...</div>;
  }
  
  const userDept = user?.department?.toLowerCase() || "";

  // Define permissions using can()
  const isSuperAdmin = can("*:*");
  const canVerify = isSuperAdmin || can("Pathologist", "Verify");
  const canUpdate = isSuperAdmin || can("Pathologist", "Update");
  const canManage = isSuperAdmin || can("Pathologist", "Manage");


  // =============================================================
  // 📡 Load Request Result Template
  // =============================================================
  const loadTemplate = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    try {
      const data = await pathologistService.getResultTemplate(token, Number(id));
      setRequest(data);
      setError(null);
    } catch (err: any) {
      console.error("❌ Load error:", err);
      setError(err.message || "Failed to load test results");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]); 

  // =============================================================
  // ⚡ Real-Time Socket Updates (omitted for brevity)
  // =============================================================
  useEffect(() => {
    if (!socket) return;

    const handleResultSaved = (data: any) => {
      if (
        data?.department?.toLowerCase() === userDept &&
        data?.request_id?.toString() === id?.toString()
      ) {
        toast.success("Result updated by technician");
        loadTemplate();
      }
    };

    const handleResultReopened = (data: any) => {
      if (
        data?.department?.toLowerCase() === userDept &&
        data?.request_id?.toString() === id?.toString()
      ) {
        toast.info("A test was reopened for editing");
        loadTemplate();
      }
    };

    socket.on("result_saved", handleResultSaved);
    socket.on("test_reopened", handleResultReopened);

    return () => {
      socket.off("result_saved", handleResultSaved);
      socket.off("test_reopened", handleResultReopened);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id, userDept, loadTemplate]);

  // =============================================================
  // 🧭 Action Handlers (omitted for brevity)
  // =============================================================
  
  const handleVerify = async (itemToVerify: ResultTemplateItem) => {
    if (!token) return;
    try {
      setActionLoading(true);
      
      let itemsToProcess: ResultTemplateItem[] = [];

      if (itemToVerify.is_panel) {
          itemsToProcess = (itemToVerify.analytes || []).filter(
            (a) => a.status?.toLowerCase() !== 'verified' && a.result_value
          );
      } else {
          itemsToProcess = [itemToVerify];
      }

      if (itemsToProcess.length === 0 && !itemToVerify.is_panel) {
          toast.info("Item is already verified or missing a result.");
          return;
      }
      
      if (itemsToProcess.length > 0 || !itemToVerify.is_panel) {
          for (const item of itemsToProcess) {
            await pathologistService.verifyResult(token, item.request_item_id);
          }
          
          if (itemToVerify.is_panel) {
            toast.success(`${itemsToProcess.length} analyte(s) verified.`);
          } else {
            toast.success("✅ Result verified successfully");
          }
          
          await loadTemplate();
      }

    } catch (err: any) {
      toast.error(err.message || "Failed to verify results.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (testItemId: number) => {
    if (!token) return;
    try {
      setActionLoading(true);
      await pathologistService.reopenResult(token, testItemId);
      toast.success("🔁 Result reopened for editing");
      
      if (request?.request_id) {
        navigate(`/pathologist/results/${request.request_id}`); 
      } else {
        await loadTemplate();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (testItemId: number) => {
    if (!token) return;
    try {
      setActionLoading(true);
      await pathologistService.markForReview(token, testItemId);
      toast.success("🟡 Marked as Under Review");
      await loadTemplate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseReport = async () => {
    if (!token || !id) return;
    try {
      setActionLoading(true);
      await pathologistService.releaseReport(token, Number(id));
      toast.success("📄 Report released successfully");
      navigate(`/reports/test-request/${id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // =============================================================
  // 🧾 UI States
  // =============================================================
  if (loading)
    return <div className="p-6 text-gray-600">Loading results...</div>;

  if (error)
    return (
      <div className="p-6 text-red-600">
        ❌ Error: {error}
        <br />
        <button
          onClick={loadTemplate}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );

  if (!request || !request.items)
    return <div className="p-6 text-gray-600">No test results found.</div>;

  const allVerified = request.items.every(
    (item) => item.status?.toLowerCase() === "verified" || item.is_panel
  );
  
  const patientInfo = (request as any).patient_info || {};

  // --- Rendering Logic Helpers ---

  const renderActions = (item: ResultTemplateItem) => {
    // 🛑 FIX APPLIED HERE: Clean the status string before comparison
    const cleanedStatus = item.status?.trim().toLowerCase();
    
    const isReadyForVerification = cleanedStatus === "completed" || cleanedStatus === "underreview";
    const isFinalized = cleanedStatus === "verified" || cleanedStatus === "released"; 
    const isPendingEntry = cleanedStatus === "in progress" || cleanedStatus === "pending" || cleanedStatus === "reopened" || cleanedStatus === "inprogress";

    return (
        <td className="p-3 flex flex-wrap gap-2">
            
            {/* VERIFY BUTTON: Requires canVerify permission */}
            {isReadyForVerification && canVerify && (
                <button
                    onClick={() => handleVerify(item)}
                    disabled={actionLoading} 
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 text-xs rounded hover:bg-green-700 disabled:opacity-60"
                >
                    <HiShieldCheck className="w-3 h-3" /> Verify
                </button>
            )}

            {/* REOPEN BUTTON: Requires canUpdate permission and FINALIZED status */}
            {isFinalized && canUpdate && (
                <button
                    onClick={() => handleReopen(item.request_item_id)}
                    disabled={actionLoading} 
                    className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 text-xs rounded hover:bg-red-700 disabled:opacity-60"
                >
                    <HiXCircle className="w-3 h-3" /> Reopen
                </button>
            )}

            {/* EDIT RESULT BUTTON: Requires canUpdate permission and pending entry status */}
            {isPendingEntry && canUpdate && (
                <Link to={`/pathologist/results/${request.request_id}`}>
                    <button
                        disabled={actionLoading}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 text-xs rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                        <HiEdit className="w-3 h-3" /> Edit Result
                    </button>
                </Link>
            )}
            
        </td>
    );
  };
  
  const renderRow = (item: ResultTemplateItem, isAnalyte: boolean) => {
    const resultValue = item.result_value || '—';
    const actionColumn = renderActions(item); 
    
    return (
        <tr
          key={`${item.request_item_id}_${item.test_id}`}
          className={`border-b hover:bg-gray-50 ${isAnalyte ? 'text-gray-700 bg-gray-50' : 'bg-white'}`}
        >
          <td className={`p-3 font-medium ${isAnalyte ? 'pl-8 text-sm' : 'text-base'}`}>{item.test_name}</td>
          
          <td
            className={`p-3 ${
              (item as any).is_abnormal ? "font-bold text-red-600" : ""
            }`}
          >
            {resultValue}
          </td>
          <td className="p-3 text-gray-600">
            {item.unit_symbol || "—"}
          </td>
          <td className="p-3 text-gray-500">{item.ref_range || "—"}</td>
          <td className="p-3">
            <StatusBadge status={item.status} />
          </td>
          {actionColumn} 
        </tr>
    );
  };


  // =============================================================
  // 🧮 Render
  // =============================================================
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Review Test Results</h1>
          <p className="text-sm text-gray-500">
            Request ID: #{request.request_id}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            <HiArrowLeft className="w-4 h-4" /> Back
          </button>
          
          {/* RELEASE REPORT BUTTON: Controlled by canManage and allVerified status */}
          <button
            onClick={handleReleaseReport}
            disabled={actionLoading || !allVerified || !canManage}
            title={
              !allVerified
                ? "All tests must be verified before releasing the report"
                : !canManage 
                ? "You do not have permission to release reports"
                : "Release the final report"
            }
            className={`flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ${!canManage ? 'hidden' : ''}`}
          >
            <HiFileCheck className="w-4 h-4" />
            {actionLoading ? "Processing..." : "Release Report"}
          </button>
        </div>
      </div>

      {/* Patient Info Card */}
      {patientInfo.name && (
        <div className="bg-white shadow-md rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <PatientInfoItem
            icon={HiUser}
            label="Patient"
            value={patientInfo.name}
          />
          <PatientInfoItem
            icon={HiInfo}
            label="Patient ID"
            value={patientInfo.patient_id}
          />
          <PatientInfoItem
            icon={HiCalendar}
            label="DOB"
            value={patientInfo.dob_formatted || patientInfo.date_of_birth || 'N/A'}
          />
          <PatientInfoItem
            icon={HiUser}
            label="Gender"
            value={patientInfo.gender || 'N/A'}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr className="border-b">
              <th className="p-3 text-left">Test Name</th>
              <th className="p-3 text-left">Result</th>
              <th className="p-3 text-left">Unit</th>
              <th className="p-3 text-left">Reference Range</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item: ResultTemplateItem) => (
              <Fragment key={item.request_item_id}>
                {/* 1. Render the Parent Test Row (or Standalone Test) */}
                {renderRow(item, false)} 
                
                {/* 2. Render Nested Analytes if this item is a panel */}
                {item.is_panel && item.analytes && item.analytes.map((analyte) => (
                  <Fragment key={analyte.request_item_id}>
                    {renderRow(analyte, true)} 
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PathologistReviewPage;