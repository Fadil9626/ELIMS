BEGIN;

-- Temporarily relax FK checks so we can insert in any order safely
SET session_replication_role = replica;

-------------------------------
-- 1. DEPARTMENTS
-------------------------------
INSERT INTO departments (id, name, is_active)
VALUES
  (1, 'Hematology',      TRUE),
  (2, 'Clinical Chemistry', TRUE),
  (3, 'Immunology',      TRUE),
  (4, 'Serology',        TRUE),
  (5, 'Microbiology',    TRUE),
  (6, 'Histopathology',  TRUE)
ON CONFLICT (id) DO UPDATE
SET
  name      = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-------------------------------
-- 2. UNITS
-------------------------------
INSERT INTO units (id, unit_name, symbol)
VALUES
  (1,  'Milligram per deciliter', 'mg/dL'),
  (2,  'Unit per liter',          'U/L'),
  (3,  'International unit per mL','IU/mL'),
  -- ... all your other units
  (45, 'Nanogram per milliliter', 'ng/mL)
ON CONFLICT (id) DO UPDATE
SET
  unit_name = EXCLUDED.unit_name,
  symbol    = EXCLUDED.symbol;

-------------------------------
-- 3. ROLES
-------------------------------
-- Make sure IDs match what you already use
INSERT INTO roles (id, name, description, is_active)
VALUES
  (1,  'System Administrator', 'Full system access', TRUE),
  (3,  'Receptionist',         'Front desk / registration', TRUE),
  (4,  'Lab Technician',       'Performs tests / worklists', TRUE),
  (5,  'Pathologist',          'Reviews & validates results', TRUE),
  (7,  'Billing',              'Finance & invoicing', TRUE),
  (8,  'Management',           'Management dashboards', TRUE),
  (9,  'Super Admin',          'Owner-level access', TRUE),
  (15, 'Phlebotomist',         'Sample collection', TRUE),
  (17, 'IT Support',           'Technical & configuration', TRUE)
ON CONFLICT (id) DO UPDATE
SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active   = EXCLUDED.is_active;

-------------------------------
-- 4. PERMISSIONS
-------------------------------
-- Use the IDs & codes you already use in your DB
INSERT INTO permissions (id, code, description)
VALUES
  (1,  'PATIENT_VIEW',             'View patients'),
  (2,  'PATIENT_CREATE',           'Register new patient'),
  (3,  'PATIENT_EDIT',             'Edit patient details'),
  (4,  'REQUEST_CREATE',           'Create test request'),
  (5,  'REQUEST_VIEW_ALL',         'View all test requests'),
  (6,  'RESULT_ENTER',             'Enter test result'),
  (7,  'RESULT_VALIDATE',          'Validate / authorize results'),
  (8,  'BILLING_VIEW',             'View billing / invoices'),
  (9,  'BILLING_CREATE',           'Create invoice'),
  -- ... all your other permissions
  (79, 'AUDIT_LOG_VIEW',           'View audit logs')
ON CONFLICT (id) DO UPDATE
SET
  code        = EXCLUDED.code,
  description = EXCLUDED.description;

-------------------------------
-- 5. ROLE_PERMISSIONS
-------------------------------
-- Keep SAME role_id / permission_id pairs you already use
INSERT INTO role_permissions (role_id, permission_id)
VALUES
  (3,  1),
  (3,  2),
  (3,  4),
  (3,  5),
  (3,  8),
  -- Receptionist perms...
  (4,  5),
  (4,  6),
  (4, 60),
  (4, 61),
  (4, 62),
  (4, 63),
  -- Lab Tech perms...
  (5,  3),
  (5, 12),
  (5, 60),
  (5, 65),
  (5, 67),
  (5, 68),
  (5, 69),
  (5, 70),
  -- Pathologist perms...
  (9, 25),
  (9,  8)
  -- etc.
ON CONFLICT (role_id, permission_id) DO NOTHING;

-------------------------------
-- 6. SAMPLE TYPES (if you have this table)
-------------------------------
-- If your table is called `sample_types` (or similar), seed it here:
-- Example – adjust to your actual schema/table name:
-- INSERT INTO sample_types (id, name, is_active) VALUES
--   (1, 'Serum', TRUE),
--   (2, 'Plasma', TRUE),
--   (3, 'Whole Blood', TRUE),
--   (4, 'Urine', TRUE),
--   (5, 'Stool', TRUE),
--   (6, 'Swab', TRUE)
-- ON CONFLICT (id) DO UPDATE
-- SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-------------------------------
-- 7. TEST CATALOG (Analytes + Panels)
-------------------------------
-- Use the exact IDs, department_id, unit_id, is_panel flags from your live DB
INSERT INTO test_catalog (
  id, code, name, is_panel, department_id, unit_id, price, is_active, sample_type_id
)
VALUES
  (3,  'AFP',           'AFP (Alpha Fetoprotein)',            FALSE, 3, 45,  0, TRUE, 1),
  (4,  'CA125',         'CA 125',                             FALSE, 3, 45,  0, TRUE, 1),
  (5,  'CA153',         'CA 15-3',                            FALSE, 3, 45,  0, TRUE, 1),
  (6,  'CA199',         'CA 19-9',                            FALSE, 3, 45,  0, TRUE, 1),
  (7,  'CA2729',        'CA 27-29',                           FALSE, 3, 45,  0, TRUE, 1),
  (8,  'CEA',           'CEA (Carcinoembryonic Antigen)',     FALSE, 3, 45,  0, TRUE, 1),
  -- ... all other analytes and panels ...
  (77, 'ACP',           'Acid Phosphatase (ACP)',             FALSE, 3,  2,  0, TRUE, 1)
ON CONFLICT (id) DO UPDATE
SET
  code          = EXCLUDED.code,
  name          = EXCLUDED.name,
  is_panel      = EXCLUDED.is_panel,
  department_id = EXCLUDED.department_id,
  unit_id       = EXCLUDED.unit_id,
  price         = EXCLUDED.price,
  is_active     = EXCLUDED.is_active,
  sample_type_id= EXCLUDED.sample_type_id;

-------------------------------
-- 8. TEST_PANEL_ANALYTES
-------------------------------
INSERT INTO test_panel_analytes (id, panel_id, analyte_id)
VALUES
  (21,  10, 11),
  (22,  10, 12),
  (33,  18, 19)
  -- etc: preserve all your panel→analyte mappings
ON CONFLICT (id) DO UPDATE
SET
  panel_id   = EXCLUDED.panel_id,
  analyte_id = EXCLUDED.analyte_id;

-------------------------------
-- 9. NORMAL RANGES
-------------------------------
-- Use the cleaned/unique data (after you added unique_analyte_gender)
INSERT INTO normal_ranges (
  id, analyte_id, gender, range_type,
  unit_id, min_value, max_value,
  reference_range_text
)
VALUES
  -- Example from your logs:
  (152, 57, 'Male',   'numeric',  3, 0,   3, '0 - 3 mIU/mL'),
  (153, 57, 'Female', 'numeric',  3, 0,   5, '0 - 5 mIU/mL'),
  (169, 77, 'Male',   'numeric',  2, 0.5, 1.9, '0.5 - 1.9 U/L'),
  (170, 77, 'Female', 'numeric',  2, 0.3, 1.1, '0.3 - 1.1 U/L')
  -- plus every other analyte/panel range you have configured
ON CONFLICT (id) DO UPDATE
SET
  analyte_id           = EXCLUDED.analyte_id,
  gender               = EXCLUDED.gender,
  range_type           = EXCLUDED.range_type,
  unit_id              = EXCLUDED.unit_id,
  min_value            = EXCLUDED.min_value,
  max_value            = EXCLUDED.max_value,
  reference_range_text = EXCLUDED.reference_range_text;

-------------------------------
-- 10. RESET SEQUENCES
-------------------------------
SELECT setval('departments_id_seq',      (SELECT COALESCE(MAX(id), 1) FROM departments));
SELECT setval('units_id_seq',            (SELECT COALESCE(MAX(id), 1) FROM units));
SELECT setval('roles_id_seq',            (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('permissions_id_seq',      (SELECT COALESCE(MAX(id), 1) FROM permissions));
SELECT setval('test_catalog_id_seq',     (SELECT COALESCE(MAX(id), 1) FROM test_catalog));
SELECT setval('normal_ranges_id_seq',    (SELECT COALESCE(MAX(id), 1) FROM normal_ranges));
SELECT setval('test_panel_analytes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM test_panel_analytes));

-- Re-enable FK checks
SET session_replication_role = DEFAULT;

COMMIT;
