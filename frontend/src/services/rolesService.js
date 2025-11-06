/* =========================================================================
 * Roles Service
 * - CRUD, Permission Grants, and Role Membership
 * - Consistent error handling and token-based authentication
 * - Compatible with new role-based access control (RBAC) framework
 * ======================================================================= */

const BASE = (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/$/, "") + "/api/roles";

/* ------------------------------- Utilities ------------------------------- */

/** Pull token from argument or localStorage */
const getToken = (maybeToken) => {
  if (maybeToken) return maybeToken;
  try {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    return userInfo?.token || null;
  } catch {
    return null;
  }
};

/** Parse JSON or text and throw meaningful errors */
const handle = async (res) => {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
};

/** Build headers with Authorization token */
const authHeaders = (token, extra = {}) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...extra,
});

/* ------------------------------- Roles CRUD ------------------------------- */

/**
 * List roles (with pagination and search)
 */
export async function listRoles(token, { search = "", limit = 50, offset = 0 } = {}) {
  const qs = new URLSearchParams({
    search,
    limit: String(Math.min(Number(limit) || 50, 200)),
    offset: String(Math.max(Number(offset) || 0, 0)),
  }).toString();

  const res = await fetch(`${BASE}?${qs}`, {
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

/**
 * Backward-compatible alias for listRoles
 */
export const getRoles = (token) => listRoles(token);

/**
 * Create a new role
 */
export async function createRole(roleData, token) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: authHeaders(getToken(token), { "Content-Type": "application/json" }),
    body: JSON.stringify(roleData),
  });
  return handle(res);
}

/**
 * Update an existing role
 */
export async function updateRole(roleId, roleData, token) {
  const res = await fetch(`${BASE}/${roleId}`, {
    method: "PUT",
    headers: authHeaders(getToken(token), { "Content-Type": "application/json" }),
    body: JSON.stringify(roleData),
  });
  return handle(res);
}

/**
 * Delete a role
 */
export async function deleteRole(roleId, token) {
  const res = await fetch(`${BASE}/${roleId}`, {
    method: "DELETE",
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

/* ----------------------- Permissions Catalog & Grants ---------------------- */

/**
 * Fetch global permissions catalog
 * Returns: [{ id, resource, action, description? }]
 */
export async function getPermissionsCatalog(token) {
  const res = await fetch(`${BASE}/permissions`, {
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

/**
 * Get permissions assigned to a specific role
 * Returns: [{ id, resource, action }]
 */
export async function getRolePermissions(roleId, token) {
  const res = await fetch(`${BASE}/${roleId}/permissions`, {
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

/**
 * Replace a role’s permissions with the given list
 * Example payload: ["results:view", "results:enter", "roles:manage"]
 */
export async function setRolePermissions(roleId, permissions, token) {
  const res = await fetch(`${BASE}/${roleId}/permissions`, {
    method: "POST",
    headers: authHeaders(getToken(token), { "Content-Type": "application/json" }),
    body: JSON.stringify({ permissions }),
  });
  return handle(res);
}

/* -------------------------- Role Membership (Users) ------------------------ */

/**
 * Assign a user to a role
 */
export async function assignUserToRole(roleId, userId, token) {
  const res = await fetch(`${BASE}/${roleId}/users/${userId}`, {
    method: "POST",
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

/**
 * Remove a user from a role
 */
export async function unassignUserFromRole(roleId, userId, token) {
  const res = await fetch(`${BASE}/${roleId}/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

/**
 * Get all users assigned to a specific role
 */
export async function getRoleUsers(roleId, token) {
  const res = await fetch(`${BASE}/${roleId}/users`, {
    headers: authHeaders(getToken(token)),
  });
  return handle(res);
}

/* ------------------------------ Export Bundle ------------------------------ */

const rolesService = {
  // CRUD
  listRoles,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  // Permissions
  getPermissionsCatalog,
  getRolePermissions,
  setRolePermissions,
  // Membership
  assignUserToRole,
  unassignUserFromRole,
  getRoleUsers,
};

export default rolesService;
