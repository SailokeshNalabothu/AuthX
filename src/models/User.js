const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId; // password not required for Google users
      }
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },

    // EMAIL VERIFICATION (1-Click Link & OTP fallback)
    verificationToken: String,
    verificationExpires: Date,
    otp: String,
    otpExpiry: Date,

    // PASSWORD RESET
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // GOOGLE LOGIN
    googleId: String,

    // REFRESH TOKEN
    refreshToken: {
      type: String
    },

    // ACCOUNT LOCKOUT
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    lockReason: {
      type: String,
      default: null
    },
    accountLockToken: {
      type: String,
      default: null
    },
    accountLockExpires: {
      type: Date,
      default: null
    },
    accountUnlockToken: {
      type: String,
      default: null
    },
    accountUnlockExpires: {
      type: Date,
      default: null
    },

    // TWO-FACTOR AUTHENTICATION (TOTP)
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String
    },
    twoFactorTempSecret: {
      type: String
    },
    twoFactorBackupCodes: [
      {
        codeHash: String,
        used: { type: Boolean, default: false }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
