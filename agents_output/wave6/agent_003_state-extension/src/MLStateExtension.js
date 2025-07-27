/**
 * MLStateExtension.js - ML-specific state management extension for KC.AppState
 * 
 * Extends the existing AppState with ML-specific functionality while maintaining
 * backward compatibility. Provides namespaced state sections, migrations, and
 * specialized ML data handling.
 */

class MLStateExtension {
    constructor(appState) {
        this.appState = appState;
        this.namespace = 'ml';
        this.version = '2.0.0';
        
        // ML-specific configuration
        this.mlConfig = {
            maxConfidenceHistory: 100,
            maxModelCache: 50,
            compressionThreshold: 1024 * 100, // 100KB
            syncInterval: 5000 // 5 seconds
        };
        
        // Initialize ML state sections
        this._initializeMLState();
        
        // Setup listeners for state synchronization
        this._setupStateListeners();
        
        // Migration manager reference (will be injected)
        this.migrationManager = null;
        
        // State validator reference (will be injected)
        this.stateValidator = null;
        
        // State differ reference (will be injected)
        this.stateDiffer = null;
    }
    
    /**
     * Initialize ML-specific state sections
     * @private
     */
    _initializeMLState() {
        // Check if ML state already exists
        const existingML = this.appState.get(this.namespace);
        
        if (!existingML) {
            // Initialize ML state structure
            this.appState.set(this.namespace, this._getInitialMLState(), { silent: true });
        } else {
            // Merge with any new properties
            const merged = this._mergeMLState(this._getInitialMLState(), existingML);
            this.appState.set(this.namespace, merged, { silent: true });
        }
    }
    
    /**
     * Get initial ML state structure
     * @private
     */
    _getInitialMLState() {
        return {
            version: this.version,
            
            // ML Confidence tracking
            confidence: {
                global: {
                    score: 0,
                    lastUpdate: null,
                    history: [],
                    trend: 'stable' // 'improving', 'declining', 'stable'
                },
                byCategory: {}, // category -> confidence data
                byFile: {},     // fileId -> confidence data
                thresholds: {
                    high: 0.8,
                    medium: 0.6,
                    low: 0.4
                }
            },
            
            // Model management
            models: {
                active: null,
                available: [],
                cache: {},      // model -> cached data
                performance: {}, // model -> performance metrics
                lastSync: null
            },
            
            // ML Analysis results
            analysis: {
                queue: [],
                processing: [],
                completed: {},  // fileId -> analysis result
                failed: {},     // fileId -> error info
                statistics: {
                    totalAnalyzed: 0,
                    successRate: 0,
                    averageTime: 0,
                    byType: {}
                }
            },
            
            // Embeddings and vectors
            embeddings: {
                generated: {},  // fileId -> embedding metadata
                clusters: [],   // clustering results
                similarityCache: {}, // cached similarity calculations
                version: null   // embedding model version
            },
            
            // ML-specific configuration
            config: {
                autoAnalysis: true,
                confidenceTracking: true,
                adaptiveLearning: false,
                batchSize: 10,
                retryAttempts: 3,
                cacheDuration: 3600000, // 1 hour
                compressionEnabled: true
            },
            
            // Training and feedback
            training: {
                feedback: [],   // user feedback for ML improvement
                corrections: {}, // manual corrections
                preferences: {}, // learned user preferences
                lastTraining: null
            },
            
            // Integration state
            integrations: {
                qdrant: {
                    connected: false,
                    lastSync: null,
                    syncedFiles: new Set(),
                    pendingSync: []
                },
                ollama: {
                    available: false,
                    models: [],
                    lastCheck: null
                }
            },
            
            // Metadata
            metadata: {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                dataVersion: 1,
                migrations: []
            }
        };
    }
    
    /**
     * Setup state change listeners
     * @private
     */
    _setupStateListeners() {
        const KC = window.KnowledgeConsolidator;
        const Events = KC.Events;
        const EventBus = KC.EventBus;
        
        // Listen for file updates to track ML analysis
        EventBus.on(Events.FILE_ANALYZED, (data) => {
            this._handleFileAnalyzed(data);
        });
        
        // Listen for state changes to track ML-relevant updates
        EventBus.on(Events.STATE_CHANGED, (data) => {
            if (this._isMLRelevant(data.path)) {
                this._handleMLStateChange(data);
            }
        });
        
        // Custom ML events
        EventBus.on('ml:confidence:updated', (data) => {
            this._updateConfidence(data);
        });
        
        EventBus.on('ml:model:changed', (data) => {
            this._handleModelChange(data);
        });
    }
    
