module.exports = (userName) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background-color: #f9f9f9; text-align: center; border: 1px solid #eaeaea;">
  <img src="https://yourlogo.com/logo.png" alt="AuthX Logo" width="100" style="margin-bottom: 20px;">
  <h2 style="color: #4CAF50;">Welcome to AuthX, ${userName}!</h2>
  <p style="font-size: 16px; color: #333;">Your account has been successfully verified. You can now log in and access all features.</p>
  <a href="http://localhost:5000/api/auth/login" style="display:inline-block; padding: 12px 25px; background-color:#2196F3; color:#fff; text-decoration:none; border-radius:5px; font-weight:bold; margin: 20px 0;">
    Go to Dashboard
  </a>
  <hr style="margin: 20px 0; border-color: #eee;">
  <p style="font-size: 12px; color: #999;">If you did not sign up, please contact support immediately.</p>
</div>
`;
