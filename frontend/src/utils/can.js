export function can(user, resource, action) {
  if (!user || !user.permissions_map) return false;

  const key = `${resource.toLowerCase()}:${action.toLowerCase()}`;

  // SUPERADMIN has *:* from backend
  if (user.permissions_map["*:*"]) return true;

  return !!user.permissions_map[key];
}
