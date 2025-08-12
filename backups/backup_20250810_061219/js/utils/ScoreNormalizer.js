/**
 * ScoreNormalizer - Advanced score normalization and standardization
 * Implements UnifiedConfidenceSystem score normalization specification
 * 
 * Strategic Context: Handle multiple score types (percentage, qdrant, normalized)
 * and provide consistent 0-100 confidence values across the system
 */

class ScoreNormalizer {
    constructor() {
        this.logger = window.KC?.Logger || console;
        
        // Score type definitions and their expected ranges
        this.scoreTypes = {
            percentage: { min: 0, max: 100, description: 'Direct percentage (0-100)' },
            qdrant: { min: 0.1, max: 45.0, description: 'Qdrant similarity scores' },
            relevance: { min: 0, max: 1, description: 'Relevance scores (0-1)' },
            confidence: { min: 0, max: 1, description: 'ML confidence scores (0-1)' },
            intelligence: { min: 0, max: 50, description: 'Intelligence scoring system' },
            custom: { min: null, max: null, description: 'Custom range defined at runtime' }
        };

        // Normalization methods available
        this.methods = {
            linear: 'Linear scaling from source range to 0-100',
            logarithmic: 'Logarithmic scaling for exponential distributions',
            exponential: 'Exponential scaling for linear distributions',
            percentile: 'Percentile-based normalization using statistical distribution',
            sigmoid: 'Sigmoid normalization for smooth curve mapping',
            minmax: 'Min-Max normalization with outlier handling'
        };

        // Statistical cache for percentile normalization
        this.statsCache = new Map();
        
        // Performance monitoring
        this.metrics = {
            totalNormalizations: 0,
            methodCounts: {},
            averageProcessingTime: 0,
            errors: 0
        };

        this.initialized = true;
        this.logger.info('ScoreNormalizer: Initialized with', Object.keys(this.scoreTypes).length, 'score types');
    }

