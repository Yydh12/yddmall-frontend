// src/utils/request.js
import axios from 'axios';
import { ElMessage } from 'element-plus';          // 若你用 ElementPlus
// import { Message } from '@arco-design/web-vue'; // 若用 Arco
// import { message } from 'ant-design-vue';       // 若用 AntD

// 统一从环境变量读取后端 API 根地址
// Render/生产环境在构建阶段通过 Docker Build Args 注入 VITE_BASE_API
// 开发环境则默认使用本地后端
const apiBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BASE_API)
  ? import.meta.env.VITE_BASE_API
  : 'http://localhost:8080';

// 创建实例
const request = axios.create({
  baseURL: apiBase,
  timeout: 10000,                                   // 10s 超时
  headers: { 'Content-Type': 'application/json;charset=UTF-8' }
});

/* 请求拦截器：统一携带用户信息 */
request.interceptors.request.use(
  config => {
    // 方式1：优先使用JWT token（推荐）
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[DEBUG] Request: Added Authorization header with token');
    } else {
      console.log('[DEBUG] Request: No token found in localStorage/sessionStorage');
    }
    
    // 方式2：兜底使用用户ID（临时兼容）
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.userId) {
          config.headers['X-User-Id'] = user.userId;
          console.log('[DEBUG] Request: Added X-User-Id header:', user.userId);
        }
      } catch (e) {
        console.error('解析用户信息失败:', e);
      }
    }
    
    console.log('[DEBUG] Request headers:', config.headers);
    return config;
  },
  error => Promise.reject(error)
);

/* 响应拦截器：统一错误提示 + 数据剥离 */
request.interceptors.response.use(
  response => {
    const { data } = response;
    if (data.code === 200 || data.code === 0) {
      return data;
    }
    console.error('[DEBUG] Response error:', data);
    ElMessage.error(data.msg || '服务异常');
    return Promise.reject(new Error(data.msg || 'Error'));
  },
  error => {
    const msg = error.response?.data?.msg || error.message || '网络错误';
    ElMessage.error(msg);
    return Promise.reject(error);
  }
);

export default request;
