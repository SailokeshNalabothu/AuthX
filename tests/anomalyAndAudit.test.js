jest.mock('../src/services/emailService', () => ({
  sendSuspiciousLoginAlert: jest.fn().mockResolvedValue(true),
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Session = require('../src/models/Session');
const AuditLog = require('../src/models/AuditLog');
const emailService = require('../src/services/emailService');

describe('🚨 Anomaly Detection & Security Audit Trail', () => {
  let userEmail = 'security_test@authx.io';
  let password = 'StrongPassword123!';
  let userId = null;
  let userAccessToken = null;
  let adminAccessToken = null;

  beforeAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $in: [userEmail, 'admin_sec@authx.io'] } });
    await AuditLog.deleteMany({}, { allowAuditPurge: true });
    await Session.deleteMany({});

    // Create verified regular user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: userEmail,
      password: hashedPassword,
      isVerified: true,
      role: 'user'
    });
    userId = user._id;

    // Create admin user
    const admin = await User.create({
      email: 'admin_sec@authx.io',
      password: hashedPassword,
      isVerified: true,
      role: 'admin'
    });

    adminAccessToken = jwt.sign(
      { userId: admin._id, role: 'admin' },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [userEmail, 'admin_sec@authx.io'] } });
  });

  describe('1. Baseline Login & Anomaly Detection', () => {
    it('should establish baseline login without false anomaly alarms', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        .send({ email: userEmail, password });

      expect(res.statusCode).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      userAccessToken = res.body.accessToken;

      // First login shouldn't flag anomaly
      expect(res.body.isSuspicious).toBe(false);

      // Verify audit log LOGIN_SUCCESS was created
      const audit = await AuditLog.findOne({ userId, action: 'LOGIN_SUCCESS' });
      expect(audit).toBeTruthy();
      expect(audit.isSuspicious).toBe(false);
      expect(audit.status).toBe('SUCCESS');
    });

    it('should detect suspicious login from unfamiliar device & IP, and dispatch security alert email', async () => {
      emailService.sendSuspiciousLoginAlert.mockClear();

      // Login from Chrome on Linux with IP 198.51.100.23 (as specified in prompt)
      const res = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
        .set('X-Forwarded-For', '198.51.100.23')
        .send({ email: userEmail, password });

      expect(res.statusCode).toBe(200);
      expect(res.body.isSuspicious).toBe(true);

      // Verify email alert was dispatched with requested details
      expect(emailService.sendSuspiciousLoginAlert).toHaveBeenCalled();
      const [alertUser, alertData] = emailService.sendSuspiciousLoginAlert.mock.calls[0];
      expect(alertUser.email).toBe(userEmail);
      expect(alertData.browser).toBe('Chrome');
      expect(alertData.os).toBe('Linux');
      expect(alertData.ipAddress).toBe('198.51.100.23');
      expect(alertData.lockLink).toContain('/lock-account?token=');

      // Verify user document received accountLockToken
      const updatedUser = await User.findById(userId);
      expect(updatedUser.accountLockToken).toBeTruthy();

      // Verify AuditLog recorded ALERT and isSuspicious = true
      const suspiciousLog = await AuditLog.findOne({
        userId,
        action: 'LOGIN_SUCCESS',
        isSuspicious: true
      });
      expect(suspiciousLog).toBeTruthy();
      expect(suspiciousLog.status).toBe('ALERT');
      expect(suspiciousLog.riskLevel).toBe('HIGH');
      expect(suspiciousLog.device).toContain('Chrome on Linux');
      expect(suspiciousLog.ipAddress).toBe('198.51.100.23');
    });
  });

  describe('2. Instant Account Lockdown via Alert Token', () => {
    let lockToken = '';

    beforeAll(async () => {
      const user = await User.findById(userId);
      lockToken = user.accountLockToken;
    });

    it('should execute instant account lock, revoke sessions, and record audit event', async () => {
      // User clicks lock link in alert email
      const res = await request(app)
        .post('/api/auth/lock-account')
        .send({ token: lockToken, email: userEmail });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toContain('locked');

      // Verify user state
      const lockedUser = await User.findById(userId);
      expect(lockedUser.isLocked).toBe(true);
      expect(lockedUser.accountLockToken).toBeNull(); // One-time token consumed

      // Verify all sessions were revoked
      const activeSessions = await Session.find({ userId, isRevoked: false });
      expect(activeSessions.length).toBe(0);

      // Verify ACCOUNT_LOCKED audit event
      const lockAudit = await AuditLog.findOne({ userId, action: 'ACCOUNT_LOCKED' });
      expect(lockAudit).toBeTruthy();
      expect(lockAudit.status).toBe('ALERT');
      expect(lockAudit.riskLevel).toBe('CRITICAL');
    });

    it('should block subsequent sign-in attempts on locked account', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userEmail, password });

      expect(res.statusCode).toBe(403);
      expect(res.body.msg).toContain('locked');
    });
  });

  describe('3. Immutable Security Audit Trail & Forensics', () => {
    it('should prevent updating existing audit log records (immutability enforcement)', async () => {
      const log = await AuditLog.findOne({ userId });
      expect(log).toBeTruthy();

      // Attempting to modify should fail
      await expect(
        AuditLog.updateOne({ _id: log._id }, { $set: { status: 'MUTATED' } })
      ).rejects.toThrow(/immutable/i);
    });

    it('should prevent deleting audit log records', async () => {
      const log = await AuditLog.findOne({ userId });
      expect(log).toBeTruthy();

      // Attempting to delete should fail
      await expect(
        AuditLog.deleteOne({ _id: log._id })
      ).rejects.toThrow(/immutable/i);
    });

    it('should allow user to retrieve personal security history (/api/audit/my-logs)', async () => {
      // Unlock user temporarily for API auth
      await User.findByIdAndUpdate(userId, { isLocked: false });

      const res = await request(app)
        .get('/api/audit/my-logs')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('should allow admin to query organization-wide security feed with search', async () => {
      const res = await request(app)
        .get('/api/audit/admin-feed?search=security_test')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalEvents).toBeGreaterThan(0);
    });

    it('should allow admin to export audit trail as CSV', async () => {
      const res = await request(app)
        .get('/api/audit/export-csv')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('User Email');
      expect(res.text).toContain('Action');
      expect(res.text).toContain('IP Address');
      expect(res.text).toContain('security_test@authx.io');
    });

    it('should allow admin to unlock a locked user (/api/users/:id/unlock)', async () => {
      // Re-lock user
      await User.findByIdAndUpdate(userId, { isLocked: true });

      const res = await request(app)
        .put(`/api/users/${userId}/unlock`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toContain('unlocked');

      const user = await User.findById(userId);
      expect(user.isLocked).toBe(false);

      // Verify ACCOUNT_UNLOCKED audit event
      const unlockAudit = await AuditLog.findOne({ userId, action: 'ACCOUNT_UNLOCKED' });
      expect(unlockAudit).toBeTruthy();
    });
  });
});
