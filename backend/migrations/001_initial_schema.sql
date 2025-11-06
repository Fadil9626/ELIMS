-- Create the 'roles' table to define user roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB
);

-- Create the 'users' table to store user information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default roles into the 'roles' table
INSERT INTO roles (id, name) VALUES
(1, 'Super Administrator'),
(2, 'Administrator'),
(3, 'Pathologist'),
(4, 'Receptionist'),
(5, 'Doctor');