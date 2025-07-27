/**
 * MLFeatureFlags.js - Main feature flag management system for ML features
 * 
 * Core functionality:
 * - Flag registration and evaluation
 * - Support for boolean, percentage rollout, targeting, and A/B testing
 * - Dependency resolution and inheritance
 * - Thread-safe operations
 * - Integration with KC architecture
 * - Debug mode and overrides
 * 
 * @module MLFeatureFlags
 */

import FlagValidator from './FlagValidator.js';
import FlagStorage from './FlagStorage.js';

export class MLFeatureFlags {
    constructor() {
        this.validator = FlagValidator;
        this.storage = FlagStorage;
        this.cache = new Map();
        this.overrides = new Map();
        this.debugMode = false;
        this.evaluationContext = {};
        this.logger = this._createLogger();
        this._initializeEventHandlers();
        this._loadUrlOverrides();
    }

    /**
     * Create logger instance
     */
    _createLogger() {
        return {
            info: (msg, data) => {
                console.log(`[MLFeatureFlags] ${msg}`, data || '');
                this._logToKC('info', msg, data);
            },
            warn: (msg, data) => {
                console.warn(`[MLFeatureFlags] ${msg}`, data || '');
                this._logToKC('warn', msg, data);
            },
            error: (msg, data) => {
                console.error(`[MLFeatureFlags] ${msg}`, data || '');
                this._logToKC('error', msg, data);
            }
        };
    }

    /**
     * Log to KC Logger if available
     */
    _logToKC(level, msg, data) {
        if (window.KC && window.KC.Logger) {
            window.KC.Logger[level](`MLFeatureFlags: ${msg}`, data);
        }
    }

    /**
     * Initialize event handlers for KC integration
     */
    _initializeEventHandlers() {
        if (window.KC && window.KC.EventBus) {
            // Listen for context updates
            window.KC.EventBus.on('USER_CONTEXT_UPDATED', (context) => {
                this.updateEvaluationContext(context);
            });

            // Listen for flag override events
            window.KC.EventBus.on('ML_FLAG_OVERRIDE', ({ flag, value }) => {
                this.setOverride(flag, value);
            });
        }
    }

    /**
     * Load URL parameter overrides
     */
    _loadUrlOverrides() {
        try {
            const params = new URLSearchParams(window.location.search);
            
            // Enable debug mode if specified
            if (params.get('ml_debug') === 'true') {
                this.enableDebugMode();
            }

            // Load flag overrides
            params.forEach((value, key) => {
                if (key.startsWith('ml_flag_')) {
                    const flagKey = key.substring(8);
                    try {
                        // Try to parse as JSON first
                        const parsedValue = JSON.parse(value);
                        this.setOverride(flagKey, parsedValue);
                    } catch {
                        // If not JSON, treat as string
                        this.setOverride(flagKey, value);
                    }
                }
            });
        } catch (error) {
            this.logger.warn('Failed to load URL overrides:', error);
        }
    }

    /**
     * Register a new feature flag
     * @param {string} key - Unique flag identifier
     * @param {Object} config - Flag configuration
     * @returns {boolean} Success status
     */
    registerFlag(key, config) {
        try {
            // Validate configuration
            const validation = this.validator.validateFlag(key, config);
            if (!validation.isValid) {
                this.logger.error(`Invalid flag configuration for ${key}:`, validation.errors);
                return false;
            }

            // Add metadata
            const enrichedConfig = {
                ...config,
                metadata: {
                    ...config.metadata,
                    createdAt: new Date().toISOString(),
                    createdBy: this.evaluationContext.userId || 'system'
                }
            };

            // Save to storage
            const saved = this.storage.saveFlag(key, enrichedConfig);
            if (!saved) {
                return false;
            }

            // Clear cache
            this.cache.delete(key);

            // Emit event
            this._emitFlagEvent('registered', key, enrichedConfig);
            
            this.logger.info(`Flag registered: ${key}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to register flag ${key}:`, error);
            return false;
        }
    }

