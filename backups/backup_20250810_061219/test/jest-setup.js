/**
 * Jest Setup - Global Configuration
 * Runs before Jest environment is set up
 */

// Polyfills for testing environment
require('jest-localstorage-mock');

// Mock timers by default for more predictable tests
jest.useFakeTimers();

// Global configuration
global.console = {
  ...console,
  // Suppress console.log, console.info, console.debug in tests
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep warn and error for debugging
  warn: console.warn,
  error: console.error
};

// Mock crypto API for browsers that don't have it
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };
}

// Mock AbortController for environments that don't have it
if (!global.AbortController) {
  global.AbortController = class {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
    }
    
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Mock URL constructor for environments that don't have it
if (!global.URL) {
  global.URL = class {
    constructor(url, base) {
      this.href = url;
      this.protocol = 'http:';
      this.host = 'localhost';
      this.hostname = 'localhost';
      this.port = '5500';
      this.pathname = '/';
      this.search = '';
      this.hash = '';
    }
  };
}

// Mock File and Blob constructors
if (!global.File) {
  global.File = class extends Blob {
    constructor(chunks, filename, options = {}) {
      super(chunks, options);
      this.name = filename;
      this.lastModified = Date.now();
    }
  };
}

if (!global.Blob) {
  global.Blob = class {
    constructor(chunks = [], options = {}) {
      this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
      this.type = options.type || '';
    }
    
    text() {
      return Promise.resolve('Mock blob text');
    }
    
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(this.size));
    }
  };
}

// Mock FormData
if (!global.FormData) {
  global.FormData = class {
    constructor() {
      this.data = new Map();
    }
    
    append(key, value) {
      this.data.set(key, value);
    }
    
    get(key) {
      return this.data.get(key);
    }
    
    has(key) {
      return this.data.has(key);
    }
    
    delete(key) {
      this.data.delete(key);
    }
  };
}

// Mock Headers
if (!global.Headers) {
  global.Headers = class {
    constructor(init = {}) {
      this.headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
    
    get(name) {
      return this.headers.get(name.toLowerCase());
    }
    
    set(name, value) {
      this.headers.set(name.toLowerCase(), value);
    }
    
    has(name) {
      return this.headers.has(name.toLowerCase());
    }
    
    delete(name) {
      this.headers.delete(name.toLowerCase());
    }
    
    entries() {
      return this.headers.entries();
    }
  };
}

// Mock TextEncoder/TextDecoder
if (!global.TextEncoder) {
  global.TextEncoder = class {
    encode(string) {
      const buffer = new ArrayBuffer(string.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < string.length; i++) {
        view[i] = string.charCodeAt(i);
      }
      return view;
    }
  };
}

if (!global.TextDecoder) {
  global.TextDecoder = class {
    decode(buffer) {
      const view = new Uint8Array(buffer);
      return String.fromCharCode.apply(null, view);
    }
  };
}

// Set default timezone for consistent date testing
process.env.TZ = 'UTC';

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JEST_WORKER_ID = '1';

// Suppress React warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});