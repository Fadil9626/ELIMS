import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  PlusCircle,
  Trash2,
  Pencil,
  Save,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import apiFetch from "../../../services/apiFetch"; // 🚀 1. Import apiFetch

// 🚀 2. REMOVED the old, broken getToken() function

// ============================================================
// 🔢 Normal Ranges Panel
// ============================================================
const NormalRangesTab = ({ analyteId }: { analyteId: number }) => {
  // 🚀 3. REMOVED manual token
  const [ranges, setRanges] = useState<any[]>([]);
  const [newRange, setNewRange] = useState({
    range_type: "numeric",
    gender: "Any",
    min_age: "",
    max_age: "",
    min_value: "",
    max_value: "",
    qualitative_value: "",
    symbol_operator: "",
    range_label: "",
  });

  const loadRanges = useCallback(async () => {
    try {
      // 🚀 4. Use apiFetch
      // ✅ FIXED: Changed 'analytes' to 'tests' to match backend route
      const res = await apiFetch(`/api/lab-config/tests/${analyteId}/ranges`);
      setRanges(res?.data || res || []);
    } catch {
      toast.error("Failed to load ranges");
    }
  }, [analyteId]);

  useEffect(() => {
    loadRanges();
  }, [loadRanges]);

  const handleAddRange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newRange,
        min_age: newRange.min_age ? Number(newRange.min_age) : null,
        max_age: newRange.max_age ? Number(newRange.max_age) : null,
        min_value: newRange.min_value ? Number(newRange.min_value) : null,
        max_value: newRange.max_value ? Number(newRange.max_value) : null,
      };
      // 🚀 4. Use apiFetch
      // ✅ FIXED: Changed 'analytes' to 'tests' to match backend route
      await apiFetch(`/api/lab-config/tests/${analyteId}/ranges`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      loadRanges(); // Refresh
      setNewRange({
        range_type: "numeric",
        gender: "Any",
        min_age: "",
        max_age: "",
        min_value: "",
        max_value: "",
        qualitative_value: "",
        symbol_operator: "",
        range_label: "",
      });
      toast.success("✅ Range added");
    } catch {
      toast.error("Failed to add range");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this range?")) return;
    try {
      // 🚀 4. Use apiFetch
      // (Assuming a RESTful route for deleting a specific range)
      await apiFetch(`/api/lab-config/ranges/${id}`, {
        method: 'DELETE'
      });
      setRanges((prev) => prev.filter((r) => r.id !== id));
      toast.success("🗑️ Range deleted");
    } catch {
      toast.error("Failed to delete range");
    }
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-4 mt-3">
      <h4 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Settings size={18} /> Normal Ranges
      </h4>

      {/* Add Range */}
      <form onSubmit={handleAddRange} className="grid md:grid-cols-4 gap-3 text-sm mb-4">
        <select
          value={newRange.range_type}
          onChange={(e) => setNewRange({ ...newRange, range_type: e.target.value })}
          className="border rounded-md p-2"
        >
          <option value="numeric">Numeric</option>
          <option value="qualitative">Qualitative</option>
        </select>

        <select
          value={newRange.gender}
          onChange={(e) => setNewRange({ ...newRange, gender: e.target.value })}
          className="border rounded-md p-2"
        >
          <option value="Any">Any</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          placeholder="Label"
          value={newRange.range_label}
          onChange={(e) => setNewRange({ ...newRange, range_label: e.target.value })}
          className="border rounded-md p-2"
        />

        {newRange.range_type === "numeric" ? (
          <>
            <input
              type="number"
              placeholder="Min"
              value={newRange.min_value}
              onChange={(e) => setNewRange({ ...newRange, min_value: e.target.value })}
              className="border rounded-md p-2"
            />
            <input
              type="number"
              placeholder="Max"
              value={newRange.max_value}
              onChange={(e) => setNewRange({ ...newRange, max_value: e.target.value })}
              className="border rounded-md p-2"
            />
            <input
              placeholder="Symbol (≤ ≥)"
              value={newRange.symbol_operator}
              onChange={(e) => setNewRange({ ...newRange, symbol_operator: e.target.value })}
              className="border rounded-md p-2"
            />
          </>
        ) : (
          <input
            placeholder="Qualitative (Positive/Negative)"
            value={newRange.qualitative_value}
            onChange={(e) => setNewRange({ ...newRange, qualitative_value: e.target.value })}
            className="border rounded-md p-2 col-span-2"
          />
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-md px-3 py-2 hover:bg-blue-700 flex items-center justify-center"
        >
          <PlusCircle size={16} />
        </button>
      </form>

      {/* Existing Ranges */}
      {ranges.length > 0 ? (
        <ul className="space-y-2 text-sm max-h-56 overflow-y-auto">
          {ranges.map((r) => (
            <li key={r.id} className="flex justify-between items-center border-b py-2">
              <span>
                <b>{r.gender}</b> ({r.range_type}):{" "}
                {r.range_type === "numeric"
                  ? `${r.min_value ?? ""}–${r.max_value ?? ""}`
                  : r.qualitative_value}
              </span>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No ranges defined yet.</p>
      )}
    </div>
  );
};

// ============================================================
// 🧪 Main Analytes Tab
// ============================================================
export default function AnalytesTab() {
  const [analytes, setAnalytes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  
  // 🚀 3. REMOVED manual token

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // 🚀 4. Use apiFetch
        const [aRes, dRes] = await Promise.all([
          apiFetch("/api/lab-config/tests"), // This was /api/lab-config/tests 401
          apiFetch("/api/departments"),     // This was /api/departments 401
        ]);
        const list = (Array.isArray(aRes) ? aRes : (aRes as any)?.data || []).map((a: any) => ({
          ...a,
          department: a.department_name || "Unassigned",
        }));
        setAnalytes(list);
        const deptList = Array.isArray(dRes) ? dRes : (dRes as any)?.data || [];
        setDepartments([{ id: "All", name: "All Departments" }, ...deptList]);
      } catch (err: any) {
        toast.error(err.message || "Failed to load analytes");
      } finally {
        setLoading(false);
      }
    })();
  }, []); // 🚀 5. REMOVED token dependency

  const filtered = useMemo(
    () =>
      analytes.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (selectedDept === "All" || a.department === selectedDept)
      ),
    [analytes, searchTerm, selectedDept]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({ name: a.name, description: a.description || "" });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    try {
      // 🚀 6. Use apiFetch
      if (editing) {
        await apiFetch(`/api/lab-config/analytes/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        toast.success("Analyte updated");
      } else {
        await apiFetch("/api/lab-config/analytes", {
          method: 'POST',
          body: JSON.stringify(form)
        });
        toast.success("Analyte added");
      }
      setShowModal(false);
      const aRes = await apiFetch("/api/lab-config/tests");
      setAnalytes(Array.isArray(aRes) ? aRes : (aRes as any)?.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete analyte?")) return;
    try {
      // 🚀 6. Use apiFetch
      await apiFetch(`/api/lab-config/analytes/${id}`, {
        method: 'DELETE'
      });
      toast.success("Deleted");
      setAnalytes((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  if (loading)
    return <div className="text-center mt-16 text-gray-500 text-lg animate-pulse">Loading analytes...</div>;

  return (
    <div className="space-y-8">
      <motion.div className="bg-white rounded-2xl p-6 border shadow-sm" whileHover={{ scale: 1.01 }}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-semibold text-green-700 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-600" /> Master Analyte List
          </h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-green-600 text-white text-base px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <PlusCircle size={18} /> Add
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              placeholder="Search analytes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg text-base"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="pl-10 pr-3 py-3 border rounded-lg text-base"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <ul className="space-y-3 max-h-[75vh] overflow-y-auto">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="border-b px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-800"
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-lg">{a.name}</span>
                  <span className="text-sm text-gray-500">{a.department}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expanded === a.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button onClick={() => openEdit(a)} className="text-blue-500 hover:text-blue-700">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {expanded === a.id && <NormalRangesTab analyteId={a.id} />}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-center text-gray-400 py-4 text-base">No analytes found.</li>
          )}
        </ul>
      </motion.div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-[460px] relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
            >
              <XCircle size={24} />
            </button>

            <h3 className="text-xl font-semibold mb-5 text-gray-700">
              {editing ? "Edit Analyte" : "Add New Analyte"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Analyte Name</label>
                <input
                  placeholder="e.g. Glucose"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-md px-4 py-3 text-base mt-1 focus:ring-2 focus:ring-blue-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <textarea
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-md px-4 py-3 text-base mt-1 focus:ring-2 focus:ring-blue-200 outline-none"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-base border rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 text-white text-base px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  <Save size={18} /> {editing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}