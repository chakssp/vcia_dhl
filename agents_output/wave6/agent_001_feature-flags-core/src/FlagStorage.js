/**
 * FlagStorage.js - Persistent storage layer for ML feature flags
 * 
 * Provides:
 * - LocalStorage persistence with compression
 * - Atomic operations for thread safety
 * - Migration support for schema changes
 * - Backup and restore functionality
 * - Change history tracking
 * 
 * @module FlagStorage
 */

export class FlagStorage {
    constructor(storageKey = 'ml_feature_flags') {
        this.storageKey = storageKey;
        this.historyKey = `${storageKey}_history`;
        this.backupKey = `${storageKey}_backup`;
        this.versionKey = `${storageKey}_version`;
        this.currentVersion = '1.0.0';
        this.maxHistorySize = 100;
        this.logger = this._createLogger();
        this._initializeStorage();
    }

    /**
     * Create logger instance
     */
    _createLogger() {
        return {
            info: (msg, data) => console.log(`[FlagStorage] ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`[FlagStorage] ${msg}`, data || ''),
            error: (msg, data) => console.error(`[FlagStorage] ${msg}`, data || '')
        };
    }

    /**
     * Initialize storage and run migrations if needed
     */
    _initializeStorage() {
        try {
            const version = localStorage.getItem(this.versionKey);
            if (!version) {
                // First time initialization
                this._setDefaults();
            } else if (version !== this.currentVersion) {
                // Run migrations
                this._runMigrations(version, this.currentVersion);
            }
        } catch (error) {
            this.logger.error('Failed to initialize storage:', error);
            this._setDefaults();
        }
    }

    /**
     * Set default values for first-time initialization
     */
    _setDefaults() {
        const defaults = {
            flags: {},
            metadata: {
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                environment: this._detectEnvironment()
            }
        };

        this._saveToStorage(this.storageKey, defaults);
        localStorage.setItem(this.versionKey, this.currentVersion);
        this._saveToStorage(this.historyKey, []);
        
        this.logger.info('Storage initialized with defaults');
    }

    /**
     * Detect current environment
     */
    _detectEnvironment() {
        // Simple environment detection
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('staging')) {
            return 'staging';
        }
        return 'production';
    }

    /**
     * Run migrations between versions
     */
    _runMigrations(fromVersion, toVersion) {
        this.logger.info(`Running migrations from ${fromVersion} to ${toVersion}`);
        
        // Backup current data before migration
        this.createBackup('pre_migration');

        try {
            // Define migration functions for each version jump
            const migrations = {
                '0.9.0_to_1.0.0': this._migrateTo100.bind(this)
                // Add more migrations as needed
            };

            // Execute relevant migrations
            const migrationKey = `${fromVersion}_to_${toVersion}`;
            if (migrations[migrationKey]) {
                migrations[migrationKey]();
            }

            localStorage.setItem(this.versionKey, toVersion);
            this.logger.info('Migrations completed successfully');
        } catch (error) {
            this.logger.error('Migration failed:', error);
            this.restoreBackup('pre_migration');
            throw error;
        }
    }

    /**
     * Example migration function
     */
    _migrateTo100() {
        const data = this._loadFromStorage(this.storageKey);
        // Perform migration logic here
        // Example: Add new required fields
        if (data && data.flags) {
            Object.entries(data.flags).forEach(([key, flag]) => {
                if (!flag.metadata) {
                    flag.metadata = {
                        createdAt: new Date().toISOString(),
                        createdBy: 'system'
                    };
                }
            });
            this._saveToStorage(this.storageKey, data);
        }
    }

    /**
     * Save data to localStorage with compression
     */
    _saveToStorage(key, data) {
        try {
            const serialized = JSON.stringify(data);
            
            // Compress if data is large (> 100KB)
            if (serialized.length > 100000) {
                const compressed = this._compress(serialized);
                localStorage.setItem(key, compressed);
                localStorage.setItem(`${key}_compressed`, 'true');
            } else {
                localStorage.setItem(key, serialized);
                localStorage.removeItem(`${key}_compressed`);
            }
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.logger.warn('Storage quota exceeded, attempting cleanup');
                this._cleanupOldData();
                // Retry once after cleanup
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                } catch (retryError) {
                    this.logger.error('Failed to save after cleanup:', retryError);
                    throw retryError;
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Load data from localStorage with decompression
     */
    _loadFromStorage(key) {
        try {
            const compressed = localStorage.getItem(`${key}_compressed`);
            const data = localStorage.getItem(key);
            
            if (!data) return null;

            if (compressed === 'true') {
                const decompressed = this._decompress(data);
                return JSON.parse(decompressed);
            }
            
            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Failed to load from storage: ${key}`, error);
            return null;
        }
    }

