import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const GoogleSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      toast.success("Successfully logged in with Google!");
      navigate('/dashboard');
    } else {
      toast.error('Google login failed');
      navigate('/login');
    }
  }, [location, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Authenticating...</h2>
        <p className="subtitle">Please wait while we securely connect your Google account.</p>
        <div className="spinner"></div>
      </div>
    </div>
  );
};

export default GoogleSuccess;
