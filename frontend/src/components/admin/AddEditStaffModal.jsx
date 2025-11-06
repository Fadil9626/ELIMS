import React, { useState, useEffect } from "react";
import rolesService from "../../services/rolesService";
import { HiChevronDown, HiChevronUp, HiShieldCheck } from "react-icons/hi";

const AddEditStaffModal = ({ isOpen, onClose, onSave, userData }) => {
  const isEditMode = !!userData;

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    roleIds: [],
  });

  const [roles, setRoles] = useState([]);
  const [permissionsView, setPermissionsView] = useState(false);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const token = JSON.parse(localStorage.getItem("userInfo"))?.token || null;

  useEffect(() => {
    if (isOpen) {
      (async () => {
        setLoadingRoles(true);
        try {
          const list = await rolesService.listRoles(token);
          if (Array.isArray(list) && list.length > 0) setRoles(list);
          else
            setRoles([
              { id: 1, name: "Super Administrator" },
              { id: 2, name: "Administrator" },
              { id: 3, name: "Pathologist" },
              { id: 4, name: "Receptionist" },
              { id: 5, name: "Doctor" },
              { id: 6, name: "Phlebotomist" },
            ]);
        } catch {
          setRoles([
            { id: 1, name: "Super Administrator" },
            { id: 2, name: "Administrator" },
            { id: 3, name: "Pathologist" },
            { id: 4, name: "Receptionist" },
            { id: 5, name: "Doctor" },
            { id: 6, name: "Phlebotomist" },
          ]);
        } finally {
          setLoadingRoles(false);
        }
      })();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setFormData({
          fullName: userData.full_name || "",
          email: userData.email || "",
          password: "",
          roleIds: Array.isArray(userData.roles)
            ? userData.roles.map((r) => r.id)
            : userData.role_id
            ? [userData.role_id]
            : [],
        });
      } else {
        setFormData({ fullName: "", email: "", password: "", roleIds: [] });
      }
    }
  }, [isOpen, userData, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (opt) =>
      parseInt(opt.value, 10)
    );
    setFormData({ ...formData, roleIds: selected });
  };

  const loadPermissions = async () => {
    if (!formData.roleIds.length) return;
    setLoadingPerms(true);
    const perms = {};
    for (const id of formData.roleIds) {
      try {
        const grants = await rolesService.getRolePermissions(id, token);
        perms[id] = grants;
      } catch {
        perms[id] = [];
      }
    }
    setRolePermissions(perms);
    setLoadingPerms(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      full_name: formData.fullName?.trim() || userData?.full_name || "",
      email: formData.email?.trim(),
      role_ids: formData.roleIds,
    };
    if (!isEditMode && formData.password?.trim()) {
      payload.password = formData.password.trim();
    }
    onSave(payload, userData?.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 ring-1 ring-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          {isEditMode ? "Edit Staff Member" : "Add New Staff"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email Address"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          {!isEditMode && (
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Initial Password"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Role(s)
            </label>
            {loadingRoles ? (
              <div className="text-sm text-gray-500 border border-gray-300 rounded-md p-2 bg-gray-50">
                Loading roles…
              </div>
            ) : (
              <select
                name="roleIds"
                multiple
                value={formData.roleIds}
                onChange={handleRoleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-32"
                required
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Hold <kbd>Ctrl</kbd> (or <kbd>Cmd</kbd> on Mac) to select multiple.
            </p>
          </div>

          {formData.roleIds.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <button
                type="button"
                disabled={loadingRoles}
                onClick={() => {
                  setPermissionsView(!permissionsView);
                  if (!permissionsView) loadPermissions();
                }}
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
              >
                {permissionsView ? (
                  <>
                    <HiChevronUp className="h-5 w-5" /> Hide Assigned Permissions
                  </>
                ) : (
                  <>
                    <HiChevronDown className="h-5 w-5" /> View Assigned Permissions
                  </>
                )}
              </button>

              {permissionsView && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-56 overflow-y-auto text-sm">
                  {loadingPerms ? (
                    <div className="text-gray-500 italic">
                      Loading permissions…
                    </div>
                  ) : (
                    formData.roleIds.map((rid) => {
                      const role = roles.find((r) => r.id === rid);
                      const grants = rolePermissions[rid] || [];
                      return (
                        <div key={rid} className="mb-2">
                          <div className="font-medium flex items-center gap-1">
                            <HiShieldCheck className="h-4 w-4 text-indigo-500" />
                            {role?.name || "Unknown Role"}
                          </div>
                          {grants.length ? (
                            <ul className="list-disc ml-6 text-gray-600 text-xs mt-1">
                              {grants.map((g, i) => (
                                <li key={i}>
                                  {g.resource}:{" "}
                                  <span className="font-mono">{g.action}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs text-gray-500 ml-6">
                              No permissions found
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              {isEditMode ? "Save Changes" : "Create Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditStaffModal;
