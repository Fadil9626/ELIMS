// src/pages/tests/RequestTestPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";
import testRequestService from "../../services/testRequestService";
import patientService from "../../services/patientService";

/* =============================================================
    🔐 Token Helper (Unchanged)
============================================================= */
const getToken = () => {
    try {
        const raw = localStorage.getItem("userInfo");
        if (!raw) return "";
        const parsed = raw.startsWith("{") ? JSON.parse(raw) : { token: raw };
        return parsed?.token || parsed?.me?.token || "";
    } catch {
        return "";
    }
};

/* =============================================================
    🎨 Dept Chip Colors (Unchanged)
============================================================= */
const deptColor = (name) => {
    const n = (name || "Unassigned").toLowerCase();
    if (n.includes("chem")) return "bg-blue-100 text-blue-800 border-blue-400";
    if (n.includes("hema")) return "bg-rose-100 text-rose-800 border-rose-400";
    if (n.includes("micro")) return "bg-emerald-100 text-emerald-800 border-emerald-400";
    if (n.includes("admin")) return "bg-slate-100 text-slate-800 border-slate-400";
    return "bg-indigo-100 text-indigo-800 border-indigo-400";
};

/* =============================================================
    🧪 Unified Request Test Page (Analytes + Panels)
============================================================= */
const RequestTestPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = getToken();

    const [patient, setPatient] = useState(null);
    const [items, setItems] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);

    // filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDept, setSelectedDept] = useState("All");
    const [deptSearch, setDeptSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    // status
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ... (useEffect and Memoized calculations remain unchanged)
    useEffect(() => {
        (async () => {
          try {
            setLoading(true);
    
            const [patientRes, catalogRes, deptsRes] = await Promise.all([
              patientService.getPatientById(id, token),
              labConfigService.getAllCatalogTests(token),
              labConfigService.getDepartments(token).catch(() => []),
            ]);
    
            const p = patientRes?.data || patientRes || null;
            setPatient(p);
    
            const rawCatalog = catalogRes?.data || catalogRes || [];
            const catalog = (Array.isArray(rawCatalog) ? rawCatalog : []).map((row) => {
              const name = (row?.name || row?.test_name || "(Unnamed)").toString();
              const dept =
                (row?.department_name || row?.department || row?.dept || "Unassigned").toString();
              const isPanel = Boolean(row?.is_panel);
              return {
                ...row,
                id: Number(row?.id),
                name,
                department_name: dept,
                is_panel: isPanel,
                type: isPanel ? "panel" : "analyte",
                label: isPanel ? "Panel" : "Analyte",
                price: Number(row?.price) || 0,
              };
            });
    
            setItems(catalog);
    
            const apiDepts = deptsRes?.data || deptsRes || [];
            const derivedDepts = [
              ...new Set(catalog.map((i) => i?.department_name || "Unassigned")),
            ].map((n, idx) => ({ id: idx + 1, name: n }));
            const finalDepts =
              Array.isArray(apiDepts) && apiDepts.length > 0
                ? [{ id: "All", name: "All" }, ...apiDepts]
                : [{ id: "All", name: "All" }, ...derivedDepts];
    
            setDepartments(finalDepts);
          } catch (err) {
            console.error(err);
            toast.error("Failed to load data: " + (err?.message || "Unknown error"));
          } finally {
            setLoading(false);
          }
        })();
      }, [id, token]);
      
    // ... (Memoized calculations remain unchanged)
    
    const { totalPanels, totalAnalytes } = useMemo(() => {
        let panels = 0,
          analytes = 0;
        for (const i of items) {
          if (i?.is_panel) panels++;
          else analytes++;
        }
        return { totalPanels: panels, totalAnalytes: analytes };
      }, [items]);
    
      const deptCounts = useMemo(() => {
        const map = {};
        for (const i of items) {
          const d = i?.department_name || "Unassigned";
          map[d] = (map[d] || 0) + 1;
        }
        return map;
      }, [items]);
    
      const visibleDeptList = useMemo(() => {
        const q = (deptSearch || "").toLowerCase();
        const list = departments.map((d) => {
          const name = (d?.name ?? "").toString();
          return { ...d, name };
        });
        return list.filter((d) => d.name.toLowerCase().includes(q));
      }, [departments, deptSearch]);
    
      const filteredItems = useMemo(() => {
        const s = (searchTerm || "").toLowerCase();
        const currentDept = selectedDept || "All";
    
        return items.filter((i) => {
          const name = (i?.name || "").toLowerCase();
          const dept = (i?.department_name || i?.department || "Unassigned").toString();
    
          const matchesSearch = s ? name.includes(s) : true;
          const matchesDept = currentDept === "All" ? true : dept === currentDept;
          const matchesType =
            typeFilter === "all"
              ? true
              : typeFilter === "panel"
              ? i?.is_panel === true
              : i?.is_panel === false;
    
          return matchesSearch && matchesDept && matchesType;
        });
      }, [items, searchTerm, selectedDept, typeFilter]);
    
      const groupedByDept = useMemo(() => {
        const grouped = {};
        for (const item of filteredItems) {
          const dept = (item?.department_name || item?.department || "Unassigned").toString();
          if (!grouped[dept]) grouped[dept] = [];
          grouped[dept].push(item);
        }
        return grouped;
      }, [filteredItems]);
    
      const selectedCount = selectedItems.length;
    
      const totalCost = useMemo(() => {
        let sum = 0;
        for (const id of selectedItems) {
          const i = items.find((x) => x?.id === id);
          if (i) sum += Number(i?.price) || 0;
        }
        return sum;
      }, [selectedItems, items]);

    /* ===========================================================
      ⚙️ Handlers
    =========================================================== */
    const toggleSelect = (id) => {
        if (typeof id !== "number") return;
        setSelectedItems((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            toast.error("Please select at least one test or panel.");
            return;
        }
        try {
            setSubmitting(true);
            await testRequestService.createTestRequest( 
                { patientId: Number(id), testIds: selectedItems }, 
                token
            );
            toast.success("✅ Test request created successfully!");
            
            // 💡 FIX: Navigate with state to signal PatientDetailPage to refresh
            navigate(`/patients/${id}`, { state: { testSubmitted: true } }); 
        } catch (err) {
            toast.error("Failed to create test request: " + (err?.message || "Unknown error"));
        } finally {
            setSubmitting(false);
        }
    };


    /* ===========================================================
      🖼️ UI (Unchanged)
    =========================================================== */
    if (loading)
        return (
            <div className="text-center mt-20 text-gray-500 text-lg animate-pulse">
                <Beaker className="inline-block animate-spin mr-2" size={24} /> Loading Test Catalog...
            </div>
        );

    if (!patient)
        return <div className="text-center text-red-500">Patient not found.</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-5 text-sm transition font-medium"
            >
                <ArrowLeft size={16} /> Back to Patient Profile
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ================= LEFT SIDE: CATALOG & FILTERS ================= */}
                <div className="lg:col-span-2 space-y-4">
                    
                    {/* Header Card (Consolidated) */}
                    <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-blue-600">
                        <h2 className="text-xl font-bold text-gray-800">
                            Request Tests for {patient?.first_name} {patient?.last_name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Patient ID: **{patient?.mrn || patient?.lab_id || id}**
                        </p>
                    </div>

                    {/* 🔍 Unified Filter Bar (Cleaner Layout) */}
                    <div className="bg-white p-4 rounded-xl shadow-md border space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search by name */}
                            <div className="relative flex-1 min-w-[280px]">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search analytes, panels, or departments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            {/* Type filter toggles */}
                            <div className="flex items-center gap-2">
                                {[{ key: 'all', label: 'All', count: items.length, icon: Filter },
                                   { key: 'analyte', label: 'Analytes', count: totalAnalytes, icon: Beaker },
                                   { key: 'panel', label: 'Panels', count: totalPanels, icon: Layers }]
                                .map(({ key, label, count, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setTypeFilter(key)}
                                        className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition ${
                                            typeFilter === key
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                                        }`}
                                    >
                                        <Icon size={16} />
                                        {label}
                                        <span className={`text-xs rounded-full px-2 py-0.5 ${typeFilter === key ? 'bg-white/30 border border-white/50' : 'bg-gray-100 text-gray-600 border'}`}>
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Department Chip Filters (Simplified display) */}
                        <div className="border-t pt-3 flex flex-wrap gap-2 items-center">
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:block">Department:</span>
                            
                            {/* Department Quick Search Input (if needed, simplified) */}
                            {departments.length > 5 && (
                                <div className="relative max-w-[200px]">
                                    <input
                                        type="text"
                                        placeholder="Find dept..."
                                        value={deptSearch}
                                        onChange={(e) => setDeptSearch(e.target.value)}
                                        className="pl-3 pr-3 py-1.5 border rounded-lg text-xs"
                                    />
                                </div>
                            )}

                            {/* Department Chips */}
                            {visibleDeptList
                                .filter((d) => d?.name)
                                .map((d) => {
                                    const name = (d?.name || "").toString();
                                    const count = deptCounts[name] || 0;
                                    const base = deptColor(name);
                                    
                                    // Use a simpler conditional style for 'All'
                                    const isActive = selectedDept === name;
                                    const activeClasses = isActive ? 'ring-2 ring-offset-1 ring-current font-bold' : 'hover:opacity-90';

                                    // Skip department chips if count is zero (cleaner list)
                                    if (name !== 'All' && count === 0) return null;

                                    return (
                                        <button
                                            key={`${name}-${d.id}`}
                                            onClick={() => setSelectedDept(name)}
                                            className={`px-3 py-1.5 rounded-full border text-xs transition ${base} ${activeClasses}`}
                                        >
                                            {name}
                                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full border border-current/30`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>

                    {/* 🧪 Unified List Container */}
                    <div className="bg-white rounded-xl shadow-lg border">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                            <div className="text-sm text-gray-700 font-semibold">
                                Showing {filteredItems.length} matching item(s)
                            </div>
                            <div className="text-sm text-gray-500">
                                Total Catalog: {items.length}
                            </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
                            {Object.keys(groupedByDept).length === 0 ? (
                                <div className="text-center text-gray-500 italic py-10">
                                    No items match your selected filters.
                                </div>
                            ) : (
                                Object.entries(groupedByDept).map(([dept, list]) => (
                                    <div key={dept} className="p-4 bg-white">
                                        <h3 className="font-bold text-lg text-gray-800 sticky top-0 bg-white/90 z-10 py-1 mb-2 border-b">
                                            {dept} <span className="text-sm text-gray-500 font-normal">({list.length})</span>
                                        </h3>
                                        <ul className="space-y-1">
                                            {list.map((item) => {
                                                const isSelected = selectedItems.includes(item.id);
                                                const icon = item.is_panel ? (
                                                    <Layers className="text-purple-600" size={16} />
                                                ) : (
                                                    <Beaker className="text-teal-600" size={16} />
                                                );
                                                const badgeClasses = item.is_panel
                                                    ? "bg-purple-100 text-purple-700"
                                                    : "bg-teal-100 text-teal-700";

                                                return (
                                                    <li
                                                        key={item.id}
                                                        onClick={() => toggleSelect(item.id)}
                                                        className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition border border-gray-200 ${
                                                            isSelected
                                                                ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/50"
                                                                : "bg-white hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-full ${isSelected ? 'bg-blue-200' : 'bg-gray-100'}`}>
                                                                {icon}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-900 block">
                                                                    {item.name}
                                                                </span>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                                    <span
                                                                        className={`${badgeClasses} px-2 py-0.5 rounded-full`}
                                                                    >
                                                                        {item.is_panel ? "Panel" : "Analyte"}
                                                                    </span>
                                                                    <span className="text-gray-500 italic">{item.department_name}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center text-sm font-bold text-green-700">
                                                                <Tag size={14} className="mr-1 text-green-500" />
                                                                {(Number(item.price) || 0).toLocaleString()} Le
                                                            </div>
                                                            
                                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition duration-200 ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 border-gray-300'}`}>
                                                                {isSelected ? (
                                                                    <CheckCircle2 className="text-white" size={18} />
                                                                ) : (
                                                                    <PlusCircle className="text-gray-500" size={18} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ================= RIGHT SIDE: SUMMARY & SUBMISSION ================= */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-6 rounded-xl shadow-lg border sticky top-4">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center justify-between border-b pb-2">
                            Order Summary
                            <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-300">
                                {selectedCount} Selected
                            </span>
                        </h3>

                        <ul className="space-y-2 max-h-48 overflow-y-auto text-sm pr-1">
                            {selectedCount === 0 ? (
                                <li className="text-gray-500 italic py-4 text-center">
                                    Click items on the left to add them to the order.
                                </li>
                            ) : (
                                selectedItems.map((sid) => {
                                    const item = items.find((x) => x?.id === sid);
                                    if (!item) return null;
                                    return (
                                        <li
                                            key={sid}
                                            className="flex justify-between items-center py-1.5 border-b border-dashed last:border-b-0"
                                        >
                                            <span className="truncate flex-1 font-medium text-gray-700">
                                                <span className={`mr-2 w-2 h-2 inline-block rounded-full ${item.is_panel ? 'bg-purple-400' : 'bg-teal-400'}`}></span>
                                                {item.name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                                    {(Number(item.price) || 0).toLocaleString()} Le
                                                </span>
                                                <button
                                                    onClick={() => toggleSelect(sid)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition"
                                                    title="Remove"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })
                            )}
                        </ul>

                        {/* Totals Section */}
                        <div className="mt-6 pt-4 border-t">
                            <div className="space-y-1 text-sm text-gray-700 mb-3">
                                <div className="flex justify-between">
                                    <span>Analytes Only</span>
                                    <span className="font-medium">
                                        {selectedItems.filter((sid) => {
                                            const i = items.find((x) => x?.id === sid);
                                            return i && !i.is_panel;
                                        }).length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Panels Only</span>
                                    <span className="font-medium">
                                        {selectedItems.filter((sid) => {
                                            const i = items.find((x) => x?.id === sid);
                                            return i && i.is_panel;
                                        }).length}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-center">
                                <p className="text-sm text-green-700 font-medium">💰 Estimated Total</p>
                                <p className="text-3xl font-extrabold text-green-900 mt-1">
                                    {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} Le
                                </p>
                            </div>
                        </div>

                        {/* Submission Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || selectedItems.length === 0}
                            className="w-full mt-5 bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150 shadow-lg shadow-blue-200/50"
                        >
                            {submitting ? "Submitting Request..." : "Submit Test Request"} 
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestTestPage;