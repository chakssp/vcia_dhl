/**
 * Advanced Knowledge Processing Module
 * Comprehensive feature implementation for heavy load testing
 * 
 * This module provides sophisticated knowledge processing capabilities including:
 * - Multi-provider AI analysis with intelligent fallback
 * - Advanced semantic chunking and embedding generation
 * - Real-time confidence scoring and validation
 * - Distributed processing with worker pool management
 * - Comprehensive error handling and recovery mechanisms
 * 
 * @version 2.0.0
 * @author PKC Development Team
 * @license MIT
 */

import { EventBus, Events } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { PerformanceMetrics } from '../utils/PerformanceMetrics.js';
import { ConfigManager } from '../managers/ConfigManager.js';

/**
 * Advanced Knowledge Processor
 * Core processor for handling complex knowledge analysis workflows
 */
class AdvancedKnowledgeProcessor {
    constructor(config = {}) {
        this.config = {
            maxConcurrentJobs: config.maxConcurrentJobs || 5,
            batchSize: config.batchSize || 10,
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            enableCaching: config.enableCaching !== false,
            workerPoolSize: config.workerPoolSize || 4,
            confidenceThreshold: config.confidenceThreshold || 0.7,
            ...config
        };

        this.processingQueue = new Map();
        this.activeJobs = new Map();
        this.workerPool = [];
        this.cache = new Map();
        this.metrics = new PerformanceMetrics('AdvancedKnowledgeProcessor');
        this.logger = new Logger('AKP');

        this.initializeWorkerPool();
        this.setupEventListeners();
        
        this.logger.info('AdvancedKnowledgeProcessor initialized', { config: this.config });
    }

    /**
     * Initialize worker pool for distributed processing
     * Creates and manages web workers for CPU-intensive tasks
     */
    initializeWorkerPool() {
        for (let i = 0; i < this.config.workerPoolSize; i++) {
            const worker = new Worker('/js/workers/knowledge-worker.js');
            worker.id = `worker-${i}`;
            worker.busy = false;
            worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
            worker.onerror = (error) => this.handleWorkerError(worker, error);
            this.workerPool.push(worker);
        }
        
        this.logger.info('Worker pool initialized', { size: this.config.workerPoolSize });
    }

    /**
     * Setup event listeners for system-wide events
     */
    setupEventListeners() {
        EventBus.on(Events.ANALYSIS_REQUESTED, (data) => this.handleAnalysisRequest(data));
        EventBus.on(Events.BATCH_PROCESSING_REQUESTED, (data) => this.handleBatchRequest(data));
        EventBus.on(Events.CONFIDENCE_VALIDATION_REQUESTED, (data) => this.handleConfidenceValidation(data));
        EventBus.on(Events.SYSTEM_SHUTDOWN, () => this.cleanup());
    }

