module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.pbt.test.ts',
    '!src/**/*.integration.test.ts',
    '!src/**/*.e2e.test.ts',
    '!src/**/*.db.test.ts',
    '!src/**/*.aws.test.ts',
    '!src/index.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'json-summary'],
  testTimeout: 10000,
  verbose: true
};
