-- ============================================================
--  CLEAN RBAC + AUDIT MIGRATION (Final Clean Version)
--  PostgreSQL 12+ compatible, safe to re-run
-- ============================================================

-- ------------------------------------------------------------
-- 1. ROLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure new columns exist if upgrading from older versions
ALTER TABLE roles ADD COLUMN IF NOT EXISTS core BOOLEAN DEFAULT FALSE;

-- Seed base roles
INSERT INTO roles (name, description, core) VALUES
('SuperAdmin', 'Full access to all modules and settings', TRUE),
('Admin', 'Manages staff, settings, and reports', TRUE),
('Doctor', 'Performs patient consultations and results review', TRUE),
('Lab Technician', 'Handles lab tests, analyzers, and reports', TRUE),
('Receptionist', 'Registers patients and test requests', TRUE),
('Accountant', 'Manages billing and payments', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 2. USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    profile_image_url TEXT,
    password_reset_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Timestamp trigger function
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION update_timestamp()
        RETURNS trigger AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END$$;

-- Create update trigger if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated'
    ) THEN
        CREATE TRIGGER trg_users_updated
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    END IF;
END$$;

-- ------------------------------------------------------------
-- 3. USER_ROLES (optional many-to-many)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE (user_id, role_id)
);

-- ------------------------------------------------------------
-- 4. PERMISSIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (resource, action)
);

-- Ensure new column exists
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS description TEXT;

-- ------------------------------------------------------------
-- 5. ROLE_PERMISSIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (role_id, permission_id)
);

-- ------------------------------------------------------------
-- 6. SEED PERMISSIONS
-- ------------------------------------------------------------
INSERT INTO permissions (resource, action, description) VALUES
('users', 'view', 'View user accounts'),
('users', 'create', 'Add new users'),
('users', 'edit', 'Edit existing users'),
('users', 'delete', 'Delete user accounts'),
('roles', 'view', 'View roles and permissions'),
('roles', 'edit', 'Manage role permissions'),
('patients', 'view', 'Access patient directory'),
('patients', 'edit', 'Edit patient records'),
('tests', 'request', 'Create new lab test requests'),
('tests', 'approve', 'Approve test results'),
('invoices', 'view', 'View and print invoices'),
('invoices', 'edit', 'Edit invoice information'),
('settings', 'edit', 'Modify system configuration')
ON CONFLICT (resource, action) DO NOTHING;

-- ------------------------------------------------------------
-- 7. GRANT ALL PERMISSIONS TO SUPERADMIN
-- ------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.name = 'SuperAdmin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------
-- 8. SUPERADMIN USER
-- ------------------------------------------------------------
-- Password hash = bcrypt('admin123', 10)
INSERT INTO users (full_name, email, password_hash, role_id, department, is_active)
SELECT
    'System SuperAdmin',
    'admin@elims.local',
    '$2a$10$UoLe0Bq7i0ogjvQbDaNtfekjh/.2qTr8s3/4E.YpNdQxGpXQF0UOC',
    r.id,
    'Management',
    TRUE
FROM roles r
WHERE r.name = 'SuperAdmin'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 9. AUDIT LOGGING
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100),
    entity_id INTEGER,
    description TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Function to record audit events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'log_audit_event'
    ) THEN
        CREATE OR REPLACE FUNCTION log_audit_event()
        RETURNS trigger AS $func$
        DECLARE
            act TEXT;
        BEGIN
            IF TG_OP = 'INSERT' THEN act := 'insert';
            ELSIF TG_OP = 'UPDATE' THEN act := 'update';
            ELSIF TG_OP = 'DELETE' THEN act := 'delete';
            ELSE act := TG_OP;
            END IF;

            INSERT INTO audit_logs (action, entity, entity_id, description)
            VALUES (
                act,
                TG_TABLE_NAME,
                COALESCE(NEW.id, OLD.id),
                format('Row %s in %s changed (%s)', COALESCE(NEW.id, OLD.id), TG_TABLE_NAME, act)
            );
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END$$;

-- Attach audit triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_users') THEN
        CREATE TRIGGER trg_audit_users
        AFTER INSERT OR UPDATE OR DELETE ON users
        FOR EACH ROW
        EXECUTE FUNCTION log_audit_event();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_roles') THEN
        CREATE TRIGGER trg_audit_roles
        AFTER INSERT OR UPDATE OR DELETE ON roles
        FOR EACH ROW
        EXECUTE FUNCTION log_audit_event();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_permissions') THEN
        CREATE TRIGGER trg_audit_permissions
        AFTER INSERT OR UPDATE OR DELETE ON permissions
        FOR EACH ROW
        EXECUTE FUNCTION log_audit_event();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_role_permissions') THEN
        CREATE TRIGGER trg_audit_role_permissions
        AFTER INSERT OR UPDATE OR DELETE ON role_permissions
        FOR EACH ROW
        EXECUTE FUNCTION log_audit_event();
    END IF;
END$$;

-- Example backend insert for login audit:
-- INSERT INTO audit_logs (user_id, action, description, ip_address, user_agent)
-- VALUES (<user_id>, 'login', 'User logged in successfully', '<ip>', '<agent>');

-- ============================================================
-- ✅ Done: RBAC + Audit schema successfully created
-- ============================================================
