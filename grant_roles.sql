-- CLEAR old assignments
DELETE FROM role_permissions;

-- ADMINISTRATOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE action IN ('view','manage','edit','collect','print','verify','create','enter','cancel');

-- RECEPTIONIST
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions
WHERE (resource='patients' AND action IN ('view','create'))
   OR (resource='requests' AND action IN ('create','view'))
   OR (resource='test_requests' AND action IN ('view','create'));

-- PHLEBOTOMIST
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions
WHERE (resource='phlebotomy')
   OR (resource='patients' AND action='view')
   OR (resource='test_requests' AND action='view');

-- LABORATORY SCIENTIST
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions
WHERE resource IN ('lab_work', 'results', 'reports');

-- PATHOLOGIST
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions
WHERE (resource='pathologist')
   OR (resource='results')
   OR (resource='reports');

-- FINANCE
INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions
WHERE resource='billing'
   OR (resource='reports' AND action IN ('view','print'));

-- INVENTORY CLERK
INSERT INTO role_permissions (role_id, permission_id)
SELECT 15, id FROM permissions
WHERE resource='inventory';
