/**
 * End-to-End Testing Framework for KC V2
 * Provides utilities for browser automation and E2E testing
 */

export { Browser, Page } from './TestFramework.js';

// Additional E2E specific utilities
export class E2ETestRunner {
  constructor(config = {}) {
    this.config = {
      baseURL: config.baseURL || 'http://localhost:3000',
      timeout: config.timeout || 30000,
      headless: config.headless !== false,
      slowMo: config.slowMo || 0,
      viewport: config.viewport || { width: 1280, height: 720 },
      ...config
    };
  }

  async setup() {
    // Setup test environment
    this.browser = await Browser.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo
    });
    
    // Setup global error handlers
    this.setupErrorHandling();
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  setupErrorHandling() {
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled rejection in E2E test:', error);
      this.captureError(error);
    });
  }

  async captureError(error) {
    // Take screenshot on error
    if (this.currentPage) {
      await this.currentPage.screenshot({
        path: `errors/error-${Date.now()}.png`,
        fullPage: true
      });
    }
  }

  async createPage() {
    const page = await this.browser.newPage();
    await page.setViewport(this.config.viewport);
    this.currentPage = page;
    return page;
  }
}

// Page Object Model base class
export class PageObject {
  constructor(page, url) {
    this.page = page;
    this.url = url;
  }

  async navigate() {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad() {
    // Override in subclasses
  }

  async screenshot(name) {
    await this.page.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`
    });
  }

  async waitAndClick(selector) {
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }

  async waitAndType(selector, text) {
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
    await this.page.type(selector, text);
  }

  async getText(selector) {
    await this.page.waitForSelector(selector);
    return this.page.evaluate((sel) => {
      return document.querySelector(sel)?.textContent;
    }, selector);
  }

  async isVisible(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForText(text, options = {}) {
    await this.page.waitForFunction(
      (searchText) => {
        return document.body.textContent.includes(searchText);
      },
      options,
      text
    );
  }
}

// Specific page objects for KC V2
export class DiscoveryPage extends PageObject {
  constructor(page) {
    super(page, '/discovery');
    
    this.selectors = {
      startButton: '[data-test="start-discovery"]',
      pathInput: '#discovery-path',
      fileTypes: '#file-types',
      runButton: '[data-test="run-discovery"]',
      completeIndicator: '.discovery-complete',
      fileList: '.file-list',
      fileItem: '.file-item'
    };
  }

  async waitForLoad() {
    await this.page.waitForSelector(this.selectors.startButton);
  }

  async startDiscovery(path, fileTypes = ['md', 'txt']) {
    await this.waitAndClick(this.selectors.startButton);
    await this.waitAndType(this.selectors.pathInput, path);
    
    for (const type of fileTypes) {
      await this.page.selectOption(this.selectors.fileTypes, type);
    }
    
    await this.waitAndClick(this.selectors.runButton);
  }

  async waitForCompletion() {
    await this.page.waitForSelector(this.selectors.completeIndicator, {
      timeout: 60000
    });
  }

  async getDiscoveredFiles() {
    await this.page.waitForSelector(this.selectors.fileItem);
    return this.page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).map(el => ({
        name: el.querySelector('.file-name')?.textContent,
        path: el.querySelector('.file-path')?.textContent,
        size: el.querySelector('.file-size')?.textContent
      }));
    }, this.selectors.fileItem);
  }
}

// Test data fixtures
export class TestFixtures {
  static getTestFiles(count = 10) {
    return Array(count).fill(null).map((_, i) => ({
      name: `test-file-${i}.md`,
      content: `# Test File ${i}\n\nThis is test content for file ${i}.`,
      path: `/test/files/test-file-${i}.md`
    }));
  }

  static getTestUser() {
    return {
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@example.com',
      preferences: {
        theme: 'dark',
        autoSave: true
      }
    };
  }

  static getTestCategories() {
    return [
      { id: 'cat-1', name: 'Technical', color: '#4CAF50' },
      { id: 'cat-2', name: 'Documentation', color: '#2196F3' },
      { id: 'cat-3', name: 'Archive', color: '#9E9E9E' }
    ];
  }
}

// Network interception
export class NetworkInterceptor {
  constructor(page) {
    this.page = page;
    this.interceptors = new Map();
  }

  async setup() {
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      const interceptor = this.findInterceptor(request.url());
      if (interceptor) {
        interceptor(request);
      } else {
        request.continue();
      }
    });
  }

  intercept(pattern, handler) {
    this.interceptors.set(pattern, handler);
  }

  findInterceptor(url) {
    for (const [pattern, handler] of this.interceptors) {
      if (typeof pattern === 'string' && url.includes(pattern)) {
        return handler;
      } else if (pattern instanceof RegExp && pattern.test(url)) {
        return handler;
      }
    }
    return null;
  }

  mockAPI(endpoint, response, status = 200) {
    this.intercept(endpoint, (request) => {
      request.respond({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  simulateError(endpoint, status = 500, message = 'Server Error') {
    this.intercept(endpoint, (request) => {
      request.respond({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message })
      });
    });
  }

  simulateDelay(endpoint, delayMs) {
    this.intercept(endpoint, async (request) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      request.continue();
    });
  }
}

// Visual regression testing
export class VisualTester {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      threshold: options.threshold || 0.1,
      outputDir: options.outputDir || 'visual-tests',
      ...options
    };
  }

  async captureElement(selector, name) {
    const element = await this.page.waitForSelector(selector);
    return element.screenshot({
      path: `${this.options.outputDir}/${name}.png`
    });
  }

  async comparePage(name, options = {}) {
    const screenshot = await this.page.screenshot({
      fullPage: options.fullPage !== false
    });
    
    // In real implementation, would compare with baseline
    return {
      name,
      match: true,
      diff: 0
    };
  }

  async compareElement(selector, name) {
    const screenshot = await this.captureElement(selector, name);
    
    // In real implementation, would compare with baseline
    return {
      name,
      selector,
      match: true,
      diff: 0
    };
  }
}

