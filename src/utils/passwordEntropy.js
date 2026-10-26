const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', '123456789', '12345',
  'qwerty', 'admin', 'welcome', 'letmein', 'monkey', 'iloveyou', 'football',
  'master', 'dragon', 'baseball', 'superman', 'trustno1', 'shadow', 'secret',
  'pass123', 'admin123', 'root', 'login', 'access', 'authx123', 'changeme',
  'abc123', 'test123', 'p@ssword', 'guest', 'starwars'
]);

function calculatePasswordEntropy(password) {
  if (!password) return { entropy: 0, crackTime: 'Instant', poolSize: 0 };

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  if (poolSize === 0) return { entropy: 0, crackTime: 'Instant', poolSize: 0 };

  const entropy = Math.round(password.length * Math.log2(poolSize));

  // Compute crack time based on 10 billion guesses/sec
  const combinations = Math.pow(poolSize, Math.min(password.length, 32));
  const seconds = combinations / 1e10;

  let crackTime = 'Instant (< 1 sec)';
  if (seconds >= 315360000000) {
    crackTime = 'Centuries (Quantum Resistant)';
  } else if (seconds >= 31536000) {
    const years = Math.round(seconds / 31536000);
    crackTime = `${years.toLocaleString()} years`;
  } else if (seconds >= 86400) {
    const days = Math.round(seconds / 86400);
    crackTime = `${days} days`;
  } else if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    crackTime = `${hours} hours`;
  } else if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    crackTime = `${minutes} mins`;
  } else if (seconds >= 1) {
    crackTime = `${Math.round(seconds)} seconds`;
  }

  return { entropy, crackTime, poolSize };
}

module.exports = {
  COMMON_PASSWORDS,
  calculatePasswordEntropy
};
