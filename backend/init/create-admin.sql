-- Ensure Super Admin Role Exists
INSERT INTO roles (name, description, core)
VALUES ('Super Admin', 'Full system access', true)
ON CONFLICT (name) DO NOTHING;

-- Ensure Admin User Exists
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT 
  'System Administrator',
  'admin@elims.local',
  '$2a$10$PEW2B9zWZ7u8U3V6Kx9lB.2Tb8tVJmwrQ3uS85gOssZrgbVReZtVi', -- password: Admin@123
  id,
  true
FROM roles
WHERE name = 'Super Admin'
ON CONFLICT (email) DO NOTHING;
