/**
 * Test Framework Utilities for KC V2
 * Provides common testing utilities and helpers
 */

// Mock implementation of expect for demonstration
// In real implementation, use Jest or another testing framework
export const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toHaveLength: (length) => {
    if (actual.length !== length) {
      throw new Error(`Expected length ${actual.length} to be ${length}`);
    }
  },
  toContain: (item) => {
    if (!actual.includes(item)) {
      throw new Error(`Expected array to contain ${item}`);
    }
  },
  toBeGreaterThan: (value) => {
    if (actual <= value) {
      throw new Error(`Expected ${actual} to be greater than ${value}`);
    }
  },
  toBeLessThan: (value) => {
    if (actual >= value) {
      throw new Error(`Expected ${actual} to be less than ${value}`);
    }
  },
  toHaveBeenCalled: () => {
    if (!actual.mock?.calls?.length) {
      throw new Error('Expected function to have been called');
    }
  },
  toHaveBeenCalledWith: (...args) => {
    const calls = actual.mock?.calls || [];
    const hasCall = calls.some(call => 
      JSON.stringify(call) === JSON.stringify(args)
    );
    if (!hasCall) {
      throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
    }
  },
  toThrow: (error) => {
    try {
      actual();
      throw new Error('Expected function to throw');
    } catch (e) {
      if (error && !e.message.includes(error)) {
        throw new Error(`Expected error to contain "${error}" but got "${e.message}"`);
      }
    }
  },
  rejects: {
    toThrow: async (error) => {
      try {
        await actual;
        throw new Error('Expected promise to reject');
      } catch (e) {
        if (error && !e.message.includes(error)) {
          throw new Error(`Expected error to contain "${error}" but got "${e.message}"`);
        }
      }
    }
  },
  resolves: {
    toBe: async (expected) => {
      const result = await actual;
      if (result !== expected) {
        throw new Error(`Expected resolved value ${result} to be ${expected}`);
      }
    }
  }
});

// Test runner utilities
export const describe = (name, fn) => {
  console.log(`\nTest Suite: ${name}`);
  fn();
};

export const test = (name, fn) => {
  console.log(`  Test: ${name}`);
  try {
    fn();
    console.log('    ✓ Passed');
  } catch (error) {
    console.error('    ✗ Failed:', error.message);
    throw error;
  }
};

export const beforeEach = (fn) => {
  // Called before each test
  global.__beforeEach = fn;
};

export const afterEach = (fn) => {
  // Called after each test
  global.__afterEach = fn;
};

export const beforeAll = (fn) => {
  // Called once before all tests
  global.__beforeAll = fn;
};

export const afterAll = (fn) => {
  // Called once after all tests
  global.__afterAll = fn;
};

// Jest mock utilities
export const jest = {
  fn: (implementation) => {
    const mockFn = implementation || (() => {});
    mockFn.mock = {
      calls: [],
      results: [],
      instances: []
    };
    
    const wrappedFn = (...args) => {
      mockFn.mock.calls.push(args);
      try {
        const result = mockFn(...args);
        mockFn.mock.results.push({ type: 'return', value: result });
        return result;
      } catch (error) {
        mockFn.mock.results.push({ type: 'throw', value: error });
        throw error;
      }
    };
    
    Object.assign(wrappedFn, mockFn);
    wrappedFn.mockReturnValue = (value) => {
      mockFn.mock.returnValue = value;
      return wrappedFn;
    };
    wrappedFn.mockResolvedValue = (value) => {
      mockFn.mock.resolvedValue = Promise.resolve(value);
      return wrappedFn;
    };
    wrappedFn.mockRejectedValue = (error) => {
      mockFn.mock.rejectedValue = Promise.reject(error);
      return wrappedFn;
    };
    wrappedFn.mockImplementation = (impl) => {
      Object.assign(mockFn, impl);
      return wrappedFn;
    };
    
    return wrappedFn;
  },
  
  clearAllMocks: () => {
    // Clear all mock data
  },
  
  spyOn: (object, method) => {
    const original = object[method];
    const spy = jest.fn(original);
    object[method] = spy;
    return spy;
  }
};

