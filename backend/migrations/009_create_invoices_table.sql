-- Create the 'invoices' table to store transaction records
CREATE TABLE invoices (
id SERIAL PRIMARY KEY,
test_request_id INTEGER REFERENCES test_requests(id) NOT NULL,
amount DECIMAL(10, 2) NOT NULL,
payment_method VARCHAR(50) DEFAULT 'Cash',
created_at TIMESTAMPTZ DEFAULT NOW(),
-- Foreign key to the receptionist/admin who processed the payment
processed_by INTEGER REFERENCES users(id)
);