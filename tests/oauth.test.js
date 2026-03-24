const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

describe('Google OAuth Configuration', () => {
  it('should redirect the user to the Google Consent Screen', async () => {
    const res = await request(app).get('/api/auth/google');
    // Passport automatically sends a 302 Found redirect to accounts.google.com
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });
});
