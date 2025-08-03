/**
 * Test Setup for KC V2
 * Global test configuration and setup
 */

// Setup test environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock browser APIs
global.performance = {
  now: () => Date.now(),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  }
};

global.localStorage = {
  data: {},
  getItem: jest.fn(key => global.localStorage.data[key] || null),
  setItem: jest.fn((key, value) => {
    global.localStorage.data[key] = value;
  }),
  removeItem: jest.fn(key => {
    delete global.localStorage.data[key];
  }),
  clear: jest.fn(() => {
    global.localStorage.data = {};
  })
};

global.sessionStorage = { ...global.localStorage };

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  send(data) {
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage({ data: JSON.stringify({ echo: data }) });
      }, 10);
    }
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
};

WebSocket.CONNECTING = 0;
WebSocket.OPEN = 1;
WebSocket.CLOSING = 2;
WebSocket.CLOSED = 3;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve(''),
    headers: new Map()
  })
);

// Mock DOM APIs
global.document = {
  getElementById: jest.fn(() => null),
  querySelector: jest.fn(() => null),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(tag => ({
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    style: {},
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    click: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false)
    }
  },
  documentElement: {
    style: {
      setProperty: jest.fn(),
      getPropertyValue: jest.fn()
    },
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  },
  activeElement: null
};

global.window = {
  location: {
    href: 'http://localhost:3000',
    host: 'localhost:3000',
    protocol: 'http:',
    pathname: '/',
    search: '',
    hash: ''
  },
  matchMedia: jest.fn(query => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
  cancelAnimationFrame: jest.fn(id => clearTimeout(id)),
  getComputedStyle: jest.fn(() => ({
    getPropertyValue: jest.fn(() => '')
  }))
};

// Mock File API
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.size = bits.reduce((size, bit) => size + bit.length, 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
  
  slice(start, end) {
    return new Blob(this.bits.slice(start, end));
  }
};

global.Blob = class MockBlob {
  constructor(bits, options = {}) {
    this.bits = bits;
    this.size = bits.reduce((size, bit) => size + bit.length, 0);
    this.type = options.type || '';
  }
};

global.FileReader = class MockFileReader {
  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.result = file.bits.join('');
      if (this.onload) this.onload();
    }, 10);
  }
  
  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.result = new ArrayBuffer(file.size);
      if (this.onload) this.onload();
    }, 10);
  }
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Restore console for test output
afterEach(() => {
  if (process.env.DEBUG_TESTS) {
    global.console = originalConsole;
  }
});

// Global test utilities
global.createMockElement = (tag, props = {}) => {
  const element = document.createElement(tag);
  Object.assign(element, props);
  return element;
};

global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

global.mockModule = (modulePath, implementation) => {
  jest.doMock(modulePath, () => implementation);
};

// Performance helpers
global.measureTime = async (fn) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
};

// Test data helpers
global.createTestFile = (name = 'test.md', content = 'Test content') => ({
  id: `file-${Date.now()}-${Math.random()}`,
  name,
  path: `/test/${name}`,
  content,
  size: content.length,
  type: name.split('.').pop(),
  lastModified: Date.now()
});

global.createTestUser = (overrides = {}) => ({
  id: 'test-user',
  name: 'Test User',
  email: 'test@example.com',
  preferences: {
    theme: 'dark',
    autoSave: true
  },
  ...overrides
});

// Async test helpers
global.waitForCondition = async (condition, timeout = 5000) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!condition()) {
    throw new Error('Timeout waiting for condition');
  }
};

// Error boundary for tests
global.withErrorBoundary = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    console.error('Test error:', error);
    throw error;
  }
};

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  },
  
  toHaveBeenCalledWithMatch(received, expected) {
    const calls = received.mock.calls;
    const pass = calls.some(call => 
      JSON.stringify(call).includes(JSON.stringify(expected))
    );
    
    return {
      pass,
      message: () => pass
        ? `expected mock not to have been called with match ${JSON.stringify(expected)}`
        : `expected mock to have been called with match ${JSON.stringify(expected)}`
    };
  }
});

// Test lifecycle hooks
beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset localStorage
  global.localStorage.clear();
  
  // Reset document state
  document.activeElement = null;
});

afterEach(() => {
  // Cleanup DOM
  document.body.innerHTML = '';
  
  // Clear timers
  jest.clearAllTimers();
});

afterAll(() => {
  // Final cleanup
  jest.restoreAllMocks();
});

// Export test utilities
module.exports = {
  createMockElement,
  flushPromises,
  mockModule,
  measureTime,
  createTestFile,
  createTestUser,
  waitForCondition,
  withErrorBoundary
};