    /**
     * Get ML state or sub-section
     * @param {string} path - Dot notation path within ML namespace
     * @returns {*} State value
     */
    getML(path) {
        const fullPath = path ? `${this.namespace}.${path}` : this.namespace;
        return this.appState.get(fullPath);
    }
    
    /**
     * Set ML state value
     * @param {string} path - Dot notation path within ML namespace
     * @param {*} value - Value to set
     * @param {Object} options - Set options
     */
    setML(path, value, options = {}) {
        const fullPath = `${this.namespace}.${path}`;
        
        // Validate ML data if validator is available
        if (this.stateValidator && !options.skipValidation) {
            const validation = this.stateValidator.validateMLData(path, value);
            if (!validation.valid) {
                throw new Error(`ML state validation failed: ${validation.error}`);
            }
        }
        
        // Track changes if differ is available
        if (this.stateDiffer && !options.silent) {
            const oldValue = this.getML(path);
            this.stateDiffer.trackChange(fullPath, oldValue, value);
        }
        
        // Update metadata
        this._updateMetadata();
        
        return this.appState.set(fullPath, value, options);
    }
    
    /**
     * Update multiple ML state values
     * @param {Object} updates - Object with paths and values
     * @param {Object} options - Update options
     */
    updateML(updates, options = {}) {
        const mlUpdates = {};
        
        Object.entries(updates).forEach(([path, value]) => {
            mlUpdates[`${this.namespace}.${path}`] = value;
        });
        
        // Update metadata
        this._updateMetadata();
        
        return this.appState.update(mlUpdates, options);
    }
    
    /**
     * Track ML confidence for a file
     * @param {string} fileId - File identifier
     * @param {number} confidence - Confidence score (0-1)
     * @param {Object} metadata - Additional metadata
     */
    trackConfidence(fileId, confidence, metadata = {}) {
        // Update file-specific confidence
        const fileConfidence = this.getML('confidence.byFile') || {};
        fileConfidence[fileId] = {
            score: confidence,
            timestamp: new Date().toISOString(),
            metadata,
            history: [
                ...(fileConfidence[fileId]?.history || []),
                { score: confidence, timestamp: new Date().toISOString() }
            ].slice(-10) // Keep last 10 entries
        };
        
        this.setML('confidence.byFile', fileConfidence);
        
        // Update category confidence if category is provided
        if (metadata.category) {
            this._updateCategoryConfidence(metadata.category, confidence);
        }
        
        // Update global confidence
        this._updateGlobalConfidence();
        
        // Emit confidence update event
        const KC = window.KnowledgeConsolidator;
        KC.EventBus.emit('ml:confidence:updated', {
            fileId,
            confidence,
            metadata
        });
    }
    
    /**
     * Get confidence data for a file
     * @param {string} fileId - File identifier
     * @returns {Object} Confidence data
     */
    getConfidence(fileId) {
        const fileConfidence = this.getML(`confidence.byFile.${fileId}`);
        const globalConfidence = this.getML('confidence.global');
        
        return {
            file: fileConfidence,
            global: globalConfidence,
            threshold: this._getConfidenceThreshold(fileConfidence?.score)
        };
    }
    
    /**
     * Record ML analysis result
     * @param {string} fileId - File identifier
     * @param {Object} result - Analysis result
     */
    recordAnalysis(fileId, result) {
        const completed = this.getML('analysis.completed') || {};
        completed[fileId] = {
            ...result,
            timestamp: new Date().toISOString(),
            version: this.version
        };
        
        this.setML('analysis.completed', completed);
        
        // Update statistics
        this._updateAnalysisStatistics();
        
        // Track confidence if available
        if (result.confidence !== undefined) {
            this.trackConfidence(fileId, result.confidence, {
                analysisType: result.type,
                model: result.model
            });
        }
    }
    
