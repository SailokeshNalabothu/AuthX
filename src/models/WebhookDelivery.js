const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
      index: true
    },
    event: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    payload: {
      type: Object,
      required: true
    },
    signature: {
      type: String,
      required: true
    },
    statusCode: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      required: true
    },
    responseBody: {
      type: String,
      default: ''
    },
    durationMs: {
      type: Number,
      default: 0
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
