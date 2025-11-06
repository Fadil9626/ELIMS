-- Step 1: Create a table to manage standard units of measurement
CREATE TABLE units (
id SERIAL PRIMARY KEY,
name VARCHAR(50) UNIQUE NOT NULL
);

-- Seed with some common units
INSERT INTO units (name) VALUES ('mg/dL'), ('mmol/L'), ('g/dL'), ('U/L'), ('%'), ('x10^9/L');

-- Step 2: Create a table for individual test components (analytes)
CREATE TABLE test_analytes (
id SERIAL PRIMARY KEY,
name VARCHAR(255) UNIQUE NOT NULL,
unit_id INTEGER REFERENCES units(id)
);

-- Seed with some common analytes
INSERT INTO test_analytes (name, unit_id) VALUES
('Glucose', 1), -- mg/dL
('Cholesterol', 1), -- mg/dL
('Triglycerides', 1), -- mg/dL
('Hemoglobin', 3); -- g/dL

-- Step 3: Create a junction table to link a "Test Panel" to its "Analytes"
-- This allows a single test (e.g., Lipid Panel) to contain multiple components
CREATE TABLE test_catalog_analytes (
test_catalog_id INTEGER REFERENCES test_catalog(id) ON DELETE CASCADE,
analyte_id INTEGER REFERENCES test_analytes(id) ON DELETE CASCADE,
PRIMARY KEY (test_catalog_id, analyte_id)
);

-- Step 4: Create a table to store normal ranges for each analyte
-- This table is powerful, allowing for ranges based on age and gender
CREATE TABLE normal_ranges (
id SERIAL PRIMARY KEY,
analyte_id INTEGER REFERENCES test_analytes(id) ON DELETE CASCADE NOT NULL,
min_age INTEGER DEFAULT 0,
max_age INTEGER DEFAULT 120,
gender VARCHAR(10) DEFAULT 'Any', -- 'Male', 'Female', or 'Any'
lower_bound DECIMAL,
upper_bound DECIMAL
);

-- Seed with an example normal range for Glucose
INSERT INTO normal_ranges (analyte_id, lower_bound, upper_bound) VALUES
(1, 70, 100); -- Glucose for any age/gender is 70-100 mg/dL