    /**
     * Cache model data
     * @param {string} modelId - Model identifier
     * @param {Object} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    cacheModelData(modelId, data, ttl = this.mlConfig.cacheDuration) {
        const cache = this.getML('models.cache') || {};
        cache[modelId] = {
            data: this._compressIfNeeded(data),
            timestamp: Date.now(),
            expires: Date.now() + ttl
        };
        
        // Cleanup old cache entries
        this._cleanupModelCache(cache);
        
        this.setML('models.cache', cache);
    }
    
    /**
     * Get cached model data
     * @param {string} modelId - Model identifier
     * @returns {Object|null} Cached data or null if expired
     */
    getCachedModelData(modelId) {
        const cache = this.getML(`models.cache.${modelId}`);
        
        if (!cache) return null;
        
        if (Date.now() > cache.expires) {
            // Remove expired cache
            this.removeModelCache(modelId);
            return null;
        }
        
        return this._decompressIfNeeded(cache.data);
    }
    
    /**
     * Remove model cache
     * @param {string} modelId - Model identifier
     */
    removeModelCache(modelId) {
        const cache = this.getML('models.cache') || {};
        delete cache[modelId];
        this.setML('models.cache', cache);
    }
    
    /**
     * Save training feedback
     * @param {Object} feedback - Feedback data
     */
    saveFeedback(feedback) {
        const feedbackList = this.getML('training.feedback') || [];
        feedbackList.push({
            ...feedback,
            id: this._generateId(),
            timestamp: new Date().toISOString()
        });
        
        // Keep last 1000 feedback entries
        const trimmed = feedbackList.slice(-1000);
        this.setML('training.feedback', trimmed);
        
        // Update learned preferences if applicable
        this._updateLearnedPreferences(feedback);
    }
    
    /**
     * Get ML state summary
     * @returns {Object} Summary of ML state
     */
    getMLSummary() {
        const mlState = this.getML();
        
        return {
            version: mlState.version,
            confidence: {
                global: mlState.confidence.global.score,
                trend: mlState.confidence.global.trend,
                fileCount: Object.keys(mlState.confidence.byFile || {}).length,
                categoryCount: Object.keys(mlState.confidence.byCategory || {}).length
            },
            analysis: {
                completed: Object.keys(mlState.analysis.completed || {}).length,
                failed: Object.keys(mlState.analysis.failed || {}).length,
                queueLength: (mlState.analysis.queue || []).length,
                statistics: mlState.analysis.statistics
            },
            models: {
                active: mlState.models.active,
                available: (mlState.models.available || []).length,
                cached: Object.keys(mlState.models.cache || {}).length
            },
            embeddings: {
                generated: Object.keys(mlState.embeddings.generated || {}).length,
                clusters: (mlState.embeddings.clusters || []).length
            },
            training: {
                feedbackCount: (mlState.training.feedback || []).length,
                corrections: Object.keys(mlState.training.corrections || {}).length
            },
            lastModified: mlState.metadata.lastModified
        };
    }
    
    /**
     * Export ML state for backup or migration
     * @returns {Object} Exportable ML state
     */
    exportMLState() {
        const mlState = this.getML();
        
        return {
            version: this.version,
            timestamp: new Date().toISOString(),
            state: mlState,
            summary: this.getMLSummary()
        };
    }
    
    /**
     * Import ML state from backup
     * @param {Object} data - ML state data to import
     * @param {Object} options - Import options
     */
    async importMLState(data, options = {}) {
        const { merge = false, validate = true } = options;
        
        // Validate import data
        if (validate && this.stateValidator) {
            const validation = this.stateValidator.validateMLImport(data);
            if (!validation.valid) {
                throw new Error(`ML state import validation failed: ${validation.error}`);
            }
        }
        
        // Check if migration is needed
        if (this.migrationManager && data.version !== this.version) {
            const migrated = await this.migrationManager.migrate(data.state, data.version, this.version);
            data.state = migrated;
        }
        
        if (merge) {
            // Merge with existing state
            const currentState = this.getML();
            const merged = this._deepMerge(currentState, data.state);
            this.appState.set(this.namespace, merged);
        } else {
            // Replace entire ML state
            this.appState.set(this.namespace, data.state);
        }
        
        // Update metadata
        this._updateMetadata('import');
        
        const KC = window.KnowledgeConsolidator;
        KC.EventBus.emit('ml:state:imported', { 
            version: data.version,
            timestamp: data.timestamp,
            merged: merge 
        });
    }
    
    /**
     * Clear ML state
     * @param {Array} sections - Specific sections to clear, or all if empty
     */
    clearMLState(sections = []) {
        if (sections.length === 0) {
            // Clear entire ML state
            this.appState.set(this.namespace, this._getInitialMLState());
        } else {
            // Clear specific sections
            sections.forEach(section => {
                const initialState = this._getInitialMLState();
                const sectionValue = this._getNestedValue(initialState, section);
                if (sectionValue !== undefined) {
                    this.setML(section, sectionValue);
                }
            });
        }
        
        this._updateMetadata('clear');
    }
    
