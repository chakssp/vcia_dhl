/**
 * AppStateAdapter.js - Adapter for seamless integration with KC.AppState
 * 
 * Provides a compatibility layer that allows MLStateExtension to work
 * transparently with the existing AppState implementation.
 */

class AppStateAdapter {
    constructor(mlExtension) {
        this.mlExtension = mlExtension;
        this.appState = mlExtension.appState;
        this.interceptors = new Map();
        
        // Setup method interception
        this._setupInterceptors();
        
        // Track original methods
        this._originalMethods = {};
    }
    
    /**
     * Initialize the adapter
     */
    initialize() {
        // Extend AppState prototype with ML-aware methods
        this._extendAppStatePrototype();
        
        // Setup event forwarding
        this._setupEventForwarding();
        
        // Initialize backward compatibility
        this._initializeBackwardCompatibility();
        
        console.log('AppStateAdapter initialized');
    }
    
    /**
     * Extend AppState prototype with ML-aware methods
     * @private
     */
    _extendAppStatePrototype() {
        const appStateProto = Object.getPrototypeOf(this.appState);
        
        // Add ML-specific methods to AppState instance
        this.appState.getML = (path) => this.mlExtension.getML(path);
        this.appState.setML = (path, value, options) => this.mlExtension.setML(path, value, options);
        this.appState.updateML = (updates, options) => this.mlExtension.updateML(updates, options);
        this.appState.trackConfidence = (fileId, confidence, metadata) => 
            this.mlExtension.trackConfidence(fileId, confidence, metadata);
        this.appState.getMLSummary = () => this.mlExtension.getMLSummary();
        
        // Override specific methods with ML-aware versions
        this._overrideMethod('set', this._mlAwareSet.bind(this));
        this._overrideMethod('get', this._mlAwareGet.bind(this));
        this._overrideMethod('update', this._mlAwareUpdate.bind(this));
        this._overrideMethod('_compressFilesData', this._mlAwareCompressFiles.bind(this));
        this._overrideMethod('export', this._mlAwareExport.bind(this));
        this._overrideMethod('import', this._mlAwareImport.bind(this));
    }
    
    /**
     * Override a method on AppState
     * @private
     */
    _overrideMethod(methodName, newMethod) {
        // Store original method
        this._originalMethods[methodName] = this.appState[methodName].bind(this.appState);
        
        // Replace with new method
        this.appState[methodName] = newMethod;
    }
    
    /**
     * ML-aware set method
     * @private
     */
    _mlAwareSet(path, value, options = {}) {
        // Check if this is a file-related update that needs ML tracking
        if (path.startsWith('files') && !options.skipML) {
            this._handleFileUpdate(path, value);
        }
        
        // Call original method
        const result = this._originalMethods.set(path, value, options);
        
        // Post-process for ML
        if (path === 'files' && Array.isArray(value)) {
            this._processFilesForML(value);
        }
        
        return result;
    }
    
    /**
     * ML-aware get method
     * @private
     */
    _mlAwareGet(path) {
        // If requesting files, enhance with ML data
        if (path === 'files') {
            const files = this._originalMethods.get(path);
            return this._enhanceFilesWithML(files);
        }
        
        // Check if it's an ML path request through regular get
        if (path && path.startsWith('ml.')) {
            return this.mlExtension.getML(path.substring(3));
        }
        
        return this._originalMethods.get(path);
    }
    
    /**
     * ML-aware update method
     * @private
     */
    _mlAwareUpdate(updates, options = {}) {
        // Separate ML updates from regular updates
        const mlUpdates = {};
        const regularUpdates = {};
        
        Object.entries(updates).forEach(([path, value]) => {
            if (path.startsWith('ml.')) {
                mlUpdates[path.substring(3)] = value;
            } else {
                regularUpdates[path] = value;
            }
        });
        
        // Apply regular updates
        if (Object.keys(regularUpdates).length > 0) {
            this._originalMethods.update(regularUpdates, options);
        }
        
        // Apply ML updates
        if (Object.keys(mlUpdates).length > 0) {
            this.mlExtension.updateML(mlUpdates, options);
        }
    }
    
    /**
     * ML-aware file compression
     * @private
     */
    _mlAwareCompressFiles(files) {
        // Get original compressed data
        const compressed = this._originalMethods._compressFilesData(files);
        
        // Enhance with ML metadata
        return compressed.map(file => {
            const mlData = this.mlExtension.getConfidence(file.id);
            
            return {
                ...file,
                mlConfidence: mlData?.file?.score,
                mlAnalyzed: !!this.mlExtension.getML(`analysis.completed.${file.id}`),
                mlEmbedding: !!this.mlExtension.getML(`embeddings.generated.${file.id}`)
            };
        });
    }
    
