import React, { useEffect, useState } from "react";
import {
  Beaker,
  PlusCircle,
  Trash2,
  Save,
  RefreshCcw,
  Copy,
  CheckSquare,
  Square,
  Filter,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";
import NormalRangesTab from "./NormalRangesTab";

/**
 * 🧬 Analytes Configuration Page
 * -----------------------------------------------------------
 * - Manage analytes independently of panels.
 * - Configure department, sample type, units, and price.
 * - Copy reference ranges across analytes.
 */
export default function AnalytesConfigurationPage() {
  const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

  // ==============================
  // State
  // ==============================
  const [analytes, setAnalytes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedAnalyte, setExpandedAnalyte] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterSample, setFilterSample] = useState("");

  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [copySourceId, setCopySourceId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    department_id: "",
    sample_type_id: "",
    unit_id: "",
    price: "",
  });

  // ==============================
  // Load Data
  // ==============================
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [a, d, s, u] = await Promise.all([
        labConfigService.getAnalytes(token),
        labConfigService.getDepartments(token),
        labConfigService.getSampleTypes(token),
        labConfigService.getUnits(token),
      ]);
      setAnalytes(a.data || a || []);
      setDepartments(d.data || d || []);
      setSampleTypes(s.data || s || []);
      setUnits(u.data || u || []);
    } catch (err) {
      toast.error("❌ Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // CRUD
  // ==============================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name.trim(),
        department_id: formData.department_id || null,
        sample_type_id: formData.sample_type_id || null,
        unit_id: formData.unit_id || null,
        price: formData.price ? Number(formData.price) : 0,
        is_active: true,
      };
      if (!payload.name) return toast.error("Name is required");

      await labConfigService.createAnalyte(payload, token);
      toast.success("✅ Analyte created");
      setFormData({
        name: "",
        department_id: "",
        sample_type_id: "",
        unit_id: "",
        price: "",
      });
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Failed to create analyte");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this analyte?")) return;
    try {
      await labConfigService.deleteAnalyte(id, token);
      toast.success("🗑️ Deleted successfully");
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Failed to delete analyte");
    }
  };

  // ==============================
  // Batch Selection + Copy
  // ==============================
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAnalytes.length) setSelectedIds([]);
    else setSelectedIds(filteredAnalytes.map((a) => a.id));
  };

  const handleBatchCopy = async () => {
    if (!copySourceId) return toast.error("Select a source analyte first");
    if (selectedIds.length === 0)
      return toast.error("Select at least one target analyte");

    try {
      const src = await labConfigService.getNormalRanges(copySourceId, token);
      const sourceRanges = src.data || src || [];
      if (!sourceRanges.length)
        return toast.error("No ranges found for source analyte");

      let totalCopied = 0;
      for (const targetId of selectedIds) {
        if (targetId === copySourceId) continue;
        for (const r of sourceRanges) {
          const data = {
            range_type: r.range_type,
            min_value: r.min_value,
            max_value: r.max_value,
            qualitative_value: r.qualitative_value,
            symbol_operator: r.symbol_operator,
            gender: r.gender,
            min_age: r.min_age,
            max_age: r.max_age,
            range_label: r.range_label,
            note: r.note,
            unit_id: r.unit_id,
          };
          await labConfigService.createNormalRange(targetId, data, token);
          totalCopied++;
        }
      }
      toast.success(`✅ Copied ${totalCopied} range(s) successfully`);
    } catch (err) {
      toast.error(err.message || "Batch copy failed");
    }
  };

  // ==============================
  // Filtered List
  // ==============================
  const filteredAnalytes = analytes.filter((a) => {
    const matchesSearch = a.name
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesDept = filterDept
      ? a.department_id === Number(filterDept)
      : true;
    const matchesSample = filterSample
      ? a.sample_type_id === Number(filterSample)
      : true;
    return matchesSearch && matchesDept && matchesSample;
  });

  // ==============================
  // UI
  // ==============================
  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Beaker size={20} /> Analytes Configuration
        </h1>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center border rounded px-2">
            <Search size={16} className="text-gray-500 mr-1" />
            <input
              type="text"
              placeholder="Search analyte..."
              className="outline-none p-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCopyPanel((p) => !p)}
            className="flex items-center gap-1 bg-gray-100 border px-3 py-1 rounded-lg hover:bg-gray-200"
          >
            <Copy size={16} /> {showCopyPanel ? "Hide Copy" : "Batch Copy"}
          </button>
          <button
            onClick={loadAll}
            className="flex items-center gap-1 bg-gray-100 border px-3 py-1 rounded-lg hover:bg-gray-200"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded border">
        <Filter size={16} className="text-gray-500" />
        <select
          className="border rounded p-2"
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

        <select
          className="border rounded p-2"
          value={filterSample}
          onChange={(e) => setFilterSample(e.target.value)}
        >
          <option value="">All Sample Types</option>
          {sampleTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-4 border rounded-lg"
      >
        <input
          type="text"
          name="name"
          placeholder="Analyte Name"
          value={formData.name}
          onChange={handleChange}
          className="border rounded-lg p-2"
        />

        <select
          name="department_id"
          value={formData.department_id}
          onChange={handleChange}
          className="border rounded-lg p-2"
        >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          name="sample_type_id"
          value={formData.sample_type_id}
          onChange={handleChange}
          className="border rounded-lg p-2"
        >
          <option value="">Select Sample Type</option>
          {sampleTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          name="unit_id"
          value={formData.unit_id}
          onChange={handleChange}
          className="border rounded-lg p-2"
        >
          <option value="">Select Unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.symbol || u.unit_name}
            </option>
          ))}
        </select>

        <input
          type="number"
          name="price"
          placeholder="Price"
          value={formData.price}
          onChange={handleChange}
          className="border rounded-lg p-2"
        />

        <button
          type="submit"
          className="flex items-center justify-center gap-2 col-span-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Save size={16} /> Save
        </button>
      </form>

      {/* Copy Panel */}
      {showCopyPanel && (
        <div className="bg-white border rounded-lg p-3">
          <h3 className="font-semibold mb-3 text-sm">
            📋 Copy Normal Ranges to Selected Analytes
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
              className="border rounded-lg p-2 flex-1 min-w-[200px]"
            >
              <option value="">Select source analyte</option>
              {analytes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBatchCopy}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Copy size={14} /> Copy Ranges
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 w-8 text-center">
                <button onClick={toggleSelectAll}>
                  {selectedIds.length === filteredAnalytes.length &&
                  filteredAnalytes.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Sample</th>
              <th className="border p-2 text-left">Unit</th>
              <th className="border p-2 text-right">Price</th>
              <th className="border p-2 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : filteredAnalytes.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-4">
                  No analytes found.
                </td>
              </tr>
            ) : (
              filteredAnalytes.map((a) => (
                <React.Fragment key={a.id}>
                  <tr
                    className={`hover:bg-gray-50 ${
                      expandedAnalyte === a.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="border p-2 text-center">
                      <button onClick={() => toggleSelect(a.id)}>
                        {selectedIds.includes(a.id) ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td
                      className="border p-2 cursor-pointer"
                      onClick={() =>
                        setExpandedAnalyte((prev) =>
                          prev === a.id ? null : a.id
                        )
                      }
                    >
                      {a.name}
                    </td>
                    <td className="border p-2 text-center">
                      {a.sample_type_name || "—"}
                    </td>
                    <td className="border p-2 text-center">
                      {a.unit_symbol || a.unit_name || "—"}
                    </td>
                    <td className="border p-2 text-right">{a.price || 0}</td>
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                  {expandedAnalyte === a.id && (
                    <tr>
                      <td colSpan="6" className="p-3 bg-white border-t">
                        <NormalRangesTab analyteId={a.id} token={token} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
