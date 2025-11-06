import React, { useState } from 'react';

const SystemSettingsForm = ({ settings, onUpdate }) => {
    // Initialize state from props, providing fallbacks
    const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenance_mode === 'true');
    const [smtpHost, setSmtpHost] = useState(settings.smtp_host || '');
    const [smtpPort, setSmtpPort] = useState(settings.smtp_port || '');
    const [smtpUser, setSmtpUser] = useState(settings.smtp_user || '');
    const [smtpPass, setSmtpPass] = useState(''); // Password should not be pre-filled

    const handleSave = () => {
        onUpdate({
            maintenance_mode: String(maintenanceMode),
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_user: smtpUser,
            ...(smtpPass && { smtp_pass: smtpPass }), // Only include password if a new one is typed
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">System Configuration</h3>
            <div className="space-y-6">

                {/* Maintenance Mode Toggle */}
                <div className="pt-4">
                    <label className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Enable Maintenance Mode</span>
                        <div 
                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                            className={`w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer transition-colors duration-300 ${maintenanceMode ? 'bg-blue-600' : ''}`}
                        >
                            <div 
                                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${maintenanceMode ? 'translate-x-6' : ''}`}
                            ></div>
                        </div>
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                        When enabled, only administrators can log in. Other users will see a maintenance page.
                    </p>
                </div>

                {/* SMTP Settings */}
                <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">SMTP Email Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 font-medium">SMTP Host</label>
                            <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium">SMTP Port</label>
                            <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium">SMTP Username</label>
                            <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium">SMTP Password</label>
                            <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="Enter new password to update" className="w-full p-2 border rounded-md mt-1" />
                        </div>
                    </div>
                </div>
                
                <div className="text-right pt-6 border-t">
                    <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700">
                        Save System Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettingsForm;