    /**
     * ML-aware export
     * @private
     */
    _mlAwareExport() {
        const baseExport = this._originalMethods.export();
        const mlExport = this.mlExtension.exportMLState();
        
        return {
            ...baseExport,
            ml: mlExport,
            version: '2.0.0', // Updated version to indicate ML support
            hasMLData: true
        };
    }
    
    /**
     * ML-aware import
     * @private
     */
    _mlAwareImport(data, options = {}) {
        // Import base state
        const result = this._originalMethods.import(data, options);
        
        // Import ML state if available
        if (data.ml || data.hasMLData) {
            const mlData = data.ml || {
                state: data.state?.ml,
                version: data.version || '1.0.0'
            };
            
            if (mlData.state) {
                this.mlExtension.importMLState(mlData, options)
                    .catch(error => {
                        console.error('Failed to import ML state:', error);
                    });
            }
        }
        
        return result;
    }
    
    /**
     * Setup event forwarding between AppState and ML
     * @private
     */
    _setupEventForwarding() {
        const KC = window.KnowledgeConsolidator;
        const Events = KC.Events;
        const EventBus = KC.EventBus;
        
        // Forward state changes to ML extension
        EventBus.on(Events.STATE_CHANGED, (data) => {
            if (this._isMLRelevantChange(data)) {
                this._forwardToML(data);
            }
        });
        
        // Forward file events
        EventBus.on(Events.FILE_ANALYZED, (data) => {
            this._handleFileAnalyzedCompat(data);
        });
        
        EventBus.on(Events.FILE_CATEGORIZED, (data) => {
            this._handleFileCategorizedCompat(data);
        });
    }
    
    /**
     * Initialize backward compatibility features
     * @private
     */
    _initializeBackwardCompatibility() {
        // Add legacy method aliases
        this.appState.getMLConfidence = (fileId) => {
            const confidence = this.mlExtension.getConfidence(fileId);
            return confidence?.file?.score || 0;
        };
        
        this.appState.isMLAnalyzed = (fileId) => {
            return !!this.mlExtension.getML(`analysis.completed.${fileId}`);
        };
        
        // Add helper methods for common operations
        this.appState.getFilesWithMLData = () => {
            const files = this.appState.get('files') || [];
            return this._enhanceFilesWithML(files);
        };
        
        this.appState.getMLStats = () => {
            const summary = this.mlExtension.getMLSummary();
            return {
                totalAnalyzed: summary.analysis.completed,
                averageConfidence: summary.confidence.global,
                trend: summary.confidence.trend
            };
        };
    }
    
    /**
     * Handle file update for ML tracking
     * @private
     */
    _handleFileUpdate(path, value) {
        // Extract file ID from path if updating specific file
        const pathParts = path.split('.');
        if (pathParts.length >= 2 && pathParts[0] === 'files') {
            const index = parseInt(pathParts[1]);
            if (!isNaN(index)) {
                const files = this.appState.get('files') || [];
                const file = files[index];
                if (file && file.id) {
                    // Track file modification in ML
                    this._trackFileModification(file.id, value);
                }
            }
        }
    }
    
    /**
     * Process files for ML after update
     * @private
     */
    _processFilesForML(files) {
        files.forEach(file => {
            // Check if file needs ML analysis
            if (file.analyzed && !this.mlExtension.getML(`analysis.completed.${file.id}`)) {
                // Queue for ML analysis
                this._queueForMLAnalysis(file);
            }
            
            // Update confidence if relevance score changed
            if (file.relevanceScore !== undefined) {
                const currentConfidence = this.mlExtension.getConfidence(file.id);
                if (!currentConfidence.file || currentConfidence.file.score !== file.relevanceScore / 100) {
                    this.mlExtension.trackConfidence(file.id, file.relevanceScore / 100, {
                        source: 'relevance_score',
                        categories: file.categories
                    });
                }
            }
        });
    }
    
    /**
     * Enhance files with ML data
     * @private
     */
    _enhanceFilesWithML(files) {
        if (!Array.isArray(files)) return files;
        
        return files.map(file => {
            const mlData = {
                mlConfidence: this.mlExtension.getConfidence(file.id)?.file?.score,
                mlAnalyzed: !!this.mlExtension.getML(`analysis.completed.${file.id}`),
                mlEmbedding: !!this.mlExtension.getML(`embeddings.generated.${file.id}`),
                mlCluster: this._getFileCluster(file.id)
            };
            
            // Only add ML properties if they have values
            const enhanced = { ...file };
            Object.entries(mlData).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== false) {
                    enhanced[key] = value;
                }
            });
            
