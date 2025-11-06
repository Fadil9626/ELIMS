-- Create the 'inventory_items' table to track lab supplies
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    supplier VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    expiry_date DATE,
    department VARCHAR(100)
);

-- Insert some sample inventory items
INSERT INTO inventory_items (name, category, quantity, department) VALUES
('Vacutainer Tubes (5ml)', 'Consumables', 250, 'PHLEBOTOMY'),
('Glucose Reagent Kit', 'Reagents', 15, 'CHEMISTRY'),
('Microscope Slides', 'Consumables', 500, 'HEMATOLOGY');