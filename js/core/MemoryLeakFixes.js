/**
 * MemoryLeakFixes.js - Performance Optimization Fixes
 * 
 * Implements critical fixes for memory leaks and performance issues
 * identified in the performance analysis report.
 * 
 * @author Performance Optimization Team
 * @date 10/08/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    /**
     * Component Lifecycle Manager
     * Tracks and cleans up component resources
     */
    class ComponentLifecycleManager {
        constructor() {
            this.components = new WeakMap();
            this.globalListeners = new Map();
            this.disposed = false;
        }

        /**
         * Register a component for lifecycle management
         */
        register(component) {
            if (!this.components.has(component)) {
                this.components.set(component, {
                    listeners: [],
                    timers: [],
                    observers: [],
                    caches: [],
                    disposed: false
                });
            }
            return this.components.get(component);
        }

        /**
         * Track event listener for cleanup
         */
        trackListener(component, eventName, handler, removeFunction) {
            const data = this.register(component);
            data.listeners.push({
                eventName,
                handler,
                remove: removeFunction
            });
        }

        /**
         * Track timer for cleanup
         */
        trackTimer(component, timerId) {
            const data = this.register(component);
            data.timers.push(timerId);
        }

        /**
         * Track observer for cleanup
         */
        trackObserver(component, observer) {
            const data = this.register(component);
            data.observers.push(observer);
        }

        /**
         * Dispose component and clean up resources
         */
        dispose(component) {
            const data = this.components.get(component);
            if (!data || data.disposed) return;

            data.disposed = true;

            // Remove event listeners
            data.listeners.forEach(({ remove }) => {
                if (typeof remove === 'function') {
                    remove();
                }
            });

            // Clear timers
            data.timers.forEach(timerId => {
                clearTimeout(timerId);
                clearInterval(timerId);
            });

            // Disconnect observers
            data.observers.forEach(observer => {
                if (observer && observer.disconnect) {
                    observer.disconnect();
                }
            });

            // Clear caches
            data.caches.forEach(cache => {
                if (cache instanceof Map) {
                    cache.clear();
                } else if (cache && cache.clear) {
                    cache.clear();
                }
            });

            // Clear references
            data.listeners = [];
            data.timers = [];
            data.observers = [];
            data.caches = [];

            Logger?.info('ComponentLifecycle', `Component disposed`, {
                listeners: data.listeners.length,
                timers: data.timers.length
            });
        }

        /**
         * Dispose all tracked components
         */
        disposeAll() {
            this.globalListeners.forEach((handler, event) => {
                window.removeEventListener(event, handler);
            });
            this.globalListeners.clear();
            this.disposed = true;
        }
    }

    /**
     * Enhanced EventBus with automatic cleanup
     */
    class EventBusEnhanced {
        constructor(originalEventBus) {
            this.original = originalEventBus;
            this.componentListeners = new WeakMap();
        }

        /**
         * Register listener with component tracking
         */
        on(component, eventName, callback, options = {}) {
            // Use original EventBus
            const removeFunction = this.original.on(eventName, callback, options);
            
            // Track for cleanup
            if (component && typeof component === 'object') {
                if (!this.componentListeners.has(component)) {
                    this.componentListeners.set(component, []);
                }
                this.componentListeners.get(component).push({
                    eventName,
                    callback,
                    remove: removeFunction
                });
            }
            
            return removeFunction;
        }

        /**
         * Clean up all listeners for a component
         */
        cleanup(component) {
            const listeners = this.componentListeners.get(component);
            if (!listeners) return;

            listeners.forEach(({ remove }) => {
                if (typeof remove === 'function') {
                    remove();
                }
            });

            this.componentListeners.delete(component);
        }

        /**
         * Get listener count for debugging
         */
        getListenerCount() {
            let total = 0;
            this.original.events.forEach(listeners => {
                total += listeners.length;
            });
            return total;
        }
    }

    /**
     * Memory Monitor - Tracks and reports memory usage
     */
    class MemoryMonitor {
        constructor() {
            this.measurements = [];
            this.maxMeasurements = 100;
            this.monitoringInterval = null;
            this.thresholds = {
                warning: 70,  // 70% memory usage
                critical: 85  // 85% memory usage
            };
        }

        /**
         * Start monitoring memory
         */
        start(interval = 30000) {
            if (this.monitoringInterval) return;

            this.monitoringInterval = setInterval(() => {
                this.measure();
            }, interval);

            // Initial measurement
            this.measure();
        }

        /**
         * Stop monitoring
         */
        stop() {
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
        }

        /**
         * Take a memory measurement
         */
        measure() {
            if (!performance.memory) return null;

            const measurement = {
                timestamp: Date.now(),
                usedHeap: performance.memory.usedJSHeapSize,
                totalHeap: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                usage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
            };

            this.measurements.push(measurement);

            // Keep only recent measurements
            if (this.measurements.length > this.maxMeasurements) {
                this.measurements.shift();
            }

            // Check thresholds
            this.checkThresholds(measurement);

            return measurement;
        }

        /**
         * Check memory thresholds and trigger actions
         */
        checkThresholds(measurement) {
            if (measurement.usage > this.thresholds.critical) {
                this.onCriticalMemory(measurement);
            } else if (measurement.usage > this.thresholds.warning) {
                this.onWarningMemory(measurement);
            }
        }

        /**
         * Handle critical memory usage
         */
        onCriticalMemory(measurement) {
            Logger?.error('MemoryMonitor', 'Critical memory usage detected', {
                usage: measurement.usage.toFixed(2) + '%',
                used: (measurement.usedHeap / 1048576).toFixed(2) + ' MB'
            });

            // Trigger aggressive cleanup
            this.triggerCleanup('aggressive');
        }

        /**
         * Handle warning memory usage
         */
        onWarningMemory(measurement) {
            Logger?.warn('MemoryMonitor', 'High memory usage detected', {
                usage: measurement.usage.toFixed(2) + '%',
                used: (measurement.usedHeap / 1048576).toFixed(2) + ' MB'
            });

            // Trigger normal cleanup
            this.triggerCleanup('normal');
        }

        /**
         * Trigger memory cleanup
         */
        triggerCleanup(mode = 'normal') {
            // Clear caches
            if (KC.CacheManager) {
                KC.CacheManager.clearOldEntries(mode === 'aggressive' ? 0 : 300000);
            }

            // Clear old search cache
            if (KC.QdrantService?.searchCache) {
                const maxSize = mode === 'aggressive' ? 20 : 50;
                while (KC.QdrantService.searchCache.size > maxSize) {
                    const firstKey = KC.QdrantService.searchCache.keys().next().value;
                    KC.QdrantService.searchCache.delete(firstKey);
                }
            }

            // Clear evolution history
            if (KC.SemanticConvergenceService?.evolutionHistory) {
                const maxHistory = mode === 'aggressive' ? 50 : 100;
                if (KC.SemanticConvergenceService.evolutionHistory.length > maxHistory) {
                    KC.SemanticConvergenceService.evolutionHistory = 
                        KC.SemanticConvergenceService.evolutionHistory.slice(-maxHistory);
                }
            }

            // Request garbage collection if available
            if (window.gc) {
                window.gc();
            }

            Logger?.info('MemoryMonitor', `Memory cleanup triggered (${mode} mode)`);
        }

        /**
         * Get memory statistics
         */
        getStats() {
            if (this.measurements.length === 0) return null;

            const latest = this.measurements[this.measurements.length - 1];
            const oldest = this.measurements[0];

            const growth = latest.usedHeap - oldest.usedHeap;
            const growthRate = growth / (latest.timestamp - oldest.timestamp) * 1000; // bytes per second

            return {
                current: {
                    usage: latest.usage.toFixed(2) + '%',
                    used: (latest.usedHeap / 1048576).toFixed(2) + ' MB',
                    total: (latest.totalHeap / 1048576).toFixed(2) + ' MB',
                    limit: (latest.limit / 1048576).toFixed(2) + ' MB'
                },
                trend: {
                    growth: (growth / 1048576).toFixed(2) + ' MB',
                    rate: (growthRate / 1024).toFixed(2) + ' KB/s',
                    samples: this.measurements.length
                }
            };
        }

        /**
         * Detect memory leaks
         */
        detectLeaks() {
            if (this.measurements.length < 10) {
                return { detected: false, reason: 'Insufficient data' };
            }

            // Calculate average growth rate
            let totalGrowth = 0;
            for (let i = 1; i < this.measurements.length; i++) {
                totalGrowth += this.measurements[i].usedHeap - this.measurements[i - 1].usedHeap;
            }
            const avgGrowth = totalGrowth / (this.measurements.length - 1);

            // If average growth is consistently positive and significant
            if (avgGrowth > 1048576) { // More than 1MB average growth
                return {
                    detected: true,
                    avgGrowth: (avgGrowth / 1048576).toFixed(2) + ' MB',
                    confidence: Math.min(this.measurements.length / 20, 1) // Confidence based on sample size
                };
            }

            return { detected: false };
        }
    }

    /**
     * Cache Optimizer - Manages cache eviction and optimization
     */
    class CacheOptimizer {
        constructor() {
            this.caches = new Map();
            this.stats = {
                evictions: 0,
                optimizations: 0
            };
        }

        /**
         * Register a cache for optimization
         */
        register(name, cache, options = {}) {
            this.caches.set(name, {
                cache,
                maxSize: options.maxSize || 100,
                ttl: options.ttl || 300000, // 5 minutes default
                strategy: options.strategy || 'lru'
            });
        }

        /**
         * Optimize all registered caches
         */
        optimize() {
            let totalEvicted = 0;

            this.caches.forEach((config, name) => {
                const evicted = this.optimizeCache(config.cache, config);
                totalEvicted += evicted;
            });

            this.stats.optimizations++;
            this.stats.evictions += totalEvicted;

            return totalEvicted;
        }

        /**
         * Optimize a single cache
         */
        optimizeCache(cache, config) {
            if (!(cache instanceof Map)) return 0;

            let evicted = 0;

            // Remove expired entries (TTL)
            if (config.ttl) {
                const now = Date.now();
                const toDelete = [];

                cache.forEach((value, key) => {
                    if (value && value.timestamp && (now - value.timestamp > config.ttl)) {
                        toDelete.push(key);
                    }
                });

                toDelete.forEach(key => {
                    cache.delete(key);
                    evicted++;
                });
            }

            // Enforce size limit
            if (cache.size > config.maxSize) {
                const toRemove = cache.size - config.maxSize;
                const keys = Array.from(cache.keys());

                if (config.strategy === 'lru') {
                    // Remove oldest entries (assuming Map maintains insertion order)
                    keys.slice(0, toRemove).forEach(key => {
                        cache.delete(key);
                        evicted++;
                    });
                } else if (config.strategy === 'random') {
                    // Random eviction
                    for (let i = 0; i < toRemove; i++) {
                        const randomIndex = Math.floor(Math.random() * keys.length);
                        cache.delete(keys[randomIndex]);
                        keys.splice(randomIndex, 1);
                        evicted++;
                    }
                }
            }

            return evicted;
        }

        /**
         * Get optimization statistics
         */
        getStats() {
            const cacheStats = {};
            
            this.caches.forEach((config, name) => {
                cacheStats[name] = {
                    size: config.cache.size,
                    maxSize: config.maxSize,
                    strategy: config.strategy
                };
            });

            return {
                ...this.stats,
                caches: cacheStats
            };
        }
    }

    // Initialize fixes
    KC.ComponentLifecycleManager = new ComponentLifecycleManager();
    KC.EventBusEnhanced = new EventBusEnhanced(KC.EventBus);
    KC.MemoryMonitor = new MemoryMonitor();
    KC.CacheOptimizer = new CacheOptimizer();

    // Auto-start memory monitoring
    KC.MemoryMonitor.start();

    // Register existing caches for optimization
    if (KC.QdrantService?.searchCache) {
        KC.CacheOptimizer.register('qdrant-search', KC.QdrantService.searchCache, {
            maxSize: 100,
            ttl: 600000,
            strategy: 'lru'
        });
    }

    if (KC.CacheManager) {
        ['statsCache', 'metadataCache', 'documentsCache', 'embedCache', 'searchCache'].forEach(cacheName => {
            if (KC.CacheManager[cacheName]) {
                KC.CacheOptimizer.register(`cache-manager-${cacheName}`, KC.CacheManager[cacheName], {
                    maxSize: 200,
                    ttl: 300000,
                    strategy: 'lru'
                });
            }
        });
    }

    // Run optimization periodically
    setInterval(() => {
        const evicted = KC.CacheOptimizer.optimize();
        if (evicted > 0) {
            Logger?.debug('CacheOptimizer', `Evicted ${evicted} cache entries`);
        }
    }, 60000); // Every minute

    Logger?.success('MemoryLeakFixes', 'Performance optimizations loaded');

})(window);