// DOM testing utilities
export const render = (component) => {
  const container = document.createElement('div');
  container.innerHTML = component;
  document.body.appendChild(container);
  
  return {
    container,
    getByTestId: (id) => container.querySelector(`[data-test="${id}"]`),
    getByText: (text) => {
      const elements = Array.from(container.querySelectorAll('*'));
      return elements.find(el => el.textContent === text);
    },
    getByRole: (role) => container.querySelector(`[role="${role}"]`),
    queryByTestId: (id) => container.querySelector(`[data-test="${id}"]`) || null,
    unmount: () => document.body.removeChild(container)
  };
};

// Async utilities
export const waitFor = async (callback, options = {}) => {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = callback();
      if (result) return result;
    } catch (error) {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
};

export const waitForElementToBeRemoved = async (element, options = {}) => {
  await waitFor(() => !document.contains(element), options);
};

// User event simulation
export const fireEvent = {
  click: (element) => {
    const event = new MouseEvent('click', { bubbles: true });
    element.dispatchEvent(event);
  },
  
  change: (element, value) => {
    element.value = value;
    const event = new Event('change', { bubbles: true });
    element.dispatchEvent(event);
  },
  
  keyDown: (element, key) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true });
    element.dispatchEvent(event);
  },
  
  input: (element, value) => {
    element.value = value;
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  }
};

// Performance testing utilities
export class PerformanceProfiler {
  constructor() {
    this.profiles = new Map();
  }
  
  start(name) {
    this.profiles.set(name, {
      startTime: performance.now(),
      startMemory: performance.memory ? performance.memory.usedJSHeapSize : 0,
      marks: []
    });
    performance.mark(`${name}-start`);
  }
  
  mark(name, label) {
    const profile = this.profiles.get(name);
    if (profile) {
      const markName = `${name}-${label}`;
      performance.mark(markName);
      profile.marks.push({ label, time: performance.now() });
    }
  }
  
  stop(name) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const profile = this.profiles.get(name);
    if (!profile) return null;
    
    const endTime = performance.now();
    const duration = endTime - profile.startTime;
    const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    const measure = performance.getEntriesByName(name)[0];
    
    return {
      name,
      duration,
      startTime: profile.startTime,
      endTime,
      memoryDelta: endMemory - profile.startMemory,
      marks: profile.marks,
      measure,
      fps: this.calculateFPS(profile.startTime, endTime),
      cpuUsage: this.estimateCPUUsage(duration)
    };
  }
  
  calculateFPS(startTime, endTime) {
    const frames = performance.getEntriesByType('paint').filter(
      entry => entry.startTime >= startTime && entry.startTime <= endTime
    );
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    return frames.length / duration;
  }
  
  estimateCPUUsage(duration) {
    // Rough estimation based on execution time
    return Math.min(100, (duration / 16.67) * 100); // 16.67ms = 60fps frame time
  }
}

// Memory monitoring
export class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.interval = null;
    this.threshold = 0.9; // 90% of available heap
  }
  
  start(intervalMs = 100) {
    if (!performance.memory) {
      console.warn('Memory monitoring not available in this environment');
      return;
    }
    
    this.startTime = Date.now();
    this.initialMemory = { ...performance.memory };
    
    this.interval = setInterval(() => {
      this.measurements.push({
        timestamp: Date.now() - this.startTime,
        ...performance.memory
      });
    }, intervalMs);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    if (!this.measurements.length) return null;
    
    const peakHeap = Math.max(...this.measurements.map(m => m.usedJSHeapSize));
    const avgHeap = this.measurements.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / this.measurements.length;
    
    return {
      measurements: this.measurements,
      initialMemory: this.initialMemory,
      heapUsed: performance.memory.usedJSHeapSize,
      heapPeak: peakHeap,
      heapAverage: avgHeap,
      duration: Date.now() - this.startTime
    };
  }
  
  setThreshold(ratio) {
    this.threshold = ratio;
  }
  
  shouldPause() {
    if (!performance.memory) return false;
    const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
    return usage > this.threshold;
  }
  
  onAlert(callback) {
    // Would implement alert mechanism
    this.alertCallback = callback;
  }
}

