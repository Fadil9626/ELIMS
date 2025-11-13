-- This script seeds the Chemistry Analytes, their Reference Ranges, and their Test Panels.

-- Step 1: Insert all unique Units of Measurement
INSERT INTO units (unit_name) VALUES
('g/L'), ('U/L'), ('µmol/L'), ('IU/L'), ('mmol/L'), ('ng/mL'), ('%'), ('RLU'),
('IU/mL'), ('mL/min'), ('pg/mL'), ('pmol/L'), ('nmol/L'), ('mg/L'), ('µg/dL'), ('µUL/mL');
-- NOTE: Removed ON CONFLICT (name) DO NOTHING to prevent schema conflict error.

-- Define Department IDs and Unit IDs using CTEs for efficient lookup
WITH department AS (
    -- Assuming a department named 'Chemistry' exists
    SELECT id, name FROM departments WHERE name = 'Chemistry' LIMIT 1
),
unit_ids AS (
    -- FIX: Selects the correct column name 'unit_name' for lookup
    SELECT id, unit_name FROM units
),

-- Step 2: Insert ALL Analytes and link them to the Chemistry Department and Units
-- We use a VALUES clause and join against unit_ids to ensure valid unit_id insertion.
inserted_analytes AS (
    INSERT INTO analytes (name, unit_id, department_id, created_at, updated_at)
    SELECT * FROM (
        -- Bulk data definition: (Analyte Name, Unit Name, Department ID, Creation Time)
        SELECT 
            data.name,
            (SELECT id FROM unit_ids WHERE unit_name = data.unit_name), -- Unit ID lookup
            (SELECT id FROM department WHERE name = 'Chemistry'), -- Department ID lookup
            NOW(), NOW()
        FROM (VALUES
            -- LIVER FUNCTION (CHEMISTRY)
            ('Total Protein', 'g/L'), ('Albumin', 'g/L'), ('Globulin', 'g/L'), ('Alkaline Phosphatase', 'U/L'),
            ('Total Bilirubin', 'µmol/L'), ('Direct Bilirubin', 'µmol/L'), ('Indirect Bilirubin', 'µmol/L'),
            ('ALT/SGPT', 'IU/L'), ('AST/SGOT', 'IU/L'), ('Gamma GT', 'U/L'),

            -- KIDNEY FUNCTION / ELECTROLYTES (CHEMISTRY)
            ('Creatinine', 'µmol/L'), ('Urea', 'mmol/L'), ('Uric Acid', 'mmol/L'),
            ('Calcium', 'mmol/L'), ('Chloride', 'mmol/L'), ('Potassium', 'mmol/L'),
            ('Sodium', 'mmol/L'), ('Phosphorus', 'mmol/L'), ('Magnesium', 'mmol/L'),
            ('Bicarbonate', 'mmol/L'), ('Creatinine Clearance', 'mL/min'),

            -- LIPID PROFILE / GLUCOSE (CHEMISTRY)
            ('Total Cholesterol', 'mmol/L'), ('HDL Cholesterol', 'mmol/L'), ('LDL Cholesterol', 'mmol/L'),
            ('Triglycerides', 'mmol/L'), ('Fasting plasma Glucose', 'mmol/L'), ('2-Hour Post Prandial', 'mmol/L'),
            ('Random plasma Glucose', 'mmol/L'), ('HbA1c', '%'),

            -- CARDIAC MARKERS (CHEMISTRY)
            ('Troponin I', 'ng/mL'), ('Myoglobin', 'ng/mL'), ('CK-MB', 'ng/mL'), ('CK-NAC', 'U/L'),
            ('LDH', 'U/L'), ('NT-proBNP', 'pg/mL'),

            -- THYROID FUNCTION TEST (CHEMISTRY)
            ('TSH', 'µUL/mL'), ('FT3', 'pmol/L'), ('FT4', 'pmol/L'), ('TT4', 'nmol/L'), ('TT3', 'nmol/L'),

            -- INFLAMMATORY MARKERS (CHEMISTRY / IMMUNOLOGY)
            ('C-RP', 'mg/L'), ('Serum Amyloid (SAA)', 'mg/L'), ('Procalcitonin (PCT)', 'ng/mL'),

            -- PANCREATITIS MARKERS (CHEMISTRY)
            ('Amylase', 'IU/L'), ('Lipase', 'U/L'),

            -- IMMUNOLOGY / TUMOR MARKERS (CHEMISTRY / PATHOLOGY)
            ('H.Pylori Ab', 'RLU'), ('H.Pylori Ag', 'RLU'), ('D-dimer', 'mg/L'),
            ('Total PSA', 'ng/mL'), ('Free PSA', 'ng/mL'), ('CEA', 'ng/mL'),
            ('Alpha Fetoprotein (AFP)', 'ng/mL'), ('CA 19-9', 'U/mL'),
            ('CA 125', 'U/mL'), ('CA 72-4', 'U/mL')
        ) AS data(name, unit_name)
    ) AS source(name, unit_id, department_id, created_at, updated_at)
    ON CONFLICT (name) DO NOTHING RETURNING id, name
)
,
-- Define a new CTE for fetching the final analyte IDs after the insert, including existing ones
final_analytes AS (
    SELECT id, name FROM analytes WHERE name IN (
        'Total Protein', 'Albumin', 'Globulin', 'Alkaline Phosphatase', 'Total Bilirubin', 'Direct Bilirubin', 
        'Indirect Bilirubin', 'ALT/SGPT', 'AST/SGOT', 'Gamma GT', 'Creatinine', 'Urea', 'Uric Acid', 
        'Calcium', 'Chloride', 'Potassium', 'Sodium', 'Phosphorus', 'Magnesium', 'Bicarbonate', 
        'Creatinine Clearance', 'Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides', 
        'Fasting plasma Glucose', '2-Hour Post Prandial', 'Random plasma Glucose', 'HbA1c', 'Troponin I', 
        'Myoglobin', 'CK-MB', 'CK-NAC', 'LDH', 'NT-proBNP', 'TSH', 'FT3', 'FT4', 'TT4', 'TT3', 'C-RP', 
        'Serum Amyloid (SAA)', 'Procalcitonin (PCT)', 'Amylase', 'Lipase', 'H.Pylori Ab', 'H.Pylori Ag', 
        'D-dimer', 'Total PSA', 'Free PSA', 'CEA', 'Alpha Fetoprotein (AFP)', 'CA 19-9', 'CA 125', 'CA 72-4'
    )
)
-- 3. Insert Reference Ranges (The full list extracted from the template)
INSERT INTO analyte_reference_ranges 
    (analyte_id, gender, min_age, max_age, min_value, max_value)
