/**
 * MemoryOptimizer.js - Memory Management and Optimization Utilities
 * 
 * Provides comprehensive memory optimization including:
 * - Virtual scrolling for large file lists
 * - Lazy loading for UI components
 * - localStorage compression and quota management
 * - Memory profiling and monitoring
 * 
 * @version 1.0.0
 * @author Claude Code Performance Team
 */

(function(window, document) {
    'use strict';

    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    const KC = window.KnowledgeConsolidator;

    /**
     * Memory Optimizer Class
     * Central hub for all memory optimization strategies
     */
    class MemoryOptimizer {
        constructor() {
            this.config = {
                virtualScroll: {
                    enabled: true,
                    itemHeight: 120,           // Height of each file item in pixels
                    bufferSize: 10,            // Extra items to render above/below viewport
                    threshold: 100             // Enable virtual scrolling after N items
                },
                lazyLoading: {
                    enabled: true,
                    rootMargin: '50px',        // Load elements 50px before they enter viewport
                    threshold: 0.1
                },
                compression: {
                    enabled: true,
                    algorithm: 'lz-string',    // Available: 'lz-string', 'json'
                    maxSize: 4 * 1024 * 1024,  // 4MB localStorage limit
                    warningThreshold: 0.8      // Warn at 80% of quota
                },
                monitoring: {
                    enabled: true,
                    interval: 5000,            // Check memory every 5 seconds
                    historySize: 50            // Keep last 50 measurements
                }
            };

            this.state = {
                memoryHistory: [],
                lastCleanup: Date.now(),
                compressionRatio: 1.0,
                isVirtualScrollActive: false
            };

            this.observers = new Map();
            this.virtualScrollInstances = new Map();
            
            this.init();
        }

        /**
         * Initialize the memory optimizer
         */
        init() {
            console.log('🚀 MemoryOptimizer: Initializing...');
            
            if (this.config.monitoring.enabled) {
                this.startMemoryMonitoring();
            }

            if (this.config.compression.enabled) {
                this.setupStorageCompression();
            }

            if (this.config.lazyLoading.enabled) {
                this.setupLazyLoading();
            }

            // Listen for file list updates to potentially enable virtual scrolling
            if (KC.EventBus) {
                KC.EventBus.on('FILES_UPDATED', this.handleFileListUpdate.bind(this));
            }

            console.log('✅ MemoryOptimizer: Initialized successfully');
        }

        /**
         * Virtual Scrolling Implementation
         * Renders only visible items in large lists
         */
        enableVirtualScrolling(containerId, items, renderFunction) {
            const container = document.getElementById(containerId);
            if (!container || items.length < this.config.virtualScroll.threshold) {
                return false;
            }

            console.log(`🔄 MemoryOptimizer: Enabling virtual scrolling for ${items.length} items`);

            const virtualScroller = new VirtualScroller(container, items, renderFunction, this.config.virtualScroll);
            this.virtualScrollInstances.set(containerId, virtualScroller);
            this.state.isVirtualScrollActive = true;

            return true;
        }

        /**
         * Disable virtual scrolling for a container
         */
        disableVirtualScrolling(containerId) {
            const virtualScroller = this.virtualScrollInstances.get(containerId);
            if (virtualScroller) {
                virtualScroller.destroy();
                this.virtualScrollInstances.delete(containerId);
            }
        }

        /**
         * Lazy Loading Setup
         * Load components/content only when needed
         */
        setupLazyLoading() {
            if (!window.IntersectionObserver) {
                console.warn('⚠️ MemoryOptimizer: IntersectionObserver not supported, disabling lazy loading');
                return;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyElement(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: this.config.lazyLoading.rootMargin,
                threshold: this.config.lazyLoading.threshold
            });

            this.observers.set('lazy-loading', observer);
        }

        /**
         * Register an element for lazy loading
         */
        observeLazyElement(element, loadCallback) {
            const observer = this.observers.get('lazy-loading');
            if (observer && element) {
                element._lazyLoadCallback = loadCallback;
                observer.observe(element);
            }
        }

        /**
         * Load a lazy element
         */
        loadLazyElement(element) {
            if (element._lazyLoadCallback && typeof element._lazyLoadCallback === 'function') {
                try {
                    element._lazyLoadCallback(element);
                    element.classList.remove('lazy-loading');
                    element.classList.add('lazy-loaded');
                } catch (error) {
                    console.error('MemoryOptimizer: Error loading lazy element:', error);
                }
            }
        }

        /**
         * Storage Compression and Quota Management
         */
        setupStorageCompression() {
            // Hook into AppState save operations
            if (KC.AppState && KC.AppState.set) {
                const originalSet = KC.AppState.set.bind(KC.AppState);
                KC.AppState.set = (key, value) => {
                    if (this.shouldCompress(key, value)) {
                        value = this.compressData(value);
                    }
                    return originalSet(key, value);
                };
            }

            // Monitor storage quota
            this.checkStorageQuota();
        }

        /**
         * Determine if data should be compressed
         */
        shouldCompress(key, value) {
            // Compress large objects (files, content)
            const largeDataKeys = ['files', 'fileContents', 'analysisResults', 'embeddings'];
            return largeDataKeys.includes(key) || 
                   (typeof value === 'object' && JSON.stringify(value).length > 1024);
        }

        /**
         * Compress data using configured algorithm
         */
        compressData(data) {
            try {
                const jsonString = JSON.stringify(data);
                
                if (this.config.compression.algorithm === 'lz-string' && window.LZString) {
                    const compressed = LZString.compress(jsonString);
                    this.state.compressionRatio = compressed.length / jsonString.length;
                    return { _compressed: true, _algorithm: 'lz-string', data: compressed };
                }
                
                // Fallback to basic JSON
                return { _compressed: false, data: data };
            } catch (error) {
                console.error('MemoryOptimizer: Compression failed:', error);
                return data;
            }
        }

        /**
         * Decompress data
         */
        decompressData(compressedData) {
            if (!compressedData || typeof compressedData !== 'object' || !compressedData._compressed) {
                return compressedData;
            }

            try {
                if (compressedData._algorithm === 'lz-string' && window.LZString) {
                    const decompressed = LZString.decompress(compressedData.data);
                    return JSON.parse(decompressed);
                }
                
                return compressedData.data;
            } catch (error) {
                console.error('MemoryOptimizer: Decompression failed:', error);
                return compressedData.data;
            }
        }

        /**
         * Check localStorage quota and usage
         */
        checkStorageQuota() {
            try {
                const usage = this.getStorageUsage();
                const quota = this.config.compression.maxSize;
                const usagePercent = usage.used / quota;

                if (usagePercent > this.config.compression.warningThreshold) {
                    console.warn(`⚠️ MemoryOptimizer: Storage usage at ${Math.round(usagePercent * 100)}%`);
                    
                    if (KC.EventBus) {
                        KC.EventBus.emit('STORAGE_WARNING', {
                            usage: usage,
                            quota: quota,
                            percent: usagePercent
                        });
                    }

                    if (usagePercent > 0.95) {
                        this.performStorageCleanup();
                    }
                }

                return usage;
            } catch (error) {
                console.error('MemoryOptimizer: Storage quota check failed:', error);
                return { used: 0, available: this.config.compression.maxSize };
            }
        }

        /**
         * Get current localStorage usage
         */
        getStorageUsage() {
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length + key.length;
                }
            }

            return {
                used: used,
                available: this.config.compression.maxSize - used,
                percent: used / this.config.compression.maxSize
            };
        }

        /**
         * Perform storage cleanup
         */
        performStorageCleanup() {
            console.log('🧹 MemoryOptimizer: Performing storage cleanup...');

            const cleanupStrategies = [
                () => this.cleanupOldCacheEntries(),
                () => this.compressExistingData(),
                () => this.removeNonEssentialData(),
                () => this.clearTemporaryData()
            ];

            let cleaned = false;
            for (const strategy of cleanupStrategies) {
                try {
                    strategy();
                    const usage = this.getStorageUsage();
                    
                    if (usage.percent < this.config.compression.warningThreshold) {
                        cleaned = true;
                        break;
                    }
                } catch (error) {
                    console.error('MemoryOptimizer: Cleanup strategy failed:', error);
                }
            }

            if (cleaned) {
                console.log('✅ MemoryOptimizer: Storage cleanup successful');
            } else {
                console.warn('⚠️ MemoryOptimizer: Storage cleanup insufficient');
            }

            this.state.lastCleanup = Date.now();
        }

        /**
         * Clean up old cache entries
         */
        cleanupOldCacheEntries() {
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            const now = Date.now();

            for (let key in localStorage) {
                if (key.startsWith('cache_') || key.startsWith('temp_')) {
                    try {
                        const data = JSON.parse(localStorage[key]);
                        if (data.timestamp && now - data.timestamp > maxAge) {
                            localStorage.removeItem(key);
                        }
                    } catch (error) {
                        // Invalid JSON, remove it
                        localStorage.removeItem(key);
                    }
                }
            }
        }

        /**
         * Compress existing uncompressed data
         */
        compressExistingData() {
            const largeKeys = ['kc_files', 'kc_analysisResults', 'kc_embeddings'];
            
            largeKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data && data.length > 1024) {
                    try {
                        const parsed = JSON.parse(data);
                        if (!parsed._compressed) {
                            const compressed = this.compressData(parsed);
                            localStorage.setItem(key, JSON.stringify(compressed));
                        }
                    } catch (error) {
                        console.error(`MemoryOptimizer: Failed to compress ${key}:`, error);
                    }
                }
            });
        }

        /**
         * Remove non-essential data
         */
        removeNonEssentialData() {
            const nonEssentialKeys = [
                'kc_debug_logs',
                'kc_temp_analysis',
                'kc_preview_cache',
                'kc_old_configs'
            ];

            nonEssentialKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                }
            });
        }

        /**
         * Clear temporary data
         */
        clearTemporaryData() {
            // Clear session-based temporary data
            if (sessionStorage) {
                sessionStorage.clear();
            }

            // Clear old event bus logs
            if (KC.EventBus && KC.EventBus.clearLogs) {
                KC.EventBus.clearLogs();
            }
        }

        /**
         * Memory Monitoring
         */
        startMemoryMonitoring() {
            const monitorMemory = () => {
                const memInfo = this.getMemoryInfo();
                this.state.memoryHistory.push({
                    timestamp: Date.now(),
                    ...memInfo
                });

                // Keep only recent history
                if (this.state.memoryHistory.length > this.config.monitoring.historySize) {
                    this.state.memoryHistory.shift();
                }

                // Emit memory stats
                if (KC.EventBus) {
                    KC.EventBus.emit('MEMORY_STATS', memInfo);
                }
            };

            // Initial measurement
            monitorMemory();

            // Set up interval
            setInterval(monitorMemory, this.config.monitoring.interval);
        }

        /**
         * Get current memory information
         */
        getMemoryInfo() {
            const info = {
                storage: this.getStorageUsage(),
                compression: {
                    ratio: this.state.compressionRatio,
                    enabled: this.config.compression.enabled
                },
                virtualScroll: {
                    active: this.state.isVirtualScrollActive,
                    instances: this.virtualScrollInstances.size
                },
                lazyLoading: {
                    enabled: this.config.lazyLoading.enabled,
                    observers: this.observers.size
                }
            };

            // Add browser memory info if available
            if (performance && performance.memory) {
                info.browser = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }

            return info;
        }

        /**
         * Handle file list updates
         */
        handleFileListUpdate(eventData) {
            const files = eventData.files || KC.AppState.get('files') || [];
            
            // Check if we should enable virtual scrolling
            if (files.length >= this.config.virtualScroll.threshold && 
                !this.state.isVirtualScrollActive) {
                
                // Look for file list container
                const filesList = document.getElementById('files-list') || 
                                document.querySelector('.files-section .file-list');
                
                if (filesList) {
                    this.enableVirtualScrolling('files-list', files, this.renderFileItem.bind(this));
                }
            }
        }

        /**
         * Default file item renderer for virtual scrolling
         */
        renderFileItem(file, index) {
            const div = document.createElement('div');
            div.className = 'file-item virtual-item';
            div.style.height = `${this.config.virtualScroll.itemHeight}px`;
            div.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">
                        <span class="relevance">Relevância: ${file.relevanceScore || 0}%</span>
                        <span class="size">${this.formatFileSize(file.size || 0)}</span>
                    </div>
                </div>
            `;
            return div;
        }

        /**
         * Format file size for display
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        /**
         * Get memory optimization stats
         */
        getStats() {
            return {
                config: this.config,
                state: this.state,
                memoryInfo: this.getMemoryInfo(),
                virtualScrollInstances: Array.from(this.virtualScrollInstances.keys()),
                observers: Array.from(this.observers.keys())
            };
        }

        /**
         * Destroy the memory optimizer
         */
        destroy() {
            // Clear intervals
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
            }

            // Destroy virtual scroll instances
            this.virtualScrollInstances.forEach(instance => instance.destroy());
            this.virtualScrollInstances.clear();

            // Disconnect observers
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();

            console.log('🔄 MemoryOptimizer: Destroyed');
        }
    }

    /**
     * Virtual Scroller Class
     * Handles rendering only visible items in large lists
     */
    class VirtualScroller {
        constructor(container, items, renderFunction, config) {
            this.container = container;
            this.items = items;
            this.renderFunction = renderFunction;
            this.config = config;

            this.state = {
                scrollTop: 0,
                viewportHeight: 0,
                startIndex: 0,
                endIndex: 0,
                renderedItems: new Map()
            };

            this.init();
        }

        init() {
            // Setup container
            this.container.style.overflowY = 'auto';
            this.container.style.position = 'relative';

            // Create viewport
            this.viewport = document.createElement('div');
            this.viewport.style.position = 'absolute';
            this.viewport.style.top = '0';
            this.viewport.style.left = '0';
            this.viewport.style.right = '0';

            // Set total height
            const totalHeight = this.items.length * this.config.itemHeight;
            this.container.style.height = `${Math.min(totalHeight, 600)}px`; // Max 600px viewport

            // Create spacer for total height
            this.spacer = document.createElement('div');
            this.spacer.style.height = `${totalHeight}px`;
            this.spacer.style.position = 'relative';

            this.container.appendChild(this.spacer);
            this.spacer.appendChild(this.viewport);

            // Setup scroll listener
            this.onScroll = this.handleScroll.bind(this);
            this.container.addEventListener('scroll', this.onScroll);

            // Initial render
            this.updateViewport();
            this.render();
        }

        handleScroll() {
            this.updateViewport();
            this.render();
        }

        updateViewport() {
            this.state.scrollTop = this.container.scrollTop;
            this.state.viewportHeight = this.container.clientHeight;

            const startIndex = Math.floor(this.state.scrollTop / this.config.itemHeight);
            const visibleItems = Math.ceil(this.state.viewportHeight / this.config.itemHeight);

            this.state.startIndex = Math.max(0, startIndex - this.config.bufferSize);
            this.state.endIndex = Math.min(
                this.items.length - 1,
                startIndex + visibleItems + this.config.bufferSize
            );
        }

        render() {
            // Remove items outside viewport
            this.state.renderedItems.forEach((element, index) => {
                if (index < this.state.startIndex || index > this.state.endIndex) {
                    element.remove();
                    this.state.renderedItems.delete(index);
                }
            });

            // Add visible items
            for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
                if (!this.state.renderedItems.has(i) && this.items[i]) {
                    const element = this.renderFunction(this.items[i], i);
                    element.style.position = 'absolute';
                    element.style.top = `${i * this.config.itemHeight}px`;
                    element.style.left = '0';
                    element.style.right = '0';

                    this.viewport.appendChild(element);
                    this.state.renderedItems.set(i, element);
                }
            }
        }

        updateItems(newItems) {
            this.items = newItems;
            
            // Update spacer height
            const totalHeight = this.items.length * this.config.itemHeight;
            this.spacer.style.height = `${totalHeight}px`;

            // Clear rendered items
            this.state.renderedItems.forEach(element => element.remove());
            this.state.renderedItems.clear();

            // Re-render
            this.updateViewport();
            this.render();
        }

        destroy() {
            if (this.container && this.onScroll) {
                this.container.removeEventListener('scroll', this.onScroll);
            }

            this.state.renderedItems.forEach(element => element.remove());
            this.state.renderedItems.clear();

            if (this.spacer && this.spacer.parentNode) {
                this.spacer.parentNode.removeChild(this.spacer);
            }
        }
    }

    // Initialize and export
    KC.MemoryOptimizer = MemoryOptimizer;
    KC.VirtualScroller = VirtualScroller;

    // Create global instance
    KC.memoryOptimizer = new MemoryOptimizer();

    console.log('✅ MemoryOptimizer: Module loaded');

})(window, document);