// Test data generator
export class TestDataGenerator {
  generateFiles(count, options = {}) {
    const {
      sizeRange = [100, 10000],
      types = ['md', 'txt', 'js', 'json'],
      contentType = 'mixed'
    } = options;
    
    return Array(count).fill(null).map((_, i) => ({
      id: `file-${i}`,
      name: `test-file-${i}.${types[i % types.length]}`,
      path: `/test/path/file-${i}`,
      size: this.randomBetween(...sizeRange),
      content: this.generateContent(contentType, sizeRange),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      modifiedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }));
  }
  
  generateContent(type, sizeRange) {
    const size = this.randomBetween(...sizeRange);
    
    switch (type) {
      case 'technical':
        return this.generateTechnicalContent(size);
      case 'markdown':
        return this.generateMarkdownContent(size);
      case 'code':
        return this.generateCodeContent(size);
      default:
        return this.generateMixedContent(size);
    }
  }
  
  generateTechnicalContent(size) {
    const words = ['algorithm', 'performance', 'optimization', 'architecture', 
                   'implementation', 'testing', 'debugging', 'scalability'];
    return this.generateFromWords(words, size);
  }
  
  generateMarkdownContent(size) {
    const sections = [];
    let currentSize = 0;
    
    while (currentSize < size) {
      sections.push(`## Section ${sections.length + 1}\n\n`);
      sections.push(this.generateParagraph() + '\n\n');
      currentSize = sections.join('').length;
    }
    
    return sections.join('').substring(0, size);
  }
  
  generateCodeContent(size) {
    const code = `
function exampleFunction(param) {
  const result = processData(param);
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}
`;
    return code.repeat(Math.ceil(size / code.length)).substring(0, size);
  }
  
  generateMixedContent(size) {
    const types = ['technical', 'markdown', 'code'];
    const type = types[Math.floor(Math.random() * types.length)];
    return this.generateContent(type, [size, size]);
  }
  
  generateFromWords(words, size) {
    let content = '';
    while (content.length < size) {
      const word = words[Math.floor(Math.random() * words.length)];
      content += word + ' ';
    }
    return content.substring(0, size);
  }
  
  generateParagraph() {
    const sentences = this.randomBetween(3, 6);
    const paragraph = [];
    
    for (let i = 0; i < sentences; i++) {
      const words = this.randomBetween(10, 20);
      const sentence = Array(words).fill(null)
        .map(() => 'word' + Math.random().toString(36).substring(7))
        .join(' ');
      paragraph.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.');
    }
    
    return paragraph.join(' ');
  }
  
  generateFileStructure(count) {
    // Generate hierarchical file structure
    const structure = {
      name: 'root',
      type: 'directory',
      children: []
    };
    
    const remaining = count;
    this.populateDirectory(structure, remaining, 3);
    
    return structure;
  }
  
  populateDirectory(dir, remaining, maxDepth) {
    if (remaining <= 0 || maxDepth <= 0) return 0;
    
    const subdirs = Math.min(3, Math.floor(remaining / 10));
    const files = Math.min(remaining, this.randomBetween(5, 15));
    
    let used = 0;
    
    // Add files
    for (let i = 0; i < files && used < remaining; i++) {
      dir.children.push({
        name: `file-${Date.now()}-${i}.md`,
        type: 'file',
        size: this.randomBetween(1000, 50000)
      });
      used++;
    }
    
    // Add subdirectories
    for (let i = 0; i < subdirs && used < remaining; i++) {
      const subdir = {
        name: `folder-${i}`,
        type: 'directory',
        children: []
      };
      dir.children.push(subdir);
      used += this.populateDirectory(subdir, remaining - used, maxDepth - 1);
    }
    
    return used;
  }
  
  generateDeepFileTree(depth, filesPerLevel) {
    const root = {
      name: 'root',
      type: 'directory',
      children: [],
      files: []
    };
    
    this.addLevel(root, depth, filesPerLevel);
    return root;
  }
  
