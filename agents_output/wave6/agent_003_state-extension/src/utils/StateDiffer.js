/**
 * StateDiffer.js - Utility for tracking and diffing state changes
 * 
 * Provides deep comparison and change tracking for ML state updates,
 * enabling efficient change detection and debugging.
 */

class StateDiffer {
    constructor() {
        this.changeHistory = [];
        this.maxHistorySize = 100;
        this.ignoreKeys = new Set(['timestamp', 'lastModified', 'lastUpdate']);
        this.watchedPaths = new Map();
        this.changeListeners = new Map();
    }
    
    /**
     * Track a state change
     * @param {string} path - State path that changed
     * @param {*} oldValue - Previous value
     * @param {*} newValue - New value
     * @returns {Object} Change record
     */
    trackChange(path, oldValue, newValue) {
        const change = {
            id: this._generateId(),
            path,
            timestamp: new Date().toISOString(),
            type: this._getChangeType(oldValue, newValue),
            oldValue: this._sanitizeValue(oldValue),
            newValue: this._sanitizeValue(newValue),
            diff: this._computeDiff(oldValue, newValue),
            metadata: {
                oldType: this._getValueType(oldValue),
                newType: this._getValueType(newValue),
                size: this._getChangeSize(oldValue, newValue)
            }
        };
        
        // Add to history
        this.changeHistory.unshift(change);
        if (this.changeHistory.length > this.maxHistorySize) {
            this.changeHistory.pop();
        }
        
        // Notify listeners
        this._notifyListeners(path, change);
        
        // Check watched paths
        this._checkWatchedPaths(path, change);
        
        return change;
    }
    
    /**
     * Compare two state objects and return differences
     * @param {Object} oldState - Previous state
     * @param {Object} newState - New state
     * @param {string} basePath - Base path for nested objects
     * @returns {Array} Array of differences
     */
    diff(oldState, newState, basePath = '') {
        const differences = [];
        
        // Handle null/undefined cases
        if (oldState === newState) return differences;
        if (oldState == null || newState == null) {
            differences.push({
                path: basePath || 'root',
                type: oldState == null ? 'added' : 'removed',
                oldValue: oldState,
                newValue: newState
            });
            return differences;
        }
        
        // Handle different types
        if (typeof oldState !== typeof newState) {
            differences.push({
                path: basePath || 'root',
                type: 'type_changed',
                oldValue: oldState,
                newValue: newState,
                oldType: typeof oldState,
                newType: typeof newState
            });
            return differences;
        }
        
        // Handle arrays
        if (Array.isArray(oldState) && Array.isArray(newState)) {
            differences.push(...this._diffArrays(oldState, newState, basePath));
            return differences;
        }
        
        // Handle objects
        if (typeof oldState === 'object') {
            differences.push(...this._diffObjects(oldState, newState, basePath));
            return differences;
        }
        
        // Handle primitives
        if (oldState !== newState) {
            differences.push({
                path: basePath || 'root',
                type: 'modified',
                oldValue: oldState,
                newValue: newState
            });
        }
        
        return differences;
    }
    
    /**
     * Get change history
     * @param {Object} options - Filter options
     * @returns {Array} Filtered change history
     */
    getHistory(options = {}) {
        let history = [...this.changeHistory];
        
        // Filter by path
        if (options.path) {
            history = history.filter(change => 
                change.path.startsWith(options.path)
            );
        }
        
        // Filter by type
        if (options.type) {
            history = history.filter(change => 
                change.type === options.type
            );
        }
        
        // Filter by time range
        if (options.since) {
            const sinceTime = new Date(options.since).getTime();
            history = history.filter(change => 
                new Date(change.timestamp).getTime() >= sinceTime
            );
        }
        
        // Limit results
        if (options.limit) {
            history = history.slice(0, options.limit);
        }
        
        return history;
    }
    
    /**
     * Watch a specific path for changes
     * @param {string} path - Path to watch
     * @param {Function} callback - Callback when path changes
     * @param {Object} options - Watch options
     * @returns {Function} Unwatch function
     */
    watch(path, callback, options = {}) {
        const watchId = this._generateId();
        
        if (!this.watchedPaths.has(path)) {
            this.watchedPaths.set(path, new Map());
        }
        
        this.watchedPaths.get(path).set(watchId, {
            callback,
            options,
            created: new Date().toISOString()
        });
        
        // Return unwatch function
        return () => this.unwatch(path, watchId);
    }
    
