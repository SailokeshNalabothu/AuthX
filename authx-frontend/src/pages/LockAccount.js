import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { lockAccount, requestUnlock } from '../services/api';
import { toast } from 'react-toastify';

const LockAccount = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!!(token && email));
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [lockedSuccess, setLockedSuccess] = useState(searchParams.get('locked') === 'true');
  const [error, setError] = useState(null);

  const handleConfirmLock = React.useCallback(async () => {
    if (!token || !email) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await lockAccount({ token, email });
      setLockedSuccess(true);
      toast.success("Account successfully locked and all sessions terminated.");
    } catch (err) {
      const msg = err.response?.data?.msg || "Failed to lock account. The link may have expired or already been used.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, email]);

  React.useEffect(() => {
    if (token && email && !lockedSuccess) {
      handleConfirmLock();
    }
  }, [token, email, lockedSuccess, handleConfirmLock]);

  const handleRequestUnlock = async () => {
    if (!email) {
      toast.error("Email parameter missing.");
      return;
    }
    try {
      setUnlockLoading(true);
      const res = await requestUnlock({ email });
      toast.success(res.data.msg || "Unlock link dispatched! Check your email.");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to dispatch unlock link.");
    } finally {
      setUnlockLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '480px', borderTop: '4px solid #ef4444' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'rgba(239, 68, 68, 0.15)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '32px',
            margin: '0 auto 16px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            {lockedSuccess ? '🛡️' : '🚨'}
          </div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0' }}>
            {lockedSuccess ? 'Account Locked & Secured' : 'Instant Account Lockdown'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            {lockedSuccess 
              ? 'Your identity and credentials have been proactively defended.' 
              : 'Suspicious login anomaly response system'}
          </p>
        </div>

        {error && (
          <div className="error-banner" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {lockedSuccess ? (
          <div>
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              borderRadius: '10px', 
              padding: '16px',
              marginBottom: '24px'
            }}>
              <p style={{ color: '#34d399', fontSize: '14px', lineHeight: '1.6', margin: '0 0 10px 0', fontWeight: '600' }}>
                ✅ Security Measures Executed:
              </p>
              <ul style={{ color: '#cbd5e1', fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>All active sessions terminated across all devices</li>
                <li>Refresh and access tokens revoked immediately</li>
                <li>Account marked as locked against brute force and unauthorized entry</li>
                <li>Incident logged to immutable audit trail</li>
              </ul>
            </div>

            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <p style={{ color: '#38bdf8', fontSize: '13px', fontWeight: '700', margin: '0 0 6px 0' }}>
                🔑 Need to regain access?
              </p>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                Since you verified ownership by locking this account, you can restore access right now by receiving an instant self-service unlock link via email.
              </p>
              <button
                type="button"
                onClick={handleRequestUnlock}
                disabled={unlockLoading}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {unlockLoading ? 'Dispatching Link...' : '🔓 Send Self-Service Unlock Link to My Email'}
              </button>
            </div>

            <button
              onClick={() => navigate('/login?locked=true')}
              className="btn-primary"
              style={{ width: '100%', background: '#1e293b', border: '1px solid #475569' }}
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <div>
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              borderRadius: '10px', 
              padding: '16px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#fca5a5', fontSize: '14px', margin: '0 0 8px 0', fontWeight: '600' }}>
                Target Account: <span style={{ color: '#fff' }}>{email || 'Unknown User'}</span>
              </p>
              <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                If you did not authorize the recent login attempt from an unfamiliar device or IP, confirm lockdown below.
              </p>
            </div>

            <div style={{ 
              background: '#0f172a', 
              border: '1px solid #334155', 
              borderRadius: '10px', 
              padding: '14px',
              marginBottom: '24px'
            }}>
              <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>
                Immediate Lockdown Actions:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#e2e8f0' }}>
                <div>⚡ Instantly terminates all active device sessions</div>
                <div>🔒 Invalidate all refresh and authentication tokens</div>
                <div>🛑 Rejects further login attempts until unlocked</div>
              </div>
            </div>

            <button
              onClick={handleConfirmLock}
              disabled={loading || !token || !email}
              className="btn-primary"
              style={{ 
                width: '100%', 
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                marginBottom: '16px',
                padding: '14px'
              }}
            >
              {loading ? 'Executing Security Lock...' : '🔒 Confirm Instant Account Lock'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#94a3b8', fontSize: '13px', textDecoration: 'none' }}>
                Cancel & Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LockAccount;
