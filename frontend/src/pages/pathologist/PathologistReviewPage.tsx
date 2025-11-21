import React, { useState, useEffect, useCallback, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  RefreshCw,
} from "lucide-react";

// ==================================================================================
// 🔧 INTERNAL UTILITIES
// ==================================================================================

const apiFetch = async (url, options = {}) => {
  let token = "";
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (raw) token = JSON.parse(raw)?.token || "";
  } catch (e) {}

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    let msg = text || `API Error: ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.message || parsed.error || msg;
    } catch {}
    throw new Error(msg);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
};

const pathologistService = {
  getResultTemplate: async (requestId) => {
    const data = await apiFetch(
      `/api/pathologist/requests/${requestId}/template`
    );
    if (data && data.items) {
      data.items = data.items.map((item) => ({
        ...item,
        unit_symbol: item.unit_symbol || item.unit_name || "",
        type:
          item.type ||
          ((item.ref_range || "").match(/positive|negative|reactive/i)
            ? "qualitative"
            : "quantitative"),
        qualitative_values: (item.qualitative_values || []).filter(Boolean),
      }));
    }
    return data;
  },
  verifyResult: async (testItemId) => {
    return apiFetch(`/api/pathologist/items/${testItemId}/verify`, {
      method: "POST",
      body: JSON.stringify({ action: "verify" }),
    });
  },
  reopenResult: async (testItemId) => {
    return apiFetch(`/api/pathologist/items/${testItemId}/reopen`, {
      method: "POST",
    });
  },
  // Keep using test-requests status endpoint since we wired RBAC there
  releaseReport: async (requestId) => {
    return apiFetch(`/api/test-requests/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Released" }),
    });
  },
};

// ==================================================================================
// 🛡️ AUTH CAPABILITIES
// ==================================================================================

const ROLE_CAPABILITIES = {
  "Senior Lab Scientist": ["verify_results", "release_report", "edit_results"],
  Pathologist: ["verify_results", "release_report", "edit_results"],
  Admin: ["verify_results", "release_report", "edit_results"],
  "Lab Scientist": ["enter_results"],
  "Lab Technician": ["enter_results"],
};

const useAuthInternal = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("elims_auth_v1");
      if (raw) setUser(JSON.parse(raw).user);
    } catch (e) {}
  }, []);

  const can = (capability) => {
    if (!user) return false;

    const map = user.permissions_map || {};

    // 1. Super Admin override
    if (map["*:*"]) return true;

    // 2. Check explicit DB permissions
    const permissionMap = {
      verify_results: ["pathology:verify", "pathologist:verify", "results:verify"],
      // Releasing is effectively an update on the test request + reports
      release_report: [
        "pathologist:release",
        "reports:release",
        "test_requests:update",
      ],
      edit_results: [
        "pathology:update",
        "results:enter",
        "pathologist:update",
        "results:edit",
      ],
      enter_results: ["results:enter", "lab_work:enter", "pathologist:enter"],
    };

    const dbKeys = permissionMap[capability] || [];
    const hasDbPermission = dbKeys.some((key) => !!map[key]);
    if (hasDbPermission) return true;

    // 3. Fallback by role name
    const userRole = user.role || user.role_name || "";
    const allowedRoles = Object.keys(ROLE_CAPABILITIES).filter((roleName) =>
      ROLE_CAPABILITIES[roleName].includes(capability)
    );
    return allowedRoles.includes(userRole);
  };

  return { user, can };
};

const useSocketInternal = () => ({ socket: { on: () => {}, off: () => {} } });

// ==================================================================================
// UI Helpers
// ==================================================================================

const safeStatus = (s) =>
  typeof s === "string" ? s.trim().toLowerCase().replace(/\s/g, "") : "";

