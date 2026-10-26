import React, { useEffect, useState } from 'react';
import { 
  getProtectedData, 
  getActiveSessions, 
  revokeSession, 
  revokeOtherSessions,
  get2FAStatus,
  setup2FA,
  verify2FA,
  disable2FA,
  regenerateBackupCodes,
  getMyAuditLogs
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [data, setData] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // 🔐 2FA States
  const [twoFactorStatus, setTwoFactorStatus] = useState({ enabled: false, remainingBackupCodes: 0 });
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1 = QR & verify, 2 = Backup codes
  const [setupData, setSetupData] = useState({ secret: '', qrCodeUrl: '' });
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Disable 2FA modal
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // 🔄 Regenerate Backup Codes Modal
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [regenStep, setRegenStep] = useState(1); // 1 = confirm password, 2 = show new codes
  const [newBackupCodes, setNewBackupCodes] = useState([]);

  // 📜 Security Audit Logs Timeline States
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState('ALL');

  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await getActiveSessions();
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error("Failed to load active sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetch2FA = async () => {
    try {
      const res = await get2FAStatus();
      setTwoFactorStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch 2FA status:", err);
    }
  };

  const fetchAuditLogs = async (filter = auditFilter) => {
    try {
      setAuditLoading(true);
      const actionParam = (filter === 'ALL' || filter === 'ALERT' || filter === '2FA') ? undefined : filter;
      const res = await getMyAuditLogs({ action: actionParam });
      let logs = res.data.logs || [];
      if (filter === 'ALERT') {
        logs = logs.filter(l => l.isSuspicious || l.status === 'ALERT');
      } else if (filter === '2FA') {
        logs = logs.filter(l => l.action.startsWith('2FA_'));
      }
      setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to fetch audit trail:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('accessToken');
      try {
        const res = await getProtectedData(token);
        setData(res.data.msg);
        setUser(res.data.user);
        await Promise.all([fetchSessions(), fetch2FA(), fetchAuditLogs()]);
      } catch (err) {
        setData(err.response?.data?.msg || "Session expired. Please log in again.");
        if (err.response?.status === 401 || err.response?.status === 403) {
           localStorage.removeItem('accessToken');
           localStorage.removeItem('refreshToken');
           localStorage.removeItem('sessionId');
           navigate('/login?revoked=true');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // 🛡️ Real-time Session Sync:
    // When the user switches to this browser tab, or every 10s, verify session is still active
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
    navigate('/login');
  };

  const handleRevoke = async (sessionId) => {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      toast.success("Device session revoked successfully");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to revoke session");
    }
  };

  const handleRevokeOthers = async () => {
    const currentSessionId = localStorage.getItem('sessionId');
    if (!currentSessionId) {
      toast.info("No current session identifier stored locally");
      return;
    }

    if (window.confirm("Are you sure you want to sign out of all other devices?")) {
      try {
        await revokeOtherSessions(currentSessionId);
        setSessions((prev) => prev.filter((s) => s._id === currentSessionId || s.isCurrent));
        toast.success("Signed out of all other devices");
      } catch (err) {
        toast.error(err.response?.data?.msg || "Failed to sign out other devices");
      }
    }
  };

  // 🔐 2FA Handlers
  const handleStart2FASetup = async () => {
    try {
      setModalLoading(true);
      const res = await setup2FA();
      setSetupData(res.data);
      setSetupStep(1);
      setVerifyCode('');
      setShowSetupModal(true);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to initiate 2FA setup");
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerify2FASetup = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      const res = await verify2FA(verifyCode);
      setBackupCodes(res.data.backupCodes || []);
      setSetupStep(2);
      await fetch2FA();
      toast.success("2FA successfully verified and activated!");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid code. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      await disable2FA(disablePassword);
      setShowDisableModal(false);
      setDisablePassword('');
      await fetch2FA();
      toast.success("Two-Factor Authentication disabled");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Incorrect password");
    } finally {
      setModalLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      const res = await regenerateBackupCodes(regenPassword);
      setNewBackupCodes(res.data.backupCodes || []);
      setRegenStep(2);
      await fetch2FA();
      toast.success("8 new backup codes generated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Incorrect password");
    } finally {
      setModalLoading(false);
    }
  };

  const copyToClipboard = (text, msg = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'Mobile':
        return '📱';
      case 'Tablet':
        return '📟';
      case 'Desktop':
      default:
        return '💻';
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Active just now';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Active just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatActionTitle = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS': return 'Successful Sign In';
      case 'LOGIN_FAILED': return 'Failed Login Attempt';
      case 'PASSWORD_RESET_REQUEST': return 'Password Reset Requested';
      case 'PASSWORD_RESET_SUCCESS': return 'Password Reset Completed';
      case '2FA_ENABLED': return 'Two-Factor Authentication Enabled';
      case '2FA_DISABLED': return 'Two-Factor Authentication Disabled';
      case 'FAILED_ATTEMPT_LOCKED': return 'Account Locked (Failed Attempts)';
      case 'ACCOUNT_LOCKED': return 'Account Locked (Security Alert)';
      case 'ACCOUNT_UNLOCKED': return 'Account Unlocked by Admin';
      case 'ROLE_CHANGED': return 'User Role Updated';
      case 'SESSION_REVOKED': return 'Device Session Terminated';
      default: return action?.replace(/_/g, ' ') || 'Security Event';
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const timeAgo = formatTimeAgo(dateStr);
    const formatted = date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${timeAgo} • ${formatted}`;
  };

  const currentSessionId = localStorage.getItem('sessionId');
  const otherSessionsCount = sessions.filter(
    (s) => !s.isCurrent && s._id !== currentSessionId
  ).length;

  if (loading) return <div className="auth-container"><p>Loading dashboard...</p></div>;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="logo">AuthX</div>
        <div>
          <button 
            onClick={() => navigate('/developer')} 
            className="btn-secondary" 
            style={{marginRight: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', borderColor: '#c7d2fe', fontWeight: '600'}}
          >
            ⚡ Developer Platform
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="btn-secondary" style={{marginRight: '12px'}}>Admin Panel</button>
          )}
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </nav>
      
      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Welcome, {user?.userId || 'User'}!</h1>
          <p className="subtitle">You have successfully authenticated via JWT.</p>
        </header>

        <div className="dashboard-cards">
          <div className="card">
            <h3>Server Message</h3>
            <p className="data-highlight">{data}</p>
          </div>
          
          <div className="card">
            <h3>Your Role</h3>
            <span className={`role-badge ${user?.role === 'admin' ? 'admin' : 'user'}`}>
              {user?.role?.toUpperCase() || 'USER'}
            </span>
          </div>
        </div>

        {/* 🔐 TWO-FACTOR AUTHENTICATION SECTION */}
        <div className="two-factor-card">
          <div className="two-factor-info">
            <h3>
              <span>🔐</span> Two-Factor Authentication (TOTP)
              <span className={twoFactorStatus.enabled ? "badge-2fa-enabled" : "badge-2fa-disabled"}>
                {twoFactorStatus.enabled ? "ENABLED" : "DISABLED"}
              </span>
            </h3>
            <p>
              {twoFactorStatus.enabled 
                ? `Protected with Google Authenticator. You have ${twoFactorStatus.remainingBackupCodes} backup recovery codes remaining.`
                : "Protect your account with an extra security layer using Google Authenticator, Authy, or 1Password."}
            </p>
            {twoFactorStatus.enabled && twoFactorStatus.remainingBackupCodes === 0 && (
              <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>
                ⚠️ You have 0 backup codes remaining. Regenerate new codes now to prevent account lockout.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {twoFactorStatus.enabled ? (
              <>
                <button 
                  onClick={() => { setShowRegenModal(true); setRegenStep(1); setRegenPassword(''); }} 
                  className="btn-secondary"
                  style={{ 
                    fontSize: '13px', 
                    padding: '8px 14px',
                    borderColor: twoFactorStatus.remainingBackupCodes === 0 ? 'var(--danger)' : 'var(--border)',
                    color: twoFactorStatus.remainingBackupCodes === 0 ? 'var(--danger)' : 'var(--text-main)',
                    fontWeight: 600
                  }}
                  title="Generate 8 fresh emergency backup codes"
                >
                  🔄 Regenerate Backup Codes
                </button>
                <button 
                  onClick={() => setShowDisableModal(true)} 
                  className="btn-secondary"
                  style={{ color: 'var(--danger)', borderColor: '#fca5a5', fontSize: '13px', padding: '8px 14px' }}
                >
                  Disable 2FA
                </button>
              </>
            ) : (
              <button 
                onClick={handleStart2FASetup} 
                className="btn-primary"
                style={{ padding: '10px 18px', fontSize: '14px' }}
                disabled={modalLoading}
              >
                {modalLoading ? "Generating..." : "Enable 2FA"}
              </button>
            )}
          </div>
        </div>

        {/* 🛡️ ACTIVE DEVICE & SESSION INTELLIGENCE */}
        <section className="sessions-section">
          <div className="sessions-header">
            <h2>
              <span>🛡️</span> Active Devices & Sessions
              <span className="session-count-badge">
                {sessions.length} {sessions.length === 1 ? 'Device' : 'Devices'}
              </span>
            </h2>

            {otherSessionsCount > 0 && (
              <button onClick={handleRevokeOthers} className="btn-revoke-all">
                Sign Out All Other Devices ({otherSessionsCount})
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
              <div className="spinner-small" style={{ borderLeftColor: 'var(--primary)' }}></div>
              <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Detecting active sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No other active sessions detected.
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map((session) => {
                const isCurrent = session.isCurrent || session._id === currentSessionId;
                return (
                  <div key={session._id} className={`session-card ${isCurrent ? 'is-current' : ''}`}>
                    <div className="session-main">
                      <div className="session-icon-box">
                        {getDeviceIcon(session.deviceType)}
                      </div>
                      <div className="session-details">
                        <div className="session-title-row">
                          <span className="session-device-name">
                            {session.browser} on {session.os}
                          </span>
                          {isCurrent && (
                            <span className="badge-current-device">
                              <span className="badge-current-dot"></span> This Device
                            </span>
                          )}
                        </div>
                        <div className="session-meta-row">
                          <span className="session-meta-item">
                            🌐 {session.ipAddress || '127.0.0.1'}
                          </span>
                          <span>•</span>
                          <span className="session-meta-item">
                            📍 {session.location || 'Local'}
                          </span>
                          <span>•</span>
                          <span className="session-meta-item">
                            🕒 {isCurrent ? 'Active now' : formatTimeAgo(session.lastActiveAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleRevoke(session._id)}
                        className="btn-revoke-device"
                        title="Log out this device"
                      >
                        Revoke Device
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 📜 INTERACTIVE TIMELINE: PERSONAL SECURITY HISTORY */}
        <section className="timeline-section">
          <div className="timeline-header-bar">
            <h2>
              <span>📜</span> Security History & Audit Trail
              <span className="session-count-badge">
                {auditLogs.length} {auditLogs.length === 1 ? 'Event' : 'Events'}
              </span>
            </h2>

            <div className="filter-pills-row">
              <button 
                onClick={() => { setAuditFilter('ALL'); fetchAuditLogs('ALL'); }}
                className={`filter-pill ${auditFilter === 'ALL' ? 'active' : ''}`}
              >
                All Events
              </button>
              <button 
                onClick={() => { setAuditFilter('LOGIN_SUCCESS'); fetchAuditLogs('LOGIN_SUCCESS'); }}
                className={`filter-pill ${auditFilter === 'LOGIN_SUCCESS' ? 'active' : ''}`}
              >
                🔑 Logins
              </button>
              <button 
                onClick={() => { setAuditFilter('2FA'); fetchAuditLogs('2FA'); }}
                className={`filter-pill ${auditFilter === '2FA' ? 'active' : ''}`}
              >
                🛡️ 2FA Activity
              </button>
              <button 
                onClick={() => { setAuditFilter('ALERT'); fetchAuditLogs('ALERT'); }}
                className={`filter-pill ${auditFilter === 'ALERT' ? 'active' : ''}`}
              >
                🚨 Security Alerts
              </button>
              <button 
                onClick={() => fetchAuditLogs()}
                className="filter-pill"
                title="Refresh Audit Trail"
                style={{ marginLeft: '6px' }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {auditLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
              <div className="spinner-small" style={{ borderLeftColor: 'var(--primary)', margin: '0 auto' }}></div>
              <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Retrieving immutable audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '15px', marginBottom: '4px' }}>No security events recorded under this filter.</p>
              <p style={{ fontSize: '13px' }}>Your security events will appear here in real-time.</p>
            </div>
          ) : (
            <div className="timeline-track">
              {auditLogs.map((log) => {
                const isAlert = log.isSuspicious || log.status === 'ALERT';
                const isWarning = log.status === 'WARNING';
                const nodeClass = isAlert ? 'node-alert' : isWarning ? 'node-warning' : 'node-success';
                const nodeIcon = isAlert ? '🚨' : isWarning ? '⚠️' : log.action.includes('LOGIN') ? '🔑' : '🛡️';

                return (
                  <div key={log._id} className="timeline-entry">
                    <div className={`timeline-node ${nodeClass}`}>
                      {nodeIcon}
                    </div>

                    <div className={`timeline-card ${isAlert ? 'is-suspicious' : ''}`}>
                      <div className="timeline-top-row">
                        <div className="timeline-action-title">
                          <span>{formatActionTitle(log.action)}</span>
                          <span className={`badge-status ${log.status.toLowerCase()}`}>
                            {log.status}
                          </span>
                          {log.riskLevel && log.riskLevel !== 'LOW' && (
                            <span className={`badge-risk ${log.riskLevel.toLowerCase()}`}>
                              {log.riskLevel} RISK
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatTimestamp(log.createdAt)}
                        </span>
                      </div>

                      <div className="timeline-meta-chips">
                        <span className="chip">
                          💻 {log.device || `${log.browser} on ${log.os}`}
                        </span>
                        <span className="chip">
                          🌐 {log.ipAddress}
                        </span>
                        <span className="chip">
                          📍 {log.location || 'Unknown Location'}
                        </span>
                      </div>

                      {log.isSuspicious && (
                        <div className="suspicious-anomaly-banner">
                          <div className="suspicious-anomaly-title">
                            <span>🚨</span> Suspicious Login Anomaly Detected
                          </div>
                          {log.metadata?.reasons && log.metadata.reasons.length > 0 ? (
                            <ul className="suspicious-anomaly-list">
                              {log.metadata.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>
                              Unfamiliar device, IP, or location flagged by security intelligence.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 🔐 2FA SETUP MODAL */}
      {showSetupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {setupStep === 1 ? (
              <>
                <div className="modal-header">
                  <h2>Setup Two-Factor Auth</h2>
                  <p>Scan this QR code with Google Authenticator or Authy.</p>
                </div>

                <div className="qr-box">
                  {setupData.qrCodeUrl ? (
                    <img src={setupData.qrCodeUrl} alt="2FA QR Code" width="180" height="180" />
                  ) : (
                    <div className="spinner-small" style={{ borderLeftColor: 'var(--primary)' }}></div>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Or enter this secret key manually:
                </p>
                <div 
                  className="secret-key-display" 
                  onClick={() => copyToClipboard(setupData.secret, "Secret key copied!")}
                  title="Click to copy"
                  style={{ cursor: 'pointer' }}
                >
                  {setupData.secret} 📋
                </div>

                <form onSubmit={handleVerify2FASetup}>
                  <div className="input-group">
                    <label>Enter 6-Digit Code from App</label>
                    <input 
                      type="text" 
                      placeholder="••• •••" 
                      value={verifyCode} 
                      onChange={(e) => setVerifyCode(e.target.value)} 
                      maxLength="6"
                      className="otp-input"
                      required
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowSetupModal(false)} 
                      className="btn-secondary" 
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ flex: 1 }}
                      disabled={modalLoading || verifyCode.length < 6}
                    >
                      {modalLoading ? "Verifying..." : "Confirm & Enable"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Step 2: Emergency Backup Codes */
              <>
                <div className="modal-header">
                  <h2>Save Your Backup Codes</h2>
                  <p>
                    If you lose access to your phone or authenticator app, these 8 emergency single-use recovery codes are the <b>only</b> way to regain access to your account.
                  </p>
                </div>

                <div className="backup-codes-grid">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="backup-code-item">
                      {code}
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => copyToClipboard(backupCodes.join('\n'), "All 8 backup codes copied!")} 
                  className="btn-secondary"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  📋 Copy All Codes
                </button>

                <button 
                  type="button" 
                  onClick={() => setShowSetupModal(false)} 
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Done, I've Saved Them
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🔐 2FA DISABLE MODAL */}
      {showDisableModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Disable 2FA</h2>
              <p>Enter your account password to confirm disabling Two-Factor Authentication.</p>
            </div>

            <form onSubmit={handleDisable2FA}>
              <div className="input-group">
                <label>Current Password</label>
                <input 
                  type="password" 
                  placeholder="Enter your password" 
                  value={disablePassword} 
                  onChange={(e) => setDisablePassword(e.target.value)} 
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowDisableModal(false); setDisablePassword(''); }} 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, backgroundColor: 'var(--danger)' }}
                  disabled={modalLoading || !disablePassword}
                >
                  {modalLoading ? "Disabling..." : "Disable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔄 REGENERATE BACKUP CODES MODAL */}
      {showRegenModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {regenStep === 1 ? (
              <>
                <div className="modal-header">
                  <h2>Regenerate Backup Codes</h2>
                  <p>
                    Enter your account password to confirm. This will immediately <b>invalidate all existing backup codes</b> and generate 8 new single-use emergency recovery codes.
                  </p>
                </div>

                <form onSubmit={handleRegenerateBackupCodes}>
                  <div className="input-group">
                    <label>Account Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter your account password" 
                      value={regenPassword} 
                      onChange={(e) => setRegenPassword(e.target.value)} 
                      required
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="button" 
                      onClick={() => { setShowRegenModal(false); setRegenPassword(''); }} 
                      className="btn-secondary" 
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ flex: 1 }}
                      disabled={modalLoading || !regenPassword}
                    >
                      {modalLoading ? "Generating..." : "Generate 8 New Codes"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Step 2: Show New Codes */
              <>
                <div className="modal-header">
                  <h2>8 New Backup Codes Ready</h2>
                  <p>
                    Please save these 8 new emergency codes in a secure location (such as a password manager). Any previous backup codes are now completely deactivated.
                  </p>
                </div>

                <div className="backup-codes-grid">
                  {newBackupCodes.map((code, idx) => (
                    <div key={idx} className="backup-code-item">
                      {code}
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => copyToClipboard(newBackupCodes.join('\n'), "All 8 new backup codes copied!")} 
                  className="btn-secondary"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  📋 Copy All Codes
                </button>

                <button 
                  type="button" 
                  onClick={() => { setShowRegenModal(false); fetch2FA(); }} 
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Done, I've Saved Them
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
