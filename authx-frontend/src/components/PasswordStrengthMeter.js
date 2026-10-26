import React, { useMemo } from 'react';

const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', '123456789', '12345',
  'qwerty', 'admin', 'welcome', 'letmein', 'monkey', 'iloveyou', 'football',
  'master', 'dragon', 'baseball', 'superman', 'trustno1', 'shadow', 'secret',
  'pass123', 'admin123', 'root', 'login', 'access', 'authx123', 'changeme',
  'abc123', 'test123', 'p@ssword', 'guest', 'starwars'
]);

export function calculatePasswordEntropy(password) {
  if (!password) return { entropy: 0, crackTime: 'Instant', poolSize: 0 };

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  if (poolSize === 0) return { entropy: 0, crackTime: 'Instant', poolSize: 0 };

  const entropy = Math.round(password.length * Math.log2(poolSize));

  // Compute crack time based on 10 billion guesses/sec
  const combinations = Math.pow(poolSize, Math.min(password.length, 32));
  const seconds = combinations / 1e10;

  let crackTime = 'Instant (< 1 sec)';
  if (seconds >= 315360000000) {
    crackTime = 'Centuries (Quantum Resistant)';
  } else if (seconds >= 31536000) {
    const years = Math.round(seconds / 31536000);
    crackTime = `${years.toLocaleString()} years`;
  } else if (seconds >= 86400) {
    const days = Math.round(seconds / 86400);
    crackTime = `${days} days`;
  } else if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    crackTime = `${hours} hours`;
  } else if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    crackTime = `${minutes} mins`;
  } else if (seconds >= 1) {
    crackTime = `${Math.round(seconds)} seconds`;
  }

  return { entropy, crackTime, poolSize };
}

const PasswordStrengthMeter = ({ password = '', onScoreChange }) => {
  const analysis = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: 'Enter password',
        color: '#6b7280',
        entropy: 0,
        crackTime: 'Instant',
        isBlacklisted: false,
        rules: {
          minLen: false,
          hasLower: false,
          hasUpper: false,
          hasNumber: false,
          hasSymbol: false,
          notBlacklisted: true
        }
      };
    }

    const cleanPass = password.toLowerCase().trim();
    const isBlacklisted = COMMON_PASSWORDS.has(cleanPass);
    const { entropy, crackTime } = calculatePasswordEntropy(password);

    const rules = {
      minLen: password.length >= 8,
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[^a-zA-Z0-9]/.test(password),
      notBlacklisted: !isBlacklisted
    };

    if (isBlacklisted) {
      return {
        score: 1,
        label: 'Blacklisted Password ⚠️',
        color: '#ef4444',
        entropy: 12,
        crackTime: 'Instant (Dictionary Attack)',
        isBlacklisted: true,
        rules
      };
    }

    let score = 1;
    let label = 'Very Weak';
    let color = '#ef4444';

    if (entropy >= 80 && rules.minLen && rules.hasSymbol && rules.hasNumber && rules.hasUpper) {
      score = 5;
      label = 'Cyber Fortress 🛡️';
      color = '#00f0ff';
    } else if (entropy >= 65 && rules.minLen && (rules.hasNumber || rules.hasSymbol)) {
      score = 4;
      label = 'Strong';
      color = '#10b981';
    } else if (entropy >= 45 && rules.minLen) {
      score = 3;
      label = 'Moderate';
      color = '#eab308';
    } else if (entropy >= 28 || password.length >= 6) {
      score = 2;
      label = 'Weak';
      color = '#f97316';
    }

    return {
      score,
      label,
      color,
      entropy,
      crackTime,
      isBlacklisted: false,
      rules
    };
  }, [password]);

  React.useEffect(() => {
    if (onScoreChange) {
      onScoreChange(analysis.score);
    }
  }, [analysis.score, onScoreChange]);

  if (!password) return null;

  return (
    <div className="password-strength-container" style={{
      marginTop: '8px',
      marginBottom: '14px',
      padding: '12px 14px',
      borderRadius: '8px',
      background: 'rgba(0, 0, 0, 0.2)',
      border: `1px solid ${analysis.isBlacklisted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
      backdropFilter: 'blur(8px)',
      transition: 'all 0.3s ease'
    }}>
      {/* Header bar: Label & Entropy */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: analysis.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: analysis.color, boxShadow: `0 0 8px ${analysis.color}` }}></span>
          {analysis.label}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)' }}>
            ⚡ {analysis.entropy} bits entropy
          </span>
        </div>
      </div>

      {/* 5-Segmented Animated Meter Bar */}
      <div style={{ display: 'flex', gap: '4px', height: '6px', marginBottom: '10px' }}>
        {[1, 2, 3, 4, 5].map((segment) => (
          <div
            key={segment}
            style={{
              flex: 1,
              height: '100%',
              borderRadius: '3px',
              background: segment <= analysis.score ? analysis.color : 'rgba(255, 255, 255, 0.1)',
              boxShadow: segment <= analysis.score ? `0 0 6px ${analysis.color}66` : 'none',
              transition: 'all 0.35s ease'
            }}
          />
        ))}
      </div>

      {/* Crack-time Estimate Badge */}
      <div style={{
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <span>Est. Brute-Force Crack Time:</span>
        <strong style={{ color: analysis.score >= 4 ? '#10b981' : analysis.color, fontWeight: 700 }}>
          ⏱️ {analysis.crackTime}
        </strong>
      </div>

      {/* Blacklist Warning */}
      {analysis.isBlacklisted && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '6px',
          padding: '8px 10px',
          fontSize: '11px',
          marginBottom: '8px',
          display: 'flex',
          gap: '6px'
        }}>
          <span>⚠️</span>
          <span>This password appears on top common password leak lists. It is trivially crackable.</span>
        </div>
      )}

      {/* Checklist Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '4px 8px',
        fontSize: '11px'
      }}>
        <span style={{ color: analysis.rules.minLen ? '#10b981' : 'var(--text-muted)' }}>
          {analysis.rules.minLen ? '✅' : '○'} 8+ characters
        </span>
        <span style={{ color: analysis.rules.hasUpper ? '#10b981' : 'var(--text-muted)' }}>
          {analysis.rules.hasUpper ? '✅' : '○'} Uppercase letter
        </span>
        <span style={{ color: analysis.rules.hasLower ? '#10b981' : 'var(--text-muted)' }}>
          {analysis.rules.hasLower ? '✅' : '○'} Lowercase letter
        </span>
        <span style={{ color: analysis.rules.hasNumber ? '#10b981' : 'var(--text-muted)' }}>
          {analysis.rules.hasNumber ? '✅' : '○'} Number (0-9)
        </span>
        <span style={{ color: analysis.rules.hasSymbol ? '#10b981' : 'var(--text-muted)' }}>
          {analysis.rules.hasSymbol ? '✅' : '○'} Special symbol (!@#$)
        </span>
        <span style={{ color: analysis.rules.notBlacklisted ? '#10b981' : '#ef4444' }}>
          {analysis.rules.notBlacklisted ? '✅' : '❌'} Not in common breach list
        </span>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;
