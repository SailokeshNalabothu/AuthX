import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { toast } from 'react-toastify';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.warn("Password should be at least 8 characters long");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, password);
      setSuccess(true);
      toast.success("Password reset successfully! You can now log in.");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to reset password. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(16, 185, 129, 0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              margin: '0 auto 16px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              ✅
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Password Updated!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Your account password has been securely reset. You can now log in with your new credentials.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              Sign In to Your Account
            </button>
          </div>
        ) : (
          <>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              margin: '0 auto 14px'
            }}>
              🔑
            </div>
            <h2>Reset Password</h2>
            <p className="subtitle">Create a secure new password for your account.</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter secure new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrengthMeter password={password} />
              </div>

              <div className="input-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    ⚠️ Passwords do not match
                  </span>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
                {loading ? <div className="spinner-small"></div> : 'Update Password'}
              </button>
            </form>

            <p className="footer-text">
              Remember your password? <Link to="/login">Sign in here</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
