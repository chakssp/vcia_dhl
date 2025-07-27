/**
 * LegacySupport.js - Provides backward compatibility for legacy code
 * 
 * Ensures that existing code that relies on AppState continues to work
 * seamlessly with the ML extensions without modification.
 */

class LegacySupport {
    constructor(appState, mlExtension) {
        this.appState = appState;
        this.mlExtension = mlExtension;
        this.legacyMappings = new Map();
        this.deprecationWarnings = new Set();
        
        // Initialize legacy mappings
        this._initializeMappings();
    }
    
    /**
     * Initialize legacy path and method mappings
     * @private
     */
    _initializeMappings() {
        // Map legacy paths to new ML paths
        this.legacyMappings.set('analysis.results', 'ml.analysis.completed');
        this.legacyMappings.set('ml.confidence', 'ml.confidence.global.score');
        this.legacyMappings.set('embeddings', 'ml.embeddings.generated');
        this.legacyMappings.set('mlConfig', 'ml.config');
        
        // Map legacy method names
        this.methodMappings = {
            'getMLData': 'getML',
            'setMLData': 'setML',
            'getMachineLearning': 'getML',
            'updateMLState': 'updateML'
        };
    }
    
    /**
     * Setup legacy support
     */
    setup() {
        // Add legacy methods to AppState
        this._addLegacyMethods();
        
        // Setup path translation
        this._setupPathTranslation();
        
        // Add legacy event listeners
        this._setupLegacyEvents();
        
        // Initialize legacy data structures if needed
        this._initializeLegacyStructures();
        
        console.log('Legacy support initialized');
    }
    
    /**
     * Add legacy methods to AppState
     * @private
     */
    _addLegacyMethods() {
        // Legacy confidence methods
        this.appState.getFileConfidence = (fileId) => {
            this._deprecationWarning('getFileConfidence', 'getML("confidence.byFile.fileId")');
            return this.mlExtension.getConfidence(fileId)?.file?.score || 0;
        };
        
        this.appState.setFileConfidence = (fileId, confidence) => {
            this._deprecationWarning('setFileConfidence', 'trackConfidence');
            return this.mlExtension.trackConfidence(fileId, confidence);
        };
        
        // Legacy analysis methods
        this.appState.getAnalysisResult = (fileId) => {
            this._deprecationWarning('getAnalysisResult', 'getML("analysis.completed.fileId")');
            return this.mlExtension.getML(`analysis.completed.${fileId}`);
        };
        
        this.appState.saveAnalysisResult = (fileId, result) => {
            this._deprecationWarning('saveAnalysisResult', 'recordAnalysis');
            return this.mlExtension.recordAnalysis(fileId, result);
        };
        
        // Legacy embedding methods
        this.appState.hasEmbedding = (fileId) => {
            this._deprecationWarning('hasEmbedding', 'getML("embeddings.generated.fileId")');
            return !!this.mlExtension.getML(`embeddings.generated.${fileId}`);
        };
        
        this.appState.getEmbedding = (fileId) => {
            this._deprecationWarning('getEmbedding', 'getML("embeddings.generated.fileId")');
            return this.mlExtension.getML(`embeddings.generated.${fileId}`);
        };
        
        // Legacy batch operations
        this.appState.batchUpdateML = (updates) => {
            this._deprecationWarning('batchUpdateML', 'updateML');
            const mlUpdates = {};
            Object.entries(updates).forEach(([key, value]) => {
                const mlPath = this._translateLegacyPath(key);
                mlUpdates[mlPath] = value;
            });
            return this.mlExtension.updateML(mlUpdates);
        };
        
        // Legacy statistics
        this.appState.getMLStatistics = () => {
            this._deprecationWarning('getMLStatistics', 'getMLSummary');
            const summary = this.mlExtension.getMLSummary();
            
            // Return in legacy format
            return {
                totalAnalyzed: summary.analysis.completed,
                confidenceAverage: summary.confidence.global,
                modelPerformance: {
                    successRate: summary.analysis.statistics?.successRate || 0,
                    averageTime: summary.analysis.statistics?.averageTime || 0
                },
                embeddingsCount: summary.embeddings.generated
            };
        };
        
        // Legacy model management
        this.appState.getCurrentModel = () => {
            this._deprecationWarning('getCurrentModel', 'getML("models.active")');
            return this.mlExtension.getML('models.active');
        };
        
        this.appState.setCurrentModel = (modelId) => {
            this._deprecationWarning('setCurrentModel', 'setML("models.active", modelId)');
            return this.mlExtension.setML('models.active', modelId);
        };
        
        // Add method aliases
        Object.entries(this.methodMappings).forEach(([oldName, newName]) => {
            if (!this.appState[oldName] && this.appState[newName]) {
                this.appState[oldName] = (...args) => {
                    this._deprecationWarning(oldName, newName);
                    return this.appState[newName](...args);
                };
            }
        });
    }
    