    // Private helper methods
    
    /**
     * Handle file analyzed event
     * @private
     */
    _handleFileAnalyzed(data) {
        if (data.mlAnalysis) {
            this.recordAnalysis(data.fileId, data.mlAnalysis);
        }
    }
    
    /**
     * Check if state change is ML-relevant
     * @private
     */
    _isMLRelevant(path) {
        const mlPaths = ['files', 'categories', 'stats.analyzedFiles'];
        return mlPaths.some(mlPath => path.startsWith(mlPath));
    }
    
    /**
     * Handle ML-relevant state changes
     * @private
     */
    _handleMLStateChange(data) {
        // Track changes that might affect ML confidence
        if (data.path.includes('categories')) {
            this._recalculateCategoryConfidence();
        }
    }
    
    /**
     * Update category confidence
     * @private
     */
    _updateCategoryConfidence(category, confidence) {
        const categoryConfidence = this.getML('confidence.byCategory') || {};
        
        if (!categoryConfidence[category]) {
            categoryConfidence[category] = {
                scores: [],
                average: 0,
                count: 0
            };
        }
        
        categoryConfidence[category].scores.push(confidence);
        categoryConfidence[category].count++;
        categoryConfidence[category].average = 
            categoryConfidence[category].scores.reduce((a, b) => a + b, 0) / 
            categoryConfidence[category].count;
        
        // Keep last 100 scores
        if (categoryConfidence[category].scores.length > 100) {
            categoryConfidence[category].scores.shift();
        }
        
        this.setML('confidence.byCategory', categoryConfidence);
    }
    
    /**
     * Update global confidence
     * @private
     */
    _updateGlobalConfidence() {
        const fileConfidence = this.getML('confidence.byFile') || {};
        const scores = Object.values(fileConfidence).map(fc => fc.score);
        
        if (scores.length === 0) return;
        
        const average = scores.reduce((a, b) => a + b, 0) / scores.length;
        const previous = this.getML('confidence.global.score') || 0;
        
        // Determine trend
        let trend = 'stable';
        if (average > previous + 0.05) trend = 'improving';
        else if (average < previous - 0.05) trend = 'declining';
        
        const globalConfidence = {
            score: average,
            lastUpdate: new Date().toISOString(),
            trend,
            history: [
                ...(this.getML('confidence.global.history') || []),
                { score: average, timestamp: new Date().toISOString() }
            ].slice(-this.mlConfig.maxConfidenceHistory)
        };
        
        this.setML('confidence.global', globalConfidence);
    }
    
    /**
     * Get confidence threshold level
     * @private
     */
    _getConfidenceThreshold(score) {
        const thresholds = this.getML('confidence.thresholds');
        if (score >= thresholds.high) return 'high';
        if (score >= thresholds.medium) return 'medium';
        if (score >= thresholds.low) return 'low';
        return 'very_low';
    }
    
    /**
     * Update analysis statistics
     * @private
     */
    _updateAnalysisStatistics() {
        const completed = this.getML('analysis.completed') || {};
        const failed = this.getML('analysis.failed') || {};
        
        const totalAnalyzed = Object.keys(completed).length;
        const totalFailed = Object.keys(failed).length;
        const total = totalAnalyzed + totalFailed;
        
        const statistics = {
            totalAnalyzed,
            successRate: total > 0 ? totalAnalyzed / total : 0,
            averageTime: this._calculateAverageAnalysisTime(completed),
            byType: this._groupAnalysisByType(completed)
        };
        
        this.setML('analysis.statistics', statistics);
    }
    
    /**
     * Calculate average analysis time
     * @private
     */
    _calculateAverageAnalysisTime(completed) {
        const times = Object.values(completed)
            .filter(r => r.processingTime)
            .map(r => r.processingTime);
        
        if (times.length === 0) return 0;
        
        return times.reduce((a, b) => a + b, 0) / times.length;
    }
    
