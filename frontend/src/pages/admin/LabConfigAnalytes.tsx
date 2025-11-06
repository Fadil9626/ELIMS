import React, { useEffect, useState, useMemo } from "react";
import {
  FlaskConical,
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Filter,
  Search,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";
import LabConfigNav from "../../components/lab/LabConfigNav";

// ============================================================
// TYPES
// ============================================================
interface Analyte {
  id: number;
  name: string;
  price: number;
  is_active: boolean;
  department_id?: number;
  sample_type_id?: number;
  unit_id?: number;
  department_name?: string;
  sample_type_name?: string;
  unit_symbol?: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const LabConfigAnalytes: React.FC = () => {
  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token;
  const [analytes, setAnalytes] = useState<Analyte[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Analyte | null>(null);
  const [expandedAnalyte, setExpandedAnalyte] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    department_id: "",
    sample_type_id: "",
    unit_id: "",
    is_active: true,
  });

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [search, setSearch] = useState("");

  // ============================================================
  // LOAD DATA
  // ============================================================
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [a, d, s, u] = await Promise.all([
          labConfigService.getAnalytes(token),
          labConfigService.getDepartments(token),
          labConfigService.getSampleTypes(token),
          labConfigService.getUnits(token),
        ]);
        setAnalytes(a?.data || a || []);
        setDepartments(d?.data || d || []);
        setSampleTypes(s?.data || s || []);
        setUnits(u?.data || u || []);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ============================================================
  // CRUD: ADD / EDIT ANALYTE
  // ============================================================
  const openAdd = () => {
    setEditing(null);
    setFormData({
      name: "",
      price: "",
      department_id: "",
      sample_type_id: "",
      unit_id: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (a: Analyte) => {
    setEditing(a);
    setFormData({
      name: a.name,
      price: String(a.price ?? ""),
      department_id: String(a.department_id ?? ""),
      sample_type_id: String(a.sample_type_id ?? ""),
      unit_id: String(a.unit_id ?? ""),
      is_active: a.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Analyte name is required");

    const payload = {
      name: formData.name.trim(),
      price: Number(formData.price) || 0,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      sample_type_id: formData.sample_type_id ? Number(formData.sample_type_id) : null,
      unit_id: formData.unit_id ? Number(formData.unit_id) : null,
      is_active: formData.is_active,
    };

    try {
      if (editing) {
        await labConfigService.updateAnalyte(editing.id, payload, token);
        toast.success("✅ Analyte updated successfully");
      } else {
        await labConfigService.createAnalyte(payload, token);
        toast.success("✅ Analyte added successfully");
      }
      setShowModal(false);
      const updated = await labConfigService.getAnalytes(token);
      setAnalytes(updated?.data || updated || []);
    } catch (err: any) {
      toast.error(err?.message || "Error saving analyte");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this analyte?")) return;
    try {
      await labConfigService.deleteAnalyte(id, token);
      setAnalytes((prev) => prev.filter((a) => a.id !== id));
      toast.success("🗑️ Deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete analyte");
    }
  };

  const toggleActive = async (analyte: Analyte) => {
    try {
      const updated = { ...analyte, is_active: !analyte.is_active };
      await labConfigService.updateAnalyte(analyte.id, updated, token);
      setAnalytes((prev) =>
        prev.map((a) => (a.id === analyte.id ? updated : a))
      );
      toast.success(
        `Analyte ${updated.is_active ? "activated" : "deactivated"}`
      );
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  // ============================================================
  // FILTER
  // ============================================================
  const filteredAnalytes = useMemo(() => {
    let list = analytes;
    if (filterDept) list = list.filter((a) => String(a.department_id) === filterDept);
    if (search.trim()) list = list.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [analytes, filterDept, search]);

  // ============================================================
  // NORMAL RANGE CONFIGURATION (INNER COMPONENT)
  // ============================================================
  const NormalRangesTab = ({ analyteId }: { analyteId: number }) => {
    const [ranges, setRanges] = useState<any[]>([]);
    const [newRange, setNewRange] = useState({
      range_type: "numeric",
      gender: "Any",
      min_age: "",
      max_age: "",
      min_value: "",
      max_value: "",
      qualitative_value: "",
      range_label: "",
      symbol_operator: "",
    });

    useEffect(() => {
      (async () => {
        try {
          const res = await labConfigService.getNormalRanges(analyteId, token);
          setRanges(res?.data || res || []);
        } catch (e: any) {
          toast.error("Failed to load normal ranges");
        }
      })();
    }, [analyteId]);

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          ...newRange,
          min_age: newRange.min_age ? Number(newRange.min_age) : null,
          max_age: newRange.max_age ? Number(newRange.max_age) : null,
          min_value: newRange.min_value ? Number(newRange.min_value) : null,
          max_value: newRange.max_value ? Number(newRange.max_value) : null,
        };
        await labConfigService.createNormalRange(analyteId, payload, token);
        const res = await labConfigService.getNormalRanges(analyteId, token);
        setRanges(res?.data || res || []);
        setNewRange({
          range_type: "numeric",
          gender: "Any",
          min_age: "",
          max_age: "",
          min_value: "",
          max_value: "",
          qualitative_value: "",
          range_label: "",
          symbol_operator: "",
        });
        toast.success("✅ Range added");
      } catch (e: any) {
        toast.error("Failed to add range");
      }
    };

    const handleDeleteRange = async (id: number) => {
      if (!window.confirm("Delete this range?")) return;
      try {
        await labConfigService.deleteNormalRange(id, token);
        setRanges((prev) => prev.filter((r) => r.id !== id));
        toast.success("🗑️ Range deleted");
      } catch {
        toast.error("Failed to delete range");
      }
    };

    return (
      <div className="bg-gray-50 border rounded-lg p-4 mt-2">
        <h4 className="font-semibold mb-2 text-sm flex items-center gap-2 text-gray-700">
          <Settings size={14} /> Normal Ranges
        </h4>

        {/* Add Form */}
        <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-2 mb-3 text-xs">
          <select
            value={newRange.range_type}
            onChange={(e) => setNewRange((s) => ({ ...s, range_type: e.target.value }))}
            className="border rounded p-1"
          >
            <option value="numeric">Numeric</option>
            <option value="qualitative">Qualitative</option>
          </select>

          <select
            value={newRange.gender}
            onChange={(e) => setNewRange((s) => ({ ...s, gender: e.target.value }))}
            className="border rounded p-1"
          >
            <option value="Any">Any</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <input
            type="text"
            placeholder="Label"
            value={newRange.range_label}
            onChange={(e) => setNewRange((s) => ({ ...s, range_label: e.target.value }))}
            className="border rounded p-1"
          />

          {newRange.range_type === "numeric" ? (
            <>
              <input
                type="number"
                placeholder="Min"
                value={newRange.min_value}
                onChange={(e) => setNewRange((s) => ({ ...s, min_value: e.target.value }))}
                className="border rounded p-1"
              />
              <input
                type="number"
                placeholder="Max"
                value={newRange.max_value}
                onChange={(e) => setNewRange((s) => ({ ...s, max_value: e.target.value }))}
                className="border rounded p-1"
              />
              <input
                type="text"
                placeholder="Symbol (≤ ≥)"
                value={newRange.symbol_operator}
                onChange={(e) => setNewRange((s) => ({ ...s, symbol_operator: e.target.value }))}
                className="border rounded p-1"
              />
            </>
          ) : (
            <input
              type="text"
              placeholder="Qualitative (e.g., Positive)"
              value={newRange.qualitative_value}
              onChange={(e) => setNewRange((s) => ({ ...s, qualitative_value: e.target.value }))}
              className="border rounded p-1 col-span-2"
            />
          )}

          <button
            type="submit"
            className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center justify-center"
          >
            <PlusCircle size={12} />
          </button>
        </form>

        {/* Existing Ranges */}
        <div className="max-h-48 overflow-y-auto border-t pt-2">
          {ranges.length === 0 ? (
            <p className="text-gray-500 text-xs">No ranges defined.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {ranges.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between items-center border-b py-1"
                >
                  <span>
                    <b>{r.gender}</b> ({r.range_type}):{" "}
                    {r.range_type === "numeric"
                      ? `${r.min_value ?? ""}–${r.max_value ?? ""}`
                      : r.qualitative_value}
                  </span>
                  <button
                    onClick={() => handleDeleteRange(r.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER MAIN TABLE
  // ============================================================
  return (
    <div className="p-6">
      <LabConfigNav />
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
            <FlaskConical className="text-green-500" /> Test Analytes
          </h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-2 rounded-md hover:bg-green-700"
          >
            <PlusCircle size={16} /> Add Analyte
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-gray-50 p-2 rounded">
          <Filter size={16} className="text-gray-500" />
          <select
            className="border p-2 rounded"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="flex items-center border rounded p-1">
            <Search size={16} className="text-gray-500 mx-1" />
            <input
              className="outline-none border-none"
              placeholder="Search analytes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500 p-4">Loading analytes...</p>
        ) : (
          <table className="w-full text-sm border-t">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Dept</th>
                <th className="p-2 text-left">Sample</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-right">Price</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Config</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnalytes.map((a, i) => (
                <React.Fragment key={a.id}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{a.name}</td>
                    <td className="p-2">{a.department_name || "—"}</td>
                    <td className="p-2">{a.sample_type_name || "—"}</td>
                    <td className="p-2">{a.unit_symbol || "—"}</td>
                    <td className="p-2 text-right">${a.price}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => toggleActive(a)}
                        className={`${
                          a.is_active ? "text-green-600" : "text-gray-400"
                        } hover:scale-110 transition`}
                      >
                        {a.is_active ? (
                          <ToggleRight size={18} />
                        ) : (
                          <ToggleLeft size={18} />
                        )}
                      </button>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() =>
                          setExpandedAnalyte(
                            expandedAnalyte === a.id ? null : a.id
                          )
                        }
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {expandedAnalyte === a.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEdit(a)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedAnalyte === a.id && (
                    <tr>
                      <td colSpan={9}>
                        <NormalRangesTab analyteId={a.id} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredAnalytes.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 p-4">
                    No analytes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-lg font-semibold mb-3">
              {editing ? "Edit Analyte" : "Add Analyte"}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) =>
                      setFormData({ ...formData, department_id: e.target.value })
                    }
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sample Type
                  </label>
                  <select
                    value={formData.sample_type_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sample_type_id: e.target.value,
                      })
                    }
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {sampleTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  value={formData.unit_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_id: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.symbol || u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  <Save size={16} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabConfigAnalytes;
