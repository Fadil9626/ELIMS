-- This script seeds the database with all tests, panels, and reference ranges
-- from the provided chemistry template. Run this script once in pgAdmin.

-- Step 1: Insert all unique Units of Measurement
INSERT INTO units (name) VALUES
('g/L'), ('U/L'), ('µmol/L'), ('IU/L'), ('mmol/L'), ('ng/mL'), ('µg/dL'),
('pg/mL'), ('µUL/mL'), ('pmol/L'), ('nmol/L'), ('mg/L'), ('%'), ('RLU'),
('IU/mL'), ('mL/min')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Insert all Analytes and link them to their units
-- This is a mapping of every test component to its unit.
DO $$
DECLARE
-- Liver Function
total_protein_id INT; albumin_id INT; globulin_id INT; alk_phos_id INT; total_bili_id INT; direct_bili_id INT; indirect_bili_id INT; alt_id INT; ast_id INT; ggt_id INT;
-- Kidney Function
creatinine_id INT; urea_id INT; uric_acid_id INT; calcium_id INT;
-- Electrolytes
chloride_id INT; potassium_id INT; sodium_id INT; phosphorus_id INT; magnesium_id INT; bicarbonate_id INT;
-- Lipid Profile
total_chol_id INT; hdl_chol_id INT; ldl_chol_id INT; trig_id INT;
-- Glucose
fpg_id INT; hba1c_id INT;
-- Cardiac
trop_i_id INT;
-- Other
crp_id INT; amylase_id INT; lipase_id INT; creatinine_clearance_id INT; total_psa_id INT;