    /**
     * Process knowledge items with advanced analysis
     * @param {Array} items - Items to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processKnowledge(items, options = {}) {
        const jobId = this.generateJobId();
        const startTime = Date.now();
        
        this.logger.info('Starting knowledge processing', { 
            jobId, 
            itemCount: items.length, 
            options 
        });

        try {
            this.metrics.startTiming('knowledge_processing');
            
            // Validate input
            const validatedItems = await this.validateInput(items);
            
            // Create processing job
            const job = this.createProcessingJob(jobId, validatedItems, options);
            this.activeJobs.set(jobId, job);
            
            // Execute processing pipeline
            const results = await this.executeProcessingPipeline(job);
            
            // Post-process results
            const finalResults = await this.postProcessResults(results, options);
            
            this.metrics.endTiming('knowledge_processing');
            this.metrics.increment('jobs_completed');
            
            this.logger.info('Knowledge processing completed', {
                jobId,
                duration: Date.now() - startTime,
                resultsCount: finalResults.length
            });

            return {
                success: true,
                jobId,
                results: finalResults,
                metrics: this.metrics.getMetrics(),
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            this.metrics.increment('jobs_failed');
            this.logger.error('Knowledge processing failed', { jobId, error: error.message, stack: error.stack });
            
            return {
                success: false,
                jobId,
                error: error.message,
                processingTime: Date.now() - startTime
            };
        } finally {
            this.activeJobs.delete(jobId);
        }
    }

    /**
     * Execute the complete processing pipeline
     * @param {Object} job - Processing job configuration
     * @returns {Promise<Array>} Processing results
     */
    async executeProcessingPipeline(job) {
        const { items, options } = job;
        const pipeline = [
            { name: 'preprocess', fn: this.preprocessItems.bind(this) },
            { name: 'analyze', fn: this.analyzeItems.bind(this) },
            { name: 'extract_features', fn: this.extractFeatures.bind(this) },
            { name: 'calculate_confidence', fn: this.calculateConfidence.bind(this) },
            { name: 'validate_results', fn: this.validateResults.bind(this) },
            { name: 'enrich_metadata', fn: this.enrichMetadata.bind(this) }
        ];

        let results = items;
        
        for (const stage of pipeline) {
            this.logger.debug(`Executing pipeline stage: ${stage.name}`);
            this.metrics.startTiming(`pipeline_${stage.name}`);
            
            try {
                results = await stage.fn(results, options);
                this.metrics.endTiming(`pipeline_${stage.name}`);
                this.metrics.increment(`pipeline_${stage.name}_success`);
                
                // Emit progress event
                EventBus.emit(Events.PIPELINE_PROGRESS, {
                    jobId: job.id,
                    stage: stage.name,
                    progress: ((pipeline.indexOf(stage) + 1) / pipeline.length) * 100,
                    resultsCount: results.length
                });
                
            } catch (error) {
                this.metrics.increment(`pipeline_${stage.name}_error`);
                this.logger.error(`Pipeline stage ${stage.name} failed`, { error: error.message });
                
                if (options.stopOnError) {
                    throw error;
                } else {
                    this.logger.warn(`Continuing pipeline despite ${stage.name} failure`);
                }
            }
        }

        return results;
    }

    /**
     * Preprocess items for analysis
     * @param {Array} items - Items to preprocess
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Preprocessed items
     */
    async preprocessItems(items, options) {
        const preprocessed = [];
        
        for (const item of items) {
            try {
                const processed = {
                    ...item,
                    id: item.id || this.generateItemId(),
                    timestamp: item.timestamp || Date.now(),
                    preprocessed: true,
                    cleanedContent: this.cleanContent(item.content),
                    extractedMetadata: this.extractMetadata(item),
                    normalizedData: this.normalizeData(item)
                };
                
                // Apply content filters
                if (this.passesContentFilters(processed, options.filters)) {
                    preprocessed.push(processed);
                }
                
            } catch (error) {
                this.logger.warn('Failed to preprocess item', { 
                    itemId: item.id, 
                    error: error.message 
                });
            }
        }
        
        this.logger.info('Items preprocessed', { 
            original: items.length, 
            processed: preprocessed.length 
        });
        
        return preprocessed;
    }

