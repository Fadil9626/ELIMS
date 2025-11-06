-- Insert new keys into the system_settings table for password policies
-- These values are set to common, secure defaults.
INSERT INTO system_settings (setting_key, setting_value) VALUES
('security_password_min_length', '8'),
('security_password_require_uppercase', 'true'),
('security_password_require_lowercase', 'true'),
('security_password_require_number', 'true'),
('security_password_require_special', 'true');