const API_URL = '/api/wards/';

// Function to get all wards
const getWards = async (token) => {
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = await fetch(API_URL, config);

  if (!response.ok) {
    throw new Error('Failed to fetch wards');
  }

  return response.json();
};

const wardsService = {
  getWards,
};

export default wardsService;
