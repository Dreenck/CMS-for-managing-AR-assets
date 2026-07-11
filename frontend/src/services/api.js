import axios from 'axios';

// Create an Axios instance with a configurable baseURL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

export default api;