    /**
     * Register multiple flags at once
     */
    registerFlags(flags) {
        const results = {};
        const validFlags = {};

        // Validate all flags first
        Object.entries(flags).forEach(([key, config]) => {
            const validation = this.validator.validateFlag(key, config);
            if (validation.isValid) {
                validFlags[key] = config;
            } else {
                results[key] = { success: false, errors: validation.errors };
            }
        });

        // Check for circular dependencies
        const collectionValidation = this.validator.validateCollection(validFlags);
        if (!collectionValidation.isValid && collectionValidation.errors.cycles) {
            this.logger.error('Circular dependencies detected:', collectionValidation.errors.cycles);
            return results;
        }

        // Save valid flags
        Object.entries(validFlags).forEach(([key, config]) => {
            const success = this.registerFlag(key, config);
            results[key] = { success };
        });

        return results;
    }

    /**
     * Evaluate a feature flag
     * @param {string} key - Flag key
     * @param {Object} context - Optional evaluation context
     * @returns {*} Flag value or default
     */
    evaluate(key, context = {}) {
        try {
            // Check overrides first
            if (this.overrides.has(key)) {
                const override = this.overrides.get(key);
                this._logEvaluation(key, override, 'override');
                return override;
            }

            // Check cache
            const cacheKey = this._getCacheKey(key, context);
            if (this.cache.has(cacheKey) && !this.debugMode) {
                const cached = this.cache.get(cacheKey);
                this._logEvaluation(key, cached, 'cache');
                return cached;
            }

            // Get flag configuration
            const flag = this.storage.getFlag(key);
            if (!flag) {
                this._logEvaluation(key, false, 'not_found');
                return false;
            }

            // Check dependencies
            if (!this._evaluateDependencies(flag, context)) {
                this._logEvaluation(key, false, 'dependency_failed');
                this.cache.set(cacheKey, false);
                return false;
            }

            // Evaluate based on type
            const mergedContext = { ...this.evaluationContext, ...context };
            let value;

            switch (flag.type) {
                case 'boolean':
                    value = flag.value;
                    break;
                case 'percentage':
                    value = this._evaluatePercentage(flag, mergedContext);
                    break;
                case 'targeting':
                    value = this._evaluateTargeting(flag, mergedContext);
                    break;
                case 'variant':
                    value = this._evaluateVariant(flag, mergedContext);
                    break;
                default:
                    value = flag.value;
            }

            // Cache result
            this.cache.set(cacheKey, value);
            
            this._logEvaluation(key, value, flag.type);
            this._emitFlagEvent('evaluated', key, { value, context: mergedContext });
            
            return value;
        } catch (error) {
            this.logger.error(`Failed to evaluate flag ${key}:`, error);
            return false;
        }
    }

    /**
     * Evaluate dependencies
     */
    _evaluateDependencies(flag, context) {
        if (!flag.dependencies || flag.dependencies.length === 0) {
            return true;
        }

        return flag.dependencies.every(dep => {
            const depValue = this.evaluate(dep.flag, context);
            const operator = dep.operator || 'equals';

            switch (operator) {
                case 'equals':
                    return depValue === dep.value;
                case 'not_equals':
                    return depValue !== dep.value;
                case 'greater_than':
                    return depValue > dep.value;
                case 'less_than':
                    return depValue < dep.value;
                default:
                    return false;
            }
        });
    }

    /**
     * Evaluate percentage rollout
     */
    _evaluatePercentage(flag, context) {
        const percentage = flag.value;
        const seed = this._getSeed(flag.key || flag.name, context);
        const hash = this._hashString(seed);
        const bucket = Math.abs(hash) % 100;
        
        return bucket < percentage;
    }

    /**
     * Evaluate targeting rules
     */
    _evaluateTargeting(flag, context) {
        if (!flag.value || !flag.value.rules) {
            return false;
        }

        const { rules, defaultValue = false } = flag.value;
        
        // Check if any rule matches
        const matches = rules.some(rule => {
            const contextValue = this._getNestedValue(context, rule.attribute);
            
            switch (rule.operator) {
                case 'equals':
                    return contextValue === rule.value;
                case 'contains':
                    return String(contextValue).includes(rule.value);
                case 'regex':
                    return new RegExp(rule.value).test(String(contextValue));
                case 'in':
                    return Array.isArray(rule.value) && rule.value.includes(contextValue);
                case 'not_in':
                    return Array.isArray(rule.value) && !rule.value.includes(contextValue);
                default:
                    return false;
            }
        });

        return matches ? true : defaultValue;
    }

