import React, { useState, useEffect, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, RefreshCw, AlertCircle } from "lucide-react";
import Barcode from "react-barcode"; 

// ==================================================================
// 🔧 INTERNAL UTILITIES
// ==================================================================

// Adjust if your API runs on a different port in dev/prod
const API_BASE = "http://localhost:5000";

const apiFetch = async (url, options = {}) => {
  let token = "";
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (raw) token = JSON.parse(raw)?.token || "";
  } catch (e) {}

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  const res = await fetch(fullUrl, { ...options, headers });
  const text = await res.text();

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  try { return text ? JSON.parse(text) : {}; } catch { return text; }
};

const reportService = {
  getReportByRequestId: async (requestId) => {
    return apiFetch(`/api/reports/request/${requestId}`);
  },
  getLabSettings: async () => {
    return apiFetch(`/api/settings/lab-profile`);
  }
};

const useAuthInternal = () => {
    const [user, setUser] = useState(null);
    useEffect(() => {
      try {
        const raw = localStorage.getItem("elims_auth_v1");
        if (raw) setUser(JSON.parse(raw).user);
      } catch(e) {}
    }, []);
    return { user };
};

// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

const calculateAge = (dob) => {
  if (!dob) return "N/A";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age + " yrs";
};

const FlagCell = ({ flag }) => {
  if (!flag) return <span />;
  const cls =
    flag === "H" ? "text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs border border-red-100" : 
    flag === "L" ? "text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100" : 
    flag === "A" ? "text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs border border-orange-100" :
    "text-gray-700";
  return <span className={cls}>{flag}</span>;
};

// ==================================================================
// COMPONENT
// ==================================================================

const TestReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [settings, setSettings] = useState(null); 
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
        if(!id) return;
        setLoading(true);
        try {
            const [rpt, cfg] = await Promise.all([
                reportService.getReportByRequestId(id),
                reportService.getLabSettings()
            ]);
            setReportData(rpt);
            setSettings(cfg);
        } catch(e) {
            console.error(e);
            setError("Failed to load report data.");
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [id]);

  const handlePrint = () => window.print();

  const getImgUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      return `${API_BASE}${path}`; 
  };

  // Loading & Error States
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><RefreshCw className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (error || !reportData) return <div className="p-8 text-center text-red-500 flex flex-col items-center justify-center h-screen"><AlertCircle size={48} className="mb-2"/>{error || "Report not found"}</div>;

  // Lab Settings
  const labName = settings?.lab_name || "Medical Laboratory";
  const labAddress = settings?.lab_address || "";
  const labPhone = settings?.lab_phone || "";
  const labEmail = settings?.lab_email || "";
  const leftLogo = settings?.logo_light || settings?.lab_logo_light;
  const rightLogo = settings?.logo_dark || settings?.lab_logo_dark;
  const barcodeValue = `${reportData.patient_lab_id}`;

  // Safety check for new backend structure
  const reportSections = reportData.sections || [];

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans print:p-0 print:bg-white">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body * { visibility: hidden; }
          #report-container, #report-container * { visibility: visible; }
          #report-container {
            position: absolute;
            left: 0; top: 0; width: 100%; margin: 0; padding: 0;
            box-shadow: none; border: none;
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} /> Back
        </button>
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
                Status: <span className={`font-bold ${reportData.report_status === 'Released' ? 'text-green-600' : 'text-amber-600'}`}>{reportData.report_status}</span>
            </span>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium">
                <Printer size={20} /> Print Report
            </button>
        </div>
      </div>

      {/* Report Paper */}
      <div id="report-container" className="max-w-[210mm] mx-auto bg-white shadow-lg min-h-[297mm] p-10 relative flex flex-col">
          
          {/* 1. Header */}
          <header className="border-b-4 border-blue-900 pb-6 mb-6 flex justify-between items-center">
              <div className="w-28 h-24 flex items-center justify-start">
                 {leftLogo && (
                    <img 
                        src={getImgUrl(leftLogo)} 
                        alt="Lab Logo" 
                        className="max-h-full max-w-full object-contain" 
                        onError={(e) => e.target.style.display='none'}
                    />
                 )}
              </div>

              <div className="text-center flex-1 px-4">
                  <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tight mb-1">{labName}</h1>
                  <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">{labAddress}</p>
                  <div className="flex justify-center gap-3 text-sm text-gray-500 mt-2">
                      {labPhone && <span>📞 {labPhone}</span>}
                      {labEmail && <span>| ✉️ {labEmail}</span>}
                  </div>
              </div>

               <div className="w-28 h-24 flex items-center justify-end">
                 {rightLogo && (
                    <img 
                        src={getImgUrl(rightLogo)} 
                        alt="Accreditation" 
                        className="max-h-full max-w-full object-contain" 
                        onError={(e) => e.target.style.display='none'}
                    />
                 )}
              </div>
          </header>

          {/* 2. Patient Info + Barcode */}
          <section className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm shadow-sm print:shadow-none print:border-gray-300 flex items-center justify-between">
              <div className="grid grid-cols-2 gap-y-2 gap-x-8 flex-grow max-w-[75%]">
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-bold text-gray-600 w-24">Patient:</span>
                      <span className="text-gray-900 font-bold uppercase">{reportData.patient_full_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-bold text-gray-600">Lab ID:</span>
                      <span className="font-mono text-gray-900 font-bold">{reportData.patient_lab_id}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-bold text-gray-600 w-24">Age/Sex:</span>
                      <span className="text-gray-900">{calculateAge(reportData.date_of_birth)} / {reportData.gender}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-bold text-gray-600">Date:</span>
                      <span className="text-gray-900">{new Date(reportData.report_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-bold text-gray-600 w-24">Ref. Doctor:</span>
                      <span className="text-gray-900">{reportData.referring_doctor || "Self-Referral"}</span>
                  </div>
              </div>

              <div className="flex flex-col items-center justify-center border-l pl-4 ml-4 opacity-80">
                  <Barcode 
                    value={barcodeValue} 
                    width={1}       
                    height={30}    
                    fontSize={10}   
                    margin={0}      
                    displayValue={true}
                  />
              </div>
          </section>

          {/* 3. Report Sections (The Fix!) */}
          <div className="flex-grow">
            {reportSections.length === 0 && (
                <div className="text-center py-10 text-gray-400 italic">No verified results available.</div>
            )}

            {reportSections.map((section, sIdx) => (
                <section key={sIdx} className="mb-10 page-break-inside-avoid">
                    {/* Section Header */}
                    <div className="text-center mb-4">
                         <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest border-b-2 border-t-2 py-1 border-gray-200 inline-block px-8 bg-gray-50 print:bg-transparent">
                             {section.report_header}
                         </h2>
                    </div>

                    {/* Results Table */}
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-800 text-left">
                                <th className="py-2 pl-2 w-[40%] font-bold text-gray-800 uppercase text-xs tracking-wider">Test Name</th>
                                <th className="py-2 w-[12%] font-bold text-gray-800 uppercase text-xs tracking-wider">Result</th>
                                <th className="py-2 w-[8%] text-left font-bold text-gray-800 uppercase text-xs tracking-wider pl-0">Flag</th>
                                <th className="py-2 w-[15%] font-bold text-gray-800 uppercase text-xs tracking-wider">Unit</th>
                                <th className="py-2 pr-2 w-[25%] text-right font-bold text-gray-800 uppercase text-xs tracking-wider">Ref. Range</th>
                            </tr>
                        </thead>
                        <tbody>
                            {section.items.map((item, iIdx) => (
                                <Fragment key={iIdx}>
                                    {/* Panel Header Row */}
                                    {item.is_panel && (
                                        <tr className="bg-gray-100 border-b border-gray-200 print:bg-gray-50/50">
                                            <td colSpan={5} className="py-1.5 px-2 font-bold text-gray-900 text-xs uppercase tracking-wide pl-4">
                                                {item.test_name}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Analytes Row */}
                                    {item.analytes.map((a, aIdx) => (
                                        <tr key={aIdx} className="border-b border-gray-100 print:border-gray-200 hover:bg-gray-50 transition-colors print:hover:bg-transparent">
                                            <td className={`py-2 ${item.is_panel ? "pl-8" : "px-2"} font-medium text-gray-700`}>
                                                {!item.is_panel ? item.test_name : a.analyte_name}
                                            </td>
                                            
                                            <td className="py-2 font-bold text-gray-900 text-xs">
                                                {a.value || "—"}
                                            </td>
                                            
                                            <td className="py-2 text-left pl-0">
                                                <FlagCell flag={a.flag} />
                                            </td>

                                            <td className="py-2 text-gray-600 text-xs font-medium">
                                                {/* Use the symbol if available, fallback to empty */}
                                                {a.unit_symbol || a.unit || "—"}
                                            </td>
                                            
                                            <td className="py-2 pr-2 text-right text-gray-700 text-xs font-medium whitespace-pre-wrap">
                                                {a.ref_range || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </section>
            ))}

            {/* Clinical Notes */}
            {reportData.clinical_note && (
                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded print:bg-white print:border-gray-300 page-break-inside-avoid">
                    <h4 className="text-xs font-bold text-blue-800 uppercase mb-1 print:text-gray-800">Clinical Notes / Comments:</h4>
                    <p className="text-sm text-gray-800">{reportData.clinical_note}</p>
                </div>
            )}
          </div>

          {/* 4. Footer */}
          <footer className="mt-auto pt-10 page-break-inside-avoid">
              <div className="grid grid-cols-2 gap-16">
                  <div className="text-center">
                      <div className="h-16 mb-2"></div> 
                      <div className="border-t border-gray-400 pt-2">
                          <p className="font-bold text-sm text-gray-800">Laboratory Scientist</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Performed by</p>
                      </div>
                  </div>
                  <div className="text-center">
                      <div className="h-16 flex items-end justify-center pb-2">
                          {reportData.last_verified_by && (
                             <span className="font-serif text-lg text-blue-900 italic" style={{ fontFamily: '"Brush Script MT", cursive' }}>
                                {reportData.last_verified_by}
                             </span>
                          )}
                      </div>
                      <div className="border-t border-gray-400 pt-2">
                          <p className="font-bold text-sm text-gray-800">Pathologist / Senior Scientist</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Verified & Released</p>
                      </div>
                  </div>
              </div>
              <div className="mt-6 text-center text-[9px] text-gray-400 border-t border-gray-100 pt-2 flex justify-between">
                  <span>Generated on {new Date().toLocaleString()}</span>
                  <span>{labName} • Lab Management System</span>
                  <span>Page 1 of 1</span>
              </div>
          </footer>
      </div>
    </div>
  );
};

export default TestReportPage;