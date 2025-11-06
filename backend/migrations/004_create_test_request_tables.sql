-- Create the main 'test_requests' table
-- This represents a single order or requisition for a patient
CREATE TABLE test_requests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) NOT NULL,
    doctor_id INTEGER REFERENCES users(id), -- The doctor who requested the tests
    status VARCHAR(50) NOT NULL DEFAULT 'Awaiting Payment', -- Workflow status
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the 'test_request_items' table
-- This represents a single test within a larger request
CREATE TABLE test_request_items (
    id SERIAL PRIMARY KEY,
    test_request_id INTEGER REFERENCES test_requests(id) ON DELETE CASCADE NOT NULL,
    test_catalog_id INTEGER REFERENCES test_catalog(id) NOT NULL,
    result_data JSONB, -- To store the actual test results
    notes TEXT, -- Notes from the pathologist
    pathologist_id INTEGER REFERENCES users(id), -- The pathologist who validated the result
    validated_at TIMESTAMPTZ
);