import React, { useEffect, useState, useCallback } from 'react';
import { 
   getAllUsers, 
   deleteUser, 
   changeRole, 
   unlockUser, 
   getAdminAuditFeed, 
   exportAuditLogsCsv,
   getAdminAnalytics,
   impersonateUser,
   bulkUserAction,
   exportUsersCsv
 } from '../services/api';
 import { toast } from 'react-toastify';
 import { Link, useNavigate } from 'react-router-dom';
 
 const Admin = () => {
   const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'users' | 'audit'
   const [users, setUsers] = useState([]);
   const [usersLoading, setUsersLoading] = useState(true);
   const [currentAdminEmail, setCurrentAdminEmail] = useState('');
 
   // 📊 Analytics States
   const [analytics, setAnalytics] = useState(null);
   const [analyticsLoading, setAnalyticsLoading] = useState(true);
 
   // 📦 Bulk Actions States
   const [selectedUserIds, setSelectedUserIds] = useState([]);
   const [bulkProcessing, setBulkProcessing] = useState(false);
 
   // 🛡️ Security Feed States
   const [auditLogs, setAuditLogs] = useState([]);
   const [auditLoading, setAuditLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [actionFilter, setActionFilter] = useState('ALL');
   const [onlySuspicious, setOnlySuspicious] = useState(false);
   const [exportingCsv, setExportingCsv] = useState(false);
   const [selectedLogMetadata, setSelectedLogMetadata] = useState(null);
 
   const navigate = useNavigate();
 
   // Fetch Current Admin Email
   useEffect(() => {
     try {
       const token = localStorage.getItem('accessToken');
       if (token) {
         const base64Url = token.split('.')[1];
         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
         const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
         const payload = JSON.parse(jsonPayload);
         setCurrentAdminEmail(payload.email || '');
       }
     } catch (e) {
       // fallback
     }
   }, []);
 
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
 
   const fetchAnalytics = useCallback(async () => {
     try {
       setAnalyticsLoading(true);
       const res = await getAdminAnalytics();
       setAnalytics(res.data);
     } catch (err) {
       console.error("Failed to load analytics:", err);
     } finally {
       setAnalyticsLoading(false);
     }
   }, []);
 
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
     } catch (err) {
       console.error("Failed to load admin audit feed:", err);
       toast.error('Failed to fetch security audit feed');
     } finally {
       setAuditLoading(false);
     }
   }, [searchQuery, actionFilter, onlySuspicious]);
 
   useEffect(() => {
     fetchAnalytics();
     fetchUsers();
     fetchAuditFeed();
   }, [fetchAnalytics, fetchAuditFeed]);
 
   // 👤 User Impersonation ("Login as User")
   const handleImpersonate = async (targetUser) => {
     if (targetUser.email === currentAdminEmail) {
       toast.warning("You are already signed in as this administrator.");
       return;
     }
 
     if (!window.confirm(`Initiate impersonation session as '${targetUser.email}'? You will view the application from their perspective.`)) {
       return;
     }
 
     try {
       const res = await impersonateUser(targetUser._id);
       
       // Backup current Admin credentials in localStorage
       const adminBackup = {
         accessToken: localStorage.getItem('accessToken'),
         refreshToken: localStorage.getItem('refreshToken'),
         sessionId: localStorage.getItem('sessionId'),
         email: currentAdminEmail
       };
 
       // Store impersonation metadata
       localStorage.setItem('impersonationSession', JSON.stringify({
         targetEmail: targetUser.email,
         targetUserId: targetUser._id,
         sessionId: res.data.sessionId,
         adminBackup
       }));
 
       // Activate target user's session token
       localStorage.setItem('accessToken', res.data.impersonationToken);
       if (res.data.sessionId) {
         localStorage.setItem('sessionId', res.data.sessionId);
       }
 
       window.dispatchEvent(new Event('impersonation-changed'));
       toast.success(`Impersonating ${targetUser.email}. Switched to user view.`);
       navigate('/dashboard');
     } catch (err) {
       toast.error(err.response?.data?.msg || 'Failed to initiate impersonation');
     }
   };
 
   // 📦 Bulk Actions Execution
   const handleBulkAction = async (action, role) => {
     if (selectedUserIds.length === 0) {
       toast.warning("Please select at least one user.");
       return;
     }
 
     const confirmMsg = action === 'delete'
       ? `Permanently delete ${selectedUserIds.length} user(s)? This action is irreversible.`
       : `Execute bulk '${action}' on ${selectedUserIds.length} user(s)?`;
 
     if (!window.confirm(confirmMsg)) return;
 
     try {
       setBulkProcessing(true);
       const res = await bulkUserAction({
         action,
         userIds: selectedUserIds,
         role
       });
 
       toast.success(res.data.msg || `Bulk action completed!`);
       setSelectedUserIds([]);
       await Promise.all([fetchUsers(), fetchAnalytics(), fetchAuditFeed()]);
     } catch (err) {
       toast.error(err.response?.data?.msg || 'Bulk operation failed');
     } finally {
       setBulkProcessing(false);
     }
   };
 
   // Toggle individual selection
   const toggleUserSelection = (userId) => {
     setSelectedUserIds(prev => 
       prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
     );
   };
 
   // Select All Toggle
   const toggleSelectAll = () => {
     if (selectedUserIds.length === users.length) {
       setSelectedUserIds([]);
     } else {
       setSelectedUserIds(users.map(u => u._id));
     }
   };
 
   // 📥 Export Users to CSV
   const handleExportUsers = async () => {
     try {
       const res = await exportUsersCsv();
       const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
       const url = window.URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.setAttribute('download', `authx-directory-${new Date().toISOString().slice(0, 10)}.csv`);
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       window.URL.revokeObjectURL(url);
       toast.success("User directory exported to CSV!");
     } catch (err) {
       toast.error("Failed to export user CSV");
     }
   };
 
   // 📥 Export Audit Logs CSV
   const handleExportCsv = async () => {
     try {
       setExportingCsv(true);
       const params = {
         search: searchQuery,
         action: actionFilter === 'ALL' ? undefined : actionFilter,
         isSuspicious: onlySuspicious ? true : undefined
       };
       const res = await exportAuditLogsCsv(params);
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
         fetchAnalytics();
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
       fetchAnalytics();
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
       case 'USER_IMPERSONATION_STARTED': return 'Impersonation Started';
       case 'USER_IMPERSONATION_ENDED': return 'Impersonation Ended';
       case 'BULK_ACTION_EXECUTED': return 'Bulk Action Executed';
       default: return action;
     }
   };
 
   // Maximum count calculation for SVG charts
   const maxVelocity = analytics?.registrationVelocity?.dailySeries 
     ? Math.max(...analytics.registrationVelocity.dailySeries.map(d => d.count), 1)
     : 1;
 
   const maxFailedLogins = analytics?.failedLogins?.dailySeries
     ? Math.max(...analytics.failedLogins.dailySeries.map(d => d.count), 1)
     : 1;
 
   return (
     <div className="dashboard-container">
       <nav className="dashboard-nav">
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div className="logo" style={{ fontSize: '20px', fontWeight: '800' }}>AuthX Enterprise</div>
           <span style={{ 
             background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', 
             color: '#3730a3', 
             fontSize: '11px', 
             fontWeight: '800', 
             padding: '3px 10px', 
             borderRadius: '12px',
             letterSpacing: '0.5px'
           }}>
             ADMIN SUITE
           </span>
         </div>
         <div style={{ display: 'flex', gap: '10px' }}>
           <Link to="/developer" className="btn-secondary" style={{ textDecoration: 'none', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', borderColor: '#c7d2fe', fontWeight: '600' }}>
             ⚡ Developer Platform
           </Link>
           <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
             ← Back to Dashboard
           </Link>
         </div>
       </nav>
       
       <main className="dashboard-content">
         <header className="dashboard-header" style={{ marginBottom: '24px' }}>
           <h1>Enterprise Identity & Security Intelligence</h1>
           <p className="subtitle">
             Real-time security analytics, single-click user impersonation troubleshooting, bulk operations, and forensics audit feed.
           </p>
         </header>
 
         {/* 📑 TABS NAVIGATION */}
         <div className="tab-nav">
           <button 
             className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
             onClick={() => setActiveTab('analytics')}
           >
             📊 Security & Auth Analytics
           </button>
           <button 
             className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
             onClick={() => setActiveTab('users')}
           >
             👥 User Directory & Impersonation ({users.length})
           </button>
           <button 
             className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
             onClick={() => setActiveTab('audit')}
           >
             🛡️ Forensics SOC Feed ({auditLogs.length})
           </button>
         </div>
 
         {/* ========================================================= */}
         {/* TAB 1: 📊 SECURITY & AUTH ANALYTICS                       */}
         {/* ========================================================= */}
         {activeTab === 'analytics' && (
           <div>
             {analyticsLoading ? (
               <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                 Loading security and auth analytics...
               </div>
             ) : (
               <>
                 {/* 📈 TOP KPI CARDS */}
                 <div className="admin-kpi-grid">
                   <div className="kpi-card kpi-primary">
                     <div className="kpi-label">Active Users</div>
                     <div className="kpi-number" style={{ color: '#4f46e5' }}>
                       {analytics?.overview?.activeUsers || 0}
                       <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginLeft: '6px' }}>
                         / {analytics?.overview?.totalUsers || 0} total
                       </span>
                     </div>
                   </div>
 
                   <div className="kpi-card kpi-alert">
                     <div className="kpi-label">Failed Logins (24h)</div>
                     <div className="kpi-number" style={{ color: analytics?.failedLogins?.last24h > 0 ? '#ef4444' : '#10b981' }}>
                       {analytics?.failedLogins?.last24h || 0}
                     </div>
                   </div>
 
                   <div className="kpi-card kpi-success">
                     <div className="kpi-label">2FA Adoption Rate</div>
                     <div className="kpi-number" style={{ color: '#059669' }}>
                       {analytics?.overview?.twoFactorAdoptionPct || 0}%
                       <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginLeft: '6px' }}>
                         ({analytics?.overview?.twoFactorUsers || 0} enabled)
                       </span>
                     </div>
                   </div>
 
                   <div className="kpi-card">
                     <div className="kpi-label">Active Sessions</div>
                     <div className="kpi-number" style={{ color: '#0284c7' }}>
                       {analytics?.overview?.activeSessions || 0}
                     </div>
                   </div>
                 </div>
 
                 {/* 📊 VISUAL ANALYTICS CHARTS GRID */}
                 <div className="analytics-grid">
                   
                   {/* CHART 1: 24h & 7d Registration Velocity */}
                   <div className="analytics-card">
                     <div className="analytics-card-header">
                       <div>
                         <h3 className="analytics-card-title">
                           <span>⚡</span> Registration Velocity (7-Day Trend)
                         </h3>
                         <div className="analytics-card-desc">
                           {analytics?.registrationVelocity?.last24h || 0} new in last 24h • {analytics?.registrationVelocity?.last7d || 0} in last 7 days
                         </div>
                       </div>
                       <span style={{ 
                         background: '#e0e7ff', 
                         color: '#4338ca', 
                         fontSize: '11px', 
                         fontWeight: '700', 
                         padding: '3px 8px', 
                         borderRadius: '6px' 
                       }}>
                         DAILY ONBOARDING
                       </span>
                     </div>
 
                     {/* SVG Bar Chart */}
                     <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingTop: '20px', borderBottom: '1px solid var(--border)' }}>
                       {analytics?.registrationVelocity?.dailySeries?.map((day, idx) => {
                         const barHeight = Math.max((day.count / maxVelocity) * 130, 8);
                         return (
                           <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                             <span style={{ fontSize: '11px', fontWeight: '700', color: day.count > 0 ? '#4f46e5' : '#94a3b8', marginBottom: '4px' }}>
                               {day.count}
                             </span>
                             <div 
                               style={{ 
                                 width: '100%', 
                                 maxWidth: '36px', 
                                 height: `${barHeight}px`, 
                                 background: day.count > 0 ? 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)' : '#e2e8f0', 
                                 borderRadius: '4px 4px 0 0',
                                 transition: 'height 0.3s ease'
                               }}
                               title={`${day.label}: ${day.count} registrations`}
                             />
                           </div>
                         );
                       })}
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                       {analytics?.registrationVelocity?.dailySeries?.map((day, idx) => (
                         <span key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                           {day.label.split(',')[0]}
                         </span>
                       ))}
                     </div>
                   </div>
 
                   {/* CHART 2: Active vs. Locked Security Gauge */}
                   <div className="analytics-card">
                     <div className="analytics-card-header">
                       <div>
                         <h3 className="analytics-card-title">
                           <span>🔒</span> Active vs. Locked Account Health
                         </h3>
                         <div className="analytics-card-desc">
                           Identity posture and automated brute-force lock distribution
                         </div>
                       </div>
                       <span style={{ 
                         background: analytics?.overview?.lockedUsers > 0 ? '#fee2e2' : '#ecfdf5', 
                         color: analytics?.overview?.lockedUsers > 0 ? '#b91c1c' : '#047857', 
                         fontSize: '11px', 
                         fontWeight: '700', 
                         padding: '3px 8px', 
                         borderRadius: '6px' 
                       }}>
                         {analytics?.overview?.lockedUsers > 0 ? 'ATTENTION REQUIRED' : 'HEALTHY'}
                       </span>
                     </div>
 
                     {/* Segmented Progress Bar */}
                     <div className="progress-split-bar">
                       <div 
                         className="progress-split-segment" 
                         style={{ 
                           width: `${analytics?.overview?.totalUsers > 0 ? (analytics.overview.activeUsers / analytics.overview.totalUsers) * 100 : 100}%`,
                           background: '#10b981'
                         }}
                         title={`Active: ${analytics?.overview?.activeUsers}`}
                       />
                       <div 
                         className="progress-split-segment" 
                         style={{ 
                           width: `${analytics?.overview?.totalUsers > 0 ? (analytics.overview.lockedUsers / analytics.overview.totalUsers) * 100 : 0}%`,
                           background: '#ef4444'
                         }}
                         title={`Locked: ${analytics?.overview?.lockedUsers}`}
                       />
                     </div>
 
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                       <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                         <div style={{ fontSize: '12px', color: '#64748b' }}>Active Accounts</div>
                         <div style={{ fontSize: '20px', fontWeight: '800', color: '#047857' }}>
                           {analytics?.overview?.activeUsers || 0}
                         </div>
                         <div style={{ fontSize: '11px', color: '#64748b' }}>
                           {analytics?.overview?.totalUsers > 0 ? Math.round((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100) : 100}% of directory
                         </div>
                       </div>
 
                       <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                         <div style={{ fontSize: '12px', color: '#64748b' }}>Locked Accounts</div>
                         <div style={{ fontSize: '20px', fontWeight: '800', color: '#b91c1c' }}>
                           {analytics?.overview?.lockedUsers || 0}
                         </div>
                         <div style={{ fontSize: '11px', color: '#64748b' }}>
                           {analytics?.overview?.totalUsers > 0 ? Math.round((analytics.overview.lockedUsers / analytics.overview.totalUsers) * 100) : 0}% of directory
                         </div>
                       </div>
                     </div>
 
                     <div style={{ marginTop: '14px', fontSize: '12px', color: '#64748b' }}>
                       📧 Verified Emails: <strong>{analytics?.overview?.verifiedUsers || 0}</strong> of {analytics?.overview?.totalUsers || 0} users
                     </div>
                   </div>
 
                   {/* CHART 3: Failed Login Attempts & Forensics */}
                   <div className="analytics-card">
                     <div className="analytics-card-header">
                       <div>
                         <h3 className="analytics-card-title">
                           <span>🚨</span> Failed Login Forensics (7-Day Trend)
                         </h3>
                         <div className="analytics-card-desc">
                           Brute-force attempt spikes and credential stuffing forensics
                         </div>
                       </div>
                       <span style={{ 
                         background: '#fee2e2', 
                         color: '#991b1b', 
                         fontSize: '11px', 
                         fontWeight: '700', 
                         padding: '3px 8px', 
                         borderRadius: '6px' 
                       }}>
                         SECURITY FEED
                       </span>
                     </div>
 
                     {/* SVG Bar Chart for Failed Logins */}
                     <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingTop: '20px', borderBottom: '1px solid var(--border)' }}>
                       {analytics?.failedLogins?.dailySeries?.map((day, idx) => {
                         const barHeight = Math.max((day.count / maxFailedLogins) * 130, 8);
                         return (
                           <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                             <span style={{ fontSize: '11px', fontWeight: '700', color: day.count > 0 ? '#ef4444' : '#94a3b8', marginBottom: '4px' }}>
                               {day.count}
                             </span>
                             <div 
                               style={{ 
                                 width: '100%', 
                                 maxWidth: '36px', 
                                 height: `${barHeight}px`, 
                                 background: day.count > 0 ? 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)' : '#e2e8f0', 
                                 borderRadius: '4px 4px 0 0',
                                 transition: 'height 0.3s ease'
                               }}
                               title={`${day.label}: ${day.count} failed logins`}
                             />
                           </div>
                         );
                       })}
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                       {analytics?.failedLogins?.dailySeries?.map((day, idx) => (
                         <span key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                           {day.label}
                         </span>
                       ))}
                     </div>
                   </div>
 
                   {/* CHART 4: OAuth vs. Email/Password Ratios */}
                   <div className="analytics-card">
                     <div className="analytics-card-header">
                       <div>
                         <h3 className="analytics-card-title">
                           <span>🔑</span> Auth Provider Distribution
                         </h3>
                         <div className="analytics-card-desc">
                           Federated Google OAuth SSO vs. Native Email/Password
                         </div>
                       </div>
                       <span style={{ 
                         background: '#f1f5f9', 
                         color: '#475569', 
                         fontSize: '11px', 
                         fontWeight: '700', 
                         padding: '3px 8px', 
                         borderRadius: '6px' 
                       }}>
                         IDENTITY PROVIDER
                       </span>
                     </div>
 
                     {/* Split Ratio Bar */}
                     <div className="progress-split-bar">
                       <div 
                         className="progress-split-segment" 
                         style={{ 
                           width: `${analytics?.authMethods?.emailPasswordPct || 50}%`,
                           background: '#6366f1'
                         }}
                         title={`Email/Password: ${analytics?.authMethods?.emailPasswordPct}%`}
                       />
                       <div 
                         className="progress-split-segment" 
                         style={{ 
                           width: `${analytics?.authMethods?.oauthPct || 50}%`,
                           background: '#ea4335'
                         }}
                         title={`Google OAuth: ${analytics?.authMethods?.oauthPct}%`}
                       />
                     </div>
 
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                       <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }}></span>
                           <span style={{ fontSize: '12px', color: '#64748b' }}>Email & Password</span>
                         </div>
                         <div style={{ fontSize: '20px', fontWeight: '800', color: '#4338ca', marginTop: '4px' }}>
                           {analytics?.authMethods?.emailPasswordCount || 0}
                         </div>
                         <div style={{ fontSize: '11px', color: '#64748b' }}>
                           {analytics?.authMethods?.emailPasswordPct || 0}% of accounts
                         </div>
                       </div>
 
                       <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea4335' }}></span>
                           <span style={{ fontSize: '12px', color: '#64748b' }}>Google OAuth SSO</span>
                         </div>
                         <div style={{ fontSize: '20px', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>
                           {analytics?.authMethods?.oauthCount || 0}
                         </div>
                         <div style={{ fontSize: '11px', color: '#64748b' }}>
                           {analytics?.authMethods?.oauthPct || 0}% of accounts
                         </div>
                       </div>
                     </div>
 
                     <div style={{ marginTop: '14px', fontSize: '12px', color: '#64748b' }}>
                       ⚡ Developer Platform: <strong>{analytics?.overview?.activeApiKeys || 0}</strong> active Scoped API keys • <strong>{analytics?.overview?.activeWebhooks || 0}</strong> Webhooks
                     </div>
                   </div>
 
                 </div>
               </>
             )}
           </div>
         )}
 
         {/* ========================================================= */}
         {/* TAB 2: 👥 USER DIRECTORY & IMPERSONATION                  */}
         {/* ========================================================= */}
         {activeTab === 'users' && (
           <div>
             {/* 📦 STICKY BULK ACTIONS BAR */}
             {selectedUserIds.length > 0 && (
               <div className="bulk-actions-bar">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ fontSize: '18px' }}>📦</span>
                   <span style={{ fontWeight: '700', fontSize: '14px' }}>
                     {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
                   </span>
                 </div>
 
                 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                   <button 
                     onClick={() => handleBulkAction('lock')}
                     disabled={bulkProcessing}
                     className="btn-secondary"
                     style={{ padding: '6px 12px', fontSize: '12px', background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: '700' }}
                   >
                     🔒 Bulk Lock
                   </button>
 
                   <button 
                     onClick={() => handleBulkAction('unlock')}
                     disabled={bulkProcessing}
                     className="btn-secondary"
                     style={{ padding: '6px 12px', fontSize: '12px', background: '#ecfdf5', color: '#047857', borderColor: '#6ee7b7', fontWeight: '700' }}
                   >
                     🔓 Bulk Unlock
                   </button>
 
                   <button 
                     onClick={() => handleBulkAction('changeRole', 'admin')}
                     disabled={bulkProcessing}
                     className="btn-secondary"
                     style={{ padding: '6px 12px', fontSize: '12px', background: '#e0e7ff', color: '#4338ca', borderColor: '#a5b4fc', fontWeight: '700' }}
                   >
                     👑 Make Admin
                   </button>
 
                   <button 
                     onClick={() => handleBulkAction('changeRole', 'user')}
                     disabled={bulkProcessing}
                     className="btn-secondary"
                     style={{ padding: '6px 12px', fontSize: '12px', background: '#f1f5f9', color: '#334155', fontWeight: '600' }}
                   >
                     👤 Make User
                   </button>
 
                   <button 
                     onClick={() => handleBulkAction('delete')}
                     disabled={bulkProcessing}
                     className="btn-secondary"
                     style={{ padding: '6px 12px', fontSize: '12px', background: '#dc2626', color: '#ffffff', borderColor: '#dc2626', fontWeight: '700' }}
                   >
                     🗑️ Bulk Delete
                   </button>
 
                   <button 
                     onClick={() => setSelectedUserIds([])}
                     className="btn-secondary"
                     style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', color: '#cbd5e1', borderColor: '#475569' }}
                   >
                     Clear Selection
                   </button>
                 </div>
               </div>
             )}
 
             {/* HEADER CONTROLS */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
               <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                 Showing <strong>{users.length}</strong> platform identities. Select users for bulk actions or click <strong>Impersonate</strong> to view the app as that user.
               </div>
               <button 
                 onClick={handleExportUsers}
                 className="btn-csv-download"
                 style={{ padding: '8px 16px', fontSize: '13px' }}
               >
                 📥 Export User Directory (CSV)
               </button>
             </div>
 
             {/* USER DIRECTORY TABLE */}
             <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
               {usersLoading ? (
                 <div style={{ padding: '30px', textAlign: 'center' }}>Loading platform users...</div>
               ) : (
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                       <th style={{ padding: '12px 16px', width: '40px' }}>
                         <input 
                           type="checkbox"
                           checked={users.length > 0 && selectedUserIds.length === users.length}
                           onChange={toggleSelectAll}
                           aria-label="Select all platform users"
                         />
                       </th>
                       <th style={{ padding: '12px 16px' }}>Email</th>
                       <th style={{ padding: '12px 16px' }}>Role</th>
                       <th style={{ padding: '12px 16px' }}>Status</th>
                       <th style={{ padding: '12px 16px' }}>Auth Method</th>
                       <th style={{ padding: '12px 16px' }}>2FA</th>
                       <th style={{ padding: '12px 16px' }}>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {users.map((u) => {
                       const isLocked = u.isLocked || (u.lockUntil && new Date(u.lockUntil) > new Date());
                       const isSelected = selectedUserIds.includes(u._id);
                       const isSelf = u.email === currentAdminEmail;
 
                       return (
                         <tr 
                           key={u._id} 
                           style={{ 
                             borderBottom: '1px solid var(--border)',
                             background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                             transition: 'background 0.15s ease'
                           }}
                         >
                           <td style={{ padding: '12px 16px' }}>
                             <input 
                               type="checkbox"
                               checked={isSelected}
                               onChange={() => toggleUserSelection(u._id)}
                               aria-label={`Select user ${u.email}`}
                             />
                           </td>
                           <td style={{ padding: '12px 16px' }}>
                             <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                               {u.email}
                               {isSelf && (
                                 <span style={{ marginLeft: '8px', background: '#e0e7ff', color: '#4338ca', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                   YOU
                                 </span>
                               )}
                             </div>
                             <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                               ID: <code>{u._id}</code>
                             </div>
                           </td>
                           <td style={{ padding: '12px 16px' }}>
                             <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                               {u.role.toUpperCase()}
                             </span>
                           </td>
                           <td style={{ padding: '12px 16px' }}>
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
                           <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                             {u.googleId ? (
                               <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ea4335', fontWeight: '600' }}>
                                 Google SSO
                               </span>
                             ) : (
                               <span style={{ color: '#475569' }}>
                                 Email / Password
                               </span>
                             )}
                           </td>
                           <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                             {u.twoFactorEnabled ? (
                               <span style={{ color: '#059669', fontWeight: '700' }}>🔐 2FA ON</span>
                             ) : (
                               <span style={{ color: '#94a3b8' }}>OFF</span>
                             )}
                           </td>
                           <td style={{ padding: '12px 16px' }}>
                             <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                               
                               {/* 👤 IMPERSONATE USER BUTTON */}
                               <button 
                                 onClick={() => handleImpersonate(u)}
                                 disabled={isSelf}
                                 className="btn-impersonate"
                                 title={isSelf ? "Cannot impersonate yourself" : `View application as ${u.email}`}
                                 style={{ opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                               >
                                 👤 Impersonate
                               </button>
 
                               {isLocked && (
                                 <button 
                                   className="btn-secondary" 
                                   style={{ padding: '4px 8px', fontSize: '11px', background: '#ecfdf5', borderColor: '#10b981', color: '#047857', fontWeight: '600' }} 
                                   onClick={() => handleUnlockUser(u._id, u.email)}
                                   title="Unlock account immediately"
                                 >
                                   🔓 Unlock
                                 </button>
                               )}
 
                               <button 
                                 className="btn-secondary" 
                                 style={{ padding: '4px 8px', fontSize: '11px' }} 
                                 onClick={() => handleRoleChange(u._id, u.role)}
                               >
                                 Make {u.role === 'admin' ? 'User' : 'Admin'}
                               </button>
 
                               <button 
                                 className="btn-secondary" 
                                 style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }} 
                                 onClick={() => handleDelete(u._id)}
                                 disabled={isSelf}
                               >
                                 Delete
                               </button>
                             </div>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               )}
             </div>
           </div>
         )}
 
         {/* ========================================================= */}
         {/* TAB 3: 🛡️ FORENSICS SECURITY AUDIT FEED                   */}
         {/* ========================================================= */}
         {activeTab === 'audit' && (
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
                 <option value="ALL">All Actions</option>
                 <option value="LOGIN_SUCCESS">Login Success</option>
                 <option value="LOGIN_FAILED">Login Failed</option>
                 <option value="ACCOUNT_LOCKED">Account Locked</option>
                 <option value="ACCOUNT_UNLOCKED">Account Unlocked</option>
                 <option value="2FA_ENABLED">2FA Enabled</option>
                 <option value="ROLE_CHANGED">Role Changed</option>
                 <option value="USER_IMPERSONATION_STARTED">Impersonation Events</option>
                 <option value="BULK_ACTION_EXECUTED">Bulk Actions</option>
               </select>
 
               <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                 <input 
                   type="checkbox" 
                   checked={onlySuspicious} 
                   onChange={(e) => setOnlySuspicious(e.target.checked)} 
                 />
                 🚨 Suspicious Only
               </label>
 
               <button 
                 onClick={handleExportCsv}
                 disabled={exportingCsv}
                 className="btn-csv-download"
               >
                 {exportingCsv ? 'Exporting...' : '📥 Export Audit CSV'}
               </button>
             </div>
 
             {/* 📜 SECURITY EVENT AUDIT FEED TABLE */}
             <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
               {auditLoading ? (
                 <div style={{ padding: '30px', textAlign: 'center' }}>Loading security audit logs...</div>
               ) : auditLogs.length === 0 ? (
                 <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                   No security audit events match your filter criteria.
                 </div>
               ) : (
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                       <th style={{ padding: '12px 16px' }}>Timestamp</th>
                       <th style={{ padding: '12px 16px' }}>Actor</th>
                       <th style={{ padding: '12px 16px' }}>Event Action</th>
                       <th style={{ padding: '12px 16px' }}>Risk</th>
                       <th style={{ padding: '12px 16px' }}>Device & Origin</th>
                       <th style={{ padding: '12px 16px' }}>Anomaly Detection</th>
                       <th style={{ padding: '12px 16px' }}>Details</th>
                     </tr>
                   </thead>
                   <tbody>
                     {auditLogs.map((log) => {
                       const isSus = log.isSuspicious;
                       const riskClass = log.riskLevel?.toLowerCase() || 'low';
                       return (
                         <tr 
                           key={log._id} 
                           style={{ 
                             borderBottom: '1px solid var(--border)',
                             background: isSus ? '#fff1f2' : 'transparent'
                           }}
                         >
                           <td style={{ padding: '12px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                             {new Date(log.timestamp).toLocaleDateString(undefined, { 
                               month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
                             })}
                           </td>
                           <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                             {log.userEmail}
                           </td>
                           <td style={{ padding: '12px 16px' }}>
                             <span style={{ 
                               fontWeight: '600', 
                               fontSize: '13px',
                               color: log.status === 'ALERT' || log.status === 'FAILURE' ? '#dc2626' : '#1e293b' 
                             }}>
                               {formatActionTitle(log.action)}
                             </span>
                           </td>
                           <td style={{ padding: '12px 16px' }}>
                             <span className={`badge-risk ${riskClass}`}>
                               {log.riskLevel}
                             </span>
                           </td>
                           <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                             <div>{log.deviceInfo?.browser || 'Browser'} on {log.deviceInfo?.os || 'OS'}</div>
                             <div style={{ color: '#64748b' }}>
                               IP: {log.deviceInfo?.ipAddress || log.ipAddress} • {log.deviceInfo?.location || 'Local'}
                             </div>
                           </td>
                           <td style={{ padding: '12px 16px' }}>
                             {isSus ? (
                               <span style={{ 
                                 background: '#fee2e2', 
                                 color: '#991b1b', 
                                 fontWeight: '700', 
                                 padding: '3px 8px', 
                                 borderRadius: '4px',
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
