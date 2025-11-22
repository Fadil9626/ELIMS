import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Beaker,
  Layers,
  PlusCircle,
  CheckCircle2,
  X,
  Send,
  ArrowLeft,
  Search,
  Filter,
  Tag,
  Zap,
  AlertTriangle,
  Save
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import testRequestService from "../../services/testRequestService"; 
import apiFetch from "../../services/apiFetch"; 

/* =============================================================
   🎨 Dept Chip Colors
============================================================= */
const deptColor = (name) => {
  const n = (name || "Unassigned").toLowerCase();
  if (n.includes("chem")) return "bg-blue-100 text-blue-800 border-blue-400";
  if (n.includes("hema")) return "bg-rose-100 text-rose-800 border-rose-400";
  if (n.includes("micro")) return "bg-emerald-100 text-emerald-800 border-emerald-400";
  if (n.includes("admin")) return "bg-slate-100 text-slate-800 border-slate-400";
  return "bg-indigo-100 text-indigo-800 border-indigo-400";
};

const RequestTestPage = () => {
  // --- Routing & Params ---
  const [searchParams] = useSearchParams();
  const { id: idFromPath } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 🧠 Detect Edit Mode
  // If URL contains "/edit", treat idFromPath as Request ID. Otherwise, it's Patient ID.
  const isEditMode = location.pathname.includes("/edit");
  
  const patientIdFromQuery = searchParams.get("patientId");
  const initialPriority = searchParams.get("priority") || "ROUTINE";

  // --- State ---
  const [patient, setPatient] = useState(null);
  const [requestId, setRequestId] = useState(isEditMode ? idFromPath : null);
  const [priority, setPriority] = useState(initialPriority);
  
  const [items, setItems] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  // --- Filters ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [typeFilter, setTypeFilter] = useState("all");

  // --- UI Status ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // --- Load Data ---
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // 1. Load Catalog & Config (Always needed)
        const [catalogRes, deptsRes, popularRes] = await Promise.all([
          // ✅ FIX: Updated endpoint to match backend route
          apiFetch("/api/lab-config/tests"), 
          apiFetch("/api/departments").catch(() => []),
          testRequestService.getPopularTests().catch(() => [])
        ]);

        // Process Catalog
        const rawCatalog = catalogRes?.data || catalogRes || [];
        const catalog = (Array.isArray(rawCatalog) ? rawCatalog : []).map((row) => ({
          ...row,
          id: Number(row?.id),
          name: (row?.name || row?.test_name || "(Unnamed)").toString(),
          department_name: (row?.department_name || row?.department || row?.dept || "Unassigned").toString(),
          is_panel: Boolean(row?.is_panel),
          type: row?.is_panel ? "panel" : "analyte",
          price: Number(row?.price) || 0,
        }));
        setItems(catalog);

        // Process Popular Items
        let pops = popularRes?.data || popularRes || [];
        if (!Array.isArray(pops) || pops.length === 0) pops = catalog.slice(0, 5);
        setPopularItems(pops.map(p => ({...p, id: Number(p.id)})));

        // Process Depts
        const apiDepts = deptsRes?.data || deptsRes || [];
        const derivedDepts = [...new Set(catalog.map((i) => i.department_name))].map((n, idx) => ({ id: idx + 1, name: n }));
        setDepartments(Array.isArray(apiDepts) && apiDepts.length > 0 ? [{ id: "All", name: "All" }, ...apiDepts] : [{ id: "All", name: "All" }, ...derivedDepts]);

        // 2. Handle Edit Mode vs Create Mode
        if (isEditMode) {
           // FETCH EXISTING REQUEST
           const requestData = await testRequestService.getTestRequestById(idFromPath);
           
           // Set Patient from Request
           setPatient({
             id: requestData.patient_id,
             first_name: requestData.first_name,
             last_name: requestData.last_name,
             mrn: requestData.lab_id || requestData.mrn || "N/A"
           });
           
           // Pre-select items
           if (requestData.items) {
             // We only select the tests that exist in our catalog to avoid errors
             const existingIds = requestData.items
               .map(i => i.test_id)
               .filter(id => catalog.some(c => c.id === id));
             
             setSelectedItems([...new Set(existingIds)]);
           }

           // Set Priority
           if (requestData.priority) setPriority(requestData.priority);

        } else {
           // CREATE MODE - Fetch Patient Only
           const targetPatientId = patientIdFromQuery || idFromPath;
           if (!targetPatientId) throw new Error("Patient ID missing");
           
           const patientRes = await apiFetch(`/api/patients/${targetPatientId}`);
           setPatient(patientRes?.data || patientRes);
        }

      } catch (err) {
        console.error(err);
        toast.error(err.message || "Failed to load data.");
        if(!isEditMode && !patientIdFromQuery && !idFromPath) navigate('/patients'); // fallback
      } finally {
        setLoading(false);
      }
    })();
  }, [idFromPath, isEditMode, patientIdFromQuery, navigate]);

  // --- Memos ---
  const filteredItems = useMemo(() => {
    const s = (searchTerm || "").toLowerCase();
    const currentDept = selectedDept || "All";
    return items.filter((i) => {
      const name = i.name.toLowerCase();
      const dept = i.department_name;
      const matchesSearch = s ? name.includes(s) : true;
      const matchesDept = currentDept === "All" ? true : dept === currentDept;
      const matchesType = typeFilter === "all" ? true : typeFilter === "panel" ? i.is_panel : !i.is_panel;
      return matchesSearch && matchesDept && matchesType;
    });
  }, [items, searchTerm, selectedDept, typeFilter]);

  const groupedByDept = useMemo(() => {
    const grouped = {};
    for (const item of filteredItems) {
      const dept = item.department_name;
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(item);
    }
    return grouped;
  }, [filteredItems]);

  const totalCost = useMemo(() => {
    return selectedItems.reduce((sum, id) => {
      const i = items.find((x) => x.id === id);
      return sum + (i ? i.price : 0);
    }, 0);
  }, [selectedItems, items]);

  const isUrgent = (priority || "").toUpperCase() === "URGENT";

  // --- Handlers ---
  const toggleSelect = (id) => {
    if (typeof id !== "number") return;
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePriority = () => {
      setPriority(prev => prev === "URGENT" ? "ROUTINE" : "URGENT");
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) return toast.error("Select at least one test.");
    try {
      setSubmitting(true);
      
      if (isEditMode) {
          // UPDATE EXISTING REQUEST
          await testRequestService.updateTestRequest(requestId, {
              testIds: selectedItems,
              priority: priority
          });
          toast.success("✅ Order Updated!");
      } else {
          // CREATE NEW REQUEST
          await testRequestService.createTestRequest({
              patientId: Number(patient.id),
              testIds: selectedItems,
              priority: priority,
          });
          toast.success("✅ Request created!");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate(`/patients/${patient.id}`);
    } catch (err) {
      toast.error("Failed: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render ---
  if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Beaker className="w-10 h-10 mb-4 text-indigo-500 animate-spin" />
        <p className="font-medium">Loading Test Catalog...</p>
      </div>
  );

  if (!patient) return <div className="text-center mt-20 text-red-500">Patient not found.</div>;
  
  const priorityColorClass = isUrgent ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      <Toaster position="top-right" />
      
      {/* Header Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
          <ArrowLeft size={18} /> <span className="font-medium">Back</span>
        </button>
        
        {/* Priority Toggle */}
        <button 
           onClick={togglePriority}
           className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 transition-all hover:shadow-md ${priorityColorClass}`}
        >
          {isUrgent && <AlertTriangle size={14} className="animate-pulse" />}
          {priority.toUpperCase()} PRIORITY
          <span className="opacity-50 text-[10px] ml-1">(Click to toggle)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Selection Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Patient Info Card */}
          <div className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${isUrgent ? 'border-red-500' : 'border-indigo-500'}`}>
              <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? `Edit Order #${requestId}` : "New Test Request"}
              </h1>
              <p className="text-gray-500 mt-1">
               Ordering for <span className="font-semibold text-gray-800">{patient.first_name} {patient.last_name}</span> 
               <span className="mx-2">•</span> 
               <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{patient.mrn || patient.lab_id}</span>
              </p>
          </div>

          {/* ⚡ QUICK ACCESS SECTION */}
          <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-3">
                <Zap size={16} className="text-yellow-500 fill-yellow-500" /> Frequent Tests
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularItems.map(item => {
                  const isSel = selectedItems.includes(Number(item.id));
                  return (
                    <button 
                      key={item.id}
                      onClick={() => toggleSelect(Number(item.id))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        isSel 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' 
                        : 'bg-white text-gray-700 border-indigo-200 hover:border-indigo-400 hover:shadow-sm'
                      }`}
                    >
                      {item.name}
                    </button>
                  )
                })}
              </div>
          </div>

          {/* SEARCH & FILTER TOOLBAR */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                   className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                   placeholder="Search tests, panels, or departments..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['all', 'analyte', 'panel'].map(type => (
                       <button
                         key={type}
                         onClick={() => setTypeFilter(type)}
                         className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                           typeFilter === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                         }`}
                       >
                         {type}
                       </button>
                    ))}
                 </div>

                 <select 
                   className="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 cursor-pointer focus:ring-0"
                   value={selectedDept}
                   onChange={e => setSelectedDept(e.target.value)}
                 >
                   <option value="All">All Departments</option>
                   {departments.filter(d => d.name !== 'All').map(d => (
                     <option key={d.id} value={d.name}>{d.name}</option>
                   ))}
                 </select>
              </div>
          </div>

          {/* CATALOG LIST */}
          <div className="space-y-6">
            {Object.keys(groupedByDept).length === 0 ? (
               <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
                 No tests match your filters.
               </div>
            ) : (
               Object.entries(groupedByDept).map(([dept, items]) => (
                 <div key={dept} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                       <h4 className="font-bold text-gray-700 text-sm">{dept}</h4>
                       <span className="text-xs text-gray-400">{items.length} items</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                       {items.map(item => {
                          const isSel = selectedItems.includes(item.id);
                          return (
                            <div 
                              key={item.id} 
                              onClick={() => toggleSelect(item.id)}
                              className={`p-3 flex justify-between items-center cursor-pointer transition-colors hover:bg-gray-50 ${isSel ? 'bg-blue-50/50' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.is_panel ? 'bg-purple-100 text-purple-600' : 'bg-teal-100 text-teal-600'}`}>
                                   {item.is_panel ? <Layers size={16} /> : <Beaker size={16} />}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${isSel ? 'text-blue-700' : 'text-gray-800'}`}>{item.name}</p>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.is_panel ? 'Panel' : 'Test'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <span className="text-sm font-bold text-gray-600">{item.price.toLocaleString()} Le</span>
                                 <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSel ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                     {isSel && <CheckCircle2 size={14} className="text-white" />}
                                 </div>
                              </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
               ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Summary & Action (Sticky) */}
        <div className="lg:col-span-4">
           <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 border-b pb-4 mb-4 flex justify-between items-center">
                Order Summary
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{selectedItems.length}</span>
              </h3>
              
              {/* Scrollable List */}
              <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 mb-6 custom-scrollbar">
                 {selectedItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                       <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                          <PlusCircle size={20} className="text-gray-300" />
                       </div>
                       Select tests to begin order.
                    </div>
                 ) : (
                    selectedItems.map(id => {
                       const i = items.find(x => x.id === id);
                       if (!i) return null;
                       return (
                         <div key={id} className="flex justify-between items-start text-sm group">
                            <div className="flex-1">
                               <p className="font-medium text-gray-700">{i.name}</p>
                               <p className="text-xs text-gray-400">{i.is_panel ? 'Panel' : 'Test'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="font-semibold text-gray-600">{i.price.toLocaleString()}</span>
                               <button onClick={(e) => {e.stopPropagation(); toggleSelect(id)}} className="text-gray-300 hover:text-red-500 transition">
                                  <X size={14} />
                               </button>
                            </div>
                         </div>
                       )
                    })
                 )}
              </div>

              {/* Totals & Submit */}
              <div className="border-t pt-4 space-y-4">
                 <div className="flex justify-between items-end">
                    <span className="text-gray-500 text-sm">Total Estimated</span>
                    <span className="text-2xl font-extrabold text-gray-900">{totalCost.toLocaleString()} <span className="text-sm font-medium text-gray-400">Le</span></span>
                 </div>

                 <button
                    onClick={handleSubmit}
                    disabled={submitting || selectedItems.length === 0}
                    className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2
                      ${isUrgent ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}
                      ${(submitting || selectedItems.length === 0) ? 'opacity-50 cursor-not-allowed shadow-none' : ''}
                    `}
                 >
                    {submitting ? (
                       <>Processing...</>
                    ) : (
                       <>{isEditMode ? 'Update Order' : 'Submit Request'} {isEditMode ? <Save size={18}/> : <Send size={18} />}</>
                    )}
                 </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default RequestTestPage;