/**
 * Jest Configuration for VCIA Knowledge Consolidator
 * Comprehensive testing setup for unit and integration tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.js'
  ],
  
  // Module paths
  roots: ['<rootDir>/js', '<rootDir>/test'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.min.js',
    '!js/debug-*.js',
    '!js/temp-*.js',
    '!js/test-*.js'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical components
    'js/managers/': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    'js/services/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  
  // Module name mapping for easier imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/js/$1',
    '^@utils/(.*)$': '<rootDir>/js/utils/$1',
    '^@managers/(.*)$': '<rootDir>/js/managers/$1',
    '^@services/(.*)$': '<rootDir>/js/services/$1',
    '^@components/(.*)$': '<rootDir>/js/components/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/temp/',
    '<rootDir>/backups/'
  ],
  
  // Mock patterns
  moduleFileExtensions: ['js', 'json'],
  
  // Global variables available in tests
  globals: {
    'window': {},
    'document': {},
    'navigator': {},
    'localStorage': {},
    'sessionStorage': {},
    'fetch': jest.fn()
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Error reporting
  errorOnDeprecated: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Test result processor for custom reporting
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'VCIA Knowledge Consolidator Test Report'
    }]
  ],
  
  // Performance monitoring
  maxWorkers: '50%',
  
  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/test/jest-setup.js'
  ]
};