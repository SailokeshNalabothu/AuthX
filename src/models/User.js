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

    // OTP SYSTEM
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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
