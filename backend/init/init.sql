-- =============================================
-- ELIMS DATABASE SCHEMA + SEED
-- Run once on fresh DB
-- =============================================

-- roles / users / permissions
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  role_id INTEGER,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  core BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Seed SuperAdmin Role
INSERT INTO roles (id, name, core, description)
VALUES (9, 'SuperAdmin', true, 'Full system access')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  core = EXCLUDED.core,
  description = EXCLUDED.description;

-- Seed SuperAdmin User
-- Password: admin123 → hash: $2b$10$ndGozr07mi4aw4BPVbhjmurzrNxOYyBkFw8UdxbbYo1/MWVM/s1Qy
INSERT INTO users (id, role_id, full_name, email, password_hash, is_active)
VALUES (
  1,
  9,
  'Super Admin',
  'admin@elims.local',
  '$2b$10$ndGozr07mi4aw4BPVbhjmurzrNxOYyBkFw8UdxbbYo1/MWVM/s1Qy',
  true
)
ON CONFLICT (id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active;

-- Link user to role
INSERT INTO user_roles (user_id, role_id)
VALUES (1, 9)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Default departments & sample types
INSERT INTO departments(name) VALUES ('Chemistry') ON CONFLICT DO NOTHING;
INSERT INTO sample_types(name) VALUES ('Serum') ON CONFLICT DO NOTHING;