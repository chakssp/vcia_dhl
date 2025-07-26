/**
 * PerformanceMonitor - Real-time Performance Metrics Collection
 * 
 * Comprehensive performance monitoring for ML optimization:
 * - High-resolution timing measurements
 * - Memory usage tracking
 * - Throughput calculations
 * - Error rate monitoring
 * - Performance degradation detection
 * - Real-time metrics emission
 * 
 * Features:
 * - Sub-millisecond precision timing
 * - Automatic performance reports
 * - Integration with browser Performance API
 * - Event-based metric notifications
 */

export default class PerformanceMonitor {
    constructor(componentName = 'Unknown') {
        this.componentName = componentName;
        
        // Metrics storage
        this.metrics = {
            timers: new Map(),
            counters: new Map(),
            gauges: new Map(),
            histograms: new Map(),
            errors: []
        };
        
        // Performance tracking
        this.performanceEntries = [];
        this.maxEntries = 1000;
        
        // Real-time monitoring
        this.monitoring = false;
        this.monitoringInterval = null;
        this.monitoringCallbacks = new Set();
        
        // Thresholds for alerts
        this.thresholds = {
            responseTime: 1000, // 1 second
            errorRate: 0.05, // 5%
            memoryUsage: 0.8, // 80%
            cpuUsage: 0.9 // 90%
        };
        
        // Statistics
        this.stats = {
            startTime: Date.now(),
            totalOperations: 0,
            totalErrors: 0,
            avgResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            throughput: 0,
            errorRate: 0,
            uptime: 0
        };
        
        // Initialize Performance Observer if available
        this.initializePerformanceObserver();
    }
    
