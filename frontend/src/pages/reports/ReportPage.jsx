import React, { useState, useEffect, useContext, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import reportService from "../../services/reportService";
import userService from "../../services/userService";
import { SettingsContext } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";

/* ------------------------------- helpers ------------------------------- */
const fmt = (v, d = 2) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? ""
    : Number(v).toFixed(d);

const FlagCell = ({ flag }) => {
  if (!flag) return <span />;
  const cls =
    flag === "H"
      ? "text-red-600 font-semibold"
      : flag === "L"
      ? "text-orange-600 font-semibold"
      : "text-gray-700";
  return <span className={cls}>{flag}</span>;
};

// Fallback: map legacy result_data -> rows (Only used if analytes array is empty)
const fallbackRowsFromResultData = (result_data = {}) => {
  try {
    const obj =
      typeof result_data === "string" ? JSON.parse(result_data) : result_data;
    return Object.keys(obj).map((k) => {
      const e = obj[k] || {};
      return {
        analyte_id: Number(k),
        analyte_name: e.analyte_name || `#${k}`,
        value: e.value ?? "",
        unit: e.unit ?? "",
        ref_low: e.ref_low ?? null,
        ref_high: e.ref_high ?? null,
        flag: e.flag ?? "",
        note: e.note ?? "",
        decimals: e.decimals ?? 2,
      };
    });
  } catch {
    return [];
  }
};

const calculateAge = (dob) => {
  if (!dob) return "N/A";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

/* ---------------------------------------------------------------------- */

const TestReportPage = () => {
  const { id: testRequestId } = useParams();
  const navigate = useNavigate();
  const { settings } = useContext(SettingsContext);
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const [pro, setPro] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const loadAll = async () => {
      try {
        setLoading(true);

        const [rep, prof] = await Promise.allSettled([
          reportService.getReportByRequestId(testRequestId, token),
          userService.getProfessionalProfile(token),
        ]);

        if (rep.status === "fulfilled") {
          setReportData(rep.value);
        } else {
          // 💡 FIX: Access reason safely
          throw new Error(rep.reason?.message || "Failed to load report");
        }

        if (prof.status === "fulfilled") {
          setPro(prof.value);
        } else {
          setPro(null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [testRequestId, token]);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-6">Generating Report...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!reportData) return <div className="p-6">Report data not found.</div>;

  // 1. Initialize clinical note with main report note (if it exists)
  let clinicalNote = reportData.clinical_note || '';
  let analyteNotes = '';
  
  // 2. Extract and compile notes from all analytes
  if (Array.isArray(reportData.items)) {
    reportData.items.forEach(item => {
      const rows = Array.isArray(item.analytes) && item.analytes.length > 0
        ? item.analytes
        : fallbackRowsFromResultData(item.result_data);
      
      rows.forEach(a => {
        if (a.note && String(a.note).trim() !== '') {
          // Format the note to include the analyte name
          analyteNotes += `\n${a.analyte_name || item.test_name}: ${a.note}`;
        }
      });
    });
  }

  // 3. Combine notes
  if (analyteNotes) {
    // Add separator if a main clinical note already exists
    if (clinicalNote) {
      clinicalNote += '\n\n--- Individual Item Notes ---';
    }
    clinicalNote += analyteNotes;
  }
  
  return (
    <>
      {/* --- COMPACT PRINT STYLES --- */}
      <style>{`
        @media print {
          body { background-color: #fff; font-size: 11px; }
          #report-content { padding: 0 !important; margin: 0 auto !important; }
          #root > div > main > header, #root > div > aside, .no-print { display: none !important; }
          @page { size: A4; margin: 10mm 8mm; }

          .panel-card { page-break-inside: avoid !important; break-inside: avoid-page !important; margin-bottom: 5mm !important; }
          .min-w-full th, .min-w-full td { padding: 4px 8px !important; }
          .space-y-1 p { margin-bottom: 2px !important; line-height: 1.2 !important; }
          
          /* 💡 NEW: Ensure signature fields align in print */
          .signature-grid > div {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .signature-line { width: 90%; border-top: 1px solid #000; padding-top: 2px; text-align: center; }
        }
      `}</style>

      <div className="p-6 bg-gray-100 font-sans">
        {/* Top controls */}
        {/* ✅ **FIX**: Removed duplicate 'className' attribute */}
        <div className="flex justify-end items-center mb-6 no-print">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            <Printer className="w-5 h-5" />
            Print Report
          </button>
        </div>

        {/* Report body */}
        <div
          id="report-content"
          className="p-8 bg-white max-w-4xl mx-auto shadow-lg"
        >
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b-2 border-gray-800 mb-4">
            
            {/* ✅ PERFORMANCE: Removed cache-busting query string */}
            {settings.lab_logo_light ? (
              <img
                src={`${API_BASE_URL}${settings.lab_logo_light}`}
                alt="Primary Logo"
                className="h-20 max-w-[180px] object-contain"
              />
            ) : (
              <div className="h-20 w-24" />
            )}
            
            <div className="text-center mx-4">
              <p className="font-bold text-2xl uppercase">
                {settings.lab_name || "Your Lab Name"}
              </p>
              <p className="text-sm">
                {settings.lab_address || "123 Lab Street, Freetown"}
              </p>
              <p className="text-sm">
                Contact: {settings.lab_phone || "+232 76 000 000"} |{" "}
                {settings.lab_email || "contact@lab.com"}
              </p>
            </div>

            {/* ✅ PERFORMANCE: Removed cache-busting query string */}
            {settings.lab_logo_dark ? (
              <img
                src={`${API_BASE_URL}${settings.lab_logo_dark}`}
                alt="Secondary Logo"
                className="h-20 max-w-[180px] object-contain"
              />
            ) : (
              <div className="h-20 w-24" />
            )}
          </header>

          {/* Patient info */}
          <section className="grid grid-cols-2 gap-x-8 text-sm mb-4 border-b pb-4">
            <div className="space-y-1">
              <p>
                <strong>PATIENT'S NAME:</strong>{" "}
                {reportData.patient_full_name || "N/A"}
              </p>
              <p>
                <strong>AGE:</strong> {calculateAge(reportData.date_of_birth)}
              </p>
              <p>
                <strong>SEX:</strong> {reportData.gender || "N/A"}
              </p>
              <p>
                <strong>PHONE:</strong> {reportData.phone || "N/A"}
              </p>
              <p>
                <strong>ADDRESS:</strong> {reportData.address || "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <strong>LAB ID:</strong> {reportData.patient_lab_id}
              </p>
              <p>
                <strong>DATE REQUESTED:</strong>{" "}
                {reportData.report_date
                  ? new Date(reportData.report_date).toLocaleDateString()
                  : "—"}
              </p>
              <p>
                <strong>STATUS:</strong> {reportData.report_status || "Completed"}
              </p>
              <p>
                <strong>DATE PRINTED:</strong> {new Date().toLocaleString()}
              </p>
            </div>
          </section>

          {/* Title */}
          <h2 className="text-center font-bold text-xl mb-2 underline">
            LABORATORY REPORT
          </h2>

          {/* Results Table (Combined into a single section) */}
          <section>
            {Array.isArray(reportData.items) && reportData.items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse min-w-full">
                  
                  {/* Global Table Header (Global Analyte Header) */}
                  <thead>
                    <tr className="bg-gray-100">
                      {/* 💡 FIX: Adjusted widths and order */}
                      <th className="text-left px-4 py-2 border-b w-[35%]">
                        Analyte / Test
                      </th>
                      <th className="text-left px-4 py-2 border-b w-[15%]">
                        Result
                      </th>
                      <th className="text-left px-4 py-2 border-b w-[10%]">
                        Unit
                      </th>
                      <th className="text-left px-4 py-2 border-b w-[10%]">
                        Flag
                      </th>
                      <th className="text-left px-4 py-2 border-b w-[30%]">
                        Reference Range
                      </th>
                      {/* Note column remains removed */}
                    </tr>
                  </thead>
                  
                  <tbody>
                    {reportData.items.map((item, idx) => {
                      
                      const rows = Array.isArray(item.analytes) && item.analytes.length > 0
                        ? item.analytes
                        : fallbackRowsFromResultData(item.result_data);

                      if (!rows || rows.length === 0) return null;

                      return (
                        <Fragment key={`${item.test_name}-${idx}`}>
                          {/* Test/Panel Row */}
                          <tr className="bg-gray-50 font-semibold border-b border-gray-300">
                            <td colSpan={5} className="px-4 py-2"> {/* Colspan is 5 now */}
                              {item.test_name} 
                            </td>
                          </tr>

                          {/* Analytes Rows */}
                          {rows.map((a) => {
                            let refDisplay = a.ref_range || "N/A";
                            if (!a.ref_range) {
                              const hasLow = a.ref_low != null && a.ref_low !== "";
                              const hasHigh = a.ref_high != null && a.ref_high !== "";
                              if (hasLow && hasHigh)
                                refDisplay = `${a.ref_low} – ${a.ref_high}`;
                              else if (hasLow) refDisplay = `> ${a.ref_low}`;
                              else if (hasHigh) refDisplay = `< ${a.ref_high}`;
                            }

                            const unit = a.unit || a.unit_symbol || a.unit_name || item.unit || "";

                            return (
                              <tr
                                key={a.analyte_id || a.analyte_name}
                                className="odd:bg-white even:bg-gray-50"
                              >
                                <td className="px-4 py-2 border-b">
                                  {/* Analyte Name is slightly indented */}
                                  <span className="pl-4">{String(a.analyte_name || `#${a.analyte_id}`)}</span>
                                </td>
                                <td className="px-4 py-2 border-b">
                                  {typeof a.value === "number"
                                    ? fmt(a.value, a.decimals ?? 2)
                                    : a.value ?? ""}
                                </td>
                                <td className="px-4 py-2 border-b">{unit}</td>
                                <td className="px-4 py-2 border-b">
                                  <FlagCell flag={a.flag} /> {/* Flag moved here */}
                                </td>
                                <td className="px-4 py-2 border-b">
                                  {refDisplay} {/* Reference Range moved here */}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 italic">
                No test results available.
              </div>
            )}
          </section>

          {/* Footer / Signatures */}
          <footer className="text-xs text-gray-600 mt-16 pt-4 border-t">
            
            {/* Clinical Notes Section (If data exists) */}
            {clinicalNote && (
              <div className="mb-6">
                <h4 className="font-bold text-sm text-gray-800 mb-1 underline">
                  Clinical Notes / Interpretation
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {clinicalNote}
                </p>
              </div>
            )}

            {/* Signature Grid */}
            <div className="grid grid-cols-3 gap-8 mb-6 signature-grid">
              
              {/* Analyst */}
              <div className="flex flex-col items-center">
                <div className="h-16" />
                <p className="signature-line w-full pt-1 text-center">
                  Analyst
                </p>
              </div>
              
              {/* Reviewed By */}
              <div className="flex flex-col items-center">
                 {/* Display Reviewed By Name if available from the backend */}
                <p className="h-16 flex items-end font-semibold text-gray-800">
                  {reportData.last_reviewed_by || ''}
                </p>
                <p className="signature-line w-full pt-1 text-center">
                  Reviewed By
                </p>
              </div>
              
              {/* Pathologist / Approving Officer */}
              <div className="flex flex-col items-center">
                {/* Professional signature if available & allowed */}
                {/* ✅ PERFORMANCE: Removed cache-busting query string */}
                {pro?.show_on_reports && pro?.signature_image_url ? (
                  <img
                    src={`${API_BASE_URL}${pro.signature_image_url}`}
                    alt="Signature"
                    className="h-16 object-contain"
                  />
                ) : (
                  <div className="h-16" />
                )}
                <p className="mt-1 font-medium text-center">
                  {pro?.title ? `${pro.title}` : "Pathologist"}
                  {pro?.credentials ? `, ${pro.credentials}` : ""}
                </p>
                {pro?.license_number && (
                  <p className="text-[11px] text-gray-500">
                    Lic#: {pro.license_number}
                    {pro?.license_state ? ` (${pro.license_state})` : ""}
                    {pro?.license_expiry
                      ? ` • Expires: ${new Date(
                          pro.license_expiry
                        ).toLocaleDateString()}`
                      : ""}
                  </p>
                )}
                <p className="mt-2 signature-line w-full pt-1 text-center">
                  Pathologist
                </p>
              </div>
            </div>

            {/* Verification/Review Stamp (Kept the single stamp) */}
            <div className="text-center mt-4 italic">
              {reportData.last_verified_by && (
                <p>
                  <strong>Verified by:</strong>{" "}
                  {reportData.last_verified_by || "—"}
                  {reportData.last_verified_at && 
                    ` on ${new Date(reportData.last_verified_at).toLocaleString()}`
                  }
                </p>
              )}
            </div>

            <p className="text-center mt-6 text-gray-500">— End of Report —</p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default TestReportPage;