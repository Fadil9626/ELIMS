import React, { useState, useEffect } from 'react';
import userService from '../../services/userService';
import { HiKey } from 'react-icons/hi';

const PasswordManager = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
                const data = await userService.getAllUsers(token);
                setUsers(data);
            } catch (error) {
                console.error(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleResetClick = (user) => {
        setSelectedUser(user);
        setNewPassword('');
    };

    const handleConfirmReset = async () => {
        if (!selectedUser || !newPassword) {
            alert('Please enter a new password.');
            return;
        }
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            await userService.adminSetPassword(selectedUser.id, newPassword, token);
            alert(`Password for ${selectedUser.full_name} has been reset successfully.`);
            setSelectedUser(null);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    if (loading) return <div>Loading user list...</div>;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Password Management</h2>
            <p className="text-gray-600 mb-4">
                Select a user to reset their password. They will be required to change this temporary password on their next login.
            </p>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3">User</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b">
                                <td className="p-3 font-semibold">{user.full_name}</td>
                                <td className="p-3">{user.role_name}</td>
                                <td className="p-3">
                                    <button 
                                        onClick={() => handleResetClick(user)} 
                                        className="flex items-center gap-2 bg-yellow-500 text-white py-1 px-3 rounded text-sm hover:bg-yellow-600 disabled:bg-gray-400"
                                        disabled={user.role_id === 1} // Prevent resetting other Super Admins for security
                                    >
                                        <HiKey/> Reset Password
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Modal for Password Reset */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Reset password for {selectedUser.full_name}</h3>
                        <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new temporary password"
                            className="w-full p-2 border rounded-md"
                        />
                        <div className="flex justify-end gap-4 mt-4">
                            <button onClick={() => setSelectedUser(null)} className="bg-gray-300 py-2 px-4 rounded">Cancel</button>
                            <button onClick={handleConfirmReset} className="bg-blue-600 text-white py-2 px-4 rounded">Confirm Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PasswordManager;

