/**
 * CacheManager - Advanced Caching Layer
 * 
 * Provides memory cache with LRU eviction, Redis integration preparation,
 * cache invalidation strategies, and performance optimization
 * 
 * @version 2.0.0
 * @author Knowledge Consolidator Team
 */

class CacheManager {
    constructor(options = {}) {
        this.options = {
            // Memory cache settings
            maxMemorySize: options.maxMemorySize || 100 * 1024 * 1024, // 100MB
            maxEntries: options.maxEntries || 10000,
            defaultTTL: options.defaultTTL || 3600000, // 1 hour
            cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
            
            // Cache strategies
            evictionPolicy: options.evictionPolicy || 'lru', // lru, lfu, fifo
            preloadStrategy: options.preloadStrategy || 'none', // none, predictive, aggressive
            
            // Performance settings
            enableCompression: options.enableCompression !== false,
            enableMetrics: options.enableMetrics !== false,
            metricsRetention: options.metricsRetention || 24 * 60 * 60 * 1000, // 24 hours
            
            // Redis settings (for future VPS deployment)
            redis: {
                enabled: options.redis?.enabled || false,
                host: options.redis?.host || 'localhost',
                port: options.redis?.port || 6379,
                password: options.redis?.password,
                database: options.redis?.database || 0,
                keyPrefix: options.redis?.keyPrefix || 'kc:cache:'
            },
            
            // Cache zones
            zones: {
                files: { ttl: 1800000, maxSize: 50 * 1024 * 1024 }, // 30 min, 50MB
                embeddings: { ttl: 86400000, maxSize: 30 * 1024 * 1024 }, // 24 hours, 30MB
                analyses: { ttl: 3600000, maxSize: 10 * 1024 * 1024 }, // 1 hour, 10MB
                metadata: { ttl: 7200000, maxSize: 5 * 1024 * 1024 }, // 2 hours, 5MB
                api: { ttl: 300000, maxSize: 5 * 1024 * 1024 } // 5 minutes, 5MB
            },
            
            ...options
        };

        // Memory cache storage
        this.memoryCache = new Map();
        this.accessTimes = new Map();
        this.accessCounts = new Map();
        this.sizeMeta = new Map();

        // Cache zones
        this.zones = new Map();
        this._initializeZones();

        // Redis client (placeholder for future implementation)
        this.redisClient = null;

        // Metrics and statistics
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            totalRequests: 0,
            memoryUsage: 0,
            lastCleanup: Date.now(),
            performanceHistory: []
        };

        // Cache invalidation tracking
        this.invalidationRules = new Map();
        this.dependencyGraph = new Map();

        // Event handling
        this.eventHandlers = new Map();

        // Cleanup timer
        this.cleanupTimer = null;

