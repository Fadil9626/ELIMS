import React, { useState, useEffect } from 'react';
// ✅ IMPORTANT: This imports the UI component from Step 1
import SystemSettingsForm from '../../components/SystemSettingsForm'; 
import apiFetch from '../../services/apiFetch'; 
import toast from 'react-hot-toast';

const SystemSettingsPage = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await apiFetch('/api/settings'); 
                setSettings(data);
            } catch (error) {
                console.error("Failed to load settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleUpdateSettings = async (updatedValues) => {
        try {
            await apiFetch('/api/settings', {
                method: 'PUT',
                body: JSON.stringify(updatedValues),
            });
            setSettings(updatedValues);
            toast.success("System settings updated successfully!");
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Failed to update settings.");
        }
    };

    if (loading) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="p-6">
            {/* This H1 is the text that was repeating in your image */}
            <h1 className="text-2xl font-bold mb-6">System Settings</h1>
            
            {/* This renders the Form Component ONE time */}
            <SystemSettingsForm 
                settings={settings || {}} 
                onUpdate={handleUpdateSettings} 
            />
        </div>
    );
};

export default SystemSettingsPage;