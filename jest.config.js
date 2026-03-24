module.exports = {
  setupFiles: ['<rootDir>/tests/envMock.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};
