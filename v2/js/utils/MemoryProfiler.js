/**
 * MemoryProfiler.js
 * 
 * Memory usage tracking and leak detection for Knowledge Consolidator V2
 * Monitors heap usage, detects leaks, and provides cleanup strategies
 * 
 * Features:
 * - Real-time memory monitoring
 * - Leak detection algorithms
 * - Automatic garbage collection triggers
 * - Memory usage alerts
 * - Cleanup recommendations
 */

export class MemoryProfiler {
  constructor(config = {}) {
    this.config = {
      sampleInterval: config.sampleInterval || 5000, // 5 seconds
      historySize: config.historySize || 100,
      heapThreshold: config.heapThreshold || 0.9, // 90% of heap limit
      leakDetectionSamples: config.leakDetectionSamples || 10,
      gcThreshold: config.gcThreshold || 0.8, // 80% triggers GC suggestion
      alertThreshold: config.alertThreshold || 0.85, // 85% shows alert
      enableAutoCleanup: config.enableAutoCleanup !== false,
      ...config
    };

    // Memory tracking
    this.samples = [];
    this.retainedObjects = new WeakMap();
    this.objectRegistry = new Map();
    this.leakSuspects = new Map();
    
    // Component memory tracking
    this.componentMemory = new Map();
    this.domNodeCounts = new Map();
    
    // Monitoring state
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.lastGCTime = Date.now();
    
    // Performance observer
    this.performanceObserver = null;
    
    // Alert callbacks
    this.alertCallbacks = new Set();
  }

  /**
   * Start memory monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Check for memory API support
    if (!performance.memory) {
      console.warn('Performance.memory API not available. Some features will be limited.');
    }

    // Start sampling interval
    this.monitoringInterval = setInterval(() => {
      this.takeSample();
    }, this.config.sampleInterval);

    // Setup performance observer for GC events
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name.includes('gc')) {
              this.handleGCEvent(entry);
            }
          });
        });
        this.performanceObserver.observe({ entryTypes: ['measure'] });
      } catch (e) {
        // Some browsers don't support all entry types
      }
    }

    // Initial sample
    this.takeSample();
    
    console.log('🧠 Memory profiler started');
  }

  /**
   * Stop memory monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    console.log('🧠 Memory profiler stopped');
  }

  /**
   * Take a memory sample
   */
  takeSample() {
    const sample = {
      timestamp: Date.now(),
      memory: this.getMemoryInfo(),
      domNodes: this.countDOMNodes(),
      listeners: this.countEventListeners(),
      components: this.getComponentMemoryUsage()
    };

    this.samples.push(sample);
    
    // Maintain history size
    if (this.samples.length > this.config.historySize) {
      this.samples.shift();
    }

    // Analyze sample
    this.analyzeSample(sample);
    
    // Check for issues
    this.checkMemoryHealth(sample);
  }

