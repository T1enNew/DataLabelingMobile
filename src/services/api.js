import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  ĐỔI IP NÀY THÀNH IP MÁY TÍNH CỦA BẠN
//
//  Android Emulator  → dùng: 10.0.2.2
//  Thiết bị thật     → dùng IP WiFi của máy tính (vd: 192.168.1.x)
//  Tìm IP WiFi:
//    Windows → mở CMD → gõ: ipconfig  → xem "IPv4 Address"
//    Mac     → System Settings → WiFi → Details
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_URL = 'http://10.0.2.2:5000';   // ← Android Emulator default
// export const BASE_URL = 'http://192.168.1.x:5000'; // ← Thiết bị thật (đổi x)

const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// ─── AUTH ───────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// ─── USERS ──────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ─── PROJECTS ───────────────────────────────────────
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  export: (id, format) => api.get(`/projects/${id}/export?format=${format}`, {
    responseType: format === 'csv' ? 'text' : 'json'
  }),
  quality: (id) => api.get(`/projects/${id}/quality`),
  reviewDecision: (id, data) => api.post(`/projects/${id}/review-decision`, data),
};

// ─── DATASETS ───────────────────────────────────────
export const datasetsAPI = {
  getByProject: (projectId) => api.get(`/datasets/project/${projectId}`),
  getById: (id) => api.get(`/datasets/${id}`),
  delete: (id) => api.delete(`/datasets/${id}`),
  upload: (formData) => api.post('/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
};

// ─── TASKS ──────────────────────────────────────────
export const tasksAPI = {
  myTasks: () => api.get('/tasks/my-tasks'),
  getById: (id) => api.get(`/tasks/${id}`),
  getRelated: (id, params) => api.get(`/tasks/${id}/related`, { params }),
  assign: (data) => api.post('/tasks/assign', data),
  label: (id, data) => api.put(`/tasks/${id}/label`, data),
  submit: (id) => api.post(`/tasks/${id}/submit`),
};

// ─── REVIEWS ────────────────────────────────────────
export const reviewsAPI = {
  getPending: () => api.get('/reviews/pending'),
  getReviewed: () => api.get('/reviews/reviewed'),
  getAll: () => api.get('/reviews/all'),
  approve: (id, data) => api.post(`/reviews/${id}/approve`, data),
  reject: (id, data) => api.post(`/reviews/${id}/reject`, data),
  primary: (id) => api.post(`/reviews/${id}/primary`),
  stats: () => api.get('/reviews/stats'),
};

// ─── ACTIVITY LOGS ──────────────────────────────────
export const activityLogsAPI = {
  getAll: (params) => api.get('/activity-logs', { params }),
  stats: (params) => api.get('/activity-logs/stats', { params }),
};

// ─── SETTINGS ───────────────────────────────────────
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  reset: () => api.post('/settings/reset'),
};

export default api;
