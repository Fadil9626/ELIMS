import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import testCatalogService from '../../services/testCatalogService';
import testRequestService from '../../services/testRequestService';

const RequestTestPage = () => {
  const { id: patientId } = useParams();
  const navigate = useNavigate();

  const [testCatalog, setTestCatalog] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo ? userInfo.token : null;
        const data = await testCatalogService.getAllCatalogTests(token);
        setTestCatalog(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const handleCheckboxChange = (testId) => {
    setSelectedTests(prev => 
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      alert('Please select at least one test.');
      return;
    }
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo ? userInfo.token : null;
      await testRequestService.createTestRequest({ patientId, testIds: selectedTests }, token);
      alert('Test request created successfully!');
      navigate(`/patients/${patientId}`);
    } catch (err) {
      alert('Failed to create test request.');
    }
  };

  if (loading) return <div className="p-6">Loading available tests...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Request New Test</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Available Tests</h2>
        <div className="space-y-4">
          {testCatalog.map(test => (
            <div key={test.id} className="flex items-center">
              <input
                type="checkbox"
                id={`test-${test.id}`}
                checked={selectedTests.includes(test.id)}
                onChange={() => handleCheckboxChange(test.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`test-${test.id}`} className="ml-3 block text-lg text-gray-700">
                {test.name} (${test.price})
              </label>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestTestPage;