/**
 * CacheStrategy - Intelligent Caching System with LRU Eviction
 * 
 * Provides high-performance caching for ML confidence calculations:
 * - LRU (Least Recently Used) eviction strategy
 * - TTL (Time To Live) support for cache entries
 * - Compression for memory efficiency
 * - Namespace isolation for different cache types
 * - Persistent storage with IndexedDB fallback
 * - Cache warming and preloading capabilities
 * 
 * Performance targets:
 * - 90%+ cache hit rate for repeated calculations
 * - < 1ms cache lookup time
 * - Automatic memory management
 */

import PerformanceMonitor from './PerformanceMonitor.js';

export default class CacheStrategy {
    constructor(config = {}) {
        this.config = {
            maxSize: config.maxSize || 1000,
            ttl: config.ttl || 3600000, // 1 hour default
            strategy: config.strategy || 'LRU',
            namespace: config.namespace || 'default',
            compressionEnabled: config.compressionEnabled !== false,
            persistentStorage: config.persistentStorage !== false,
            memoryThreshold: config.memoryThreshold || 0.8, // 80% memory usage threshold
            compressionThreshold: config.compressionThreshold || 1024 // Compress entries > 1KB
        };
        
        // Cache storage
        this.cache = new Map();
        this.accessOrder = new Map(); // For LRU tracking
        this.ttlTimers = new Map(); // For TTL management
        
        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            compressions: 0,
            decompressions: 0,
            totalSize: 0,
            avgAccessTime: 0
        };
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor('CacheStrategy');
        
        // IndexedDB for persistent storage
        this.db = null;
        this.dbName = `MLCache_${this.config.namespace}`;
        this.storeName = 'cache';
        
        // Initialize
        this.initialize();
    }
    
    /**
     * Initialize cache system
     * @private
     */
    async initialize() {
        // Setup IndexedDB if persistent storage enabled
        if (this.config.persistentStorage) {
            try {
                await this.initializeDB();
                await this.loadFromPersistent();
            } catch (error) {
                console.warn('CacheStrategy: Failed to initialize persistent storage', error);
                this.config.persistentStorage = false;
            }
        }
        
        // Monitor memory usage
        this.startMemoryMonitoring();
    }
    
    /**
     * Initialize IndexedDB
     * @private
     */
    async initializeDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('accessTime', 'accessTime', { unique: false });
                }
            };
        });
    }
    
    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached value or null
     */
    async get(key) {
        const timer = this.performanceMonitor.startTimer('get');
        
        try {
            // Check memory cache first
            if (this.cache.has(key)) {
                const entry = this.cache.get(key);
                
                // Check TTL
                if (this.isExpired(entry)) {
                    await this.delete(key);
                    this.stats.misses++;
                    timer.end();
                    return null;
                }
                
                // Update access time for LRU
                this.updateAccess(key);
                
                // Decompress if needed
                const value = await this.decompressValue(entry.value);
                
                this.stats.hits++;
                timer.end();
                return value;
            }
            
            // Check persistent storage
            if (this.config.persistentStorage && this.db) {
                const entry = await this.getFromPersistent(key);
                if (entry && !this.isExpired(entry)) {
                    // Load into memory cache
                    this.cache.set(key, entry);
                    this.updateAccess(key);
                    
                    const value = await this.decompressValue(entry.value);
                    this.stats.hits++;
                    timer.end();
                    return value;
                }
            }
            
            this.stats.misses++;
            timer.end();
            return null;
            
        } catch (error) {
            this.performanceMonitor.recordError('get', error);
            timer.end();
            return null;
        }
    }
    
    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {object} options - Cache options
     * @returns {Promise<void>}
     */
    async set(key, value, options = {}) {
        const timer = this.performanceMonitor.startTimer('set');
        
        try {
            // Compress value if needed
            const compressedValue = await this.compressValue(value);
            
            const entry = {
                key,
                value: compressedValue,
                timestamp: Date.now(),
                accessTime: Date.now(),
                ttl: options.ttl || this.config.ttl,
                size: this.estimateSize(compressedValue),
                compressed: compressedValue !== value
            };
            
            // Check cache size and evict if needed
            if (this.cache.size >= this.config.maxSize) {
                await this.evict();
            }
            
            // Set in memory cache
            this.cache.set(key, entry);
            this.updateAccess(key);
            this.stats.totalSize += entry.size;
            
            // Set TTL timer
            if (entry.ttl > 0) {
                this.setTTLTimer(key, entry.ttl);
            }
            
            // Persist if enabled
            if (this.config.persistentStorage && this.db) {
                await this.setInPersistent(entry);
            }
            
            timer.end();
            
        } catch (error) {
            this.performanceMonitor.recordError('set', error);
            timer.end();
            throw error;
        }
    }
    
    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Whether key was deleted
     */
    async delete(key) {
        if (!this.cache.has(key)) return false;
        
        const entry = this.cache.get(key);
        this.stats.totalSize -= entry.size;
        
        // Clear from memory
        this.cache.delete(key);
        this.accessOrder.delete(key);
        
        // Clear TTL timer
        if (this.ttlTimers.has(key)) {
            clearTimeout(this.ttlTimers.get(key));
            this.ttlTimers.delete(key);
        }
        
        // Delete from persistent storage
        if (this.config.persistentStorage && this.db) {
            await this.deleteFromPersistent(key);
        }
        
        return true;
    }
    
    /**
     * Clear entire cache
     * @returns {Promise<void>}
     */
    async clear() {
        // Clear all TTL timers
        for (const timer of this.ttlTimers.values()) {
            clearTimeout(timer);
        }
        
        // Clear memory cache
        this.cache.clear();
        this.accessOrder.clear();
        this.ttlTimers.clear();
        this.stats.totalSize = 0;
        
        // Clear persistent storage
        if (this.config.persistentStorage && this.db) {
            await this.clearPersistent();
        }
    }
    
    /**
     * Update access time for LRU
     * @private
     */
    updateAccess(key) {
        const now = Date.now();
        this.accessOrder.set(key, now);
        
        if (this.cache.has(key)) {
            this.cache.get(key).accessTime = now;
        }
    }
    
    /**
     * Check if entry is expired
     * @private
     */
    isExpired(entry) {
        if (entry.ttl <= 0) return false;
        return Date.now() - entry.timestamp > entry.ttl;
    }
    
    /**
     * Set TTL timer for entry
     * @private
     */
    setTTLTimer(key, ttl) {
        // Clear existing timer
        if (this.ttlTimers.has(key)) {
            clearTimeout(this.ttlTimers.get(key));
        }
        
        // Set new timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);
        
        this.ttlTimers.set(key, timer);
    }
    
    /**
     * Evict entries based on strategy
     * @private
     */
    async evict() {
        const timer = this.performanceMonitor.startTimer('evict');
        
        switch (this.config.strategy) {
            case 'LRU':
                await this.evictLRU();
                break;
            case 'LFU':
                await this.evictLFU();
                break;
            case 'FIFO':
                await this.evictFIFO();
                break;
            default:
                await this.evictLRU();
        }
        
        this.stats.evictions++;
        timer.end();
    }
    
    /**
     * Evict using LRU strategy
     * @private
     */
    async evictLRU() {
        // Sort by access time
        const entries = Array.from(this.accessOrder.entries())
            .sort((a, b) => a[1] - b[1]);
        
        // Evict 10% of oldest entries
        const evictCount = Math.ceil(this.cache.size * 0.1);
        for (let i = 0; i < evictCount && i < entries.length; i++) {
            await this.delete(entries[i][0]);
        }
    }
    
    /**
     * Evict using LFU strategy
     * @private
     */
    async evictLFU() {
        // For simplicity, using access count approximation
        // In production, would track actual frequency
        await this.evictLRU();
    }
    
    /**
     * Evict using FIFO strategy
     * @private
     */
    async evictFIFO() {
        // Sort by timestamp
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Evict 10% of oldest entries
        const evictCount = Math.ceil(this.cache.size * 0.1);
        for (let i = 0; i < evictCount && i < entries.length; i++) {
            await this.delete(entries[i][0]);
        }
    }
    
    /**
     * Compress value if needed
     * @private
     */
    async compressValue(value) {
        if (!this.config.compressionEnabled) return value;
        
        const serialized = JSON.stringify(value);
        if (serialized.length < this.config.compressionThreshold) {
            return value;
        }
        
        try {
            // Simple compression using native CompressionStream if available
            if (typeof CompressionStream !== 'undefined') {
                const encoder = new TextEncoder();
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                writer.write(encoder.encode(serialized));
                writer.close();
                
                const compressed = await new Response(stream.readable).arrayBuffer();
                this.stats.compressions++;
                
                return {
                    _compressed: true,
                    data: Array.from(new Uint8Array(compressed))
                };
            }
        } catch (error) {
            console.warn('CacheStrategy: Compression failed', error);
        }
        
        return value;
    }
    
    /**
     * Decompress value if needed
     * @private
     */
    async decompressValue(value) {
        if (!value || !value._compressed) return value;
        
        try {
            // Decompress using native DecompressionStream if available
            if (typeof DecompressionStream !== 'undefined') {
                const compressed = new Uint8Array(value.data);
                const stream = new DecompressionStream('gzip');
                const writer = stream.writable.getWriter();
                writer.write(compressed);
                writer.close();
                
                const decompressed = await new Response(stream.readable).text();
                this.stats.decompressions++;
                
                return JSON.parse(decompressed);
            }
        } catch (error) {
            console.warn('CacheStrategy: Decompression failed', error);
        }
        
        return value;
    }
    
    /**
     * Estimate size of value
     * @private
     */
    estimateSize(value) {
        if (value._compressed) {
            return value.data.length;
        }
        
        const str = JSON.stringify(value);
        return str.length * 2; // Rough estimate for UTF-16
    }
    
    /**
     * Get from persistent storage
     * @private
     */
    async getFromPersistent(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Set in persistent storage
     * @private
     */
    async setInPersistent(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(entry);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Delete from persistent storage
     * @private
     */
    async deleteFromPersistent(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Clear persistent storage
     * @private
     */
    async clearPersistent() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Load cache from persistent storage
     * @private
     */
    async loadFromPersistent() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const entries = request.result;
                
                // Load non-expired entries into memory
                for (const entry of entries) {
                    if (!this.isExpired(entry)) {
                        this.cache.set(entry.key, entry);
                        this.updateAccess(entry.key);
                        this.stats.totalSize += entry.size;
                    }
                }
                
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Start memory monitoring
     * @private
     */
    startMemoryMonitoring() {
        if (!performance.memory) return;
        
        setInterval(() => {
            const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
            
            if (usage > this.config.memoryThreshold) {
                console.warn(`CacheStrategy: High memory usage (${(usage * 100).toFixed(1)}%)`);
                
                // Evict more aggressively
                const evictCount = Math.ceil(this.cache.size * 0.2);
                for (let i = 0; i < evictCount; i++) {
                    this.evict();
                }
            }
        }, 30000); // Check every 30 seconds
    }
    
    /**
     * Warm cache with common entries
     * @param {array} entries - Entries to warm cache with
     */
    async warmCache(entries) {
        const timer = this.performanceMonitor.startTimer('warmCache');
        
        for (const { key, value, options } of entries) {
            try {
                await this.set(key, value, options);
            } catch (error) {
                console.warn(`CacheStrategy: Failed to warm cache entry ${key}`, error);
            }
        }
        
        timer.end();
        console.log(`CacheStrategy: Warmed cache with ${entries.length} entries`);
    }
    
    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ?
            this.stats.hits / (this.stats.hits + this.stats.misses) : 0;
        
        return {
            ...this.stats,
            hitRate: (hitRate * 100).toFixed(2) + '%',
            size: this.cache.size,
            maxSize: this.config.maxSize,
            memoryUsage: this.stats.totalSize,
            strategy: this.config.strategy,
            compressionEnabled: this.config.compressionEnabled,
            persistentEnabled: this.config.persistentStorage
        };
    }
    
    /**
     * Get cache entries for debugging
     * @returns {array} Cache entries
     */
    getEntries() {
        return Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            timestamp: new Date(entry.timestamp),
            accessTime: new Date(entry.accessTime),
            ttl: entry.ttl,
            size: entry.size,
            compressed: entry.compressed,
            expired: this.isExpired(entry)
        }));
    }
}