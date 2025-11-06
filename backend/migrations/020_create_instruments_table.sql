-- Create a table to store information about laboratory instruments/analyzers
CREATE TABLE instruments (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
department VARCHAR(100),
connection_type VARCHAR(50), -- e.g., 'Serial', 'Network (TCP/IP)', 'File-based'
ip_address VARCHAR(50),
port INTEGER,
created_at TIMESTAMPTZ DEFAULT NOW()
);