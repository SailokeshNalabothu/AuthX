const crypto = require('crypto');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');
const { generateSignature, sendHttpRequest } = require('../services/webhookService');
const { logAuditEvent } = require('../services/auditService');
const { extractDeviceInfo } = require('../utils/deviceParser');

const ALLOWED_EVENTS = [
  'user.signup',
  'user.verified',
  'user.locked',
  'user.unlocked',
  'user.deleted',
  'session.revoked'
];

// 🔗 REGISTER OUTBOUND WEBHOOK ENDPOINT
exports.createWebhook = async (req, res) => {
  try {
    const { url, events = ['user.signup', 'user.locked'], description = '' } = req.body;
    const userId = req.user?.userId;
    const deviceInfo = extractDeviceInfo(req);

    if (!url || !url.trim().startsWith('http')) {
      return res.status(400).json({ msg: "A valid HTTP or HTTPS destination URL is required" });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ msg: "At least one subscribed event is required" });
    }

    const invalidEvents = events.filter(e => !ALLOWED_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        msg: `Invalid event types: ${invalidEvents.join(', ')}. Allowed events: ${ALLOWED_EVENTS.join(', ')}`
      });
    }

    // Generate cryptographic signing secret (Stripe standard whsec_...)
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = await Webhook.create({
      userId,
      url: url.trim(),
      description: description.trim(),
      secret,
      events
    });

    // 🛡️ Log to Immutable Audit Trail
    await logAuditEvent({
      userId,
      userEmail: req.user?.email || 'unknown',
      action: 'WEBHOOK_CREATED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      deviceInfo,
      metadata: {
        webhookId: webhook._id,
        url: webhook.url,
        events: webhook.events
      }
    });

    res.status(201).json({
      msg: "Webhook registered successfully. Securely store your signing secret.",
      webhook: {
        id: webhook._id,
        url: webhook.url,
        description: webhook.description,
        secret: webhook.secret, // Returned upon creation for developer configuration
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📋 LIST USER'S WEBHOOKS
exports.listWebhooks = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const webhooks = await Webhook.find({ userId }).sort({ createdAt: -1 });

    const results = await Promise.all(webhooks.map(async (wh) => {
      const recentDelivery = await WebhookDelivery.findOne({ webhookId: wh._id }).sort({ deliveredAt: -1 });
      const totalDeliveries = await WebhookDelivery.countDocuments({ webhookId: wh._id });

      return {
        id: wh._id,
        url: wh.url,
        description: wh.description,
        secretPreview: `${wh.secret.substring(0, 10)}...${wh.secret.substring(wh.secret.length - 4)}`,
        events: wh.events,
        isActive: wh.isActive,
        totalDeliveries,
        lastDeliveryStatus: recentDelivery?.status || 'NONE',
        lastDeliveryAt: recentDelivery?.deliveredAt || null,
        createdAt: wh.createdAt
      };
    }));

    res.json({
      webhooks: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔍 GET SINGLE WEBHOOK DETAILS (Includes Full Signing Secret)
exports.getWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const webhook = await Webhook.findOne({ _id: id, userId });
    if (!webhook) {
      return res.status(404).json({ msg: "Webhook endpoint not found" });
    }

    res.json({
      webhook: {
        id: webhook._id,
        url: webhook.url,
        description: webhook.description,
        secret: webhook.secret,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🗑️ DELETE WEBHOOK
exports.deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const deviceInfo = extractDeviceInfo(req);

    const webhook = await Webhook.findOneAndDelete({ _id: id, userId });
    if (!webhook) {
      return res.status(404).json({ msg: "Webhook not found" });
    }

    await WebhookDelivery.deleteMany({ webhookId: id });

    // 🛡️ Log to Immutable Audit Trail
    await logAuditEvent({
      userId,
      userEmail: req.user?.email || 'unknown',
      action: 'WEBHOOK_DELETED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      deviceInfo,
      metadata: {
        webhookId: id,
        url: webhook.url
      }
    });

    res.json({ msg: "Webhook endpoint deleted successfully", webhookId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ⚡ DISPATCH LIVE TEST PING TO WEBHOOK ENDPOINT
exports.testWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const webhook = await Webhook.findOne({ _id: id, userId });
    if (!webhook) {
      return res.status(404).json({ msg: "Webhook not found" });
    }

    const eventId = `evt_test_${crypto.randomBytes(12).toString('hex')}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const testPayload = {
      id: eventId,
      event: "authx.test_ping",
      createdAt: new Date().toISOString(),
      data: {
        message: "This is a live signed test event from your AuthX Developer Platform.",
        endpointId: webhook._id,
        recipientUrl: webhook.url,
        testTimestamp: timestamp
      }
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = generateSignature(payloadString, timestamp, webhook.secret);

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'AuthX-Webhook-Engine/1.0',
      'X-AuthX-Event': 'authx.test_ping',
      'X-AuthX-Delivery': eventId,
      'X-AuthX-Signature': signature,
      'X-AuthX-Timestamp': timestamp.toString()
    };

    const result = await sendHttpRequest(webhook.url, payloadString, headers, 8000);

    // Record delivery
    const delivery = await WebhookDelivery.create({
      webhookId: webhook._id,
      event: 'authx.test_ping',
      url: webhook.url,
      payload: testPayload,
      signature,
      statusCode: result.statusCode,
      status: result.status,
      responseBody: result.body,
      durationMs: result.durationMs,
      deliveredAt: new Date()
    });

    res.json({
      msg: result.status === 'SUCCESS' ? "Webhook test ping delivered successfully!" : "Webhook test ping sent (target returned non-2xx status)",
      delivery: {
        id: delivery._id,
        statusCode: result.statusCode,
        status: result.status,
        durationMs: result.durationMs,
        signatureHeader: signature,
        responsePreview: result.body,
        payloadSent: testPayload
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📜 GET DELIVERIES FOR A WEBHOOK
exports.getWebhookDeliveries = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const webhook = await Webhook.findOne({ _id: id, userId });
    if (!webhook) {
      return res.status(404).json({ msg: "Webhook not found" });
    }

    const deliveries = await WebhookDelivery.find({ webhookId: id })
      .sort({ deliveredAt: -1 })
      .limit(30);

    res.json({
      webhookId: id,
      deliveries,
      count: deliveries.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