VALUES
    -- Total Protein (g/L)
    ((SELECT id FROM final_analytes WHERE name = 'Total Protein'), 'A', 0, 0, 44, 76), -- Newborn
    ((SELECT id FROM final_analytes WHERE name = 'Total Protein'), 'A', 1, 12, 42, 74), -- Infant
    ((SELECT id FROM final_analytes WHERE name = 'Total Protein'), 'A', 13, 17, 56, 72), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Total Protein'), 'A', 18, 120, 65, 87), -- Adult
    
    -- Albumin (g/L)
    ((SELECT id FROM final_analytes WHERE name = 'Albumin'), 'A', 0, 0, 29, 55),
    ((SELECT id FROM final_analytes WHERE name = 'Albumin'), 'A', 1, 12, 28, 50),
    ((SELECT id FROM final_analytes WHERE name = 'Albumin'), 'A', 13, 17, 39, 51),
    ((SELECT id FROM final_analytes WHERE name = 'Albumin'), 'A', 18, 120, 38, 55),
    
    -- Globulin (g/L)
    ((SELECT id FROM final_analytes WHERE name = 'Globulin'), 'A', 1, 17, 20, 35), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Globulin'), 'A', 18, 120, 23, 35), -- Adult

    -- Alkaline Phosphatase (U/L)
    ((SELECT id FROM final_analytes WHERE name = 'Alkaline Phosphatase'), 'A', 0, 0, 110, 300), -- Newborn
    ((SELECT id FROM final_analytes WHERE name = 'Alkaline Phosphatase'), 'A', 1, 17, 145, 320), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Alkaline Phosphatase'), 'M', 18, 120, 65, 260), -- Male
    ((SELECT id FROM final_analytes WHERE name = 'Alkaline Phosphatase'), 'F', 18, 120, 50, 130), -- Female

    -- Total Bilirubin (µmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Total Bilirubin'), 'A', 0, 120, 0, 18.8),

    -- Direct Bilirubin (µmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Direct Bilirubin'), 'A', 0, 120, 0, 5.13),

    -- Indirect Bilirubin (µmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Indirect Bilirubin'), 'A', 0, 120, 0, 13.68),

    -- ALT/SGPT (IU/L)
    ((SELECT id FROM final_analytes WHERE name = 'ALT/SGPT'), 'M', 18, 120, 0, 50),
    ((SELECT id FROM final_analytes WHERE name = 'ALT/SGPT'), 'F', 18, 120, 0, 35),

    -- AST/SGOT (IU/L)
    ((SELECT id FROM final_analytes WHERE name = 'AST/SGOT'), 'M', 18, 120, 10, 40),
    ((SELECT id FROM final_analytes WHERE name = 'AST/SGOT'), 'F', 18, 120, 9, 32),

    -- Gamma GT (U/L)
    ((SELECT id FROM final_analytes WHERE name = 'Gamma GT'), 'M', 18, 120, 11, 50),
    ((SELECT id FROM final_analytes WHERE name = 'Gamma GT'), 'F', 18, 120, 7, 32),

    -- Creatinine (µmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Creatinine'), 'A', 0, 0, 27, 77), -- Neonate
    ((SELECT id FROM final_analytes WHERE name = 'Creatinine'), 'A', 1, 12, 26.52, 61.88), -- Infant
    ((SELECT id FROM final_analytes WHERE name = 'Creatinine'), 'A', 13, 17, 44.2, 88.4), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Creatinine'), 'M', 18, 120, 62.0, 123), -- Adult Male
    ((SELECT id FROM final_analytes WHERE name = 'Creatinine'), 'F', 18, 120, 44, 88.4), -- Adult Female

    -- Urea (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Urea'), 'A', 0, 0, 0.8, 5.5), -- Neonate
    ((SELECT id FROM final_analytes WHERE name = 'Urea'), 'A', 1, 17, 1.0, 5.5), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Urea'), 'A', 18, 120, 2.5, 7.5), -- Adult

    -- Uric Acid (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Uric Acid'), 'A', 1, 17, 0.06, 0.24), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Uric Acid'), 'M', 18, 120, 0.20, 0.43), -- Male
    ((SELECT id FROM final_analytes WHERE name = 'Uric Acid'), 'F', 18, 120, 0.14, 0.36), -- Female

    -- Calcium (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Calcium'), 'A', 0, 0, 1.75, 3.00), -- Newborn
    ((SELECT id FROM final_analytes WHERE name = 'Calcium'), 'A', 1, 120, 2.15, 2.67), -- Adult

    -- Chloride (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Chloride'), 'A', 0, 0, 96, 106), -- Newborn
    ((SELECT id FROM final_analytes WHERE name = 'Chloride'), 'A', 1, 17, 90, 110), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Chloride'), 'A', 18, 120, 95, 115), -- Adult

    -- Potassium (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Potassium'), 'A', 0, 0, 4.5, 7.2), -- Neonate
    ((SELECT id FROM final_analytes WHERE name = 'Potassium'), 'A', 1, 12, 4.1, 6.2), -- Infant
    ((SELECT id FROM final_analytes WHERE name = 'Potassium'), 'A', 13, 17, 3.7, 5.6), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Potassium'), 'A', 18, 120, 3.5, 5.3), -- Adult

    -- Sodium (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Sodium'), 'A', 0, 120, 135, 155), -- All

    -- Phosphorus (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Phosphorus'), 'A', 0, 0, 1.40, 3.00), -- Neonate
    ((SELECT id FROM final_analytes WHERE name = 'Phosphorus'), 'A', 1, 17, 1.25, 2.10), -- Children
    ((SELECT id FROM final_analytes WHERE name = 'Phosphorus'), 'A', 18, 120, 0.80, 1.61), -- Adult

    -- Magnesium (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Magnesium'), 'A', 1, 17, 0.72, 2.09), -- Children
    ((SELECT id FROM final_analytes WHERE name = 'Magnesium'), 'A', 18, 120, 0.66, 1.03), -- Adult

    -- Bicarbonate (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Bicarbonate'), 'A', 0, 120, 20, 30), -- All

    -- Total Cholesterol (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Total Cholesterol'), 'A', 0, 0, 0, 1.8), -- Newborn
    ((SELECT id FROM final_analytes WHERE name = 'Total Cholesterol'), 'A', 1, 17, 0, 4.4), -- Child
    ((SELECT id FROM final_analytes WHERE name = 'Total Cholesterol'), 'A', 18, 120, 0, 5.17), -- Adult

    -- Triglycerides (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Triglycerides'), 'M', 18, 120, 0.68, 1.88), -- Male
    ((SELECT id FROM final_analytes WHERE name = 'Triglycerides'), 'F', 18, 120, 0.46, 1.60), -- Female

    -- Fasting plasma Glucose (mmol/L)
    ((SELECT id FROM final_analytes WHERE name = 'Fasting plasma Glucose'), 'A', 0, 120, 3.8, 5.6),

    -- HbA1c (%)
    ((SELECT id FROM final_analytes WHERE name = 'HbA1c'), 'A', 0, 120, 3.8, 6.0),

    -- C-RP (mg/L)
    ((SELECT id FROM final_analytes WHERE name = 'C-RP'), 'A', 0, 120, 0, 3.0),

    -- Amylase (IU/L)
    ((SELECT id FROM final_analytes WHERE name = 'Amylase'), 'A', 0, 120, 0, 90),

    -- Lipase (U/L)
    ((SELECT id FROM final_analytes WHERE name = 'Lipase'), 'A', 0, 120, 0, 160),

    -- Total PSA (ng/mL)
    ((SELECT id FROM final_analytes WHERE name = 'Total PSA'), 'A', 0, 120, 0, 4)
ON CONFLICT ON CONSTRAINT analyte_reference_ranges_analyte_id_gender_min_age_max_age_key DO NOTHING;