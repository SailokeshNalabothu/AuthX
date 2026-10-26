const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Session = require('../src/models/Session');
const AuditLog = require('../src/models/AuditLog');

jest.mock('../src/services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendSecurityAlertEmail: jest.fn().mockResolvedValue(true),
  sendUnlockEmail: jest.fn().mockResolvedValue(true)
}));

describe('👑 Enterprise Admin Suite (Analytics, Impersonation & Bulk Actions)', () => {
  let adminToken = '';
  let adminUserId = '';
  let userToken = '';
  let normalUser1 = null;
  let normalUser2 = null;

  beforeAll(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await AuditLog.deleteMany({}, { allowAuditPurge: true });

    const bcrypt = require('bcryptjs');
    const userHash = await bcrypt.hash('password123', 8);
    const adminHash = await bcrypt.hash('adminpassword123', 8);

    // 1. Create Normal User 1
    normalUser1 = await User.create({
      email: 'employee1@enterprise.io',
      password: userHash,
      isVerified: true,
      role: 'user'
    });

    // 2. Create Normal User 2
    normalUser2 = await User.create({
      email: 'employee2@enterprise.io',
      password: userHash,
      isVerified: true,
      role: 'user'
    });

    // 3. Create Admin User
    const adminUser = await User.create({
      email: 'superadmin@enterprise.io',
      password: adminHash,
      isVerified: true,
      role: 'admin'
    });
    adminUserId = adminUser._id.toString();

    // Log in normal user 1
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee1@enterprise.io', password: 'password123' });
    userToken = userLogin.body.accessToken;

    // Log in admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@enterprise.io', password: 'adminpassword123' });
    adminToken = adminLogin.body.accessToken;
  });

  describe('📊 Security & Auth Analytics (GET /api/users/analytics)', () => {
    it('should deny analytics access to unauthenticated requests', async () => {
      const res = await request(app).get('/api/users/analytics');
      expect(res.statusCode).toBe(401);
    });

    it('should deny analytics access to non-admin users (403)', async () => {
      const res = await request(app)
        .get('/api/users/analytics')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.msg).toBe('Access denied');
    });

    it('should return complete analytics payload with velocity and ratios for admin', async () => {
      const res = await request(app)
        .get('/api/users/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('overview');
      expect(res.body).toHaveProperty('registrationVelocity');
      expect(res.body).toHaveProperty('authMethods');
      expect(res.body).toHaveProperty('failedLogins');

      expect(res.body.overview.totalUsers).toBeGreaterThanOrEqual(3);
      expect(res.body.overview.activeUsers).toBeGreaterThanOrEqual(1);
      expect(res.body.registrationVelocity.dailySeries).toBeInstanceOf(Array);
      expect(res.body.registrationVelocity.dailySeries.length).toBe(7);
      expect(res.body.authMethods).toHaveProperty('emailPasswordCount');
      expect(res.body.authMethods).toHaveProperty('oauthCount');
    });
  });

  describe('👤 User Impersonation (POST /api/users/:id/impersonate & exit)', () => {
    let impersonationToken = '';
    let impersonationSessionId = '';

    it('should reject impersonation request from non-admin users', async () => {
      const res = await request(app)
        .post(`/api/users/${normalUser2._id}/impersonate`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('should prevent admin from impersonating their own account', async () => {
      const res = await request(app)
        .post(`/api/users/${adminUserId}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/Cannot impersonate your own/i);
    });

    it('should allow admin to impersonate target user and issue scoped impersonation session', async () => {
      const res = await request(app)
        .post(`/api/users/${normalUser1._id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('impersonationToken');
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body.targetUser.email).toBe('employee1@enterprise.io');
      expect(res.body.impersonator.email).toBe('superadmin@enterprise.io');

      impersonationToken = res.body.impersonationToken;
      impersonationSessionId = res.body.sessionId;

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'USER_IMPERSONATION_STARTED',
        userEmail: 'employee1@enterprise.io'
      });
      expect(audit).toBeDefined();
    });

    it('should allow viewing application as the target user using impersonation token', async () => {
      const res = await request(app)
        .get('/api/developer/v1/profile')
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.profile.email).toBe('employee1@enterprise.io');
    });

    it('should cleanly terminate impersonation session via exit endpoint', async () => {
      const res = await request(app)
        .post('/api/users/exit-impersonation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sessionId: impersonationSessionId, targetEmail: 'employee1@enterprise.io' });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toMatch(/exited successfully/i);

      // Verify session was revoked
      const session = await Session.findById(impersonationSessionId);
      expect(session.isRevoked).toBe(true);
    });
  });

  describe('📦 Bulk User Operations (POST /api/users/bulk-action)', () => {
    it('should reject bulk action from non-admin users', async () => {
      const res = await request(app)
        .post('/api/users/bulk-action')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'lock', userIds: [normalUser1._id] });
      expect(res.statusCode).toBe(403);
    });

    it('should reject bulk action targeting only the admin account', async () => {
      const res = await request(app)
        .post('/api/users/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'lock', userIds: [adminUserId] });
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/Cannot perform bulk actions on your own administrator account/i);
    });

    it('should bulk lock target users and terminate their active sessions', async () => {
      const res = await request(app)
        .post('/api/users/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'lock', userIds: [normalUser1._id, normalUser2._id] });

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(2);

      const u1 = await User.findById(normalUser1._id);
      const u2 = await User.findById(normalUser2._id);
      expect(u1.isLocked).toBe(true);
      expect(u2.isLocked).toBe(true);
    });

    it('should bulk unlock target users', async () => {
      const res = await request(app)
        .post('/api/users/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'unlock', userIds: [normalUser1._id, normalUser2._id] });

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(2);

      const u1 = await User.findById(normalUser1._id);
      expect(u1.isLocked).toBe(false);
    });

    it('should bulk update user roles', async () => {
      const res = await request(app)
        .post('/api/users/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'changeRole', userIds: [normalUser1._id], role: 'admin' });

      expect(res.statusCode).toBe(200);
      const u1 = await User.findById(normalUser1._id);
      expect(u1.role).toBe('admin');
    });

    it('should bulk delete target users', async () => {
      const res = await request(app)
        .post('/api/users/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'delete', userIds: [normalUser2._id] });

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);

      const u2 = await User.findById(normalUser2._id);
      expect(u2).toBeNull();
    });
  });

  describe('📥 CSV Forensics Export (GET /api/users/export-users-csv)', () => {
    it('should stream full users CSV for admin download', async () => {
      const res = await request(app)
        .get('/api/users/export-users-csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="authx-users-/);
      expect(res.text).toContain('User ID,Email,Role,Verified');
      expect(res.text).toContain('superadmin@enterprise.io');
    });
  });
});
