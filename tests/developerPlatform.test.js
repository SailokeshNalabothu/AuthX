const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../src/models/User');
const ApiKey = require('../src/models/ApiKey');
const Webhook = require('../src/models/Webhook');
const WebhookDelivery = require('../src/models/WebhookDelivery');
const { generateSignature, verifyWebhookSignature } = require('../src/services/webhookService');

describe('⚡ Developer Platform: Scoped API Keys & Webhooks', () => {
  let user = null;
  let userToken = null;
  let activeRawKey = null;
  let activeKeyId = null;
  let webhookId = null;
  let webhookSecret = null;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({ email: 'developer_test@authx.io' });
    await ApiKey.deleteMany({});
    await Webhook.deleteMany({});
    await WebhookDelivery.deleteMany({});

    // Create verified test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('DevPassword123!', 10);
    user = await User.create({
      email: 'developer_test@authx.io',
      password: hashedPassword,
      isVerified: true,
      role: 'user'
    });

    userToken = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'developer_test@authx.io' });
    await ApiKey.deleteMany({});
    await Webhook.deleteMany({});
    await WebhookDelivery.deleteMany({});
  });

  // ==========================================
  // 1. SCOPED API KEYS (PERSONAL ACCESS TOKENS)
  // ==========================================
  describe('1. Scoped API Keys / PATs Management & Authentication', () => {
    it('should create a new scoped API key with selectable permissions', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Backend Microservice Key',
          scopes: ['read:profile', 'read:sessions'],
          expiresInDays: 30
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.apiKey).toBeDefined();
      expect(res.body.apiKey.rawKey).toMatch(/^authx_live_sk_[a-f0-9]{48}$/);
      expect(res.body.apiKey.name).toBe('Backend Microservice Key');
      expect(res.body.apiKey.scopes).toEqual(['read:profile', 'read:sessions']);
      expect(res.body.apiKey.expiresAt).toBeDefined();
      expect(res.body.apiKey.keyPrefix).toBeDefined();

      activeRawKey = res.body.apiKey.rawKey;
      activeKeyId = res.body.apiKey.id;

      // Verify DB stores hash, never the raw key
      const keyInDb = await ApiKey.findById(activeKeyId);
      expect(keyInDb.keyHash).toBeDefined();
      expect(keyInDb.keyHash).not.toBe(activeRawKey);
      const computedHash = crypto.createHash('sha256').update(activeRawKey).digest('hex');
      expect(keyInDb.keyHash).toBe(computedHash);
    });

    it('should reject API key creation with invalid scope names', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacker Key',
          scopes: ['admin:destroy', 'read:profile']
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toContain('Invalid scopes');
    });

    it('should list all API keys without exposing raw keys or hashes', async () => {
      const res = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.keys.length).toBeGreaterThanOrEqual(1);
      const found = res.body.keys.find(k => k.id.toString() === activeKeyId.toString());
      expect(found).toBeDefined();
      expect(found.rawKey).toBeUndefined();
      expect(found.keyHash).toBeUndefined();
      expect(found.keyPrefix).toBeDefined();
      expect(found.isActive).toBe(true);
    });

    it('should authenticate requests using Authorization: Bearer authx_live_sk_...', async () => {
      const res = await request(app)
        .get('/api/developer/v1/profile')
        .set('Authorization', `Bearer ${activeRawKey}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.authType).toBe('API_KEY');
      expect(res.body.profile.email).toBe(user.email);
    });

    it('should authenticate requests using x-api-key header', async () => {
      const res = await request(app)
        .get('/api/developer/v1/profile')
        .set('x-api-key', activeRawKey);

      expect(res.statusCode).toBe(200);
      expect(res.body.authType).toBe('API_KEY');
      expect(res.body.profile.email).toBe(user.email);
    });

    it('should ENFORCE SCOPES: reject request when API key lacks required scope', async () => {
      // activeRawKey only has ['read:profile', 'read:sessions']
      // /api/developer/v1/users requires 'read:users'
      const res = await request(app)
        .get('/api/developer/v1/users')
        .set('Authorization', `Bearer ${activeRawKey}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.msg).toContain("lacks required scope 'read:users'");
    });

    it('should allow access when API key has the required scope', async () => {
      // Create second key with 'read:users' scope
      const keyRes = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'User Reader Service',
          scopes: ['read:users']
        });

      const userReaderKey = keyRes.body.apiKey.rawKey;

      const res = await request(app)
        .get('/api/developer/v1/users')
        .set('Authorization', `Bearer ${userReaderKey}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toBeDefined();
    });

    it('should reject invalid, forged, or random API keys', async () => {
      const res = await request(app)
        .get('/api/developer/v1/profile')
        .set('Authorization', 'Bearer authx_live_sk_forgedkey123456789012345678901234567890');

      expect(res.statusCode).toBe(401);
      expect(res.body.msg).toContain('Invalid or revoked API key');
    });

    it('should revoke API key and block further access immediately', async () => {
      const revokeRes = await request(app)
        .put(`/api/api-keys/${activeKeyId}/revoke`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(revokeRes.statusCode).toBe(200);
      expect(revokeRes.body.msg).toContain('revoked successfully');

      // Attempt access with revoked key
      const testRes = await request(app)
        .get('/api/developer/v1/profile')
        .set('Authorization', `Bearer ${activeRawKey}`);

      expect(testRes.statusCode).toBe(401);
      expect(testRes.body.msg).toContain('Invalid or revoked API key');
    });
  });

  // ==========================================
  // 2. OUTBOUND WEBHOOKS & HMAC SIGNATURES
  // ==========================================
  describe('2. Outbound Webhooks & HMAC SHA-256 Signatures', () => {
    it('should register a new webhook endpoint and generate signing secret', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'https://webhook.site/test-endpoint',
          description: 'Production Billing Webhook',
          events: ['user.signup', 'user.locked', 'user.verified']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.webhook).toBeDefined();
      expect(res.body.webhook.url).toBe('https://webhook.site/test-endpoint');
      expect(res.body.webhook.secret).toMatch(/^whsec_[a-f0-9]{48}$/);
      expect(res.body.webhook.events).toEqual(['user.signup', 'user.locked', 'user.verified']);

      webhookId = res.body.webhook.id;
      webhookSecret = res.body.webhook.secret;
    });

    it('should reject webhook registration with invalid URL format', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'ftp://invalid-url.com',
          events: ['user.signup']
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toContain('valid HTTP or HTTPS destination URL');
    });

    it('should reject webhook registration with invalid event names', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['user.signup', 'invalid.event.name']
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toContain('Invalid event types');
    });

    it('should list all registered webhooks for the user', async () => {
      const res = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.webhooks.length).toBeGreaterThanOrEqual(1);
      const found = res.body.webhooks.find(w => w.id.toString() === webhookId.toString());
      expect(found).toBeDefined();
      expect(found.secretPreview).toBeDefined();
    });

    it('should retrieve full webhook secret for endpoint configuration', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.webhook.secret).toBe(webhookSecret);
    });

    it('should generate and cryptographically verify HMAC SHA-256 signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const samplePayload = JSON.stringify({
        id: 'evt_12345',
        event: 'user.locked',
        createdAt: new Date().toISOString(),
        data: { userId: 'usr_abc', email: 'victim@example.com' }
      });

      // 1. Generate signature
      const signatureHeader = generateSignature(samplePayload, timestamp, webhookSecret);
      expect(signatureHeader).toContain(`t=${timestamp}`);
      expect(signatureHeader).toContain('v1=');

      // 2. Verify valid signature
      const isValid = verifyWebhookSignature(samplePayload, signatureHeader, webhookSecret);
      expect(isValid).toBe(true);

      // 3. Reject tampered payload
      const tamperedPayload = JSON.stringify({
        id: 'evt_12345',
        event: 'user.locked',
        createdAt: new Date().toISOString(),
        data: { userId: 'usr_abc', email: 'attacker@example.com' } // Tampered email!
      });
      const isTamperedValid = verifyWebhookSignature(tamperedPayload, signatureHeader, webhookSecret);
      expect(isTamperedValid).toBe(false);

      // 4. Reject wrong secret
      const isWrongSecretValid = verifyWebhookSignature(samplePayload, signatureHeader, 'whsec_wrongsecret123456789');
      expect(isWrongSecretValid).toBe(false);
    });

    it('should send a test ping to webhook endpoint and record delivery', async () => {
      const res = await request(app)
        .post(`/api/webhooks/${webhookId}/test`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.delivery).toBeDefined();
      expect(res.body.delivery.signatureHeader).toContain('v1=');
      expect(res.body.delivery.payloadSent.event).toBe('authx.test_ping');

      // Verify delivery logged to database
      const deliveries = await WebhookDelivery.find({ webhookId });
      expect(deliveries.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve webhook delivery history', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.deliveries).toBeDefined();
      expect(res.body.deliveries.length).toBeGreaterThanOrEqual(1);
    });

    it('should delete a webhook endpoint and remove delivery logs', async () => {
      const res = await request(app)
        .delete(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toContain('deleted successfully');

      const found = await Webhook.findById(webhookId);
      expect(found).toBeNull();
    });
  });
});
