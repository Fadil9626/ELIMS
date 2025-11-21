-- =====================================================================
--  FIXED RBAC MIGRATION (MATCHES YOUR CURRENT SCHEMA)
--  Works safely even if data exists. No duplicates. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------
-- 1. Ensure roles exist
-- ---------------------------------------------------------
INSERT INTO roles (name, description)
SELECT 'Super Admin', 'System-wide unrestricted access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='Super Admin');

INSERT INTO roles (name, description)
SELECT 'Receptionist', 'Handles patient registration + billing'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='Receptionist');

INSERT INTO roles (name, description)
SELECT 'Pathologist', 'Handles test verification + reports'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='Pathologist');

-- ---------------------------------------------------------
-- 2. Standard permissions list (resource + action)
-- ---------------------------------------------------------
WITH perms(resource, action, label) AS (
    VALUES
        ('auth', 'login', 'Allow user login'),
        ('auth', 'logout', 'Allow user logout'),

        ('patients', 'view', 'View patients'),
        ('patients', 'create', 'Create new patient'),
        ('patients', 'update', 'Update patient'),
        ('patients', 'delete', 'Delete patient'),

        ('test_requests', 'view', 'View test requests'),
        ('test_requests', 'create', 'Create test request'),
        ('test_requests', 'update', 'Update test request'),
        ('test_requests', 'delete', 'Delete test request'),

        ('billing', 'view', 'View billing'),
        ('billing', 'create', 'Create invoices'),
        ('billing', 'update', 'Update invoices'),

        ('inventory', 'view', 'View inventory'),
        ('inventory', 'update', 'Update inventory'),

        ('lab', 'view', 'Access lab modules'),
        ('reports', 'view', 'Access lab reports'),

        ('users', 'view', 'View users'),
        ('users', 'create', 'Create user'),
        ('users', 'update', 'Update user'),
        ('users', 'delete', 'Delete user')
)
INSERT INTO permissions (name, code, resource, action)
SELECT 
    label,
    resource || '_' || action,
    resource,
    action
FROM perms
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.resource = perms.resource AND p.action = perms.action
);

-- ---------------------------------------------------------
-- 3. Link roles to permissions
-- ---------------------------------------------------------

-- SUPER ADMIN gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Super Admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp 
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- RECEPTIONIST — limited permission set
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON 
    (p.resource='patients' AND p.action IN ('view','create','update'))
 OR (p.resource='billing')
WHERE r.name = 'Receptionist'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- PATHOLOGIST — lab + test verification + reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON 
   (p.resource='test_requests')
OR (p.resource='lab')
OR (p.resource='reports')
WHERE r.name = 'Pathologist'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