    /**
     * Analyze items using distributed processing
     * @param {Array} items - Items to analyze
     * @param {Object} options - Analysis options
     * @returns {Promise<Array>} Analyzed items
     */
    async analyzeItems(items, options) {
        const batches = this.createBatches(items, this.config.batchSize);
        const analysisPromises = [];
        
        for (const batch of batches) {
            const promise = this.analyzeBatch(batch, options);
            analysisPromises.push(promise);
            
            // Respect concurrency limits
            if (analysisPromises.length >= this.config.maxConcurrentJobs) {
                await Promise.race(analysisPromises);
            }
        }
        
        const batchResults = await Promise.allSettled(analysisPromises);
        const analyzed = [];
        
        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                analyzed.push(...result.value);
            } else {
                this.logger.error('Batch analysis failed', { error: result.reason });
            }
        }
        
        return analyzed;
    }

    /**
     * Analyze a batch of items
     * @param {Array} batch - Batch of items to analyze
     * @param {Object} options - Analysis options
     * @returns {Promise<Array>} Analyzed batch
     */
    async analyzeBatch(batch, options) {
        const worker = await this.getAvailableWorker();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Worker timeout'));
            }, this.config.timeout);

            worker.onmessage = (event) => {
                clearTimeout(timeout);
                worker.busy = false;
                
                if (event.data.success) {
                    resolve(event.data.results);
                } else {
                    reject(new Error(event.data.error));
                }
            };

            worker.busy = true;
            worker.postMessage({
                action: 'analyzeBatch',
                batch,
                options,
                config: this.config
            });
        });
    }

    /**
     * Extract features from analyzed items
     * @param {Array} items - Analyzed items
     * @param {Object} options - Feature extraction options
     * @returns {Promise<Array>} Items with extracted features
     */
    async extractFeatures(items, options) {
        const featuredItems = [];
        
        for (const item of items) {
            try {
                const features = {
                    semanticFeatures: await this.extractSemanticFeatures(item),
                    structuralFeatures: this.extractStructuralFeatures(item),
                    contextualFeatures: this.extractContextualFeatures(item),
                    temporalFeatures: this.extractTemporalFeatures(item),
                    statisticalFeatures: this.extractStatisticalFeatures(item)
                };
                
                featuredItems.push({
                    ...item,
                    features,
                    featureVector: this.createFeatureVector(features)
                });
                
            } catch (error) {
                this.logger.warn('Feature extraction failed for item', {
                    itemId: item.id,
                    error: error.message
                });
                
                // Add item without features
                featuredItems.push(item);
            }
        }
        
        return featuredItems;
    }

    /**
     * Extract semantic features using NLP techniques
     * @param {Object} item - Item to extract features from
     * @returns {Promise<Object>} Semantic features
     */
    async extractSemanticFeatures(item) {
        const content = item.cleanedContent || item.content;
        
        return {
            keyPhrases: await this.extractKeyPhrases(content),
            entities: await this.extractEntities(content),
            sentiment: await this.analyzeSentiment(content),
            topics: await this.extractTopics(content),
            embeddings: await this.generateEmbeddings(content),
            semanticSimilarity: await this.calculateSemanticSimilarity(content)
        };
    }

    /**
     * Extract structural features from content
     * @param {Object} item - Item to analyze
     * @returns {Object} Structural features
     */
    extractStructuralFeatures(item) {
        const content = item.content || '';
        
        return {
            wordCount: this.countWords(content),
            sentenceCount: this.countSentences(content),
            paragraphCount: this.countParagraphs(content),
            averageSentenceLength: this.calculateAverageSentenceLength(content),
            readabilityScore: this.calculateReadabilityScore(content),
            complexity: this.calculateComplexity(content),
            structure: this.analyzeStructure(content)
        };
    }

    /**
     * Calculate confidence scores for processed items
     * @param {Array} items - Items to calculate confidence for
     * @param {Object} options - Confidence calculation options
     * @returns {Promise<Array>} Items with confidence scores
     */
    async calculateConfidence(items, options) {
        const confidenceScorer = new ConfidenceScorer(this.config);
        const scoredItems = [];
        
        for (const item of items) {
            try {
                const confidence = await confidenceScorer.calculateOverallConfidence(item);
                
                scoredItems.push({
                    ...item,
                    confidence: {
                        overall: confidence.overall,
                        components: confidence.components,
                        factors: confidence.factors,
                        validation: confidence.validation,
                        timestamp: Date.now()
                    }
                });
                
            } catch (error) {
                this.logger.warn('Confidence calculation failed', {
                    itemId: item.id,
                    error: error.message
                });
                
                // Add with default confidence
                scoredItems.push({
                    ...item,
                    confidence: { overall: 0.5, error: error.message }
                });
            }
        }
        
        return scoredItems;
    }

    /**
     * Validate processing results
     * @param {Array} items - Items to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Array>} Validated items
     */
    async validateResults(items, options) {
        const validator = new ResultValidator(this.config);
        const validatedItems = [];
        
        for (const item of items) {
            const validation = await validator.validateItem(item);
            
            if (validation.isValid) {
                validatedItems.push({
                    ...item,
                    validation: {
                        isValid: true,
                        score: validation.score,
                        checks: validation.checks,
                        timestamp: Date.now()
                    }
                });
            } else {
                this.logger.warn('Item failed validation', {
                    itemId: item.id,
                    issues: validation.issues
                });
                
                if (options.includeInvalid) {
                    validatedItems.push({
                        ...item,
                        validation: {
                            isValid: false,
                            issues: validation.issues,
                            timestamp: Date.now()
                        }
                    });
                }
            }
        }
        
        return validatedItems;
    }

    /**
     * Enrich items with additional metadata
     * @param {Array} items - Items to enrich
     * @param {Object} options - Enrichment options
     * @returns {Promise<Array>} Enriched items
     */
    async enrichMetadata(items, options) {
        const enriched = [];
        
        for (const item of items) {
            try {
                const metadata = {
                    ...item.extractedMetadata,
                    processingMetadata: {
                        processedAt: Date.now(),
                        processingVersion: '2.0.0',
                        confidence: item.confidence?.overall || 0,
                        validation: item.validation?.isValid || false,
                        enrichmentLevel: 'full'
                    },
                    qualityMetrics: this.calculateQualityMetrics(item),
                    relationships: await this.findRelationships(item, items),
                    tags: this.generateTags(item),
                    categories: await this.suggestCategories(item)
                };
                
                enriched.push({
                    ...item,
                    metadata,
                    enriched: true
                });
                
            } catch (error) {
                this.logger.warn('Metadata enrichment failed', {
                    itemId: item.id,
                    error: error.message
                });
                
                enriched.push(item);
            }
        }
        
        return enriched;
    }

    /**
     * Get an available worker from the pool
     * @returns {Promise<Worker>} Available worker
     */
    async getAvailableWorker() {
        return new Promise((resolve) => {
            const checkWorkers = () => {
                const availableWorker = this.workerPool.find(worker => !worker.busy);
                if (availableWorker) {
                    resolve(availableWorker);
                } else {
                    setTimeout(checkWorkers, 100);
                }
            };
            checkWorkers();
        });
    }

    /**
     * Handle worker messages
     * @param {Worker} worker - Worker that sent the message
     * @param {MessageEvent} event - Message event
     */
    handleWorkerMessage(worker, event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'log':
                this.logger.debug(`Worker ${worker.id}: ${data.message}`, data.data);
                break;
                
            case 'error':
                this.logger.error(`Worker ${worker.id} error: ${data.message}`, data.error);
                break;
                
            case 'progress':
                EventBus.emit(Events.WORKER_PROGRESS, {
                    workerId: worker.id,
                    progress: data.progress,
                    stage: data.stage
                });
                break;
                
            default:
                this.logger.debug(`Unhandled worker message type: ${type}`);
        }
    }

    /**
     * Handle worker errors
     * @param {Worker} worker - Worker that encountered an error
     * @param {ErrorEvent} error - Error event
     */
    handleWorkerError(worker, error) {
        this.logger.error(`Worker ${worker.id} encountered an error`, {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno
        });
        
        // Mark worker as not busy so it can be reused
        worker.busy = false;
    }

    /**
     * Create processing job configuration
     * @param {string} jobId - Unique job identifier
     * @param {Array} items - Items to process
     * @param {Object} options - Processing options
     * @returns {Object} Job configuration
     */
    createProcessingJob(jobId, items, options) {
        return {
            id: jobId,
            items,
            options,
            startTime: Date.now(),
            status: 'running',
            progress: 0,
            metrics: {
                itemsProcessed: 0,
                itemsTotal: items.length,
                errors: 0,
                warnings: 0
            }
        };
    }

    /**
     * Validate input items
     * @param {Array} items - Items to validate
     * @returns {Promise<Array>} Validated items
     */
    async validateInput(items) {
        if (!Array.isArray(items)) {
            throw new Error('Items must be an array');
        }
        
        const validated = [];
        
        for (const item of items) {
            if (this.isValidItem(item)) {
                validated.push(item);
            } else {
                this.logger.warn('Invalid item detected', { item });
            }
        }
        
        if (validated.length === 0) {
            throw new Error('No valid items to process');
        }
        
        return validated;
    }

    /**
     * Check if an item is valid for processing
     * @param {Object} item - Item to validate
     * @returns {boolean} Whether the item is valid
     */
    isValidItem(item) {
        return item && 
               typeof item === 'object' && 
               (item.content || item.text || item.data);
    }

    /**
     * Generate unique job ID
     * @returns {string} Unique job identifier
     */
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique item ID
     * @returns {string} Unique item identifier
     */
    generateItemId() {
        return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.logger.info('Cleaning up AdvancedKnowledgeProcessor');
        
        // Terminate workers
        for (const worker of this.workerPool) {
            worker.terminate();
        }
        
        // Clear caches
        this.cache.clear();
        this.processingQueue.clear();
        this.activeJobs.clear();
        
        // Remove event listeners
        EventBus.off(Events.ANALYSIS_REQUESTED);
        EventBus.off(Events.BATCH_PROCESSING_REQUESTED);
        EventBus.off(Events.CONFIDENCE_VALIDATION_REQUESTED);
        EventBus.off(Events.SYSTEM_SHUTDOWN);
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing statistics
     */
    getStats() {
        return {
            activeJobs: this.activeJobs.size,
            queuedJobs: this.processingQueue.size,
            workers: {
                total: this.workerPool.length,
                busy: this.workerPool.filter(w => w.busy).length,
                available: this.workerPool.filter(w => !w.busy).length
            },
            cache: {
                size: this.cache.size,
                hitRate: this.calculateCacheHitRate()
            },
            metrics: this.metrics.getMetrics()
        };
    }
}

