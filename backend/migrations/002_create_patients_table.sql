-- Create the 'patients' table to store patient demographic and contact information
CREATE TABLE patients (
    -- Unique identifier for each patient
    id SERIAL PRIMARY KEY,

    -- Patient's first and last name
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,

    -- Patient's date of birth
    date_of_birth DATE NOT NULL,

    -- Patient's gender
    gender VARCHAR(50),

    -- Flexible field for contact details like phone, address, etc.
    contact_info JSONB,

    -- Timestamp of when the patient was registered
    registered_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key to link to the user who registered the patient
    registered_by INTEGER REFERENCES users(id)
);