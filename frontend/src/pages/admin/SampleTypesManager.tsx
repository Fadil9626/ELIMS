import React, { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  XCircle,
  FlaskConical, // Switched from FlaskRound to match your code
} from "lucide-react";
import labConfigService from "../../services/labConfigService";
import toast from "react-hot-toast";

// Define the SampleType interface locally
interface SampleType {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string; // Added for completeness if present
}

const SampleTypesManager: React.FC = () => {
  const [samples, setSamples] = useState<SampleType[]>([]);
  const [form, setForm] = useState<Partial<SampleType>>({
    name: "",
    description: "",
  });
  const [editing, setEditing] = useState<SampleType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For form submission
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

  useEffect(() => {
    fetchSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSamples = async () => {
    if (!userInfo.token) {
      toast.error("Not authenticated.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await labConfigService.getSampleTypes(userInfo.token);
      setSamples(data || []); // Ensure array
    } catch (err: any) {
      toast.error(`Failed to load sample types: ${err.message || "Unknown error"}`);
      setSamples([]); // Ensure array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error("Name is required");
    if (!userInfo.token) return toast.error("Not authenticated.");

    setIsSubmitting(true);
    try {
      if (editing) {
        await labConfigService.updateSampleType(
          editing.id,
          form,
          userInfo.token
        );
        toast.success("Sample type updated");
      } else {
        await labConfigService.createSampleType(form, userInfo.token);
        toast.success("Sample type added");
      }
      setForm({ name: "", description: "" });
      setEditing(null);
      fetchSamples(); // Re-fetch the list
    } catch (err: any) {
      toast.error(`Error saving sample type: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!userInfo.token) return toast.error("Not authenticated.");
    if (!window.confirm("Delete this sample type? This cannot be undone.")) return;
    
    try {
      await labConfigService.deleteSampleType(id, userInfo.token);
      toast.success("Sample type deleted");
      fetchSamples(); // Re-fetch the list
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message || "Unknown error"}`);
    }
  };
  
  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
  };

  return (
    <div className="bg-white rounded-xl shadow-md border p-6 max-w-4xl">
      <div className="flex items-center mb-4 gap-2">
        <FlaskConical className="text-blue-600" />
        <h2 className="text-xl font-semibold">Sample Type Configuration</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          placeholder="Sample Type (e.g., Serum)"
          value={form.name || ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2.5 rounded-lg w-full sm:w-1/3 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="border p-2.5 rounded-lg w-full sm:flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center disabled:bg-blue-300"
        >
          {editing ? <Save size={18} /> : <PlusCircle size={18} />}
          <span className="ml-1">{editing ? "Update" : "Add"}</span>
        </button>
        {editing && (
          <button
            onClick={resetForm}
            type="button"
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center justify-center"
          >
            <XCircle size={18} />
            <span className="ml-1">Cancel</span>
          </button>
        )}
      </form>

      {loading ? (
        <p>Loading sample types...</p>
      ) : (
        <motion.table
          className="min-w-full border border-gray-200 rounded-lg text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 border-b text-left text-sm font-medium text-gray-600">#</th>
              <th className="p-3 border-b text-left text-sm font-medium text-gray-600">Name</th>
              <th className="p-3 border-b text-left text-sm font-medium text-gray-600">Description</th>
              <th className="p-3 border-b text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {samples.map((s, i) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-gray-600">{s.description || "—"}</td>
                <td className="p-3 text-center space-x-3">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setForm({ name: s.name, description: s.description });
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {samples.length === 0 && (
               <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">
                  No sample types configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </motion.table>
      )}
    </div>
  );
};

export default SampleTypesManager;