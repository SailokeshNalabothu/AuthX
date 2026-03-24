import React, { useState } from 'react';
import { verifyOTP } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOTP({ email, otp });
      toast.success("Account verified! You can now log in.");
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verify Account</h2>
        <p className="subtitle">We sent a 6-digit OTP to <br/><b>{email || 'your email'}</b></p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>One-Time Password</label>
            <input 
              type="text" 
              placeholder="••• •••" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              maxLength="6"
              className="otp-input"
              required
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading || !email}>
            {loading ? <div className="spinner-small"></div> : 'Verify Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