    /**
     * Setup path translation for legacy code
     * @private
     */
    _setupPathTranslation() {
        // Store original get/set methods
        const originalGet = this.appState.get.bind(this.appState);
        const originalSet = this.appState.set.bind(this.appState);
        
        // Override get to handle legacy paths
        this.appState.getLegacy = (path) => {
            const translatedPath = this._translateLegacyPath(path);
            
            if (translatedPath !== path) {
                this._deprecationWarning(`Path: ${path}`, `Path: ${translatedPath}`);
            }
            
            return originalGet(translatedPath);
        };
        
        // Override set to handle legacy paths
        this.appState.setLegacy = (path, value, options) => {
            const translatedPath = this._translateLegacyPath(path);
            
            if (translatedPath !== path) {
                this._deprecationWarning(`Path: ${path}`, `Path: ${translatedPath}`);
            }
            
            return originalSet(translatedPath, value, options);
        };
    }
    
    /**
     * Translate legacy path to new ML path
     * @private
     */
    _translateLegacyPath(path) {
        // Check direct mappings
        if (this.legacyMappings.has(path)) {
            return this.legacyMappings.get(path);
        }
        
        // Check if it's a nested legacy path
        for (const [legacy, modern] of this.legacyMappings) {
            if (path.startsWith(legacy + '.')) {
                return path.replace(legacy, modern);
            }
        }
        
        // Handle special cases
        if (path.startsWith('mlData.')) {
            return 'ml.' + path.substring(7);
        }
        
        if (path.startsWith('aiAnalysis.')) {
            return 'ml.analysis.' + path.substring(11);
        }
        
        return path;
    }
    
    /**
     * Setup legacy event listeners
     * @private
     */
    _setupLegacyEvents() {
        const KC = window.KnowledgeConsolidator;
        const EventBus = KC.EventBus;
        
        // Map new ML events to legacy events
        EventBus.on('ml:confidence:updated', (data) => {
            // Emit legacy event
            EventBus.emit('confidence:changed', {
                fileId: data.fileId,
                score: data.confidence,
                type: 'ml'
            });
        });
        
        EventBus.on('ml:state:imported', (data) => {
            // Emit legacy event
            EventBus.emit('state:ml:loaded', {
                version: data.version,
                success: true
            });
        });
        
        // Handle legacy event names
        const legacyEventMap = {
            'ml:analysis:complete': 'analysis:ml:done',
            'ml:model:ready': 'model:initialized',
            'ml:embedding:generated': 'embedding:created'
        };
        
        Object.entries(legacyEventMap).forEach(([modern, legacy]) => {
            EventBus.on(modern, (data) => {
                EventBus.emit(legacy, data);
            });
        });
    }
    
    /**
     * Initialize legacy data structures
     * @private
     */
    _initializeLegacyStructures() {
        // Check for legacy data in AppState
        const state = this.appState.get();
        
        // Migrate legacy ML data if exists
        if (state.mlData && !state.ml) {
            console.log('Migrating legacy mlData to ml namespace');
            this._migrateLegacyData(state.mlData);
        }
        
        // Ensure legacy fields exist for compatibility
        this._ensureLegacyFields();
    }
    
    /**
     * Migrate legacy ML data to new structure
     * @private
     */
    _migrateLegacyData(legacyData) {
        const migrated = {
            confidence: {
                global: {
                    score: legacyData.globalConfidence || 0,
                    lastUpdate: legacyData.lastUpdate || null,
                    history: legacyData.confidenceHistory || []
                },
                byFile: legacyData.fileConfidences || {}
            },
            analysis: {
                completed: legacyData.analysisResults || {},
                statistics: legacyData.stats || {}
            },
            embeddings: {
                generated: legacyData.embeddings || {}
            }
        };
        
        // Import as ML state
        this.mlExtension.importMLState({
            state: migrated,
            version: '1.0.0'
        }).then(() => {
            console.log('Legacy ML data migrated successfully');
            
            // Remove legacy data
            this.appState.set('mlData', undefined, { silent: true });
        }).catch(error => {
            console.error('Failed to migrate legacy ML data:', error);
        });
    }
    
