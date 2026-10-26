import React, { useState } from 'react';
import { signup } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signup({ email, password });
      toast.success("Signup successful! Please check your email for the OTP.");
      navigate('/verify-otp', { state: { email, devOtp: res.data?.devOtp } });
    } catch (err) {
      toast.error(err.response?.data?.msg || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
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
              placeholder="Create a password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <div className="spinner-small"></div> : 'Sign up'}
          </button>
        </form>
        <p className="footer-text">
          Already have an account? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