    /**
     * Normalize a single score
     * @param {number} score - Raw score to normalize
     * @param {string} sourceType - Type of source score (percentage, qdrant, etc.)
     * @param {string} method - Normalization method (linear, logarithmic, etc.)
     * @param {Object} options - Additional options for normalization
     * @returns {Object} Normalized score with metadata
     */
    normalize(score, sourceType, method = 'linear', options = {}) {
        const startTime = performance.now();
        
        try {
            // Validate inputs
            const validation = this._validateInputs(score, sourceType, method);
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.error}`);
            }

            // Get source type configuration
            const sourceConfig = this.scoreTypes[sourceType];
            if (!sourceConfig) {
                throw new Error(`Unknown source type: ${sourceType}`);
            }

            // Apply normalization based on method
            let normalizedScore;
            const context = { sourceType, method, options, sourceConfig };

            switch (method) {
                case 'linear':
                    normalizedScore = this._linearNormalization(score, sourceConfig, options);
                    break;
                case 'logarithmic':
                    normalizedScore = this._logarithmicNormalization(score, sourceConfig, options);
                    break;
                case 'exponential':
                    normalizedScore = this._exponentialNormalization(score, sourceConfig, options);
                    break;
                case 'percentile':
                    normalizedScore = this._percentileNormalization(score, sourceType, options);
                    break;
                case 'sigmoid':
                    normalizedScore = this._sigmoidNormalization(score, sourceConfig, options);
                    break;
                case 'minmax':
                    normalizedScore = this._minMaxNormalization(score, sourceConfig, options);
                    break;
                default:
                    throw new Error(`Unknown normalization method: ${method}`);
            }

            // Ensure bounds and round
            normalizedScore = Math.max(0, Math.min(100, normalizedScore));
            normalizedScore = Math.round(normalizedScore * 100) / 100; // 2 decimal places

            // Update metrics
            this._updateMetrics(method, performance.now() - startTime);

            return {
                normalizedScore,
                originalScore: score,
                sourceType,
                method,
                confidence: this._calculateConfidence(score, sourceType, method),
                metadata: {
                    processingTime: performance.now() - startTime,
                    timestamp: new Date().toISOString(),
                    options: options
                }
            };

        } catch (error) {
            this.metrics.errors++;
            this.logger.error('ScoreNormalizer: Normalization failed', { score, sourceType, method, error });
            
            return {
                normalizedScore: 0,
                originalScore: score,
                sourceType,
                method,
                confidence: 0,
                error: error.message,
                metadata: {
                    processingTime: performance.now() - startTime,
                    timestamp: new Date().toISOString(),
                    failed: true
                }
            };
        }
    }

    /**
     * Normalize multiple scores in batch
     * @param {Array} scores - Array of {score, sourceType, method} objects
     * @param {Object} globalOptions - Options applied to all scores
     * @returns {Array} Array of normalized score results
     */
    normalizeBatch(scores, globalOptions = {}) {
        if (!Array.isArray(scores)) {
            throw new Error('Scores must be an array');
        }

        return scores.map(item => {
            const { score, sourceType, method = 'linear', options = {} } = item;
            const mergedOptions = { ...globalOptions, ...options };
            return this.normalize(score, sourceType, method, mergedOptions);
        });
    }

    /**
     * Auto-detect score type based on value and context
     * @param {number} score - Score to analyze
     * @param {Object} context - Additional context for detection
     * @returns {string} Detected score type
     */
    detectScoreType(score, context = {}) {
        // Check if it's already a percentage
        if (score >= 0 && score <= 100 && Number.isInteger(score)) {
            return 'percentage';
        }

        // Check if it's a decimal between 0-1 (common for ML scores)
        if (score >= 0 && score <= 1) {
            return context.isConfidence ? 'confidence' : 'relevance';
        }

        // Check if it's in Qdrant range
        if (score >= 0.1 && score <= 50) {
            return 'qdrant';
        }

        // Check context clues
        if (context.source === 'qdrant') return 'qdrant';
        if (context.source === 'ml') return 'confidence';
        if (context.source === 'relevance') return 'relevance';

        // Default to custom with auto-detected range
        return 'custom';
    }

    /**
     * Register custom score type
     * @param {string} typeName - Name of the custom type
     * @param {Object} config - Configuration {min, max, description}
     */
    registerScoreType(typeName, config) {
        if (!config.min || !config.max || config.min >= config.max) {
            throw new Error('Invalid score type configuration');
        }

        this.scoreTypes[typeName] = {
            min: config.min,
            max: config.max,
            description: config.description || `Custom score type: ${typeName}`
        };

        this.logger.info(`ScoreNormalizer: Registered custom score type '${typeName}'`);
    }

    /**
     * Get normalization statistics and performance metrics
     */
    getStats() {
        return {
            ...this.metrics,
            scoreTypes: Object.keys(this.scoreTypes),
            methods: Object.keys(this.methods),
            cacheSize: this.statsCache.size,
            initialized: this.initialized
        };
    }

    /**
     * Clear statistics cache (useful for memory management)
     */
    clearCache() {
        this.statsCache.clear();
        this.logger.info('ScoreNormalizer: Statistics cache cleared');
    }

    // Private Methods - Normalization Algorithms

    _linearNormalization(score, sourceConfig, options) {
        const { min, max } = this._getEffectiveRange(sourceConfig, options);
        return ((score - min) / (max - min)) * 100;
    }

    _logarithmicNormalization(score, sourceConfig, options) {
        const { min, max } = this._getEffectiveRange(sourceConfig, options);
        const logMin = Math.log(Math.max(min, 0.01)); // Avoid log(0)
        const logMax = Math.log(max);
        const logScore = Math.log(Math.max(score, 0.01));
        return ((logScore - logMin) / (logMax - logMin)) * 100;
    }

    _exponentialNormalization(score, sourceConfig, options) {
        const { min, max } = this._getEffectiveRange(sourceConfig, options);
        const normalized = (score - min) / (max - min);
        return (Math.exp(normalized) - 1) / (Math.exp(1) - 1) * 100;
    }

    _percentileNormalization(score, sourceType, options) {
        // Get or compute percentile distribution
        const stats = this._getOrComputeStats(sourceType, options);
        
        if (!stats || !stats.percentiles) {
            // Fallback to linear if no stats available
            return this._linearNormalization(score, this.scoreTypes[sourceType], options);
        }

        // Find percentile rank
        let percentile = 0;
        for (let p = 0; p <= 100; p += 5) {
            if (score <= stats.percentiles[p]) {
                percentile = p;
                break;
            }
        }

        return percentile;
    }

    _sigmoidNormalization(score, sourceConfig, options) {
        const { min, max } = this._getEffectiveRange(sourceConfig, options);
        const midpoint = options.midpoint || (min + max) / 2;
        const steepness = options.steepness || 1;
        
        const normalized = (score - min) / (max - min);
        const shifted = (normalized - 0.5) * steepness;
        const sigmoid = 1 / (1 + Math.exp(-shifted));
        
        return sigmoid * 100;
    }

    _minMaxNormalization(score, sourceConfig, options) {
        const { min, max } = this._getEffectiveRange(sourceConfig, options);
        
        // Handle outliers
        if (options.clipOutliers) {
            score = Math.max(min, Math.min(max, score));
        }
        
        return ((score - min) / (max - min)) * 100;
    }

    // Private Methods - Utilities

    _validateInputs(score, sourceType, method) {
        if (typeof score !== 'number' || isNaN(score)) {
            return { valid: false, error: 'Score must be a valid number' };
        }

        if (!this.scoreTypes[sourceType]) {
            return { valid: false, error: `Unknown source type: ${sourceType}` };
        }

        if (!this.methods[method]) {
            return { valid: false, error: `Unknown method: ${method}` };
        }

        return { valid: true };
    }

    _getEffectiveRange(sourceConfig, options) {
        return {
            min: options.customMin ?? sourceConfig.min,
            max: options.customMax ?? sourceConfig.max
        };
    }

    _calculateConfidence(score, sourceType, method) {
        // Simple confidence calculation based on source type reliability
        const typeConfidence = {
            percentage: 0.95,
            qdrant: 0.85,
            relevance: 0.80,
            confidence: 0.90,
            intelligence: 0.75,
            custom: 0.60
        };

        const methodConfidence = {
            linear: 0.90,
            logarithmic: 0.85,
            exponential: 0.85,
            percentile: 0.95,
            sigmoid: 0.80,
            minmax: 0.90
        };

        return Math.round((typeConfidence[sourceType] * methodConfidence[method]) * 100) / 100;
    }

    _getOrComputeStats(sourceType, options) {
        const cacheKey = `${sourceType}_${JSON.stringify(options)}`;
        
        if (this.statsCache.has(cacheKey)) {
            return this.statsCache.get(cacheKey);
        }

        // In a real implementation, this would compute stats from actual data
        // For now, return reasonable defaults based on score type
        const defaultStats = {
            qdrant: {
                percentiles: {
                    0: 0.1, 5: 2, 10: 5, 25: 10, 50: 21.5, 75: 35, 90: 42, 95: 44, 100: 45
                }
            },
            relevance: {
                percentiles: {
                    0: 0, 5: 0.05, 10: 0.1, 25: 0.25, 50: 0.5, 75: 0.75, 90: 0.9, 95: 0.95, 100: 1
                }
            }
        };

        const stats = defaultStats[sourceType];
        if (stats) {
            this.statsCache.set(cacheKey, stats);
        }

        return stats;
    }

    _updateMetrics(method, processingTime) {
        this.metrics.totalNormalizations++;
        this.metrics.methodCounts[method] = (this.metrics.methodCounts[method] || 0) + 1;
        
        // Update average processing time
        this.metrics.averageProcessingTime = 
            (this.metrics.averageProcessingTime * (this.metrics.totalNormalizations - 1) + processingTime) / 
            this.metrics.totalNormalizations;
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.ScoreNormalizer = ScoreNormalizer;

// Auto-initialize
window.KC.ScoreNormalizerInstance = new ScoreNormalizer();

// Register console commands
if (typeof window !== 'undefined') {
    window.kcnorm = {
        normalize: (score, type, method) => window.KC.ScoreNormalizerInstance.normalize(score, type, method),
        detect: (score, context) => window.KC.ScoreNormalizerInstance.detectScoreType(score, context),
        stats: () => window.KC.ScoreNormalizerInstance.getStats(),
        test: () => {
            // Test normalization with sample data
            const tests = [
                { score: 21.5, type: 'qdrant', method: 'linear' },
                { score: 0.75, type: 'relevance', method: 'percentile' },
                { score: 85, type: 'percentage', method: 'linear' },
                { score: 35.2, type: 'intelligence', method: 'sigmoid' }
            ];
            
            return tests.map(test => window.KC.ScoreNormalizerInstance.normalize(test.score, test.type, test.method));
        }
    };
}

export default ScoreNormalizer;