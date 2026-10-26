const nodemailer = require('nodemailer');
const otpEmailTemplate = require('../templates/otpEmailTemplate');
const resetPasswordTemplate = require('../templates/resetPasswordTemplate');
const welcomeEmailTemplate = require('../templates/welcomeEmailTemplate');
const securityAlertEmailTemplate = require('../templates/securityAlertEmailTemplate');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s+/g, '') // remove accidental spaces in app password
    }
  });
};

const verifyEmailTemplate = require('../templates/verifyEmailTemplate');

const sendVerificationEmail = async (user, verifyLink) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Activate your AuthX account",
      html: verifyEmailTemplate(verifyLink, user.email)
    };
    await transporter.sendMail(mailOptions);
    console.log("✅ Verification Email sent to", user.email);
    return true;
  } catch (error) {
    console.error("❌ Verification Email error:", error.message);
    return false;
  }
};

const sendOTPEmail = async (user, otp) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Verify your AuthX account",
      html: otpEmailTemplate(otp, user.email)
    };
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP Email sent to", user.email);
  } catch (error) {
    console.error("❌ OTP Email error:", error.message);
  }
};

const sendResetPasswordEmail = async (user, resetLink) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "AuthX Password Reset Request",
      html: resetPasswordTemplate(resetLink, user.email)
    };
    await transporter.sendMail(mailOptions);
    console.log("✅ Reset Password Email sent to", user.email);
  } catch (error) {
    console.error("❌ Reset Password Email error:", error.message);
  }
};

const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Welcome to AuthX!",
      html: welcomeEmailTemplate(user.email)
    };
    await transporter.sendMail(mailOptions);
    console.log("✅ Welcome Email sent to", user.email);
  } catch (error) {
    console.error("❌ Welcome Email error:", error.message);
  }
};

const sendSuspiciousLoginAlert = async (user, alertData) => {
  try {
    const { browser, os, ipAddress, location, lockLink, reasons } = alertData;
    const deviceStr = `${browser} on ${os}`;
    console.log(`🚨 [SECURITY ALERT] New login detected from ${deviceStr} (IP: ${ipAddress}). If this was not you, click here to lock your account instantly. -> Alert sent to ${user.email}`);

    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'security@authx.local',
      to: user.email,
      subject: `🚨 Security Alert: New login detected from ${deviceStr} (IP: ${ipAddress})`,
      text: `Security Alert: New login detected from ${deviceStr} (IP: ${ipAddress}). If this was not you, click here to lock your account instantly: ${lockLink}`,
      html: securityAlertEmailTemplate({
        userEmail: user.email,
        browser,
        os,
        ipAddress,
        location,
        lockLink,
        reasons
      })
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Suspicious login security alert email dispatched successfully to ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Security Alert Email error:", error.message);
    return false;
  }
};

const unlockAccountEmailTemplate = require('../templates/unlockAccountEmailTemplate');

const sendUnlockAccountEmail = async (user, unlockLink) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'security@authx.local',
      to: user.email,
      subject: "Unlock your AuthX account",
      html: unlockAccountEmailTemplate(unlockLink, user.email)
    };
    await transporter.sendMail(mailOptions);
    console.log("✅ Unlock Account Email sent to", user.email);
    return true;
  } catch (error) {
    console.error("❌ Unlock Account Email error:", error.message);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendOTPEmail,
  sendResetPasswordEmail,
  sendWelcomeEmail,
  sendSuspiciousLoginAlert,
  sendUnlockAccountEmail
};
