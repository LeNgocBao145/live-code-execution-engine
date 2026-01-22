export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  globalTeardown: './jest.teardown.js',
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/libs/migrations/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.js$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'ecmascript',
          jsx: false,
          dynamicImport: true,
          privateMethod: true,
          functionBind: true,
          exportDefaultFrom: true,
          exportNamespaceFrom: true,
          decorators: true,
          classProperties: true,
          classPrivateProperties: true,
          classPrivateMethods: true,
        },
      },
    }],
  },
  verbose: true,
  bail: false,
  detectOpenHandles: false,
  forceExit: true,
  testTimeout: 15000,
};
