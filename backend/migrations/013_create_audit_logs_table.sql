-- Create the 'audit_logs' table to store a record of user actions
CREATE TABLE audit_logs (
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
action VARCHAR(255) NOT NULL, -- e.g., 'USER_LOGIN', 'PATIENT_CREATE'
details JSONB, -- Optional: Store extra data like the ID of the created patient
created_at TIMESTAMPTZ DEFAULT NOW()
);