/**
 * v1_to_v2.js - Migration from ML state v1.0.0 to v2.0.0
 * 
 * This migration handles the transition from the initial ML state structure
 * to the enhanced v2 structure with improved confidence tracking and integrations.
 */

const v1_to_v2_migration = {
    /**
     * Validate that the state can be migrated
     * @param {Object} state - State to validate
     * @returns {boolean} True if valid for migration
     */
    validate(state) {
        // Check if it's a v1 state
        if (!state.version || state.version !== '1.0.0') {
            console.warn('State version mismatch for v1 to v2 migration');
            return false;
        }
        
        // Basic structure validation
        if (!state.confidence || !state.analysis) {
            console.warn('Missing required v1 state properties');
            return false;
        }
        
        return true;
    },
    
    /**
     * Migrate state from v1 to v2
     * @param {Object} state - v1 state
     * @returns {Object} v2 state
     */
    async migrate(state) {
        console.log('Starting migration from v1.0.0 to v2.0.0');
        
        const migratedState = {
            version: '2.0.0',
            
            // Enhanced confidence structure
            confidence: this._migrateConfidence(state.confidence),
            
            // Enhanced models structure
            models: this._migrateModels(state.models),
            
            // Enhanced analysis structure
            analysis: this._migrateAnalysis(state.analysis),
            
            // New embeddings section
            embeddings: this._createEmbeddingsSection(state),
            
            // Migrate config with new options
            config: this._migrateConfig(state.config),
            
            // New training section
            training: this._createTrainingSection(state),
            
            // New integrations section
            integrations: this._createIntegrationsSection(state),
            
            // Enhanced metadata
            metadata: this._migrateMetadata(state.metadata)
        };
        
        // Preserve any custom properties
        Object.keys(state).forEach(key => {
            if (!migratedState[key] && key !== 'version') {
                console.log(`Preserving custom property: ${key}`);
                migratedState[key] = state[key];
            }
        });
        
        console.log('Migration to v2.0.0 completed');
        return migratedState;
    },
    
    /**
     * Rollback migration if something goes wrong
     * @param {Object} state - Failed state
     * @param {Object} backup - Original state backup
     * @returns {Object} Restored state
     */
    async rollback(state, backup) {
        console.log('Rolling back v1 to v2 migration');
        return backup;
    },
    
    /**
     * Migrate confidence structure
     * @private
     */
    _migrateConfidence(v1Confidence) {
        const v2Confidence = {
            global: {
                score: v1Confidence.globalScore || 0,
                lastUpdate: v1Confidence.lastUpdate || null,
                history: v1Confidence.history || [],
                trend: this._calculateTrend(v1Confidence.history || [])
            },
            byCategory: {},
            byFile: {},
            thresholds: {
                high: v1Confidence.thresholds?.high || 0.8,
                medium: v1Confidence.thresholds?.medium || 0.6,
                low: v1Confidence.thresholds?.low || 0.4
            }
        };
        
        // Migrate file confidence if exists
        if (v1Confidence.files) {
            Object.entries(v1Confidence.files).forEach(([fileId, confidence]) => {
                v2Confidence.byFile[fileId] = {
                    score: confidence.score || confidence,
                    timestamp: confidence.timestamp || new Date().toISOString(),
                    metadata: confidence.metadata || {},
                    history: confidence.history || [{ 
                        score: confidence.score || confidence, 
                        timestamp: new Date().toISOString() 
                    }]
                };
            });
        }
        
        // Migrate category confidence if exists
        if (v1Confidence.categories) {
            Object.entries(v1Confidence.categories).forEach(([category, data]) => {
                v2Confidence.byCategory[category] = {
                    scores: data.scores || [data.average || 0],
                    average: data.average || 0,
                    count: data.count || 1
                };
            });
        }
        
        return v2Confidence;
    },
    
    /**
     * Calculate trend from history
     * @private
     */
    _calculateTrend(history) {
        if (history.length < 2) return 'stable';
        
        const recent = history.slice(-5);
        const scores = recent.map(h => h.score || 0);
        const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length;
        const firstScore = scores[0];
        
        if (avgRecent > firstScore + 0.05) return 'improving';
        if (avgRecent < firstScore - 0.05) return 'declining';
        return 'stable';
    },
    
    /**
     * Migrate models structure
     * @private
     */
    _migrateModels(v1Models) {
        if (!v1Models) {
            return {
                active: null,
                available: [],
                cache: {},
                performance: {},
                lastSync: null
            };
        }
        
        return {
            active: v1Models.current || v1Models.active || null,
            available: v1Models.list || v1Models.available || [],
            cache: v1Models.cache || {},
            performance: this._createPerformanceMetrics(v1Models),
            lastSync: v1Models.lastSync || null
        };
    },
    
    /**
     * Create performance metrics from v1 data
     * @private
     */
    _createPerformanceMetrics(v1Models) {
        const performance = {};
        
        if (v1Models.metrics) {
            Object.entries(v1Models.metrics).forEach(([model, metrics]) => {
                performance[model] = {
                    avgResponseTime: metrics.avgTime || 0,
                    successRate: metrics.success || 0,
                    totalRequests: metrics.total || 0,
                    lastUsed: metrics.lastUsed || null
                };
            });
        }
        
        return performance;
    },
    
    /**
     * Migrate analysis structure
     * @private
     */
    _migrateAnalysis(v1Analysis) {
        return {
            queue: v1Analysis.queue || [],
            processing: v1Analysis.processing || [],
            completed: v1Analysis.completed || {},
            failed: v1Analysis.failed || {},
            statistics: {
                totalAnalyzed: v1Analysis.stats?.total || 0,
                successRate: v1Analysis.stats?.successRate || 0,
                averageTime: v1Analysis.stats?.avgTime || 0,
                byType: v1Analysis.stats?.byType || {}
            }
        };
    },
    
    /**
     * Create embeddings section
     * @private
     */
    _createEmbeddingsSection(v1State) {
        const embeddings = {
            generated: {},
            clusters: [],
            similarityCache: {},
            version: null
        };
        
        // Migrate any existing embedding data
        if (v1State.embeddings) {
            if (v1State.embeddings.files) {
                embeddings.generated = v1State.embeddings.files;
            }
            if (v1State.embeddings.clusters) {
                embeddings.clusters = v1State.embeddings.clusters;
            }
        }
        
        return embeddings;
    },
    
    /**
     * Migrate config with new options
     * @private
     */
    _migrateConfig(v1Config) {
        return {
            autoAnalysis: v1Config?.autoAnalysis ?? true,
            confidenceTracking: v1Config?.trackConfidence ?? true,
            adaptiveLearning: false, // New in v2
            batchSize: v1Config?.batchSize || 10,
            retryAttempts: v1Config?.retries || 3,
            cacheDuration: v1Config?.cacheTime || 3600000,
            compressionEnabled: true // New in v2
        };
    },
    
    /**
     * Create training section
     * @private
     */
    _createTrainingSection(v1State) {
        return {
            feedback: v1State.feedback || [],
            corrections: v1State.corrections || {},
            preferences: {},
            lastTraining: null
        };
    },
    
    /**
     * Create integrations section
     * @private
     */
    _createIntegrationsSection(v1State) {
        return {
            qdrant: {
                connected: v1State.qdrant?.connected || false,
                lastSync: v1State.qdrant?.lastSync || null,
                syncedFiles: new Set(v1State.qdrant?.synced || []),
                pendingSync: []
            },
            ollama: {
                available: v1State.ollama?.available || false,
                models: v1State.ollama?.models || [],
                lastCheck: v1State.ollama?.lastCheck || null
            }
        };
    },
    
    /**
     * Migrate metadata
     * @private
     */
    _migrateMetadata(v1Metadata) {
        return {
            created: v1Metadata?.created || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            dataVersion: 2, // Incremented from v1
            migrations: [
                ...(v1Metadata?.migrations || []),
                {
                    from: '1.0.0',
                    to: '2.0.0',
                    timestamp: new Date().toISOString(),
                    success: true
                }
            ]
        };
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = v1_to_v2_migration;
} else if (typeof window !== 'undefined') {
    // Register in global migrations object
    window.MLMigrations = window.MLMigrations || {};
    window.MLMigrations['1.0.0_to_2.0.0'] = v1_to_v2_migration;
}