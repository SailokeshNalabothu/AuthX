import React, { useState } from 'react';
import { signup } from '../services/api';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import ThemeToggle from '../components/ThemeToggle';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup({ email, password });
      setIsRegistered(true);
      toast.success("Account created! Verification link sent to your email.");
    } catch (err) {
      toast.error(err.response?.data?.msg || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <ThemeToggle compact={true} />
        </div>
        {isRegistered ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '68px',
              height: '68px',
              background: 'rgba(59, 130, 246, 0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              📩
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Check Your Email</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              We sent a 1-click verification link to <strong style={{ color: '#fff' }}>{email}</strong>. Click the link in your email to activate your account and log in immediately.
            </p>
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              ✨ <strong>1-Click Activation:</strong> No 6-digit codes to type. Simply open the email and tap <em>Verify & Activate My Account</em>.
            </div>
            <Link to="/login" className="btn-primary" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', width: '100%' }}>
              Return to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h2>Create an Account</h2>
            <p className="subtitle">Join AuthX to experience secure access.</p>
        
        <button type="button" onClick={handleGoogleLogin} className="btn-google">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="20" height="20" />
          Continue with Google
        </button>
        
        <div className="divider">or continue with email</div>
        
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
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Create a strong password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
            <PasswordStrengthMeter password={password} />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <div className="spinner-small"></div> : 'Sign up'}
          </button>
        </form>
        <p className="footer-text">
          Already have an account? <Link to="/login">Log in here</Link>
        </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;