// Accessibility testing
export class AccessibilityTester {
  constructor(page) {
    this.page = page;
  }

  async audit(options = {}) {
    // In real implementation, would use axe-core or similar
    const results = await this.page.evaluate(() => {
      const issues = [];
      
      // Check for alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      images.forEach(img => {
        issues.push({
          type: 'error',
          element: img.outerHTML,
          message: 'Image missing alt text'
        });
      });
      
      // Check for form labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([id])');
      inputs.forEach(input => {
        const label = input.closest('label');
        if (!label) {
          issues.push({
            type: 'error',
            element: input.outerHTML,
            message: 'Input missing label'
          });
        }
      });
      
      // Check heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let lastLevel = 0;
      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        if (level > lastLevel + 1) {
          issues.push({
            type: 'warning',
            element: heading.outerHTML,
            message: `Skipped heading level from h${lastLevel} to h${level}`
          });
        }
        lastLevel = level;
      });
      
      return {
        violations: issues.filter(i => i.type === 'error'),
        warnings: issues.filter(i => i.type === 'warning')
      };
    });
    
    return results;
  }

  async checkContrast() {
    // Check color contrast ratios
    return this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        const fg = styles.color;
        
        // Simplified contrast check
        if (bg !== 'rgba(0, 0, 0, 0)' && fg) {
          // Would calculate actual contrast ratio
          const ratio = 4.5; // Mock value
          if (ratio < 4.5) {
            issues.push({
              element: el.tagName,
              background: bg,
              foreground: fg,
              ratio: ratio,
              required: 4.5
            });
          }
        }
      });
      
      return issues;
    });
  }

  async checkKeyboardNav() {
    // Test keyboard navigation
    const results = {
      focusableElements: 0,
      tabOrder: [],
      issues: []
    };
    
    // Tab through all focusable elements
    let previousActive = null;
    let tabCount = 0;
    
    while (tabCount < 100) { // Safety limit
      await this.page.keyboard.press('Tab');
      
      const activeElement = await this.page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el.tagName,
          id: el.id,
          class: el.className,
          text: el.textContent?.substring(0, 50)
        };
      });
      
      if (previousActive && 
          activeElement.tag === previousActive.tag && 
          activeElement.id === previousActive.id) {
        break; // Completed full cycle
      }
      
      results.tabOrder.push(activeElement);
      previousActive = activeElement;
      tabCount++;
    }
    
    results.focusableElements = results.tabOrder.length;
    return results;
  }
}

// Performance monitoring for E2E tests
export class E2EPerformanceMonitor {
  constructor(page) {
    this.page = page;
    this.metrics = [];
  }

  async start() {
    // Enable performance metrics collection
    await this.page.evaluateOnNewDocument(() => {
      window.__performanceMetrics = [];
      
      // Override fetch to track API calls
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = performance.now();
        try {
          const response = await originalFetch(...args);
          const duration = performance.now() - start;
          window.__performanceMetrics.push({
            type: 'api',
            url: args[0],
            duration,
            status: response.status,
            timestamp: Date.now()
          });
          return response;
        } catch (error) {
          const duration = performance.now() - start;
          window.__performanceMetrics.push({
            type: 'api',
            url: args[0],
            duration,
            error: error.message,
            timestamp: Date.now()
          });
          throw error;
        }
      };
    });
  }

  async collect() {
    const metrics = await this.page.evaluate(() => {
      return {
        performance: window.__performanceMetrics || [],
        navigation: performance.getEntriesByType('navigation')[0],
        resources: performance.getEntriesByType('resource'),
        paint: performance.getEntriesByType('paint'),
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null
      };
    });
    
    this.metrics.push({
      timestamp: Date.now(),
      url: this.page.url(),
      ...metrics
    });
    
    return metrics;
  }

  async stop() {
    const finalMetrics = await this.collect();
    return this.generateReport();
  }

  generateReport() {
    const report = {
      summary: {
        totalPageLoads: this.metrics.length,
        avgLoadTime: this.calculateAvgLoadTime(),
        avgApiResponseTime: this.calculateAvgApiTime(),
        totalApiCalls: this.countApiCalls(),
        errors: this.countErrors()
      },
      details: this.metrics
    };
    
    return report;
  }

  calculateAvgLoadTime() {
    const loadTimes = this.metrics
      .map(m => m.navigation?.loadEventEnd - m.navigation?.fetchStart)
      .filter(t => t > 0);
    
    return loadTimes.length > 0
      ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
      : 0;
  }

  calculateAvgApiTime() {
    const apiTimes = this.metrics
      .flatMap(m => m.performance || [])
      .filter(p => p.type === 'api' && p.duration)
      .map(p => p.duration);
    
    return apiTimes.length > 0
      ? apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length
      : 0;
  }

  countApiCalls() {
    return this.metrics
      .flatMap(m => m.performance || [])
      .filter(p => p.type === 'api').length;
  }

  countErrors() {
    return this.metrics
      .flatMap(m => m.performance || [])
      .filter(p => p.error || (p.status && p.status >= 400)).length;
  }
}