            return enhanced;
        });
    }
    
    /**
     * Check if state change is ML relevant
     * @private
     */
    _isMLRelevantChange(data) {
        const mlPaths = [
            'files',
            'stats.analyzedFiles',
            'categories',
            'currentStep'
        ];
        
        return mlPaths.some(path => data.path && data.path.startsWith(path));
    }
    
    /**
     * Forward state change to ML
     * @private
     */
    _forwardToML(data) {
        // Process based on path
        if (data.path.startsWith('files')) {
            this._processFilesForML(data.newValue);
        } else if (data.path === 'stats.analyzedFiles') {
            this.mlExtension.setML('analysis.statistics.totalAnalyzed', data.newValue, { silent: true });
        }
    }
    
    /**
     * Handle file analyzed event for compatibility
     * @private
     */
    _handleFileAnalyzedCompat(data) {
        const { fileId, analysis } = data;
        
        // Record in ML extension
        if (analysis) {
            this.mlExtension.recordAnalysis(fileId, {
                type: analysis.analysisType || analysis.type,
                model: analysis.model || 'unknown',
                confidence: analysis.confidence || analysis.relevanceScore / 100,
                result: analysis,
                processingTime: analysis.processingTime || 0
            });
        }
    }
    
    /**
     * Handle file categorized event for compatibility
     * @private
     */
    _handleFileCategorizedCompat(data) {
        const { fileId, categories } = data;
        
        // Update ML confidence based on categorization
        if (categories && categories.length > 0) {
            const confidence = this.mlExtension.getConfidence(fileId);
            const boost = 0.1 * categories.length; // Boost confidence for categorized files
            const newConfidence = Math.min(1, (confidence?.file?.score || 0.5) + boost);
            
            this.mlExtension.trackConfidence(fileId, newConfidence, {
                source: 'categorization',
                categories,
                boost
            });
        }
    }
    
    /**
     * Track file modification in ML
     * @private
     */
    _trackFileModification(fileId, changes) {
        // Log modification for ML tracking
        const modifications = this.mlExtension.getML('metadata.modifications') || {};
        modifications[fileId] = {
            timestamp: new Date().toISOString(),
            changes: Object.keys(changes)
        };
        
        this.mlExtension.setML('metadata.modifications', modifications, { silent: true });
    }
    
    /**
     * Queue file for ML analysis
     * @private
     */
    _queueForMLAnalysis(file) {
        const queue = this.mlExtension.getML('analysis.queue') || [];
        
        // Check if already queued
        if (!queue.some(item => item.fileId === file.id)) {
            queue.push({
                fileId: file.id,
                priority: file.relevanceScore || 50,
                timestamp: new Date().toISOString()
            });
            
            this.mlExtension.setML('analysis.queue', queue);
        }
    }
    
    /**
     * Get file cluster assignment
     * @private
     */
    _getFileCluster(fileId) {
        const clusters = this.mlExtension.getML('embeddings.clusters') || [];
        
        for (const cluster of clusters) {
            if (cluster.fileIds && cluster.fileIds.includes(fileId)) {
                return cluster.id;
            }
        }
        
        return null;
    }
    
    /**
     * Add custom interceptor for method calls
     * @param {string} methodName - Method to intercept
     * @param {Function} interceptor - Interceptor function
     */
    addInterceptor(methodName, interceptor) {
        if (!this.interceptors.has(methodName)) {
            this.interceptors.set(methodName, []);
        }
        
        this.interceptors.get(methodName).push(interceptor);
    }
    
    /**
     * Remove interceptor
     * @param {string} methodName - Method name
     * @param {Function} interceptor - Interceptor to remove
     */
    removeInterceptor(methodName, interceptor) {
        const interceptors = this.interceptors.get(methodName);
        if (interceptors) {
            const index = interceptors.indexOf(interceptor);
            if (index !== -1) {
                interceptors.splice(index, 1);
            }
        }
    }
    
    /**
     * Setup method interceptors
     * @private
     */
    _setupInterceptors() {
        // Intercept set operations for ML paths
        this.addInterceptor('set', (path, value, options) => {
            if (path.startsWith('ml.')) {
                // Redirect to ML extension
                this.mlExtension.setML(path.substring(3), value, options);
                return { handled: true };
            }
            return { handled: false };
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppStateAdapter;
} else if (typeof window !== 'undefined') {
    window.AppStateAdapter = AppStateAdapter;
}