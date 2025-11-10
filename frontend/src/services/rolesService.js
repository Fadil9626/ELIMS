// frontend/src/services/rolesService.js

const BASE = (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/$/, "") + "/api/roles";

const getToken = (maybeToken) => {
  if (maybeToken) return maybeToken;
  try {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    return userInfo?.token || null;
  } catch {
    return null;
  }
};

const handle = async (res) => {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
};

const authHeaders = (token, extra = {}) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...extra,
});

/** ALWAYS return a plain array of roles for listRoles */
export async function listRoles(token, { search = "", limit = 50, offset = 0 } = {}) {
  const qs = new URLSearchParams({
    search,
    limit: String(Math.min(Number(limit) || 50, 200)),
    offset: String(Math.max(Number(offset) || 0, 0)),
  }).toString();

  const res = await fetch(`${BASE}?${qs}`, {
    headers: authHeaders(getToken(token)),
  });
  const data = await handle(res);
  // normalize to array
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export const getRoles = (token, opts) => listRoles(token, opts);

export async function createRole(roleData, token) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: authHeaders(getToken(token), { "Content-Type": "application/json" }),
    body: JSON.stringify(roleData),
  });
  return handle(res);
}

export async function updateRole(roleId, roleData, token) {
  const res = await fetch(`${BASE}/${roleId}`, {
    method: "PUT",
    headers: authHeaders(getToken(token), { "Content-Type": "application/json" }),
    body: JSON.stringify(roleData),
  });
  return handle(res);
}

export async function deleteRole(roleId, token) {
  const res = await fetch(`${BASE}/${roleId}`, {
    method: "DELETE",
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

export async function getPermissionsCatalog(token) {
  const res = await fetch(`${BASE}/permissions`, {
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

export async function getRolePermissions(roleId, token) {
  const res = await fetch(`${BASE}/${roleId}/permissions`, {
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

export async function setRolePermissions(roleId, permissions, token) {
  const res = await fetch(`${BASE}/${roleId}/permissions`, {
    method: "POST",
    headers: authHeaders(getToken(token), { "Content-Type": "application/json" }),
    body: JSON.stringify({ permissions }),
  });
  return handle(res);
}

export async function assignUserToRole(roleId, userId, token) {
  const res = await fetch(`${BASE}/${roleId}/users/${userId}`, {
    method: "POST",
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

export async function unassignUserFromRole(roleId, userId, token) {
  const res = await fetch(`${BASE}/${roleId}/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

export async function getRoleUsers(roleId, token) {
  const res = await fetch(`${BASE}/${roleId}/users`, {
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

const rolesService = {
  listRoles,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissionsCatalog,
  getRolePermissions,
  setRolePermissions,
  assignUserToRole,
  unassignUserFromRole,
  getRoleUsers,
};

export default rolesService;
