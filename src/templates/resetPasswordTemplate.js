module.exports = (resetLink, userName) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background-color: #f9f9f9; text-align: center; border: 1px solid #eaeaea;">
  <img src="https://yourlogo.com/logo.png" alt="AuthX Logo" width="100" style="margin-bottom: 20px;">
  <h2 style="color: #2196F3;">Hello, ${userName}</h2>
  <p style="font-size: 16px; color: #333;">You requested to reset your password. Click the button below to proceed:</p>
  <a href="${resetLink}" style="display:inline-block; padding: 12px 25px; background-color:#4CAF50; color:#fff; text-decoration:none; border-radius:5px; font-weight: bold; margin: 20px 0;">
    Reset Password
  </a>
  <p style="font-size: 14px; color: #555;">This link will expire in 10 minutes.</p>
  <hr style="margin: 20px 0; border-color: #eee;">
  <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
</div>
`;
