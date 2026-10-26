const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    keyPrefix: {
      type: String,
      required: true
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    scopes: {
      type: [String],
      required: true,
      enum: [
        'read:profile',
        'write:users',
        'read:users',
        'read:sessions',
        'write:sessions',
        'read:audit'
      ],
      default: ['read:profile']
    },
    expiresAt: {
      type: Date,
      default: null // null indicates never expires
    },
    lastUsedAt: {
      type: Date,
      default: null
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

module.exports = mongoose.model('ApiKey', apiKeySchema);
