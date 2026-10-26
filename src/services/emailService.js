const nodemailer = require('nodemailer');
const otpEmailTemplate = require('../templates/otpEmailTemplate');
const resetPasswordTemplate = require('../templates/resetPasswordTemplate');
const welcomeEmailTemplate = require('../templates/welcomeEmailTemplate');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s+/g, '') // remove accidental spaces in app password
    }
  });
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

module.exports = {
  sendOTPEmail,
  sendResetPasswordEmail,
  sendWelcomeEmail
};