        this._startCleanupTimer();
    }

    /**
     * Initialize the cache manager
     */
    async initialize() {
        try {
            await this._setupRedisConnection();
            await this._loadPreloadStrategies();
            
            this._emit('cache:initialized', { 
                service: 'CacheManager',
                zones: Array.from(this.zones.keys()),
                redisEnabled: this.options.redis.enabled
            });
            
            return { success: true, message: 'CacheManager initialized' };
        } catch (error) {
            this._emit('cache:initialization_failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Set cache entry with zone support
     */
    async set(key, value, options = {}) {
        const zone = options.zone || 'default';
        const ttl = options.ttl || this._getZoneTTL(zone);
        const tags = options.tags || [];
        const compress = options.compress !== false && this.options.enableCompression;

        try {
            // Prepare cache entry
            const entry = await this._createCacheEntry(value, {
                ttl,
                zone,
                tags,
                compress,
                metadata: options.metadata
            });

            // Store in memory cache
            await this._setMemoryCache(key, entry, zone);

            // Store in Redis if enabled
            if (this.redisClient) {
                await this._setRedisCache(key, entry, zone);
            }

            // Track dependencies
            if (options.dependencies) {
                this._trackDependencies(key, options.dependencies);
            }

            this.metrics.sets++;
            this.metrics.totalRequests++;

            this._emit('cache:set', { 
                key, 
                zone, 
                size: entry.size,
                compressed: entry.compressed
            });

            return { success: true, key, zone, size: entry.size };

        } catch (error) {
            this._emit('cache:set_failed', { key, zone, error: error.message });
            throw error;
        }
    }

    /**
     * Get cache entry with fallback strategies
     */
    async get(key, options = {}) {
        const zone = options.zone || 'default';
        const acceptStale = options.acceptStale || false;

        try {
            // Try memory cache first
            let entry = await this._getMemoryCache(key, zone);
            
            // Try Redis if not found in memory
            if (!entry && this.redisClient) {
                entry = await this._getRedisCache(key, zone);
                
                // Promote to memory cache if found
                if (entry) {
                    await this._setMemoryCache(key, entry, zone);
                }
            }

            if (!entry) {
                this.metrics.misses++;
                this.metrics.totalRequests++;
                
                this._emit('cache:miss', { key, zone });
                return { found: false, key, zone };
            }

            // Check expiration
            if (entry.expiresAt && entry.expiresAt < Date.now()) {
                if (!acceptStale) {
                    await this.delete(key, { zone });
                    this.metrics.misses++;
                    this.metrics.totalRequests++;
                    
                    this._emit('cache:expired', { key, zone });
                    return { found: false, key, zone, expired: true };
                }
            }

            // Update access tracking
            this._updateAccessTracking(key);

            // Decompress if needed
            const value = await this._extractValue(entry);

            this.metrics.hits++;
            this.metrics.totalRequests++;

            this._emit('cache:hit', { 
                key, 
                zone, 
                size: entry.size,
                compressed: entry.compressed
            });

            return { 
                found: true, 
                value, 
                key, 
                zone,
                metadata: entry.metadata,
                cachedAt: entry.createdAt,
                accessCount: this.accessCounts.get(key) || 1
            };

        } catch (error) {
            this._emit('cache:get_failed', { key, zone, error: error.message });
            throw error;
        }
    }

    /**
     * Delete cache entry
     */
    async delete(key, options = {}) {
        const zone = options.zone || 'default';

        try {
            // Delete from memory
            const deleted = this._deleteMemoryCache(key, zone);

            // Delete from Redis if enabled
            if (this.redisClient) {
                await this._deleteRedisCache(key, zone);
            }

            // Clean up dependencies
            this._cleanupDependencies(key);

            if (deleted) {
                this.metrics.deletes++;
                this._emit('cache:deleted', { key, zone });
            }

            return { success: true, deleted, key, zone };

        } catch (error) {
            this._emit('cache:delete_failed', { key, zone, error: error.message });
            throw error;
        }
    }

    /**
     * Clear entire cache or specific zone
     */
    async clear(options = {}) {
        const zone = options.zone;

        try {
            let clearedCount = 0;

            if (zone) {
                // Clear specific zone
                const zoneData = this.zones.get(zone);
                if (zoneData) {
                    for (const key of zoneData.keys) {
                        await this.delete(key, { zone });
                        clearedCount++;
                    }
                }
            } else {
                // Clear all zones
                clearedCount = this.memoryCache.size;
                this.memoryCache.clear();
                this.accessTimes.clear();
                this.accessCounts.clear();
                this.sizeMeta.clear();

                for (const zoneData of this.zones.values()) {
                    zoneData.keys.clear();
                    zoneData.currentSize = 0;
                }

                // Clear Redis if enabled
                if (this.redisClient) {
                    await this._clearRedisCache();
                }
            }

            this._emit('cache:cleared', { zone, clearedCount });
            return { success: true, zone, clearedCount };

        } catch (error) {
            this._emit('cache:clear_failed', { zone, error: error.message });
            throw error;
        }
    }

    /**
     * Cache invalidation by tags
     */
    async invalidateByTags(tags, options = {}) {
        const zone = options.zone;
        let invalidatedCount = 0;

        try {
            const keysToInvalidate = new Set();

            // Find keys with matching tags
            for (const [key, entry] of this.memoryCache) {
                if (zone && entry.zone !== zone) continue;
                
                if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
                    keysToInvalidate.add(key);
                }
            }

            // Invalidate found keys
            for (const key of keysToInvalidate) {
                const entry = this.memoryCache.get(key);
                await this.delete(key, { zone: entry.zone });
                invalidatedCount++;
            }

            this._emit('cache:invalidated_by_tags', { 
                tags, 
                zone, 
                invalidatedCount 
            });

            return { success: true, tags, invalidatedCount };

        } catch (error) {
            this._emit('cache:invalidation_failed', { tags, error: error.message });
            throw error;
        }
    }

    /**
     * Cache invalidation by dependencies
     */
    async invalidateByDependency(dependency) {
        const dependentKeys = this.dependencyGraph.get(dependency) || new Set();
        let invalidatedCount = 0;

        try {
            for (const key of dependentKeys) {
                const entry = this.memoryCache.get(key);
                if (entry) {
                    await this.delete(key, { zone: entry.zone });
                    invalidatedCount++;
                }
            }

            this._emit('cache:invalidated_by_dependency', { 
                dependency, 
                invalidatedCount 
            });

            return { success: true, dependency, invalidatedCount };

        } catch (error) {
            this._emit('cache:dependency_invalidation_failed', { 
                dependency, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Preload cache with predicted data
     */
    async preload(keys, options = {}) {
        const zone = options.zone || 'default';
        const loader = options.loader;

        if (!loader || typeof loader !== 'function') {
            throw new Error('Preload requires a loader function');
        }

        const results = {
            loaded: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };

        try {
            for (const key of keys) {
                try {
                    // Skip if already cached
                    const existing = await this.get(key, { zone });
                    if (existing.found) {
                        results.skipped++;
                        continue;
                    }

                    // Load data
                    const data = await loader(key);
                    await this.set(key, data, { zone, ...options });
                    results.loaded++;

                } catch (error) {
                    results.failed++;
                    results.errors.push({ key, error: error.message });
                }
            }

            this._emit('cache:preload_completed', { 
                zone, 
                results,
                keyCount: keys.length 
            });

            return { success: true, results };

        } catch (error) {
            this._emit('cache:preload_failed', { zone, error: error.message });
            throw error;
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.metrics.totalRequests > 0 ? 
            (this.metrics.hits / this.metrics.totalRequests) * 100 : 0;

        const zoneStats = {};
        for (const [zoneName, zoneData] of this.zones) {
            zoneStats[zoneName] = {
                entryCount: zoneData.keys.size,
                currentSize: zoneData.currentSize,
                maxSize: zoneData.maxSize,
                utilizationPercentage: (zoneData.currentSize / zoneData.maxSize) * 100
            };
        }

        return {
            ...this.metrics,
            hitRate: hitRate.toFixed(2),
            totalEntries: this.memoryCache.size,
            memoryUsage: this._calculateMemoryUsage(),
            zones: zoneStats,
            redisConnected: !!this.redisClient,
            lastCleanup: this.metrics.lastCleanup,
            avgResponseTime: this._calculateAvgResponseTime()
        };
    }

    /**
     * Memory cache operations
     */
    async _setMemoryCache(key, entry, zone) {
        // Check zone capacity
        const zoneData = this.zones.get(zone);
        if (zoneData && zoneData.currentSize + entry.size > zoneData.maxSize) {
            await this._evictFromZone(zone, entry.size);
        }

        // Store entry
        this.memoryCache.set(key, entry);
        this.accessTimes.set(key, Date.now());
        this.accessCounts.set(key, 1);
        this.sizeMeta.set(key, entry.size);

        // Update zone tracking
        if (zoneData) {
            zoneData.keys.add(key);
            zoneData.currentSize += entry.size;
        }

        // Check global memory limits
        if (this._getTotalMemoryUsage() > this.options.maxMemorySize) {
            await this._evictLRU();
        }
    }

    async _getMemoryCache(key, zone) {
        const entry = this.memoryCache.get(key);
        if (entry && entry.zone === zone) {
            return entry;
        }
        return null;
    }

    _deleteMemoryCache(key, zone) {
        const entry = this.memoryCache.get(key);
        if (!entry || entry.zone !== zone) {
            return false;
        }

        this.memoryCache.delete(key);
        this.accessTimes.delete(key);
        this.accessCounts.delete(key);
        const size = this.sizeMeta.get(key) || 0;
        this.sizeMeta.delete(key);

        // Update zone tracking
        const zoneData = this.zones.get(zone);
        if (zoneData) {
            zoneData.keys.delete(key);
            zoneData.currentSize = Math.max(0, zoneData.currentSize - size);
        }

        return true;
    }

    /**
     * Eviction strategies
     */
    async _evictFromZone(zone, requiredSpace) {
        const zoneData = this.zones.get(zone);
        if (!zoneData) return;

        const keysToEvict = this._selectKeysForEviction(zoneData.keys, requiredSpace);
        
        for (const key of keysToEvict) {
            await this.delete(key, { zone });
            this.metrics.evictions++;
        }
    }

    async _evictLRU() {
        if (this.memoryCache.size === 0) return;

        // Find least recently used entry
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, time] of this.accessTimes) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const entry = this.memoryCache.get(oldestKey);
            await this.delete(oldestKey, { zone: entry.zone });
            this.metrics.evictions++;
        }
    }

    _selectKeysForEviction(keys, requiredSpace) {
        const candidates = Array.from(keys).map(key => ({
            key,
            accessTime: this.accessTimes.get(key) || 0,
            accessCount: this.accessCounts.get(key) || 0,
            size: this.sizeMeta.get(key) || 0
        }));

        // Sort by eviction policy
        switch (this.options.evictionPolicy) {
            case 'lru':
                candidates.sort((a, b) => a.accessTime - b.accessTime);
                break;
            case 'lfu':
                candidates.sort((a, b) => a.accessCount - b.accessCount);
                break;
            case 'fifo':
                // Already in insertion order
                break;
        }

        const toEvict = [];
        let freedSpace = 0;

        for (const candidate of candidates) {
            toEvict.push(candidate.key);
            freedSpace += candidate.size;
            
            if (freedSpace >= requiredSpace) {
                break;
            }
        }

        return toEvict;
    }

    /**
     * Utility methods
     */
    async _createCacheEntry(value, options) {
        let data = value;
        let compressed = false;

        // Compress if enabled and beneficial
        if (options.compress && this._shouldCompress(value)) {
            data = await this._compress(value);
            compressed = true;
        }

        const size = this._calculateSize(data);

        return {
            data,
            compressed,
            size,
            zone: options.zone,
            tags: options.tags || [],
            metadata: options.metadata || {},
            createdAt: Date.now(),
            expiresAt: options.ttl ? Date.now() + options.ttl : null
        };
    }

    async _extractValue(entry) {
        if (entry.compressed) {
            return await this._decompress(entry.data);
        }
        return entry.data;
    }

    _shouldCompress(value) {
        // Compress if data is large enough to benefit
        const size = this._calculateSize(value);
        return size > 1024; // 1KB threshold
    }

    _calculateSize(data) {
        if (typeof data === 'string') {
            return data.length * 2; // Approximate UTF-16 size
        }
        return JSON.stringify(data).length * 2;
    }

    _getTotalMemoryUsage() {
        let total = 0;
        for (const size of this.sizeMeta.values()) {
            total += size;
        }
        return total;
    }

    _updateAccessTracking(key) {
        this.accessTimes.set(key, Date.now());
        const currentCount = this.accessCounts.get(key) || 0;
        this.accessCounts.set(key, currentCount + 1);
    }

    _initializeZones() {
        for (const [zoneName, zoneConfig] of Object.entries(this.options.zones)) {
            this.zones.set(zoneName, {
                ...zoneConfig,
                keys: new Set(),
                currentSize: 0
            });
        }

        // Default zone
        if (!this.zones.has('default')) {
            this.zones.set('default', {
                ttl: this.options.defaultTTL,
                maxSize: this.options.maxMemorySize * 0.2,
                keys: new Set(),
                currentSize: 0
            });
        }
    }

    _getZoneTTL(zone) {
        const zoneData = this.zones.get(zone);
        return zoneData ? zoneData.ttl : this.options.defaultTTL;
    }

    _startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this._performCleanup();
        }, this.options.cleanupInterval);
    }

    _performCleanup() {
        const now = Date.now();
        const expiredKeys = [];

        // Find expired entries
        for (const [key, entry] of this.memoryCache) {
            if (entry.expiresAt && entry.expiresAt < now) {
                expiredKeys.push({ key, zone: entry.zone });
            }
        }

        // Remove expired entries
        for (const { key, zone } of expiredKeys) {
            this.delete(key, { zone });
        }

        this.metrics.lastCleanup = now;
        
        if (expiredKeys.length > 0) {
            this._emit('cache:cleanup', { 
                expiredCount: expiredKeys.length,
                timestamp: now 
            });
        }
    }

    /**
     * Compression methods (placeholder implementations)
     */
    async _compress(data) {
        // TODO: Implement actual compression (e.g., using pako.js)
        return JSON.stringify(data);
    }

    async _decompress(data) {
        // TODO: Implement actual decompression
        return JSON.parse(data);
    }

    /**
     * Event handling
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    _emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`CacheManager event handler error:`, error);
            }
        });

        // Emit to global event bus if available
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit(event, data);
        }
    }

    /**
     * Dependency tracking
     */
    _trackDependencies(key, dependencies) {
        for (const dependency of dependencies) {
            if (!this.dependencyGraph.has(dependency)) {
                this.dependencyGraph.set(dependency, new Set());
            }
            this.dependencyGraph.get(dependency).add(key);
        }
    }

    _cleanupDependencies(key) {
        for (const [dependency, dependentKeys] of this.dependencyGraph) {
            dependentKeys.delete(key);
            if (dependentKeys.size === 0) {
                this.dependencyGraph.delete(dependency);
            }
        }
    }

    _calculateAvgResponseTime() {
        if (this.metrics.performanceHistory.length === 0) return 0;
        
        const sum = this.metrics.performanceHistory.reduce((acc, time) => acc + time, 0);
        return sum / this.metrics.performanceHistory.length;
    }

    _calculateMemoryUsage() {
        return this._getTotalMemoryUsage();
    }

    /**
     * Placeholder Redis methods for future VPS deployment
     */
    async _setupRedisConnection() {
        if (!this.options.redis.enabled) return;
        
        // TODO: Implement Redis connection
        // this.redisClient = new Redis(this.options.redis);
    }

    async _setRedisCache(key, entry, zone) {
        // TODO: Implement Redis SET operation
    }

    async _getRedisCache(key, zone) {
        // TODO: Implement Redis GET operation
        return null;
    }

    async _deleteRedisCache(key, zone) {
        // TODO: Implement Redis DELETE operation
    }

    async _clearRedisCache() {
        // TODO: Implement Redis CLEAR operation
    }

    async _loadPreloadStrategies() {
        // TODO: Implement preload strategy loading
    }

    /**
     * Cleanup on service stop
     */
    stop() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        if (this.redisClient) {
            // TODO: Close Redis connection
        }

        this._emit('cache:stopped', { timestamp: Date.now() });
    }
}

// Export for V2 integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
} else if (typeof window !== 'undefined') {
    window.CacheManager = CacheManager;
}