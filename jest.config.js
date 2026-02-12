const { resolve } = require('path');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: resolve(__dirname, 'coverage'),
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
};