    /**
     * Evaluate A/B test variant
     */
    _evaluateVariant(flag, context) {
        if (!flag.value || !flag.value.variants || !flag.value.weights) {
            return null;
        }

        const { variants, weights } = flag.value;
        const seed = this._getSeed(flag.key || flag.name, context);
        const hash = this._hashString(seed);
        const bucket = Math.abs(hash) % 100;

        let cumulative = 0;
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (bucket < cumulative) {
                return variants[i];
            }
        }

        return variants[variants.length - 1];
    }

    /**
     * Get seed for consistent hashing
     */
    _getSeed(flagKey, context) {
        const userId = context.userId || this.evaluationContext.userId || 'anonymous';
        return `${flagKey}:${userId}`;
    }

    /**
     * Simple string hash function
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }

    /**
     * Get nested value from object
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    /**
     * Generate cache key
     */
    _getCacheKey(flagKey, context) {
        const contextKey = JSON.stringify(context);
        return `${flagKey}:${contextKey}`;
    }

    /**
     * Log evaluation for debugging
     */
    _logEvaluation(key, value, reason) {
        if (this.debugMode) {
            this.logger.info(`Flag evaluated: ${key} = ${JSON.stringify(value)} (${reason})`);
        }
    }

    /**
     * Update a flag's value
     */
    updateFlag(key, updates) {
        try {
            const currentFlag = this.storage.getFlag(key);
            if (!currentFlag) {
                this.logger.error(`Flag not found: ${key}`);
                return false;
            }

            // Validate update
            const validation = this.validator.validateUpdate(currentFlag, updates);
            if (!validation.isValid) {
                this.logger.error(`Invalid update for flag ${key}:`, validation.errors);
                return false;
            }

            // Merge updates
            const updatedFlag = {
                ...currentFlag,
                ...updates,
                metadata: {
                    ...currentFlag.metadata,
                    ...updates.metadata,
                    lastUpdated: new Date().toISOString(),
                    updatedBy: this.evaluationContext.userId || 'system'
                }
            };

            // Save to storage
            const saved = this.storage.saveFlag(key, updatedFlag);
            if (!saved) {
                return false;
            }

            // Clear cache
            this.cache.delete(key);
            this._clearDependentCache(key);

            // Emit event
            this._emitFlagEvent('updated', key, { oldValue: currentFlag, newValue: updatedFlag });
            
            return true;
        } catch (error) {
            this.logger.error(`Failed to update flag ${key}:`, error);
            return false;
        }
    }

    /**
     * Clear cache for flags that depend on the given flag
     */
    _clearDependentCache(flagKey) {
        const allFlags = this.storage.getAllFlags();
        
        Object.entries(allFlags).forEach(([key, flag]) => {
            if (flag.dependencies && flag.dependencies.some(dep => dep.flag === flagKey)) {
                // Clear all cache entries for this flag
                for (const cacheKey of this.cache.keys()) {
                    if (cacheKey.startsWith(`${key}:`)) {
                        this.cache.delete(cacheKey);
                    }
                }
            }
        });
    }

    /**
     * Delete a flag
     */
    deleteFlag(key) {
        try {
            const flag = this.storage.getFlag(key);
            if (!flag) {
                return false;
            }

            // Check if other flags depend on this one
            const dependents = this._findDependentFlags(key);
            if (dependents.length > 0) {
                this.logger.warn(`Cannot delete flag ${key}, it has dependents:`, dependents);
                return false;
            }

            // Delete from storage
            const deleted = this.storage.deleteFlag(key);
            if (!deleted) {
                return false;
            }

            // Clear cache and overrides
            this.cache.delete(key);
            this.overrides.delete(key);

            // Emit event
            this._emitFlagEvent('deleted', key, flag);
            
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete flag ${key}:`, error);
            return false;
        }
    }

    /**
     * Find flags that depend on the given flag
     */
    _findDependentFlags(flagKey) {
        const allFlags = this.storage.getAllFlags();
        const dependents = [];

        Object.entries(allFlags).forEach(([key, flag]) => {
            if (flag.dependencies && flag.dependencies.some(dep => dep.flag === flagKey)) {
                dependents.push(key);
            }
        });

        return dependents;
    }

    /**
     * Get all flags
     */
    getAllFlags() {
        return this.storage.getAllFlags();
    }

    /**
     * Get flag configuration
     */
    getFlag(key) {
        return this.storage.getFlag(key);
    }

    /**
     * Set override for a flag
     */
    setOverride(key, value) {
        this.overrides.set(key, value);
        this.cache.delete(key);
        this._clearDependentCache(key);
        
        this.logger.info(`Override set for flag ${key}:`, value);
        this._emitFlagEvent('overridden', key, value);
    }

    /**
     * Clear override for a flag
     */
    clearOverride(key) {
        this.overrides.delete(key);
        this.cache.delete(key);
        this._clearDependentCache(key);
        
        this.logger.info(`Override cleared for flag ${key}`);
        this._emitFlagEvent('override_cleared', key, null);
    }

    /**
     * Clear all overrides
     */
    clearAllOverrides() {
        this.overrides.clear();
        this.cache.clear();
        this.logger.info('All overrides cleared');
    }

    /**
     * Get all overrides
     */
    getOverrides() {
        return Object.fromEntries(this.overrides);
    }

    /**
     * Update evaluation context
     */
    updateEvaluationContext(context) {
        this.evaluationContext = { ...this.evaluationContext, ...context };
        this.cache.clear(); // Clear cache as context changed
        this.logger.info('Evaluation context updated:', this.evaluationContext);
    }

    /**
     * Enable debug mode
     */
    enableDebugMode() {
        this.debugMode = true;
        this.logger.info('Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebugMode() {
        this.debugMode = false;
        this.logger.info('Debug mode disabled');
    }

    /**
     * Get flag history
     */
    getHistory(flagKey = null, limit = 50) {
        return this.storage.getHistory(flagKey, limit);
    }

    /**
     * Create backup
     */
    createBackup(name = 'manual') {
        return this.storage.createBackup(name);
    }

    /**
     * Restore from backup
     */
    restoreBackup(backupKeyOrName) {
        const restored = this.storage.restoreBackup(backupKeyOrName);
        if (restored) {
            this.cache.clear();
            this._emitFlagEvent('restored', null, { backup: backupKeyOrName });
        }
        return restored;
    }

    /**
     * List backups
     */
    listBackups() {
        return this.storage.listBackups();
    }

    /**
     * Get statistics
     */
    getStats() {
        const storageStats = this.storage.getStats();
        const allFlags = this.getAllFlags();
        
        const typeStats = {};
        Object.values(allFlags).forEach(flag => {
            typeStats[flag.type] = (typeStats[flag.type] || 0) + 1;
        });

        return {
            ...storageStats,
            typeStats,
            cacheSize: this.cache.size,
            overrideCount: this.overrides.size,
            debugMode: this.debugMode
        };
    }

    /**
     * Emit flag event via KC EventBus
     */
    _emitFlagEvent(action, flagKey, data) {
        const event = {
            action,
            flagKey,
            data,
            timestamp: new Date().toISOString()
        };

        if (window.KC && window.KC.EventBus) {
            window.KC.EventBus.emit('ML_FLAG_CHANGED', event);
        }

        // Also emit specific events
        const specificEvent = `ML_FLAG_${action.toUpperCase()}`;
        if (window.KC && window.KC.EventBus) {
            window.KC.EventBus.emit(specificEvent, event);
        }
    }

    /**
     * Export configuration for documentation
     */
    exportConfiguration() {
        const flags = this.getAllFlags();
        const schema = this.validator.getSchema();
        
        return {
            version: '1.0.0',
            schema,
            flags,
            stats: this.getStats(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import configuration
     */
    importConfiguration(config) {
        if (!config || !config.flags) {
            this.logger.error('Invalid configuration format');
            return false;
        }

        // Validate all flags
        const validation = this.validator.validateCollection(config.flags);
        if (!validation.isValid) {
            this.logger.error('Configuration validation failed:', validation.errors);
            return false;
        }

        // Create backup before import
        this.createBackup('pre_import');

        // Import flags
        const results = this.registerFlags(config.flags);
        
        const successCount = Object.values(results).filter(r => r.success).length;
        this.logger.info(`Imported ${successCount}/${Object.keys(config.flags).length} flags`);
        
        return successCount === Object.keys(config.flags).length;
    }
}

// Export singleton instance
export default new MLFeatureFlags();