import axios from 'axios';

axios.defaults.withCredentials = true;

// 优先读取运行时注入的 BASE_API 或 REACT_APP_API_URL
const runtimeBase = (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.BASE_API)
  ? window.__APP_CONFIG__.BASE_API
  : '';
const runtimeReactBase = (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.REACT_APP_API_URL)
  ? window.__APP_CONFIG__.REACT_APP_API_URL
  : '';
const buildTimeBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BASE_API)
  ? import.meta.env.VITE_BASE_API
  : '';
const apiBase = runtimeBase || runtimeReactBase || buildTimeBase || 'http://localhost:8080';
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