/**
 * Confidence Scorer
 * Calculates confidence scores for processed items
 */
class ConfidenceScorer {
    constructor(config) {
        this.config = config;
        this.weights = {
            contentQuality: 0.3,
            analysisQuality: 0.25,
            featureQuality: 0.2,
            validationQuality: 0.15,
            metadataQuality: 0.1
        };
    }

    /**
     * Calculate overall confidence score
     * @param {Object} item - Item to score
     * @returns {Promise<Object>} Confidence score object
     */
    async calculateOverallConfidence(item) {
        const components = {
            content: this.scoreContentQuality(item),
            analysis: this.scoreAnalysisQuality(item),
            features: this.scoreFeatureQuality(item),
            validation: this.scoreValidationQuality(item),
            metadata: this.scoreMetadataQuality(item)
        };

        const weighted = Object.keys(components).reduce((sum, key) => {
            return sum + (components[key] * this.weights[`${key}Quality`]);
        }, 0);

        return {
            overall: Math.min(1.0, Math.max(0.0, weighted)),
            components,
            factors: this.identifyConfidenceFactors(item, components),
            validation: this.validateConfidenceScore(weighted, item)
        };
    }

    scoreContentQuality(item) {
        const content = item.cleanedContent || item.content || '';
        let score = 0.5; // Base score

        // Length factor
        if (content.length > 100) score += 0.1;
        if (content.length > 500) score += 0.1;

        // Structure factor
        if (content.includes('\n\n')) score += 0.1; // Paragraphs
        if (content.match(/[.!?]/g)?.length > 3) score += 0.1; // Sentences

        // Content richness
        const words = content.split(/\s+/).length;
        const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
        if (uniqueWords / words > 0.7) score += 0.2; // Vocabulary diversity

        return Math.min(1.0, score);
    }

