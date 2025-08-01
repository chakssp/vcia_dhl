/**
 * UnifiedConfidenceController - Main orchestrator for confidence system
 * Integrates all confidence components and manages the overall system flow
 * 
 * Strategic Context: Central coordinator that connects QdrantScoreBridge,
 * ScoreNormalizer, FeatureFlagManager, and PerformanceMonitor into a cohesive system
 */

class UnifiedConfidenceController {
    constructor() {
        this.logger = window.KC?.Logger || console;
        this.initialized = false;
        this.isProcessing = false;
        
        // Component references
        this.components = {
            scoreBridge: null,
            normalizer: null,
            featureFlags: null,
            performanceMonitor: null,
            validator: null
        };

        // System configuration
        this.config = {
            batchSize: 50,
            updateInterval: 5000,      // ms
            maxRetries: 3,
            fallbackEnabled: true,
            debugMode: false
        };

        // Event listeners
        this.listeners = new Map();
        
        // Processing queue
        this.processingQueue = [];
        this.processingResults = new Map();

        // System state
        this.state = {
            lastUpdate: null,
            processedFiles: 0,
            totalFiles: 0,
            confidence: 0,
            performance: 'unknown',
            errors: []
        };

        this.init();
    }

    /**
     * Initialize the unified confidence system
     */
    async init() {
        try {
            this.logger.info('UnifiedConfidenceController: Initializing...');
            
            // Check feature flags first
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Register console commands
            this.registerConsoleCommands();
            
            // Validate system health
            const validation = await this.validateSystemHealth();
            
            if (validation.success) {
                this.initialized = true;
                this.logger.info('UnifiedConfidenceController: Successfully initialized');
                
                // Start background processing if enabled
                if (this.components.featureFlags?.isEnabled('unified_confidence_system')) {
                    await this.startBackgroundProcessing();
                }
                
                return { success: true, validation };
            } else {
                throw new Error(`System validation failed: ${validation.error}`);
            }
            
        } catch (error) {
            this.logger.error('UnifiedConfidenceController: Initialization failed', error);
            this.state.errors.push({
                error: error.message,
                timestamp: new Date().toISOString(),
                phase: 'initialization'
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Process files and update confidence scores
     * @param {Array} files - Files to process
     * @param {Object} options - Processing options
     */
    async processFiles(files = null, options = {}) {
        if (this.isProcessing) {
            this.logger.warn('UnifiedConfidenceController: Processing already in progress');
            return { success: false, error: 'Processing already in progress' };
        }

        const endTiming = this.components.performanceMonitor?.startTiming('batchProcessing');
        
        try {
            this.isProcessing = true;
            
            // Get files from AppState if not provided
            const targetFiles = files || window.KC?.AppState?.get('files') || [];
            this.state.totalFiles = targetFiles.length;
            
            this.logger.info(`UnifiedConfidenceController: Processing ${targetFiles.length} files`);
            
            // Check if confidence system is enabled
            if (!this.components.featureFlags?.isEnabled('unified_confidence_system')) {
                return { success: false, error: 'Unified confidence system is disabled' };
            }

            // Initialize Qdrant bridge if not ready
            if (!this.components.scoreBridge.initialized) {
                await this.components.scoreBridge.initialize();
            }

            // Process files in batches
            const results = await this.processBatches(targetFiles, options);
            
            // Update AppState with confidence scores
            if (results.success && results.enhancedFiles.length > 0) {
                await this.updateAppStateWithConfidence(results.enhancedFiles);
            }

            // Update system state
            this.state.lastUpdate = new Date().toISOString();
            this.state.processedFiles = results.processedCount || 0;
            this.state.confidence = this.calculateSystemConfidence(results);
            
            // Record performance metrics
            if (endTiming) {
                endTiming({ 
                    filesProcessed: results.processedCount,
                    success: results.success 
                });
            }

            // Emit completion event
            this.emitEvent('CONFIDENCE_PROCESSING_COMPLETED', {
                processedFiles: results.processedCount,
                totalFiles: targetFiles.length,
                success: results.success,
                confidence: this.state.confidence
            });

            return results;
            
        } catch (error) {
            this.logger.error('UnifiedConfidenceController: Processing failed', error);
            
            if (endTiming) {
                endTiming({ error: error.message, success: false });
            }
            
            this.state.errors.push({
                error: error.message,
                timestamp: new Date().toISOString(),
                phase: 'processing'
            });
            
            return { success: false, error: error.message };
            
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get real-time confidence score for a single file
     * @param {string} fileId - File ID
     * @returns {Object} Confidence information
     */
    getFileConfidence(fileId) {
        if (!this.initialized) {
            return this.getFallbackConfidence(fileId);
        }

        const endTiming = this.components.performanceMonitor?.startTiming('scoreNormalization');
        
        try {
            // Get raw score from Qdrant bridge
            const qdrantScore = this.components.scoreBridge.getFileConfidence(fileId);
            
            // Normalize score if normalizer is available
            let normalizedScore = qdrantScore;
            if (this.components.normalizer && qdrantScore.rawScore > 0) {
                normalizedScore = this.components.normalizer.normalize(
                    qdrantScore.rawScore,
                    'qdrant',
                    'percentile'
                );
            }

            if (endTiming) {
                endTiming({ fileId, success: true });
            }

            return {
                fileId,
                confidence: normalizedScore.normalizedScore || qdrantScore.score,
                source: normalizedScore.source || qdrantScore.source,
                metadata: {
                    qdrantScore: qdrantScore.rawScore,
                    normalizationMethod: normalizedScore.method,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            this.logger.warn(`Failed to get confidence for file ${fileId}`, error);
            
            if (endTiming) {
                endTiming({ fileId, error: error.message, success: false });
            }
            
            return this.getFallbackConfidence(fileId);
        }
    }

    /**
     * Get system status and health metrics
     */
    getSystemStatus() {
        const status = {
            initialized: this.initialized,
            processing: this.isProcessing,
            state: { ...this.state },
            components: this.getComponentsStatus(),
            performance: this.components.performanceMonitor?.getHealthStatus(),
            featureFlags: this.components.featureFlags?.getConfidenceFlags(),
            lastValidation: this.components.validator?.lastValidation
        };

        return status;
    }

    /**
     * Enable confidence system with gradual rollout
     * @param {number} rolloutPercentage - Percentage of users to enable for
     */
    async enableConfidenceSystem(rolloutPercentage = 100) {
        try {
            this.logger.info(`UnifiedConfidenceController: Enabling confidence system at ${rolloutPercentage}%`);
            
            // Enable core flags
            this.components.featureFlags?.enable('unified_confidence_system', rolloutPercentage);
            this.components.featureFlags?.enable('qdrant_score_bridge', rolloutPercentage);
            
            // Enable UI features gradually
            if (rolloutPercentage >= 50) {
                this.components.featureFlags?.enable('enhanced_file_cards', Math.min(rolloutPercentage, 75));
            }
            
            if (rolloutPercentage >= 75) {
                this.components.featureFlags?.enable('confidence_color_coding', rolloutPercentage);
            }

            // Start background processing
            await this.startBackgroundProcessing();
            
            // Run system validation
            const validation = await this.components.validator?.runValidation({
                skipPerformanceBaseline: rolloutPercentage < 100,
                skipUserExperience: rolloutPercentage < 75
            });

            return {
                success: true,
                rolloutPercentage,
                validation: validation?.summary
            };
            
        } catch (error) {
            this.logger.error('UnifiedConfidenceController: Failed to enable system', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Emergency disable confidence system
     */
    async emergencyDisable() {
        try {
            this.logger.warn('UnifiedConfidenceController: Emergency disable triggered');
            
            // Stop background processing
            this.stopBackgroundProcessing();
            
            // Disable all confidence features
            const disableResults = this.components.featureFlags?.emergencyDisableConfidence();
            
            // Clear processing queue
            this.processingQueue = [];
            this.processingResults.clear();
            
            this.emitEvent('CONFIDENCE_SYSTEM_DISABLED', {
                reason: 'emergency',
                timestamp: new Date().toISOString(),
                disableResults
            });

            return { success: true, disableResults };
            
        } catch (error) {
            this.logger.error('UnifiedConfidenceController: Emergency disable failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Run comprehensive system diagnostics
     */
    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            system: this.getSystemStatus(),
            validation: null,
            performance: null,
            recommendations: []
        };

        try {
            // Run system validation
            if (this.components.validator) {
                diagnostics.validation = await this.components.validator.runValidation();
            }

            // Get performance metrics
            if (this.components.performanceMonitor) {
                diagnostics.performance = this.components.performanceMonitor.getPerformanceReport();
            }

            // Generate recommendations
            diagnostics.recommendations = this.generateSystemRecommendations(diagnostics);

        } catch (error) {
            diagnostics.error = error.message;
            this.logger.error('UnifiedConfidenceController: Diagnostics failed', error);
        }

        return diagnostics;
    }

    // Private Methods

    async initializeComponents() {
        // Initialize feature flags first (required for other components)
        this.components.featureFlags = window.KC?.FeatureFlagManagerInstance;
        if (!this.components.featureFlags) {
            throw new Error('FeatureFlagManager not available');
        }

        // Initialize other components if flags allow
        if (this.components.featureFlags.isEnabled('qdrant_score_bridge') || 
            this.components.featureFlags.isEnabled('unified_confidence_system')) {
            
            this.components.scoreBridge = window.KC?.QdrantScoreBridgeInstance;
            if (!this.components.scoreBridge) {
                this.components.scoreBridge = new (window.KC?.QdrantScoreBridge)();
            }

            this.components.normalizer = window.KC?.ScoreNormalizerInstance;
            if (!this.components.normalizer) {
                this.components.normalizer = new (window.KC?.ScoreNormalizer)();
            }
        }

        // Performance monitor (always available)
        this.components.performanceMonitor = window.KC?.ConfidencePerformanceMonitorInstance;
        
        // Validator (always available)  
        this.components.validator = window.KC?.DataValidationManagerInstance;

        this.logger.info('UnifiedConfidenceController: Components initialized', {
            scoreBridge: !!this.components.scoreBridge,
            normalizer: !!this.components.normalizer,
            featureFlags: !!this.components.featureFlags,
            performanceMonitor: !!this.components.performanceMonitor,
            validator: !!this.components.validator
        });
    }

    setupEventListeners() {
        // Listen for file updates
        if (window.KC?.EventBus) {
            window.KC.EventBus.on('FILES_UPDATED', (data) => {
                this.handleFilesUpdated(data);
            });

            window.KC.EventBus.on('STATE_CHANGED', (data) => {
                if (data.key === 'files') {
                    this.handleFilesUpdated(data);
                }
            });
        }

        // Listen for feature flag changes
        if (this.components.featureFlags) {
            this.components.featureFlags.onFlagChange('unified_confidence_system', (enabled) => {
                this.handleConfidenceSystemToggle(enabled);
            });
        }
    }

    async processBatches(files, options) {
        const batchSize = options.batchSize || this.config.batchSize;
        const results = {
            success: true,
            processedCount: 0,
            enhancedFiles: [],
            errors: []
        };

        // Process files in batches
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            
            try {
                const batchResults = await this.processBatch(batch, options);
                
                results.processedCount += batchResults.processedCount;
                results.enhancedFiles.push(...batchResults.enhancedFiles);
                
                if (batchResults.errors.length > 0) {
                    results.errors.push(...batchResults.errors);
                }

                // Update progress
                this.emitEvent('CONFIDENCE_PROCESSING_PROGRESS', {
                    processed: results.processedCount,
                    total: files.length,
                    percentage: Math.round((results.processedCount / files.length) * 100)
                });

                // Small delay between batches to prevent overwhelming the system
                if (i + batchSize < files.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                this.logger.error(`Batch processing failed for batch starting at ${i}`, error);
                results.errors.push({
                    batchStart: i,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return results;
    }

    async processBatch(files, options) {
        const enhancedFiles = this.components.scoreBridge.enhanceFilesWithConfidence(files);
        
        return {
            processedCount: files.length,
            enhancedFiles,
            errors: []
        };
    }

    async updateAppStateWithConfidence(enhancedFiles) {
        try {
            // Update AppState files with new confidence scores
            const currentFiles = window.KC?.AppState?.get('files') || [];
            
            const updatedFiles = currentFiles.map(file => {
                const enhanced = enhancedFiles.find(ef => ef.id === file.id);
                if (enhanced) {
                    return {
                        ...file,
                        confidence: enhanced.confidence,
                        confidenceSource: enhanced.confidenceSource,
                        confidenceMetadata: enhanced.confidenceMetadata
                    };
                }
                return file;
            });

            window.KC?.AppState?.set('files', updatedFiles);
            
            // Emit update event
            this.emitEvent('FILES_CONFIDENCE_UPDATED', {
                updatedCount: enhancedFiles.length,
                totalCount: currentFiles.length
            });

        } catch (error) {
            this.logger.error('Failed to update AppState with confidence scores', error);
            throw error;
        }
    }

    calculateSystemConfidence(results) {
        if (!results.success || results.processedCount === 0) {
            return 0;
        }

        const successRate = (results.processedCount - results.errors.length) / results.processedCount;
        const errorRate = results.errors.length / results.processedCount;
        
        // Base confidence from success rate
        let confidence = successRate * 100;
        
        // Adjust for system health
        const healthStatus = this.components.performanceMonitor?.getHealthStatus();
        if (healthStatus?.overall) {
            confidence = (confidence + healthStatus.overall) / 2;
        }
        
        return Math.round(confidence);
    }

    getFallbackConfidence(fileId) {
        return {
            fileId,
            confidence: 0,
            source: 'fallback',
            metadata: {
                reason: 'system_not_initialized',
                timestamp: new Date().toISOString()
            }
        };
    }

    getComponentsStatus() {
        return {
            scoreBridge: {
                available: !!this.components.scoreBridge,
                initialized: this.components.scoreBridge?.initialized || false,
                stats: this.components.scoreBridge?.getStats()
            },
            normalizer: {
                available: !!this.components.normalizer,
                stats: this.components.normalizer?.getStats()
            },
            featureFlags: {
                available: !!this.components.featureFlags,
                confidenceFlags: this.components.featureFlags?.getConfidenceFlags()
            },
            performanceMonitor: {
                available: !!this.components.performanceMonitor,
                health: this.components.performanceMonitor?.getHealthStatus()
            },
            validator: {
                available: !!this.components.validator,
                lastValidation: this.components.validator?.lastValidation
            }
        };
    }

    async validateSystemHealth() {
        try {
            const health = {
                success: true,
                components: {},
                errors: []
            };

            // Check each component
            Object.entries(this.components).forEach(([name, component]) => {
                if (component) {
                    health.components[name] = true;
                } else {
                    health.components[name] = false;
                    health.errors.push(`${name} not available`);
                }
            });

            // Check critical components
            const criticalComponents = ['featureFlags'];
            const missingCritical = criticalComponents.filter(comp => !health.components[comp]);
            
            if (missingCritical.length > 0) {
                health.success = false;
                health.error = `Critical components missing: ${missingCritical.join(', ')}`;
            }

            return health;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async startBackgroundProcessing() {
        if (this.backgroundInterval) {
            return; // Already running
        }

        this.backgroundInterval = setInterval(async () => {
            try {
                if (!this.isProcessing && this.components.featureFlags?.isEnabled('unified_confidence_system')) {
                    const files = window.KC?.AppState?.get('files') || [];
                    if (files.length > 0) {
                        await this.processFiles(files, { background: true });
                    }
                }
            } catch (error) {
                this.logger.warn('Background processing error', error);
            }
        }, this.config.updateInterval);

        this.logger.info('UnifiedConfidenceController: Background processing started');
    }

    stopBackgroundProcessing() {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
            this.logger.info('UnifiedConfidenceController: Background processing stopped');
        }
    }

    generateSystemRecommendations(diagnostics) {
        const recommendations = [];

        // Check system health
        if (diagnostics.system?.state?.confidence < 80) {
            recommendations.push({
                type: 'system_health',
                priority: 'high',
                message: 'System confidence is below 80%',
                action: 'Review error logs and consider system maintenance'
            });
        }

        // Check validation results
        if (diagnostics.validation?.summary?.criticalIssues > 0) {
            recommendations.push({
                type: 'critical_issues',
                priority: 'high',
                message: `${diagnostics.validation.summary.criticalIssues} critical issues found`,
                action: 'Address critical issues immediately'
            });
        }

        // Check performance
        if (diagnostics.performance?.summary?.overallHealth < 70) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'System performance is degraded',
                action: 'Optimize slow operations and check resource usage'
            });
        }

        return recommendations;
    }

    handleFilesUpdated(data) {
        // Queue files for confidence processing
        if (this.initialized && this.components.featureFlags?.isEnabled('unified_confidence_system')) {
            // Debounced processing to avoid overwhelming the system
            clearTimeout(this.updateTimeout);
            this.updateTimeout = setTimeout(() => {
                this.processFiles();
            }, 1000);
        }
    }

    handleConfidenceSystemToggle(enabled) {
        if (enabled) {
            this.startBackgroundProcessing();
        } else {
            this.stopBackgroundProcessing();
        }
    }

    emitEvent(eventName, data) {
        if (window.KC?.EventBus) {
            window.KC.EventBus.emit(eventName, data);
        }
    }

    registerConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.kcconfidence = {
                init: () => this.init(),
                process: (files, options) => this.processFiles(files, options),
                status: () => this.getSystemStatus(),
                enable: (percentage) => this.enableConfidenceSystem(percentage),
                disable: () => this.emergencyDisable(),
                diagnostics: () => this.runDiagnostics(),
                getConfidence: (fileId) => this.getFileConfidence(fileId),
                startBackground: () => this.startBackgroundProcessing(),
                stopBackground: () => this.stopBackgroundProcessing()
            };
        }
    }

    destroy() {
        this.stopBackgroundProcessing();
        this.processingQueue = [];
        this.processingResults.clear();
        this.listeners.clear();
        this.initialized = false;
        
        this.logger.info('UnifiedConfidenceController: Destroyed');
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.UnifiedConfidenceController = UnifiedConfidenceController;

// Auto-initialize
window.KC.UnifiedConfidenceControllerInstance = new UnifiedConfidenceController();

export default UnifiedConfidenceController;