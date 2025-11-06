// src/services/api.js
import axios from "axios";

/**
 * ✅ Automatically detect backend based on where frontend is accessed from.
 * Example:
 *   http://192.168.1.55 → backend will be http://192.168.1.55/api
 *   https://lab.example.com → backend will be https://lab.example.com/api
 */
const API_URL = `${window.location.origin}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // important for auth cookies / tokens
});

export default api;
