const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    secret: {
      type: String,
      required: true
    },
    events: {
      type: [String],
      required: true,
      enum: [
        'user.signup',
        'user.verified',
        'user.locked',
        'user.unlocked',
        'user.deleted',
        'session.revoked'
      ],
      default: ['user.signup', 'user.locked']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Webhook', webhookSchema);
