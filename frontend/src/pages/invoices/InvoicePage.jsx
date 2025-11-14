// frontend/src/pages/invoices/InvoicePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { toast } from "react-hot-toast";

const Row = ({ left, right }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-gray-600">{left}</span>
    <span className="font-medium">{right || "-"}</span>
  </div>
);

const Chip = ({ children, tone = "default" }) => {
  const tones = {
    default: "bg-gray-100 text-gray-800 ring-gray-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
};

function fmtMoney(n, currency = "Le") {
  const num = Number(n || 0);
  return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
function fmtDate(d) {
  if (!d) return "-";
  const dd = new Date(d);
  return Number.isNaN(dd.getTime()) ? "-" : dd.toLocaleString();
}

export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"))?.token || null;
    } catch {
      return null;
    }
  }, []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); // State for payment button loading

  // --- Data Fetching Logic (Refactored) ---
  const fetchData = useCallback(async () => {
    if (!token) {
      toast.error("You are not logged in.");
      navigate("/login");
      return;
    }
    try {
      setLoading(true);
      const res = await invoiceService.getInvoiceForRequest(id, token);
      setData(res);
    } catch (e) {
      toast.error(e?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    let cancel = false;
    fetchData();
    return () => { cancel = true; };
  }, [fetchData]);

  // --- Payment Processing Handler ---
  const handleProcessPayment = async () => {
    if ((data?.header.payment_status || '').toLowerCase() === 'paid' || processing || !id || !token) return;

    setProcessing(true);
    try {
      // Assuming invoiceService has a processPayment method that hits the PUT/POST endpoint
      await invoiceService.processPayment(id, { paymentMethod: 'Cash' }, token);
      
      toast.success("Payment processed successfully!");
      fetchData(); // Refresh data to show 'paid' status
    } catch (e) {
      toast.error(e?.message || "Failed to process payment.");
    } finally {
      setProcessing(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse h-28 bg-gray-100 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-gray-100 rounded" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
        <div className="h-44 bg-gray-100 rounded mt-6" />
      </div>
    );
  }

  if (!data) return <div className="p-6">No invoice data.</div>;

  const { header = {}, items = [], totals = {}, org = {} } = data;
  const currency = totals?.currency || "Le";

  const isPaid = (header.payment_status || "").toLowerCase() === "paid";
  const paymentTone = isPaid
    ? "success"
    : (header.payment_status || "").toLowerCase().includes("partial")
    ? "warn"
    : header.payment_status
    ? "danger"
    : "default";

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow">
      {/* Header with logo + org info */}
      <div className="flex items-start justify-between gap-6 border-b pb-4">
        <div className="flex items-center gap-4">
          {org?.logo_url ? (
            <img
              src={org.logo_url}
              alt="Lab Logo"
              className="w-16 h-16 object-contain"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded" />
          )}
          <div>
            <h1 className="text-xl font-bold">
              {org?.name || "Laboratory / Organization"}
            </h1>
            <div className="text-sm text-gray-600 space-y-0.5">
              {org?.address ? <div>{org.address}</div> : null}
              {org?.phone ? <div>{org.phone}</div> : null}
              {org?.email ? <div>{org.email}</div> : null}
            </div>
          </div>
        </div>
        <div className="text-right text-sm min-w-[180px]">
          <div className="font-semibold">Invoice</div>
          <div>ID: #{header.request_id}</div>
          <div>Date: {fmtDate(header.created_at)}</div>
          {header.payment_status ? (
            <div className="mt-1">
              <Chip tone={paymentTone}>{header.payment_status}</Chip>
            </div>
          ) : null}
        </div>
      </div>

      {/* Patient / Request block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Patient</div>
          <Row left="Name" right={`${header.first_name || ""} ${header.last_name || ""}`.trim() || "-"} />
          <Row left="Gender" right={header.gender} />
          <Row left="Date of Birth" right={header.date_of_birth ? new Date(header.date_of_birth).toLocaleDateString() : "-"} />
          <Row left="Ward" right={header.ward_name} />
        </div>
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Request</div>
          <Row left="Doctor" right={header.doctor_name} />
          <Row left="Status" right={header.status} />
          <Row left="Payment" right={header.payment_status} />
          {header.payment_method ? <Row left="Method" right={header.payment_method} /> : null}
        </div>
      </div>

      {/* Items */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Test / Panel</th>
              <th className="p-2 text-right">Price ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-3 text-center text-gray-500">
                  No billable items.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.item_id} className="border-t">
                  <td className="p-2">
                    {it.test_name}
                    {it.is_panel ? (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Panel
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 text-right">
                    {fmtMoney(it.price, "") /* empty currency here to avoid double */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="p-2 text-right font-semibold">Subtotal</td>
              <td className="p-2 text-right font-semibold">
                {fmtMoney(totals.subtotal, "")}
              </td>
            </tr>
            {Number(totals.tax || 0) ? (
              <tr>
                <td className="p-2 text-right">Tax</td>
                <td className="p-2 text-right">{fmtMoney(totals.tax, "")}</td>
              </tr>
            ) : null}
            <tr>
              <td className="p-2 text-right text-lg font-bold">Total</td>
              <td className="p-2 text-right text-lg font-bold">
                {fmtMoney(totals.total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex justify-between">
        <Link
          to={`/patients/${header.patient_id}`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Patient
        </Link>
        <div className="flex gap-4">
            {/* ✅ PROCESS PAYMENT BUTTON */}
            {!isPaid && (
                <button
                    onClick={handleProcessPayment}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {processing ? 'Processing...' : 'Process Payment'}
                </button>
            )}
            
            <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 text-white rounded"
            >
                Print / Save PDF
            </button>
        </div>
      </div>
    </div>
  );
}