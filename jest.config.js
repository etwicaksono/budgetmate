/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          // The app runs with exactOptionalPropertyTypes, but test fixtures build
          // partial filter objects freely; relax only that flag for tests.
          exactOptionalPropertyTypes: false,
          noUnusedLocals: false,
          noUnusedParameters: false
        }
      }
    ]
  },
  clearMocks: true
};
