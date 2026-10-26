const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Session = require('../src/models/Session');
const { calculatePasswordEntropy } = require('../src/utils/passwordEntropy');

jest.mock('../src/services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendUnlockAccountEmail: jest.fn().mockResolvedValue(true),
  sendSecurityAlertEmail: jest.fn().mockResolvedValue(true)
}));

describe('🎨 Feature 6: Premium UX & Security Center (httpOnly Cookies & Strength Analyzer)', () => {
  let userEmail = 'cookie_sec@test.com';
  let userPassword = 'CyberFortress#2026!';
  let accessTokenCookie = '';
  let refreshTokenCookie = '';
  let rawAccessToken = '';
  let rawRefreshToken = '';

  beforeAll(async () => {
    await User.deleteMany({ email: userEmail });
    await Session.deleteMany({});

    // Sign up & verify
    await request(app).post('/api/auth/signup').send({ email: userEmail, password: userPassword });
    const user = await User.findOne({ email: userEmail });
    await request(app).post('/api/auth/verify-otp').send({ email: userEmail, otp: user.otp });
  });

  afterAll(async () => {
    await User.deleteMany({ email: userEmail });
    await Session.deleteMany({});
  });

  describe('🛡️ httpOnly Secure Cookie Hardening', () => {
    it('should set httpOnly secure cookies upon login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userEmail, password: userPassword });

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();

      const cookies = res.headers['set-cookie'].join('; ');

      // Verify accessToken cookie has HttpOnly
      expect(cookies).toMatch(/accessToken=[^;]+/);
      expect(cookies).toMatch(/refreshToken=[^;]+/);
      expect(cookies.toLowerCase()).toContain('httponly');

      // Extract cookies for subsequent cookie-only requests
      const accessMatch = cookies.match(/accessToken=([^;]+)/);
      const refreshMatch = cookies.match(/refreshToken=([^;]+)/);
      accessTokenCookie = `accessToken=${accessMatch[1]}`;
      refreshTokenCookie = `refreshToken=${refreshMatch[1]}`;
      rawAccessToken = accessMatch[1];
      rawRefreshToken = refreshMatch[1];
    });

    it('should grant access to protected routes using ONLY httpOnly cookie (no Authorization header)', async () => {
      // Send request with NO Authorization: Bearer header, only the httpOnly Cookie
      const res = await request(app)
        .get('/api/protected')
        .set('Cookie', [accessTokenCookie]);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe('You accessed protected route');
      expect(res.body.user).toBeDefined();
    });

    it('should refresh access token using ONLY httpOnly refreshToken cookie', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshTokenCookie]);

      expect(res.statusCode).toBe(200);
      expect(res.body.accessToken).toBeDefined();

      // Should also set new accessToken cookie
      const cookies = res.headers['set-cookie']?.join('; ') || '';
      expect(cookies).toMatch(/accessToken=[^;]+/);
      expect(cookies.toLowerCase()).toContain('httponly');
    });

    it('should clear all auth cookies upon logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [accessTokenCookie, refreshTokenCookie]);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie']?.join('; ') || '';
      // Cookie clearing in Express sets Max-Age=0 or Expires in past
      expect(cookies).toMatch(/accessToken=;/);
      expect(cookies).toMatch(/refreshToken=;/);
    });
  });

  describe('⚡ Password Strength & Shannon Entropy Analyzer', () => {
    it('should calculate 0 entropy for empty password', () => {
      const result = calculatePasswordEntropy('');
      expect(result.entropy).toBe(0);
      expect(result.poolSize).toBe(0);
    });

    it('should detect character pools and calculate proper Shannon entropy', () => {
      // Lowercase only (pool: 26) -> 6 * log2(26) = 6 * 4.700 = ~28 bits
      const simple = calculatePasswordEntropy('secret');
      expect(simple.poolSize).toBe(26);
      expect(simple.entropy).toBe(28);

      // Complex: uppercase (26) + lowercase (26) + digits (10) + symbols (33) = pool 95
      // 16 chars * log2(95) = 16 * 6.57 = ~105 bits (Quantum resistant)
      const complex = calculatePasswordEntropy('P@ssw0rd!Cyber#2');
      expect(complex.poolSize).toBe(95);
      expect(complex.entropy).toBeGreaterThanOrEqual(80);
      expect(complex.crackTime).toMatch(/year|centur/i);
    });

    it('should scale crack time estimate accurately from seconds to centuries', () => {
      const quick = calculatePasswordEntropy('a1B!'); // 4 chars
      expect(quick.crackTime).toBe('Instant (< 1 sec)');

      const longFortress = calculatePasswordEntropy('AuthX_Quantum_Defense_Shield_2026!#$');
      expect(longFortress.crackTime).toContain('Centuries');
    });
  });
});
