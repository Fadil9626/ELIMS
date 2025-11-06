import React, { useState, useEffect } from 'react';

const AddEditRoleModal = ({ isOpen, onClose, onSave, roleData }) => {
    const isEditMode = !!roleData;
    const [roleName, setRoleName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setRoleName(isEditMode ? roleData.name : '');
        }
    }, [isOpen, roleData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name: roleName }, roleData?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">{isEditMode ? 'Edit Role Name' : 'Add New Role'}</h2>
                <form onSubmit={handleSubmit}>
                    <label className="block text-gray-700 font-medium mb-2">Role Name</label>
                    <input
                        type="text"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        required
                    />
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-300 py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md">Save Role</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditRoleModal;

