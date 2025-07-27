/**
 * MigrationManager.js - Manages state migrations for ML state versions
 * 
 * Handles upgrading ML state data between different versions, ensuring
 * backward compatibility and data integrity during version transitions.
 */

class MigrationManager {
    constructor() {
        this.migrations = new Map();
        this.currentVersion = '2.0.0';
        
        // Register available migrations
        this._registerMigrations();
    }
    
    /**
     * Register all available migrations
     * @private
     */
    _registerMigrations() {
        // Migration functions will be loaded dynamically
        this.migrationPaths = {
            '1.0.0_to_2.0.0': './v1_to_v2.js'
        };
    }
    
    /**
     * Load migration module
     * @private
     */
    async _loadMigration(key) {
        if (this.migrations.has(key)) {
            return this.migrations.get(key);
        }
        
        try {
            // In browser environment, migrations should be pre-loaded
            if (typeof window !== 'undefined' && window.MLMigrations && window.MLMigrations[key]) {
                const migration = window.MLMigrations[key];
                this.migrations.set(key, migration);
                return migration;
            }
            
            // In Node.js environment
            if (typeof require !== 'undefined') {
                const migration = require(this.migrationPaths[key]);
                this.migrations.set(key, migration);
                return migration;
            }
            
            throw new Error(`Migration ${key} not found`);
        } catch (error) {
            console.error(`Failed to load migration ${key}:`, error);
            throw error;
        }
    }
    
    /**
     * Migrate state from one version to another
     * @param {Object} state - Current state
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     * @returns {Promise<Object>} Migrated state
     */
    async migrate(state, fromVersion, toVersion) {
        console.log(`Migrating ML state from ${fromVersion} to ${toVersion}`);
        
        // If versions are the same, no migration needed
        if (fromVersion === toVersion) {
            return state;
        }
        
        // Find migration path
        const path = this._findMigrationPath(fromVersion, toVersion);
        if (!path || path.length === 0) {
            throw new Error(`No migration path found from ${fromVersion} to ${toVersion}`);
        }
        
        // Apply migrations in sequence
        let migratedState = state;
        for (const step of path) {
            const migration = await this._loadMigration(step.key);
            
            // Validate pre-conditions
            if (migration.validate && !migration.validate(migratedState)) {
                throw new Error(`Migration ${step.key} validation failed`);
            }
            
            // Create backup
            const backup = JSON.parse(JSON.stringify(migratedState));
            
            try {
                // Apply migration
                migratedState = await migration.migrate(migratedState);
                
                // Record migration
                if (!migratedState.metadata) {
                    migratedState.metadata = {};
                }
                if (!migratedState.metadata.migrations) {
                    migratedState.metadata.migrations = [];
                }
                
                migratedState.metadata.migrations.push({
                    from: step.from,
                    to: step.to,
                    timestamp: new Date().toISOString(),
                    success: true
                });
                
                // Update version
                migratedState.version = step.to;
                
            } catch (error) {
                console.error(`Migration ${step.key} failed:`, error);
                
                // Attempt rollback if available
                if (migration.rollback) {
                    try {
                        migratedState = await migration.rollback(migratedState, backup);
                        console.log(`Rollback successful for ${step.key}`);
                    } catch (rollbackError) {
                        console.error(`Rollback failed for ${step.key}:`, rollbackError);
                    }
                }
                
                throw error;
            }
        }
        
        return migratedState;
    }
    
    /**
     * Find migration path between versions
     * @private
     */
    _findMigrationPath(fromVersion, toVersion) {
        // Simple version comparison for now
        // In a real system, this would use a graph to find optimal path
        const from = this._parseVersion(fromVersion);
        const to = this._parseVersion(toVersion);
        
        if (from.major > to.major || (from.major === to.major && from.minor > to.minor)) {
            throw new Error('Downgrade migrations not supported');
        }
        
        const path = [];
        
        // Check direct migration
        const directKey = `${fromVersion}_to_${toVersion}`;
        if (this.migrationPaths[directKey]) {
            path.push({
                key: directKey,
                from: fromVersion,
                to: toVersion
            });
            return path;
        }
        
        // Build incremental path (simplified for this example)
        const versions = this._getVersionsBetween(fromVersion, toVersion);
        for (let i = 0; i < versions.length - 1; i++) {
            const key = `${versions[i]}_to_${versions[i + 1]}`;
            if (this.migrationPaths[key]) {
                path.push({
                    key,
                    from: versions[i],
                    to: versions[i + 1]
                });
            }
        }
        
        return path;
    }
    