    /**
     * Simple compression using LZ-string algorithm concept
     * Note: In production, use a proper compression library
     */
    _compress(data) {
        // Simple compression: replace repeated patterns
        let compressed = data;
        const patterns = [
            { find: '"type":', replace: '$T:' },
            { find: '"value":', replace: '$V:' },
            { find: '"description":', replace: '$D:' },
            { find: '"metadata":', replace: '$M:' },
            { find: '"dependencies":', replace: '$P:' }
        ];
        
        patterns.forEach(pattern => {
            compressed = compressed.split(pattern.find).join(pattern.replace);
        });
        
        return `COMPRESSED:${compressed}`;
    }

    /**
     * Decompress data
     */
    _decompress(data) {
        if (!data.startsWith('COMPRESSED:')) {
            return data;
        }

        let decompressed = data.substring(11); // Remove 'COMPRESSED:' prefix
        const patterns = [
            { find: '$T:', replace: '"type":' },
            { find: '$V:', replace: '"value":' },
            { find: '$D:', replace: '"description":' },
            { find: '$M:', replace: '"metadata":' },
            { find: '$P:', replace: '"dependencies":' }
        ];
        
        patterns.forEach(pattern => {
            decompressed = decompressed.split(pattern.find).join(pattern.replace);
        });
        
        return decompressed;
    }

    /**
     * Clean up old data to free storage space
     */
    _cleanupOldData() {
        // Remove old history entries
        const history = this._loadFromStorage(this.historyKey) || [];
        if (history.length > this.maxHistorySize) {
            const trimmedHistory = history.slice(-this.maxHistorySize);
            this._saveToStorage(this.historyKey, trimmedHistory);
        }

        // Remove old backups (keep only last 5)
        const backupKeys = Object.keys(localStorage)
            .filter(key => key.startsWith(this.backupKey))
            .sort()
            .slice(0, -5);
        
        backupKeys.forEach(key => localStorage.removeItem(key));
    }

    /**
     * Get all flags from storage
     */
    getAllFlags() {
        const data = this._loadFromStorage(this.storageKey);
        return data ? data.flags : {};
    }

    /**
     * Get a specific flag
     */
    getFlag(key) {
        const flags = this.getAllFlags();
        return flags[key] || null;
    }

