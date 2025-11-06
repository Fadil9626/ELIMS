-- Step 1: Add 'department' and 'price' columns to the test_analytes table.
-- This makes each analyte a fully configurable, standalone test.
ALTER TABLE test_analytes
ADD COLUMN department VARCHAR(100),
ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Step 2: Back-fill the department for the analytes we've already created.
-- We'll assign them based on the panels they belonged to.
UPDATE test_analytes SET department = 'CHEMISTRY' WHERE name IN
('Total Protein', 'Albumin', 'Globulin', 'Alkaline Phosphatase', 'Total Bilirubin',
'Direct Bilirubin', 'Indirect Bilirubin', 'ALT/SGPT', 'AST/SGOT', 'Gamma GT',
'Creatinine', 'Urea', 'Uric Acid', 'Calcium', 'Chloride', 'Potassium', 'Sodium',
'Phosphorus', 'Magnesium', 'Bicarbonate', 'Total Cholesterol', 'HDL Cholesterol',
'LDL Cholesterol', 'Triglycerides', 'Fasting plasma Glucose', 'Amylase', 'Lipase');

UPDATE test_analytes SET department = 'HEMATOLOGY' WHERE name IN ('Hemoglobin', 'HbA1c');
UPDATE test_analytes SET department = 'IMMUNOLOGY' WHERE name IN ('Troponin I', 'C-RP');

-- Step 3: We no longer need price on the main test_catalog (panel) table,
-- as the price will be the sum of its analytes.
-- This step is optional but recommended for a clean structure.
-- ALTER TABLE test_catalog DROP COLUMN price;