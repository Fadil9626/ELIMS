const API_URL = '/api/auth/';

// Login user
const login = async (userData) => {
  const config = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  };

  const response = await fetch(`${API_URL}login`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to log in');
  }

  // If login is successful, save user info (including token) to local storage
  if (data.token) {
    localStorage.setItem('userInfo', JSON.stringify(data));
  }

  return data;
};

const authService = {
  login,
};

export default authService;