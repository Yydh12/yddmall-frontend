import axios from 'axios';

axios.defaults.withCredentials = true;
const apiBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BASE_API)
  ? import.meta.env.VITE_BASE_API
  : 'http://localhost:8080';
axios.defaults.baseURL = apiBase;

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default axios;
