const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { flexibleAuth, requireScope } = require('../middleware/apiKeyMiddleware');

const {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  getDeveloperProfile,
  getDeveloperUsers,
  getDeveloperSessions,
  getDeveloperAuditEvents
} = require('../controllers/apiKeyController');

const {
  createWebhook,
  listWebhooks,
  getWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookDeliveries
} = require('../controllers/webhookController');

// ==========================================
// 🔑 PERSONAL ACCESS TOKENS / API KEYS
// ==========================================
router.post('/api-keys', authMiddleware, createApiKey);
router.get('/api-keys', authMiddleware, listApiKeys);
router.put('/api-keys/:id/revoke', authMiddleware, revokeApiKey);
router.delete('/api-keys/:id', authMiddleware, deleteApiKey);

// ==========================================
// 🔗 OUTBOUND WEBHOOK ENDPOINTS
// ==========================================
router.post('/webhooks', authMiddleware, createWebhook);
router.get('/webhooks', authMiddleware, listWebhooks);
router.get('/webhooks/:id', authMiddleware, getWebhook);
router.delete('/webhooks/:id', authMiddleware, deleteWebhook);
router.post('/webhooks/:id/test', authMiddleware, testWebhook);
router.get('/webhooks/:id/deliveries', authMiddleware, getWebhookDeliveries);

// ==========================================
// ⚡ DEVELOPER V1 SCOPED PUBLIC/SERVICE API
// Authenticates via Scoped API Key OR JWT
// ==========================================
router.get('/developer/v1/profile', flexibleAuth, requireScope('read:profile'), getDeveloperProfile);
router.get('/developer/v1/users', flexibleAuth, requireScope('read:users'), getDeveloperUsers);
router.get('/developer/v1/sessions', flexibleAuth, requireScope('read:sessions'), getDeveloperSessions);
router.get('/developer/v1/audit-events', flexibleAuth, requireScope('read:audit'), getDeveloperAuditEvents);

module.exports = router;
