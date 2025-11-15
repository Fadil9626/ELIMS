BEGIN;

-- Ensure Super Admin exists (if you still keep create-admin.sql, you can omit this section)
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT
  'System Admin',
  'admin@elims.local',
  -- if exists, keep current hash; else use any existing hash
  COALESCE(
    (SELECT password_hash FROM users WHERE email = 'admin@elims.local'),
    (SELECT password_hash FROM users LIMIT 1)
  ),
  9,   -- Super Admin role_id
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@elims.local'
);

-- Receptionist
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT
  'Front Desk Receptionist',
  'receptionist@elims.local',
  (SELECT password_hash FROM users WHERE email = 'admin@elims.local'),
  3,   -- Receptionist role_id
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'receptionist@elims.local'
);

-- Lab Technician
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT
  'Lab Technician',
  'labtech@elims.local',
  (SELECT password_hash FROM users WHERE email = 'admin@elims.local'),
  4,   -- Lab Tech role_id
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'labtech@elims.local'
);

-- Pathologist
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT
  'Pathologist',
  'pathologist@elims.local',
  (SELECT password_hash FROM users WHERE email = 'admin@elims.local'),
  5,   -- Pathologist role_id
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'pathologist@elims.local'
);

COMMIT;
