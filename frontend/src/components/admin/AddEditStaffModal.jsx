// frontend/src/components/admin/AddEditStaffModal.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import rolesService from "../../services/rolesService";
import { HiChevronDown, HiChevronUp, HiShieldCheck } from "react-icons/hi";

const AddEditStaffModal = ({
  isOpen,
  onClose,
  onSave,
  userData,
  availableRoles = [],
  availableDepartments = [], 
}) => {
  const isEditMode = !!userData;

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    department: "", // Will hold the Department ID (as a string)
    roleIds: [],
  });

  const [roles, setRoles] = useState([]); // always an array
  const [permissionsView, setPermissionsView] = useState(false);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const token = JSON.parse(localStorage.getItem("userInfo"))?.token || null;

  // --- 1. Fetch Roles on Open ---
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoadingRoles(true);
      try {
        const list = await rolesService.listRoles(token);
        const normalized = Array.isArray(list) ? list : [];
        setRoles(normalized);
      } catch {
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    })();
  }, [isOpen, token]);

  // --- 2. Initialize Form Data ---
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && userData) {
      // FIX 1: Reliably extract the Department ID from various user object structures
      const deptId = userData.department_id || userData.department?.id || null;
      
      setFormData({
        fullName: userData.full_name || "",
        email: userData.email || "",
        password: "",
        // FIX 2: Set the department value as the ID (stringified) for the select input
        department: deptId ? String(deptId) : "", 
        roleIds: Array.isArray(userData.roles)
          ? userData.roles.map((r) => r.id).filter(id => Number.isFinite(id))
          : [],
      });
    } else {
      setFormData({ fullName: "", email: "", password: "", department: "", roleIds: [] });
    }
  }, [isOpen, isEditMode, userData]); // availableDepartments removed from deps as it's safe now

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (opt) =>
      parseInt(opt.value, 10)
    ).filter((n) => Number.isFinite(n));
    setFormData({ ...formData, roleIds: selected });
  };

  // --- 3. Permission Loader ---
  const loadPermissions = async () => {
    if (!formData.roleIds.length) {
      setRolePermissions({});
      return;
    }
    setLoadingPerms(true);
    const perms = {};
    for (const id of formData.roleIds) {
      try {
        const grants = await rolesService.getRolePermissions(id, token);
        
        const slugs = (Array.isArray(grants) ? grants : [])
            .map(g => {
                if (typeof g === 'string') return g;
                if (g && g.resource && g.action) return `${g.resource}:${g.action}`;
                return null;
            })
            .filter(Boolean); 
            
        perms[id] = slugs;
      } catch {
        perms[id] = [];
      }
    }
    setRolePermissions(perms);
    setLoadingPerms(false);
  };

  // Run loadPermissions whenever roleIds change
  useEffect(() => {
    if (isOpen && permissionsView) { // Only load if visible
        loadPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.roleIds.join(), isOpen]);


  // Helper to process and merge the permission slugs for display
  const allMergedPermissions = useMemo(() => {
      const mergedSlugs = {};
      Object.values(rolePermissions).flat().forEach(slug => {
          if (slug) {
              const [resource, action] = slug.split(':');
              if (resource && action) {
                  if (!mergedSlugs[resource]) mergedSlugs[resource] = new Set();
                  mergedSlugs[resource].add(action);
              }
          }
      });
      return mergedSlugs;
  }, [rolePermissions]);


  const handleSubmit = (e) => {
    e.preventDefault();

    // FIX 3: Get the department ID from the form state (which contains the ID)
    const departmentIdToSend = formData.department ? Number(formData.department) : null;
    
    const payload = {
      full_name: formData.fullName?.trim() || userData?.full_name || "",
      email: formData.email?.trim(),
      // FIX 4: Send the numerical department_id to the backend
      department_id: departmentIdToSend, 
      role_ids: formData.roleIds, 
    };

    if (!isEditMode && formData.password?.trim()) {
      payload.password = formData.password.trim();
    }
    onSave(payload, userData?.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 backdrop-blur-sm">
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

          {/* Department dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Department
            </label>
            <select
              name="department"
              // Value is now the ID (as a string) for correct matching
              value={formData.department}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!availableDepartments.length}
            >
              <option value="">{availableDepartments.length ? "Select a department..." : "Loading departments..."}</option>
              {availableDepartments.map((dept) => (
                // FIX 5: Set option value to the department ID
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Roles multiselect */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Role(s)
            </label>
            {loadingRoles ? (
              <div className="text-sm text-gray-500 border border-gray-300 rounded-md p-2 bg-gray-50">
                Loading roles…
              </div>
            ) : roles.length ? (
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
                    {role.name} {role.core ? " (System)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-rose-600">
                No roles available. Create roles first in RBAC.
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Hold <kbd>Ctrl</kbd> (or <kbd>Cmd</kbd> on Mac) to select multiple.
            </p>
          </div>

          {formData.roleIds.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  const willOpen = !permissionsView;
                  setPermissionsView(willOpen);
                  if (willOpen) loadPermissions();
                }}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
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
                    <div className="text-gray-500 italic">Loading permissions…</div>
                  ) : (
                      Object.entries(allMergedPermissions).map(([resource, actions]) => (
                          <div key={resource} className="mb-2">
                              <div className="font-medium flex items-center gap-1 mt-2">
                                <HiShieldCheck className="h-4 w-4 text-indigo-500" />
                                {resource.charAt(0).toUpperCase() + resource.slice(1)}
                              </div>
                              <ul className="list-disc ml-6 text-gray-600 text-xs mt-1 grid grid-cols-2">
                                  {Array.from(actions).map((action) => (
                                      <li key={`${resource}:${action}`}>
                                          <span className="font-mono">{action}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      ))
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