    scoreAnalysisQuality(item) {
        if (!item.analysis) return 0.3; // Default if no analysis

        let score = 0.5;
        
        if (item.analysis.type) score += 0.2;
        if (item.analysis.insights?.length > 0) score += 0.2;
        if (item.analysis.confidence > 0.7) score += 0.1;

        return Math.min(1.0, score);
    }

    scoreFeatureQuality(item) {
        if (!item.features) return 0.4; // Default if no features

        let score = 0.3;
        
        if (item.features.semanticFeatures) score += 0.2;
        if (item.features.structuralFeatures) score += 0.1;
        if (item.features.contextualFeatures) score += 0.1;
        if (item.featureVector?.length > 0) score += 0.3;

        return Math.min(1.0, score);
    }

    scoreValidationQuality(item) {
        if (!item.validation) return 0.5; // Default if no validation

        return item.validation.isValid ? 
            (item.validation.score || 0.8) : 0.2;
    }

    scoreMetadataQuality(item) {
        let score = 0.3; // Base score

        if (item.metadata?.processingMetadata) score += 0.2;
        if (item.metadata?.qualityMetrics) score += 0.2;
        if (item.metadata?.relationships?.length > 0) score += 0.15;
        if (item.metadata?.tags?.length > 0) score += 0.15;

        return Math.min(1.0, score);
    }

