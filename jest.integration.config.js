module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.integration.ts'],
  testTimeout: 30000, // Longer timeout for integration tests
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}; 