  addLevel(node, remainingDepth, filesPerLevel) {
    // Add files at this level
    for (let i = 0; i < filesPerLevel; i++) {
      node.files.push({
        name: `file-${remainingDepth}-${i}.md`,
        type: 'file',
        size: this.randomBetween(1000, 10000)
      });
    }
    
    // Add subdirectory if more depth needed
    if (remainingDepth > 0) {
      const child = {
        name: `level-${remainingDepth}`,
        type: 'directory',
        children: [],
        files: []
      };
      node.children.push(child);
      this.addLevel(child, remainingDepth - 1, filesPerLevel);
    }
  }
  
  generateDocuments(count, options = {}) {
    const {
      avgLength = 1000,
      keywords = ['test', 'document', 'search']
    } = options;
    
    return Array(count).fill(null).map((_, i) => ({
      id: `doc-${i}`,
      title: `Document ${i}`,
      content: this.generateSearchableContent(avgLength, keywords),
      metadata: {
        created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        author: `Author ${i % 10}`,
        tags: this.generateTags()
      }
    }));
  }
  
  generateSearchableContent(length, keywords) {
    let content = '';
    const words = [...keywords, ...this.generateRandomWords(20)];
    
    while (content.length < length) {
      const useKeyword = Math.random() < 0.3;
      const word = useKeyword 
        ? keywords[Math.floor(Math.random() * keywords.length)]
        : words[Math.floor(Math.random() * words.length)];
      content += word + ' ';
    }
    
    return content.substring(0, length);
  }
  
  generateRandomWords(count) {
    return Array(count).fill(null).map(() => 
      Math.random().toString(36).substring(2, 8)
    );
  }
  
  generateTags() {
    const allTags = ['javascript', 'performance', 'testing', 'documentation', 
                     'tutorial', 'guide', 'reference', 'api'];
    const tagCount = this.randomBetween(1, 4);
    const tags = [];
    
    for (let i = 0; i < tagCount; i++) {
      const tag = allTags[Math.floor(Math.random() * allTags.length)];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Browser/E2E testing utilities
export class Browser {
  static async launch(options = {}) {
    // Mock browser implementation
    return {
      newPage: async () => new Page(),
      close: async () => {}
    };
  }
}

export class Page {
  constructor() {
    this.url = '';
    this.elements = new Map();
  }
  
  async goto(url) {
    this.url = url;
  }
  
  async waitForSelector(selector, options = {}) {
    // Mock implementation
    return document.querySelector(selector);
  }
  
  async click(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
    }
  }
  
  async type(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
      element.value = text;
      element.dispatchEvent(new Event('input'));
    }
  }
  
  async evaluate(fn, ...args) {
    return fn(...args);
  }
  
  async screenshot(options = {}) {
    console.log('Screenshot taken:', options.path);
  }
  
  async close() {
    // Cleanup
  }
  
  isClosed() {
    return false;
  }
}

// Metrics collector
export class MetricsCollector {
  constructor() {
    this.metrics = {};
  }
  
  record(name, data) {
    this.metrics[name] = {
      ...data,
      timestamp: new Date().toISOString()
    };
  }
  
  generateReport() {
    return {
      summary: this.generateSummary(),
      details: this.metrics,
      timestamp: new Date().toISOString()
    };
  }
  
  generateSummary() {
    const summary = {};
    
    Object.entries(this.metrics).forEach(([name, data]) => {
      summary[name] = {
        success: !data.error,
        duration: data.duration,
        key_metrics: this.extractKeyMetrics(data)
      };
    });
    
    return summary;
  }
  
  extractKeyMetrics(data) {
    const keys = ['throughput', 'latency', 'memoryUsed', 'errorRate'];
    const metrics = {};
    
    keys.forEach(key => {
      if (data[key] !== undefined) {
        metrics[key] = data[key];
      }
    });
    
    return metrics;
  }
  
  saveToFile(filename) {
    const report = this.generateReport();
    // In real implementation, would save to file system
    console.log(`Saving metrics to ${filename}:`, report);
  }
  
  reset() {
    this.metrics = {};
  }
}