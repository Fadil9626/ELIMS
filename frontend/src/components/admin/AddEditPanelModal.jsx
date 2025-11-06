import React, { useState, useEffect } from 'react';

const AddEditPanelModal = ({ isOpen, onClose, onSave, panelData }) => {
    const isEditMode = !!panelData;
    const [formData, setFormData] = useState({ name: '', department: '' });
    const departments = ['CHEMISTRY', 'HEMATOLOGY', 'MICROBIOLOGY', 'IMMUNOLOGY', 'GENERAL'];

    useEffect(() => {
        if (isOpen) {
            setFormData(isEditMode ? { name: panelData.name, department: panelData.department } : { name: '', department: 'GENERAL' });
        }
    }, [isOpen, panelData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, panelData?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">{isEditMode ? 'Edit Panel' : 'Add New Panel'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Panel Name" className="w-full p-2 border rounded-md" required />
                    <select name="department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full p-2 border rounded-md" required>
                        <option value="">Select Department</option>
                        {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                    </select>
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-300 py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md">Save Panel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditPanelModal;

