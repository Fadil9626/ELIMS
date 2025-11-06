import React, { useState, useEffect } from 'react';

const ToggleSwitch = ({ label, enabled, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="font-medium text-gray-700">{label}</span>
        <div 
            onClick={() => onChange(!enabled)}
            className={`w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 transition-colors duration-300 ${enabled ? 'bg-blue-600' : ''}`}
        >
            <div 
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-6' : ''}`}
            ></div>
        </div>
    </label>
);

const SecuritySettingsForm = ({ settings, onUpdate }) => {
    // Initialize state from props, converting string values to the correct types
    const [minLength, setMinLength] = useState(8);
    const [requireUppercase, setRequireUppercase] = useState(false);
    const [requireLowercase, setRequireLowercase] = useState(false);
    const [requireNumber, setRequireNumber] = useState(false);
    const [requireSpecial, setRequireSpecial] = useState(false);

    useEffect(() => {
        if (settings) {
            setMinLength(parseInt(settings.security_password_min_length, 10) || 8);
            setRequireUppercase(settings.security_password_require_uppercase === 'true');
            setRequireLowercase(settings.security_password_require_lowercase === 'true');
            setRequireNumber(settings.security_password_require_number === 'true');
            setRequireSpecial(settings.security_password_require_special === 'true');
        }
    }, [settings]);

    const handleSave = () => {
        onUpdate({
            security_password_min_length: String(minLength),
            security_password_require_uppercase: String(requireUppercase),
            security_password_require_lowercase: String(requireLowercase),
            security_password_require_number: String(requireNumber),
            security_password_require_special: String(requireSpecial),
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Security Settings</h2>
            
            <div className="space-y-6">
                {/* Password Policy Section */}
                <div className="border-t pt-4">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Password Policy</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">Minimum Password Length</label>
                            <input 
                                type="number"
                                value={minLength}
                                onChange={(e) => setMinLength(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <ToggleSwitch label="Require Uppercase Letter" enabled={requireUppercase} onChange={setRequireUppercase} />
                        <ToggleSwitch label="Require Lowercase Letter" enabled={requireLowercase} onChange={setRequireLowercase} />
                        <ToggleSwitch label="Require Number" enabled={requireNumber} onChange={setRequireNumber} />
                        <ToggleSwitch label="Require Special Character" enabled={requireSpecial} onChange={setRequireSpecial} />
                    </div>
                </div>

                <div className="text-right pt-6 border-t">
                    <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700">
                        Save Security Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettingsForm;

