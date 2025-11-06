import React, { useState, useEffect } from "react";
import labConfigService from "../../services/labConfigService";
import toast from "react-hot-toast";
import { HiX, HiTrash, HiPlus } from "react-icons/hi";

const RangeConfigModal = ({ test, onClose, token }) => {
  const [ranges, setRanges] = useState([]);
  const [form, setForm] = useState({
    range_type: "numeric", // numeric | qualitative | symbol
    gender: "Any",
    age_min: "",
    age_max: "",
    min_value: "",
    max_value: "",
    symbol_operator: "",
    qualitative_value: "",
    note: "",
  });

  const fetchRanges = async () => {
    try {
      const data = await labConfigService.getNormalRanges(test.id, token);
      setRanges(data);
    } catch {
      toast.error("Failed to load ranges");
    }
  };

  useEffect(() => {
    if (test) fetchRanges();
  }, [test]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async () => {
    try {
      const payload = { ...form, test_id: test.id };
      await labConfigService.createNormalRange(payload, token);
      toast.success("Range added!");
      await fetchRanges();
      setForm({
        range_type: "numeric",
        gender: "Any",
        age_min: "",
        age_max: "",
        min_value: "",
        max_value: "",
        symbol_operator: "",
        qualitative_value: "",
        note: "",
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this range?")) return;
    try {
      await labConfigService.deleteNormalRange(id, token);
      toast.success("Range deleted!");
      await fetchRanges();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
        >
          <HiX size={22} />
        </button>

        <h2 className="text-xl font-bold mb-2">
          Configure Reference Ranges for {test.test_name}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Department: {test.department || "N/A"} | Unit:{" "}
          {test.unit_symbol || "-"}
        </p>

        {/* Range Form */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <select
            name="range_type"
            value={form.range_type}
            onChange={handleChange}
            className="border rounded-md p-2"
          >
            <option value="numeric">Numeric (min–max)</option>
            <option value="symbol">Symbolic (&lt; &gt; ≤ ≥)</option>
            <option value="qualitative">Qualitative (e.g. Positive/Negative)</option>
          </select>

          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="border rounded-md p-2"
          >
            <option value="Any">Any</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <input
            type="number"
            name="age_min"
            value={form.age_min}
            onChange={handleChange}
            placeholder="Min Age"
            className="border rounded-md p-2"
          />

          <input
            type="number"
            name="age_max"
            value={form.age_max}
            onChange={handleChange}
            placeholder="Max Age"
            className="border rounded-md p-2"
          />

          {form.range_type === "numeric" && (
            <>
              <input
                type="number"
                name="min_value"
                value={form.min_value}
                onChange={handleChange}
                placeholder="Min Value"
                className="border rounded-md p-2"
              />
              <input
                type="number"
                name="max_value"
                value={form.max_value}
                onChange={handleChange}
                placeholder="Max Value"
                className="border rounded-md p-2"
              />
            </>
          )}

          {form.range_type === "symbol" && (
            <>
              <select
                name="symbol_operator"
                value={form.symbol_operator}
                onChange={handleChange}
                className="border rounded-md p-2"
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value="≥">≥</option>
                <option value="≤">≤</option>
              </select>
              <input
                type="number"
                name="max_value"
                value={form.max_value}
                onChange={handleChange}
                placeholder="Value"
                className="border rounded-md p-2"
              />
            </>
          )}

          {form.range_type === "qualitative" && (
            <input
              type="text"
              name="qualitative_value"
              value={form.qualitative_value}
              onChange={handleChange}
              placeholder="Positive / Negative"
              className="border rounded-md p-2 col-span-2"
            />
          )}

          <input
            type="text"
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Note"
            className="border rounded-md p-2 col-span-2"
          />
        </div>

        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-green-700"
        >
          <HiPlus /> Add Range
        </button>

        {/* Range List */}
        <div className="mt-5">
          <h3 className="font-semibold mb-2">Existing Ranges</h3>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Gender</th>
                <th className="p-2 text-left">Age Range</th>
                <th className="p-2 text-left">Reference</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {ranges.length > 0 ? (
                ranges.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.range_type}</td>
                    <td className="p-2">{r.gender}</td>
                    <td className="p-2">
                      {r.age_min ? `${r.age_min} - ${r.age_max}` : "-"}
                    </td>
                    <td className="p-2">
                      {r.min_value && r.max_value
                        ? `${r.min_value} - ${r.max_value}`
                        : r.symbol_operator || r.qualitative_value || "-"}
                    </td>
                    <td className="p-2">{r.note || "-"}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <HiTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-gray-400 p-4">
                    No ranges defined yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RangeConfigModal;
