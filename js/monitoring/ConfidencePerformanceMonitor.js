/**
 * ConfidencePerformanceMonitor - Performance tracking for UnifiedConfidenceSystem
 * Monitors performance, collects metrics, and provides diagnostic capabilities
 * 
 * Strategic Context: Track confidence system performance to ensure smooth rollout
 * and identify bottlenecks in score processing pipeline
 */

class ConfidencePerformanceMonitor {
    constructor() {
        this.logger = window.KC?.Logger || console;
        this.isEnabled = true;
        
        // Performance metrics storage
        this.metrics = {
            // Core operations timing
            operations: {
                scoreNormalization: [],
                qdrantQuery: [],
                batchProcessing: [],
                uiUpdate: []
            },
            
            // System health metrics
            health: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                lastError: null,
                systemLoad: 0
            },
            
            // Resource usage
            resources: {
                memoryUsage: [],
                cacheHitRate: 0,
                cacheSize: 0,
                activeConnections: 0
            },
            
            // User experience metrics
            ux: {
                averageUIResponseTime: 0,
                slowOperations: [],
                userInteractions: 0,
                satisfactionScore: 0
            }
        };

        // Performance thresholds
        this.thresholds = {
            scoreNormalization: 50,    // ms
            qdrantQuery: 200,          // ms
            batchProcessing: 500,      // ms
            uiUpdate: 100,             // ms
            memoryLimit: 50 * 1024 * 1024, // 50MB
            cacheHitRateMin: 0.8       // 80%
        };

        // Monitoring intervals
        this.intervals = {
            healthCheck: null,
            resourceMonitoring: null,
            metricsCleanup: null
        };

        // Event listeners for system events
        this.listeners = new Map();
        
        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        this.startHealthMonitoring();
        this.registerSystemListeners();
        this.registerConsoleCommands();
        
