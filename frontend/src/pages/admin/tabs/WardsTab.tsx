import React, { useEffect, useState, FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  BedDouble,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../../services/labConfigService";

interface Ward {
  id: number;
  name: string;
  type: string;
  created_at?: string;
}

// 🚀 DEFAULT MOCK DATA SET (Unchanged)
const DEFAULT_MOCK_WARDS = [
  {
    id: 1,
    name: "General Ward A",
    type: "General",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Intensive Care Unit",
    type: "ICU",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Pediatric Wing",
    type: "Pediatric",
    created_at: new Date().toISOString(),
  },
];

// 🚀 MOCK SERVICE FOR DEVELOPMENT (Unchanged)
const MOCK_STORAGE_KEY = "db_mock_wards";

const MOCK_WARDS_SERVICE = {
  initialize: () => {
    const stored = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(
        MOCK_STORAGE_KEY,
        JSON.stringify(DEFAULT_MOCK_WARDS)
      );
      return true;
    }
    return false;
  },
  getWards: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const stored = localStorage.getItem(MOCK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },
  createWard: async (data: Partial<Ward>) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const stored = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || "[]");
    const newWard = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    const updated = [...stored, newWard];
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
    return newWard;
  },
  updateWard: async (id: number, data: Partial<Ward>) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const stored: Ward[] = JSON.parse(
      localStorage.getItem(MOCK_STORAGE_KEY) || "[]"
    );
    const updated = stored.map((w) => (w.id === id ? { ...w, ...data } : w));
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
    return updated.find((w) => w.id === id);
  },
  deleteWard: async (id: number) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const stored: Ward[] = JSON.parse(
      localStorage.getItem(MOCK_STORAGE_KEY) || "[]"
    );
    const updated = stored.filter((w) => w.id !== id);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
    return true;
  },
};

// -------------------------------------------------------------
// 🔐 AUTH TOKEN HELPER – use same storage as the rest of ELIMS
// -------------------------------------------------------------
const getAuthToken = () => {
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (!raw) return { token: null as string | null, name: null as string | null };

    const parsed = JSON.parse(raw);
    const token: string | null =
      parsed.token || parsed.accessToken || parsed.access_token || null;
    const name: string | null =
      parsed.full_name ||
      parsed.user?.full_name ||
      parsed.user?.name ||
      "User";

    return { token, name };
  } catch (e) {
    console.error("Failed to parse elims_auth_v1:", e);
    return { token: null as string | null, name: null as string | null };
  }
};

