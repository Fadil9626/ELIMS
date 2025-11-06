const API_URL = '/api/test-catalog';

// Get all tests from the catalog
const getAllCatalogTests = async (token) => {
    const config = { headers: { 'Authorization': `Bearer ${token}` } };
    const response = await fetch(API_URL, config);
    if (!response.ok) throw new Error('Failed to fetch test catalog');
    return response.json();
};

// Create a new test in the catalog
const createCatalogTest = async (testData, token) => {
    const config = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(testData)
    };
    const response = await fetch(API_URL, config);
    if (!response.ok) throw new Error('Failed to create test');
    return response.json();
};

// Update an existing test in the catalog
const updateCatalogTest = async (testId, testData, token) => {
    const config = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(testData)
    };
    // ⬇️ FIX: Added a slash "/" before ${testId}
    const response = await fetch(`${API_URL}/${testId}`, config);
    if (!response.ok) throw new Error('Failed to update test');
    return response.json();
};

// Delete a test from the catalog
const deleteCatalogTest = async (testId, token) => {
    const config = {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    };
    // ⬇️ FIX: Added a slash "/" before ${testId}
    const response = await fetch(`${API_URL}/${testId}`, config);
    if (!response.ok) throw new Error('Failed to delete test');
    
    // Note: Returning response.ok (boolean) is fine.
    // If your API returns no body (204 No Content), this is correct.
    // If your API *does* return a JSON body, you'd use: return response.json();
    return response.ok; 
};

const testCatalogService = {
  getAllCatalogTests,
  createCatalogTest,
  updateCatalogTest,
  deleteCatalogTest,
};

export default testCatalogService;