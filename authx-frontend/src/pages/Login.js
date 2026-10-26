import React, { useState } from 'react';
import { login, login2FA, requestUnlock } from '../services/api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [isLockedError, setIsLockedError] = useState(false);

  // 2FA Challenge States
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const successMsg = location.state?.success;

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('revoked') === 'true') {
      toast.warn("Your session was terminated from another device.");
    }
    if (params.get('locked') === 'true' || params.get('accountLocked') === 'true') {
      setIsLockedError(true);
      toast.error("🔒 Account locked for security. All active sessions have been terminated.");
    }
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  const handleGoogleLogin = () => {
    const backendBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    window.location.href = `${backendBase}/api/auth/google`;
  };

  const handleRequestUnlock = async () => {
    if (!email) {
      toast.info("Please enter your email address to receive an unlock link.");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsLockedError(false);
    try {
      const res = await login({ email, password });

      // If user has 2FA enabled, switch to verification challenge
      if (res.data.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTempToken(res.data.tempToken);
        toast.info("Two-Factor Authentication required.");
        return;
      }

      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      if (res.data.sessionId) {
        localStorage.setItem('sessionId', res.data.sessionId);
      }
      toast.success("Welcome back!");
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.msg || "Invalid credentials";
      if (msg.toLowerCase().includes('locked')) {
        setIsLockedError(true);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login2FA({
        tempToken,
        code: twoFactorCode,
        isBackupCode: useBackupCode
      });

      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      if (res.data.sessionId) {
        localStorage.setItem('sessionId', res.data.sessionId);
      }
      toast.success("Welcome back!");
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid authentication code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {!twoFactorRequired ? (
          <>
            <h2>Welcome Back</h2>
            <p className="subtitle">Sign in to your AuthX account.</p>
            
            {successMsg && <div className="success-banner">{successMsg}</div>}
            
            {isLockedError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                <p style={{ color: '#991b1b', fontSize: '13px', fontWeight: '700', margin: '0 0 6px 0' }}>
                  🔒 Account Locked for Security
                </p>
                <p style={{ color: '#b91c1c', fontSize: '12px', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                  This account was locked following a security notification or failed attempts.
                </p>
                <button
                  type="button"
                  onClick={handleRequestUnlock}
                  disabled={unlockLoading}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {unlockLoading ? 'Dispatching...' : '🔓 Send Unlock Link to Email'}
                </button>
              </div>
            )}

            <button type="button" onClick={handleGoogleLogin} className="btn-google">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="20" height="20" />
              Continue with Google
            </button>
            
            <div className="divider">or sign in with email</div>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                />
              </div>
              
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={handleRequestUnlock}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                  >
                    Account Locked?
                  </button>
                </div>
                <input 
                  type="password" 
                  placeholder="Enter your password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                />
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <div className="spinner-small"></div> : 'Sign in'}
              </button>
            </form>
            <p className="footer-text">
              Don't have an account? <Link to="/signup">Sign up here</Link>
            </p>
          </>
        ) : (
          /* 🔐 2FA Challenge UI */
          <>
            <h2>Two-Factor Auth</h2>
            <p className="subtitle">
              {useBackupCode 
                ? "Enter one of your 8-digit emergency backup codes."
                : "Enter the 6-digit rolling code from your authenticator app."}
            </p>

            <form onSubmit={handle2FASubmit} className="auth-form">
              <div className="input-group">
                <label>{useBackupCode ? "Emergency Backup Code" : "Authenticator Code"}</label>
                <input 
                  type="text" 
                  placeholder={useBackupCode ? "e.g. 4B2A-91F0" : "••• •••"}
                  value={twoFactorCode} 
                  onChange={(e) => setTwoFactorCode(e.target.value)} 
                  maxLength={useBackupCode ? 10 : 6}
                  className="otp-input"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <div className="spinner-small"></div> : 'Verify & Continue'}
              </button>
            </form>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <button 
                type="button" 
                onClick={() => { setUseBackupCode(!useBackupCode); setTwoFactorCode(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {useBackupCode ? "Use Authenticator App instead" : "Lost access? Use emergency backup code"}
              </button>

              <button 
                type="button" 
                onClick={() => { setTwoFactorRequired(false); setTwoFactorCode(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ← Back to email sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
