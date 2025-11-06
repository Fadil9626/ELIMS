import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineBell, HiOutlineUserCircle, HiOutlineLogout } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // ✅ use your AuthContext
import GlobalSearch from '../dashboard/GlobalSearch'; // ✅ adjust if in different path

const DashboardHeader = ({ userName, userImageUrl, onNotificationsClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth(); // ✅ use logout from context
  const API_BASE_URL = 'http://localhost:5000'; // Base URL for your backend

  // --- Close dropdown when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
      {/* Left section — Placeholder or title */}
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-700 hidden md:block ml-2">
          Admin Dashboard
        </h1>
      </div>

      {/* Center — Global Search Bar */}
      <div className="flex-1 mx-6 max-w-xl w-full">
        <GlobalSearch />
      </div>

      {/* Right section — Notifications & User Dropdown */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onNotificationsClick}
          className="p-2 rounded-full hover:bg-gray-200"
          title="Notifications"
        >
          <HiOutlineBell className="w-6 h-6 text-gray-600" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-200"
          >
            {userImageUrl ? (
              <img
                src={`${API_BASE_URL}${userImageUrl}`}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <HiOutlineUserCircle className="w-8 h-8 text-gray-600" />
            )}
            <span className="font-semibold text-gray-700 hidden md:block pr-2">
              Welcome, {userName}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
              <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Profile
              </Link>
              <div className="border-t my-1"></div>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout(true, true); // ✅ confirmation toast version
                }}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <HiOutlineLogout className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
