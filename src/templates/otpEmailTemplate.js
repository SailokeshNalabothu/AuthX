module.exports = (otp, userName) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; text-align: center; background-color: #f9f9f9;">
  <img src="https://yourlogo.com/logo.png" alt="AuthX Logo" width="100" style="margin-bottom: 20px;">
  <h2 style="color: #4CAF50;">Welcome to AuthX, ${userName}!</h2>
  <p style="font-size: 16px; color: #333;">Please use the following One-Time Password (OTP) to verify your account:</p>
  <h1 style="font-size: 36px; color: #FF5722; margin: 20px 0;">${otp}</h1>
  <p style="font-size: 14px; color: #555;">This OTP will expire in <b>10 minutes</b>.</p>
  <hr style="margin: 20px 0; border-color: #eee;">
  <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
</div>
`;
