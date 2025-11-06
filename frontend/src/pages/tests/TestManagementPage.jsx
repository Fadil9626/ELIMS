import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import testRequestService from '../../services/testRequestService';

const TestManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo ? userInfo.token : null;
        const data = await testRequestService.getAllTestRequests(token);
        setRequests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-200 text-yellow-800';
      case 'Completed':
        return 'bg-green-200 text-green-800';
      case 'Awaiting Payment':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  if (loading) return <div className="p-6">Loading test requests...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Test Management</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 font-semibold">Request ID</th>
              <th className="p-4 font-semibold">Patient Name</th>
              <th className="p-4 font-semibold">Doctor Name</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Date Requested</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {requests.length > 0 ? (
              requests.map((req, index) => (
                <tr
                  key={req.request_id || req.id || index}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-4 font-mono">{req.request_id || req.id}</td>
                  <td className="p-4">{req.patient_name || `${req.patient_first_name || ''} ${req.patient_last_name || ''}`}</td>
                  <td className="p-4">{req.doctor_name || 'N/A'}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(
                        req.status
                      )}`}
                    >
                      {req.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-4">
                    {req.created_at
                      ? new Date(req.created_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="p-4">
                    <Link to={`/tests/requests/${req.request_id || req.id}`}>
                      <button className="bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600">
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="p-6 text-center text-gray-500 italic"
                >
                  No test requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestManagementPage;