        this.logger.info('ConfidencePerformanceMonitor: Initialized');
    }

    /**
     * Record timing for an operation
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     * @param {Object} metadata - Additional operation metadata
     */
    recordTiming(operation, duration, metadata = {}) {
        if (!this.isEnabled) return;

        const record = {
            duration,
            timestamp: Date.now(),
            metadata
        };

        // Store timing data
        if (this.metrics.operations[operation]) {
            this.metrics.operations[operation].push(record);
            
            // Keep only last 100 records per operation
            if (this.metrics.operations[operation].length > 100) {
                this.metrics.operations[operation] = this.metrics.operations[operation].slice(-100);
            }
        }

        // Check against thresholds
        this.checkThreshold(operation, duration, metadata);
        
        // Update health metrics
        this.updateHealthMetrics(operation, duration, metadata);
    }

    /**
     * Start timing an operation
     * @param {string} operation - Operation name
     * @returns {Function} Function to call when operation completes
     */
    startTiming(operation) {
        const startTime = performance.now();
        
        return (metadata = {}) => {
            const duration = performance.now() - startTime;
            this.recordTiming(operation, duration, metadata);
            return duration;
        };
    }

    /**
     * Record system health event
     * @param {string} type - Event type (success, error, warning)
     * @param {Object} data - Event data
     */
    recordHealthEvent(type, data) {
        this.metrics.health.totalRequests++;
        
        switch (type) {
            case 'success':
                this.metrics.health.successfulRequests++;
                break;
            case 'error':
                this.metrics.health.failedRequests++;
                this.metrics.health.lastError = {
                    ...data,
                    timestamp: Date.now()
                };
                break;
        }

        // Update average response time
        if (data.responseTime) {
            const total = this.metrics.health.totalRequests;
            this.metrics.health.averageResponseTime = 
                (this.metrics.health.averageResponseTime * (total - 1) + data.responseTime) / total;
        }
    }

    /**
     * Update resource usage metrics
     * @param {Object} resources - Resource usage data
     */
    updateResourceMetrics(resources) {
        if (resources.memoryUsage) {
            this.metrics.resources.memoryUsage.push({
                value: resources.memoryUsage,
                timestamp: Date.now()
            });
            
            // Keep only last 50 memory readings
            if (this.metrics.resources.memoryUsage.length > 50) {
                this.metrics.resources.memoryUsage = this.metrics.resources.memoryUsage.slice(-50);
            }
        }

        if (resources.cacheHitRate !== undefined) {
            this.metrics.resources.cacheHitRate = resources.cacheHitRate;
        }

        if (resources.cacheSize !== undefined) {
            this.metrics.resources.cacheSize = resources.cacheSize;
        }

        if (resources.activeConnections !== undefined) {
            this.metrics.resources.activeConnections = resources.activeConnections;
        }
    }

    /**
     * Get comprehensive performance report
     * @returns {Object} Performance report
     */
    getPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(),
            metrics: this.getProcessedMetrics(),
            health: this.getHealthStatus(),
            recommendations: this.generateRecommendations(),
            thresholds: this.thresholds
        };

        return report;
    }

    /**
     * Get real-time system health status
     * @returns {Object} Health status
     */
    getHealthStatus() {
        const { health, resources } = this.metrics;
        const successRate = health.totalRequests > 0 ? 
            (health.successfulRequests / health.totalRequests) : 1;

        const memoryUsage = resources.memoryUsage.length > 0 ? 
            resources.memoryUsage[resources.memoryUsage.length - 1].value : 0;

        return {
            overall: this.calculateOverallHealth(),
            successRate: Math.round(successRate * 100) / 100,
            averageResponseTime: Math.round(health.averageResponseTime),
            memoryUsage: this.formatBytes(memoryUsage),
            cacheHitRate: Math.round(resources.cacheHitRate * 100) / 100,
            activeConnections: resources.activeConnections,
            lastError: health.lastError,
            systemLoad: health.systemLoad
        };
    }

    /**
     * Generate performance-based recommendations
     * @returns {Array} Array of recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const { health, resources, operations } = this.metrics;

        // Check success rate
        const successRate = health.totalRequests > 0 ? 
            (health.successfulRequests / health.totalRequests) : 1;
        
        if (successRate < 0.95) {
            recommendations.push({
                type: 'error_rate',
                priority: 'high',
                message: `Error rate is ${Math.round((1 - successRate) * 100)}%. Consider investigating failed requests.`,
                action: 'Check logs and error patterns'
            });
        }

        // Check response time
        if (health.averageResponseTime > 1000) {
            recommendations.push({
                type: 'response_time',
                priority: 'medium',
                message: `Average response time is ${Math.round(health.averageResponseTime)}ms.`,
                action: 'Consider optimizing slow operations or implementing caching'
            });
        }

        // Check memory usage
        const latestMemory = resources.memoryUsage.length > 0 ? 
            resources.memoryUsage[resources.memoryUsage.length - 1].value : 0;
        
        if (latestMemory > this.thresholds.memoryLimit) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                message: `Memory usage is ${this.formatBytes(latestMemory)}, exceeding limit.`,
                action: 'Clear caches or optimize memory usage'
            });
        }

        // Check cache hit rate
        if (resources.cacheHitRate < this.thresholds.cacheHitRateMin) {
            recommendations.push({
                type: 'cache',
                priority: 'medium',
                message: `Cache hit rate is ${Math.round(resources.cacheHitRate * 100)}%, below optimal threshold.`,
                action: 'Review caching strategy and cache size limits'
            });
        }

        // Check slow operations
        Object.entries(operations).forEach(([op, timings]) => {
            if (timings.length > 0) {
                const avgTime = timings.reduce((sum, t) => sum + t.duration, 0) / timings.length;
                const threshold = this.thresholds[op];
                
                if (threshold && avgTime > threshold) {
                    recommendations.push({
                        type: 'slow_operation',
                        priority: 'medium',
                        message: `${op} averaging ${Math.round(avgTime)}ms, above ${threshold}ms threshold.`,
                        action: `Optimize ${op} implementation`
                    });
                }
            }
        });

        return recommendations;
    }

    /**
     * Export metrics for external analysis
     * @param {string} format - Export format (json, csv)
     * @returns {string} Exported data
     */
    exportMetrics(format = 'json') {
        const data = this.getPerformanceReport();
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Clear all metrics (useful for testing)
     */
    clearMetrics() {
        // Reset all metrics to initial state
        Object.keys(this.metrics.operations).forEach(op => {
            this.metrics.operations[op] = [];
        });
        
        this.metrics.health = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastError: null,
            systemLoad: 0
        };
        
        this.metrics.resources = {
            memoryUsage: [],
            cacheHitRate: 0,
            cacheSize: 0,
            activeConnections: 0
        };
        
        this.metrics.ux = {
            averageUIResponseTime: 0,
            slowOperations: [],
            userInteractions: 0,
            satisfactionScore: 0
        };

        this.logger.info('ConfidencePerformanceMonitor: Metrics cleared');
    }

    // Private Methods

    startHealthMonitoring() {
        // Monitor system health every 30 seconds
        this.intervals.healthCheck = setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);

        // Monitor resources every 10 seconds
        this.intervals.resourceMonitoring = setInterval(() => {
            this.collectResourceMetrics();
        }, 10000);

        // Clean up old metrics every 5 minutes
        this.intervals.metricsCleanup = setInterval(() => {
            this.cleanupOldMetrics();
        }, 300000);
    }

    collectSystemMetrics() {
        try {
            // Collect browser performance metrics
            if (performance.memory) {
                this.updateResourceMetrics({
                    memoryUsage: performance.memory.usedJSHeapSize
                });
            }

            // Update system load (simplified)
            this.metrics.health.systemLoad = this.calculateSystemLoad();
            
        } catch (error) {
            this.logger.warn('Failed to collect system metrics', error);
        }
    }

    collectResourceMetrics() {
        try {
            // Collect cache metrics from various services
            const cacheMetrics = this.collectCacheMetrics();
            this.updateResourceMetrics(cacheMetrics);
            
        } catch (error) {
            this.logger.warn('Failed to collect resource metrics', error);
        }
    }

    collectCacheMetrics() {
        let totalRequests = 0;
        let totalHits = 0;
        let totalSize = 0;

        // Collect from QdrantService cache
        if (window.KC?.QdrantService?.getCacheStats) {
            const qdrantCache = window.KC.QdrantService.getCacheStats();
            totalRequests += qdrantCache.requests || 0;
            totalHits += qdrantCache.hits || 0;
            totalSize += qdrantCache.size || 0;
        }

        // Collect from ScoreNormalizer cache
        if (window.KC?.ScoreNormalizerInstance?.getStats) {
            const normalizerStats = window.KC.ScoreNormalizerInstance.getStats();
            totalSize += normalizerStats.cacheSize || 0;
        }

        return {
            cacheHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
            cacheSize: totalSize
        };
    }

    calculateSystemLoad() {
        // Simplified system load calculation based on recent metrics
        const recentOperations = Object.values(this.metrics.operations)
            .flat()
            .filter(op => Date.now() - op.timestamp < 60000); // Last minute

        return Math.min(recentOperations.length / 60, 1); // Operations per second, capped at 1
    }

    checkThreshold(operation, duration, metadata) {
        const threshold = this.thresholds[operation];
        if (threshold && duration > threshold) {
            this.logger.warn(`Performance threshold exceeded for ${operation}: ${duration}ms > ${threshold}ms`, metadata);
            
            // Record slow operation
            this.metrics.ux.slowOperations.push({
                operation,
                duration,
                threshold,
                timestamp: Date.now(),
                metadata
            });

            // Keep only last 20 slow operations
            if (this.metrics.ux.slowOperations.length > 20) {
                this.metrics.ux.slowOperations = this.metrics.ux.slowOperations.slice(-20);
            }
        }
    }

    updateHealthMetrics(operation, duration, metadata) {
        // Update UX metrics based on operation type
        if (operation === 'uiUpdate') {
            const total = this.metrics.ux.userInteractions + 1;
            this.metrics.ux.averageUIResponseTime = 
                (this.metrics.ux.averageUIResponseTime * this.metrics.ux.userInteractions + duration) / total;
            this.metrics.ux.userInteractions = total;
        }
    }

    calculateOverallHealth() {
        const { health, resources } = this.metrics;
        
        // Weighted health score calculation
        let score = 100;
        
        // Success rate impact (40% weight)
        const successRate = health.totalRequests > 0 ? 
            (health.successfulRequests / health.totalRequests) : 1;
        score *= 0.6 + (successRate * 0.4);
        
        // Response time impact (30% weight)
        const responseTimePenalty = Math.max(0, (health.averageResponseTime - 500) / 1000);
        score *= Math.max(0.7, 1 - (responseTimePenalty * 0.3));
        
        // Memory usage impact (20% weight)
        const latestMemory = resources.memoryUsage.length > 0 ? 
            resources.memoryUsage[resources.memoryUsage.length - 1].value : 0;
        const memoryPenalty = Math.max(0, (latestMemory - this.thresholds.memoryLimit) / this.thresholds.memoryLimit);
        score *= Math.max(0.8, 1 - (memoryPenalty * 0.2));
        
        // Cache performance impact (10% weight)
        const cachePenalty = Math.max(0, (this.thresholds.cacheHitRateMin - resources.cacheHitRate));
        score *= Math.max(0.9, 1 - (cachePenalty * 0.1));
        
        return Math.round(score);
    }

    generateSummary() {
        const health = this.getHealthStatus();
        const totalOperations = Object.values(this.metrics.operations)
            .reduce((sum, ops) => sum + ops.length, 0);

        return {
            overallHealth: health.overall,
            totalOperations,
            successRate: health.successRate,
            averageResponseTime: health.averageResponseTime,
            memoryUsage: health.memoryUsage,
            recommendationsCount: this.generateRecommendations().length
        };
    }

    getProcessedMetrics() {
        const processed = {};
        
        Object.entries(this.metrics.operations).forEach(([op, timings]) => {
            if (timings.length > 0) {
                const durations = timings.map(t => t.duration);
                processed[op] = {
                    count: timings.length,
                    average: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
                    min: Math.min(...durations),
                    max: Math.max(...durations),
                    p95: this.calculatePercentile(durations, 95)
                };
            }
        });

        return processed;
    }

    calculatePercentile(values, percentile) {
        const sorted = values.slice().sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        
        if (index === Math.floor(index)) {
            return sorted[index];
        } else {
            const lower = sorted[Math.floor(index)];
            const upper = sorted[Math.ceil(index)];
            return lower + (upper - lower) * (index - Math.floor(index));
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    convertToCSV(data) {
        // Simple CSV conversion for basic metrics
        const rows = [
            ['Metric', 'Value'],
            ['Overall Health', data.summary.overallHealth],
            ['Total Operations', data.summary.totalOperations],
            ['Success Rate', data.summary.successRate],
            ['Average Response Time', data.summary.averageResponseTime],
            ['Memory Usage', data.summary.memoryUsage]
        ];

        return rows.map(row => row.join(',')).join('\n');
    }

    cleanupOldMetrics() {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        
        // Clean up old operation timings
        Object.keys(this.metrics.operations).forEach(op => {
            this.metrics.operations[op] = this.metrics.operations[op]
                .filter(timing => timing.timestamp > cutoffTime);
        });

        // Clean up old memory readings
        this.metrics.resources.memoryUsage = this.metrics.resources.memoryUsage
            .filter(reading => reading.timestamp > cutoffTime);

        // Clean up old slow operations
        this.metrics.ux.slowOperations = this.metrics.ux.slowOperations
            .filter(op => op.timestamp > cutoffTime);
    }

    registerSystemListeners() {
        // Listen for system events if EventBus is available
        if (window.KC?.EventBus) {
            // Monitor confidence system events
            window.KC.EventBus.on('CONFIDENCE_SCORE_CALCULATED', (data) => {
                this.recordTiming('scoreNormalization', data.processingTime || 0, data);
            });

            window.KC.EventBus.on('QDRANT_QUERY_COMPLETED', (data) => {
                this.recordTiming('qdrantQuery', data.responseTime || 0, data);
            });

            window.KC.EventBus.on('BATCH_PROCESSING_COMPLETED', (data) => {
                this.recordTiming('batchProcessing', data.totalTime || 0, data);
            });

            window.KC.EventBus.on('UI_UPDATE_COMPLETED', (data) => {
                this.recordTiming('uiUpdate', data.renderTime || 0, data);
            });
        }
    }

    registerConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.kcperf = {
                report: () => this.getPerformanceReport(),
                health: () => this.getHealthStatus(),
                recommendations: () => this.generateRecommendations(),
                export: (format) => this.exportMetrics(format),
                clear: () => this.clearMetrics(),
                start: () => { this.isEnabled = true; },
                stop: () => { this.isEnabled = false; },
                test: () => {
                    // Generate test metrics
                    this.recordTiming('scoreNormalization', 25);
                    this.recordTiming('qdrantQuery', 150);
                    this.recordTiming('batchProcessing', 300);
                    this.recordTiming('uiUpdate', 50);
                    return 'Test metrics generated';
                }
            };
        }
    }

    destroy() {
        // Clean up intervals
        Object.values(this.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });
        
        this.isEnabled = false;
        this.logger.info('ConfidencePerformanceMonitor: Destroyed');
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.ConfidencePerformanceMonitor = ConfidencePerformanceMonitor;

// Auto-initialize
window.KC.ConfidencePerformanceMonitorInstance = new ConfidencePerformanceMonitor();

export default ConfidencePerformanceMonitor;