import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  Save,
  Trash2,
  RefreshCcw,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";

/**
 * 🧠 NormalRangesTab (Enhanced 2025)
 * -----------------------------------------------------------
 * - Add, edit, delete normal ranges for analytes.
 * - Copy ranges from another analyte.
 * - Can also act as a Panel override editor (when props.panelId is provided).
 *
 * Props:
 *   analyteId  - required (the test or analyte id)
 *   token      - auth token
 *   panelId    - optional (for override within a panel)
 *   onSaveOverride - optional callback for PanelsConfigurationPage
 */
export default function NormalRangesTab({
  analyteId,
  token,
  panelId = null,
  onSaveOverride = null,
}) {
  const [ranges, setRanges] = useState([]);
  const [units, setUnits] = useState([]);
  const [allAnalytes, setAllAnalytes] = useState([]);
  const [copyFromId, setCopyFromId] = useState("");
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newRange, setNewRange] = useState({
    range_type: "numeric",
    min_value: "",
    max_value: "",
    qualitative_value: "",
    gender: "Any",
    min_age: "",
    max_age: "",
    range_label: "",
    symbol_operator: "",
    note: "",
    unit_id: "",
  });

  // =============================================================
  // 🧭 LOAD DATA
  // =============================================================
  useEffect(() => {
    if (analyteId) loadRanges();
  }, [analyteId, panelId]);

  useEffect(() => {
    loadUnits();
    loadAllAnalytes();
  }, []);

  const loadRanges = async () => {
    if (!analyteId) return;
    try {
      setLoading(true);
      const res = panelId
        ? await labConfigService.getPanelRanges(panelId, token)
        : await labConfigService.getNormalRanges(analyteId, token);

      // panel may return full array with overrides; filter if needed
      const r = Array.isArray(res) ? res : res.data || [];
      const filtered = panelId
        ? r.filter((x) => x.analyte_id === analyteId)
        : r;

      setRanges(filtered);
    } catch (err) {
      toast.error(err.message || "Failed to load ranges");
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      const res = await labConfigService.getUnits(token);
      setUnits(res.data || res || []);
    } catch {
      toast.error("Failed to load units");
    }
  };

  const loadAllAnalytes = async () => {
    try {
      const res = await labConfigService.getAnalytes(token);
      setAllAnalytes(res.data || res || []);
    } catch {
      toast.error("Failed to load analytes");
    }
  };

  // =============================================================
  // ✏️ FORM HANDLERS
  // =============================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewRange((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setNewRange((prev) => ({
      ...prev,
      range_type: type,
      min_value: "",
      max_value: "",
      qualitative_value: "",
    }));
  };

  // =============================================================
  // 💾 CREATE RANGE
  // =============================================================
  const handleAddRange = async (e) => {
    e.preventDefault();
    try {
      if (panelId) {
        // Panel override
        const payload = { override_range: [newRange] };
        await labConfigService.setPanelRangeOverride(panelId, analyteId, payload, token);
        toast.success("✅ Override added");
      } else {
        await labConfigService.createNormalRange(analyteId, newRange, token);
        toast.success("✅ Range added");
      }

      setNewRange({
        range_type: "numeric",
        min_value: "",
        max_value: "",
        qualitative_value: "",
        gender: "Any",
        min_age: "",
        max_age: "",
        range_label: "",
        symbol_operator: "",
        note: "",
        unit_id: "",
      });

      await loadRanges();
      if (onSaveOverride) onSaveOverride();
    } catch (err) {
      toast.error(err.message || "Failed to add range");
    }
  };

  // =============================================================
  // 💾 UPDATE RANGE
  // =============================================================
  const saveRange = async (range) => {
    try {
      if (panelId) {
        const payload = { override_range: [range] };
        await labConfigService.setPanelRangeOverride(panelId, analyteId, payload, token);
      } else {
        await labConfigService.updateNormalRange(range.id, range, token);
      }
      toast.success("💾 Range updated");
      await loadRanges();
    } catch (err) {
      toast.error(err.message || "Failed to update range");
    }
  };

  // =============================================================
  // 🗑️ DELETE RANGE
  // =============================================================
  const deleteRange = async (rangeId) => {
    if (!window.confirm("Delete this range?")) return;
    try {
      if (panelId) {
        await labConfigService.deletePanelRangeOverride(panelId, analyteId, token);
      } else {
        await labConfigService.deleteNormalRange(rangeId, token);
      }
      toast.success("🗑️ Deleted successfully");
      await loadRanges();
    } catch (err) {
      toast.error(err.message || "Failed to delete range");
    }
  };

  // =============================================================
  // 📋 COPY RANGES FROM ANOTHER ANALYTE
  // =============================================================
  const handleCopyRanges = async () => {
    if (!copyFromId) return toast.error("Select an analyte to copy from");
    if (copyFromId === analyteId)
      return toast.error("Cannot copy from the same analyte");

    try {
      const sourceRanges = await labConfigService.getNormalRanges(copyFromId, token);
      const list = sourceRanges.data || sourceRanges || [];

      if (!list.length) return toast.error("No ranges found to copy");

      let count = 0;
      for (const r of list) {
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
        if (panelId)
          await labConfigService.setPanelRangeOverride(panelId, analyteId, { override_range: [data] }, token);
        else
          await labConfigService.createNormalRange(analyteId, data, token);
        count++;
      }
      toast.success(`✅ ${count} range(s) copied successfully`);
      await loadRanges();
    } catch (err) {
      toast.error(err.message || "Failed to copy ranges");
    }
  };

  // =============================================================
  // 🧠 UI
  // =============================================================
  return (
    <div className="border rounded-lg bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">
          {panelId ? "Panel Override Ranges" : "Reference Ranges"}
        </h3>

        <div className="flex gap-3">
          <button
            onClick={loadRanges}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-700 text-sm"
          >
            <RefreshCcw size={14} /> Refresh
          </button>

          <button
            onClick={() => setShowCopyPanel((p) => !p)}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-700 text-sm"
          >
            <Copy size={14} /> {showCopyPanel ? "Hide Copy" : "Copy From..."}
          </button>
        </div>
      </div>

      {/* ================= COPY PANEL ================= */}
      {showCopyPanel && (
        <div className="bg-white border rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <select
              value={copyFromId}
              onChange={(e) => setCopyFromId(e.target.value)}
              className="border rounded-lg p-2 flex-1"
            >
              <option value="">Select analyte to copy from</option>
              {allAnalytes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCopyRanges}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>
      )}

      {/* ================= ADD RANGE FORM ================= */}
      <form
        onSubmit={handleAddRange}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 bg-white p-3 border rounded-lg"
      >
        <select
          name="range_type"
          value={newRange.range_type}
          onChange={handleTypeChange}
          className="border p-2 rounded-lg"
        >
          <option value="numeric">Numeric</option>
          <option value="qualitative">Qualitative</option>
        </select>

        {newRange.range_type === "numeric" ? (
          <>
            <input
              type="number"
              name="min_value"
              placeholder="Min"
              value={newRange.min_value}
              onChange={handleChange}
              className="border p-2 rounded-lg"
            />
            <input
              type="number"
              name="max_value"
              placeholder="Max"
              value={newRange.max_value}
              onChange={handleChange}
              className="border p-2 rounded-lg"
            />
          </>
        ) : (
          <input
            type="text"
            name="qualitative_value"
            placeholder="Qualitative Value"
            value={newRange.qualitative_value}
            onChange={handleChange}
            className="border p-2 rounded-lg col-span-2"
          />
        )}

        <select
          name="unit_id"
          value={newRange.unit_id}
          onChange={handleChange}
          className="border p-2 rounded-lg"
        >
          <option value="">Select Unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.symbol || u.unit_name}
            </option>
          ))}
        </select>

        <select
          name="gender"
          value={newRange.gender}
          onChange={handleChange}
          className="border p-2 rounded-lg"
        >
          <option value="Any">Any</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          type="number"
          name="min_age"
          placeholder="Min Age"
          value={newRange.min_age}
          onChange={handleChange}
          className="border p-2 rounded-lg"
        />
        <input
          type="number"
          name="max_age"
          placeholder="Max Age"
          value={newRange.max_age}
          onChange={handleChange}
          className="border p-2 rounded-lg"
        />

        <input
          type="text"
          name="range_label"
          placeholder="Label (e.g. Adult)"
          value={newRange.range_label}
          onChange={handleChange}
          className="border p-2 rounded-lg"
        />

        <input
          type="text"
          name="symbol_operator"
          placeholder="Symbol (e.g. <, >)"
          value={newRange.symbol_operator}
          onChange={handleChange}
          className="border p-2 rounded-lg"
        />

        <input
          type="text"
          name="note"
          placeholder="Note"
          value={newRange.note}
          onChange={handleChange}
          className="border p-2 rounded-lg md:col-span-2"
        />

        <button
          type="submit"
          className="flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusCircle size={16} /> Add
        </button>
      </form>

      {/* ================= TABLE ================= */}
      {loading ? (
        <div className="italic text-gray-500">Loading ranges...</div>
      ) : ranges.length === 0 ? (
        <div className="italic text-gray-500">No ranges defined yet.</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Type</th>
              <th className="border p-2">Min</th>
              <th className="border p-2">Max</th>
              <th className="border p-2">Qualitative</th>
              <th className="border p-2">Gender</th>
              <th className="border p-2">Age</th>
              <th className="border p-2">Label</th>
              <th className="border p-2">Unit</th>
              <th className="border p-2 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((r) => (
              <tr key={r.id || r.range_label} className="hover:bg-gray-50">
                <td className="border p-2">{r.range_type}</td>
                <td className="border p-2 text-right">{r.min_value ?? "—"}</td>
                <td className="border p-2 text-right">{r.max_value ?? "—"}</td>
                <td className="border p-2">{r.qualitative_value ?? "—"}</td>
                <td className="border p-2">{r.gender}</td>
                <td className="border p-2">
                  {r.min_age ?? "—"} - {r.max_age ?? "—"}
                </td>
                <td className="border p-2">{r.range_label ?? "—"}</td>
                <td className="border p-2">{r.unit_symbol || r.unit_name || "—"}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => saveRange(r)}
                    className="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={() => deleteRange(r.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
