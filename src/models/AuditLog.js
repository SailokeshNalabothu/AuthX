const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET_SUCCESS',
        '2FA_ENABLED',
        '2FA_DISABLED',
        'FAILED_ATTEMPT_LOCKED',
        'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED',
        'EMAIL_VERIFIED',
        'ROLE_CHANGED',
        'SESSION_REVOKED'
      ],
      index: true
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING', 'ALERT'],
      default: 'SUCCESS'
    },
    device: {
      type: String,
      default: 'Unknown Device'
    },
    browser: {
      type: String,
      default: 'Unknown Browser'
    },
    os: {
      type: String,
      default: 'Unknown OS'
    },
    deviceType: {
      type: String,
      default: 'Desktop'
    },
    ipAddress: {
      type: String,
      default: 'Unknown IP',
      index: true
    },
    location: {
      type: String,
      default: 'Unknown Location'
    },
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// 🛡️ IMMUTABILITY ENFORCEMENT: Audit logs must never be updated or deleted
const preventMutation = function () {
  if (this.getOptions && this.getOptions().allowAuditPurge) {
    return;
  }
  throw new Error('Security Audit Trail is immutable. Updating or deleting audit records is forbidden.');
};

// Document middleware: block modifications to existing documents
auditLogSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error('Security Audit Trail is immutable. Updating audit records is forbidden.');
  }
});

// Query middleware: block updates and deletions
auditLogSchema.pre('updateOne', preventMutation);
auditLogSchema.pre('updateMany', preventMutation);
auditLogSchema.pre('findOneAndUpdate', preventMutation);
auditLogSchema.pre('replaceOne', preventMutation);
auditLogSchema.pre('deleteOne', preventMutation);
auditLogSchema.pre('deleteMany', preventMutation);
auditLogSchema.pre('findOneAndDelete', preventMutation);
auditLogSchema.pre('findOneAndRemove', preventMutation);

// Compound indexes for fast admin querying and filtering
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ isSuspicious: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
