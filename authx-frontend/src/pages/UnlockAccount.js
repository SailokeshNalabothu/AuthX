import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { unlockAccount } from '../services/api';
import { toast } from 'react-toastify';

const UnlockAccount = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleUnlock = async () => {
      if (!token || !email) {
        setError("Missing unlock token or email address in link.");
        setLoading(false);
        return;
      }

      try {
        await unlockAccount({ token, email });
        setSuccess(true);
        toast.success("Account successfully unlocked!");
      } catch (err) {
        setError(err.response?.data?.msg || "Failed to unlock account. The link may have expired or already been used.");
      } finally {
        setLoading(false);
      }
    };

    handleUnlock();
  }, [token, email]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '440px', borderTop: '4px solid #10b981' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 16px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            {loading ? '⏳' : success ? '🔓' : '⚠️'}
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
            {loading ? 'Verifying Unlock Request...' : success ? 'Account Unlocked!' : 'Unlock Failed'}
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {loading ? 'Please wait while we verify your security credentials.' : success ? `Access restored for ${email}` : error}
          </p>
        </div>

        {success ? (
          <div>
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#065f46',
              lineHeight: '1.6'
            }}>
              Your account has been fully unlocked. You can now log in securely with your credentials.
            </div>

            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              Sign In to Your Account
            </button>
          </div>
        ) : !loading && (
          <div>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              Return to Login
            </button>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Need help? Contact your administrator or try requesting a new unlock link.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnlockAccount;