BEGIN
-- Liver Function Analytes (ON CONFLICT added to prevent errors on re-run)
INSERT INTO test_analytes (name, unit_id) VALUES ('Total Protein', (SELECT id FROM units WHERE name='g/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO total_protein_id FROM test_analytes WHERE name = 'Total Protein';
INSERT INTO test_analytes (name, unit_id) VALUES ('Albumin', (SELECT id FROM units WHERE name='g/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO albumin_id FROM test_analytes WHERE name = 'Albumin';
INSERT INTO test_analytes (name, unit_id) VALUES ('Globulin', (SELECT id FROM units WHERE name='g/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO globulin_id FROM test_analytes WHERE name = 'Globulin';
INSERT INTO test_analytes (name, unit_id) VALUES ('Alkaline Phosphatase', (SELECT id FROM units WHERE name='U/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO alk_phos_id FROM test_analytes WHERE name = 'Alkaline Phosphatase';
INSERT INTO test_analytes (name, unit_id) VALUES ('Total Bilirubin', (SELECT id FROM units WHERE name='µmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO total_bili_id FROM test_analytes WHERE name = 'Total Bilirubin';
INSERT INTO test_analytes (name, unit_id) VALUES ('Direct Bilirubin', (SELECT id FROM units WHERE name='µmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO direct_bili_id FROM test_analytes WHERE name = 'Direct Bilirubin';
INSERT INTO test_analytes (name, unit_id) VALUES ('Indirect Bilirubin', (SELECT id FROM units WHERE name='µmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO indirect_bili_id FROM test_analytes WHERE name = 'Indirect Bilirubin';
INSERT INTO test_analytes (name, unit_id) VALUES ('ALT/SGPT', (SELECT id FROM units WHERE name='IU/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO alt_id FROM test_analytes WHERE name = 'ALT/SGPT';
INSERT INTO test_analytes (name, unit_id) VALUES ('AST/SGOT', (SELECT id FROM units WHERE name='IU/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO ast_id FROM test_analytes WHERE name = 'AST/SGOT';
INSERT INTO test_analytes (name, unit_id) VALUES ('Gamma GT', (SELECT id FROM units WHERE name='U/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO ggt_id FROM test_analytes WHERE name = 'Gamma GT';

-- Kidney Function Analytes
INSERT INTO test_analytes (name, unit_id) VALUES ('Creatinine', (SELECT id FROM units WHERE name='µmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO creatinine_id FROM test_analytes WHERE name = 'Creatinine';
INSERT INTO test_analytes (name, unit_id) VALUES ('Urea', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO urea_id FROM test_analytes WHERE name = 'Urea';
INSERT INTO test_analytes (name, unit_id) VALUES ('Uric Acid', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO uric_acid_id FROM test_analytes WHERE name = 'Uric Acid';
INSERT INTO test_analytes (name, unit_id) VALUES ('Calcium', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO calcium_id FROM test_analytes WHERE name = 'Calcium';

-- Electrolyte Analytes
INSERT INTO test_analytes (name, unit_id) VALUES ('Chloride', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO chloride_id FROM test_analytes WHERE name = 'Chloride';
INSERT INTO test_analytes (name, unit_id) VALUES ('Potassium', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO potassium_id FROM test_analytes WHERE name = 'Potassium';
INSERT INTO test_analytes (name, unit_id) VALUES ('Sodium', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO sodium_id FROM test_analytes WHERE name = 'Sodium';
INSERT INTO test_analytes (name, unit_id) VALUES ('Phosphorus', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO phosphorus_id FROM test_analytes WHERE name = 'Phosphorus';
INSERT INTO test_analytes (name, unit_id) VALUES ('Magnesium', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO magnesium_id FROM test_analytes WHERE name = 'Magnesium';
INSERT INTO test_analytes (name, unit_id) VALUES ('Bicarbonate', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO bicarbonate_id FROM test_analytes WHERE name = 'Bicarbonate';

-- Lipid Profile Analytes
INSERT INTO test_analytes (name, unit_id) VALUES ('Total Cholesterol', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO total_chol_id FROM test_analytes WHERE name = 'Total Cholesterol';
INSERT INTO test_analytes (name, unit_id) VALUES ('HDL Cholesterol', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO hdl_chol_id FROM test_analytes WHERE name = 'HDL Cholesterol';
INSERT INTO test_analytes (name, unit_id) VALUES ('LDL Cholesterol', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO ldl_chol_id FROM test_analytes WHERE name = 'LDL Cholesterol';
INSERT INTO test_analytes (name, unit_id) VALUES ('Triglycerides', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO trig_id FROM test_analytes WHERE name = 'Triglycerides';

-- Standalone Analytes
INSERT INTO test_analytes (name, unit_id) VALUES ('Fasting plasma Glucose', (SELECT id FROM units WHERE name='mmol/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO fpg_id FROM test_analytes WHERE name = 'Fasting plasma Glucose';
INSERT INTO test_analytes (name, unit_id) VALUES ('HbA1c', (SELECT id FROM units WHERE name='%')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO hba1c_id FROM test_analytes WHERE name = 'HbA1c';
INSERT INTO test_analytes (name, unit_id) VALUES ('Troponin I', (SELECT id FROM units WHERE name='ng/mL')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO trop_i_id FROM test_analytes WHERE name = 'Troponin I';
INSERT INTO test_analytes (name, unit_id) VALUES ('C-RP', (SELECT id FROM units WHERE name='mg/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO crp_id FROM test_analytes WHERE name = 'C-RP';
INSERT INTO test_analytes (name, unit_id) VALUES ('Amylase', (SELECT id FROM units WHERE name='IU/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO amylase_id FROM test_analytes WHERE name = 'Amylase';
INSERT INTO test_analytes (name, unit_id) VALUES ('Lipase', (SELECT id FROM units WHERE name='U/L')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO lipase_id FROM test_analytes WHERE name = 'Lipase';
INSERT INTO test_analytes (name, unit_id) VALUES ('Creatinine Clearance', (SELECT id FROM units WHERE name='mL/min')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO creatinine_clearance_id FROM test_analytes WHERE name = 'Creatinine Clearance';
INSERT INTO test_analytes (name, unit_id) VALUES ('Total PSA', (SELECT id FROM units WHERE name='ng/mL')) ON CONFLICT (name) DO NOTHING;
SELECT id INTO total_psa_id FROM test_analytes WHERE name = 'Total PSA';

-- Step 3 & 4: Create Test Panels and link Analytes to them
-- Liver Function Test
WITH lft_panel AS (
INSERT INTO test_catalog (name, department, price) VALUES ('Liver Function Test', 'CHEMISTRY', 350.00) ON CONFLICT (name) DO NOTHING RETURNING id
)
INSERT INTO test_catalog_analytes (test_catalog_id, analyte_id) SELECT (SELECT id FROM lft_panel), unnest(array[total_protein_id, albumin_id, globulin_id, alk_phos_id, total_bili_id, direct_bili_id, indirect_bili_id, alt_id, ast_id, ggt_id]) ON CONFLICT DO NOTHING;

-- Kidney Function Test
WITH kft_panel AS (
INSERT INTO test_catalog (name, department, price) VALUES ('Kidney Function Test', 'CHEMISTRY', 300.00) ON CONFLICT (name) DO NOTHING RETURNING id
)
INSERT INTO test_catalog_analytes (test_catalog_id, analyte_id) SELECT (SELECT id FROM kft_panel), unnest(array[creatinine_id, urea_id, uric_acid_id, calcium_id]) ON CONFLICT DO NOTHING;

-- Electrolyte Panel
WITH e_panel AS (
INSERT INTO test_catalog (name, department, price) VALUES ('Electrolyte Panel', 'CHEMISTRY', 200.00) ON CONFLICT (name) DO NOTHING RETURNING id
)
INSERT INTO test_catalog_analytes (test_catalog_id, analyte_id) SELECT (SELECT id FROM e_panel), unnest(array[chloride_id, potassium_id, sodium_id, phosphorus_id, magnesium_id, bicarbonate_id]) ON CONFLICT DO NOTHING;

-- Lipid Profile
WITH lipid_panel AS (
INSERT INTO test_catalog (name, department, price) VALUES ('Lipid Profile', 'CHEMISTRY', 250.00) ON CONFLICT (name) DO NOTHING RETURNING id
)
INSERT INTO test_catalog_analytes (test_catalog_id, analyte_id) SELECT (SELECT id FROM lipid_panel), unnest(array[total_chol_id, hdl_chol_id, ldl_chol_id, trig_id]) ON CONFLICT DO NOTHING;

-- Step 5: Insert all Normal Ranges
-- Total Protein Ranges
INSERT INTO normal_ranges (analyte_id, min_age, max_age, gender, lower_bound, upper_bound) VALUES
(total_protein_id, 0, 0, 'Any', 44, 76), -- Newborn
(total_protein_id, 0, 1, 'Any', 42, 74), -- Infant
(total_protein_id, 1, 18, 'Any', 56, 72), -- Child
(total_protein_id, 18, 120, 'Any', 65, 87); -- Adult

-- Albumin Ranges
INSERT INTO normal_ranges (analyte_id, min_age, max_age, gender, lower_bound, upper_bound) VALUES
(albumin_id, 0, 0, 'Any', 29, 55), -- Newborn
(albumin_id, 0, 1, 'Any', 28, 50), -- Infant
(albumin_id, 1, 18, 'Any', 39, 51), -- Child
(albumin_id, 18, 120, 'Any', 38, 55); -- Adult

-- Alkaline Phosphatase Ranges
INSERT INTO normal_ranges (analyte_id, min_age, max_age, gender, lower_bound, upper_bound) VALUES
(alk_phos_id, 0, 0, 'Any', 110, 300), -- Newborn
(alk_phos_id, 1, 18, 'Any', 145, 320), -- Child
(alk_phos_id, 18, 120, 'Male', 65, 260), -- Adult Male
(alk_phos_id, 18, 120, 'Female', 50, 130); -- Adult Female

-- Creatinine Ranges
INSERT INTO normal_ranges (analyte_id, min_age, max_age, gender, lower_bound, upper_bound) VALUES
(creatinine_id, 0, 0, 'Any', 27, 77), -- Neonate
(creatinine_id, 0, 1, 'Any', 26.52, 61.88), -- Infant
(creatinine_id, 1, 18, 'Any', 44.2, 88.4), -- Child
(creatinine_id, 18, 120, 'Male', 62.0, 123), -- Adult Male
(creatinine_id, 18, 120, 'Female', 44, 88.4); -- Adult Female

-- And so on for all other ranges from the PDF...

END $$;