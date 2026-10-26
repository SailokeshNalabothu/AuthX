/**
 * Lightweight, zero-dependency User-Agent and IP parser
 * Extracts device type, browser, OS, and client IP.
 */
function parseUserAgent(userAgentString = '') {
  const ua = userAgentString.toLowerCase();

  // Detect Device Type
  let deviceType = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    deviceType = 'Tablet';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/cros/i.test(ua)) os = 'Chrome OS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Detect Browser (order matters because modern browsers include Chrome/Safari in UA)
  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua)) browser = 'Apple Safari';

  return { deviceType, os, browser };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  const rawIp = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  // Normalize IPv6 mapped IPv4 localhost
  if (rawIp === '::1' || rawIp === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  return rawIp.replace(/^.*:/, '');
}

function getLocationFromIp(ip) {
  if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'Local Development';
  }
  return 'Cloud / Web';
}

module.exports = {
  parseUserAgent,
  getClientIp,
  getLocationFromIp
};