    /**
     * Ensure legacy fields exist
     * @private
     */
    _ensureLegacyFields() {
        // Add computed properties for legacy access
        Object.defineProperty(this.appState, 'mlEnabled', {
            get: () => {
                const config = this.mlExtension.getML('config');
                return config?.autoAnalysis || false;
            },
            set: (value) => {
                this._deprecationWarning('mlEnabled', 'setML("config.autoAnalysis", value)');
                this.mlExtension.setML('config.autoAnalysis', value);
            }
        });
        
        Object.defineProperty(this.appState, 'mlReady', {
            get: () => {
                const models = this.mlExtension.getML('models');
                return models?.active !== null;
            }
        });
        
        Object.defineProperty(this.appState, 'totalMLProcessed', {
            get: () => {
                const stats = this.mlExtension.getML('analysis.statistics');
                return stats?.totalAnalyzed || 0;
            }
        });
    }
    
    /**
     * Show deprecation warning
     * @private
     */
    _deprecationWarning(oldMethod, newMethod) {
        const key = `${oldMethod}->${newMethod}`;
        
        if (!this.deprecationWarnings.has(key)) {
            console.warn(
                `[MLStateExtension] DEPRECATION: "${oldMethod}" is deprecated. ` +
                `Please use "${newMethod}" instead.`
            );
            this.deprecationWarnings.add(key);
        }
    }
    
    /**
     * Get legacy compatibility report
     * @returns {Object} Compatibility report
     */
    getCompatibilityReport() {
        return {
            deprecatedMethodsUsed: Array.from(this.deprecationWarnings),
            legacyPathMappings: Array.from(this.legacyMappings.entries()),
            legacyMethodsAvailable: Object.keys(this.methodMappings),
            migrationStatus: {
                hasLegacyData: !!this.appState.get('mlData'),
                mlStateInitialized: !!this.appState.get('ml')
            }
        };
    }
    
    /**
     * Create legacy data snapshot
     * @returns {Object} Legacy format data
     */
    createLegacySnapshot() {
        const mlState = this.mlExtension.getML();
        
        // Convert to legacy format
        return {
            mlData: {
                globalConfidence: mlState.confidence.global.score,
                lastUpdate: mlState.confidence.global.lastUpdate,
                confidenceHistory: mlState.confidence.global.history,
                fileConfidences: mlState.confidence.byFile,
                analysisResults: mlState.analysis.completed,
                stats: mlState.analysis.statistics,
                embeddings: mlState.embeddings.generated,
                currentModel: mlState.models.active
            },
            mlConfig: {
                enabled: mlState.config.autoAnalysis,
                batchSize: mlState.config.batchSize,
                cacheTime: mlState.config.cacheDuration
            },
            mlVersion: '1.0.0'
        };
    }
    
    /**
     * Enable strict mode (throws errors instead of warnings)
     */
    enableStrictMode() {
        this.strictMode = true;
        
        // Override deprecation warning to throw
        const originalWarning = this._deprecationWarning.bind(this);
        this._deprecationWarning = (oldMethod, newMethod) => {
            if (this.strictMode) {
                throw new Error(
                    `[MLStateExtension] STRICT MODE: "${oldMethod}" is deprecated. ` +
                    `You must use "${newMethod}" instead.`
                );
            }
            originalWarning(oldMethod, newMethod);
        };
    }
    
    /**
     * Disable legacy support (for testing modern code)
     */
    disable() {
        // Remove legacy methods
        Object.keys(this.methodMappings).forEach(oldName => {
            delete this.appState[oldName];
        });
        
        // Remove other legacy methods
        const legacyMethods = [
            'getFileConfidence', 'setFileConfidence',
            'getAnalysisResult', 'saveAnalysisResult',
            'hasEmbedding', 'getEmbedding',
            'batchUpdateML', 'getMLStatistics',
            'getCurrentModel', 'setCurrentModel',
            'getLegacy', 'setLegacy'
        ];
        
        legacyMethods.forEach(method => {
            delete this.appState[method];
        });
        
        console.log('Legacy support disabled');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegacySupport;
} else if (typeof window !== 'undefined') {
    window.LegacySupport = LegacySupport;
}