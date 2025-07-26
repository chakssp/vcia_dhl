/**
 * TrackingStorage - IndexedDB Persistence Layer
 * 
 * Provides robust persistence for confidence tracking data using IndexedDB
 * as primary storage with automatic localStorage fallback. Implements
 * compression and chunking for large datasets.
 */

export default class TrackingStorage {
    constructor() {
        this.dbName = 'KCConfidenceTracker';
        this.dbVersion = 1;
        this.storeName = 'trackingData';
        this.db = null;
        this.isIndexedDBAvailable = this.checkIndexedDBSupport();
        this.localStoragePrefix = 'kc_tracking_';
        this.compressionEnabled = true;
        this.chunkSize = 50 * 1024; // 50KB chunks for localStorage
        
        // Performance metrics
        this.metrics = {
            reads: 0,
            writes: 0,
            compressionRatio: 0,
            averageReadTime: 0,
            averageWriteTime: 0
        };
        
        // Initialize storage
        this.initialize();
    }
    
    /**
     * Check if IndexedDB is supported
     * @returns {boolean} Whether IndexedDB is available
     */
    checkIndexedDBSupport() {
        try {
            if (!window.indexedDB) return false;
            
            // Test if we can actually use IndexedDB
            const testRequest = window.indexedDB.open('test', 1);
            testRequest.onsuccess = () => {
                const db = testRequest.result;
                db.close();
                window.indexedDB.deleteDatabase('test');
            };
            
            return true;
        } catch (e) {
            console.warn('IndexedDB not available:', e);
            return false;
        }
    }
    
    /**
     * Initialize storage system
     */
    async initialize() {
        if (this.isIndexedDBAvailable) {
            try {
                await this.initializeIndexedDB();
                console.log('TrackingStorage: Using IndexedDB');
            } catch (error) {
                console.error('Failed to initialize IndexedDB, falling back to localStorage:', error);
                this.isIndexedDBAvailable = false;
            }
        } else {
            console.log('TrackingStorage: Using localStorage fallback');
        }
    }
    
