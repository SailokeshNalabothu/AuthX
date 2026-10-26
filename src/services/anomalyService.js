const crypto = require('crypto');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { sendSuspiciousLoginAlert } = require('./emailService');

/**
 * Evaluates whether a login is suspicious based on:
 * - New device (browser + OS combination not previously seen)
 * - New IP address
 * - Unfamiliar location
 *
 * Dispatches an instant security alert email with an account locking link if an anomaly is detected.
 */
const detectAndHandleLoginAnomaly = async (user, deviceInfo, req = null) => {
  try {
    const { browser, os, ipAddress, location, device } = deviceInfo;

    // 1. Fetch previous sessions and login audit history
    const [previousSessions, previousLogs] = await Promise.all([
      Session.find({ userId: user._id }).select('browser os ipAddress location deviceType').lean(),
      AuditLog.find({ userId: user._id, action: 'LOGIN_SUCCESS' }).select('browser os ipAddress location device').lean()
    ]);

    const hasPriorHistory = previousSessions.length > 0 || previousLogs.length > 0;

    // If first ever login on a brand new account, establish baseline
    if (!hasPriorHistory) {
      return {
        isSuspicious: false,
        reasons: [],
        isFirstLogin: true
      };
    }

    // Build known sets of historical footprints
    const knownDevices = new Set();
    const knownIps = new Set();
    const knownLocations = new Set();

    previousSessions.forEach((s) => {
      if (s.browser && s.os) knownDevices.add(`${s.browser.toLowerCase()} on ${s.os.toLowerCase()}`);
      if (s.ipAddress) knownIps.add(s.ipAddress);
      if (s.location) knownLocations.add(s.location.toLowerCase());
    });

    previousLogs.forEach((l) => {
      if (l.browser && l.os) knownDevices.add(`${l.browser.toLowerCase()} on ${l.os.toLowerCase()}`);
      if (l.ipAddress) knownIps.add(l.ipAddress);
      if (l.location) knownLocations.add(l.location.toLowerCase());
    });

    const currentDeviceKey = `${(browser || '').toLowerCase()} on ${(os || '').toLowerCase()}`;
    const currentIp = ipAddress;
    const currentLocationKey = (location || '').toLowerCase();

    const isNewDevice = !knownDevices.has(currentDeviceKey);
    const isNewIp = !knownIps.has(currentIp);
    const isUnfamiliarLocation = !knownLocations.has(currentLocationKey);

    const reasons = [];
    if (isNewDevice) {
      reasons.push(`New device detected: ${browser} on ${os}`);
    }
    if (isNewIp) {
      reasons.push(`New IP address: ${ipAddress}`);
    }
    if (isUnfamiliarLocation) {
      reasons.push(`Unfamiliar location: ${location}`);
    }

    const isSuspicious = reasons.length > 0;

    if (!isSuspicious) {
      return {
        isSuspicious: false,
        reasons: []
      };
    }

    // 🚨 Anomaly Confirmed! Generate instant account lock token
    const lockToken = crypto.randomBytes(32).toString('hex');
    user.accountLockToken = lockToken;
    user.accountLockExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const lockLink = `${clientUrl}/lock-account?token=${lockToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch security alert email instantly
    await sendSuspiciousLoginAlert(user, {
      browser: browser === 'Google Chrome' ? 'Chrome' : browser,
      os,
      ipAddress,
      location,
      lockLink,
      reasons
    });

    return {
      isSuspicious: true,
      reasons,
      lockToken,
      lockLink
    };
  } catch (error) {
    console.error("❌ Error in login anomaly detection engine:", error.message);
    return {
      isSuspicious: false,
      reasons: [],
      error: error.message
    };
  }
};

module.exports = {
  detectAndHandleLoginAnomaly
};
