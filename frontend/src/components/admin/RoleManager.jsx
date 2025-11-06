// frontend/src/components/roles/RoleManager.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import rolesService from "../../services/rolesService";
import AddEditRoleModal from "./AddEditRoleModal";
import ConfirmModal from "../layout/ConfirmModal";
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiSearch,
  HiShieldCheck,
  HiUserGroup,
  HiDuplicate,
  HiRefresh,
  HiDownload,
  HiUpload,
  HiCheck,
  HiInformationCircle,
} from "react-icons/hi";

/* --------------------------------- helpers -------------------------------- */

function buildEmptyMatrix(catalog) {
  const m = {};
  for (const p of catalog || []) {
    if (!m[p.resource]) m[p.resource] = {};
    m[p.resource][p.action] = false;
  }
  return m;
}

function cloneMatrix(m) {
  const out = {};
  for (const [res, acts] of Object.entries(m || {})) out[res] = { ...acts };
  return out;
}

function equalMatrix(a, b) {
  const ak = Object.keys(a || {});
  const bk = Object.keys(b || {});
  if (ak.length !== bk.length) return false;
  for (const res of ak) {
    const aRow = a[res] || {};
    const bRow = b[res] || {};
    const aKeys = Object.keys(aRow);
    const bKeys = Object.keys(bRow);
    if (aKeys.length !== bKeys.length) return false;
    for (const action of aKeys) {
      if (!!aRow[action] !== !!bRow[action]) return false;
    }
  }
  return true;
}

function flattenMatrix(m) {
  const out = [];
  for (const [res, acts] of Object.entries(m || {})) {
    for (const [act, v] of Object.entries(acts || {})) if (v) out.push(`${res}:${act}`);
  }
  return out;
}

function markMatrixFromGrants(empty, granted /* array of {resource,action} */) {
  const m = cloneMatrix(empty);
  for (const p of granted || []) {
    if (m[p.resource] && Object.prototype.hasOwnProperty.call(m[p.resource], p.action)) {
      m[p.resource][p.action] = true;
    }
  }
  return m;
}

/** Normalize any backend response to a plain array of roles */
function normalizeRoles(resp) {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.items)) return resp.items; // controller shape
  if (resp && Array.isArray(resp.rows)) return resp.rows;   // raw SQL shape
  if (resp && typeof resp === "object") {
    // last resort: return the first array value found
    for (const v of Object.values(resp)) if (Array.isArray(v)) return v;
  }
  return [];
}

const RoleBadge = ({ core }) =>
  core ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 ring-1 ring-slate-200">
      <HiShieldCheck className="h-3.5 w-3.5" /> System
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2 py-0.5 ring-1 ring-emerald-200">
      Custom
    </span>
  );

/* --------------------------------- component -------------------------------- */

