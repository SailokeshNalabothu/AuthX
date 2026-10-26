import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    const sessionId = localStorage.getItem('sessionId');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (sessionId) {
      config.headers['x-session-id'] = sessionId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the session was explicitly revoked from another device, flush & redirect immediately
    if (error.response?.data?.msg === "Session has been revoked") {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('sessionId');
      window.location.href = '/login?revoked=true';
      return Promise.reject(error);
    }

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
        localStorage.removeItem('sessionId');
        window.location.href = '/login?revoked=true';
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

// Session endpoints
export const getActiveSessions = () => api.get(`/sessions`);
export const revokeSession = (id) => api.delete(`/sessions/${id}`);
export const revokeOtherSessions = (currentSessionId) => api.post(`/sessions/revoke-others`, { currentSessionId });

// 2FA endpoints
export const login2FA = (data) => api.post(`/auth/login-2fa`, data);
export const get2FAStatus = () => api.get(`/2fa/status`);
export const setup2FA = () => api.post(`/2fa/setup`);
export const verify2FA = (code) => api.post(`/2fa/verify`, { code });
export const disable2FA = (password) => api.post(`/2fa/disable`, { password });
export const regenerateBackupCodes = (password) => api.post(`/2fa/regenerate-backup-codes`, { password });

// Admin endpoints
export const getAllUsers = () => api.get(`/users`);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const changeRole = (id, role) => api.put(`/users/${id}/role`, { role });

export default api;