  /**
   * Get memory information
   */
  getMemoryInfo() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
      };
    } else {
      // Fallback estimation based on object counts
      const estimation = this.estimateMemoryUsage();
      return {
        usedJSHeapSize: estimation.used,
        totalJSHeapSize: estimation.total,
        jsHeapSizeLimit: estimation.limit,
        usage: estimation.used / estimation.limit,
        estimated: true
      };
    }
  }

  /**
   * Estimate memory usage without performance.memory API
   */
  estimateMemoryUsage() {
    const objectCount = this.objectRegistry.size;
    const domNodes = this.countDOMNodes();
    const avgObjectSize = 1024; // 1KB average
    const avgDOMNodeSize = 512; // 0.5KB average
    
    const used = (objectCount * avgObjectSize) + (domNodes * avgDOMNodeSize);
    const limit = 2 * 1024 * 1024 * 1024; // 2GB typical limit
    
    return {
      used,
      total: used * 1.5,
      limit
    };
  }

  /**
   * Count DOM nodes
   */
  countDOMNodes() {
    return document.getElementsByTagName('*').length;
  }

  /**
   * Count event listeners (approximate)
   */
  countEventListeners() {
    let count = 0;
    const allElements = document.getElementsByTagName('*');
    
    // This is an approximation as we can't directly count listeners
    for (let element of allElements) {
      // Check for common event properties
      const eventProps = Object.keys(element).filter(key => key.startsWith('on'));
      count += eventProps.filter(prop => element[prop] !== null).length;
    }
    
    return count;
  }

  /**
   * Track object for memory monitoring
   */
  trackObject(object, name, component = 'global') {
    const id = this.generateObjectId();
    
    this.objectRegistry.set(id, {
      name,
      component,
      created: Date.now(),
      type: object.constructor.name,
      size: this.estimateObjectSize(object)
    });
    
    this.retainedObjects.set(object, id);
    
    // Update component memory
    const currentSize = this.componentMemory.get(component) || 0;
    this.componentMemory.set(component, currentSize + this.estimateObjectSize(object));
    
    return id;
  }

  /**
   * Untrack object
   */
  untrackObject(object) {
    const id = this.retainedObjects.get(object);
    if (!id) return;
    
    const info = this.objectRegistry.get(id);
    if (info) {
      // Update component memory
      const currentSize = this.componentMemory.get(info.component) || 0;
      this.componentMemory.set(info.component, Math.max(0, currentSize - info.size));
      
      this.objectRegistry.delete(id);
    }
    
    this.retainedObjects.delete(object);
  }

  /**
   * Estimate object size
   */
  estimateObjectSize(obj) {
    let size = 0;
    const seen = new WeakSet();
    
    const calculate = (object) => {
      if (object === null || object === undefined) return 0;
      if (seen.has(object)) return 0;
      
      seen.add(object);
      
      switch (typeof object) {
        case 'boolean':
          return 4;
        case 'number':
          return 8;
        case 'string':
          return object.length * 2;
        case 'object':
          if (Array.isArray(object)) {
            return object.reduce((sum, item) => sum + calculate(item), 24);
          } else if (object instanceof ArrayBuffer) {
            return object.byteLength;
          } else {
            let objSize = 24; // Base object size
            for (let key in object) {
              if (object.hasOwnProperty(key)) {
                objSize += calculate(key) + calculate(object[key]) + 16;
              }
            }
            return objSize;
          }
        default:
          return 0;
      }
    };
    
    size = calculate(obj);
    return size;
  }

  /**
   * Analyze memory sample for patterns
   */
  analyzeSample(sample) {
    if (this.samples.length < this.config.leakDetectionSamples) return;
    
    // Check for memory leaks
    this.detectMemoryLeaks();
    
    // Check for DOM node leaks
    this.detectDOMLeaks();
    
    // Check for detached nodes
    this.detectDetachedNodes();
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks() {
    if (this.samples.length < this.config.leakDetectionSamples) return;
    
    const recentSamples = this.samples.slice(-this.config.leakDetectionSamples);
    const memoryGrowth = this.calculateGrowthRate(
      recentSamples.map(s => s.memory.usedJSHeapSize)
    );
    
    // Consistent growth indicates potential leak
    if (memoryGrowth > 0.05) { // 5% growth per sample
      this.reportLeak('memory', {
        growthRate: memoryGrowth,
        samples: recentSamples.length,
        message: 'Consistent memory growth detected'
      });
    }
    
    // Check for objects that are never released
    const now = Date.now();
    this.objectRegistry.forEach((info, id) => {
      const age = now - info.created;
      if (age > 300000 && info.size > 10000) { // 5 minutes and > 10KB
        if (!this.leakSuspects.has(id)) {
          this.leakSuspects.set(id, {
            ...info,
            detectedAt: now
          });
        }
      }
    });
  }

  /**
   * Detect DOM node leaks
   */
  detectDOMLeaks() {
    const recentSamples = this.samples.slice(-this.config.leakDetectionSamples);
    const domGrowth = this.calculateGrowthRate(
      recentSamples.map(s => s.domNodes)
    );
    
    if (domGrowth > 0.1) { // 10% growth per sample
      this.reportLeak('dom', {
        growthRate: domGrowth,
        currentNodes: recentSamples[recentSamples.length - 1].domNodes,
        message: 'DOM nodes growing without cleanup'
      });
    }
  }

  /**
   * Detect detached DOM nodes
   */
  detectDetachedNodes() {
    // This is a heuristic approach
    const detachedCount = this.estimateDetachedNodes();
    
    if (detachedCount > 100) {
      this.reportLeak('detached', {
        count: detachedCount,
        message: 'Large number of detached DOM nodes detected'
      });
    }
  }

  /**
   * Estimate detached nodes (heuristic)
   */
  estimateDetachedNodes() {
    // Check for common patterns of detached nodes
    let detached = 0;
    
    // Check for event listeners on elements not in DOM
    this.objectRegistry.forEach((info) => {
      if (info.type === 'HTMLElement' || info.type.includes('Element')) {
        // This is a simplified check
        detached++;
      }
    });
    
    return detached;
  }

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    
    let totalGrowth = 0;
    for (let i = 1; i < values.length; i++) {
      const growth = (values[i] - values[i - 1]) / values[i - 1];
      totalGrowth += growth;
    }
    
    return totalGrowth / (values.length - 1);
  }

  /**
   * Check memory health and trigger alerts
   */
  checkMemoryHealth(sample) {
    const usage = sample.memory.usage;
    
    // Critical threshold
    if (usage > this.config.heapThreshold) {
      this.triggerAlert('critical', {
        usage,
        memory: sample.memory,
        message: 'Memory usage critical!'
      });
      
      if (this.config.enableAutoCleanup) {
        this.performEmergencyCleanup();
      }
    }
    // Alert threshold
    else if (usage > this.config.alertThreshold) {
      this.triggerAlert('warning', {
        usage,
        memory: sample.memory,
        message: 'High memory usage detected'
      });
    }
    // GC suggestion threshold
    else if (usage > this.config.gcThreshold) {
      const timeSinceGC = Date.now() - this.lastGCTime;
      if (timeSinceGC > 60000) { // 1 minute
        this.suggestGarbageCollection();
      }
    }
  }

  /**
   * Report potential memory leak
   */
  reportLeak(type, details) {
    console.warn(`🚨 Potential ${type} leak detected:`, details);
    
    this.triggerAlert('leak', {
      type,
      ...details,
      suggestions: this.getLeakFixSuggestions(type)
    });
  }

  /**
   * Get leak fix suggestions
   */
  getLeakFixSuggestions(type) {
    const suggestions = {
      memory: [
        'Review event listener cleanup in components',
        'Check for circular references',
        'Ensure proper cleanup in component unmount',
        'Review closure usage for unintended retentions'
      ],
      dom: [
        'Remove DOM nodes when no longer needed',
        'Clear innerHTML before removing parent nodes',
        'Use virtual scrolling for large lists',
        'Implement proper component cleanup'
      ],
      detached: [
        'Remove event listeners before removing DOM nodes',
        'Clear references to removed DOM elements',
        'Use WeakMap for DOM element associations',
        'Implement proper cleanup in routing'
      ]
    };
    
    return suggestions[type] || ['Review component lifecycle and cleanup'];
  }

  /**
   * Perform emergency cleanup
   */
  performEmergencyCleanup() {
    console.warn('🧹 Performing emergency memory cleanup...');
    
    const cleanupActions = [];
    
    // Clear old samples
    if (this.samples.length > 50) {
      const removed = this.samples.length - 50;
      this.samples = this.samples.slice(-50);
      cleanupActions.push(`Cleared ${removed} old memory samples`);
    }
    
    // Clear leak suspects older than 10 minutes
    const now = Date.now();
    const oldSuspects = Array.from(this.leakSuspects.entries())
      .filter(([, info]) => now - info.detectedAt > 600000);
    
    oldSuspects.forEach(([id]) => this.leakSuspects.delete(id));
    if (oldSuspects.length > 0) {
      cleanupActions.push(`Cleared ${oldSuspects.length} old leak suspects`);
    }
    
    // Suggest component-specific cleanup
    const largestComponents = this.getLargestComponents(3);
    largestComponents.forEach(({ name, size }) => {
      cleanupActions.push(`Consider cleaning up ${name} (${this.formatBytes(size)})`);
    });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      this.lastGCTime = Date.now();
      cleanupActions.push('Forced garbage collection');
    }
    
    console.log('Cleanup actions:', cleanupActions);
    
    return cleanupActions;
  }

  /**
   * Suggest garbage collection
   */
  suggestGarbageCollection() {
    if (window.gc) {
      console.log('🗑️ Running garbage collection...');
      window.gc();
      this.lastGCTime = Date.now();
    } else {
      console.log('💡 Consider reducing memory usage. GC will run automatically.');
    }
  }

  /**
   * Get component memory usage
   */
  getComponentMemoryUsage() {
    const usage = {};
    this.componentMemory.forEach((size, component) => {
      usage[component] = size;
    });
    return usage;
  }

  /**
   * Get largest components by memory
   */
  getLargestComponents(count = 5) {
    return Array.from(this.componentMemory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([name, size]) => ({ name, size }));
  }

  /**
   * Trigger alert
   */
  triggerAlert(level, details) {
    const alert = {
      level,
      timestamp: Date.now(),
      ...details
    };
    
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    });
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback) {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  /**
   * Get memory report
   */
  getReport() {
    const current = this.samples[this.samples.length - 1] || {};
    const stats = this.calculateStats();
    
    return {
      current: {
        memory: current.memory,
        domNodes: current.domNodes,
        listeners: current.listeners,
        timestamp: current.timestamp
      },
      stats,
      components: this.getLargestComponents(),
      leaks: Array.from(this.leakSuspects.values()),
      alerts: this.getRecentAlerts(),
      suggestions: this.getOptimizationSuggestions(stats)
    };
  }

  /**
   * Calculate statistics
   */
  calculateStats() {
    if (this.samples.length === 0) {
      return { average: 0, min: 0, max: 0, trend: 'stable' };
    }
    
    const memoryValues = this.samples.map(s => s.memory.usedJSHeapSize);
    const average = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const min = Math.min(...memoryValues);
    const max = Math.max(...memoryValues);
    
    // Calculate trend
    const recentGrowth = this.calculateGrowthRate(memoryValues.slice(-10));
    let trend = 'stable';
    if (recentGrowth > 0.05) trend = 'increasing';
    else if (recentGrowth < -0.05) trend = 'decreasing';
    
    return { average, min, max, trend };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts() {
    // This would be implemented with alert history
    return [];
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(stats) {
    const suggestions = [];
    
    if (stats.trend === 'increasing') {
      suggestions.push('Memory usage is trending upward. Review recent changes.');
    }
    
    const largestComponent = this.getLargestComponents(1)[0];
    if (largestComponent && largestComponent.size > 50 * 1024 * 1024) { // 50MB
      suggestions.push(`${largestComponent.name} is using significant memory. Consider optimization.`);
    }
    
    if (this.leakSuspects.size > 0) {
      suggestions.push(`${this.leakSuspects.size} potential memory leaks detected.`);
    }
    
    return suggestions;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate unique object ID
   */
  generateObjectId() {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle GC events
   */
  handleGCEvent(entry) {
    this.lastGCTime = Date.now();
    console.log('🗑️ Garbage collection occurred:', entry);
  }

  /**
   * Cleanup profiler
   */
  destroy() {
    this.stop();
    this.samples = [];
    this.objectRegistry.clear();
    this.leakSuspects.clear();
    this.componentMemory.clear();
    this.alertCallbacks.clear();
  }
}

// Export singleton instance
export default new MemoryProfiler();