    /**
     * Initialize IndexedDB
     * @returns {Promise} Database initialization promise
     */
    initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'fileId' });
                    
                    // Create indexes for efficient queries
                    store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
                    store.createIndex('convergenceStatus', 'convergenceData.isConverged', { unique: false });
                    store.createIndex('confidence', 'currentConfidence', { unique: false });
                }
            };
        });
    }
    
    /**
     * Save tracking data
     * @param {string} fileId - File identifier
     * @param {object} data - Tracking data to save
     * @returns {Promise} Save operation promise
     */
    async save(fileId, data) {
        const startTime = Date.now();
        
        try {
            // Add metadata
            const dataToSave = {
                ...data,
                fileId,
                savedAt: new Date().toISOString(),
                currentConfidence: data.history.length > 0 ? 
                    data.history[data.history.length - 1].metrics.overall : 0
            };
            
            if (this.isIndexedDBAvailable && this.db) {
                await this.saveToIndexedDB(dataToSave);
            } else {
                await this.saveToLocalStorage(fileId, dataToSave);
            }
            
            // Update metrics
            this.updateMetrics('write', Date.now() - startTime);
            
        } catch (error) {
            console.error(`Failed to save tracking data for ${fileId}:`, error);
            
            // Try fallback if IndexedDB fails
            if (this.isIndexedDBAvailable) {
                console.log('Attempting localStorage fallback...');
                this.isIndexedDBAvailable = false;
                await this.saveToLocalStorage(fileId, data);
            } else {
                throw error;
            }
        }
    }
    
    /**
     * Save to IndexedDB
     * @param {object} data - Data to save
     * @returns {Promise} Save operation promise
     */
    saveToIndexedDB(data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('IndexedDB save failed'));
            
            transaction.onerror = () => reject(new Error('IndexedDB transaction failed'));
        });
    }
    
    /**
     * Save to localStorage with compression and chunking
     * @param {string} fileId - File identifier
     * @param {object} data - Data to save
     */
    async saveToLocalStorage(fileId, data) {
        try {
            // Compress data if enabled
            const serialized = JSON.stringify(data);
            const compressed = this.compressionEnabled ? 
                this.compress(serialized) : serialized;
            
            // Update compression metrics
            if (this.compressionEnabled) {
                this.metrics.compressionRatio = compressed.length / serialized.length;
            }
            
            // Check if data needs chunking
            if (compressed.length > this.chunkSize) {
                await this.saveChunked(fileId, compressed);
            } else {
                localStorage.setItem(this.localStoragePrefix + fileId, compressed);
            }
            
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                // Try to free up space
                await this.handleQuotaExceeded();
                
                // Retry with minimal data
                const minimalData = this.createMinimalData(data);
                localStorage.setItem(this.localStoragePrefix + fileId, JSON.stringify(minimalData));
            } else {
                throw error;
            }
        }
    }
    
    /**
     * Load tracking data
     * @param {string} fileId - File identifier
     * @returns {Promise<object>} Loaded tracking data
     */
    async load(fileId) {
        const startTime = Date.now();
        
        try {
            let data;
            
            if (this.isIndexedDBAvailable && this.db) {
                data = await this.loadFromIndexedDB(fileId);
            } else {
                data = await this.loadFromLocalStorage(fileId);
            }
            
            // Update metrics
            this.updateMetrics('read', Date.now() - startTime);
            
            return data;
            
        } catch (error) {
            console.error(`Failed to load tracking data for ${fileId}:`, error);
            return null;
        }
    }
    
    /**
     * Load from IndexedDB
     * @param {string} fileId - File identifier
     * @returns {Promise<object>} Loaded data
     */
    loadFromIndexedDB(fileId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(fileId);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                reject(new Error('IndexedDB load failed'));
            };
        });
    }
    
    /**
     * Load from localStorage with decompression
     * @param {string} fileId - File identifier
     * @returns {object} Loaded data
     */
    async loadFromLocalStorage(fileId) {
        try {
            // Check for chunked data
            const chunkInfo = localStorage.getItem(this.localStoragePrefix + fileId + '_chunks');
            
            let compressed;
            if (chunkInfo) {
                compressed = await this.loadChunked(fileId);
            } else {
                compressed = localStorage.getItem(this.localStoragePrefix + fileId);
            }
            
            if (!compressed) return null;
            
            // Decompress if needed
            const decompressed = this.compressionEnabled && this.isCompressed(compressed) ?
                this.decompress(compressed) : compressed;
            
            return JSON.parse(decompressed);
            
        } catch (error) {
            console.error(`Failed to load from localStorage: ${fileId}`, error);
            return null;
        }
    }
    
    /**
     * Load all tracking data
     * @returns {Promise<object>} All tracking data keyed by fileId
     */
    async loadAll() {
        const allData = {};
        
        if (this.isIndexedDBAvailable && this.db) {
            const data = await this.loadAllFromIndexedDB();
            data.forEach(item => {
                allData[item.fileId] = item;
            });
        } else {
            // Load from localStorage
            const keys = Object.keys(localStorage).filter(key => 
                key.startsWith(this.localStoragePrefix) && 
                !key.includes('_chunks') && 
                !key.includes('_chunk_')
            );
            
            for (const key of keys) {
                const fileId = key.replace(this.localStoragePrefix, '');
                const data = await this.loadFromLocalStorage(fileId);
                if (data) {
                    allData[fileId] = data;
                }
            }
        }
        
        return allData;
    }
    
    /**
     * Load all from IndexedDB
     * @returns {Promise<array>} Array of all tracking data
     */
    loadAllFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                reject(new Error('IndexedDB loadAll failed'));
            };
        });
    }
    
    /**
     * Delete tracking data
     * @param {string} fileId - File identifier
     * @returns {Promise} Delete operation promise
     */
    async delete(fileId) {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                await this.deleteFromIndexedDB(fileId);
            } else {
                await this.deleteFromLocalStorage(fileId);
            }
        } catch (error) {
            console.error(`Failed to delete tracking data for ${fileId}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete from IndexedDB
     * @param {string} fileId - File identifier
     * @returns {Promise} Delete operation promise
     */
    deleteFromIndexedDB(fileId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(fileId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('IndexedDB delete failed'));
        });
    }
    
    /**
     * Delete from localStorage including chunks
     * @param {string} fileId - File identifier
     */
    async deleteFromLocalStorage(fileId) {
        // Delete main entry
        localStorage.removeItem(this.localStoragePrefix + fileId);
        
        // Delete chunk info if exists
        const chunkInfo = localStorage.getItem(this.localStoragePrefix + fileId + '_chunks');
        if (chunkInfo) {
            const { chunks } = JSON.parse(chunkInfo);
            
            // Delete all chunks
            for (let i = 0; i < chunks; i++) {
                localStorage.removeItem(this.localStoragePrefix + fileId + '_chunk_' + i);
            }
            
            // Delete chunk info
            localStorage.removeItem(this.localStoragePrefix + fileId + '_chunks');
        }
    }
    
    /**
     * Clear all tracking data
     * @returns {Promise} Clear operation promise
     */
    async clearAll() {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                await this.clearIndexedDB();
            } else {
                this.clearLocalStorage();
            }
        } catch (error) {
            console.error('Failed to clear all tracking data:', error);
            throw error;
        }
    }
    
    /**
     * Clear IndexedDB
     * @returns {Promise} Clear operation promise
     */
    clearIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('IndexedDB clear failed'));
        });
    }
    
    /**
     * Clear localStorage
     */
    clearLocalStorage() {
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(this.localStoragePrefix)
        );
        
        keys.forEach(key => localStorage.removeItem(key));
    }
    
    /**
     * Simple compression using LZ-based algorithm
     * @param {string} data - Data to compress
     * @returns {string} Compressed data
     */
    compress(data) {
        // Simple RLE-based compression for demonstration
        // In production, use a proper compression library like lz-string
        let compressed = '';
        let count = 1;
        
        for (let i = 0; i < data.length; i++) {
            if (data[i] === data[i + 1] && count < 9) {
                count++;
            } else {
                if (count > 1) {
                    compressed += count + data[i];
                } else {
                    compressed += data[i];
                }
                count = 1;
            }
        }
        
        // Add compression marker
        return '¢' + compressed;
    }
    
    /**
     * Decompress data
     * @param {string} compressed - Compressed data
     * @returns {string} Decompressed data
     */
    decompress(compressed) {
        // Check for compression marker
        if (compressed[0] !== '¢') return compressed;
        
        compressed = compressed.slice(1);
        let decompressed = '';
        
        for (let i = 0; i < compressed.length; i++) {
            const char = compressed[i];
            if (char >= '2' && char <= '9' && i + 1 < compressed.length) {
                const count = parseInt(char);
                const nextChar = compressed[i + 1];
                decompressed += nextChar.repeat(count);
                i++;
            } else {
                decompressed += char;
            }
        }
        
        return decompressed;
    }
    
    /**
     * Check if data is compressed
     * @param {string} data - Data to check
     * @returns {boolean} Whether data is compressed
     */
    isCompressed(data) {
        return data && data[0] === '¢';
    }
    
    /**
     * Save data in chunks
     * @param {string} fileId - File identifier
     * @param {string} data - Data to save
     */
    async saveChunked(fileId, data) {
        const chunks = Math.ceil(data.length / this.chunkSize);
        
        // Save chunk info
        localStorage.setItem(this.localStoragePrefix + fileId + '_chunks', JSON.stringify({
            chunks,
            totalSize: data.length,
            timestamp: new Date().toISOString()
        }));
        
        // Save each chunk
        for (let i = 0; i < chunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, data.length);
            const chunk = data.slice(start, end);
            
            localStorage.setItem(this.localStoragePrefix + fileId + '_chunk_' + i, chunk);
        }
    }
    
    /**
     * Load chunked data
     * @param {string} fileId - File identifier
     * @returns {string} Reconstructed data
     */
    async loadChunked(fileId) {
        const chunkInfo = JSON.parse(
            localStorage.getItem(this.localStoragePrefix + fileId + '_chunks')
        );
        
        if (!chunkInfo) return null;
        
        let data = '';
        
        for (let i = 0; i < chunkInfo.chunks; i++) {
            const chunk = localStorage.getItem(this.localStoragePrefix + fileId + '_chunk_' + i);
            if (!chunk) {
                console.error(`Missing chunk ${i} for file ${fileId}`);
                return null;
            }
            data += chunk;
        }
        
        return data;
    }
    
    /**
     * Handle quota exceeded error
     */
    async handleQuotaExceeded() {
        console.warn('LocalStorage quota exceeded, cleaning up old data...');
        
        // Get all tracking entries
        const allData = await this.loadAll();
        const entries = Object.entries(allData);
        
        // Sort by last updated (oldest first)
        entries.sort((a, b) => 
            new Date(a[1].lastUpdated) - new Date(b[1].lastUpdated)
        );
        
        // Remove oldest 25%
        const toRemove = Math.ceil(entries.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            await this.delete(entries[i][0]);
        }
        
        console.log(`Removed ${toRemove} old tracking entries`);
    }
    
    /**
     * Create minimal data for quota exceeded scenarios
     * @param {object} data - Full tracking data
     * @returns {object} Minimal data
     */
    createMinimalData(data) {
        const latestMetrics = data.history.length > 0 ?
            data.history[data.history.length - 1] : null;
        
        return {
            fileId: data.fileId,
            startedAt: data.startedAt,
            lastUpdated: data.lastUpdated,
            metadata: data.metadata,
            summary: {
                iterations: data.history.length,
                currentConfidence: latestMetrics ? latestMetrics.metrics.overall : 0,
                isConverged: data.convergenceData ? data.convergenceData.isConverged : false
            },
            // Keep only last 10 history entries
            history: data.history.slice(-10)
        };
    }
    
    /**
     * Update performance metrics
     * @param {string} operation - Operation type (read/write)
     * @param {number} time - Operation time in ms
     */
    updateMetrics(operation, time) {
        if (operation === 'read') {
            this.metrics.reads++;
            this.metrics.averageReadTime = 
                (this.metrics.averageReadTime * (this.metrics.reads - 1) + time) / 
                this.metrics.reads;
        } else if (operation === 'write') {
            this.metrics.writes++;
            this.metrics.averageWriteTime = 
                (this.metrics.averageWriteTime * (this.metrics.writes - 1) + time) / 
                this.metrics.writes;
        }
    }
    
    /**
     * Get storage metrics
     * @returns {object} Current storage metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            storageType: this.isIndexedDBAvailable ? 'IndexedDB' : 'localStorage',
            compressionEnabled: this.compressionEnabled
        };
    }
    
    /**
     * Get storage size estimate
     * @returns {Promise<object>} Storage size information
     */
    async getStorageSize() {
        if (this.isIndexedDBAvailable && navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0,
                percentUsed: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
            };
        } else {
            // Estimate localStorage usage
            let totalSize = 0;
            const keys = Object.keys(localStorage).filter(key => 
                key.startsWith(this.localStoragePrefix)
            );
            
            keys.forEach(key => {
                totalSize += localStorage.getItem(key).length;
            });
            
            return {
                used: totalSize,
                quota: 5 * 1024 * 1024, // Assume 5MB limit
                percentUsed: (totalSize / (5 * 1024 * 1024)) * 100
            };
        }
    }
}

// Export for use in browser environment
if (typeof window !== 'undefined' && window.KnowledgeConsolidator) {
    window.KnowledgeConsolidator.TrackingStorage = TrackingStorage;
}