import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost/expense-tracker/backend/api',
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default api;
