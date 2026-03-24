const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');

jest.mock('../src/services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

describe('Auth & OTP Endpoints', () => {
  let testUser = {
    email: 'test@example.com',
    password: 'password123'
  };
  let validOtp = '';

  beforeAll(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user and send an OTP', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);
        
      expect(res.statusCode).toBe(201);
      expect(res.body.msg).toBe("User created. OTP sent to email");
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should prevent duplicate signups', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);
        
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toBe("User already exists");
    });
  });

  describe('POST /api/auth/login (Unverified)', () => {
    it('should block login before OTP verification', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(testUser);
        
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toBe("Please verify your account first");
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should reject an invalid OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testUser.email, otp: '000000' });
        
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toBe("Invalid OTP");
    });

    it('should verify OTP successfully', async () => {
      // Need to fetch user directly from DB to grab the real OTP since our response hides it for security
      const user = await User.findOne({ email: testUser.email });
      validOtp = user.otp;

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testUser.email, otp: validOtp });
        
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Account verified successfully");
    });
  });

  describe('POST /api/auth/login (Verified)', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
        
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toBe("Invalid credentials");
    });

    it('should log in successfully and return JWT/Refresh tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(testUser);
        
      expect(res.statusCode).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });
  });
});
