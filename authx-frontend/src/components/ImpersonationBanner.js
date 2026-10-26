import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exitImpersonation } from '../services/api';
import { toast } from 'react-toastify';

const ImpersonationBanner = () => {
  const [impersonationData, setImpersonationData] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  const checkImpersonation = () => {
    try {
      const stored = localStorage.getItem('impersonationSession');
      if (stored) {
        setImpersonationData(JSON.parse(stored));
      } else {
        setImpersonationData(null);
      }
    } catch (e) {
      setImpersonationData(null);
    }
  };

  useEffect(() => {
    checkImpersonation();

    const handleStorageChange = () => checkImpersonation();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('impersonation-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('impersonation-changed', handleStorageChange);
    };
  }, []);

  if (!impersonationData) return null;

  const handleExit = async () => {
    try {
      setIsExiting(true);
      if (impersonationData.sessionId) {
        await exitImpersonation({
          sessionId: impersonationData.sessionId,
          targetEmail: impersonationData.targetEmail
        }).catch(() => {});
      }

      // Restore Admin credentials
      if (impersonationData.adminBackup) {
        if (impersonationData.adminBackup.accessToken) {
          localStorage.setItem('accessToken', impersonationData.adminBackup.accessToken);
        }
        if (impersonationData.adminBackup.refreshToken) {
          localStorage.setItem('refreshToken', impersonationData.adminBackup.refreshToken);
        }
        if (impersonationData.adminBackup.sessionId) {
          localStorage.setItem('sessionId', impersonationData.adminBackup.sessionId);
        }
      }

      localStorage.removeItem('impersonationSession');
      window.dispatchEvent(new Event('impersonation-changed'));
      toast.info(`Exited impersonation. Restored admin session for ${impersonationData.adminBackup?.email || 'admin'}.`);
      navigate('/admin');
    } catch (err) {
      toast.error('Failed to cleanly terminate impersonation');
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <aside 
      aria-label="User impersonation notification banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 99999,
        background: 'linear-gradient(90deg, #b45309 0%, #d97706 50%, #b45309 100%)',
        color: '#ffffff',
        padding: '10px 20px',
        boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>👤</span>
        <div style={{ fontSize: '14px', fontWeight: '500' }}>
          <strong>Viewing as:</strong>{' '}
          <span style={{ 
            background: 'rgba(0, 0, 0, 0.25)', 
            padding: '2px 8px', 
            borderRadius: '4px', 
            fontWeight: '700',
            letterSpacing: '0.3px'
          }}>
            {impersonationData.targetEmail}
          </span>
          <span style={{ marginLeft: '10px', fontSize: '12px', opacity: 0.9 }}>
            (Troubleshooting Mode • Impersonated by {impersonationData.adminBackup?.email || 'Administrator'})
          </span>
        </div>
      </div>

      <button
        onClick={handleExit}
        disabled={isExiting}
        style={{
          background: '#ffffff',
          color: '#b45309',
          border: 'none',
          padding: '6px 16px',
          borderRadius: '6px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: isExiting ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#fef3c7'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
      >
        {isExiting ? 'Restoring Admin...' : 'Exit Impersonation'}
      </button>
    </aside>
  );
};

export default ImpersonationBanner;
