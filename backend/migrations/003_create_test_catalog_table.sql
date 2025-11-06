-- Create the 'test_catalog' table to store all available lab tests
CREATE TABLE test_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL
);

-- Insert some sample tests into the catalog
INSERT INTO test_catalog (name, department, price) VALUES
('Complete Blood Count (CBC)', 'HEMATOLOGY', 150.00),
('Lipid Panel', 'CHEMISTRY', 250.50),
('Urinalysis', 'MICROBIOLOGY', 100.00),
('Blood Glucose', 'CHEMISTRY', 75.00);