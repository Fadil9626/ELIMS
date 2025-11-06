// src/utils/perm.js

/** Safely read the session blob the app stores */
export function readSession() {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "null") || {};
    } catch {
      return {};
    }
  }
  
  /** Normalize /api/me (or legacy) into a single shape we can reason about */
  export function deriveMe() {
    const info = readSession();
    const me = info.me || info.user || {};
  
    const roleId   = Number(me?.role_id ?? 0);
    const roleName = String(me?.role_name || "");
  
    // Surfaces your backend may emit
    const eff   = me?.effective_permissions || {};
    const perms = me?.permissions_matrix || me?.permissions || {}; // matrix form
    const slugs = Array.isArray(me?.permission_slugs) ? me.permission_slugs : [];
    const map   = me?.permissions_map || {};
  
    const isElevated =
      eff?.__all === true ||
      perms?.__all === true ||
      (Array.isArray(slugs) && slugs.includes("*")) ||
      map["*:*"] === true ||
      /^(super\s?admin|superadmin|admin)$/i.test(roleName);
  
    return { me, roleId, roleName, eff, perms, slugs, map, isElevated };
  }
  
  /** Pure permission check usable anywhere (no React) */
  export function canPerm(meObj, module, action = "view") {
    const { isElevated, eff, perms, slugs, map } = meObj || deriveMe();
  
    if (isElevated) return true;
    if (module === "dashboard") return true;
  
    if (eff?.__all === true) return true;
    if (Array.isArray(slugs) && slugs.includes("*")) return true;
    if (map?.["*:*"] === true) return true;
  
    return Boolean(perms?.[module]?.[action]);
  }
  
  // (optional) default export if you prefer `import * as perm from ...`
  export default { readSession, deriveMe, canPerm };
  