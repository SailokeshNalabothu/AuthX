import React, { useEffect, useState, useCallback } from 'react';
import { 
  getAllUsers, 
  deleteUser, 
  changeRole, 
  unlockUser, 
  getAdminAuditFeed, 
  exportAuditLogsCsv 
} from '../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'users'
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Security Feed States
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState({ totalEvents: 0, totalAlerts: 0, suspiciousCount: 0, lockedCount: 0 });
  const [auditLoading, setAuditLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [onlySuspicious, setOnlySuspicious] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [selectedLogMetadata, setSelectedLogMetadata] = useState(null);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await getAllUsers();
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load platform users');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAuditFeed = useCallback(async () => {
    try {
      setAuditLoading(true);
      const params = {
        search: searchQuery,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        isSuspicious: onlySuspicious ? true : undefined,
        limit: 100
      };
      const res = await getAdminAuditFeed(params);
      setAuditLogs(res.data.logs || []);
      if (res.data.stats) {
        setAuditStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to load admin audit feed:", err);
      toast.error('Failed to fetch security audit feed');
    } finally {
      setAuditLoading(false);
    }
  }, [searchQuery, actionFilter, onlySuspicious]);

  useEffect(() => {
    fetchUsers();
    fetchAuditFeed();
  }, [fetchAuditFeed]);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const params = {
        search: searchQuery,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        isSuspicious: onlySuspicious ? true : undefined
      };
      const res = await exportAuditLogsCsv(params);

      // Create download blob
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `authx-security-audit-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Security audit logs exported to CSV successfully!");
    } catch (err) {
      toast.error("Failed to export security audit CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id);
        setUsers(users.filter(u => u._id !== id));
        toast.success("User deleted successfully");
        fetchAuditFeed();
      } catch (err) {
        toast.error(err.response?.data?.msg || 'Error deleting user');
      }
    }
  };

  const handleRoleChange = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await changeRole(id, newRole);
      setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
      fetchAuditFeed();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error changing role');
    }
  };

  const handleUnlockUser = async (id, email) => {
    try {
      await unlockUser(id);
      setUsers(users.map(u => u._id === id ? { ...u, isLocked: false, lockUntil: null } : u));
      toast.success(`Account unlocked for ${email}`);
      fetchAuditFeed();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error unlocking account');
    }
  };

  const formatActionTitle = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS': return 'Sign In Success';
      case 'LOGIN_FAILED': return 'Sign In Failed';
      case 'PASSWORD_RESET_REQUEST': return 'Password Reset Req';
      case 'PASSWORD_RESET_SUCCESS': return 'Password Reset Done';
      case '2FA_ENABLED': return '2FA Activated';
      case '2FA_DISABLED': return '2FA Deactivated';
      case 'FAILED_ATTEMPT_LOCKED': return 'Auto-Locked (5 Tries)';
      case 'ACCOUNT_LOCKED': return 'User Locked Account';
      case 'ACCOUNT_UNLOCKED': return 'Admin Unlocked Account';
      case 'ROLE_CHANGED': return 'Role Changed';
      case 'SESSION_REVOKED': return 'Session Revoked';
      default: return action;
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo" style={{ fontSize: '20px', fontWeight: '800' }}>AuthX Admin</div>
          <span style={{ 
            background: '#e0e7ff', 
            color: '#4338ca', 
            fontSize: '11px', 
            fontWeight: '700', 
            padding: '2px 8px', 
            borderRadius: '10px' 
          }}>
            SECURITY OPERATIONS CENTER
          </span>
        </div>
        <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
      </nav>
      
      <main className="dashboard-content">
        <header className="dashboard-header" style={{ marginBottom: '24px' }}>
          <h1>Security Intelligence & Audit Feed</h1>
          <p className="subtitle">
            Organization-wide immutable audit trail, automated anomaly detection alerts, and forensics CSV exports.
          </p>
        </header>

        {/* 📊 SECURITY KPI METRICS */}
        <div className="admin-kpi-grid">
          <div className="kpi-card kpi-primary">
            <div className="kpi-label">Total Security Events</div>
            <div className="kpi-number">{auditStats.totalEvents}</div>
          </div>
          <div className="kpi-card kpi-alert">
            <div className="kpi-label">Suspicious Anomalies</div>
            <div className="kpi-number" style={{ color: '#ef4444' }}>{auditStats.suspiciousCount}</div>
          </div>
          <div className="kpi-card kpi-alert">
            <div className="kpi-label">Locked Accounts</div>
            <div className="kpi-number" style={{ color: '#dc2626' }}>{auditStats.lockedCount}</div>
          </div>
          <div className="kpi-card kpi-success">
            <div className="kpi-label">Registered Users</div>
            <div className="kpi-number">{users.length}</div>
          </div>
        </div>

        {/* 📑 TABS NAVIGATION */}
        <div className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            🛡️ Live Security Audit Feed ({auditLogs.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Platform Users & Lock States ({users.length})
          </button>
        </div>

        {activeTab === 'audit' ? (
          <div>
            {/* 🔍 SEARCH, FILTER & CSV EXPORT BAR */}
            <div className="admin-filter-bar">
              <input 
                type="text" 
                placeholder="Search email, IP address, device, location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />

              <select 
                value={actionFilter} 
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ 
                  padding: '9px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border)', 
                  background: 'white',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                <option value="ALL">All Event Actions</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="PASSWORD_RESET_REQUEST">PASSWORD_RESET_REQUEST</option>
                <option value="PASSWORD_RESET_SUCCESS">PASSWORD_RESET_SUCCESS</option>
                <option value="2FA_ENABLED">2FA_ENABLED</option>
                <option value="2FA_DISABLED">2FA_DISABLED</option>
                <option value="FAILED_ATTEMPT_LOCKED">FAILED_ATTEMPT_LOCKED</option>
                <option value="ACCOUNT_LOCKED">ACCOUNT_LOCKED</option>
                <option value="ACCOUNT_UNLOCKED">ACCOUNT_UNLOCKED</option>
                <option value="ROLE_CHANGED">ROLE_CHANGED</option>
                <option value="SESSION_REVOKED">SESSION_REVOKED</option>
              </select>

              <button 
                onClick={() => setOnlySuspicious(!onlySuspicious)}
                className={`filter-pill ${onlySuspicious ? 'active' : ''}`}
                style={{ border: '1px solid', borderColor: onlySuspicious ? 'var(--danger)' : 'var(--border)', color: onlySuspicious ? '#fff' : 'var(--text-main)', background: onlySuspicious ? 'var(--danger)' : '#fff' }}
              >
                🚨 Anomalies Only
              </button>

              <button 
                onClick={handleExportCsv}
                disabled={exportingCsv || auditLogs.length === 0}
                className="btn-csv-download"
                title="Download immutable audit trail as CSV"
              >
                {exportingCsv ? 'Exporting...' : '📥 Export CSV'}
              </button>
            </div>

            {/* 📜 ORGANIZATION AUDIT FEED TABLE */}
            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
              {auditLoading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="spinner-small" style={{ borderLeftColor: 'var(--primary)', margin: '0 auto' }}></div>
                  <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Querying security audit records...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No security events found matching the current search parameters.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                      <th style={{ padding: '12px 16px' }}>Timestamp</th>
                      <th style={{ padding: '12px 16px' }}>User Email</th>
                      <th style={{ padding: '12px 16px' }}>Action & Status</th>
                      <th style={{ padding: '12px 16px' }}>Device & OS</th>
                      <th style={{ padding: '12px 16px' }}>IP & Location</th>
                      <th style={{ padding: '12px 16px' }}>Intelligence Signal</th>
                      <th style={{ padding: '12px 16px' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const isAlert = log.isSuspicious || log.status === 'ALERT';
                      return (
                        <tr 
                          key={log._id} 
                          style={{ 
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: isAlert ? '#fff5f5' : 'transparent',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                            {log.userEmail}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                {formatActionTitle(log.action)}
                              </span>
                              <span className={`badge-status ${log.status.toLowerCase()}`}>
                                {log.status}
                              </span>
                              {log.riskLevel && log.riskLevel !== 'LOW' && (
                                <span className={`badge-risk ${log.riskLevel.toLowerCase()}`}>
                                  {log.riskLevel}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {log.device || `${log.browser} on ${log.os}`}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div><code>{log.ipAddress}</code></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {log.location || 'Local'}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {log.isSuspicious ? (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                background: '#fee2e2', 
                                color: '#b91c1c', 
                                padding: '3px 8px', 
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '11px'
                              }}>
                                🚨 SUSPICIOUS LOGIN
                              </span>
                            ) : (
                              <span style={{ color: '#10b981', fontSize: '12px' }}>Normal Baseline</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button 
                              onClick={() => setSelectedLogMetadata(log)}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* 👥 USER MANAGEMENT TAB */
          <div className="card" style={{ overflowX: 'auto' }}>
            {usersLoading ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>Loading platform users...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Verified</th>
                    <th style={{ padding: '12px' }}>Security Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isLocked = u.isLocked || (u.lockUntil && new Date(u.lockUntil) > new Date());
                    return (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{u.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{u.isVerified ? '✅' : '❌'}</td>
                        <td style={{ padding: '12px' }}>
                          {isLocked ? (
                            <span className="badge-locked-status">
                              🔒 LOCKED
                            </span>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {isLocked && (
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '6px 10px', fontSize: '13px', background: '#ecfdf5', borderColor: '#10b981', color: '#047857', fontWeight: '600' }} 
                              onClick={() => handleUnlockUser(u._id, u.email)}
                              title="Unlock account immediately"
                            >
                              🔓 Unlock
                            </button>
                          )}
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '13px' }} 
                            onClick={() => handleRoleChange(u._id, u.role)}
                          >
                            Make {u.role === 'admin' ? 'User' : 'Admin'}
                          </button>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger)' }} 
                            onClick={() => handleDelete(u._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 🔍 METADATA INSPECTION MODAL */}
        {selectedLogMetadata && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '580px', textAlign: 'left' }}>
              <div className="modal-header">
                <h2>Security Event Forensics</h2>
                <p>Event ID: <code style={{ fontSize: '12px' }}>{selectedLogMetadata._id}</code></p>
              </div>

              <div style={{ background: '#0f172a', color: '#38bdf8', padding: '16px', borderRadius: '10px', fontSize: '13px', overflowX: 'auto' }}>
                <pre style={{ margin: 0, fontFamily: 'monospace' }}>
                  {JSON.stringify(selectedLogMetadata, null, 2)}
                </pre>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button 
                  onClick={() => setSelectedLogMetadata(null)}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px', display: 'inline-block' }}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
