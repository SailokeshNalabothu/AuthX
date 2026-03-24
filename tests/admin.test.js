const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');

jest.mock('../src/services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

describe('Role-Based Access Control (Admin)', () => {
  let adminToken = '';
  let userToken = '';
  let targetUserId = '';

  beforeAll(async () => {
    await User.deleteMany({});
    
    // Create regular user
    await request(app).post('/api/auth/signup').send({ email: 'user@test.com', password: '123' });
    let normalUser = await User.findOne({ email: 'user@test.com' });
    normalUser.isVerified = true;
    await normalUser.save();
    const loginRes1 = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: '123' });
    userToken = loginRes1.body.accessToken;
    targetUserId = normalUser._id;

    // Create admin user
    await request(app).post('/api/auth/signup').send({ email: 'admin@test.com', password: '123' });
    let adminUser = await User.findOne({ email: 'admin@test.com' });
    adminUser.isVerified = true;
    adminUser.role = 'admin';
    await adminUser.save();
    const loginRes2 = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: '123' });
    adminToken = loginRes2.body.accessToken;
  });

  describe('GET /api/users', () => {
    it('should deny access to regular users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.msg).toBe("Access denied");
    });

    it('should allow access to admins', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/users/:id/role', () => {
    it('should allow admin to change roles', async () => {
      const res = await request(app)
        .put(`/api/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("User role updated");
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should allow admin to delete users', async () => {
      const res = await request(app)
        .delete(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("User deleted successfully");
    });
  });
});
