import React, { useState, useEffect } from "react";
import {
  HiPlusCircle,
  HiTrash,
  HiPencil,
  HiX,
  HiSave,
  HiArrowLeft,
  HiDuplicate,
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";

/**
 * 🧬 TestRangeConfigurator (2025 unified)
 * ------------------------------------------------------------
 * - Works as standalone analyte editor OR as embedded panel override modal.
 * - Auto-detects context via props.
 * - Handles create, edit, delete, and copy-from-analyte.
 * ------------------------------------------------------------
 * Props:
 *   testId?        - if provided, overrides URL param
 *   testName?      - name to display
 *   panelId?       - if provided, acts in "panel override" mode
 *   token?         - auth token
 *   onClose?       - callback for modal close
 *   onSaveOverride?- callback for panel override save
 */
const TestRangeConfigurator = ({
  testId,
  testName: propTestName,
  panelId = null,
  token: propToken,
  onClose,
  onSaveOverride,
}) => {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const finalTestId = testId || urlId;
  const finalToken =
    propToken || JSON.parse(localStorage.getItem("userInfo"))?.token;
  const finalTestName =
    propTestName || location.state?.testName || "Selected Test";

  const [ranges, setRanges] = useState([]);
  const [units, setUnits] = useState([]);
  const [allAnalytes, setAllAnalytes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newRange, setNewRange] = useState({
    range_type: "numeric",
    gender: "Any",
    min_value: "",
    max_value: "",
    qualitative_value: "",
    symbol_operator: "",
    note: "",
    unit_id: "",
    min_age: "",
    max_age: "",
  });

  const [editRange, setEditRange] = useState(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copyFromId, setCopyFromId] = useState("");

  // ============================================================
  // LOAD DATA
  // ============================================================
  useEffect(() => {
    loadAll();
  }, [finalTestId, panelId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [r, u, a] = await Promise.all([
        panelId
          ? labConfigService.getPanelRanges(panelId, finalToken)
          : labConfigService.getNormalRanges(finalTestId, finalToken),
        labConfigService.getUnits(finalToken),
        labConfigService.getAnalytes(finalToken),
      ]);
      const list = panelId
        ? (r.data || r || []).filter((x) => x.analyte_id === finalTestId)
        : r.data || r || [];
      setRanges(list);
      setUnits(u.data || u || []);
      setAllAnalytes(a.data || a || []);
    } catch (err) {
      toast.error("❌ Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleChange = (key, val) => setNewRange((p) => ({ ...p, [key]: val }));

  const handleAdd = async () => {
    try {
      if (panelId) {
        await labConfigService.setPanelRangeOverride(
          panelId,
          finalTestId,
          { override_range: [newRange] },
          finalToken
        );
      } else {
        await labConfigService.createNormalRange(finalTestId, newRange, finalToken);
      }
      toast.success("✅ Range added");
      resetForm();
      await loadAll();
      if (onSaveOverride) onSaveOverride();
    } catch (err) {
      toast.error(err.message || "Failed to add range");
    }
  };

  const handleDelete = async (rid) => {
    if (!window.confirm("Delete this range?")) return;
    try {
      if (panelId)
        await labConfigService.deletePanelRangeOverride(panelId, finalTestId, finalToken);
      else await labConfigService.deleteNormalRange(rid, finalToken);
      toast.success("🗑️ Deleted");
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleUpdate = async () => {
    try {
      if (panelId) {
        await labConfigService.setPanelRangeOverride(
          panelId,
          finalTestId,
          { override_range: [editRange] },
          finalToken
        );
      } else {
        await labConfigService.updateNormalRange(editRange.id, editRange, finalToken);
      }
      toast.success("💾 Updated");
      setEditRange(null);
      await loadAll();
      if (onSaveOverride) onSaveOverride();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleCopy = async () => {
    if (!copyFromId) return toast.error("Select a source analyte");
    try {
      const src = await labConfigService.getNormalRanges(copyFromId, finalToken);
      const list = src.data || src || [];
      if (!list.length) return toast.error("No ranges found");

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
          await labConfigService.setPanelRangeOverride(
            panelId,
            finalTestId,
            { override_range: [data] },
            finalToken
          );
        else
          await labConfigService.createNormalRange(finalTestId, data, finalToken);
      }
      toast.success("✅ Ranges copied");
      await loadAll();
    } catch (err) {
      toast.error("Copy failed");
    }
  };

  const resetForm = () =>
    setNewRange({
      range_type: "numeric",
      gender: "Any",
      min_value: "",
      max_value: "",
      qualitative_value: "",
      symbol_operator: "",
      note: "",
      unit_id: "",
      min_age: "",
      max_age: "",
    });

  // ============================================================
  // UI RENDER
  // ============================================================
  if (loading)
    return (
      <div className="p-6 flex justify-center text-gray-500">Loading...</div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      {!panelId && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-blue-700 flex items-center gap-1"
            >
              <HiArrowLeft /> Back
            </button>
            <h1 className="text-2xl font-semibold">
              🧬 Configure Reference Ranges —{" "}
              <span className="text-blue-700">{finalTestName}</span>
            </h1>
          </div>
        </div>
      )}

      {/* COPY PANEL */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between mb-3">
          <h2 className="font-medium text-lg">
            {panelId ? "Panel Override Ranges" : "Add New Reference Range"}
          </h2>
          <button
            onClick={() => setShowCopy((p) => !p)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-700"
          >
            <HiDuplicate /> {showCopy ? "Hide Copy" : "Copy from Analyte"}
          </button>
        </div>

        {showCopy && (
          <div className="flex items-center gap-2 mb-4">
            <select
              value={copyFromId}
              onChange={(e) => setCopyFromId(e.target.value)}
              className="border p-2 rounded-lg flex-1"
            >
              <option value="">Select analyte</option>
              {allAnalytes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <HiDuplicate /> Copy
            </button>
          </div>
        )}

        {/* ADD RANGE FORM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={newRange.range_type}
            onChange={(e) => handleChange("range_type", e.target.value)}
            className="border p-2 rounded"
          >
            <option value="numeric">Numeric</option>
            <option value="qualitative">Qualitative</option>
          </select>

          {newRange.range_type === "numeric" ? (
            <>
              <input
                type="number"
                placeholder="Min"
                value={newRange.min_value}
                onChange={(e) => handleChange("min_value", e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="number"
                placeholder="Max"
                value={newRange.max_value}
                onChange={(e) => handleChange("max_value", e.target.value)}
                className="border p-2 rounded"
              />
            </>
          ) : (
            <input
              type="text"
              placeholder="Qualitative Value"
              value={newRange.qualitative_value}
              onChange={(e) =>
                handleChange("qualitative_value", e.target.value)
              }
              className="border p-2 rounded col-span-2"
            />
          )}

          <select
            value={newRange.unit_id}
            onChange={(e) => handleChange("unit_id", e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.symbol || u.unit_name}
              </option>
            ))}
          </select>

          <select
            value={newRange.gender}
            onChange={(e) => handleChange("gender", e.target.value)}
            className="border p-2 rounded"
          >
            <option value="Any">Any</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <input
            type="number"
            placeholder="Min Age"
            value={newRange.min_age}
            onChange={(e) => handleChange("min_age", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Max Age"
            value={newRange.max_age}
            onChange={(e) => handleChange("max_age", e.target.value)}
            className="border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Note"
            value={newRange.note}
            onChange={(e) => handleChange("note", e.target.value)}
            className="border p-2 rounded md:col-span-2"
          />

          <button
            onClick={handleAdd}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <HiPlusCircle /> Add
          </button>
        </div>
      </div>

      {/* RANGES TABLE */}
      <div className="bg-white p-4 border rounded-lg">
        <h2 className="font-medium text-lg mb-2">
          {panelId ? "Overrides" : "Existing Ranges"}
        </h2>
        {ranges.length === 0 ? (
          <p className="text-gray-500">No ranges found.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Type</th>
                <th className="border p-2">Gender</th>
                <th className="border p-2">Age</th>
                <th className="border p-2">Value(s)</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Note</th>
                <th className="border p-2 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((r) => (
                <tr key={r.id || r.range_label} className="hover:bg-gray-50">
                  <td className="border p-2">{r.range_type}</td>
                  <td className="border p-2">{r.gender}</td>
                  <td className="border p-2">
                    {r.min_age ?? "–"}–{r.max_age ?? "–"}
                  </td>
                  <td className="border p-2 text-center">
                    {r.range_type === "numeric"
                      ? `${r.min_value ?? ""}–${r.max_value ?? ""}`
                      : r.qualitative_value}
                  </td>
                  <td className="border p-2">{r.unit_symbol || "—"}</td>
                  <td className="border p-2">{r.note || "—"}</td>
                  <td className="border p-2 text-center flex justify-center gap-2">
                    <button
                      onClick={() => setEditRange(r)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <HiPencil />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <HiTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editRange && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="flex justify-between mb-4">
                <h2 className="text-lg font-semibold">Edit Range</h2>
                <button onClick={() => setEditRange(null)}>
                  <HiX className="text-xl" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editRange.gender}
                  onChange={(e) =>
                    setEditRange({ ...editRange, gender: e.target.value })
                  }
                  className="border p-2 rounded"
                >
                  <option value="Any">Any</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                <input
                  type="text"
                  placeholder="Note"
                  value={editRange.note || ""}
                  onChange={(e) =>
                    setEditRange({ ...editRange, note: e.target.value })
                  }
                  className="border p-2 rounded col-span-2"
                />
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setEditRange(null)}
                  className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <HiSave /> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {onClose && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default TestRangeConfigurator;
