import React, { useState, useEffect, useMemo, FormEvent, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Activity,
  PlusCircle,
  Trash2,
  Pencil,
  Save,
  XCircle,
  Search,
  Filter,
  Package,
  Loader2,
  Building2,
  Calculator,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../../services/apiFetch";

// ============================================================
// 🧩 PanelsTab Component
// ============================================================
const PanelsTab = () => {
  const navigate = useNavigate();

  const [panels, setPanels] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<any | null>(null);
  
  // Form State
  const [form, setForm] = useState<{ 
    name: string; 
    description: string; 
    department_id: number | null;
    price: number;
    price_is_dynamic: boolean;
    analyte_ids: number[]; // Used only for creation
  }>({ 
    name: "", 
    description: "", 
    department_id: null, 
    price: 0, 
    price_is_dynamic: false, 
    analyte_ids: [] 
  });

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [allAnalytes, setAllAnalytes] = useState<any[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<any | null>(null);
  const [panelAnalytes, setPanelAnalytes] = useState<any[]>([]);

  // --- Loading States ---
  const [dataLoading, setDataLoading] = useState(true);
  const [analytesLoading, setAnalytesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================
  // 📦 Load Data
  // ============================================================
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [panelsRes, analytesRes, deptRes] = await Promise.all([
        apiFetch("/api/lab-config/panels"),
        apiFetch("/api/lab-config/tests"),
        apiFetch("/api/departments"),
      ]);

      const panelData = Array.isArray(panelsRes) ? panelsRes : panelsRes?.data || [];
      const analyteData = Array.isArray(analytesRes) ? analytesRes : analytesRes?.data || [];
      const deptData = Array.isArray(deptRes) ? deptRes : deptRes?.data || [];

      setPanels(panelData);
      setAllAnalytes(analyteData);
      setDepartments(deptData);
      
    } catch (err: any) {
      toast.error(`❌ Failed to load data: ${err.message}`);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // 🧱 CRUD: Panels
  // ============================================================
  const openAdd = () => {
    setEditingPanel(null);
    setForm({ 
      name: "", 
      description: "", 
      department_id: null, 
      price: 0, 
      price_is_dynamic: false, 
      analyte_ids: [] 
    });
    setShowModal(true);
  };

  const openEdit = (panel: any) => {
    setEditingPanel(panel);
    setForm({
      name: panel.name,
      description: panel.description || "",
      department_id: panel.department_id || null,
      price: Number(panel.price),
      price_is_dynamic: panel.price_is_dynamic,
      analyte_ids: [] // We don't load IDs here; editing links is done in the side panel
    });
    
    // Ensure we have the panel's analytes loaded so the calculation works
    if (selectedPanel?.id !== panel.id) {
        handlePanelSelect(panel);
    }
    
    setShowModal(true);
  };

  // Price Calculation for Display
  const calculatedTotal = useMemo(() => {
    if (editingPanel) {
      // Edit Mode: Calculate sum of EXISTING panel analytes
      return panelAnalytes.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    } else {
      // Create Mode: Calculate sum of SELECTED analytes from the list
      if (!form.analyte_ids.length) return 0;
      const selected = allAnalytes.filter(a => form.analyte_ids.includes(a.id));
      return selected.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }
  }, [form.analyte_ids, allAnalytes, editingPanel, panelAnalytes]);

  // ✅ UPDATED SAVE HANDLER (Fixes "0 Price" issue)
  const handleSavePanel = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Determine the price to display immediately
      const newPrice = form.price_is_dynamic ? calculatedTotal : form.price;

      // Construct payload for API
      const basePayload = {
        name: form.name,
        department_id: form.department_id,
        description: form.description,
        price_is_dynamic: form.price_is_dynamic,
        price: form.price_is_dynamic ? 0 : form.price, // 0 tells backend to auto-calc
        panel_auto_recalc: form.price_is_dynamic 
      };

      let savedPanelId = editingPanel?.id;

      if (editingPanel) {
        // Update API call (No analyte_ids sent to preserve existing links)
        await apiFetch(`/api/lab-config/panels/${editingPanel.id}`, {
          method: 'PUT',
          body: JSON.stringify(basePayload) 
        });
        toast.success("✅ Panel updated");

        // 🚀 OPTIMISTIC UPDATE: Update Local State Immediately
        setPanels(prev => prev.map(p => 
            p.id === editingPanel.id 
            ? { ...p, ...basePayload, price: newPrice } // Force display of calculated price
            : p
        ));
        
        // Also update the selected panel view if it's the one being edited
        if(selectedPanel?.id === editingPanel.id) {
            setSelectedPanel(prev => ({ ...prev, ...basePayload, price: newPrice }));
        }

      } else {
        // Create API call
        const res = await apiFetch("/api/lab-config/panels", {
          method: 'POST',
          body: JSON.stringify({
            ...basePayload,
            analyte_ids: form.analyte_ids
          })
        });
        savedPanelId = res.data?.id || res.id; // Capture new ID
        toast.success("✅ Panel created");
      }

      // 🚀 FORCE RECALC ON SERVER
      // This ensures the DB table has the correct summed price, not 0
      if (form.price_is_dynamic && savedPanelId) {
         await apiFetch(`/api/lab-config/panels/${savedPanelId}/recalc`, { method: 'POST' });
      }
      
      setShowModal(false);
      
      // Small delay to allow DB update before fetching fresh data
      setTimeout(() => {
          loadData(); 
          if (savedPanelId && !editingPanel) {
             // Optional: Select the newly created panel
          }
      }, 200);
      
    } catch (err: any) {
      toast.error(`❌ Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePanel = async (id: number) => {
    if (!window.confirm("Delete this panel? This will also remove it from the test catalog.")) return;
    try {
      await apiFetch(`/api/lab-config/panels/${id}`, { method: 'DELETE' });
      toast.success("🗑️ Panel deleted");
      setSelectedPanel(null);
      loadData(); 
    } catch (err: any) {
      toast.error(`❌ Delete failed: ${err.message}`);
    }
  };

  // ============================================================
  // 🔍 Search & Filter
  // ============================================================
  const filteredPanels = useMemo(() => {
    let result = panels;
    if (departmentFilter)
      result = result.filter((p) => p.department_id === Number(departmentFilter));
    if (searchTerm)
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return result;
  }, [panels, searchTerm, departmentFilter]);
  
  const departmentMap = useMemo(() => departments.reduce((map: any, dept) => {
    map[dept.id] = dept.name;
    return map;
  }, {}), [departments]);

  // ============================================================
  // 🔗 Panel ↔ Analyte Linking
  // ============================================================
  const handlePanelSelect = async (panel: any) => {
    setSelectedPanel(panel);
    setAnalytesLoading(true);
    try {
      const response = await apiFetch(`/api/lab-config/panels/${panel.id}/analytes`);
      setPanelAnalytes(Array.isArray(response) ? response : response?.data || []);
    } catch (err: any) {
      toast.error(`❌ Failed to fetch analytes: ${err.message}`);
      setPanelAnalytes([]);
    } finally {
      setAnalytesLoading(false);
    }
  };

  const handleAddAnalyteToPanel = async (analyteId: number) => {
    if (!selectedPanel || !analyteId) return;
    try {
      await apiFetch(`/api/lab-config/panels/${selectedPanel.id}/analytes`, {
        method: 'POST',
        body: JSON.stringify({ analyteId: Number(analyteId) })
      });
      toast.success("✅ Added to panel");
      handlePanelSelect(selectedPanel); // Refresh the list
    } catch (err: any) {
      toast.error(`❌ Add failed: ${err.message}`);
    }
  };

  const handleRemoveAnalyteFromPanel = async (analyteId: number) => {
    if (!selectedPanel) return;
    if (!window.confirm("Remove this analyte from the panel?")) return;
    try {
      await apiFetch(`/api/lab-config/panels/${selectedPanel.id}/analytes/${analyteId}`, {
        method: 'DELETE'
      });
      toast.success("🗑️ Removed from panel");
      handlePanelSelect(selectedPanel); // Refresh the list
    } catch (err: any) {
      toast.error(`❌ Remove failed: ${err.message}`);
    }
  };

  const addableAnalytes = useMemo(() => {
    const existingIds = new Set(panelAnalytes.map((a) => a.id));
    return allAnalytes.filter((a) => !existingIds.has(a.id));
  }, [panelAnalytes, allAnalytes]);


  // ============================================================
  // 🖥️ Render
  // ============================================================
  return (
    <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 🧩 PANELS LIST */}
      <motion.div 
        className="bg-white rounded-xl p-6 border shadow-sm flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b">
          <h3 className="text-xl font-semibold text-blue-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Test Panels
          </h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <PlusCircle size={16} /> Add Panel
          </button>
        </div>

        {/* 🔍 Search + Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search panels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              className="w-full md:w-auto pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none appearance-none"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ul className="space-y-2 max-h-[65vh] overflow-y-auto flex-1 -mr-2 pr-2">
          {dataLoading ? (
             <div className="flex justify-center items-center h-48">
               <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
             </div>
          ) : filteredPanels.length ? (
            filteredPanels.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => handlePanelSelect(p)}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedPanel?.id === p.id
                      ? "bg-blue-50 border-blue-500 shadow-md"
                      : "border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{p.name}</span>
                        {p.price_is_dynamic && (
                            <span title="Dynamic Price" className="text-purple-600 bg-purple-100 rounded-full p-0.5">
                                <Calculator size={12} />
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                          <Building2 size={12} /> {departmentMap[p.department_id] || 'N/A'}
                      </span>
                      <span className="font-medium text-slate-700">
                          Le {Number(p.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span onClick={(e) => {e.stopPropagation(); openEdit(p);}} className="p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-100">
                      <Pencil size={16} />
                    </span>
                    <span onClick={(e) => {e.stopPropagation(); handleDeletePanel(p.id);}} className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100">
                      <Trash2 size={16} />
                    </span>
                  </div>
                </button>
              </li>
            ))
          ) : (
            <li className="text-center text-gray-400 py-10">No panels found.</li>
          )}
        </ul>
      </motion.div>

      {/* 🔗 ANALYTES SIDE PANEL */}
      <motion.div 
        className="bg-white rounded-xl p-6 border shadow-sm lg:col-span-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h3 className="text-xl font-semibold mb-4 pb-4 border-b text-green-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" /> Analytes in Panel
        </h3>

        {!selectedPanel ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
            <Package size={40} className="mb-2 text-gray-300" />
            <p className="font-medium">No Panel Selected</p>
            <p className="text-sm">Please select a panel from the left to view or add analytes.</p>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(70vh + 80px)]">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600">Add Analyte</label>
              <select
                onChange={(e) =>
                  e.target.value && handleAddAnalyteToPanel(Number(e.target.value))
                }
                value=""
                className="w-full p-2.5 border rounded-lg mt-1 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              >
                <option value="">Select an analyte to add...</option>
                {addableAnalytes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Le {a.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-600">Included Analytes ({panelAnalytes.length})</p>
                {selectedPanel.price_is_dynamic && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Calculator size={12} /> Auto-Calculating
                    </span>
                )}
            </div>
            
            <ul className="space-y-2 overflow-y-auto flex-1 -mr-2 pr-2">
              {analytesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : panelAnalytes.length > 0 ? (
                panelAnalytes.map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between items-center p-3 border rounded-lg bg-gray-50"
                  >
                    <div>
                        <span className="font-medium text-gray-700 block">{a.name}</span>
                        <span className="text-xs text-gray-500">Le {Number(a.price).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAnalyteFromPanel(a.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-center text-gray-400 py-6 italic">No analytes in this panel.</li>
              )}
            </ul>
          </div>
        )}
      </motion.div>

      {/* 🧱 ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
            >
              <XCircle size={24} />
            </button>
            
            <h3 className="text-xl font-bold mb-6 text-slate-800">
              {editingPanel ? "Edit Panel" : "Create New Panel"}
            </h3>
            
            <form onSubmit={handleSavePanel} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-600 uppercase text-xs">Panel Name</label>
                    <input
                      placeholder="e.g. Full Blood Count"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-blue-300 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-600 uppercase text-xs">Department</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-white focus:ring-2 focus:ring-blue-300 outline-none"
                      value={form.department_id || ""}
                      onChange={(e) =>
                        setForm({ ...form, department_id: Number(e.target.value) || null })
                      }
                    >
                      <option value="">Select Department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600 uppercase text-xs">Description</label>
                <textarea
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-blue-300 outline-none"
                  rows={2}
                />
              </div>

              {/* --- HYBRID PRICING SECTION --- */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-sm font-bold text-slate-600 uppercase text-xs mb-3 block">Pricing Strategy</label>
                
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="pricing"
                      checked={!form.price_is_dynamic}
                      onChange={() => setForm(p => ({...p, price_is_dynamic: false}))}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Fixed Manual Price</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="pricing"
                      checked={form.price_is_dynamic}
                      onChange={() => setForm(p => ({...p, price_is_dynamic: true}))}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-700">Sum of Analytes (Dynamic)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">
                      {form.price_is_dynamic ? "Calculated Total" : "Manual Price"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">Le</span>
                      <input 
                        type="number" 
                        // ✅ FIX: Use the memoized calculated total
                        value={form.price_is_dynamic ? calculatedTotal : form.price}
                        onChange={e => !form.price_is_dynamic && setForm({...form, price: Number(e.target.value)})}
                        readOnly={form.price_is_dynamic}
                        className={`w-full pl-9 p-2 border rounded-lg outline-none font-bold ${
                          form.price_is_dynamic ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                  {form.price_is_dynamic && (
                    <div className="flex-1 text-xs text-purple-600 bg-purple-50 p-2 rounded border border-purple-100 flex items-center gap-2">
                      <Calculator size={16} />
                      <span>
                         {editingPanel 
                            ? "Total calculated from current analytes in the panel." 
                            : "Auto-updates when you select analytes below."}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* --- ANALYTE SELECTION (Only for CREATE mode) --- */}
              {!editingPanel && (
                  <div className="border rounded-xl p-3 bg-white max-h-48 overflow-y-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block sticky top-0 bg-white pb-1">Select Initial Analytes</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allAnalytes.map(analyte => (
                        <label 
                          key={analyte.id} 
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-slate-50 ${form.analyte_ids.includes(analyte.id) ? 'bg-blue-50 border-blue-200' : ''}`}
                        >
                          <input 
                            type="checkbox"
                            checked={form.analyte_ids.includes(analyte.id)}
                            onChange={() => {
                                setForm(prev => {
                                    const ids = prev.analyte_ids.includes(analyte.id)
                                        ? prev.analyte_ids.filter(id => id !== analyte.id)
                                        : [...prev.analyte_ids, analyte.id];
                                    return { ...prev, analyte_ids: ids };
                                });
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm truncate flex-1">{analyte.name}</span>
                          <span className="text-xs text-slate-400">Le {analyte.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
              )}

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save size={16} />}
                  {isSaving ? "Saving..." : (editingPanel ? "Update Panel" : "Create Panel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelsTab;