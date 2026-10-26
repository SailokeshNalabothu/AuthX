module.exports = function securityAlertEmailTemplate({
  userEmail,
  browser = 'Chrome',
  os = 'Linux',
  ipAddress = '198.51.100.23',
  location = 'Unknown Location',
  lockLink = '#',
  reasons = []
}) {
  const deviceStr = `${browser} on ${os}`;
  const reasonsHtml = reasons.length > 0
    ? `<div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; color: #991b1b; font-weight: 600; font-size: 13px;">ANOMALY SIGNALS DETECTED:</p>
        <ul style="margin: 0; padding-left: 20px; color: #b91c1c; font-size: 13px;">
          ${reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: Suspicious Login Detected</title>
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color:#1e293b; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.4); overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(239, 68, 68, 0.2);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 28px; line-height: 1;">🚨</span>
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; vertical-align: middle; margin-left: 8px;">AuthX Security Intelligence</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                Suspicious Login Detected
              </h1>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Hello <strong>${userEmail}</strong>,
              </p>

              <!-- Exact verbatim requested text block -->
              <div style="background-color: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #fca5a5; line-height: 1.5;">
                  New login detected from <strong>${deviceStr}</strong> (IP: <strong>${ipAddress}</strong>). If this was not you, click here to lock your account instantly.
                </p>
              </div>

              ${reasonsHtml}

              <!-- Session Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f172a; border-radius: 10px; border: 1px solid #334155; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; width: 120px;">Device & OS:</td>
                        <td style="padding: 6px 0; color: #f1f5f9; font-size: 14px; font-weight: 600;">${deviceStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">IP Address:</td>
                        <td style="padding: 6px 0; color: #f1f5f9; font-size: 14px; font-family: monospace;">${ipAddress}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Approx. Location:</td>
                        <td style="padding: 6px 0; color: #f1f5f9; font-size: 14px; font-weight: 600;">${location}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Timestamp:</td>
                        <td style="padding: 6px 0; color: #f1f5f9; font-size: 14px;">${new Date().toUTCString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${lockLink}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-align: center; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
                      🔒 Lock Your Account Instantly
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 13px; color: #94a3b8; line-height: 1.5; text-align: center;">
                Clicking the button immediately revokes all active sessions, terminates token privileges, and locks your account until verified by you or an administrator.
              </p>

              <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
                If this login was authorized by you, you can safely disregard this email. Your new device will be remembered for future sessions.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b1120; padding: 18px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © AuthX Identity & Access Management. Automated Proactive Security Intelligence.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
