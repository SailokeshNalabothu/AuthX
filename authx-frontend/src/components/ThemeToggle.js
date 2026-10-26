import React, { useState, useEffect } from 'react';

const ThemeToggle = ({ compact = false }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('authx_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('authx_theme', theme);
  }, [theme]);

  const themes = [
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'cyber', label: 'Cyber', icon: '⚡' }
  ];

  return (
    <div className={`theme-toggle-container ${compact ? 'compact' : ''}`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'rgba(0, 0, 0, 0.25)',
      padding: '3px',
      borderRadius: '24px',
      border: '1px solid var(--border)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
      userSelect: 'none'
    }}>
      {themes.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            title={`Switch to ${t.label} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: compact ? '4px 8px' : '5px 12px',
              fontSize: compact ? '11px' : '12px',
              fontWeight: 600,
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              background: isActive
                ? (t.id === 'cyber' ? 'linear-gradient(135deg, #00f0ff, #ff007f)' : 'var(--primary)')
                : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              boxShadow: isActive
                ? (t.id === 'cyber' ? '0 0 12px rgba(0, 240, 255, 0.5)' : '0 2px 8px rgba(79, 70, 229, 0.35)')
                : 'none',
              transform: isActive ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <span>{t.icon}</span>
            {!compact && <span>{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
