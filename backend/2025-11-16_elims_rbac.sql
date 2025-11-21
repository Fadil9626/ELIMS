-- ==============================================
-- ELIMS RBAC UPGRADE (SAFE / ADDITIVE)
-- ==============================================

-- 1. Ensure roles has basic metadata
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS slug          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS is_system     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Permissions table (global registry of actions)
CREATE TABLE IF NOT EXISTS permissions (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(150) NOT NULL UNIQUE,   -- e.g. 'patients:create'
  module       VARCHAR(100) NOT NULL,          -- e.g. 'patients'
  action       VARCHAR(50)  NOT NULL,          -- e.g. 'create'
  label        VARCHAR(150),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Role ↔ Permission mapping (role_permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id             SERIAL PRIMARY KEY,
  role_id        INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- 4. Optional per-user overrides (user_permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id  INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_unique UNIQUE (user_id, permission_id)
);

-- ==============================================
-- Seed core roles (only if missing)
-- ==============================================
INSERT INTO roles (slug, name, description, is_system, is_active)
SELECT 'super_admin', 'Super Admin', 'Full system access', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'super_admin');

INSERT INTO roles (slug, name, description, is_system, is_active)
SELECT 'admin', 'Admin', 'Admin management access', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'admin');

INSERT INTO roles (slug, name, description, is_system, is_active)
SELECT 'receptionist', 'Receptionist', 'Patient registration & test requests', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'receptionist');

INSERT INTO roles (slug, name, description, is_system, is_active)
SELECT 'lab_technician', 'Lab Technician', 'Result entry & worklists', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'lab_technician');

INSERT INTO roles (slug, name, description, is_system, is_active)
SELECT 'pathologist', 'Pathologist', 'Result validation & reports', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'pathologist');

-- ==============================================
-- Seed some core permissions
-- ==============================================
INSERT INTO permissions (slug, module, action, label, description) VALUES
  ('patients:view',         'patients',     'view',   'View patients',           'View patient list & details'),
  ('patients:create',       'patients',     'create', 'Create patients',         'Register new patients'),
  ('test_requests:view',    'test_requests','view',   'View test requests',      'View and search test requests'),
  ('test_requests:create',  'test_requests','create', 'Create test requests',    'Create/submit lab test requests'),
  ('phlebotomy:view',       'phlebotomy',   'view',   'View phlebotomy list',    'Access phlebotomy worklists'),
  ('results:enter',         'results',      'enter',  'Enter results',           'Enter/modify lab results'),
  ('results:validate',      'results',      'validate','Validate results',       'Validate & authorize results'),
  ('billing:view',          'billing',      'view',   'View billing',            'See invoices & payments'),
  ('billing:manage',        'billing',      'manage', 'Manage billing',          'Create invoices, take payments'),
  ('inventory:view',        'inventory',    'view',   'View inventory',          'See stock & items'),
  ('inventory:manage',      'inventory',    'manage', 'Manage inventory',        'Adjust stock, receive items'),
  ('admin:users',           'admin',        'users',  'Manage users',            'Create & manage user accounts'),
  ('admin:roles',           'admin',        'roles',  'Manage roles & perms',    'Edit roles & permissions')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- Give SUPER ADMIN full permissions
-- ==============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
