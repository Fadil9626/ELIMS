import React, { useState } from 'react';

const SystemSettingsForm = ({ settings, onUpdate }) => {
    // Initialize state from props, providing fallbacks
    const safeSettings = settings || {};
    
    const [maintenanceMode, setMaintenanceMode] = useState(safeSettings.maintenance_mode === 'true');
    const [smtpHost, setSmtpHost] = useState(safeSettings.smtp_host || '');
    const [smtpPort, setSmtpPort] = useState(safeSettings.smtp_port || '');
    const [smtpUser, setSmtpUser] = useState(safeSettings.smtp_user || '');
    const [smtpPass, setSmtpPass] = useState(''); 

    const handleSave = (e) => {
        e.preventDefault(); // Stop page reload
        if (typeof onUpdate === 'function') {
            onUpdate({
                maintenance_mode: String(maintenanceMode),
                smtp_host: smtpHost,
                smtp_port: smtpPort,
                smtp_user: smtpUser,
                ...(smtpPass && { smtp_pass: smtpPass }), 
            });
        } else {
            console.error("onUpdate prop is missing!");
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">System Configuration</h3>
            
            <div className="space-y-6">
                {/* Toggle */}
                <div className="pt-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-medium text-gray-700">Enable Maintenance Mode</span>
                        <div 
                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                            className={`w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 transition-colors duration-300 ${maintenanceMode ? 'bg-blue-600' : ''}`}
                        >
                            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${maintenanceMode ? 'translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
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
                        <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="Update password" className="w-full p-2 border rounded-md mt-1" />
                    </div>
                </div>
                
                <div className="text-right pt-6 border-t">
                    <button 
                        type="button" // ✅ Prevents default form submission behavior
                        onClick={handleSave} 
                        className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
                    >
                        Save System Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettingsForm;