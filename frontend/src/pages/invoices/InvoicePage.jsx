// frontend/src/pages/invoices/InvoicePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import settingsService from "../../services/settingsService";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";

// ---------- Helpers ----------

// Safely coerce to number
function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

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
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const fmtMoney = (n, currency = "Le") =>
  `${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

const fmtDate = (d) => (!d ? "-" : new Date(d).toLocaleString());

export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printMode, setPrintMode] = useState("standard");

  // Use the same auth storage key used elsewhere in ELIMS
  const token = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("elims_auth_v1"))?.token || null;
    } catch {
      return null;
    }
  }, []);

  const user = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("elims_auth_v1"));
      return u?.user || u || null;
    } catch {
      return null;
    }
  }, []);

  const printedBy =
    user?.full_name || user?.name || user?.username || "Unknown User";

  const [data, setData] = useState(null);
  const [org, setOrg] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const currency = "Le";

  // ---- FETCH DATA ----
  const fetchData = useCallback(async () => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return navigate("/login");
    }

    try {
      setLoading(true);

      const res = await invoiceService.getInvoiceForRequest(id, token);
      const lab = await settingsService.getLabProfile(token);

      const o = lab?.data || lab || {};
      setOrg({
        name: o.lab_name || o.name || "Medical Laboratory",
        address: o.lab_address || o.address || "",
        phone: o.lab_phone || o.phone || "",
        email: o.lab_email || o.email || "",
        logoLeft: o.lab_logo_light || o.logo_light || null,
        logoRight: o.lab_logo_right || o.logo_dark || null,
      });

      setData(res);
    } catch (err) {
      console.error("InvoicePage fetch error:", err);
      toast.error(err?.message || "Failed to load invoice");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return <div className="p-6 animate-pulse">Loading Invoice...</div>;
  if (!data) return <div className="p-6">Invoice Not Found</div>;

  const {
    invoice_code,
    created_at,
    patient,
    request_id,
    items = [],
    billing = {},
  } = data;

  const isPaid = (billing.payment_status || "").toLowerCase() === "paid";

  // Subtotal from items
  const subtotal = items.reduce(
    (sum, i) => sum + safeNumber(i.price, 0),
    0
  );

  // Use billing.amount_due if present, otherwise fall back to subtotal
  const amountDue = safeNumber(
    billing?.amount_due ?? subtotal,
    subtotal
  );

  const qrData = JSON.stringify({
    invoice: invoice_code,
    patient_mrn: patient?.mrn,
    total: amountDue,
    status: billing?.payment_status,
    printed_by: printedBy,
    verify: `${window.location.origin}/verify/${invoice_code}`,
  });

  const handlePayment = async () => {
    if (processing || isPaid) return;
    if (!window.confirm("Mark this invoice as PAID? This is usually irreversible.")) {
      return;
    }

    setProcessing(true);

    try {
      // Send the amount we consider due
      await invoiceService.processPayment(
        id,
        { paymentMethod: "Cash", amount: amountDue },
        token
      );
      toast.success("Payment successful.");
      fetchData();
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err?.message || "Payment failed.");
    } finally {
      setProcessing(false);
    }
  };

  const patientName =
    patient?.name ||
    `${patient?.first_name || ""} ${patient?.last_name || ""}`.trim() ||
    "Unknown";

  // ---------- Render ----------
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* PRINT CSS */}
      <style>{`
        @media print {
          header, aside, nav, .sidebar, .topbar, .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .invoice-wrapper, .receipt {
            width: 100% !important;
            margin: 0 auto;
          }
          button, a {
            display: none !important;
          }
        }
      `}</style>

      {/* Toggle Mode */}
      <div className="flex justify-between items-center mb-4 no-print">
        <button
          onClick={() =>
            setPrintMode(printMode === "standard" ? "receipt" : "standard")
          }
          className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          {printMode === "standard"
            ? "Switch to Receipt Mode"
            : "Switch to A4 Mode"}
        </button>
      </div>

      {/* ---------------- A4 MODE ---------------- */}
      {printMode === "standard" && (
        <div className="invoice-wrapper bg-white p-6 rounded shadow print:w-full">
          {/* Header Section */}
          <div className="flex justify-between items-center border-b pb-4">
            {org.logoLeft && (
              <img
                src={org.logoLeft}
                className="w-20 h-20 object-contain"
                alt="Logo Left"
              />
            )}

            <div className="text-center flex-1">
              <h1 className="font-bold text-2xl">{org.name}</h1>
              <div className="text-sm text-gray-600">{org.address}</div>
              <div className="text-sm text-gray-600">
                Contact: {org.phone} | {org.email}
              </div>
            </div>

            {org.logoRight && (
              <img
                src={org.logoRight}
                className="w-20 h-20 object-contain"
                alt="Logo Right"
              />
            )}
          </div>

          {/* Invoice Header */}
          <div className="flex justify-between items-start mt-4 text-sm">
            <div>
              {/* Left side can hold extra info later if needed */}
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold">INVOICE</span>
              <div className="font-semibold">{invoice_code}</div>
              <div>{fmtDate(created_at)}</div>
              <Chip tone={isPaid ? "success" : "danger"}>
                {billing.payment_status || "Unknown"}
              </Chip>

              <div className="hidden print:block text-xs mt-2 text-gray-500">
                Printed by: <strong>{printedBy}</strong>
              </div>
            </div>
          </div>

          {/* Patient + Request */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border rounded p-3">
              <h3 className="font-semibold mb-2">Patient</h3>
              <Row left="Name" right={patientName} />
              <Row left="MRN" right={patient?.mrn} />
              <Row left="Ward" right={patient?.ward || "N/A"} />
            </div>
            <div className="border rounded p-3">
              <h3 className="font-semibold mb-2">Request</h3>
              <Row left="Request ID" right={request_id} />
              <Row left="Payment Status" right={billing?.payment_status} />
            </div>
          </div>

          {/* Items */}
          <table className="w-full border mt-6 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Test</th>
                <th className="p-2 text-right">Price ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr className="border-t" key={i.id || i.test_id}>
                  <td className="p-2">{i.name}</td>
                  <td className="p-2 text-right">
                    {fmtMoney(i.price, "")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="p-2 text-right font-semibold">SUBTOTAL</td>
                <td className="p-2 text-right font-semibold">
                  {fmtMoney(subtotal, currency)}
                </td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td className="p-2 text-right">TOTAL DUE</td>
                <td className="p-2 text-right">
                  {fmtMoney(amountDue, currency)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* QR */}
          <div className="mt-6 flex justify-center">
            <QRCodeSVG value={qrData} size={130} />
          </div>

          {/* Footer (print only) */}
          <div className="text-center text-xs text-gray-500 mt-6 print:block hidden border-t pt-2">
            This invoice was generated by ELIMS © {new Date().getFullYear()} —{" "}
            {org.name}. Unauthorized alteration voids this document.
          </div>

          {/* Buttons */}
          <div className="no-print flex justify-between mt-6">
            <div className="flex gap-4">
              {patient?.id && (
                <Link
                  to={`/patients/${patient.id}`}
                  className="text-blue-600 hover:underline"
                >
                  ← Patient
                </Link>
              )}
              {request_id && (
                <Link
                  to={`/test-requests/${request_id}`}
                  className="text-blue-600 hover:underline"
                >
                  ← Request
                </Link>
              )}
            </div>

            <div className="flex gap-4">
              {!isPaid && (
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Process Payment"}
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 text-white rounded"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- RECEIPT MODE ---------------- */}
      {printMode === "receipt" && (
        <div className="receipt mx-auto text-xs w-[230px] print:w-full">
          <div className="text-center mt-2">
            {org.logoLeft && (
              <img
                src={org.logoLeft}
                className="w-20 mx-auto"
                alt="Logo"
              />
            )}
            <strong className="block mt-1 text-sm">{org.name}</strong>
            <div>{org.address}</div>
            <div>{org.phone}</div>
            <div>{org.email}</div>
          </div>
          <hr className="my-2" />

          <div className="text-center">
            <strong>Invoice: {invoice_code}</strong>
            <div>{fmtDate(created_at)}</div>
            <Chip tone={isPaid ? "success" : "danger"}>
              {billing.payment_status || "Unknown"}
            </Chip>
          </div>
          <hr className="my-2" />

          <div>
            <strong>Patient:</strong>
            <br />
            {patientName} {patient?.mrn ? `(${patient.mrn})` : ""}
          </div>
          <hr className="my-2" />

          {items.map((i) => (
            <div key={i.id || i.test_id} className="flex justify-between">
              <span>{i.name}</span>
              <span>{fmtMoney(i.price, "")}</span>
            </div>
          ))}

          <hr className="my-2" />

          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{fmtMoney(amountDue, currency)}</span>
          </div>

          <div className="flex justify-center my-3">
            <QRCodeSVG value={qrData} size={100} />
          </div>

          {/* Receipt Footer */}
          <div className="text-center text-[10px] mt-3 print:block hidden">
            Printed by: {printedBy}
            <br />
            ELIMS © {new Date().getFullYear()} — {org.name}
          </div>
        </div>
      )}
    </div>
  );
}