    /**
     * Stop watching a path
     * @param {string} path - Path to unwatch
     * @param {string} watchId - Watch ID to remove
     */
    unwatch(path, watchId) {
        const watchers = this.watchedPaths.get(path);
        if (watchers) {
            watchers.delete(watchId);
            if (watchers.size === 0) {
                this.watchedPaths.delete(path);
            }
        }
    }
    
    /**
     * Add a global change listener
     * @param {Function} listener - Listener function
     * @returns {Function} Remove listener function
     */
    addChangeListener(listener) {
        const listenerId = this._generateId();
        this.changeListeners.set(listenerId, listener);
        
        return () => this.removeChangeListener(listenerId);
    }
    
    /**
     * Remove a change listener
     * @param {string} listenerId - Listener ID
     */
    removeChangeListener(listenerId) {
        this.changeListeners.delete(listenerId);
    }
    
    /**
     * Get statistics about state changes
     * @returns {Object} Change statistics
     */
    getStatistics() {
        const stats = {
            totalChanges: this.changeHistory.length,
            changesByType: {},
            changesByPath: {},
            averageChangeSize: 0,
            largestChange: null,
            mostFrequentPaths: []
        };
        
        let totalSize = 0;
        let largestSize = 0;
        
        this.changeHistory.forEach(change => {
            // Count by type
            stats.changesByType[change.type] = 
                (stats.changesByType[change.type] || 0) + 1;
            
            // Count by path
            const pathRoot = change.path.split('.')[0];
            stats.changesByPath[pathRoot] = 
                (stats.changesByPath[pathRoot] || 0) + 1;
            
            // Track sizes
            const size = change.metadata.size;
            totalSize += size;
            if (size > largestSize) {
                largestSize = size;
                stats.largestChange = change;
            }
        });
        
        stats.averageChangeSize = stats.totalChanges > 0 
            ? totalSize / stats.totalChanges 
            : 0;
        
        // Find most frequent paths
        stats.mostFrequentPaths = Object.entries(stats.changesByPath)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([path, count]) => ({ path, count }));
        
