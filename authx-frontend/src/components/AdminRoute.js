import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" />;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role !== 'admin') {
      return <Navigate to="/dashboard" />;
    }
  } catch (err) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default AdminRoute;
