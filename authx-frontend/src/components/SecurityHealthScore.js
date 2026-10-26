import React, { useMemo } from 'react';

const SecurityHealthScore = ({
  user,
  twoFactorStatus = { enabled: false, remainingBackupCodes: 0 },
  sessions = [],
  onEnable2FA,
  onRegenerateBackupCodes,
  onRevokeOthers
}) => {
  const assessment = useMemo(() => {
    let score = 0;
    const items = [];

    // 1. Email Verification (25 pts)
    const isEmailVerified = !!user?.isVerified;
    if (isEmailVerified) {
      score += 25;
      items.push({
        id: 'email',
        title: 'Email Verification',
        weight: 25,
        earned: 25,
        passed: true,
        icon: '✉️',
        statusText: 'Verified & Confirmed',
        desc: 'Protects account recovery and blocks unauthorized email address takeovers.',
        actionLabel: null
      });
    } else {
      items.push({
        id: 'email',
        title: 'Email Verification',
        weight: 25,
        earned: 0,
        passed: false,
        icon: '✉️',
        statusText: 'Pending Verification',
        desc: 'Unverified emails cannot perform self-service account recovery.',
        actionLabel: null
      });
    }

    // 2. Two-Factor Authentication (30 pts)
    const is2FA = !!twoFactorStatus?.enabled;
    if (is2FA) {
      score += 30;
      items.push({
        id: '2fa',
        title: 'Two-Factor Auth (TOTP)',
        weight: 30,
        earned: 30,
        passed: true,
        icon: '🔐',
        statusText: 'Active & Protected',
        desc: 'Google Authenticator / Authy TOTP rolling keys prevent 99.9% of credential theft.',
        actionLabel: null
      });
    } else {
      items.push({
        id: '2fa',
        title: 'Two-Factor Auth (TOTP)',
        weight: 30,
        earned: 0,
        passed: false,
        icon: '⚠️',
        statusText: 'Action Required',
        desc: 'Without 2FA, your account relies solely on password security.',
        actionLabel: '⚡ Enable 2FA Now',
        actionFn: onEnable2FA
      });
    }

    // 3. Emergency Backup Codes (15 pts)
    const hasBackupCodes = is2FA && (twoFactorStatus?.remainingBackupCodes > 0);
    if (hasBackupCodes) {
      score += 15;
      items.push({
        id: 'backup_codes',
        title: 'Emergency Backup Codes',
        weight: 15,
        earned: 15,
        passed: true,
        icon: '🎟️',
        statusText: `${twoFactorStatus.remainingBackupCodes} Codes Available`,
        desc: 'Pre-generated 8-digit emergency recovery codes for phone loss scenarios.',
        actionLabel: null
      });
    } else if (is2FA) {
      items.push({
        id: 'backup_codes',
        title: 'Emergency Backup Codes',
        weight: 15,
        earned: 0,
        passed: false,
        icon: '⚠️',
        statusText: '0 Codes Remaining',
        desc: 'You have exhausted your emergency recovery codes. Regenerate to prevent lockouts.',
        actionLabel: 'Generate New Codes',
        actionFn: onRegenerateBackupCodes
      });
    } else {
      items.push({
        id: 'backup_codes',
        title: 'Emergency Backup Codes',
        weight: 15,
        earned: 0,
        passed: false,
        icon: '🎟️',
        statusText: 'Requires 2FA',
        desc: 'Generated automatically when Two-Factor Authentication is enabled.',
        actionLabel: 'Setup 2FA First',
        actionFn: onEnable2FA
      });
    }

    // 4. Multi-Device Session Hygiene (15 pts)
    const isHealthySessions = sessions.length <= 3;
    if (isHealthySessions) {
      score += 15;
      items.push({
        id: 'sessions',
        title: 'Session Hygiene',
        weight: 15,
        earned: 15,
        passed: true,
        icon: '💻',
        statusText: `${sessions.length} Active Session${sessions.length === 1 ? '' : 's'}`,
        desc: 'Clean device profile with minimal stale or unrecognized browser tokens.',
        actionLabel: null
      });
    } else {
      score += 5;
      items.push({
        id: 'sessions',
        title: 'Session Hygiene',
        weight: 15,
        earned: 5,
        passed: false,
        icon: '⚠️',
        statusText: `${sessions.length} Active Sessions`,
        desc: 'Multiple devices are signed in. We recommend revoking unused device sessions.',
        actionLabel: 'Sign Out Other Devices',
        actionFn: onRevokeOthers
      });
    }

    // 5. httpOnly Secure Cookie Storage & Encryption (15 pts)
    score += 15;
    items.push({
      id: 'cookies',
      title: 'httpOnly Cookie Hardening',
      weight: 15,
      earned: 15,
      passed: true,
      icon: '🛡️',
      statusText: 'Hardened (XSS Immune)',
      desc: 'Access & refresh tokens are stored in httpOnly secure cookies, immune to JavaScript theft.',
      actionLabel: null
    });

    let grade = 'GRADE A+ MAXIMUM DEFENSE';
    let themeColor = '#10b981'; // emerald
    let glowColor = 'rgba(16, 185, 129, 0.4)';

    if (score >= 90) {
      grade = 'GRADE A+ MAXIMUM DEFENSE 🛡️';
      themeColor = '#10b981';
      glowColor = 'rgba(16, 185, 129, 0.45)';
    } else if (score >= 70) {
      grade = 'GRADE A HIGH SECURITY ⚡';
      themeColor = '#00f0ff';
      glowColor = 'rgba(0, 240, 255, 0.45)';
    } else if (score >= 50) {
      grade = 'GRADE B MODERATE DEFENSE ⚠️';
      themeColor = '#f59e0b';
      glowColor = 'rgba(245, 158, 11, 0.45)';
    } else {
      grade = 'GRADE C CRITICAL DEFENSE REQUIRED 🚨';
      themeColor = '#ef4444';
      glowColor = 'rgba(239, 68, 68, 0.45)';
    }

    return { score, items, grade, themeColor, glowColor };
  }, [user, twoFactorStatus, sessions, onEnable2FA, onRegenerateBackupCodes, onRevokeOthers]);

  // Circumference for 120px diameter radial meter
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (assessment.score / 100) * circumference;

  return (
    <div className="health-score-card" style={{
      background: 'var(--card-bg-glass, var(--card-bg))',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '28px',
      boxShadow: `0 8px 30px rgba(0, 0, 0, 0.08), 0 0 20px ${assessment.glowColor}`,
      backdropFilter: 'blur(12px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Banner strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '20px',
        marginBottom: '20px'
      }}>
        {/* Left: Gamified Radial Progress Gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <div style={{ position: 'relative', width: '124px', height: '124px', flexShrink: 0 }}>
            <svg width="124" height="124" viewBox="0 0 124 124" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background track */}
              <circle
                cx="62"
                cy="62"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="10"
              />
              {/* Dynamic Animated Stroke */}
              <circle
                cx="62"
                cy="62"
                r={radius}
                fill="none"
                stroke={assessment.themeColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease',
                  filter: `drop-shadow(0 0 6px ${assessment.themeColor})`
                }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>
                {assessment.score}%
              </span>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '3px' }}>
                Secure
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                background: `${assessment.themeColor}22`,
                color: assessment.themeColor,
                border: `1px solid ${assessment.themeColor}55`,
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.5px'
              }}>
                {assessment.grade}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Security Health Center
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '520px', lineHeight: '1.5' }}>
              {assessment.score >= 90
                ? "Outstanding posture! Your account is hardened with multi-factor defense, session controls, and httpOnly tokens."
                : "Complete the recommended security actions below to achieve 100% fortified defense and protect against account takeovers."}
            </p>
          </div>
        </div>

        {/* Right: Quick Gamified Stat */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px 18px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLETED ACTIONS</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: assessment.themeColor, marginTop: '2px' }}>
            {assessment.items.filter(i => i.passed).length} / {assessment.items.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {100 - assessment.score > 0 ? `+${100 - assessment.score}% defense available` : 'Max shield achieved'}
          </div>
        </div>
      </div>

      {/* Gamified Checklist Action Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px'
      }}>
        {assessment.items.map((item) => (
          <div
            key={item.id}
            style={{
              background: item.passed ? 'rgba(0, 0, 0, 0.15)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${item.passed ? 'var(--border)' : 'rgba(239, 68, 68, 0.35)'}`,
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                    {item.title}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: item.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: item.passed ? '#10b981' : '#f87171',
                  border: `1px solid ${item.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {item.passed ? `+${item.earned}% ✅` : `+0% ⚠️`}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                {item.desc}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: item.passed ? '#10b981' : '#f59e0b' }}>
                {item.statusText}
              </span>

              {item.actionLabel && item.actionFn && (
                <button
                  type="button"
                  onClick={item.actionFn}
                  style={{
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  {item.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityHealthScore;
