import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail } from '../services/api';
import { toast } from 'react-toastify';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleVerify = async () => {
      if (!token || !email) {
        setError("Missing verification token or email in link.");
        setLoading(false);
        return;
      }

      try {
        const res = await verifyEmail({ token, email });
        setSuccess(true);
        if (res.data.accessToken) {
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          if (res.data.sessionId) {
            localStorage.setItem('sessionId', res.data.sessionId);
          }
        }
        toast.success("Account activated! Welcome to AuthX.");
        // Redirect to dashboard after brief celebration
        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      } catch (err) {
        setError(err.response?.data?.msg || "Failed to verify email. The link may have expired or already been used.");
      } finally {
        setLoading(false);
      }
    };

    handleVerify();
  }, [token, email, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '440px', borderTop: '4px solid #3b82f6' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            background: success ? 'rgba(16, 185, 129, 0.15)' : loading ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 16px',
            border: `1px solid ${success ? 'rgba(16, 185, 129, 0.3)' : loading ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {loading ? '⏳' : success ? '✨' : '⚠️'}
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
            {loading ? 'Activating Your Account...' : success ? 'Email Verified!' : 'Activation Failed'}
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
            {loading 
              ? 'Verifying cryptographic security token...' 
              : success 
                ? `Welcome to AuthX, ${email}! Taking you to your dashboard...` 
                : error}
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
              lineHeight: '1.6',
              textAlign: 'center'
            }}>
              ✅ Identity verified. Sessions initialized with end-to-end security.
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
              style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              Go to Dashboard Now
            </button>
          </div>
        ) : !loading && (
          <div>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              Return to Sign In
            </button>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
              Need a new link? <Link to="/signup" style={{ color: 'var(--primary)' }}>Sign up again</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
