// src/pages/tests/TestRequestDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import testRequestService from "../../services/testRequestService";
// (optional) if you added useCan:
import useCan from "../../hooks/useCan";

function getToken() {
  try {
    const ls = JSON.parse(localStorage.getItem("userInfo") || "null") || {};
    return ls?.token || ls?.user?.token || null;
  } catch {
    return null;
  }
}

function safeNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function formatLe(amount) {
  const num = safeNumber(amount, 0);
  return `${num.toLocaleString()} Le`;
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

const TestRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useCan?.() || { can: () => true }; // safe if hook not present

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestId = useMemo(() => {
    // allow numeric ids only to avoid "undefined" issues
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
        const token = getToken();
        if (!token) {
          setError("Your session expired. Please log in again.");
          setLoading(false);
          return;
        }
        // service should accept a number id; pass requestId not the raw string
        const data = await testRequestService.getTestRequestById(requestId, token);

        if (!cancelled) setRequest(data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load test request.");
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
    return request.items.reduce((sum, item) => sum + safeNumber(item.price, 0), 0);
  }, [request]);

  if (loading) return <div className="p-6">Loading details...</div>;
  if (error)
    return (
      <div className="p-6 text-red-600 space-y-4">
        <div className="font-semibold">Error: {error}</div>
        <div className="space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700"
          >
            Retry
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 text-white py-1.5 px-3 rounded hover:bg-gray-600"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  if (!request) return <div className="p-6">Request not found.</div>;

  const patientName = [request.patient_first_name, request.patient_last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Test Request Details: ID #{request.id}
        </h1>

        <div className="flex items-center gap-2">
          {/* Quick actions – only show if user can */}
          {can("reports", "view") && requestId && (
            <Link
              to={`/reports/test-request/${requestId}`}
              className="bg-indigo-600 text-white py-2 px-3 rounded hover:bg-indigo-700"
            >
              View Report
            </Link>
          )}
          {can("billing", "view") && requestId && (
            <Link
              to={`/invoices/test-request/${requestId}`}
              className="bg-green-600 text-white py-2 px-3 rounded hover:bg-green-700"
            >
              View Invoice
            </Link>
          )}
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 text-white py-2 px-3 rounded hover:bg-gray-600"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Patient & Request Summary */}
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm mb-6 border border-gray-100">
        <h2 className="text-xl md:text-2xl font-semibold mb-4 border-b pb-2 text-gray-800">
          Patient and Request Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-base md:text-lg">
          <p>
            <strong>Patient:</strong> {patientName || "N/A"}
          </p>
          <p>
            <strong>Referring Doctor:</strong> {request.referring_doctor || "N/A"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className="text-blue-700 font-semibold">{request.status || "N/A"}</span>
          </p>
          <p>
            <strong>Total Price:</strong>{" "}
            <span className="text-green-700 font-bold">{formatLe(totalPrice)}</span>
          </p>
        </div>
      </div>

      {/* Tests & Results */}
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-xl md:text-2xl font-semibold mb-4 border-b pb-2 text-gray-800">
          Requested Tests and Results
        </h2>

        {!request.items?.length ? (
          <div className="text-gray-600">No test items on this request.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 font-semibold">Test Name</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Result</th>
                  <th className="p-3 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {request.items.map((item) => {
                  const dept =
                    item.department ||
                    item.department_name ||
                    item.dept_name ||
                    "—";
                  return (
                    <tr key={item.id ?? `${item.test_id}-${item.test_name}`} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.test_name || item.name || "Unnamed test"}</td>
                      <td className="p-3 text-gray-600">{dept}</td>
                      <td className="p-3 font-semibold text-gray-800">
                        {resultCell(item.result_data)}
                      </td>
                      <td className="p-3 text-gray-700">{formatLe(item.price)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="p-3 font-semibold" colSpan={3}>
                    Total
                  </td>
                  <td className="p-3 font-bold">{formatLe(totalPrice)}</td>
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
