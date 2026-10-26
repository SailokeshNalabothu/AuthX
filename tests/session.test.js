const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Session = require('../src/models/Session');

jest.mock('../src/services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

describe('Active Device & Session Intelligence Endpoints', () => {
  let userToken = '';
  let refreshToken = '';
  let sessionId = '';

  beforeAll(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});

    // Sign up and verify user
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'session@test.com', password: 'password123' });

    const user = await User.findOne({ email: 'session@test.com' });
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'session@test.com', otp: user.otp });

    // Log in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
      .send({ email: 'session@test.com', password: 'password123' });

    userToken = loginRes.body.accessToken;
    refreshToken = loginRes.body.refreshToken;
    sessionId = loginRes.body.sessionId;
  });

  it('should list active sessions for authenticated user', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-session-id', sessionId);

    expect(res.statusCode).toBe(200);
    expect(res.body.sessions).toBeInstanceOf(Array);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.sessions[0].browser).toBe('Google Chrome');
    expect(res.body.sessions[0].os).toBe('Windows 10/11');
    expect(res.body.sessions[0].isCurrent).toBe(true);
  });

  it('should revoke a session and block subsequent token refresh', async () => {
    // Revoke the session
    const revokeRes = await request(app)
      .delete(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(revokeRes.statusCode).toBe(200);
    expect(revokeRes.body.msg).toBe('Device session revoked successfully');

    // Attempting to refresh with the revoked session's token must fail
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.statusCode).toBe(403);
    expect(refreshRes.body.msg).toMatch(/revoked/i);
  });
});