const StatusBadge = ({ status }) => {
  let bg = "bg-gray-200",
    fg = "text-gray-800";
  const s = safeStatus(status);

  if (["verified"].includes(s)) {
    bg = "bg-green-100";
    fg = "text-green-800";
  } else if (["inprogress", "pending"].includes(s)) {
    bg = "bg-yellow-100";
    fg = "text-yellow-800";
  } else if (["completed"].includes(s)) {
    bg = "bg-purple-100";
    fg = "text-purple-800";
  } else if (["underreview"].includes(s)) {
    bg = "bg-cyan-100";
    fg = "text-cyan-800";
  } else if (["released"].includes(s)) {
    bg = "bg-blue-100";
    fg = "text-blue-800";
  } else if (["rejected", "reopened"].includes(s)) {
    bg = "bg-red-100";
    fg = "text-red-800";
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${fg} border border-black/10`}
    >
      {status || "Unknown"}
    </span>
  );
};

const PatientInfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2 text-sm">
    <Icon className="w-4 h-4 text-gray-400" />
    <div>
      <span className="font-medium text-gray-700">{label}:</span>{" "}
      <span className="text-gray-600">{value}</span>
    </div>
  </div>
);

// ==================================================================================
// MAIN PAGE
// ==================================================================================

const PathologistReviewPage = () => {
  const { id: paramId } = useParams();
  const id = paramId;
  const navigate = useNavigate();
  const { socket } = useSocketInternal();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user, can } = useAuthInternal();

  const canVerify = can("verify_results");
  const canReopen = can("edit_results");
  const canRelease = can("release_report");

  const loadTemplate = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await pathologistService.getResultTemplate(Number(id));
      setRequest(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load test results");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => loadTemplate();
    socket.on("result_saved", handleUpdate);
    socket.on("test_status_updated", handleUpdate);
    return () => {
      socket.off("result_saved", handleUpdate);
      socket.off("test_status_updated", handleUpdate);
    };
  }, [socket, loadTemplate]);

  if (!user)
    return (
      <div className="p-12 text-center text-gray-500">Loading session...</div>
    );

  // --------------------------- Action Handlers ---------------------------

  const handleVerify = async (item) => {
    try {
      setActionLoading(true);

      const isPanel = !!item.is_panel;
      const candidates = isPanel
        ? (item.analytes || []).filter(
            (a) => safeStatus(a.status) !== "verified" && (a.result_value || a.value)
          )
        : [item];

      if (candidates.length === 0) {
        toast.error("No items eligible for verification.");
        return;
      }

      for (const x of candidates) {
        await pathologistService.verifyResult(x.request_item_id);
      }

      toast.success("Verified successfully");
      await loadTemplate();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Verification failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (itemId) => {
    try {
      setActionLoading(true);
      await pathologistService.reopenResult(itemId);
      toast.success("Result reopened");
      await loadTemplate();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Reopen failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseReport = async () => {
    try {
      setActionLoading(true);
      await pathologistService.releaseReport(Number(id));
      toast.success("Report released successfully!");
      await loadTemplate();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Release failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------------------ UI PREP ----------------------------- //

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );

  if (error || !request?.items)
    return (
      <div className="p-8 text-center">
        <HiXCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">
          Error Loading Data
        </h3>
        <p className="text-gray-500 mt-1 mb-6">
          {error || "No results found"}
        </p>
        <button
          onClick={loadTemplate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );

  const flatItems = [];
  request.items.forEach((i) => {
    if (i.is_panel && i.analytes) flatItems.push(...i.analytes);
    else flatItems.push(i);
  });

  const allVerified =
    flatItems.length > 0 &&
    flatItems.every((i) =>
      ["verified", "released"].includes(safeStatus(i.status))
    );

  const isReleased =
    safeStatus(request.report_status || request.status) === "released";

  const patientInfo = request.patient_info || {
    name:
      request.patient_full_name ||
      request.patient_name ||
      request.items[0]?.patient_full_name ||
      request.items[0]?.patient_name ||
      "Unknown",
    patient_id:
      request.lab_id || request.items[0]?.lab_id || request.items[0]?.mrn || "",
    date_of_birth:
      request.date_of_birth || request.items[0]?.date_of_birth || null,
    gender: request.gender || request.items[0]?.gender || "N/A",
  };

  const dobText = patientInfo.dob_formatted
    ? patientInfo.dob_formatted
    : patientInfo.date_of_birth
    ? new Date(patientInfo.date_of_birth).toLocaleDateString()
    : "N/A";

  const renderRow = (item, isAnalyte) => {
    const resultValue = item.result_value ?? item.value ?? "—";
    const flag = item.flag || item.result_flag || null;
    const isAbnormal = ["H", "L", "A", "R"].includes(flag);
    const s = safeStatus(item.status);
    const ready = ["completed", "underreview"].includes(s);
    const finalized = ["verified", "released"].includes(s);

    const displayName =
      item.test_name || item.analyte_name || item.name || "—";

    return (
      <tr
        key={item.request_item_id}
        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
          isAnalyte ? "bg-gray-50/50" : "bg-white"
        }`}
      >
        <td
          className={`p-4 font-medium text-gray-700 ${
            isAnalyte ? "pl-8 text-sm" : "text-sm"
          }`}
        >
          <div className="flex items-center gap-2">
            {isAnalyte && (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            )}
            {displayName}
          </div>
        </td>
        <td className="p-4 font-bold text-gray-900 text-xs">
          {resultValue}{" "}
          {flag && (
            <span
              className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                isAbnormal
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {flag}
            </span>
          )}
        </td>
        <td className="p-4 text-gray-500 text-xs font-mono">
          {item.unit_symbol || item.unit_name || "—"}
        </td>
        <td className="p-4 text-gray-500 text-xs">
          {item.ref_range || item.reference_range || "—"}
        </td>
        <td className="p-4">
          <StatusBadge status={item.status} />
        </td>
        <td className="p-3 flex flex-wrap gap-2 justify-end">
          {ready && canVerify && (
            <button
              onClick={() => handleVerify(item)}
              disabled={actionLoading}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 shadow-sm"
            >
              {actionLoading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <HiShieldCheck className="w-3 h-3" />
              )}
              Verify
            </button>
          )}
          {finalized && canReopen && (
            <button
              onClick={() => handleReopen(item.request_item_id)}
              disabled={actionLoading}
              className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-60"
            >
              <HiXCircle className="w-3 h-3" /> Reopen
            </button>
          )}
        </td>
      </tr>
    );
  };

  // ==================================================================================
  // RENDER
  // ==================================================================================

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Review Results
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isReleased
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : allVerified
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                }`}
              >
                {isReleased
                  ? "Released"
                  : allVerified
                  ? "Ready for Release"
                  : "Pending Verification"}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Request ID:{" "}
              <span className="font-mono text-gray-700">
                #
                {request.request_id ||
                  request.id ||
                  request.test_request_id ||
                  id}
              </span>
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 font-medium text-sm"
            >
              <HiArrowLeft className="w-4 h-4" /> Back
            </button>
            {canRelease && !isReleased && (
              <button
                onClick={handleReleaseReport}
                disabled={!allVerified || actionLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-900 text-white py-2 px-5 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium text-sm"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <HiFileCheck className="w-4 h-4" />
                )}
                Release Report
              </button>
            )}
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PatientInfoItem
            icon={HiUser}
            label="Patient"
            value={patientInfo.name}
          />
          <PatientInfoItem
            icon={HiInfo}
            label="Lab ID"
            value={patientInfo.patient_id || "N/A"}
          />
          <PatientInfoItem icon={HiCalendar} label="DOB" value={dobText} />
          <PatientInfoItem
            icon={HiUser}
            label="Gender"
            value={patientInfo.gender || "N/A"}
          />
        </div>

        {/* Results Table */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="p-4 w-[25%]">Test Name</th>
                  <th className="p-4 w-[15%]">Result</th>
                  <th className="p-4 w-[10%]">Unit</th>
                  <th className="p-4 w-[20%]">Reference Range</th>
                  <th className="p-4 w-[10%]">Status</th>
                  <th className="p-4 w-[20%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {request.items.map((item) => (
                  <Fragment key={item.request_item_id || item.test_id}>
                    {item.is_panel && (
                      <tr className="bg-blue-50/30 border-b border-gray-100">
                        <td
                          colSpan={6}
                          className="px-4 py-2 font-bold text-blue-800 text-xs uppercase tracking-wide"
                        >
                          {item.test_name} (Panel)
                        </td>
                      </tr>
                    )}

                    {!item.is_panel && renderRow(item, false)}

                    {item.is_panel &&
                      item.analytes?.map((a) => (
                        <Fragment key={a.request_item_id}>
                          {renderRow(a, true)}
                        </Fragment>
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathologistReviewPage;
