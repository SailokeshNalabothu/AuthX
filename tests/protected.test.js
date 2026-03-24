const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');

jest.mock('../src/services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

describe('JWT Protected Routes', () => {
  let userToken = '';

  beforeAll(async () => {
    await User.deleteMany({});
    await request(app).post('/api/auth/signup').send({ email: 'protect@test.com', password: '123' });
    const user = await User.findOne({ email: 'protect@test.com' });
    await request(app).post('/api/auth/verify-otp').send({ email: 'protect@test.com', otp: user.otp });
    const login = await request(app).post('/api/auth/login').send({ email: 'protect@test.com', password: '123' });
    userToken = login.body.accessToken;
  });

  it('should deny access if no token is provided', async () => {
    const res = await request(app).get('/api/protected');
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe("No token provided");
  });

  it('should deny access if token is invalid or expired', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe("Invalid token");
  });

  it('should grant access to authorized users', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toBe("You accessed protected route");
    expect(res.body.user).toBeDefined();
  });
});
