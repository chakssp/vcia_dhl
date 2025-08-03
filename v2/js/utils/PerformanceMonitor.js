/**
 * PerformanceMonitor.js
 * 
 * Real-time performance monitoring for Knowledge Consolidator V2
 * Tracks FPS, network timing, render performance, and custom metrics
 * 
 * Features:
 * - Real-time FPS monitoring
 * - Network request timing
 * - First paint & contentful paint
 * - User interaction timing
 * - Custom performance marks
 */

export class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      fpsInterval: config.fpsInterval || 1000, // 1 second
      sampleSize: config.sampleSize || 60, // Keep 60 samples
      slowFrameThreshold: config.slowFrameThreshold || 50, // 50ms = 20fps
      slowNetworkThreshold: config.slowNetworkThreshold || 3000, // 3 seconds
      enableFPS: config.enableFPS !== false,
      enableNetwork: config.enableNetwork !== false,
      enableUserTiming: config.enableUserTiming !== false,
      enableObserver: config.enableObserver !== false,
      reportInterval: config.reportInterval || 10000, // 10 seconds
      ...config
    };

    // Performance data
    this.metrics = {
      fps: [],
      frameTimes: [],
      networkRequests: new Map(),
      userTimings: new Map(),
      paintTimings: {},
      interactions: new Map(),
      longTasks: []
    };

    // FPS tracking
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsInterval = null;
    this.rafId = null;

    // Performance observers
    this.observers = new Map();
    
    // Monitoring state
    this.isMonitoring = false;
    this.reportInterval = null;
    
    // Performance marks
    this.marks = new Map();
    this.measures = new Map();
    
    // Thresholds for alerts
    this.performanceAlerts = new Set();
    
    this.init();
  }

  /**
   * Initialize performance monitor
   */
  init() {
    // Check for Performance API support
    if (!('performance' in window)) {
      console.warn('Performance API not supported');
      return;
    }

    // Setup performance observers
    if (this.config.enableObserver && 'PerformanceObserver' in window) {
      this.setupObservers();
    }

    // Capture initial paint timings
    this.capturePaintTimings();
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Start FPS monitoring
    if (this.config.enableFPS) {
      this.startFPSMonitoring();
    }

    // Start network monitoring
    if (this.config.enableNetwork) {
      this.startNetworkMonitoring();
    }

    // Start report interval
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);

    console.log('📊 Performance monitor started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Stop FPS monitoring
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }

    // Stop report interval
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    
    console.log('📊 Performance monitor stopped');
  }

  /**
   * Setup performance observers
   */
  setupObservers() {
    // Long Task Observer
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleLongTask(entry);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (e) {
      // Not all browsers support longtask
    }

    // Resource Timing Observer
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleResourceTiming(entry);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (e) {
      console.warn('Resource timing not supported');
    }

    // User Timing Observer
    if (this.config.enableUserTiming) {
      try {
        const userTimingObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleUserTiming(entry);
          }
        });
        userTimingObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('measure', userTimingObserver);
      } catch (e) {
        console.warn('User timing not supported');
      }
    }

    // Layout Shift Observer
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleLayoutShift(entry);
        }
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', layoutShiftObserver);
    } catch (e) {
      // Not all browsers support layout-shift
    }

    // First Input Delay
    try {
      const firstInputObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleFirstInput(entry);
        }
      });
      firstInputObserver.observe({ 
        type: 'first-input', 
        buffered: true 
      });
      this.observers.set('first-input', firstInputObserver);
    } catch (e) {
      // Not all browsers support first-input
    }
  }

  /**
   * Start FPS monitoring
   */
  startFPSMonitoring() {
    let frames = 0;
    let prevTime = performance.now();
    
    const measureFPS = () => {
      const currentTime = performance.now();
      const delta = currentTime - prevTime;
      
      // Track frame time
      if (delta > 0) {
        this.metrics.frameTimes.push(delta);
        if (this.metrics.frameTimes.length > this.config.sampleSize) {
          this.metrics.frameTimes.shift();
        }
        
        // Check for slow frames
        if (delta > this.config.slowFrameThreshold) {
          this.handleSlowFrame(delta);
        }
      }
      
      frames++;
      
      // Calculate FPS every second
      if (currentTime - this.lastFrameTime >= 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - this.lastFrameTime));
        this.metrics.fps.push({
          timestamp: currentTime,
          fps,
          avgFrameTime: delta
        });
        
        if (this.metrics.fps.length > this.config.sampleSize) {
          this.metrics.fps.shift();
        }
        
        frames = 0;
        this.lastFrameTime = currentTime;
        
        // Check for poor FPS
        if (fps < 30) {
          this.handlePoorFPS(fps);
        }
      }
      
      prevTime = currentTime;
      this.rafId = requestAnimationFrame(measureFPS);
    };
    
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(measureFPS);
  }

  /**
   * Start network monitoring
   */
  startNetworkMonitoring() {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const requestId = this.generateRequestId();
      
      this.metrics.networkRequests.set(requestId, {
        url: args[0],
        startTime,
        method: args[1]?.method || 'GET'
      });
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.updateNetworkRequest(requestId, {
          endTime,
          duration,
          status: response.status,
          ok: response.ok,
          size: response.headers.get('content-length') || 0
        });
        
        // Check for slow requests
        if (duration > this.config.slowNetworkThreshold) {
          this.handleSlowNetwork(requestId, duration);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.updateNetworkRequest(requestId, {
          endTime,
          duration: endTime - startTime,
          error: error.message
        });
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    const xhrProto = originalXHR.prototype;
    const originalOpen = xhrProto.open;
    const originalSend = xhrProto.send;
    
    xhrProto.open = function(method, url, ...args) {
      this._requestId = this.generateRequestId();
      this._method = method;
      this._url = url;
      return originalOpen.apply(this, [method, url, ...args]);
    };
    
    xhrProto.send = function(...args) {
      const startTime = performance.now();
      
      this.metrics.networkRequests.set(this._requestId, {
        url: this._url,
        method: this._method,
        startTime
      });
      
      this.addEventListener('loadend', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.updateNetworkRequest(this._requestId, {
          endTime,
          duration,
          status: this.status,
          ok: this.status >= 200 && this.status < 300
        });
        
        if (duration > this.config.slowNetworkThreshold) {
          this.handleSlowNetwork(this._requestId, duration);
        }
      });
      
      return originalSend.apply(this, args);
    };
  }

  /**
   * Capture paint timings
   */
  capturePaintTimings() {
    if (!performance.getEntriesByType) return;
    
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      this.metrics.paintTimings[entry.name] = entry.startTime;
    });
    
    // Also check navigation timing
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      this.metrics.paintTimings.domContentLoaded = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart;
      this.metrics.paintTimings.loadComplete = nav.loadEventEnd - nav.loadEventStart;
    }
  }

  /**
   * Mark performance point
   */
  mark(name, detail = {}) {
    if (!this.config.enableUserTiming) return;
    
    try {
      performance.mark(name, { detail });
      this.marks.set(name, {
        timestamp: performance.now(),
        detail
      });
    } catch (e) {
      // Fallback for browsers that don't support detail
      performance.mark(name);
      this.marks.set(name, {
        timestamp: performance.now(),
        detail
      });
    }
  }

  /**
   * Measure between marks
   */
  measure(name, startMark, endMark) {
    if (!this.config.enableUserTiming) return;
    
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        const measure = entries[entries.length - 1];
        this.measures.set(name, {
          duration: measure.duration,
          startTime: measure.startTime
        });
        return measure.duration;
      }
    } catch (e) {
      console.warn(`Failed to measure ${name}:`, e);
    }
    return null;
  }

  /**
   * Track user interaction
   */
  trackInteraction(name, handler) {
    const wrappedHandler = async (...args) => {
      const startTime = performance.now();
      this.mark(`${name}-start`);
      
      try {
        const result = await handler(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.mark(`${name}-end`);
        this.measure(`${name}-duration`, `${name}-start`, `${name}-end`);
        
        this.metrics.interactions.set(name, {
          lastDuration: duration,
          count: (this.metrics.interactions.get(name)?.count || 0) + 1,
          totalDuration: (this.metrics.interactions.get(name)?.totalDuration || 0) + duration
        });
        
        return result;
      } catch (error) {
        this.mark(`${name}-error`);
        throw error;
      }
    };
    
    return wrappedHandler;
  }

  /**
   * Handle long task
   */
  handleLongTask(entry) {
    this.metrics.longTasks.push({
      duration: entry.duration,
      startTime: entry.startTime,
      name: entry.name,
      attribution: entry.attribution
    });
    
    // Keep only recent long tasks
    if (this.metrics.longTasks.length > 50) {
      this.metrics.longTasks.shift();
    }
    
    // Alert if too many long tasks
    const recentLongTasks = this.metrics.longTasks.filter(
      task => performance.now() - task.startTime < 10000 // Last 10 seconds
    );
    
    if (recentLongTasks.length > 5) {
      this.triggerAlert('performance', {
        type: 'long-tasks',
        count: recentLongTasks.length,
        message: 'Multiple long tasks detected affecting performance'
      });
    }
  }

  /**
   * Handle resource timing
   */
  handleResourceTiming(entry) {
    // Track slow resources
    if (entry.duration > this.config.slowNetworkThreshold) {
      console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
    }
  }

  /**
   * Handle user timing
   */
  handleUserTiming(entry) {
    if (entry.entryType === 'measure') {
      this.metrics.userTimings.set(entry.name, {
        duration: entry.duration,
        startTime: entry.startTime
      });
    }
  }

  /**
   * Handle layout shift
   */
  handleLayoutShift(entry) {
    if (!entry.hadRecentInput && entry.value > 0.1) {
      console.warn('Layout shift detected:', entry.value);
      this.triggerAlert('performance', {
        type: 'layout-shift',
        value: entry.value,
        message: 'Significant layout shift detected'
      });
    }
  }

  /**
   * Handle first input delay
   */
  handleFirstInput(entry) {
    this.metrics.paintTimings.firstInputDelay = entry.processingStart - entry.startTime;
    
    if (this.metrics.paintTimings.firstInputDelay > 100) {
      console.warn(`High first input delay: ${this.metrics.paintTimings.firstInputDelay}ms`);
    }
  }

  /**
   * Handle slow frame
   */
  handleSlowFrame(frameTime) {
    console.warn(`Slow frame detected: ${frameTime.toFixed(2)}ms`);
  }

  /**
   * Handle poor FPS
   */
  handlePoorFPS(fps) {
    this.triggerAlert('performance', {
      type: 'low-fps',
      fps,
      message: `Low FPS detected: ${fps} fps`
    });
  }

  /**
   * Handle slow network request
   */
  handleSlowNetwork(requestId, duration) {
    const request = this.metrics.networkRequests.get(requestId);
    console.warn(`Slow network request: ${request.url} took ${duration.toFixed(2)}ms`);
    
    this.triggerAlert('network', {
      type: 'slow-request',
      url: request.url,
      duration,
      message: `Slow network request detected`
    });
  }

  /**
   * Update network request
   */
  updateNetworkRequest(requestId, updates) {
    const request = this.metrics.networkRequests.get(requestId);
    if (request) {
      Object.assign(request, updates);
    }
  }

  /**
   * Get current FPS
   */
  getCurrentFPS() {
    if (this.metrics.fps.length === 0) return 0;
    return this.metrics.fps[this.metrics.fps.length - 1].fps;
  }

  /**
   * Get average FPS
   */
  getAverageFPS() {
    if (this.metrics.fps.length === 0) return 0;
    const sum = this.metrics.fps.reduce((acc, sample) => acc + sample.fps, 0);
    return Math.round(sum / this.metrics.fps.length);
  }

  /**
   * Get performance score
   */
  getPerformanceScore() {
    const scores = {
      fps: this.getFPSScore(),
      network: this.getNetworkScore(),
      paint: this.getPaintScore(),
      interaction: this.getInteractionScore()
    };
    
    const weights = {
      fps: 0.3,
      network: 0.2,
      paint: 0.3,
      interaction: 0.2
    };
    
    const totalScore = Object.entries(scores).reduce(
      (total, [key, score]) => total + (score * weights[key]),
      0
    );
    
    return {
      total: Math.round(totalScore),
      breakdown: scores
    };
  }

  /**
   * Calculate FPS score
   */
  getFPSScore() {
    const avgFPS = this.getAverageFPS();
    if (avgFPS >= 60) return 100;
    if (avgFPS >= 30) return 70 + ((avgFPS - 30) / 30) * 30;
    return (avgFPS / 30) * 70;
  }

  /**
   * Calculate network score
   */
  getNetworkScore() {
    const requests = Array.from(this.metrics.networkRequests.values());
    if (requests.length === 0) return 100;
    
    const avgDuration = requests.reduce((sum, req) => sum + (req.duration || 0), 0) / requests.length;
    if (avgDuration <= 500) return 100;
    if (avgDuration <= 1000) return 90;
    if (avgDuration <= 2000) return 70;
    if (avgDuration <= 3000) return 50;
    return 30;
  }

  /**
   * Calculate paint score
   */
  getPaintScore() {
    const fcp = this.metrics.paintTimings['first-contentful-paint'];
    if (!fcp) return 50;
    
    if (fcp <= 1000) return 100;
    if (fcp <= 2000) return 80;
    if (fcp <= 3000) return 60;
    if (fcp <= 4000) return 40;
    return 20;
  }

  /**
   * Calculate interaction score
   */
  getInteractionScore() {
    const interactions = Array.from(this.metrics.interactions.values());
    if (interactions.length === 0) return 100;
    
    const avgDuration = interactions.reduce(
      (sum, int) => sum + (int.totalDuration / int.count),
      0
    ) / interactions.length;
    
    if (avgDuration <= 50) return 100;
    if (avgDuration <= 100) return 80;
    if (avgDuration <= 200) return 60;
    if (avgDuration <= 300) return 40;
    return 20;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: performance.now(),
      score: this.getPerformanceScore(),
      fps: {
        current: this.getCurrentFPS(),
        average: this.getAverageFPS(),
        samples: this.metrics.fps.length
      },
      network: {
        totalRequests: this.metrics.networkRequests.size,
        slowRequests: Array.from(this.metrics.networkRequests.values())
          .filter(req => req.duration > this.config.slowNetworkThreshold).length
      },
      paint: this.metrics.paintTimings,
      interactions: Object.fromEntries(
        Array.from(this.metrics.interactions.entries()).map(([name, data]) => [
          name,
          {
            count: data.count,
            avgDuration: data.totalDuration / data.count
          }
        ])
      ),
      longTasks: this.metrics.longTasks.length,
      alerts: Array.from(this.performanceAlerts)
    };
    
    // Clear old alerts
    this.performanceAlerts.clear();
    
    return report;
  }

  /**
   * Get detailed metrics
   */
  getMetrics() {
    return {
      fps: this.metrics.fps,
      frameTimes: this.metrics.frameTimes,
      networkRequests: Array.from(this.metrics.networkRequests.values()),
      userTimings: Object.fromEntries(this.metrics.userTimings),
      paintTimings: this.metrics.paintTimings,
      interactions: Object.fromEntries(this.metrics.interactions),
      longTasks: this.metrics.longTasks
    };
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(category, details) {
    this.performanceAlerts.add({
      category,
      timestamp: performance.now(),
      ...details
    });
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics.fps = [];
    this.metrics.frameTimes = [];
    this.metrics.networkRequests.clear();
    this.metrics.userTimings.clear();
    this.metrics.interactions.clear();
    this.metrics.longTasks = [];
    this.marks.clear();
    this.measures.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Destroy monitor
   */
  destroy() {
    this.stop();
    this.clearMetrics();
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.performanceAlerts.clear();
  }
}

// Export singleton instance
export default new PerformanceMonitor();