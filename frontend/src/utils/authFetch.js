// src/utils/authFetch.js
// Centralized fetch wrapper for authenticated API requests
export const authFetch = async (url, options = {}) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
      // --- If no token found ---
      if (!userInfo || !userInfo.token) {
        showLogoutMessage('Your session has expired. Please log in again.');
        handleLogout();
        return;
      }
  
      const headers = {
        'Authorization': `Bearer ${userInfo.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
  
      const response = await fetch(url, { ...options, headers });
  
      // --- If unauthorized (expired token or invalid session) ---
      if (response.status === 401) {
        showLogoutMessage('Your session has expired. Please log in again.');
        handleLogout();
        return;
      }
  
      return response;
    } catch (error) {
      console.error('❌ authFetch error:', error);
      showLogoutMessage('An error occurred. Please log in again.');
      handleLogout();
    }
  };
  
  // --- Helper: Show toast or fallback alert ---
  function showLogoutMessage(message) {
    // ✅ If you have a toast library like react-hot-toast, use that
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error(message);
    } else if (window.showToast) {
      // Custom global toast handler if you have one
      window.showToast(message, { type: 'error' });
    } else {
      // Default fallback
      alert(message);
    }
  }
  
  // --- Helper: Clear localStorage and redirect ---
  function handleLogout() {
    localStorage.removeItem('userInfo');
    setTimeout(() => {
      window.location.href = '/login';
    }, 500); // short delay to let message show
  }
  