    /**
     * Initialize Performance Observer
     * @private
     */
    initializePerformanceObserver() {
        if (typeof PerformanceObserver === 'undefined') return;
        
        try {
            this.observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.startsWith(this.componentName)) {
                        this.recordPerformanceEntry(entry);
                    }
                }
            });
            
            this.observer.observe({ entryTypes: ['measure', 'mark'] });
        } catch (error) {
            console.warn('PerformanceMonitor: Failed to initialize PerformanceObserver', error);
        }
    }
    
    /**
     * Start a timer
     * @param {string} name - Timer name
     * @returns {object} Timer object
     */
    startTimer(name) {
        const timerName = `${this.componentName}.${name}`;
        const startTime = performance.now();
        
        // Create mark if available
        try {
            performance.mark(`${timerName}.start`);
        } catch (error) {
            // Ignore marking errors
        }
        
        const timer = {
            name: timerName,
            startTime,
            ended: false,
            
            end: () => {
                if (timer.ended) return;
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                timer.ended = true;
                timer.duration = duration;
                
                // Create measure if available
                try {
                    performance.mark(`${timerName}.end`);
                    performance.measure(timerName, `${timerName}.start`, `${timerName}.end`);
                } catch (error) {
                    // Ignore measuring errors
                }
                
                // Record timing
                this.recordTiming(name, duration);
                
                return duration;
            },
            
            elapsed: () => {
                return performance.now() - startTime;
            }
        };
        
        // Store active timer
        this.metrics.timers.set(name, timer);
        
        return timer;
    }
    
    /**
     * Record timing metric
     * @param {string} name - Metric name
     * @param {number} duration - Duration in ms
     */
    recordTiming(name, duration) {
        // Update histogram
        if (!this.metrics.histograms.has(name)) {
            this.metrics.histograms.set(name, []);
        }
        
        const histogram = this.metrics.histograms.get(name);
        histogram.push(duration);
        
        // Maintain histogram size
        if (histogram.length > this.maxEntries) {
            histogram.shift();
        }
        
        // Update statistics
        this.updateTimingStats(name, histogram);
        
        // Check threshold
        if (duration > this.thresholds.responseTime) {
            this.emitAlert('slowResponse', {
                operation: name,
                duration,
                threshold: this.thresholds.responseTime
            });
        }
        
        // Emit metric event
        this.emitMetric('timing', { name, duration });
    }
    
    /**
     * Update timing statistics
     * @private
     */
    updateTimingStats(name, histogram) {
        if (histogram.length === 0) return;
        
        // Sort for percentile calculations
        const sorted = [...histogram].sort((a, b) => a - b);
        
        // Calculate statistics
        const avg = histogram.reduce((sum, val) => sum + val, 0) / histogram.length;
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);
        
        // Update component stats
        this.stats.avgResponseTime = avg;
        this.stats.p95ResponseTime = sorted[p95Index] || 0;
        this.stats.p99ResponseTime = sorted[p99Index] || 0;
    }
    
    /**
     * Record counter metric
     * @param {string} name - Counter name
     * @param {number} value - Value to add (default 1)
     */
    recordCounter(name, value = 1) {
        const current = this.metrics.counters.get(name) || 0;
        this.metrics.counters.set(name, current + value);
        
        // Update total operations
        if (name !== 'errors') {
            this.stats.totalOperations += value;
        }
        
        // Emit metric event
        this.emitMetric('counter', { name, value: current + value });
    }
    
    /**
     * Record gauge metric
     * @param {string} name - Gauge name
     * @param {number} value - Current value
     */
    recordGauge(name, value) {
        this.metrics.gauges.set(name, value);
        
        // Emit metric event
        this.emitMetric('gauge', { name, value });
    }
    
    /**
     * Record error
     * @param {string} operation - Operation that failed
     * @param {Error} error - Error object
     */
    recordError(operation, error) {
        const errorEntry = {
            operation,
            message: error.message,
            stack: error.stack,
            timestamp: Date.now()
        };
        
        this.metrics.errors.push(errorEntry);
        
        // Maintain error log size
        if (this.metrics.errors.length > 100) {
            this.metrics.errors.shift();
        }
        
        // Update counters
        this.recordCounter('errors', 1);
        this.stats.totalErrors++;
        
        // Calculate error rate
        this.stats.errorRate = this.stats.totalErrors / Math.max(1, this.stats.totalOperations);
        
        // Check threshold
        if (this.stats.errorRate > this.thresholds.errorRate) {
            this.emitAlert('highErrorRate', {
                errorRate: this.stats.errorRate,
                threshold: this.thresholds.errorRate
            });
        }
        
        // Emit error event
        this.emitMetric('error', errorEntry);
    }
    
    /**
     * Record performance entry
     * @private
     */
    recordPerformanceEntry(entry) {
        this.performanceEntries.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
        });
        
        // Maintain entries size
        if (this.performanceEntries.length > this.maxEntries) {
            this.performanceEntries.shift();
        }
    }
    
    /**
     * Start real-time monitoring
     * @param {number} interval - Monitoring interval in ms
     */
    startMonitoring(interval = 1000) {
        if (this.monitoring) return;
        
        this.monitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, interval);
        
        console.log(`PerformanceMonitor: Started monitoring ${this.componentName}`);
    }
    
    /**
     * Stop real-time monitoring
     */
    stopMonitoring() {
        if (!this.monitoring) return;
        
        this.monitoring = false;
        clearInterval(this.monitoringInterval);
        
        console.log(`PerformanceMonitor: Stopped monitoring ${this.componentName}`);
    }
    
    /**
     * Collect current metrics
     * @private
     */
    collectMetrics() {
        const metrics = {
            timestamp: Date.now(),
            component: this.componentName,
            
            // Timing metrics
            timings: Object.fromEntries(
                Array.from(this.metrics.histograms.entries()).map(([name, histogram]) => {
                    const sorted = [...histogram].sort((a, b) => a - b);
                    return [name, {
                        count: histogram.length,
                        avg: histogram.reduce((sum, val) => sum + val, 0) / histogram.length,
                        min: sorted[0] || 0,
                        max: sorted[sorted.length - 1] || 0,
                        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
                        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
                        p99: sorted[Math.floor(sorted.length * 0.99)] || 0
                    }];
                })
            ),
            
            // Counters
            counters: Object.fromEntries(this.metrics.counters),
            
            // Gauges
            gauges: Object.fromEntries(this.metrics.gauges),
            
            // System metrics
            system: this.collectSystemMetrics(),
            
            // Component stats
            stats: {
                ...this.stats,
                uptime: Date.now() - this.stats.startTime,
                throughput: this.calculateThroughput()
            }
        };
        
        // Notify listeners
        for (const callback of this.monitoringCallbacks) {
            try {
                callback(metrics);
            } catch (error) {
                console.error('PerformanceMonitor: Monitoring callback error', error);
            }
        }
        
        return metrics;
    }
    
    /**
     * Collect system metrics
     * @private
     */
    collectSystemMetrics() {
        const metrics = {
            timestamp: Date.now()
        };
        
        // Memory metrics if available
        if (performance.memory) {
            metrics.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                usage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
            };
            
            // Check memory threshold
            if (metrics.memory.usage > this.thresholds.memoryUsage) {
                this.emitAlert('highMemoryUsage', {
                    usage: metrics.memory.usage,
                    threshold: this.thresholds.memoryUsage
                });
            }
        }
        
        // Navigation timing if available
        if (performance.timing) {
            const timing = performance.timing;
            metrics.navigation = {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: timing.responseEnd - timing.navigationStart
            };
        }
        
        return metrics;
    }
    
    /**
     * Calculate throughput
     * @private
     */
    calculateThroughput() {
        const uptime = (Date.now() - this.stats.startTime) / 1000; // seconds
        return uptime > 0 ? this.stats.totalOperations / uptime : 0;
    }
    
    /**
     * Subscribe to monitoring updates
     * @param {function} callback - Callback function
     */
    subscribe(callback) {
        this.monitoringCallbacks.add(callback);
    }
    
    /**
     * Unsubscribe from monitoring updates
     * @param {function} callback - Callback function
     */
    unsubscribe(callback) {
        this.monitoringCallbacks.delete(callback);
    }
    
    /**
     * Emit metric event
     * @private
     */
    emitMetric(type, data) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('performance-metric', {
                detail: {
                    component: this.componentName,
                    type,
                    data,
                    timestamp: Date.now()
                }
            });
            
            window.dispatchEvent(event);
        }
    }
    
    /**
     * Emit alert event
     * @private
     */
    emitAlert(type, data) {
        console.warn(`PerformanceMonitor: Alert [${type}]`, data);
        
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('performance-alert', {
                detail: {
                    component: this.componentName,
                    type,
                    data,
                    timestamp: Date.now()
                }
            });
            
            window.dispatchEvent(event);
        }
    }
    
    /**
     * Get current statistics
     * @returns {object} Current stats
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime,
            throughput: this.calculateThroughput(),
            metrics: this.collectMetrics()
        };
    }
    
    /**
     * Get performance report
     * @returns {object} Performance report
     */
    getReport() {
        const metrics = this.collectMetrics();
        
        return {
            component: this.componentName,
            period: {
                start: new Date(this.stats.startTime),
                end: new Date(),
                duration: Date.now() - this.stats.startTime
            },
            summary: {
                totalOperations: this.stats.totalOperations,
                totalErrors: this.stats.totalErrors,
                errorRate: (this.stats.errorRate * 100).toFixed(2) + '%',
                avgResponseTime: this.stats.avgResponseTime.toFixed(2) + 'ms',
                p95ResponseTime: this.stats.p95ResponseTime.toFixed(2) + 'ms',
                p99ResponseTime: this.stats.p99ResponseTime.toFixed(2) + 'ms',
                throughput: this.stats.throughput.toFixed(2) + ' ops/sec'
            },
            timings: metrics.timings,
            counters: metrics.counters,
            gauges: metrics.gauges,
            system: metrics.system,
            errors: this.metrics.errors.slice(-10) // Last 10 errors
        };
    }
    
    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            timers: new Map(),
            counters: new Map(),
            gauges: new Map(),
            histograms: new Map(),
            errors: []
        };
        
        this.performanceEntries = [];
        
        this.stats = {
            startTime: Date.now(),
            totalOperations: 0,
            totalErrors: 0,
            avgResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            throughput: 0,
            errorRate: 0,
            uptime: 0
        };
        
        console.log(`PerformanceMonitor: Reset metrics for ${this.componentName}`);
    }
    
    /**
     * Export metrics for analysis
     * @returns {string} JSON export
     */
    exportMetrics() {
        const report = this.getReport();
        report.performanceEntries = this.performanceEntries;
        
        return JSON.stringify(report, null, 2);
    }
}