    /**
     * Save a single flag (atomic operation)
     */
    saveFlag(key, config) {
        try {
            // Use a simple mutex pattern for thread safety
            const lockKey = `${this.storageKey}_lock`;
            const lockId = Math.random().toString(36);
            
            // Try to acquire lock
            if (localStorage.getItem(lockKey)) {
                // Wait and retry
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(this.saveFlag(key, config));
                    }, 10);
                });
            }

            localStorage.setItem(lockKey, lockId);

            // Perform operation
            const data = this._loadFromStorage(this.storageKey) || { flags: {}, metadata: {} };
            
            // Add to history
            this._addToHistory({
                action: data.flags[key] ? 'update' : 'create',
                flagKey: key,
                oldValue: data.flags[key] || null,
                newValue: config,
                timestamp: new Date().toISOString()
            });

            // Update flag
            data.flags[key] = {
                ...config,
                metadata: {
                    ...config.metadata,
                    lastUpdated: new Date().toISOString()
                }
            };
            
            data.metadata.lastUpdated = new Date().toISOString();
            
            this._saveToStorage(this.storageKey, data);
            
            // Release lock
            if (localStorage.getItem(lockKey) === lockId) {
                localStorage.removeItem(lockKey);
            }

            this.logger.info(`Flag saved: ${key}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to save flag ${key}:`, error);
            return false;
        }
    }

    /**
     * Save multiple flags atomically
     */
    saveFlags(flags) {
        try {
            const data = this._loadFromStorage(this.storageKey) || { flags: {}, metadata: {} };
            
            // Add to history
            Object.entries(flags).forEach(([key, config]) => {
                this._addToHistory({
                    action: data.flags[key] ? 'update' : 'create',
                    flagKey: key,
                    oldValue: data.flags[key] || null,
                    newValue: config,
                    timestamp: new Date().toISOString()
                });
            });

            // Update all flags
            Object.entries(flags).forEach(([key, config]) => {
                data.flags[key] = {
                    ...config,
                    metadata: {
                        ...config.metadata,
                        lastUpdated: new Date().toISOString()
                    }
                };
            });
            
            data.metadata.lastUpdated = new Date().toISOString();
            
            this._saveToStorage(this.storageKey, data);
            this.logger.info(`Saved ${Object.keys(flags).length} flags`);
            return true;
        } catch (error) {
            this.logger.error('Failed to save flags:', error);
            return false;
        }
    }

    /**
     * Delete a flag
     */
    deleteFlag(key) {
        try {
            const data = this._loadFromStorage(this.storageKey);
            if (!data || !data.flags[key]) {
                return false;
            }

            // Add to history
            this._addToHistory({
                action: 'delete',
                flagKey: key,
                oldValue: data.flags[key],
                newValue: null,
                timestamp: new Date().toISOString()
            });

            delete data.flags[key];
            data.metadata.lastUpdated = new Date().toISOString();
            
            this._saveToStorage(this.storageKey, data);
            this.logger.info(`Flag deleted: ${key}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete flag ${key}:`, error);
            return false;
        }
    }

    /**
     * Add entry to history
     */
    _addToHistory(entry) {
        try {
            const history = this._loadFromStorage(this.historyKey) || [];
            history.push(entry);
            
            // Keep only recent history
            if (history.length > this.maxHistorySize) {
                history.splice(0, history.length - this.maxHistorySize);
            }
            
            this._saveToStorage(this.historyKey, history);
        } catch (error) {
            this.logger.warn('Failed to add history entry:', error);
        }
    }

    /**
     * Get flag history
     */
    getHistory(flagKey = null, limit = 50) {
        const history = this._loadFromStorage(this.historyKey) || [];
        
        let filtered = history;
        if (flagKey) {
            filtered = history.filter(entry => entry.flagKey === flagKey);
        }
        
        return filtered.slice(-limit);
    }

    /**
     * Create a backup
     */
    createBackup(name = 'manual') {
        try {
            const data = this._loadFromStorage(this.storageKey);
            const backupKey = `${this.backupKey}_${name}_${Date.now()}`;
            
            this._saveToStorage(backupKey, {
                data,
                timestamp: new Date().toISOString(),
                name
            });
            
            this.logger.info(`Backup created: ${name}`);
            return backupKey;
        } catch (error) {
            this.logger.error('Failed to create backup:', error);
            return null;
        }
    }

    /**
     * Restore from backup
     */
    restoreBackup(backupKeyOrName) {
        try {
            // Find backup key
            let backupKey = backupKeyOrName;
            if (!backupKeyOrName.startsWith(this.backupKey)) {
                // Search for backup by name
                const keys = Object.keys(localStorage)
                    .filter(key => key.startsWith(`${this.backupKey}_${backupKeyOrName}_`))
                    .sort()
                    .reverse();
                
                if (keys.length === 0) {
                    throw new Error(`No backup found with name: ${backupKeyOrName}`);
                }
                backupKey = keys[0];
            }

            const backup = this._loadFromStorage(backupKey);
            if (!backup || !backup.data) {
                throw new Error('Invalid backup data');
            }

            // Create backup of current state before restore
            this.createBackup('pre_restore');

            // Restore data
            this._saveToStorage(this.storageKey, backup.data);
            
            this.logger.info(`Restored from backup: ${backupKey}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to restore backup:', error);
            return false;
        }
    }

    /**
     * List available backups
     */
    listBackups() {
        const backups = [];
        const keys = Object.keys(localStorage)
            .filter(key => key.startsWith(this.backupKey));
        
        keys.forEach(key => {
            try {
                const backup = this._loadFromStorage(key);
                if (backup) {
                    backups.push({
                        key,
                        name: backup.name,
                        timestamp: backup.timestamp,
                        size: JSON.stringify(backup).length
                    });
                }
            } catch (error) {
                this.logger.warn(`Invalid backup: ${key}`);
            }
        });
        
        return backups.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    /**
     * Clear all data (use with caution!)
     */
    clearAll() {
        try {
            // Create final backup before clearing
            this.createBackup('pre_clear');

            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.historyKey);
            localStorage.removeItem(this.versionKey);
            
            // Clear all backups
            Object.keys(localStorage)
                .filter(key => key.startsWith(this.backupKey))
                .forEach(key => localStorage.removeItem(key));
            
            this.logger.info('All data cleared');
            return true;
        } catch (error) {
            this.logger.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     */
    getStats() {
        const data = this._loadFromStorage(this.storageKey) || { flags: {} };
        const history = this._loadFromStorage(this.historyKey) || [];
        const backups = this.listBackups();
        
        const totalSize = Object.keys(localStorage)
            .filter(key => key.startsWith(this.storageKey) || 
                          key.startsWith(this.historyKey) || 
                          key.startsWith(this.backupKey))
            .reduce((total, key) => {
                return total + (localStorage.getItem(key) || '').length;
            }, 0);

        return {
            flagCount: Object.keys(data.flags).length,
            historyCount: history.length,
            backupCount: backups.length,
            totalSizeBytes: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            environment: data.metadata?.environment || 'unknown',
            lastUpdated: data.metadata?.lastUpdated || null
        };
    }
}

// Export singleton instance
export default new FlagStorage();