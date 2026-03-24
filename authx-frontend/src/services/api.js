import axios from 'axios';

const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error("No refresh token exists");
        
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', res.data.accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export const signup = (data) => api.post(`/auth/signup`, data);
export const verifyOTP = (data) => api.post(`/auth/verify-otp`, data);
export const login = (data) => api.post(`/auth/login`, data);
export const getProtectedData = () => api.get(`/protected`);

// Admin endpoints
export const getAllUsers = () => api.get(`/users`);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const changeRole = (id, role) => api.put(`/users/${id}/role`, { role });

export default api;
