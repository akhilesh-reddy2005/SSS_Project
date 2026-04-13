import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/backend/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default api;
