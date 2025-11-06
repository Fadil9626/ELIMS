import React, { useState, useEffect } from 'react';
import userService from '../../services/userService';
import { HiOutlineUserCircle } from 'react-icons/hi';

const ActiveUsersWidget = () => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get token from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo?.token;

        if (!token) {
          throw new Error('User not authenticated');
        }

        const data = await userService.getActiveUsers(token);
        setActiveUsers(data);
      } catch (err) {
        console.error('Error fetching active users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveUsers();

    // Optional: refresh every 60 seconds
    const interval = setInterval(fetchActiveUsers, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-500">Loading active users...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">
        Currently Active Users ({activeUsers.length})
      </h3>
      <ul className="space-y-3 h-64 overflow-y-auto">
        {activeUsers.length > 0 ? (
          activeUsers.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-3">
                <HiOutlineUserCircle className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-semibold">{user.full_name}</p>
                  <p className="text-sm text-gray-500">{user.role_name}</p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-semibold">Online</span>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No users are currently active.</p>
        )}
      </ul>
    </div>
  );
};

export default ActiveUsersWidget;
