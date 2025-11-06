import React, { useState, useEffect } from "react";
import instrumentsService, {
  getInstruments as listInstruments,
  createInstrument,
  updateInstrument,
  deleteInstrument,
} from "../../services/instrumentsService";
import { HiPencil, HiTrash, HiPlus } from "react-icons/hi";

const CONNECTION_TYPES = ["TCP", "Serial", "File"];

const emptyForm = {
  name: "",
  vendor: "",
  model: "",
  connection: "TCP", // maps to backend column "connection"
  host: "",
  port: "",
};

const InstrumentsManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // Load instruments
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // either style works due to default + named exports:
      // const data = await instrumentsService.getInstruments({ limit: 200 });
      const data = await listInstruments({ limit: 200 });
      // backend returns { total, limit, offset, items: [...] }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e.message || "Failed to fetch instruments");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Add or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name?.trim(),
        vendor: form.vendor?.trim() || null,
        model: form.model?.trim() || null,
        connection: form.connection || "TCP",
        host: form.host?.trim() || null,
        port: form.port ? Number(form.port) : null,
      };

      if (!payload.name) {
        setSaving(false);
        return setError("Instrument name is required.");
      }

      if (editingId) {
        await updateInstrument(editingId, payload);
      } else {
        await createInstrument(payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (inst) => {
    setEditingId(inst.id);
    setForm({
      name: inst.name || "",
      vendor: inst.vendor || "",
      model: inst.model || "",
      connection: inst.connection || "TCP",
      host: inst.host || "",
      port: inst.port ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this instrument?")) return;
    try {
      await deleteInstrument(id);
      await load();
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Instruments & Integration</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white py-2 px-3 rounded-md"
          title="Add new"
        >
          <HiPlus /> New
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold">
          {editingId ? "Edit Instrument" : "Add New Instrument"}
        </h3>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Instrument Name (e.g., Mindray BS-240)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full p-2 border rounded-md"
            required
          />
          <input
            type="text"
            placeholder="Vendor (e.g., Mindray)"
            value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Model (e.g., BS-240)"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full p-2 border rounded-md"
          />
          <select
            value={form.connection}
            onChange={(e) => setForm({ ...form, connection: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            {CONNECTION_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Port (if TCP)"
            value={form.port}
            onChange={(e) => setForm({ ...form, port: e.target.value })}
            className="w-full p-2 border rounded-md"
            min="1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Host/IP (if TCP)"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Instrument" : "Add Instrument"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="py-2 px-4 rounded-md border"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <h3 className="text-xl font-semibold mb-4">Configured Instruments</h3>

      {loading ? (
        <div>Loading instruments...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Vendor / Model</th>
                <th className="p-3">Connection</th>
                <th className="p-3">Host:Port</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inst) => (
                <tr key={inst.id} className="border-b">
                  <td className="p-3 font-semibold">{inst.name}</td>
                  <td className="p-3">
                    {inst.vendor || "-"} {inst.model ? `• ${inst.model}` : ""}
                  </td>
                  <td className="p-3">{inst.connection || "-"}</td>
                  <td className="p-3">
                    {inst.host || "-"}
                    {inst.port ? `:${inst.port}` : ""}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="Edit"
                        onClick={() => startEdit(inst)}
                      >
                        <HiPencil />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:text-red-600"
                        title="Delete"
                        onClick={() => handleDelete(inst.id)}
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={5}>
                    No instruments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InstrumentsManager;
