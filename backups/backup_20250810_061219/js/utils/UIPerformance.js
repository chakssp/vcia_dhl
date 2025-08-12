/**
 * UIPerformance.js - UI Performance Optimization Utilities
 * 
 * Provides comprehensive UI performance optimization including:
 * - Debouncing and throttling utilities
 * - CSS animation optimizations
 * - Layout thrashing prevention
 * - Render optimization strategies
 * 
 * @version 1.0.0
 * @author Claude Code Performance Team
 */

(function(window, document) {
    'use strict';

    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    const KC = window.KnowledgeConsolidator;

    /**
     * UI Performance Optimizer Class
     */
    class UIPerformance {
        constructor() {
            this.config = {
                debounce: {
                    search: 300,        // Search input debounce
                    resize: 250,        // Window resize debounce
                    scroll: 16,         // Scroll throttle (~60fps)
                    input: 150          // General input debounce
                },
                animation: {
                    useTransform: true,     // Prefer transform over position changes
                    useOpacity: true,       // Prefer opacity over visibility
                    duration: 200,          // Default animation duration
                    easing: 'ease-out'      // Default easing
                },
                rendering: {
                    batchSize: 50,          // Batch DOM updates
                    frameDelay: 16,         // ~60fps frame delay
                    maxLayoutShift: 0.1     // Max cumulative layout shift
                },
                monitoring: {
                    enabled: true,
                    measureFPS: true,
                    measureMemory: true,
                    logThreshold: 100       // Log operations taking >100ms
                }
            };

            this.state = {
                pendingUpdates: new Map(),
                animationCallbacks: new Map(),
                frameId: null,
                lastFrameTime: 0,
                fps: 60,
                performanceEntries: [],
                layoutShiftScore: 0
            };

            this.timers = new Map();
            this.throttledFunctions = new Map();
            this.debouncedFunctions = new Map();
            
            this.init();
        }

        /**
         * Initialize UI Performance optimizer
         */
        init() {
            console.log('🚀 UIPerformance: Initializing...');
            
            this.setupPerformanceMonitoring();
            this.setupLayoutOptimizations();
            this.injectOptimizedStyles();
            this.setupGlobalEventOptimizations();
            
            console.log('✅ UIPerformance: Initialized successfully');
        }

        /**
         * Debouncing Utilities
         */
        debounce(func, delay, options = {}) {
            const {
                immediate = false,
                maxWait = null,
                key = func.toString()
            } = options;

            if (this.debouncedFunctions.has(key)) {
                return this.debouncedFunctions.get(key);
            }

            let timeoutId;
            let maxTimeoutId;
            let lastCallTime = 0;

            const debouncedFunction = function(...args) {
                const now = Date.now();
                lastCallTime = now;

                const later = () => {
                    timeoutId = null;
                    if (!immediate) {
                        func.apply(this, args);
                    }
                };

                const callNow = immediate && !timeoutId;

                clearTimeout(timeoutId);
                timeoutId = setTimeout(later, delay);

                // Handle maxWait
                if (maxWait && !maxTimeoutId) {
                    maxTimeoutId = setTimeout(() => {
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            func.apply(this, args);
                        }
                        maxTimeoutId = null;
                    }, maxWait);
                }

                if (callNow) {
                    func.apply(this, args);
                }
            };

            // Add cancel method
            debouncedFunction.cancel = () => {
                clearTimeout(timeoutId);
                clearTimeout(maxTimeoutId);
                timeoutId = null;
                maxTimeoutId = null;
            };

            this.debouncedFunctions.set(key, debouncedFunction);
            return debouncedFunction;
        }

        /**
         * Throttling Utilities
         */
        throttle(func, delay, options = {}) {
            const {
                leading = true,
                trailing = true,
                key = func.toString()
            } = options;

            if (this.throttledFunctions.has(key)) {
                return this.throttledFunctions.get(key);
            }

            let lastCallTime = 0;
            let timeoutId = null;
            let lastArgs = null;

            const throttledFunction = function(...args) {
                const now = Date.now();
                
                if (!lastCallTime && !leading) {
                    lastCallTime = now;
                }

                const remaining = delay - (now - lastCallTime);

                if (remaining <= 0 || remaining > delay) {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    lastCallTime = now;
                    func.apply(this, args);
                } else if (!timeoutId && trailing) {
                    lastArgs = args;
                    timeoutId = setTimeout(() => {
                        lastCallTime = leading ? 0 : Date.now();
                        timeoutId = null;
                        func.apply(this, lastArgs);
                    }, remaining);
                }
            };

            // Add cancel method
            throttledFunction.cancel = () => {
                clearTimeout(timeoutId);
                timeoutId = null;
                lastCallTime = 0;
            };

            this.throttledFunctions.set(key, throttledFunction);
            return throttledFunction;
        }

        /**
         * Optimized DOM Updates
         */
        batchDOMUpdates(updates) {
            if (!Array.isArray(updates)) {
                updates = [updates];
            }

            return new Promise((resolve) => {
                // Batch reads and writes separately
                const reads = updates.filter(u => u.type === 'read');
                const writes = updates.filter(u => u.type === 'write');

                this.requestOptimizedFrame(() => {
                    // Perform all reads first
                    const readResults = reads.map(update => {
                        try {
                            return update.operation();
                        } catch (error) {
                            console.error('UIPerformance: Read operation failed:', error);
                            return null;
                        }
                    });

                    // Then perform all writes
                    this.requestOptimizedFrame(() => {
                        const writeResults = writes.map(update => {
                            try {
                                return update.operation();
                            } catch (error) {
                                console.error('UIPerformance: Write operation failed:', error);
                                return null;
                            }
                        });

                        resolve([...readResults, ...writeResults]);
                    });
                });
            });
        }

        /**
         * Optimized requestAnimationFrame
         */
        requestOptimizedFrame(callback, priority = 'normal') {
            const frameCallback = (timestamp) => {
                const frameTime = timestamp - this.state.lastFrameTime;
                this.state.lastFrameTime = timestamp;
                
                // Calculate FPS
                if (frameTime > 0) {
                    this.state.fps = Math.round(1000 / frameTime);
                }

                // Execute callback with performance monitoring
                const startTime = performance.now();
                
                try {
                    callback(timestamp);
                } catch (error) {
                    console.error('UIPerformance: Frame callback failed:', error);
                }

                const executionTime = performance.now() - startTime;
                
                // Log slow operations
                if (executionTime > this.config.monitoring.logThreshold) {
                    console.warn(`UIPerformance: Slow frame operation: ${executionTime.toFixed(2)}ms`);
                }
            };

            // Use scheduler based on priority if available
            if (window.scheduler && window.scheduler.postTask) {
                return window.scheduler.postTask(frameCallback, { priority });
            } else {
                return requestAnimationFrame(frameCallback);
            }
        }

        /**
         * CSS Animation Optimizations
         */
        createOptimizedAnimation(element, keyframes, options = {}) {
            const defaultOptions = {
                duration: this.config.animation.duration,
                easing: this.config.animation.easing,
                fill: 'both'
            };

            const animationOptions = { ...defaultOptions, ...options };

            // Optimize keyframes for performance
            const optimizedKeyframes = this.optimizeKeyframes(keyframes);

            try {
                const animation = element.animate(optimizedKeyframes, animationOptions);
                
                // Monitor animation performance
                this.monitorAnimation(animation, element);
                
                return animation;
            } catch (error) {
                console.error('UIPerformance: Animation creation failed:', error);
                return null;
            }
        }

        /**
         * Optimize keyframes for better performance
         */
        optimizeKeyframes(keyframes) {
            return keyframes.map(frame => {
                const optimizedFrame = {};

                Object.keys(frame).forEach(property => {
                    const value = frame[property];

                    // Convert position changes to transforms
                    if (property === 'left' || property === 'top') {
                        if (!optimizedFrame.transform) {
                            optimizedFrame.transform = '';
                        }
                        const translateProp = property === 'left' ? 'translateX' : 'translateY';
                        optimizedFrame.transform += ` ${translateProp}(${value})`;
                    }
                    // Use opacity instead of visibility when possible
                    else if (property === 'visibility' && (value === 'visible' || value === 'hidden')) {
                        optimizedFrame.opacity = value === 'visible' ? '1' : '0';
                    }
                    // Keep other properties as-is
                    else {
                        optimizedFrame[property] = value;
                    }
                });

                return optimizedFrame;
            });
        }

        /**
         * Monitor animation performance
         */
        monitorAnimation(animation, element) {
            if (!this.config.monitoring.enabled) return;

            const startTime = performance.now();
            
            animation.addEventListener('finish', () => {
                const duration = performance.now() - startTime;
                
                if (duration > animation.effect.getTiming().duration * 1.5) {
                    console.warn('UIPerformance: Animation performed poorly:', {
                        element: element.tagName,
                        expectedDuration: animation.effect.getTiming().duration,
                        actualDuration: duration
                    });
                }
            });
        }

        /**
         * Layout Thrashing Prevention
         */
        preventLayoutThrashing(operations) {
            const reads = [];
            const writes = [];

            // Separate read and write operations
            operations.forEach(op => {
                if (this.isReadOperation(op)) {
                    reads.push(op);
                } else {
                    writes.push(op);
                }
            });

            return new Promise((resolve) => {
                // Execute all reads first
                this.requestOptimizedFrame(() => {
                    const readResults = reads.map(op => this.executeOperation(op));

                    // Then execute all writes
                    this.requestOptimizedFrame(() => {
                        const writeResults = writes.map(op => this.executeOperation(op));
                        resolve([...readResults, ...writeResults]);
                    });
                });
            });
        }

        /**
         * Determine if operation is a read operation
         */
        isReadOperation(operation) {
            const readProperties = [
                'offsetWidth', 'offsetHeight', 'scrollTop', 'scrollLeft',
                'clientWidth', 'clientHeight', 'getBoundingClientRect',
                'getComputedStyle', 'scrollWidth', 'scrollHeight'
            ];

            const operationString = operation.toString();
            return readProperties.some(prop => operationString.includes(prop));
        }

        /**
         * Execute operation safely
         */
        executeOperation(operation) {
            try {
                if (typeof operation === 'function') {
                    return operation();
                } else if (operation && operation.operation) {
                    return operation.operation();
                }
                return null;
            } catch (error) {
                console.error('UIPerformance: Operation failed:', error);
                return null;
            }
        }

        /**
         * Virtual Scrolling Helper
         */
        createVirtualScrollContainer(options = {}) {
            const {
                itemHeight = 50,
                containerHeight = 400,
                overscan = 5,
                items = [],
                renderItem = () => document.createElement('div')
            } = options;

            const container = document.createElement('div');
            container.style.cssText = `
                height: ${containerHeight}px;
                overflow-y: auto;
                position: relative;
            `;

            const content = document.createElement('div');
            content.style.height = `${items.length * itemHeight}px`;
            container.appendChild(content);

            const visibleItems = Math.ceil(containerHeight / itemHeight);
            const renderedItems = new Map();

            const updateVisibleItems = this.throttle(() => {
                const scrollTop = container.scrollTop;
                const startIndex = Math.floor(scrollTop / itemHeight);
                const endIndex = Math.min(
                    items.length - 1,
                    startIndex + visibleItems + overscan
                );

                // Remove items outside visible range
                renderedItems.forEach((element, index) => {
                    if (index < startIndex - overscan || index > endIndex) {
                        element.remove();
                        renderedItems.delete(index);
                    }
                });

                // Add visible items
                for (let i = Math.max(0, startIndex - overscan); i <= endIndex; i++) {
                    if (!renderedItems.has(i) && items[i]) {
                        const element = renderItem(items[i], i);
                        element.style.cssText = `
                            position: absolute;
                            top: ${i * itemHeight}px;
                            left: 0;
                            right: 0;
                            height: ${itemHeight}px;
                        `;
                        content.appendChild(element);
                        renderedItems.set(i, element);
                    }
                }
            }, this.config.debounce.scroll);

            container.addEventListener('scroll', updateVisibleItems);
            updateVisibleItems(); // Initial render

            return {
                container,
                updateItems: (newItems) => {
                    items.splice(0, items.length, ...newItems);
                    content.style.height = `${items.length * itemHeight}px`;
                    renderedItems.clear();
                    updateVisibleItems();
                },
                destroy: () => {
                    container.removeEventListener('scroll', updateVisibleItems);
                    renderedItems.clear();
                }
            };
        }

        /**
         * Performance Monitoring
         */
        setupPerformanceMonitoring() {
            if (!this.config.monitoring.enabled) return;

            // Monitor FPS
            if (this.config.monitoring.measureFPS) {
                this.startFPSMonitoring();
            }

            // Monitor Cumulative Layout Shift
            if ('LayoutShift' in window) {
                this.setupLayoutShiftMonitoring();
            }

            // Monitor Long Tasks
            if ('PerformanceObserver' in window) {
                this.setupLongTaskMonitoring();
            }
        }

        /**
         * Start FPS monitoring
         */
        startFPSMonitoring() {
            let frameCount = 0;
            let lastTime = performance.now();

            const measureFPS = () => {
                frameCount++;
                const currentTime = performance.now();
                
                if (currentTime - lastTime >= 1000) {
                    this.state.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                    frameCount = 0;
                    lastTime = currentTime;

                    // Emit FPS event
                    if (KC.EventBus) {
                        KC.EventBus.emit('FPS_UPDATED', { fps: this.state.fps });
                    }
                }

                requestAnimationFrame(measureFPS);
            };

            requestAnimationFrame(measureFPS);
        }

        /**
         * Setup Layout Shift monitoring
         */
        setupLayoutShiftMonitoring() {
            const observer = new PerformanceObserver((list) => {
                let cumulativeScore = 0;

                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        cumulativeScore += entry.value;
                    }
                }

                this.state.layoutShiftScore += cumulativeScore;

                if (cumulativeScore > this.config.rendering.maxLayoutShift) {
                    console.warn('UIPerformance: High layout shift detected:', cumulativeScore);
                }
            });

            observer.observe({ entryTypes: ['layout-shift'] });
        }

        /**
         * Setup Long Task monitoring
         */
        setupLongTaskMonitoring() {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.warn('UIPerformance: Long task detected:', {
                        duration: entry.duration,
                        startTime: entry.startTime
                    });

                    // Emit long task event
                    if (KC.EventBus) {
                        KC.EventBus.emit('LONG_TASK_DETECTED', {
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                    }
                }
            });

            observer.observe({ entryTypes: ['longtask'] });
        }

        /**
         * Layout Optimizations
         */
        setupLayoutOptimizations() {
            // Optimize common UI patterns
            this.optimizeScrollContainers();
            this.optimizeFormInputs();
            this.optimizeImageLoading();
        }

        /**
         * Optimize scroll containers
         */
        optimizeScrollContainers() {
            const scrollContainers = document.querySelectorAll('[data-scroll-optimize]');
            
            scrollContainers.forEach(container => {
                // Add CSS containment
                container.style.contain = 'layout style paint';
                
                // Add will-change for smooth scrolling
                container.style.willChange = 'scroll-position';
                
                // Optimize scroll events
                const optimizedScrollHandler = this.throttle((e) => {
                    // Custom scroll handling if needed
                }, this.config.debounce.scroll);
                
                container.addEventListener('scroll', optimizedScrollHandler, { passive: true });
            });
        }

        /**
         * Optimize form inputs
         */
        optimizeFormInputs() {
            const inputs = document.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                if (input.type === 'search' || input.dataset.debounce) {
                    const delay = parseInt(input.dataset.debounce) || this.config.debounce.search;
                    const originalHandler = input.oninput;
                    
                    if (originalHandler) {
                        input.oninput = this.debounce(originalHandler.bind(input), delay);
                    }
                }
            });
        }

        /**
         * Optimize image loading
         */
        optimizeImageLoading() {
            const images = document.querySelectorAll('img[data-lazy]');
            
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.removeAttribute('data-lazy');
                            imageObserver.unobserve(img);
                        }
                    });
                });

                images.forEach(img => imageObserver.observe(img));
            }
        }

        /**
         * Inject optimized CSS
         */
        injectOptimizedStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* Performance optimized styles */
                .ui-optimized {
                    contain: layout style paint;
                    will-change: auto;
                }
                
                .ui-smooth-scroll {
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                }
                
                .ui-gpu-accelerated {
                    transform: translateZ(0);
                    backface-visibility: hidden;
                    perspective: 1000;
                }
                
                .ui-no-select {
                    user-select: none;
                    -webkit-touch-callout: none;
                }
                
                .ui-transition-optimized {
                    transition-property: transform, opacity;
                    transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
                
                /* Prevent layout thrashing */
                .ui-fixed-height {
                    min-height: 1px; /* Prevent collapse */
                }
                
                /* Virtual scroll optimizations */
                .virtual-scroll-container {
                    overflow-anchor: none; /* Prevent scroll anchoring */
                }
                
                .virtual-scroll-item {
                    contain: strict;
                    will-change: transform;
                }
            `;
            document.head.appendChild(style);
        }

        /**
         * Setup global event optimizations
         */
        setupGlobalEventOptimizations() {
            // Optimize window resize
            const optimizedResize = this.debounce(() => {
                if (KC.EventBus) {
                    KC.EventBus.emit('WINDOW_RESIZED', {
                        width: window.innerWidth,
                        height: window.innerHeight
                    });
                }
            }, this.config.debounce.resize);

            window.addEventListener('resize', optimizedResize);

            // Optimize window scroll
            const optimizedScroll = this.throttle(() => {
                if (KC.EventBus) {
                    KC.EventBus.emit('WINDOW_SCROLLED', {
                        scrollY: window.scrollY,
                        scrollX: window.scrollX
                    });
                }
            }, this.config.debounce.scroll);

            window.addEventListener('scroll', optimizedScroll, { passive: true });
        }

        /**
         * Get performance statistics
         */
        getPerformanceStats() {
            return {
                fps: this.state.fps,
                layoutShiftScore: this.state.layoutShiftScore,
                debouncedFunctions: this.debouncedFunctions.size,
                throttledFunctions: this.throttledFunctions.size,
                activeAnimations: this.state.animationCallbacks.size,
                config: this.config
            };
        }

        /**
         * Clean up resources
         */
        destroy() {
            // Cancel all pending operations
            this.debouncedFunctions.forEach(fn => fn.cancel && fn.cancel());
            this.throttledFunctions.forEach(fn => fn.cancel && fn.cancel());
            
            // Clear maps
            this.debouncedFunctions.clear();
            this.throttledFunctions.clear();
            this.state.animationCallbacks.clear();
            
            console.log('🔄 UIPerformance: Destroyed');
        }
    }

    // Initialize and export
    KC.UIPerformance = UIPerformance;

    // Create global instance
    KC.uiPerformance = new UIPerformance();

    console.log('✅ UIPerformance: Module loaded');

})(window, document);