-- Create a table for key-value system settings
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT
);

-- Insert default values for our initial settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
('currency_symbol', '$'),
('currency_name', 'USD'),
('maintenance_mode', 'false');