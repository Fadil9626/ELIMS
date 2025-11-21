import React, { useState, useEffect } from "react";
import apiFetch from "../../services/apiFetch"; 
import AddEditStaffModal from "../../components/admin/AddEditStaffModal";
import ConfirmModal from "../../components/layout/ConfirmModal";
import { HiPencil, HiTrash, HiPlus } from "react-icons/hi";
import { toast } from "react-hot-toast"; 

// ============================================================
// HELPER COMPONENT
// ============================================================

const RoleBadge = ({ name, core }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full text-[11px] px-2 py-0.5 ring-1 ${
      core
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
    }`}
  >
    {name}
  </span>
);

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // --- Data Fetching ---

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/users");
      // Handle if users are wrapped in 'items' too, just in case
      const data = Array.isArray(response) ? response : (response.items || response.data || []);
      setStaff(data);
    } catch (err) {
      setError(err.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 FINAL FIXED VERSION
  const fetchRoles = async () => {
    try {
      const response = await apiFetch("/api/roles");
      
      let list = [];

      // 1. The Fix: Check for 'items' (based on your screenshot)
      if (response && Array.isArray(response.items)) {
        list = response.items;
      } 
      // 2. Standard array check
      else if (Array.isArray(response)) {
        list = response;
      } 
      // 3. Standard 'data' wrapper check
      else if (response && Array.isArray(response.data)) {
        list = response.data;
      }

      setRoles(list);
    } catch (e) {
      console.error("Failed to load roles", e);
      toast.error("Could not load roles list");
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiFetch("/api/departments");
      // Check for items here too for consistency
      const list = Array.isArray(response) ? response : (response.items || response.data || []);
      setDepartments(list);
    } catch (e) {
      console.error("Failed to load departments", e);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchStaff(),
      fetchRoles(),
      fetchDepartments()
    ]);
  }, []); 

  // --- Modal Handlers ---

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setIsEditModalOpen(false);
  };

  const handleSaveUser = async (formData, userId) => {
    try {
      if (userId) {
        await apiFetch(`/api/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiFetch("/api/users", {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      handleCloseModal();
      fetchStaff(); 
      toast.success(userId ? "User updated successfully!" : "User created successfully!");
    } catch (err) {
      toast.error(`Failed to save staff: ${err.message}`);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await apiFetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      fetchStaff(); 
      toast.success("User deleted.");
    } catch {
      toast.error("Failed to delete user.");
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  // --- Render Logic ---

  const departmentMap = departments.reduce((map, dept) => {
    map[String(dept.id)] = dept.name; 
    return map;
  }, {});


  if (loading)
    return <div className="text-gray-600 text-sm p-4">Loading staff...</div>;
  if (error)
    return <div className="text-red-500 text-sm p-4">⚠ {error}</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center bg-gradient-to-r from-indigo-50 via-white to-rose-50 ring-1 ring-gray-200 rounded-2xl p-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Staff Management
          </h2>
          <p className="text-sm text-gray-600">
            Manage user accounts, assign roles, and control access.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <HiPlus className="h-5 w-5" /> Add Staff
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-700 font-medium">
            <tr>
              <th className="p-3 rounded-l-lg">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Department</th> 
              <th className="p-3 text-center rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((user) => {
                
                const userDeptId = user.department_id || user.dept_id || user.departmentId || user.department?.id;
                const finalDeptName = (user.department_name && user.department_name !== 'N/A')
                    ? user.department_name 
                    : departmentMap[String(userDeptId)] || 'N/A'; 

                return (
                <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                >
                    <td className="p-3 font-medium text-gray-900">{user.full_name}</td>
                    <td className="p-3 text-gray-600">{user.email}</td>
                    <td className="p-3">
                      {Array.isArray(user.roles) && user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => (
                            <RoleBadge key={r.id || r.name} name={r.name} core={r.id <= 6} /> 
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          {user.role_name || "No roles assigned"}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-gray-600">
                      {finalDeptName}
                    </td>

                    <td className="p-3 text-center flex gap-2 justify-center">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                        title="Edit User"
                      >
                        <HiPencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                        title="Delete User"
                      >
                        <HiTrash size={18} />
                      </button>
                    </td>
                </tr>
                );
            })}
            {!staff.length && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-gray-500 text-sm py-8"
                >
                  No staff found. Click "Add Staff" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddEditStaffModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveUser}
        userData={editingUser}
        availableRoles={roles}
        availableDepartments={departments}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete User: ${userToDelete?.full_name}`}
        message="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        confirmText="Delete"
      />
    </div>
  );
}