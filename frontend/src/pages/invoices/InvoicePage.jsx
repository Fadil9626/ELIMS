// frontend/src/pages/invoices/InvoicePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import settingsService from "../../services/settingsService";
import { QRCodeSVG } from "qrcode.react";
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
    <span className={`inline-flex px-2 py-0.5 text-xs rounded ring-1 ${tones[tone]}`}>
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
  const [invoice, setInvoice] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  /** ========== USER + TOKEN ========== **/
  const token = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"))?.token;
    } catch {
      return null;
    }
  }, []);

  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"));
    } catch {
      return null;
    }
  }, []);

  const printedBy =
    userData?.user?.full_name ||
    userData?.user?.name ||
    `${userData?.user?.first_name || ""} ${
      userData?.user?.last_name || ""
    }`.trim() ||
    userData?.username ||
    userData?.name ||
    "Unknown";

  /** ========== FETCH DATA ========== **/
  const fetchData = useCallback(async () => {
    if (!token) return navigate("/login");

    try {
      setLoading(true);
      const inv = await invoiceService.getInvoiceForRequest(id, token);
      const lab = await settingsService.getLabProfile(token);

      const o = lab?.data || lab;

      setOrg({
        name: o.lab_name || o.name || "Medical Laboratory",
        address: o.lab_address || o.address || "",
        phone: o.lab_phone || o.phone || "",
        email: o.lab_email || o.email || "",
        logoLeft: o.lab_logo_light || o.logo_light || null,
        logoRight: o.lab_logo_right || o.logo_dark || null,
      });

      setInvoice(inv);
    } catch (err) {
      toast.error(err?.message || "Invoice failed to load");
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** ========== PAYMENT ACTION ========== **/
  const handlePayment = async () => {
    if (!invoice || processing) return;
    setProcessing(true);
    try {
      await invoiceService.processPayment(id, { paymentMethod: "Cash" }, token);
      toast.success("Payment updated");
      fetchData();
    } catch {
      toast.error("Failed to update payment");
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="p-6">Loading invoice...</div>;
  if (!invoice) return <div className="p-6">Invoice not found</div>;

  /** ========== EXTRACT DATA ========== **/
  const { invoice_code, created_at, patient, request_id, items = [], billing = {} } =
    invoice;

  const isPaid = (billing.payment_status || "").toLowerCase() === "paid";
  const paymentTone = isPaid
    ? "success"
    : billing.payment_status?.includes("Partial")
    ? "warn"
    : "danger";

  const watermarkText = isPaid
    ? "PAID"
    : billing.payment_status?.includes("Partial")
    ? "PARTIAL"
    : "UNPAID";

  const qrData = JSON.stringify({
    invoice: invoice_code,
    patient_mrn: patient?.mrn,
    total: billing.amount_due,
    printed_by: printedBy,
    verify: `${window.location.origin}/verify/${invoice_code}`,
  });

  const currency = "Le";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* PRINT RULES */}
      <style>{`
        @media print {
          .no-print, header, aside, nav {
            display: none !important;
          }
          .invoice-wrapper, .receipt-wrapper {
            width: 100% !important;
          }
        }
      `}</style>

      {/* MODE SWITCH */}
      <div className="flex justify-between items-center mb-4 no-print">
        <span className="text-sm text-gray-600">
          Mode: <strong>{printMode === "standard" ? "A4 Invoice" : "Receipt"}</strong>
        </span>
        <button
          className="px-3 py-2 bg-gray-200 text-sm rounded"
          onClick={() =>
            setPrintMode(printMode === "standard" ? "receipt" : "standard")
          }
        >
          {printMode === "standard" ? "Switch to Receipt" : "Switch to A4"}
        </button>
      </div>

      {/** ================= A4 LAYOUT ================= **/}
      {printMode === "standard" && (
        <div className="invoice-wrapper bg-white shadow rounded p-6 relative">

          {/* WATERMARK */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 text-7xl font-extrabold pointer-events-none">
            {watermarkText}
          </div>

          {/* HEADER */}
          <div className="flex justify-between items-center border-b pb-4">
            {org?.logoLeft && <img src={org.logoLeft} className="w-20 h-20" />}
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">{org?.name}</h1>
              <p className="text-gray-600 text-sm">{org?.address}</p>
              <p className="text-sm">
                {org?.phone} {org?.email && `| ${org.email}`}
              </p>
            </div>
            {org?.logoRight && <img src={org.logoRight} className="w-20 h-20" />}
          </div>

          {/* INVOICE META */}
          <div className="text-right mt-4 text-sm">
            <div className="text-lg font-semibold">INVOICE</div>
            <div>{invoice_code}</div>
            <div>{fmtDate(created_at)}</div>
            <Chip tone={paymentTone}>{billing.payment_status}</Chip>
            <div className="text-xs mt-2">Printed by: {printedBy}</div>
          </div>

          {/* PATIENT SECTION */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border rounded p-3">
              <h3 className="font-semibold mb-2">Patient</h3>
              <Row left="Name" right={patient?.name} />
              <Row left="MRN" right={patient?.mrn} />
            </div>
            <div className="border rounded p-3">
              <h3 className="font-semibold mb-2">Request</h3>
              <Row left="Request ID" right={request_id} />
            </div>
          </div>

          {/* ITEMS */}
          <table className="w-full mt-6 border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Test</th>
                <th className="p-2 text-right">Price ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 text-right">{fmtMoney(it.price, "")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold bg-gray-50">
                <td className="p-2 text-right">TOTAL</td>
                <td className="p-2 text-right">{fmtMoney(billing.amount_due)}</td>
              </tr>
            </tfoot>
          </table>

          {/* QR + FOOTER */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <QRCodeSVG value={qrData} size={120} />
            <p className="text-xs text-gray-500">
              ELIMS © {new Date().getFullYear()} — Unauthorized alteration voids this document.
            </p>
          </div>

          {/* SIGNATURE */}
          <div className="mt-6 flex justify-end">
            <div className="border-t w-40 text-center text-xs pt-1">Signature</div>
          </div>
        </div>
      )}

      {/** ================= RECEIPT LAYOUT ================= **/}
      {printMode === "receipt" && (
        <div className="receipt-wrapper bg-white shadow rounded p-4 text-xs max-w-xs mx-auto">
          <div className="text-center">
            {org?.logoLeft && <img src={org.logoLeft} className="w-16 mx-auto" />}
            <strong className="block mt-1">{org?.name}</strong>
            <div>{org?.address}</div>
            <div>{org?.phone}</div>
            {org?.email && <div>{org.email}</div>}
          </div>

          <hr className="my-2" />

          <div>
            <strong>Invoice:</strong> {invoice_code}<br />
            <strong>Date:</strong> {fmtDate(created_at)}
            <div className="mt-1">
              <Chip tone={paymentTone}>{billing.payment_status}</Chip>
            </div>
          </div>

          <hr className="my-2" />

          <strong>Patient:</strong> {patient?.name} ({patient?.mrn})

          <hr className="my-2" />

          {items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.name}</span>
              <span>{fmtMoney(it.price, "")}</span>
            </div>
          ))}

          <hr className="my-2" />

          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{fmtMoney(billing.amount_due)}</span>
          </div>

          <div className="flex justify-center mt-3">
            <QRCodeSVG value={qrData} size={80} />
          </div>

          <div className="text-center text-[10px] mt-2 text-gray-500">
            Printed by: {printedBy}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="mt-6 flex justify-between no-print">
        <Link to={`/patients/${patient?.id}`} className="text-blue-600 text-sm underline">
          ← Back to Patient
        </Link>

        <div className="flex gap-3">
          {!isPaid && (
            <button
              onClick={handlePayment}
              disabled={processing}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded disabled:opacity-50"
            >
              {processing ? "Updating..." : "Mark as Paid"}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-800 text-white rounded text-sm"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
