// frontend/src/pages/admin/StaffManagementPage.jsx
import React, { useState, useEffect } from "react";
import userService from "../../services/userService";
import rolesService from "../../services/rolesService";
import AddEditStaffModal from "../../components/admin/AddEditStaffModal";
import ConfirmModal from "../../components/layout/ConfirmModal";
import { HiPencil, HiTrash, HiUserGroup, HiPlus } from "react-icons/hi";

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

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const token = JSON.parse(localStorage.getItem("userInfo"))?.token || null;

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers(token);
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const list = await rolesService.listRoles(token);
      setRoles(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load roles", e);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, []);

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
        await userService.updateUser(userId, formData, token);
      } else {
        await userService.createUser(formData, token);
      }
      handleCloseModal();
      fetchStaff();
    } catch (err) {
      alert(`Failed to save staff: ${err.message}`);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await userService.deleteUser(userToDelete.id, token);
      fetchStaff();
    } catch {
      alert("Failed to delete user.");
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

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
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
        >
          <HiPlus className="h-5 w-5" /> Add Staff
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Roles</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((user) => (
              <tr
                key={user.id}
                className="border-b last:border-0 hover:bg-gray-50 transition"
              >
                <td className="p-3">{user.full_name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  {Array.isArray(user.roles) && user.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <RoleBadge key={r.id} name={r.name} core={r.id <= 6} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs italic">
                      {user.role_name || "No roles assigned"}
                    </span>
                  )}
                </td>
                <td className="p-3 text-center flex gap-2 justify-center">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="p-2 text-gray-500 hover:text-indigo-600"
                    title="Edit User"
                  >
                    <HiPencil />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(user)}
                    className="p-2 text-gray-500 hover:text-rose-600"
                    title="Delete User"
                  >
                    <HiTrash />
                  </button>
                </td>
              </tr>
            ))}
            {!staff.length && (
              <tr>
                <td
                  colSpan={4}
                  className="text-center text-gray-500 text-sm py-6"
                >
                  No staff found.
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
