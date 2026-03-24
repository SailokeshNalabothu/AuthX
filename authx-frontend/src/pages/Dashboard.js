import React, { useEffect, useState } from 'react';
import { getProtectedData } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('accessToken');
      try {
        const res = await getProtectedData(token);
        setData(res.data.msg);
        setUser(res.data.user);
      } catch (err) {
        setData(err.response?.data?.msg || "Session expired. Please log in again.");
        if (err.response?.status === 401 || err.response?.status === 403) {
           // Basic flush of local storage on unauth
           localStorage.removeItem('accessToken');
           localStorage.removeItem('refreshToken');
           navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  }

  if (loading) return <div className="auth-container"><p>Loading dashboard...</p></div>;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="logo">AuthX</div>
        <div>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="btn-secondary" style={{marginRight: '12px'}}>Admin Panel</button>
          )}
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </nav>
      
      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Welcome, {user?.userId || 'User'}!</h1>
          <p className="subtitle">You have successfully authenticated via JWT.</p>
        </header>

        <div className="dashboard-cards">
          <div className="card">
            <h3>Server Message</h3>
            <p className="data-highlight">{data}</p>
          </div>
          
          <div className="card">
            <h3>Your Role</h3>
            <span className={`role-badge ${user?.role === 'admin' ? 'admin' : 'user'}`}>
              {user?.role?.toUpperCase() || 'USER'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