        return stats;
    }
    
    /**
     * Create a snapshot of current state for comparison
     * @param {Object} state - State to snapshot
     * @returns {Object} Snapshot
     */
    createSnapshot(state) {
        return {
            id: this._generateId(),
            timestamp: new Date().toISOString(),
            state: JSON.parse(JSON.stringify(state)),
            checksum: this._calculateChecksum(state)
        };
    }
    
    /**
     * Compare state with a snapshot
     * @param {Object} state - Current state
     * @param {Object} snapshot - Previous snapshot
     * @returns {Object} Comparison result
     */
    compareWithSnapshot(state, snapshot) {
        const differences = this.diff(snapshot.state, state);
        
        return {
            snapshotId: snapshot.id,
            snapshotTime: snapshot.timestamp,
            currentTime: new Date().toISOString(),
            differences,
            summary: {
                totalChanges: differences.length,
                added: differences.filter(d => d.type === 'added').length,
                removed: differences.filter(d => d.type === 'removed').length,
                modified: differences.filter(d => d.type === 'modified').length
            }
        };
    }
    
    /**
     * Clear change history
     */
    clearHistory() {
        this.changeHistory = [];
    }
    
    // Private helper methods
    
    /**
     * Get change type
     * @private
     */
    _getChangeType(oldValue, newValue) {
        if (oldValue === undefined && newValue !== undefined) return 'added';
        if (oldValue !== undefined && newValue === undefined) return 'removed';
        if (oldValue === null && newValue !== null) return 'initialized';
        if (oldValue !== null && newValue === null) return 'cleared';
        if (typeof oldValue !== typeof newValue) return 'type_changed';
        return 'modified';
    }
    
    /**
     * Compute detailed diff
     * @private
     */
    _computeDiff(oldValue, newValue) {
        // For objects and arrays, compute deep diff
        if (typeof oldValue === 'object' && typeof newValue === 'object' && 
            oldValue !== null && newValue !== null) {
            return this.diff(oldValue, newValue);
        }
        
        // For primitives, just note the change
        return {
            from: oldValue,
            to: newValue
        };
    }
    
    /**
     * Diff arrays
     * @private
     */
    _diffArrays(oldArray, newArray, basePath) {
        const differences = [];
        const maxLength = Math.max(oldArray.length, newArray.length);
        
        for (let i = 0; i < maxLength; i++) {
            const path = `${basePath}[${i}]`;
            
            if (i >= oldArray.length) {
                differences.push({
                    path,
                    type: 'added',
                    oldValue: undefined,
                    newValue: newArray[i]
                });
            } else if (i >= newArray.length) {
                differences.push({
                    path,
                    type: 'removed',
                    oldValue: oldArray[i],
                    newValue: undefined
                });
            } else {
                const itemDiffs = this.diff(oldArray[i], newArray[i], path);
                differences.push(...itemDiffs);
            }
        }
        
        // Note array length change
        if (oldArray.length !== newArray.length) {
            differences.push({
                path: `${basePath}.length`,
                type: 'modified',
                oldValue: oldArray.length,
                newValue: newArray.length
            });
        }
        
        return differences;
    }
    
    /**
     * Diff objects
     * @private
     */
    _diffObjects(oldObj, newObj, basePath) {
        const differences = [];
        const allKeys = new Set([
            ...Object.keys(oldObj),
            ...Object.keys(newObj)
        ]);
        
        allKeys.forEach(key => {
            // Skip ignored keys
            if (this.ignoreKeys.has(key)) return;
            
            const path = basePath ? `${basePath}.${key}` : key;
            
            if (!(key in oldObj)) {
                differences.push({
                    path,
                    type: 'added',
                    oldValue: undefined,
                    newValue: newObj[key]
                });
            } else if (!(key in newObj)) {
                differences.push({
                    path,
                    type: 'removed',
                    oldValue: oldObj[key],
                    newValue: undefined
                });
            } else {
                const keyDiffs = this.diff(oldObj[key], newObj[key], path);
                differences.push(...keyDiffs);
            }
        });
        
        return differences;
    }
    
    /**
     * Get value type
     * @private
     */
    _getValueType(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }
    
    /**
     * Get change size in bytes
     * @private
     */
    _getChangeSize(oldValue, newValue) {
        const oldSize = this._getValueSize(oldValue);
        const newSize = this._getValueSize(newValue);
        return Math.abs(newSize - oldSize);
    }
    
    /**
     * Get value size in bytes
     * @private
     */
    _getValueSize(value) {
        if (value == null) return 0;
        
        try {
            return JSON.stringify(value).length;
        } catch (e) {
            return 0;
        }
    }
    
    /**
     * Sanitize value for storage
     * @private
     */
    _sanitizeValue(value) {
        // Limit size of stored values
        const maxSize = 1000;
        
        if (value == null) return value;
        
        const serialized = JSON.stringify(value);
        if (serialized.length > maxSize) {
            return {
                _truncated: true,
                _size: serialized.length,
                _preview: serialized.substring(0, maxSize) + '...'
            };
        }
        
        return value;
    }
    
    /**
     * Notify change listeners
     * @private
     */
    _notifyListeners(path, change) {
        this.changeListeners.forEach(listener => {
            try {
                listener(change);
            } catch (error) {
                console.error('Error in change listener:', error);
            }
        });
    }
    
    /**
     * Check watched paths
     * @private
     */
    _checkWatchedPaths(changePath, change) {
        this.watchedPaths.forEach((watchers, watchedPath) => {
            // Check if change path matches or is nested under watched path
            if (changePath === watchedPath || changePath.startsWith(watchedPath + '.')) {
                watchers.forEach(watcher => {
                    try {
                        watcher.callback(change, changePath, watchedPath);
                    } catch (error) {
                        console.error('Error in path watcher:', error);
                    }
                });
            }
        });
    }
    
    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Calculate checksum
     * @private
     */
    _calculateChecksum(state) {
        const str = JSON.stringify(state);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateDiffer;
} else if (typeof window !== 'undefined') {
    window.StateDiffer = StateDiffer;
}