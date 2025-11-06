import React from 'react';
import { HiOutlineExclamation } from 'react-icons/hi';

const MaintenancePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-4">
      <HiOutlineExclamation className="w-16 h-16 text-yellow-500 mb-4" />
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Under Maintenance</h1>
      <p className="text-lg text-gray-600">
        Our system is currently down for scheduled maintenance. Please check back later.
      </p>
    </div>
  );
};

export default MaintenancePage;