    /**
     * Group analysis by type
     * @private
     */
    _groupAnalysisByType(completed) {
        const byType = {};
        
        Object.values(completed).forEach(result => {
            const type = result.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        
        return byType;
    }
    
    /**
     * Compress data if needed
     * @private
     */
    _compressIfNeeded(data) {
        const config = this.getML('config');
        if (!config.compressionEnabled) return data;
        
        const dataStr = JSON.stringify(data);
        if (dataStr.length < this.mlConfig.compressionThreshold) return data;
        
        // Simple compression: store as base64
        try {
            const compressed = btoa(unescape(encodeURIComponent(dataStr)));
            return {
                _compressed: true,
                data: compressed
            };
        } catch (e) {
            console.warn('ML compression failed:', e);
            return data;
        }
    }
    
    /**
     * Decompress data if needed
     * @private
     */
    _decompressIfNeeded(data) {
        if (!data || !data._compressed) return data;
        
        try {
            const decompressed = decodeURIComponent(escape(atob(data.data)));
            return JSON.parse(decompressed);
        } catch (e) {
            console.warn('ML decompression failed:', e);
            return null;
        }
    }
    
    /**
     * Cleanup old model cache entries
     * @private
     */
    _cleanupModelCache(cache) {
        const now = Date.now();
        const entries = Object.entries(cache);
        
        // Remove expired entries
        entries.forEach(([modelId, entry]) => {
            if (now > entry.expires) {
                delete cache[modelId];
            }
        });
        
        // If still too many, remove oldest
        if (Object.keys(cache).length > this.mlConfig.maxModelCache) {
            const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = sorted.slice(0, sorted.length - this.mlConfig.maxModelCache);
            toRemove.forEach(([modelId]) => delete cache[modelId]);
        }
    }
    
    /**
     * Update learned preferences from feedback
     * @private
     */
    _updateLearnedPreferences(feedback) {
        if (!feedback.preference) return;
        
        const preferences = this.getML('training.preferences') || {};
        const { type, value } = feedback.preference;
        
        if (!preferences[type]) {
            preferences[type] = {};
        }
        
        preferences[type][value] = (preferences[type][value] || 0) + 1;
        
        this.setML('training.preferences', preferences);
    }
    
    /**
     * Update metadata
     * @private
     */
    _updateMetadata(action = 'update') {
        const metadata = this.getML('metadata') || {};
        metadata.lastModified = new Date().toISOString();
        
        if (action === 'import' || action === 'clear') {
            metadata.migrations.push({
                action,
                timestamp: new Date().toISOString(),
                version: this.version
            });
        }
        
        this.setML('metadata', metadata, { silent: true });
    }
    
    /**
     * Merge ML states
     * @private
     */
    _mergeMLState(initial, existing) {
        return this._deepMerge(initial, existing);
    }
    
    /**
     * Deep merge objects
     * @private
     */
    _deepMerge(target, source) {
        const output = { ...target };
        
        Object.keys(source).forEach(key => {
            if (source[key] instanceof Object && key in target) {
                output[key] = this._deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
        
        return output;
    }
    
    /**
     * Get nested value from object
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return `ml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Handle model change
     * @private
     */
    _handleModelChange(data) {
        const models = this.getML('models') || {};
        models.active = data.modelId;
        models.lastSync = new Date().toISOString();
        
        this.setML('models', models);
        
        // Clear model-specific caches
        if (data.clearCache) {
            this.removeModelCache(data.previousModel);
        }
    }
    
    /**
     * Recalculate category confidence
     * @private
     */
    _recalculateCategoryConfidence() {
        const fileConfidence = this.getML('confidence.byFile') || {};
        const files = this.appState.get('files') || [];
        const categoryConfidence = {};
        
        files.forEach(file => {
            if (file.categories && fileConfidence[file.id]) {
                file.categories.forEach(category => {
                    if (!categoryConfidence[category]) {
                        categoryConfidence[category] = {
                            scores: [],
                            average: 0,
                            count: 0
                        };
                    }
                    
                    categoryConfidence[category].scores.push(fileConfidence[file.id].score);
                    categoryConfidence[category].count++;
                });
            }
        });
        
        // Calculate averages
        Object.keys(categoryConfidence).forEach(category => {
            const cat = categoryConfidence[category];
            cat.average = cat.scores.reduce((a, b) => a + b, 0) / cat.count;
        });
        
        this.setML('confidence.byCategory', categoryConfidence);
    }
}

// Export for use in KC environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLStateExtension;
} else if (typeof window !== 'undefined') {
    window.MLStateExtension = MLStateExtension;
}