    identifyConfidenceFactors(item, components) {
        const factors = [];

        if (components.content > 0.8) factors.push('high_content_quality');
        if (components.analysis > 0.8) factors.push('strong_analysis');
        if (components.features > 0.8) factors.push('rich_features');
        if (components.validation > 0.8) factors.push('validated');

        if (components.content < 0.4) factors.push('poor_content');
        if (components.analysis < 0.4) factors.push('weak_analysis');

        return factors;
    }

    validateConfidenceScore(score, item) {
        return {
            isReliable: score > this.config.confidenceThreshold,
            hasWarnings: score < 0.6,
            needsReview: score < 0.4,
            factors: this.getValidationFactors(score, item)
        };
    }

    getValidationFactors(score, item) {
        const factors = [];

        if (score > 0.9) factors.push('very_high_confidence');
        else if (score > 0.7) factors.push('high_confidence');
        else if (score > 0.5) factors.push('medium_confidence');
        else if (score > 0.3) factors.push('low_confidence');
        else factors.push('very_low_confidence');

        return factors;
    }
}

/**
 * Result Validator
 * Validates processing results for quality and consistency
 */
class ResultValidator {
    constructor(config) {
        this.config = config;
        this.validationRules = this.initializeValidationRules();
    }

    initializeValidationRules() {
        return [
            { name: 'hasContent', fn: this.validateHasContent.bind(this), weight: 0.3 },
            { name: 'hasAnalysis', fn: this.validateHasAnalysis.bind(this), weight: 0.2 },
            { name: 'hasFeatures', fn: this.validateHasFeatures.bind(this), weight: 0.2 },
            { name: 'hasMetadata', fn: this.validateHasMetadata.bind(this), weight: 0.15 },
            { name: 'hasConfidence', fn: this.validateHasConfidence.bind(this), weight: 0.15 }
        ];
    }

    async validateItem(item) {
        const checks = {};
        let totalScore = 0;
        const issues = [];

        for (const rule of this.validationRules) {
            try {
                const result = await rule.fn(item);
                checks[rule.name] = result;
                totalScore += result.passed ? rule.weight : 0;

                if (!result.passed) {
                    issues.push({
                        rule: rule.name,
                        message: result.message,
                        severity: result.severity || 'warning'
                    });
                }
            } catch (error) {
                checks[rule.name] = { passed: false, error: error.message };
                issues.push({
                    rule: rule.name,
                    message: `Validation error: ${error.message}`,
                    severity: 'error'
                });
            }
        }

        return {
            isValid: totalScore >= 0.6 && issues.filter(i => i.severity === 'error').length === 0,
            score: totalScore,
            checks,
            issues
        };
    }

    validateHasContent(item) {
        const hasContent = !!(item.content || item.cleanedContent || item.text);
        return {
            passed: hasContent,
            message: hasContent ? 'Item has content' : 'Item missing content',
            severity: hasContent ? 'info' : 'error'
        };
    }

    validateHasAnalysis(item) {
        const hasAnalysis = !!item.analysis;
        return {
            passed: hasAnalysis,
            message: hasAnalysis ? 'Item has analysis' : 'Item missing analysis',
            severity: hasAnalysis ? 'info' : 'warning'
        };
    }

    validateHasFeatures(item) {
        const hasFeatures = !!item.features;
        return {
            passed: hasFeatures,
            message: hasFeatures ? 'Item has features' : 'Item missing features',
            severity: hasFeatures ? 'info' : 'warning'
        };
    }

    validateHasMetadata(item) {
        const hasMetadata = !!item.metadata;
        return {
            passed: hasMetadata,
            message: hasMetadata ? 'Item has metadata' : 'Item missing metadata',
            severity: hasMetadata ? 'info' : 'info'
        };
    }

    validateHasConfidence(item) {
        const hasConfidence = !!item.confidence;
        return {
            passed: hasConfidence,
            message: hasConfidence ? 'Item has confidence score' : 'Item missing confidence score',
            severity: hasConfidence ? 'info' : 'warning'
        };
    }
}

export { AdvancedKnowledgeProcessor, ConfidenceScorer, ResultValidator };