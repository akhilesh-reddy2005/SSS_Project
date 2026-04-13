import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost/expense-tracker/backend/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default api;