    /**
     * Parse version string
     * @private
     */
    _parseVersion(version) {
        const parts = version.split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
        };
    }
    
    /**
     * Get versions between two versions
     * @private
     */
    _getVersionsBetween(from, to) {
        // Simplified implementation - in real system would enumerate all versions
        const versions = ['1.0.0', '2.0.0'];
        const fromIndex = versions.indexOf(from);
        const toIndex = versions.indexOf(to);
        
        if (fromIndex === -1 || toIndex === -1) {
            return [from, to];
        }
        
        return versions.slice(fromIndex, toIndex + 1);
    }
    
    /**
     * Check if migration is needed
     * @param {string} currentVersion - Current state version
     * @param {string} targetVersion - Target version
     * @returns {boolean} True if migration needed
     */
    needsMigration(currentVersion, targetVersion) {
        return currentVersion !== targetVersion;
    }
    
    /**
     * Get available migrations
     * @returns {Array} List of available migrations
     */
    getAvailableMigrations() {
        return Object.keys(this.migrationPaths).map(key => {
            const [from, , to] = key.split('_');
            return { from, to, key };
        });
    }
    
    /**
     * Validate state version
     * @param {Object} state - State to validate
     * @returns {Object} Validation result
     */
    validateStateVersion(state) {
        if (!state.version) {
            return {
                valid: false,
                error: 'No version found in state'
            };
        }
        
        const version = this._parseVersion(state.version);
        const current = this._parseVersion(this.currentVersion);
        
        if (version.major > current.major) {
            return {
                valid: false,
                error: `State version ${state.version} is newer than current version ${this.currentVersion}`
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Create migration backup
     * @param {Object} state - State to backup
     * @returns {Object} Backup data
     */
    createBackup(state) {
        return {
            timestamp: new Date().toISOString(),
            version: state.version,
            state: JSON.parse(JSON.stringify(state)),
            checksum: this._calculateChecksum(state)
        };
    }
    
    /**
     * Restore from backup
     * @param {Object} backup - Backup data
     * @returns {Object} Restored state
     */
    restoreFromBackup(backup) {
        if (!this._verifyChecksum(backup.state, backup.checksum)) {
            throw new Error('Backup checksum verification failed');
        }
        
        return backup.state;
    }
    
    /**
     * Calculate simple checksum
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
    
    /**
     * Verify checksum
     * @private
     */
    _verifyChecksum(state, checksum) {
        return this._calculateChecksum(state) === checksum;
    }
    
    /**
     * Get migration history from state
     * @param {Object} state - State object
     * @returns {Array} Migration history
     */
    getMigrationHistory(state) {
        return state.metadata?.migrations || [];
    }
    
    /**
     * Test migration without applying
     * @param {Object} state - State to test
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     * @returns {Promise<Object>} Test result
     */
    async testMigration(state, fromVersion, toVersion) {
        try {
            // Deep clone to avoid modifying original
            const testState = JSON.parse(JSON.stringify(state));
            const result = await this.migrate(testState, fromVersion, toVersion);
            
            return {
                success: true,
                result,
                changes: this._detectChanges(state, result)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Detect changes between states
     * @private
     */
    _detectChanges(original, migrated) {
        const changes = {
            added: [],
            removed: [],
            modified: []
        };
        
        // Simple change detection - could be enhanced
        const originalKeys = new Set(this._getAllKeys(original));
        const migratedKeys = new Set(this._getAllKeys(migrated));
        
        // Added keys
        migratedKeys.forEach(key => {
            if (!originalKeys.has(key)) {
                changes.added.push(key);
            }
        });
        
        // Removed keys
        originalKeys.forEach(key => {
            if (!migratedKeys.has(key)) {
                changes.removed.push(key);
            }
        });
        
        // Modified values (simplified)
        originalKeys.forEach(key => {
            if (migratedKeys.has(key)) {
                const originalValue = this._getValueByPath(original, key);
                const migratedValue = this._getValueByPath(migrated, key);
                
                if (JSON.stringify(originalValue) !== JSON.stringify(migratedValue)) {
                    changes.modified.push(key);
                }
            }
        });
        
        return changes;
    }
    
    /**
     * Get all keys from object (flattened)
     * @private
     */
    _getAllKeys(obj, prefix = '') {
        const keys = [];
        
        Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                keys.push(...this._getAllKeys(obj[key], fullKey));
            }
        });
        
        return keys;
    }
    
    /**
     * Get value by dot notation path
     * @private
     */
    _getValueByPath(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MigrationManager;
} else if (typeof window !== 'undefined') {
    window.MigrationManager = MigrationManager;
}