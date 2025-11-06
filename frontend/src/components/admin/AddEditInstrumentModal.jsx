import React, { useState, useEffect } from 'react';

const AddEditInstrumentModal = ({ isOpen, onClose, onSave, instrumentData }) => {
    const isEditMode = !!instrumentData;
    const [formData, setFormData] = useState({ name: '', department: 'CHEMISTRY', connection_type: 'Network (TCP/IP)', ip_address: '', port: '' });
    
    const departments = ['CHEMISTRY', 'HEMATOLOGY', 'MICROBIOLOGY', 'IMMUNOLOGY'];
    const connectionTypes = ['Network (TCP/IP)', 'Serial (RS-232)', 'File-based'];

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setFormData({
                    name: instrumentData.name || '',
                    department: instrumentData.department || 'CHEMISTRY',
                    connection_type: instrumentData.connection_type || 'Network (TCP/IP)',
                    ip_address: instrumentData.ip_address || '',
                    port: instrumentData.port || ''
                });
            } else {
                setFormData({ name: '', department: 'CHEMISTRY', connection_type: 'Network (TCP/IP)', ip_address: '', port: '' });
            }
        }
    }, [isOpen, instrumentData]);
    
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, instrumentData?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">{isEditMode ? 'Edit Instrument' : 'Add New Instrument'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Instrument Name" className="w-full p-2 border rounded-md" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="department" value={formData.department} onChange={handleChange} className="w-full p-2 border rounded-md">
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select name="connection_type" value={formData.connection_type} onChange={handleChange} className="w-full p-2 border rounded-md">
                            {connectionTypes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="IP Address (if applicable)" className="w-full p-2 border rounded-md" />
                        <input type="number" name="port" value={formData.port} onChange={handleChange} placeholder="Port (if applicable)" className="w-full p-2 border rounded-md" />
                    </div>
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-300 py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md">Save Instrument</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditInstrumentModal;
