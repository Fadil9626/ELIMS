// backend/controllers/rolesController.js
const pool = require("../config/database");

// ---- Config ----
const CORE_ROLE_NAMES = new Set([
  "SuperAdmin",
  "Admin",
  "Pathologist",
  "Technician",
  "Receptionist",
  "Viewer",
]);

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function parsePermStrings(permsInput) {
  if (!permsInput) return [];
  if (Array.isArray(permsInput)) {
    return permsInput
      .map((p) => {
        if (!p) return null;
        if (typeof p === "string") {
          const [resource, action] = p.split(":").map((s) => (s || "").trim());
          if (!resource || !action) return null;
          return { resource, action };
        }
        if (typeof p === "object" && p.resource && p.action) {
          return { resource: String(p.resource).trim(), action: String(p.action).trim() };
        }
        return null;
      })
      .filter(Boolean);
  }
  return [];
}

/**
 * Ensure all (resource, action) pairs exist in the permissions table.
 * Your table shape (per \d permissions):
 *   id, name NOT NULL, code NOT NULL UNIQUE, resource NOT NULL, action NOT NULL, created_at
 *
 * We will:
 * - look up by (resource, action)
 * - when inserting, also populate name and code
 *   code:  `${resource}.${action}`
 *   name:  Human-readable like `Patients: View`
 */
async function ensurePermissions(client, perms) {
  const pairs = perms.map((p) => [p.resource, p.action]);
  const keySet = new Set(pairs.map(([r, a]) => `${r}:${a}`));
  if (keySet.size === 0) return new Map();

  // 1) Fetch existing by (resource, action)
  const flatParams = [];
  const tupleHolders = [];
  [...keySet].forEach((k, i) => {
    const [r, a] = k.split(":");
    flatParams.push(r, a);
    tupleHolders.push(`($${i * 2 + 1}, $${i * 2 + 2})`);
  });

  const { rows: existing } = await client.query(
    `SELECT id, resource, action
       FROM permissions
      WHERE (resource, action) IN (${tupleHolders.join(",")})`,
    flatParams
  );

  const map = new Map(existing.map((r) => [`${r.resource}:${r.action}`, r.id]));

  // 2) Insert missing with required columns (name, code)
  const missing = perms.filter((p) => !map.has(`${p.resource}:${p.action}`));
  if (missing.length) {
    const vHolders = [];
    const vParams = [];
    missing.forEach((p, i) => {
      const code = `${p.resource}.${p.action}`; // unique
      const name = `${p.resource.charAt(0).toUpperCase() + p.resource.slice(1)}: ${p.action.charAt(0).toUpperCase() + p.action.slice(1)}`;
      // (name, code, resource, action)
      vHolders.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`);
      vParams.push(name, code, p.resource, p.action);
    });

    const { rows: inserted } = await client.query(
      `INSERT INTO permissions (name, code, resource, action)
       VALUES ${vHolders.join(",")}
       ON CONFLICT (code) DO NOTHING
       RETURNING id, resource, action`,
      vParams
    );

    for (const r of inserted) {
      map.set(`${r.resource}:${r.action}`, r.id);
    }

    // In case some rows already existed by code, fetch them to fill the map
    if (inserted.length < missing.length) {
      const again = await client.query(
        `SELECT id, resource, action
           FROM permissions
          WHERE (resource, action) IN (${tupleHolders.join(",")})`,
        flatParams
      );
      for (const r of again.rows) {
        map.set(`${r.resource}:${r.action}`, r.id);
      }
    }
  }

  return map;
}

async function fetchRoleWithPermissions(client, roleId) {
  const { rows: roleRows } = await client.query(
    `SELECT id, name, description, core FROM roles WHERE id = $1`,
    [roleId]
  );
  if (!roleRows.length) return null;

  const { rows: perms } = await client.query(
    `SELECT p.resource, p.action
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action`,
    [roleId]
  );

  return {
    id: roleRows[0].id,
    name: roleRows[0].name,
    description: roleRows[0].description || null,
    core: !!roleRows[0].core,
    permissions: perms.map((p) => `${p.resource}:${p.action}`),
  };
}

function isCoreRoleName(name) {
  return CORE_ROLE_NAMES.has(String(name || "").trim());
}

// ────────────────────────────────────────────────────────────
// Controllers
// ────────────────────────────────────────────────────────────

// GET /api/roles?search=&limit=&offset=
const getRoles = async (req, res) => {
  const { search = "", limit = 100, offset = 0 } = req.query;
  try {
    const lim = Math.min(parseInt(limit, 10) || 100, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    const q = `%${String(search).trim()}%`;

    const { rows: roles } = await pool.query(
      `SELECT id, name, description, core
         FROM roles
        WHERE ($1 = '%%' OR name ILIKE $1)
        ORDER BY id
        LIMIT $2 OFFSET $3`,
      [q, lim, off]
    );

    // attach permissions to each role (optional)
    const roleIds = roles.map((r) => r.id);
    let permsByRole = new Map();
    if (roleIds.length) {
      const { rows: perms } = await pool.query(
        `SELECT rp.role_id, p.resource, p.action
           FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id
          WHERE rp.role_id = ANY($1)
          ORDER BY rp.role_id, p.resource, p.action`,
        [roleIds]
      );
      permsByRole = perms.reduce((acc, r) => {
        if (!acc.has(r.role_id)) acc.set(r.role_id, []);
        acc.get(r.role_id).push(`${r.resource}:${r.action}`);
        return acc;
      }, new Map());
    }

    const items = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || null,
      core: !!r.core,
      permissions: permsByRole.get(r.id) || [],
    }));

    res.status(200).json({ items, limit: lim, offset: off, count: items.length });
  } catch (error) {
    console.error("getRoles error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/roles/permissions  → list permission catalog
const getPermissionsCatalog = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, resource, action
         FROM permissions
        ORDER BY resource, action`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("getPermissionsCatalog error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// POST /api/roles  { name, description?, permissions? }
const createRole = async (req, res) => {
  const { name, description = null, permissions: permsInput } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Role name is required." });
  }

  const perms = parsePermStrings(permsInput);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rowCount: nameTaken } = await client.query(
      `SELECT 1 FROM roles WHERE LOWER(name)=LOWER($1)`,
      [name]
    );
    if (nameTaken) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `A role with the name '${name}' already exists.` });
    }

    const { rows: roleRows } = await client.query(
      `INSERT INTO roles (name, description) VALUES ($1, $2)
       RETURNING id, name, description, core`,
      [name.trim(), description]
    );

    const roleId = roleRows[0].id;

    if (perms.length) {
      const permIdMap = await ensurePermissions(client, perms);
      if (permIdMap.size) {
        const ids = [...new Set(perms.map((p) => permIdMap.get(`${p.resource}:${p.action}`)).filter(Boolean))];
        if (ids.length) {
          const values = ids.map((_, i) => `($1, $${i + 2})`).join(",");
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ${values}
             ON CONFLICT DO NOTHING`,
            [roleId, ...ids]
          );
        }
      }
    }

    await client.query("COMMIT");

    const result = await fetchRoleWithPermissions(client, roleId);
    res.status(201).json(result);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("createRole error:", error);
    if (error.code === "23505") {
      return res.status(400).json({ message: `A role with the name '${name}' already exists.` });
    }
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

// PUT /api/roles/:id  { name?, description?, permissions? (replace set) }
const updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description = null, permissions: permsInput } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: currentRows } = await client.query(
      `SELECT id, name, core FROM roles WHERE id = $1`,
      [id]
    );
    if (!currentRows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Role not found." });
    }
    const current = currentRows[0];
    const targetName = (name ?? current.name).trim();

    if (isCoreRoleName(current.name) && !targetName) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Core role must have a valid name." });
    }

    if (targetName && targetName.toLowerCase() !== current.name.toLowerCase()) {
      const { rowCount: taken } = await client.query(
        `SELECT 1 FROM roles WHERE LOWER(name) = LOWER($1) AND id <> $2`,
        [targetName, id]
      );
      if (taken) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `A role with the name '${targetName}' already exists.` });
      }
    }

    await client.query(
      `UPDATE roles SET name=$1, description=$2 WHERE id=$3`,
      [targetName, description, id]
    );

    if (typeof permsInput !== "undefined") {
      const perms = parsePermStrings(permsInput);
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);

      if (perms.length) {
        const permIdMap = await ensurePermissions(client, perms);
        const ids = [...new Set(perms.map((p) => permIdMap.get(`${p.resource}:${p.action}`)).filter(Boolean))];
        if (ids.length) {
          const values = ids.map((_, i) => `($1, $${i + 2})`).join(",");
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ${values}
             ON CONFLICT DO NOTHING`,
            [id, ...ids]
          );
        }
      }
    }

    await client.query("COMMIT");

    const result = await fetchRoleWithPermissions(client, id);
    res.status(200).json(result);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("updateRole error:", error);
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

