/**
 * OptimizedCalculator - Performance-enhanced ML Confidence Calculator
 * 
 * Extends Wave 1 ConfidenceCalculator with performance optimizations:
 * - Web Worker pool for parallel processing
 * - Intelligent caching with LRU eviction
 * - Batch processing capabilities
 * - Memory-efficient feature extraction
 * - Optimized mathematical operations
 * 
 * Performance targets:
 * - Reduce calculation time from 2s to < 1s
 * - Support 100+ concurrent analyses
 * - 90%+ cache hit rate for repeated calculations
 * 
 * @extends {ConfidenceCalculator}
 */

import ConfidenceCalculator from '../../wave1/calculator/ConfidenceCalculator.js';
import MLWorkerPool from './MLWorkerPool.js';
import CacheStrategy from './CacheStrategy.js';
import BatchProcessor from './BatchProcessor.js';
import PerformanceMonitor from './PerformanceMonitor.js';

export default class OptimizedCalculator extends ConfidenceCalculator {
    constructor() {
        super();
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor('OptimizedCalculator');
        
        // Initialize worker pool for parallel processing
        this.workerPool = new MLWorkerPool({
            workerCount: navigator.hardwareConcurrency || 4,
            workerScript: '/agents_output/wave3/optimization/workers/ml-calculator.worker.js',
            maxQueueSize: 1000,
            timeout: 5000
        });
        
        // Initialize caching strategy
        this.cache = new CacheStrategy({
            maxSize: 1000,
            ttl: 3600000, // 1 hour
            strategy: 'LRU',
            namespace: 'ml-confidence',
            compressionEnabled: true
        });
        
        // Batch processor for parallel execution
        this.batchProcessor = new BatchProcessor({
            maxConcurrent: 20,
            batchSize: 10,
            timeout: 10000,
            retryAttempts: 2
        });
        
        // Feature extraction optimizations
        this.featureCache = new Map();
        this.maxFeatureCacheSize = 500;
        
        // Pre-compiled regex patterns for performance
        this.patterns = {
            sections: /^#+\s|^\d+\.\s/m,
            lists: /^[\*\-\+]\s|^\d+\.\s/m,
            code: /```[\s\S]*?```|`[^`]+`/,
            sentences: /[.!?]+/,
            words: /\s+/
        };
        
        // Optimization flags
        this.optimizationConfig = {
            enableWorkers: true,
            enableCaching: true,
            enableBatching: true,
            enableFeatureCaching: true,
            parallelDimensions: true,
            vectorizedOperations: true
        };
        
        this.setupOptimizations();
    }
    
    /**
     * Setup performance optimizations
     * @private
     */
    setupOptimizations() {
        // Pre-warm worker pool
        this.workerPool.warmup();
        
        // Setup performance monitoring
        this.performanceMonitor.startMonitoring();
        
        // Cache warming with common calculations
        this.warmCache();
    }
    
    /**
     * Calculate confidence with performance optimizations
     * @override
     * @param {object} analysisData - Analysis data
     * @returns {Promise<ConfidenceMetrics>} Optimized confidence metrics
     */
    async calculate(analysisData) {
        const timer = this.performanceMonitor.startTimer('calculate');
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(analysisData);
            const cached = await this.cache.get(cacheKey);
            
            if (cached && this.isCacheValid(cached, analysisData)) {
                this.performanceMonitor.recordMetric('cacheHit', 1);
                timer.end();
                return cached.value;
            }
            
            this.performanceMonitor.recordMetric('cacheMiss', 1);
            
            // Extract features with optimization
            const features = await this.extractFeaturesOptimized(analysisData);
            
            // Use worker pool for heavy computation if enabled
            let result;
            if (this.optimizationConfig.enableWorkers) {
                result = await this.calculateWithWorker(features, analysisData);
            } else {
                result = await this.calculateLocal(features, analysisData);
            }
            
            // Cache the result
            if (this.optimizationConfig.enableCaching) {
                await this.cache.set(cacheKey, {
                    value: result,
                    timestamp: Date.now(),
                    metadata: {
                        fileId: analysisData.fileId,
                        iteration: analysisData.iteration || 1
                    }
                });
            }
            
            timer.end();
            return result;
            
        } catch (error) {
            timer.end();
            this.performanceMonitor.recordError('calculate', error);
            throw error;
        }
    }
    
    /**
     * Calculate using worker pool
     * @private
     */
    async calculateWithWorker(features, analysisData) {
        const workerData = {
            features,
            weights: this.weights,
            config: this.config,
            analysisData: {
                fileId: analysisData.fileId,
                iteration: analysisData.iteration || 1,
                iterationHistory: analysisData.iterationHistory || []
            }
        };
        
        const result = await this.workerPool.execute('calculateConfidence', workerData);
        
        // Enhance with local convergence prediction
        result.convergencePrediction = this.convergencePredictor.predict(
            analysisData.fileId,
            result.overall,
            result.dimensions,
            analysisData.iterationHistory || []
        );
        
        return result;
    }
    
    /**
     * Calculate locally (fallback)
     * @private
     */
    async calculateLocal(features, analysisData) {
        const startTime = Date.now();
        
        // Calculate dimensions in parallel if enabled
        let dimensions;
        if (this.optimizationConfig.parallelDimensions) {
            dimensions = await this.calculateDimensionsParallel(features);
        } else {
            dimensions = this.calculateDimensionsSerial(features);
        }
        
        // Adaptive weights
        const weights = this.config.enableAdaptiveWeights ? 
            this.getAdaptiveWeights(features) : this.weights;
        
        // Calculate overall with vectorized operations
        const overall = this.optimizationConfig.vectorizedOperations ?
            this.calculateWeightedAverageVectorized(dimensions, weights) :
            this.calculateWeightedAverage(dimensions, weights);
        
        // Build result
        return {
            fileId: analysisData.fileId,
            dimensions,
            overall,
            convergencePrediction: this.convergencePredictor.predict(
                analysisData.fileId,
                overall,
                dimensions,
                analysisData.iterationHistory || []
            ),
            calculatedAt: new Date(),
            processingTime: Date.now() - startTime,
            algorithm: 'weighted_ensemble_optimized',
            weights
        };
    }
    
    /**
     * Extract features with optimization
     * @private
     */
    async extractFeaturesOptimized(analysisData) {
        // Check feature cache
        const featureCacheKey = `features:${analysisData.fileId}:${analysisData.modifiedAt}`;
        
        if (this.optimizationConfig.enableFeatureCaching && this.featureCache.has(featureCacheKey)) {
            return this.featureCache.get(featureCacheKey);
        }
        
        // Extract features with optimized methods
        const features = {
            // Content features (optimized)
            ...this.extractContentFeaturesOptimized(analysisData.content),
            
            // Semantic features (vectorized)
            ...this.extractSemanticFeaturesOptimized(analysisData.embeddings),
            
            // Categorical features
            categories: analysisData.categories || [],
            categoryCount: (analysisData.categories || []).length,
            categoryConfidence: analysisData.categoryConfidence || 0,
            
            // Structural features (cached regex)
            ...this.extractStructuralFeaturesOptimized(analysisData.content),
            
            // Temporal features
            ...this.extractTemporalFeatures(analysisData),
            
            // Iteration features
            iterationCount: analysisData.iterationCount || 0,
            previousConfidence: analysisData.previousConfidence || 0,
            improvementRate: analysisData.improvementRate || 0,
            
            // Metadata
            fileType: analysisData.fileType || 'unknown',
            fileSize: analysisData.fileSize || 0,
            path: analysisData.path || '',
            depth: (analysisData.path || '').split('/').length - 1
        };
        
        // Cache features
        if (this.optimizationConfig.enableFeatureCaching) {
            this.featureCache.set(featureCacheKey, features);
            
            // Maintain cache size
            if (this.featureCache.size > this.maxFeatureCacheSize) {
                const firstKey = this.featureCache.keys().next().value;
                this.featureCache.delete(firstKey);
            }
        }
        
        return features;
    }
    
    /**
     * Extract content features optimized
     * @private
     */
    extractContentFeaturesOptimized(content) {
        if (!content) {
            return {
                contentLength: 0,
                wordCount: 0,
                uniqueWords: 0,
                avgSentenceLength: 0
            };
        }
        
        // Single pass through content
        const words = content.split(this.patterns.words).filter(w => w.length > 0);
        const sentences = content.split(this.patterns.sentences).filter(s => s.trim().length > 0);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        
        return {
            contentLength: content.length,
            wordCount: words.length,
            uniqueWords: uniqueWords.size,
            avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0
        };
    }
    
    /**
     * Extract semantic features with vectorization
     * @private
     */
    extractSemanticFeaturesOptimized(embeddings) {
        if (!embeddings || embeddings.length === 0) {
            return {
                embeddings: [],
                embeddingMagnitude: 0,
                embeddingVariance: 0
            };
        }
        
        // Vectorized operations for performance
        let sum = 0;
        let sumSquares = 0;
        
        for (let i = 0; i < embeddings.length; i++) {
            sum += embeddings[i];
            sumSquares += embeddings[i] * embeddings[i];
        }
        
        const mean = sum / embeddings.length;
        const magnitude = Math.sqrt(sumSquares);
        
        // Calculate variance in second pass
        let varianceSum = 0;
        for (let i = 0; i < embeddings.length; i++) {
            const diff = embeddings[i] - mean;
            varianceSum += diff * diff;
        }
        const variance = varianceSum / embeddings.length;
        
        return {
            embeddings,
            embeddingMagnitude: magnitude,
            embeddingVariance: variance
        };
    }
    
    /**
     * Extract structural features with cached patterns
     * @private
     */
    extractStructuralFeaturesOptimized(content) {
        if (!content) {
            return {
                hasTitle: false,
                hasSections: false,
                hasLists: false,
                hasCode: false,
                formatQuality: 0
            };
        }
        
        // Use pre-compiled patterns
        const hasSections = this.patterns.sections.test(content);
        const hasLists = this.patterns.lists.test(content);
        const hasCode = this.patterns.code.test(content);
        
        // Calculate format quality
        let quality = 0.5;
        if (hasSections) quality += 0.2;
        if (hasLists) quality += 0.1;
        if (hasCode) quality += 0.1;
        if (content.length > 1000 && !hasSections) quality -= 0.2;
        
        return {
            hasTitle: content.startsWith('#') || content.includes('\n#'),
            hasSections,
            hasLists,
            hasCode,
            formatQuality: Math.max(0, Math.min(1, quality))
        };
    }
    
    /**
     * Extract temporal features
     * @private
     */
    extractTemporalFeatures(analysisData) {
        const now = Date.now();
        const createdAt = analysisData.createdAt ? new Date(analysisData.createdAt).getTime() : now;
        const modifiedAt = analysisData.modifiedAt ? new Date(analysisData.modifiedAt).getTime() : now;
        
        return {
            createdAt: new Date(createdAt),
            modifiedAt: new Date(modifiedAt),
            analysisTimestamp: new Date(now),
            daysSinceCreation: Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24)),
            daysSinceModification: Math.ceil((now - modifiedAt) / (1000 * 60 * 60 * 24))
        };
    }
    
    /**
     * Calculate dimensions in parallel
     * @private
     */
    async calculateDimensionsParallel(features) {
        const dimensionPromises = [
            this.dimensionScorers.calculateSemantic(features),
            this.dimensionScorers.calculateCategorical(features),
            this.dimensionScorers.calculateStructural(features),
            this.dimensionScorers.calculateTemporal(features)
        ];
        
        const [semantic, categorical, structural, temporal] = await Promise.all(dimensionPromises);
        
        return { semantic, categorical, structural, temporal };
    }
    
    /**
     * Calculate dimensions serially (fallback)
     * @private
     */
    calculateDimensionsSerial(features) {
        return {
            semantic: this.dimensionScorers.calculateSemantic(features),
            categorical: this.dimensionScorers.calculateCategorical(features),
            structural: this.dimensionScorers.calculateStructural(features),
            temporal: this.dimensionScorers.calculateTemporal(features)
        };
    }
    
    /**
     * Calculate weighted average with vectorization
     * @private
     */
    calculateWeightedAverageVectorized(dimensions, weights) {
        const dimensionArray = Object.values(dimensions);
        const weightArray = Object.keys(dimensions).map(key => weights[key] || 0);
        
        // Vectorized dot product
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < dimensionArray.length; i++) {
            weightedSum += dimensionArray[i] * weightArray[i];
            totalWeight += weightArray[i];
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    /**
     * Process batch of items with optimization
     * @param {array} items - Items to process
     * @returns {Promise<array>} Processed results
     */
    async processBatch(items) {
        const timer = this.performanceMonitor.startTimer('processBatch');
        
        try {
            // Use batch processor for parallel execution
            const results = await this.batchProcessor.process(items, async (item) => {
                return this.calculate(item);
            });
            
            timer.end();
            return results;
            
        } catch (error) {
            timer.end();
            this.performanceMonitor.recordError('processBatch', error);
            throw error;
        }
    }
    
    /**
     * Generate cache key for analysis data
     * @private
     */
    generateCacheKey(analysisData) {
        // Create stable key from relevant data
        const keyData = {
            fileId: analysisData.fileId,
            contentHash: this.hashContent(analysisData.content),
            embeddingsHash: this.hashEmbeddings(analysisData.embeddings),
            categories: (analysisData.categories || []).sort().join(','),
            iteration: analysisData.iteration || 1,
            modifiedAt: analysisData.modifiedAt
        };
        
        return `confidence:${JSON.stringify(keyData)}`;
    }
    
    /**
     * Hash content for cache key
     * @private
     */
    hashContent(content) {
        if (!content) return 'empty';
        
        // Simple hash for performance
        let hash = 0;
        for (let i = 0; i < Math.min(content.length, 1000); i++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString(36);
    }
    
    /**
     * Hash embeddings for cache key
     * @private
     */
    hashEmbeddings(embeddings) {
        if (!embeddings || embeddings.length === 0) return 'empty';
        
        // Hash first few values and length
        const sample = embeddings.slice(0, 10);
        return `${embeddings.length}:${sample.map(v => v.toFixed(3)).join(',')}`;
    }
    
    /**
     * Check if cache entry is valid
     * @private
     */
    isCacheValid(cached, analysisData) {
        const metadata = cached.metadata;
        
        // Validate cache entry
        return metadata.fileId === analysisData.fileId &&
               (!analysisData.iteration || metadata.iteration === analysisData.iteration);
    }
    
    /**
     * Warm cache with common calculations
     * @private
     */
    async warmCache() {
        // Pre-calculate common patterns
        const commonPatterns = [
            { content: '', embeddings: [], categories: [] },
            { content: 'test', embeddings: new Array(768).fill(0), categories: ['general'] }
        ];
        
        for (const pattern of commonPatterns) {
            try {
                await this.calculate(pattern);
            } catch (error) {
                // Ignore warming errors
                console.debug('Cache warming error:', error.message);
            }
        }
    }
    
    /**
     * Get performance statistics
     * @returns {object} Performance stats
     */
    getPerformanceStats() {
        const baseStats = super.getPerformanceStats();
        const optimizationStats = this.performanceMonitor.getStats();
        const cacheStats = this.cache.getStats();
        const workerStats = this.workerPool.getStats();
        
        return {
            ...baseStats,
            optimization: {
                ...optimizationStats,
                cache: cacheStats,
                workers: workerStats,
                featureCacheSize: this.featureCache.size
            }
        };
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        await this.workerPool.terminate();
        await this.cache.clear();
        this.featureCache.clear();
        this.performanceMonitor.stopMonitoring();
    }
}