// -------------------------------------------------------------
// 🗑️ CONFIRMATION MODAL COMPONENT (Unchanged)
// -------------------------------------------------------------
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isDeleting: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isDeleting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Deletion
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete the ward:
                <span className="font-bold text-red-600 ml-1">
                  "{itemName}"
                </span>
                ? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end p-4 bg-gray-50 rounded-b-xl border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition mr-3"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition flex items-center justify-center disabled:bg-red-400"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Trash2 size={16} className="mr-2" />
            )}
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// ⚙️ WARDS TAB MAIN COMPONENT
// -------------------------------------------------------------
const WardsTab: React.FC = () => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [formData, setFormData] = useState<Partial<Ward>>({
    name: "",
    type: "General",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wardToDeleteId, setWardToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const userInfo = getAuthToken();
  const isMockMode = !userInfo.token;
  const service = isMockMode ? MOCK_WARDS_SERVICE : labConfigService;

  const fetchWards = async () => {
    setLoading(true);

    try {
      let data: Ward[] = [];
      if (isMockMode) {
        // --- MOCK PATH ---
        MOCK_WARDS_SERVICE.initialize();
        data = await MOCK_WARDS_SERVICE.getWards();
      } else {
        // --- REAL API CALL PATH ---
        data = await service.getWards(userInfo.token);
        // Clean mock data since we're using real DB now
        localStorage.removeItem(MOCK_STORAGE_KEY);
        toast.success(`Successfully loaded ${data.length} wards from database.`);
      }
      setWards(data || []);
    } catch (error) {
      console.error("Failed to fetch wards:", error);
      toast.error(
        isMockMode
          ? "Could not load mock wards data."
          : "Error loading wards from server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once when component mounts

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return toast.error("Ward name is required.");

    if (!isMockMode && !userInfo.token) {
      return toast.error("Authentication missing. Cannot save.");
    }

    try {
      setLoading(true);
      if (editingWard) {
        await service.updateWard(editingWard.id, formData, userInfo.token);
        toast.success("Ward updated successfully");
      } else {
        await service.createWard(formData, userInfo.token);
        toast.success("Ward added successfully");
      }
      resetForm();
      fetchWards();
    } catch (error: any) {
      console.error("Error saving ward:", error);
      toast.error(error?.message || "Error saving ward");
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setWardToDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!wardToDeleteId) return;

    if (!isMockMode && !userInfo.token) {
      toast.error("Authentication missing. Cannot delete.");
      return;
    }

    try {
      setIsDeleting(true);
      await service.deleteWard(wardToDeleteId, userInfo.token);
      toast.success("Ward deleted");
      setShowDeleteModal(false);
      setWardToDeleteId(null);
      fetchWards();
    } catch (error) {
      console.error("Failed to delete ward:", error);
      toast.error("Failed to delete ward");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (ward: Ward) => {
    setEditingWard(ward);
    setFormData({ name: ward.name, type: ward.type || "General" });
  };

  const resetForm = () => {
    setEditingWard(null);
    setFormData({ name: "", type: "General" });
  };

  const wardToDelete = wards.find((w) => w.id === wardToDeleteId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Add/Edit Form Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BedDouble className="text-blue-600" size={20} />
            {editingWard ? "Edit Ward" : "Add New Ward"}
          </h3>
          {isMockMode && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 p-1.5 rounded-full flex items-center gap-1">
              <AlertCircle size={12} />
              MOCK MODE ACTIVE
            </span>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        >
          <div className="md:col-span-6">
            <label className="text-xs font-medium text-gray-500 mb-1 block ml-1">
              Ward Name
            </label>
            <input
              type="text"
              className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. North Wing A"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-medium text-gray-500 mb-1 block ml-1">
              Ward Type
            </label>
            <select
              className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
              value={formData.type || "General"}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
            >
              <option value="General">General</option>
              <option value="ICU">ICU</option>
              <option value="Private">Private</option>
              <option value="Emergency">Emergency</option>
              <option value="Maternity">Maternity</option>
              <option value="Pediatric">Pediatric</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white p-2.5 rounded-lg flex items-center justify-center font-medium transition-colors shadow-sm active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed ${
                editingWard
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : editingWard ? (
                <Save size={18} />
              ) : (
                <Plus size={18} />
              )}
              <span className="ml-2">
                {loading
                  ? "Processing..."
                  : editingWard
                  ? "Save"
                  : "Add"}
              </span>
            </button>

            {editingWard && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2.5 rounded-lg transition-colors"
                title="Cancel"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Registered Wards List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-medium text-gray-700">Registered Wards</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {wards.length} Total
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mb-2 text-blue-500" size={32} />
            <span className="text-sm">Loading wards...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">
                    Ward Name
                  </th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {wards.length > 0 ? (
                  wards.map((ward) => (
                    <tr
                      key={ward.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            ward.type === "ICU"
                              ? "bg-red-50 text-red-600"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          <BedDouble size={16} />
                        </div>
                        {ward.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                            ward.type === "ICU"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : ward.type === "Maternity"
                              ? "bg-pink-50 text-pink-700 border-pink-100"
                              : ward.type === "Emergency"
                              ? "bg-orange-50 text-orange-700 border-orange-100"
                              : "bg-blue-50 text-blue-700 border-blue-100"
                          }`}
                        >
                          {ward.type || "General"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(ward)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(ward.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                            disabled={isDeleting}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-gray-400 text-sm bg-gray-50/30"
                    >
                      <div className="flex flex-col items-center">
                        <AlertCircle className="mb-2 opacity-20" size={32} />
                        <p>No wards configured yet.</p>
                        <p className="text-xs mt-1">
                          Use the form above to add your first ward.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🗑️ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName={wardToDelete?.name || "this ward"}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default WardsTab;
