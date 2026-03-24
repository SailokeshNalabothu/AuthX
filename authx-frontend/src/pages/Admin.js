import React, { useEffect, useState } from 'react';
import { getAllUsers, deleteUser, changeRole } from '../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to fetch users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id);
        setUsers(users.filter(u => u._id !== id));
        toast.success("User deleted successfully");
      } catch (err) {
        toast.error(err.response?.data?.msg || 'Error deleting user');
      }
    }
  };

  const handleRoleChange = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await changeRole(id, newRole);
      setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error changing role');
    }
  };

  if (loading) return <div className="auth-container"><div className="spinner"></div></div>;
  if (error) return <div className="auth-container"><div className="error-banner">{error}</div></div>;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="logo">AuthX Admin</div>
        <Link to="/dashboard" className="btn-secondary" style={{textDecoration: 'none'}}>Back to Dashboard</Link>
      </nav>
      
      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>User Management</h1>
          <p className="subtitle">View, edit roles, and remove users from the platform.</p>
        </header>

        <div className="card" style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
            <thead>
              <tr style={{borderBottom: '1px solid var(--border)'}}>
                <th style={{padding: '12px'}}>Email</th>
                <th style={{padding: '12px'}}>Role</th>
                <th style={{padding: '12px'}}>Verified</th>
                <th style={{padding: '12px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px'}}>{u.email}</td>
                  <td style={{padding: '12px'}}>
                    <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{padding: '12px'}}>{u.isVerified ? '✅' : '❌'}</td>
                  <td style={{padding: '12px', display: 'flex', gap: '8px'}}>
                    <button className="btn-secondary" style={{padding: '6px 10px', fontSize: '13px'}} onClick={() => handleRoleChange(u._id, u.role)}>
                      Make {u.role === 'admin' ? 'User' : 'Admin'}
                    </button>
                    <button className="btn-secondary" style={{padding: '6px 10px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger)'}} onClick={() => handleDelete(u._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default Admin;