const RoleManager = () => {
  const [roles, setRoles] = useState([]);             // always an array after normalize
  const [catalog, setCatalog] = useState([]);         // [{id,resource,action}]
  const [selectedRole, setSelectedRole] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [banner, setBanner] = useState({ type: "none", msg: "" });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const [query, setQuery] = useState("");
  const importRef = useRef(null);

  // matrices
  const [matrix, setMatrix] = useState({});
  const [original, setOriginal] = useState({});
  const [emptyMatrix, setEmptyMatrix] = useState({});

  const token = useMemo(() => {
    const info = JSON.parse(localStorage.getItem("userInfo"));
    return info?.token || null;
  }, []);

  // System roles quick heuristics (adapt to your ids if needed)
  const isCore = (r) => r?.id <= 6;
  const isSuperAdmin = (r) => r?.id === 1;
  const locked = (r) => isSuperAdmin(r);

  const dirty = useMemo(() => !equalMatrix(matrix, original), [matrix, original]);

  const showBanner = (type, msg, ms = 2500) => {
    setBanner({ type, msg });
    if (ms) setTimeout(() => setBanner({ type: "none", msg: "" }), ms);
  };

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      // 1) permissions catalog
      const cat = await rolesService.getPermissionsCatalog(token);
      const safeCat = Array.isArray(cat) ? cat : [];
      setCatalog(safeCat);
      const empty = buildEmptyMatrix(safeCat);
      setEmptyMatrix(empty);

      // 2) roles list (normalize any shape)
      const raw = await rolesService.listRoles(token);
      const list = normalizeRoles(raw);
      setRoles(list);

      // pick previously selected if still present, else first
      const keep =
        (list.find && selectedRole?.id
          ? list.find((r) => r.id === selectedRole.id)
          : null) || list[0] || null;

      setSelectedRole(keep);

      // 3) selected role's grants -> matrix
      if (keep) {
        const grants = await rolesService.getRolePermissions(keep.id, token); // [{resource,action}]
        const m = markMatrixFromGrants(empty, grants);
        setMatrix(m);
        setOriginal(cloneMatrix(m));
      } else {
        const m = cloneMatrix(empty);
        setMatrix(m);
        setOriginal(m);
      }
    } catch (err) {
      setError(err.message || "Failed to load roles/permissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickRole = async (role) => {
    setSelectedRole(role);
    try {
      const grants = await rolesService.getRolePermissions(role.id, token); // array
      const m = markMatrixFromGrants(emptyMatrix, grants);
      setMatrix(m);
      setOriginal(cloneMatrix(m));
    } catch (e) {
      showBanner("error", e.message || "Failed to load role permissions", 3000);
    }
  };

  const openEdit = (role = null) => {
    setEditingRole(role);
    setIsEditModalOpen(true);
  };
  const closeEdit = () => {
    setEditingRole(null);
    setIsEditModalOpen(false);
  };
  const openDelete = (role) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  const saveRoleName = async (formData, roleId) => {
    try {
      if (roleId) {
        await rolesService.updateRole(roleId, { name: formData.name }, token);
      } else {
        await rolesService.createRole({ name: formData.name }, token);
      }
      closeEdit();
      await loadAll();
      showBanner("success", "Role saved.");
    } catch (e) {
      showBanner("error", e.message || "Failed to save role", 3000);
    }
  };

  const confirmDelete = async () => {
    try {
      await rolesService.deleteRole(roleToDelete.id, token);
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
      await loadAll();
      showBanner("success", "Role deleted.");
    } catch (e) {
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
      showBanner("error", e.message || "Failed to delete role", 3000);
    }
  };

  // toggle a single cell
  const toggleCell = (res, act) => {
    if (locked(selectedRole)) return;
    setMatrix((prev) => ({ ...prev, [res]: { ...prev[res], [act]: !prev[res][act] } }));
  };

  // toggle row
  const toggleRowAll = (res, v) => {
    if (locked(selectedRole)) return;
    setMatrix((prev) => {
      const row = { ...prev[res] };
      Object.keys(row).forEach((a) => (row[a] = v));
      return { ...prev, [res]: row };
    });
  };

  // toggle column
  const toggleColAll = (act, v) => {
    if (locked(selectedRole)) return;
    setMatrix((prev) => {
      const out = {};
      for (const [res, row] of Object.entries(prev)) out[res] = { ...row, [act]: v };
      return out;
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const flat = flattenMatrix(matrix); // ["resource:action"]
      await rolesService.setRolePermissions(selectedRole.id, flat, token);
      setOriginal(cloneMatrix(matrix));
      showBanner("success", "Permissions updated.");
    } catch (e) {
      showBanner("error", e.message || "Failed to save.", 3000);
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => setMatrix(cloneMatrix(original));

  const copyFrom = async (id) => {
    if (!id) return;
    const r = (roles || []).find((x) => x.id === Number(id));
    if (!r) return;
    try {
      const grants = await rolesService.getRolePermissions(r.id, token);
      const m = markMatrixFromGrants(emptyMatrix, grants);
      setMatrix(m);
      showBanner("success", "Copied—review and Save.");
    } catch (e) {
      showBanner("error", e.message || "Copy failed", 3000);
    }
  };

  const exportJSON = () => {
    const payload = {
      role: selectedRole?.name || "",
      permissions: matrix, // export the matrix as-is
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedRole?.name || "role").toLowerCase().replace(/\s+/g, "_")}_permissions.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const txt = await f.text();
      const json = JSON.parse(txt);
      if (!json?.permissions) throw new Error("Invalid file");

      // Only accept keys present in the current catalog
      const clean = cloneMatrix(emptyMatrix);
      for (const [res, acts] of Object.entries(json.permissions || {})) {
        if (!clean[res]) continue;
        for (const [act, v] of Object.entries(acts || {})) {
          if (Object.prototype.hasOwnProperty.call(clean[res], act)) {
            clean[res][act] = !!v;
          }
        }
      }
      setMatrix(clean);
      showBanner("success", "Imported—review and Save.");
    } catch {
      showBanner("error", "Import failed. Use a valid JSON export.", 3500);
    }
  };

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const list = Array.isArray(roles) ? roles : [];
    return q ? list.filter((r) => r?.name?.toLowerCase().includes(q)) : list;
  }, [roles, query]);

  const actions = useMemo(() => {
    const uniq = [];
    for (const p of catalog || []) if (!uniq.includes(p.action)) uniq.push(p.action);
    return uniq;
  }, [catalog]);

  const resources = useMemo(() => {
    const uniq = [];
    for (const p of catalog || []) if (!uniq.includes(p.resource)) uniq.push(p.resource);
    return uniq.sort();
  }, [catalog]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-rose-50 ring-1 ring-gray-200 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Role-Based Access Control</h2>
          <p className="text-sm text-gray-600">Create roles, fine-tune permissions, and keep your system secure.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700"
          >
            <HiPlus className="h-5 w-5" /> New Role
          </button>
        </div>
      </div>

      {banner.type !== "none" && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            banner.type === "success"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          {banner.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: roles list */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4">
          <div className="relative mb-3">
            <HiSearch className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search roles…"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="text-rose-600 text-sm">{error}</div>
          ) : (
            <ul className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
              {filtered.map((r) => {
                const active = selectedRole?.id === r.id;
                return (
                  <li key={r.id} className="group">
                    <button
                      onClick={() => onPickRole(r)}
                      className={`w-full text-left px-3 py-2 rounded-xl transition ${
                        active ? "bg-indigo-600 text-white shadow" : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate">{r.name}</div>
                        <div className="flex items-center gap-2">
                          <RoleBadge core={isCore(r)} />
                          {typeof r.user_count === "number" && (
                            <span className={`inline-flex items-center gap-1 text-xs ${active ? "text-indigo-100" : "text-gray-500"}`}>
                              <HiUserGroup className="h-4 w-4" /> {r.user_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {!isCore(r) && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 pl-1">
                        <button
                          className="p-1.5 text-gray-500 hover:text-indigo-600"
                          title="Rename"
                          onClick={() => openEdit(r)}
                        >
                          <HiPencil />
                        </button>
                        <button
                          className="p-1.5 text-gray-500 hover:text-rose-600"
                          title="Delete"
                          onClick={() => openDelete(r)}
                        >
                          <HiTrash />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              {!filtered.length && <li className="text-sm text-gray-500 py-8 text-center">No roles match “{query}”.</li>}
            </ul>
          )}

          <div className="mt-4 text-xs text-gray-500 flex items-start gap-1">
            <HiInformationCircle className="h-4 w-4 mt-0.5" />
            System roles are protected and cannot be removed. SuperAdmin is read-only.
          </div>
        </div>

        {/* Right: permissions matrix */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 lg:col-span-2">
          {!selectedRole ? (
            <div className="text-sm text-gray-500">Select a role to manage its permissions.</div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">
                    {selectedRole.name}
                    {locked(selectedRole) && <span className="ml-2 text-xs text-gray-500">(locked)</span>}
                  </div>
                  <RoleBadge core={isCore(selectedRole)} />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <HiDuplicate className="text-gray-500" />
                    <select
                      className="rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={locked(selectedRole)}
                      defaultValue=""
                      onChange={(e) => copyFrom(e.target.value)}
                      title="Copy permissions from another role"
                    >
                      <option value="" disabled>
                        Copy from…
                      </option>
                      {(roles || [])
                        .filter((r) => r.id !== selectedRole.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    onClick={resetChanges}
                    disabled={!dirty}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ring-1 ${
                      dirty ? "text-gray-800 ring-gray-300 hover:bg-gray-50" : "text-gray-400 ring-gray-200 cursor-not-allowed"
                    }`}
                    title="Reset unsaved changes"
                  >
                    <HiRefresh /> Reset
                  </button>

                  <button
                    onClick={exportJSON}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ring-1 ring-gray-300 hover:bg-gray-50"
                    title="Export permissions JSON"
                  >
                    <HiDownload /> Export
                  </button>

                  <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={importJSON} />
                  <button
                    onClick={() => importRef.current?.click()}
                    disabled={locked(selectedRole)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    title="Import permissions JSON"
                  >
                    <HiUpload /> Import
                  </button>

                  <button
                    onClick={savePermissions}
                    disabled={locked(selectedRole) || !dirty || saving}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white ${
                      locked(selectedRole) || !dirty || saving ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Saving…
                      </>
                    ) : (
                      <>
                        <HiCheck className="h-5 w-5" /> Save
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Matrix */}
              <div className="mt-4 overflow-auto">
                <table className="min-w-full text-sm border-separate border-spacing-y-2">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="bg-gray-50 text-left p-2 rounded-l-lg font-medium">Resource</th>
                      {actions.map((a) => {
                        const colAll = Object.keys(matrix || {}).every((res) => matrix?.[res]?.[a]);
                        return (
                          <th key={a} className="bg-gray-50 p-2 text-center font-medium capitalize">
                            <div className="flex flex-col items-center gap-1">
                              <span>{a}</span>
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={!!colAll}
                                onChange={(e) => toggleColAll(a, e.target.checked)}
                                disabled={locked(selectedRole)}
                                title={`Select all: ${a}`}
                              />
                            </div>
                          </th>
                        );
                      })}
                      <th className="bg-gray-50 p-2 text-center rounded-r-lg font-medium">Row</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((res, i) => {
                      const rowAll = Object.values(matrix?.[res] || {}).every(Boolean);
                      return (
                        <tr key={res} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-2 rounded-l-lg font-semibold">{res}</td>
                          {actions.map((a) => (
                            <td key={a} className="p-2 text-center">
                              <input
                                type="checkbox"
                                className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                                checked={!!matrix?.[res]?.[a]}
                                onChange={() => toggleCell(res, a)}
                                disabled={locked(selectedRole)}
                              />
                            </td>
                          ))}
                          <td className="p-2 text-center rounded-r-lg">
                            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                className="h-5 w-5"
                                checked={!!rowAll}
                                onChange={(e) => toggleRowAll(res, e.target.checked)}
                                disabled={locked(selectedRole)}
                              />
                              All
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {locked(selectedRole) && (
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                  <HiInformationCircle className="h-4 w-4" />
                  Super Administrator is read-only and has full access.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddEditRoleModal isOpen={isEditModalOpen} onClose={closeEdit} onSave={saveRoleName} roleData={editingRole} />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete Role: ${roleToDelete?.name || ""}`}
        message="Are you sure? This cannot be undone and may affect assigned users."
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        confirmText="Delete"
      />
    </div>
  );
};

export default RoleManager;
