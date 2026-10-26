const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    refreshToken: {
      type: String,
      required: true,
      index: true
    },
    deviceType: {
      type: String,
      enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
      default: 'Unknown'
    },
    browser: {
      type: String,
      default: 'Unknown Browser'
    },
    os: {
      type: String,
      default: 'Unknown OS'
    },
    ipAddress: {
      type: String,
      default: 'Unknown IP'
    },
    location: {
      type: String,
      default: 'Local Network'
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    isRevoked: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Session', sessionSchema);
