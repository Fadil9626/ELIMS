import React from "react";
import { Link } from "react-router-dom";
import { HiExclamationCircle } from "react-icons/hi";

const UnauthorizedPage = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
    <HiExclamationCircle className="w-20 h-20 text-red-500 mb-4" />
    <h1 className="text-3xl font-bold text-gray-800 mb-2">Access Denied</h1>
    <p className="text-gray-600 mb-6 text-center">
      You don't have permission to view this page.
    </p>
    <Link
      to="/"
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Go Back to Dashboard
    </Link>
  </div>
);

export default UnauthorizedPage;
