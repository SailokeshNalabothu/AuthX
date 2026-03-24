const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');

jest.mock('../src/services/emailService', () => ({
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true)
}));

describe('Password Reset Flow', () => {
  let testUser = {
    email: 'resetuser@example.com',
    password: 'password123',
    isVerified: true
  };
  let resetToken = '';

  beforeAll(async () => {
    await User.deleteMany({});

    // Create user manually for this suite
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(testUser.password, 10);
    await User.create({ email: testUser.email, password: hash, isVerified: true });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should email a reset link and store the token', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Password reset link sent to email");

      const user = await User.findOne({ email: testUser.email });
      expect(user.resetPasswordToken).toBeDefined();
      resetToken = user.resetPasswordToken;
    });
  });

  describe('POST /api/auth/reset-password/:token', () => {
    it('should reject an invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/invalidtoken')
        .send({ password: 'newpassword123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toBe("Invalid or expired token");
    });

    it('should successfully rest the password with a valid token', async () => {
      const res = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'newpassword123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Password reset successful");

      // Verify old password fails
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(loginRes.statusCode).toBe(400);

      // Verify new password succeeds
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpassword123' });
      expect(newLoginRes.statusCode).toBe(200);
    });
  });
});
