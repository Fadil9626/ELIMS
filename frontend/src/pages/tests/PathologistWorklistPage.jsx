import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import testRequestService from '../../services/testRequestService';

const PathologistWorklistPage = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndFilterRequests = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo ? userInfo.token : null;
        
        // 1. Fetch all requests
        const allRequests = await testRequestService.getAllTestRequests(token);

        // 2. Filter for only 'Pending' requests
        const pending = allRequests.filter(req => req.status === 'Pending');
        setPendingRequests(pending);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAndFilterRequests();
  }, []);

  if (loading) return <div>Loading pending tests...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Pathologist Worklist (Pending Tests)</h1>
      <table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Patient Name</th>
            <th>Doctor Name</th>
            <th>Date Requested</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <tr key={req.id}>
                <td>{req.id}</td>
                <td>{req.patient_first_name} {req.patient_last_name}</td>
                <td>{req.doctor_name || 'N/A'}</td>
                <td>{new Date(req.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`/tests/requests/${req.id}`}>Enter Results</Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No pending tests found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PathologistWorklistPage;