// DELETE /api/roles/:id
const deleteRole = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(`SELECT id, name, core FROM roles WHERE id = $1`, [id]);
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Role not found." });
    }
    const role = rows[0];

    if (isCoreRoleName(role.name) || role.core === true) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot delete a core system role." });
    }

    const { rowCount: inUse } = await client.query(
      `SELECT 1 FROM user_roles WHERE role_id = $1 LIMIT 1`,
      [id]
    );
    if (inUse) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot delete role while it is assigned to users." });
    }

    await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
    await client.query(`DELETE FROM roles WHERE id = $1`, [id]);

    await client.query("COMMIT");
    res.status(200).json({ message: "Role deleted successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("deleteRole error:", error);
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

// GET /api/roles/:id/users
const getRoleUsers = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email
         FROM user_roles ur
         JOIN users u ON u.id = ur.user_id
        WHERE ur.role_id = $1
        ORDER BY u.full_name`,
      [id]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("getRoleUsers error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// POST /api/roles/:id/users/:userId
const assignRoleToUser = async (req, res) => {
  const { id, userId } = req.params;
  try {
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, id]
    );
    res.status(200).json({ message: "Role assigned to user." });
  } catch (error) {
    console.error("assignRoleToUser error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE /api/roles/:id/users/:userId
const removeRoleFromUser = async (req, res) => {
  const { id, userId } = req.params;
  try {
    await pool.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, [userId, id]);
    res.status(200).json({ message: "Role removed from user." });
  } catch (error) {
    console.error("removeRoleFromUser error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// POST /api/roles/:id/permissions
const setRolePermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions: permsInput } = req.body || {};
  const perms = parsePermStrings(permsInput);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rowCount } = await client.query(`SELECT 1 FROM roles WHERE id = $1`, [id]);
    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Role not found." });
    }

    await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);

    if (perms.length) {
      const permIdMap = await ensurePermissions(client, perms);
      const ids = [...new Set(perms.map((p) => permIdMap.get(`${p.resource}:${p.action}`)).filter(Boolean))];
      if (ids.length) {
        const values = ids.map((_, i) => `($1, $${i + 2})`).join(",");
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [id, ...ids]
        );
      }
    }

    await client.query("COMMIT");

    const result = await fetchRoleWithPermissions(client, id);
    res.status(200).json(result);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("setRolePermissions error:", error);
    res.status(500).json({ message: "Server Error" });
  } finally {
    client.release();
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleUsers,
  assignRoleToUser,
  removeRoleFromUser,
  getPermissionsCatalog,
  setRolePermissions,
};
