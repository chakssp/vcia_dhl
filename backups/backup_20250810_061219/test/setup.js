/**
 * Jest Setup File
 * Global test setup and configuration
 */

// Import test utilities
const {
  MockFactories,
  TestDataGenerators,
  CustomAssertions,
  SetupUtilities,
  PerformanceHelpers
} = require('./test-utils');

// Extend Jest matchers with custom assertions
expect.extend({
  toBeValidFile(received) {
    try {
      CustomAssertions.expectValidFile(received);
      return {
        message: () => `Expected ${received} not to be a valid file`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected ${received} to be a valid file: ${error.message}`,
        pass: false
      };
    }
  },

  toBeValidAnalysisResult(received) {
    try {
      CustomAssertions.expectValidAnalysisResult(received);
      return {
        message: () => `Expected ${received} not to be a valid analysis result`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected ${received} to be a valid analysis result: ${error.message}`,
        pass: false
      };
    }
  },

  toBeValidQdrantPoint(received) {
    try {
      CustomAssertions.expectValidQdrantPoint(received);
      return {
        message: () => `Expected ${received} not to be a valid Qdrant point`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected ${received} to be a valid Qdrant point: ${error.message}`,
        pass: false
      };
    }
  },

  toBeValidSearchResults(received, options = {}) {
    try {
      CustomAssertions.expectValidSearchResults(received, options);
      return {
        message: () => `Expected ${received} not to be valid search results`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected ${received} to be valid search results: ${error.message}`,
        pass: false
      };
    }
  },

  toHaveEmittedEvent(mockEventBus, eventName, expectedData = {}) {
    try {
      CustomAssertions.expectEventEmitted(mockEventBus, eventName, expectedData);
      return {
        message: () => `Expected event ${eventName} not to have been emitted`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected event ${eventName} to have been emitted: ${error.message}`,
        pass: false
      };
    }
  },

  toHaveUpdatedState(mockAppState, key, expectedValue) {
    try {
      CustomAssertions.expectStateUpdated(mockAppState, key, expectedValue);
      return {
        message: () => `Expected state key ${key} not to have been updated`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected state key ${key} to have been updated: ${error.message}`,
        pass: false
      };
    }
  }
});

// Global test utilities
global.TestUtils = {
  MockFactories,
  TestDataGenerators,
  CustomAssertions,
  SetupUtilities,
  PerformanceHelpers
};

// Mock console methods to reduce noise during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global setup for each test
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Clear any existing global state
  if (global.window) {
    delete global.window.KnowledgeConsolidator;
  }
  
  // Setup basic DOM environment
  global.document = {
    createElement: jest.fn(() => ({
      setAttribute: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      click: jest.fn(),
      style: {}
    })),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    }
  };
  
  // Setup basic window environment
  global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    location: {
      href: 'http://localhost:5500',
      origin: 'http://localhost:5500',
      pathname: '/',
      search: '',
      hash: ''
    },
    history: {
      pushState: jest.fn(),
      replaceState: jest.fn(),
      back: jest.fn(),
      forward: jest.fn()
    }
  };
  
  // Setup localStorage mock
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };
  
  // Setup sessionStorage mock
  global.sessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };
  
  // Setup fetch mock
  global.fetch = jest.fn();
  
  // Mock File System Access API
  global.window.showDirectoryPicker = jest.fn();
  global.window.showOpenFilePicker = jest.fn();
  global.window.showSaveFilePicker = jest.fn();
});

// Global cleanup after each test
afterEach(() => {
  // Cleanup test environment
  SetupUtilities.cleanupTestEnvironment();
  
  // Reset timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log
});

// Global error handler
global.addEventListener = global.addEventListener || jest.fn();
global.addEventListener('error', (event) => {
  console.error('Global error in test:', event.error);
});

// Performance monitoring setup
const performanceMonitor = PerformanceHelpers ? 
  SetupUtilities.setupPerformanceMonitor() : 
  { start: jest.fn(), end: jest.fn(), getStats: jest.fn() };

global.testPerformance = performanceMonitor;

// Mock external APIs that might be called during tests
global.fetch.mockImplementation((url, options) => {
  // Default successful response
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map(),
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('OK'),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  });
});

// Mock Intersection Observer
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}));

// Mock MutationObserver
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// Mock performance API
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  };
}