// src/pages/auth/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // This is just for the button

  useEffect(() => {
    // This effect redirects a user who is *already* logged in
    // or has just successfully logged in.
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Show "Logging in..."
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message?.toLowerCase().includes('invalid')) {
          toast.error('❌ Invalid email or password.');
        } else if (data.message?.toLowerCase().includes('inactive')) {
          toast.error('⚠️ Account inactive. Contact administrator.');
        } else {
          toast.error(data.message || 'Login failed. Please try again.');
        }
        setLoading(false); // Stop button loading
        return;
      }

      // ✅ FIX: Call login() but DO NOT navigate.
      // The useEffect hook above will handle navigation
      // once the 'user' state is fully updated.
      await login(data);
      
      // We no longer call navigate('/') here.

    } catch (error) {
      console.error('Login error:', error);
      // AuthContext already shows a toast on failure
      setLoading(false); // Stop button loading
    }
    // We no longer set loading(false) here,
    // as the useEffect will navigate away.
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-4 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-6 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;