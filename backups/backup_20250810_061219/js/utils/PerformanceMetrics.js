/**
 * PerformanceMetrics.js - Performance Monitoring and Metrics Collection
 * 
 * Centralized performance monitoring system that tracks:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Custom application metrics
 * - Memory usage and optimization effectiveness
 * - User interaction performance
 * 
 * @version 1.0.0
 * @author Claude Code Performance Team
 */

(function(window, document) {
    'use strict';

    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    const KC = window.KnowledgeConsolidator;

    /**
     * Performance Metrics Collector
     */
    class PerformanceMetrics {
        constructor() {
            this.config = {
                reporting: {
                    enabled: true,
                    interval: 30000,        // Report every 30 seconds
                    endpoint: null,         // Custom endpoint for metrics
                    console: true           // Log to console in dev
                },
                thresholds: {
                    lcp: 2500,             // Largest Contentful Paint (ms)
                    fid: 100,              // First Input Delay (ms)
                    cls: 0.1,              // Cumulative Layout Shift
                    memoryWarning: 50,     // Memory usage warning (MB)
                    slowOperation: 100     // Slow operation threshold (ms)
                },
                sampling: {
                    rate: 1.0,             // Sample 100% of sessions
                    maxEvents: 1000        // Max events to store
                }
            };

            this.metrics = {
                // Core Web Vitals
                webVitals: {
                    lcp: null,
                    fid: null,
                    cls: 0
                },
                
                // Application Performance
                application: {
                    loadTime: 0,
                    navigationStart: performance.now(),
                    firstContentfulPaint: null,
                    timeToInteractive: null,
                    filesDiscovered: 0,
                    filesAnalyzed: 0,
                    analysisErrors: 0
                },

                // Memory Performance
                memory: {
                    usedJSHeapSize: 0,
                    totalJSHeapSize: 0,
                    jsHeapSizeLimit: 0,
                    storageUsage: 0,
                    compressionRatio: 1.0
                },

                // User Interactions
                interactions: {
                    totalInteractions: 0,
                    slowInteractions: 0,
                    averageResponseTime: 0,
                    responseTimes: []
                },

                // Custom Metrics
                custom: new Map()
            };

            this.observers = new Map();
            this.eventBuffer = [];
            this.reportingTimer = null;

            this.init();
        }

        /**
         * Initialize performance monitoring
         */
        init() {
            console.log('📊 PerformanceMetrics: Initializing...');

            this.setupWebVitalsMonitoring();
            this.setupNavigationTimingMonitoring();
            this.setupMemoryMonitoring();
            this.setupInteractionMonitoring();
            this.setupCustomEventListeners();

            if (this.config.reporting.enabled) {
                this.startPeriodicReporting();
            }

            console.log('✅ PerformanceMetrics: Initialized successfully');
        }

        /**
         * Core Web Vitals Monitoring
         */
        setupWebVitalsMonitoring() {
            // Largest Contentful Paint (LCP)
            if ('PerformanceObserver' in window) {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    
                    this.metrics.webVitals.lcp = lastEntry.startTime;
                    
                    this.recordEvent('web-vital', {
                        metric: 'LCP',
                        value: lastEntry.startTime,
                        rating: this.getRating('lcp', lastEntry.startTime)
                    });
                });

                try {
                    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                    this.observers.set('lcp', lcpObserver);
                } catch (error) {
                    console.warn('PerformanceMetrics: LCP monitoring not supported');
                }

                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.metrics.webVitals.fid = entry.processingStart - entry.startTime;
                        
                        this.recordEvent('web-vital', {
                            metric: 'FID',
                            value: this.metrics.webVitals.fid,
                            rating: this.getRating('fid', this.metrics.webVitals.fid)
                        });
                    });
                });

                try {
                    fidObserver.observe({ entryTypes: ['first-input'] });
                    this.observers.set('fid', fidObserver);
                } catch (error) {
                    console.warn('PerformanceMetrics: FID monitoring not supported');
                }

                // Cumulative Layout Shift (CLS)
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (!entry.hadRecentInput) {
                            this.metrics.webVitals.cls += entry.value;
                        }
                    });

                    this.recordEvent('web-vital', {
                        metric: 'CLS',
                        value: this.metrics.webVitals.cls,
                        rating: this.getRating('cls', this.metrics.webVitals.cls)
                    });
                });

                try {
                    clsObserver.observe({ entryTypes: ['layout-shift'] });
                    this.observers.set('cls', clsObserver);
                } catch (error) {
                    console.warn('PerformanceMetrics: CLS monitoring not supported');
                }
            }
        }

        /**
         * Navigation Timing Monitoring
         */
        setupNavigationTimingMonitoring() {
            // Wait for page to load completely
            if (document.readyState === 'complete') {
                this.captureNavigationMetrics();
            } else {
                window.addEventListener('load', () => {
                    setTimeout(() => this.captureNavigationMetrics(), 0);
                });
            }
        }

        /**
         * Capture navigation timing metrics
         */
        captureNavigationMetrics() {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (!navigation) return;

            this.metrics.application.loadTime = navigation.loadEventEnd - navigation.fetchStart;
            
            // First Contentful Paint
            const fcp = performance.getEntriesByName('first-contentful-paint')[0];
            if (fcp) {
                this.metrics.application.firstContentfulPaint = fcp.startTime;
            }

            // Time to Interactive (estimated)
            this.estimateTimeToInteractive();

            this.recordEvent('navigation', {
                loadTime: this.metrics.application.loadTime,
                firstContentfulPaint: this.metrics.application.firstContentfulPaint,
                timeToInteractive: this.metrics.application.timeToInteractive
            });
        }

        /**
         * Estimate Time to Interactive
         */
        estimateTimeToInteractive() {
            // Simple TTI estimation based on main thread availability
            const longTasks = performance.getEntriesByType('longtask');
            const fcp = this.metrics.application.firstContentfulPaint;
            
            if (!fcp) {
                this.metrics.application.timeToInteractive = null;
                return;
            }

            // Find the first 5-second window after FCP with no long tasks
            let searchStart = fcp;
            let tti = fcp;

            longTasks.forEach(task => {
                if (task.startTime >= searchStart) {
                    searchStart = task.startTime + task.duration;
                    tti = searchStart;
                }
            });

            this.metrics.application.timeToInteractive = tti;
        }

        /**
         * Memory Monitoring
         */
        setupMemoryMonitoring() {
            if (performance.memory) {
                const updateMemoryMetrics = () => {
                    this.metrics.memory.usedJSHeapSize = performance.memory.usedJSHeapSize;
                    this.metrics.memory.totalJSHeapSize = performance.memory.totalJSHeapSize;
                    this.metrics.memory.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;

                    // Check for memory warnings
                    const usedMB = this.metrics.memory.usedJSHeapSize / 1024 / 1024;
                    if (usedMB > this.config.thresholds.memoryWarning) {
                        this.recordEvent('memory-warning', {
                            usedMB: usedMB,
                            threshold: this.config.thresholds.memoryWarning
                        });
                    }
                };

                // Update every 10 seconds
                setInterval(updateMemoryMetrics, 10000);
                updateMemoryMetrics(); // Initial update
            }

            // Monitor localStorage usage
            if (KC.MemoryOptimizer) {
                const updateStorageMetrics = () => {
                    const usage = KC.MemoryOptimizer.getStorageUsage();
                    this.metrics.memory.storageUsage = usage.used;
                    this.metrics.memory.compressionRatio = KC.MemoryOptimizer.state.compressionRatio;
                };

                setInterval(updateStorageMetrics, 30000);
            }
        }

        /**
         * User Interaction Monitoring
         */
        setupInteractionMonitoring() {
            const interactionTypes = ['click', 'keydown', 'scroll', 'touchstart'];
            
            interactionTypes.forEach(type => {
                let startTime = 0;

                document.addEventListener(type, (event) => {
                    startTime = performance.now();
                    this.metrics.interactions.totalInteractions++;
                }, { passive: true });

                // Measure response time using requestAnimationFrame
                document.addEventListener(type, () => {
                    requestAnimationFrame(() => {
                        const responseTime = performance.now() - startTime;
                        
                        this.metrics.interactions.responseTimes.push(responseTime);
                        
                        // Keep only last 100 response times
                        if (this.metrics.interactions.responseTimes.length > 100) {
                            this.metrics.interactions.responseTimes.shift();
                        }

                        // Calculate average
                        this.metrics.interactions.averageResponseTime = 
                            this.metrics.interactions.responseTimes.reduce((a, b) => a + b, 0) / 
                            this.metrics.interactions.responseTimes.length;

                        // Track slow interactions
                        if (responseTime > this.config.thresholds.slowOperation) {
                            this.metrics.interactions.slowInteractions++;
                            
                            this.recordEvent('slow-interaction', {
                                type: event.type,
                                responseTime: responseTime,
                                target: event.target.tagName
                            });
                        }
                    });
                }, { passive: true });
            });
        }

        /**
         * Custom Event Listeners
         */
        setupCustomEventListeners() {
            if (!KC.EventBus) return;

            // Monitor file discovery performance
            KC.EventBus.on('FILES_DISCOVERED', (data) => {
                this.metrics.application.filesDiscovered = data.count || 0;
                this.recordCustomMetric('files_discovered', data.count);
            });

            // Monitor analysis performance
            KC.EventBus.on('ANALYSIS_COMPLETE', (data) => {
                this.metrics.application.filesAnalyzed += data.processedCount || 0;
                this.recordCustomMetric('analysis_time', data.processingTime);
            });

            // Monitor analysis errors
            KC.EventBus.on('ANALYSIS_ERROR', (data) => {
                this.metrics.application.analysisErrors++;
                this.recordEvent('analysis-error', data);
            });

            // Monitor memory optimizer events
            KC.EventBus.on('MEMORY_STATS', (data) => {
                this.recordCustomMetric('virtual_scroll_active', data.virtualScroll.active ? 1 : 0);
                this.recordCustomMetric('compression_ratio', data.compression.ratio);
            });

            // Monitor UI performance events
            KC.EventBus.on('FPS_UPDATED', (data) => {
                this.recordCustomMetric('fps', data.fps);
            });

            KC.EventBus.on('LONG_TASK_DETECTED', (data) => {
                this.recordEvent('long-task', {
                    duration: data.duration,
                    startTime: data.startTime
                });
            });
        }

        /**
         * Record a performance event
         */
        recordEvent(type, data) {
            const event = {
                type,
                data,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            this.eventBuffer.push(event);

            // Limit buffer size
            if (this.eventBuffer.length > this.config.sampling.maxEvents) {
                this.eventBuffer.shift();
            }

            // Log to console in development
            if (this.config.reporting.console && window.location.hostname === 'localhost') {
                console.log(`PerformanceMetrics: ${type}`, data);
            }
        }

        /**
         * Record a custom metric
         */
        recordCustomMetric(name, value) {
            this.metrics.custom.set(name, {
                value,
                timestamp: Date.now()
            });

            this.recordEvent('custom-metric', { name, value });
        }

        /**
         * Get performance rating for a metric
         */
        getRating(metric, value) {
            const thresholds = {
                lcp: { good: 2500, poor: 4000 },
                fid: { good: 100, poor: 300 },
                cls: { good: 0.1, poor: 0.25 }
            };

            const threshold = thresholds[metric];
            if (!threshold) return 'unknown';

            if (value <= threshold.good) return 'good';
            if (value <= threshold.poor) return 'needs-improvement';
            return 'poor';
        }

        /**
         * Start periodic reporting
         */
        startPeriodicReporting() {
            this.reportingTimer = setInterval(() => {
                this.generateReport();
            }, this.config.reporting.interval);
        }

        /**
         * Generate performance report
         */
        generateReport() {
            const report = {
                timestamp: Date.now(),
                session: this.getSessionId(),
                webVitals: this.metrics.webVitals,
                application: this.metrics.application,
                memory: this.metrics.memory,
                interactions: {
                    total: this.metrics.interactions.totalInteractions,
                    slow: this.metrics.interactions.slowInteractions,
                    averageResponseTime: this.metrics.interactions.averageResponseTime
                },
                custom: Object.fromEntries(this.metrics.custom),
                events: this.eventBuffer.slice(-50), // Last 50 events
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };

            // Send to custom endpoint if configured
            if (this.config.reporting.endpoint) {
                this.sendReport(report);
            }

            // Emit report event
            if (KC.EventBus) {
                KC.EventBus.emit('PERFORMANCE_REPORT', report);
            }

            return report;
        }

        /**
         * Send report to endpoint
         */
        async sendReport(report) {
            try {
                const response = await fetch(this.config.reporting.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(report)
                });

                if (!response.ok) {
                    console.warn('PerformanceMetrics: Failed to send report');
                }
            } catch (error) {
                console.error('PerformanceMetrics: Error sending report:', error);
            }
        }

        /**
         * Get or create session ID
         */
        getSessionId() {
            let sessionId = sessionStorage.getItem('perf_session_id');
            if (!sessionId) {
                sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('perf_session_id', sessionId);
            }
            return sessionId;
        }

        /**
         * Get current metrics snapshot
         */
        getMetrics() {
            return {
                ...this.metrics,
                custom: Object.fromEntries(this.metrics.custom)
            };
        }

        /**
         * Get performance score (0-100)
         */
        getPerformanceScore() {
            const scores = [];

            // Web Vitals scoring
            if (this.metrics.webVitals.lcp) {
                const lcpScore = this.getScoreFromRating(this.getRating('lcp', this.metrics.webVitals.lcp));
                scores.push(lcpScore);
            }

            if (this.metrics.webVitals.fid) {
                const fidScore = this.getScoreFromRating(this.getRating('fid', this.metrics.webVitals.fid));
                scores.push(fidScore);
            }

            const clsScore = this.getScoreFromRating(this.getRating('cls', this.metrics.webVitals.cls));
            scores.push(clsScore);

            // Application performance scoring
            if (this.metrics.application.loadTime) {
                const loadScore = this.metrics.application.loadTime < 3000 ? 100 : 
                                 this.metrics.application.loadTime < 5000 ? 75 : 50;
                scores.push(loadScore);
            }

            // Memory usage scoring
            if (this.metrics.memory.usedJSHeapSize) {
                const memoryMB = this.metrics.memory.usedJSHeapSize / 1024 / 1024;
                const memoryScore = memoryMB < 25 ? 100 : memoryMB < 50 ? 75 : 50;
                scores.push(memoryScore);
            }

            return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
        }

        /**
         * Convert rating to score
         */
        getScoreFromRating(rating) {
            switch (rating) {
                case 'good': return 100;
                case 'needs-improvement': return 75;
                case 'poor': return 50;
                default: return 0;
            }
        }

        /**
         * Update configuration
         */
        updateConfig(newConfig) {
            Object.assign(this.config, newConfig);
        }

        /**
         * Destroy performance monitoring
         */
        destroy() {
            // Disconnect observers
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();

            // Clear reporting timer
            if (this.reportingTimer) {
                clearInterval(this.reportingTimer);
                this.reportingTimer = null;
            }

            // Clear buffers
            this.eventBuffer = [];
            this.metrics.custom.clear();

            console.log('🔄 PerformanceMetrics: Destroyed');
        }
    }

    // Initialize and export
    KC.PerformanceMetrics = PerformanceMetrics;

    // Create global instance
    KC.performanceMetrics = new PerformanceMetrics();

    // Export window function for manual reporting
    window.getPerformanceReport = () => KC.performanceMetrics.generateReport();

    console.log('✅ PerformanceMetrics: Module loaded');

})(window, document);