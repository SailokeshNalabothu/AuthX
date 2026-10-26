import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true // 🛡️ Automatically exchange httpOnly secure cookies
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
    
    // If the session was explicitly revoked from another device or account locked, flush & redirect
    if (error.response?.data?.msg === "Session has been revoked" || error.response?.data?.msg?.includes("locked")) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('sessionId');
      const reason = error.response?.data?.msg?.includes("locked") ? 'locked=true' : 'revoked=true';
      window.location.href = `/login?${reason}`;
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Refresh token will be read from httpOnly cookie or fallback payload
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
        if (res.data?.accessToken) {
          localStorage.setItem('accessToken', res.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        }
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
export const verifyEmail = (data) => api.post(`/auth/verify-email`, data);
export const verifyOTP = (data) => api.post(`/auth/verify-otp`, data);
export const login = (data) => api.post(`/auth/login`, data);
export const logoutUser = () => api.post(`/auth/logout`);
export const resetPassword = (token, password) => api.post(`/auth/reset-password/${token}`, { password });
export const forgotPassword = (data) => api.post(`/auth/forgot-password`, data);
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

// 🔒 Instant Account Lock & Self-Service Unlock
export const lockAccount = (data) => api.post(`/auth/lock-account`, data);
export const requestUnlock = (data) => api.post(`/auth/request-unlock`, data);
export const unlockAccount = (data) => api.post(`/auth/unlock-account`, data);

// 🛡️ Security Audit Logs
export const getMyAuditLogs = (params) => api.get(`/audit/my-logs`, { params });
export const getAdminAuditFeed = (params) => api.get(`/audit/admin-feed`, { params });
export const exportAuditLogsCsv = (params) => api.get(`/audit/export-csv`, { params, responseType: 'blob' });

// Admin user management
export const getAllUsers = () => api.get(`/users`);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const changeRole = (id, role) => api.put(`/users/${id}/role`, { role });
export const unlockUser = (id) => api.put(`/users/${id}/unlock`);

// ⚡ Developer Platform: Scoped API Keys (PATs)
export const createApiKey = (data) => api.post(`/api-keys`, data);
export const getApiKeys = () => api.get(`/api-keys`);
export const revokeApiKey = (id) => api.put(`/api-keys/${id}/revoke`);
export const deleteApiKey = (id) => api.delete(`/api-keys/${id}`);

// 🔗 Developer Platform: Outbound Webhooks
export const createWebhook = (data) => api.post(`/webhooks`, data);
export const getWebhooks = () => api.get(`/webhooks`);
export const getWebhook = (id) => api.get(`/webhooks/${id}`);
export const deleteWebhook = (id) => api.delete(`/webhooks/${id}`);
export const testWebhook = (id) => api.post(`/webhooks/${id}/test`);
export const getWebhookDeliveries = (id) => api.get(`/webhooks/${id}/deliveries`);

// ⚡ Developer Scoped V1 Endpoints
export const getDeveloperProfile = () => api.get(`/developer/v1/profile`);
export const getDeveloperUsers = () => api.get(`/developer/v1/users`);

// 👑 Enterprise Admin Suite (Feature 5)
export const getAdminAnalytics = () => api.get(`/users/analytics`);
export const impersonateUser = (id) => api.post(`/users/${id}/impersonate`);
export const exitImpersonation = (data) => api.post(`/users/exit-impersonation`, data);
export const bulkUserAction = (data) => api.post(`/users/bulk-action`, data);
export const exportUsersCsv = () => api.get(`/users/export-users-csv`, { responseType: 'blob' });

export default api;
