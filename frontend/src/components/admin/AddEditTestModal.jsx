import React, { useState, useEffect } from 'react';

// In a real application, these dropdown options would be fetched from their respective APIs.
// For now, we are using the hardcoded examples from your blueprint.
const AddEditTestModal = ({ isOpen, onClose, onSave, testData }) => {
    const isEditMode = !!testData;
    const [formData, setFormData] = useState({});

    const departments = [{id: 1, name: 'Hematology'}, {id: 2, name: 'Biochemistry'}, {id: 3, name: 'Microbiology'}];
    const sampleTypes = [{id: 1, name: 'Blood'}, {id: 2, name: 'Urine'}, {id: 3, name: 'Stool'}, {id: 4, name: 'Sputum'}, {id: 5, name: 'Serum'}];
    const units = [{id: 1, symbol: 'g/dL'}, {id: 2, symbol: 'mg/dL'}, {id: 3, symbol: 'cells/µL'}];

    useEffect(() => {
        if (isOpen) {
            // Pre-fill the form if in edit mode, otherwise use default values for a new test
            setFormData(isEditMode ? testData : { 
                code: '', name: '', department_id: '', sample_type_id: '', unit_id: '', 
                price: '0.00', status: 'active', method: '', normal_range_min: '', normal_range_max: '' 
            });
        }
    }, [isOpen, testData]);
    
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, testData?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">{isEditMode ? 'Edit Test' : 'Add New Test'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="code" value={formData.code || ''} onChange={handleChange} placeholder="Test Code (e.g., HB)" className="w-full p-2 border rounded-md" required />
                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Test Name (e.g., Hemoglobin)" className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select name="department_id" value={formData.department_id || ''} onChange={handleChange} className="w-full p-2 border rounded-md" required>
                            <option value="">Select Department</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select name="sample_type_id" value={formData.sample_type_id || ''} onChange={handleChange} className="w-full p-2 border rounded-md" required>
                            <option value="">Select Sample Type</option>
                            {sampleTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                         <select name="unit_id" value={formData.unit_id || ''} onChange={handleChange} className="w-full p-2 border rounded-md">
                            <option value="">Select Unit</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="number" step="0.01" name="normal_range_min" value={formData.normal_range_min || ''} onChange={handleChange} placeholder="Normal Range (Min)" className="w-full p-2 border rounded-md" />
                        <input type="number" step="0.01" name="normal_range_max" value={formData.normal_range_max || ''} onChange={handleChange} placeholder="Normal Range (Max)" className="w-full p-2 border rounded-md" />
                    </div>
                    <input type="text" name="method" value={formData.method || ''} onChange={handleChange} placeholder="Method" className="w-full p-2 border rounded-md" />
                    <input type="number" step="0.01" name="price" value={formData.price || ''} onChange={handleChange} placeholder="Price" className="w-full p-2 border rounded-md" required />
                    
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-300 py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md">Save Test</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditTestModal;

