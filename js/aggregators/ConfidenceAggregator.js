/**
 * ConfidenceAggregator - Combine multiple metrics into unified confidence score
 * Implements UnifiedConfidenceSystem aggregation specification
 * 
 * Strategic Context: Final stage that combines outputs from QdrantScoreBridge,
 * BoostCalculator, PrefixEnhancer, and ZeroRelevanceResolver into unified score
 */

class ConfidenceAggregator {
    constructor() {
        this.logger = window.KC?.Logger || console;
        this.featureFlags = window.KC?.FeatureFlagManagerInstance;
        this.scoreNormalizer = window.KC?.ScoreNormalizer;
        
        // Component references
        this.qdrantBridge = window.KC?.QdrantScoreBridgeInstance;
        this.boostCalculator = window.KC?.BoostCalculatorInstance;
        this.prefixEnhancer = window.KC?.PrefixEnhancerInstance;
        this.zeroResolver = window.KC?.ZeroRelevanceResolverInstance;
        
        // Default weights for aggregation
        this.defaultWeights = {
            qdrantScore: 0.4,        // 40% - Semantic similarity from Qdrant
            categoryBoost: 0.3,      // 30% - Category and context boosts
            prefixEnhancement: 0.2,  // 20% - Prefix-based enhancement
            contextual: 0.1          // 10% - Contextual factors
        };
        
        // Current weights (can be adjusted dynamically)
        this.weights = { ...this.defaultWeights };
        
        // Zero relevance handling
        this.zeroRelevanceWeights = {
            zeroResolution: 0.6,     // 60% - Zero relevance resolution
            contextual: 0.4          // 40% - Contextual factors
        };
        
        // Performance thresholds
        this.performanceTarget = 50; // Target < 50ms processing time
        
        // Statistics
        this.stats = {
            aggregations: 0,
            averageProcessingTime: 0,
            zeroRelevanceHandled: 0,
            componentFailures: {
                qdrant: 0,
                boost: 0,
                prefix: 0,
                zero: 0
            },
            weightAdjustments: 0,
            performanceBreaches: 0
        };
        
        this.cache = new Map();
        this.maxCacheSize = 500;
        
        this.initialize();
        this.registerConsoleCommands();
    }

    /**
     * Initialize the confidence aggregator
     */
    initialize() {
        try {
            this.logger.info('ConfidenceAggregator: Initializing...');
            
            // Validate component availability
            this.validateComponents();
            
            // Setup dynamic weight adjustment if needed
            this.setupDynamicWeights();
            
            this.initialized = true;
            this.logger.info('ConfidenceAggregator: Initialization complete');
            
        } catch (error) {
            this.logger.error('ConfidenceAggregator: Initialization failed', error);
        }
    }

    /**
     * Aggregate confidence factors into unified score
     * @param {Object} factors - Input factors from various components
     * @param {Object} options - Aggregation options
     * @returns {Object} Aggregated confidence result
     */
    async aggregate(factors, options = {}) {
        if (!this.isEnabled() || !this.initialized) {
            return this.getDefaultAggregation();
        }

        const startTime = performance.now();
        this.stats.aggregations++;
        
        try {
            // Validate input factors
            const validatedFactors = this.validateFactors(factors);
            
            // Check cache first
            const cacheKey = this.createCacheKey(validatedFactors, options);
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Choose aggregation strategy based on file characteristics
            const strategy = this.selectAggregationStrategy(validatedFactors, options);
            
            // Perform aggregation using selected strategy
            const aggregationResult = await this.performAggregation(validatedFactors, strategy, options);
            
            // Apply final normalization
            const normalizedResult = this.normalizeResult(aggregationResult);
            
            // Generate detailed breakdown for UI tooltips
            const breakdown = this.generateBreakdown(validatedFactors, aggregationResult, strategy);
            
            const finalResult = {
                ...normalizedResult,
                breakdown: breakdown,
                strategy: strategy.name,
                factors: validatedFactors,
                processingTime: performance.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // Update performance statistics
            this.updatePerformanceStats(finalResult.processingTime);
            
            // Cache result
            this.cacheResult(cacheKey, finalResult);
            
            return finalResult;

        } catch (error) {
            this.logger.error('ConfidenceAggregator: Aggregation failed', error);
            return this.getErrorAggregation(error);
        }
    }

    /**
     * Process single file through complete confidence pipeline
     * @param {Object} file - File object from AppState
     * @param {Object} context - Additional context
     * @returns {Object} Complete confidence analysis
     */
    async processFile(file, context = {}) {
        try {
            // Collect factors from all components
            const factors = await this.collectFactors(file, context);
            
            // Aggregate into final score
            const result = await this.aggregate(factors, { file, context });
            
            return {
                ...result,
                fileId: file.id,
                originalRelevance: file.relevanceScore || 0
            };

        } catch (error) {
            this.logger.error('ConfidenceAggregator: File processing failed', error);
            return this.getErrorAggregation(error);
        }
    }

    /**
     * Collect factors from all available components
     */
    async collectFactors(file, context) {
        const factors = {};
        
        try {
            // Get Qdrant score
            if (this.qdrantBridge) {
                const qdrantResult = this.qdrantBridge.getFileConfidence(file.id);
                factors.qdrantScore = {
                    score: qdrantResult.score || 0,
                    confidence: qdrantResult.score ? 1.0 : 0,
                    source: qdrantResult.source || 'none',
                    rawScore: qdrantResult.rawScore || 0
                };
            } else {
                factors.qdrantScore = { score: 0, confidence: 0, source: 'unavailable' };
                this.stats.componentFailures.qdrant++;
            }

        } catch (error) {
            this.logger.warn('ConfidenceAggregator: Qdrant factor collection failed', error);
            factors.qdrantScore = { score: 0, confidence: 0, source: 'error' };
            this.stats.componentFailures.qdrant++;
        }

        try {
            // Get boost calculation
            if (this.boostCalculator) {
                const boostResult = await this.boostCalculator.calculate(file, context);
                factors.categoryBoost = {
                    boost: boostResult.totalBoost || 1.0,
                    confidence: Math.min(boostResult.totalBoost / 2, 1.0),
                    breakdown: boostResult.breakdown || {},
                    strategy: boostResult.strategy || 'none'
                };
            } else {
                factors.categoryBoost = { boost: 1.0, confidence: 0, strategy: 'unavailable' };
                this.stats.componentFailures.boost++;
            }

        } catch (error) {
            this.logger.warn('ConfidenceAggregator: Boost factor collection failed', error);
            factors.categoryBoost = { boost: 1.0, confidence: 0, strategy: 'error' };
            this.stats.componentFailures.boost++;
        }

        try {
            // Get prefix enhancement
            if (this.prefixEnhancer) {
                const prefixResult = await this.prefixEnhancer.enhance(file, context);
                factors.prefixEnhancement = {
                    enhancement: prefixResult.enhancement || 0,
                    confidence: prefixResult.confidence || 0,
                    matches: prefixResult.prefixMatches || 0,
                    topMatches: prefixResult.topMatches || []
                };
            } else {
                factors.prefixEnhancement = { enhancement: 0, confidence: 0, matches: 0 };
                this.stats.componentFailures.prefix++;
            }

        } catch (error) {
            this.logger.warn('ConfidenceAggregator: Prefix factor collection failed', error);
            factors.prefixEnhancement = { enhancement: 0, confidence: 0, matches: 0 };
            this.stats.componentFailures.prefix++;
        }

        try {
            // Get zero relevance resolution if applicable
            if ((file.relevanceScore || 0) === 0 && this.zeroResolver) {
                const zeroResult = await this.zeroResolver.resolve(file, context);
                factors.zeroResolution = {
                    resolved: zeroResult.resolved || false,
                    newScore: zeroResult.newRelevanceScore || 0,
                    confidence: zeroResult.confidence || 0,
                    method: zeroResult.primaryMethod || 'none'
                };
            } else {
                factors.zeroResolution = { resolved: false, newScore: 0, confidence: 0, method: 'not_applicable' };
            }

        } catch (error) {
            this.logger.warn('ConfidenceAggregator: Zero resolution factor collection failed', error);
            factors.zeroResolution = { resolved: false, newScore: 0, confidence: 0, method: 'error' };
            this.stats.componentFailures.zero++;
        }

        // Add contextual factors
        factors.contextual = this.extractContextualFactors(file, context);
        
        return factors;
    }

    /**
     * Select appropriate aggregation strategy
     */
    selectAggregationStrategy(factors, options) {
        // Zero relevance strategy
        if (factors.zeroResolution && factors.zeroResolution.resolved) {
            this.stats.zeroRelevanceHandled++;
            return {
                name: 'zero_relevance',
                description: 'Special handling for resolved zero relevance files',
                weights: this.zeroRelevanceWeights
            };
        }

        // High confidence Qdrant strategy
        if (factors.qdrantScore && factors.qdrantScore.score > 50 && factors.qdrantScore.confidence > 0.8) {
            return {
                name: 'qdrant_dominant',
                description: 'High confidence Qdrant score dominates',
                weights: {
                    qdrantScore: 0.7,
                    categoryBoost: 0.2,
                    prefixEnhancement: 0.1,
                    contextual: 0.0
                }
            };
        }

        // Category-rich strategy
        if (factors.categoryBoost && factors.categoryBoost.boost > 2.0) {
            return {
                name: 'category_rich',
                description: 'High category boost influences score',
                weights: {
                    qdrantScore: 0.3,
                    categoryBoost: 0.4,
                    prefixEnhancement: 0.2,
                    contextual: 0.1
                }
            };
        }

        // Prefix-enhanced strategy
        if (factors.prefixEnhancement && factors.prefixEnhancement.matches > 5) {
            return {
                name: 'prefix_enhanced',
                description: 'Strong prefix matching found',
                weights: {
                    qdrantScore: 0.35,
                    categoryBoost: 0.25,
                    prefixEnhancement: 0.3,
                    contextual: 0.1
                }
            };
        }

        // Default balanced strategy
        return {
            name: 'balanced',
            description: 'Balanced aggregation of all factors',
            weights: this.weights
        };
    }

    /**
     * Perform aggregation using selected strategy
     */
    async performAggregation(factors, strategy, options) {
        const weights = strategy.weights;
        
        if (strategy.name === 'zero_relevance') {
            return this.performZeroRelevanceAggregation(factors, weights);
        }
        
        // Standard weighted aggregation
        let totalScore = 0;
        let totalWeight = 0;
        let confidenceSum = 0;
        let confidenceCount = 0;

        // Qdrant score contribution
        if (factors.qdrantScore && weights.qdrantScore > 0) {
            const contribution = factors.qdrantScore.score * weights.qdrantScore;
            totalScore += contribution;
            totalWeight += weights.qdrantScore;
            
            if (factors.qdrantScore.confidence > 0) {
                confidenceSum += factors.qdrantScore.confidence * weights.qdrantScore;
                confidenceCount += weights.qdrantScore;
            }
        }

        // Category boost contribution (apply as multiplier to base score)
        if (factors.categoryBoost && weights.categoryBoost > 0) {
            const baseScore = totalScore || 10; // Minimum base for boost calculation
            const boostContribution = (baseScore * (factors.categoryBoost.boost - 1)) * weights.categoryBoost;
            totalScore += boostContribution;
            totalWeight += weights.categoryBoost;
            
            if (factors.categoryBoost.confidence > 0) {
                confidenceSum += factors.categoryBoost.confidence * weights.categoryBoost;
                confidenceCount += weights.categoryBoost;
            }
        }

        // Prefix enhancement contribution (additive)
        if (factors.prefixEnhancement && weights.prefixEnhancement > 0) {
            const enhancementScore = factors.prefixEnhancement.enhancement * 100; // Convert 0-0.2 to 0-20
            const contribution = enhancementScore * weights.prefixEnhancement;
            totalScore += contribution;
            totalWeight += weights.prefixEnhancement;
            
            if (factors.prefixEnhancement.confidence > 0) {
                confidenceSum += factors.prefixEnhancement.confidence * weights.prefixEnhancement;
                confidenceCount += weights.prefixEnhancement;
            }
        }

        // Contextual contribution
        if (factors.contextual && weights.contextual > 0) {
            const contextualScore = this.calculateContextualScore(factors.contextual);
            const contribution = contextualScore * weights.contextual;
            totalScore += contribution;
            totalWeight += weights.contextual;
            
            confidenceSum += 0.5 * weights.contextual; // Moderate confidence for contextual
            confidenceCount += weights.contextual;
        }

        // Calculate final values
        const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        const averageConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

        return {
            score: finalScore,
            confidence: averageConfidence,
            totalWeight: totalWeight,
            strategy: strategy.name,
            contributions: {
                qdrant: factors.qdrantScore?.score * weights.qdrantScore || 0,
                boost: factors.categoryBoost ? (10 * (factors.categoryBoost.boost - 1)) * weights.categoryBoost : 0,
                prefix: factors.prefixEnhancement ? (factors.prefixEnhancement.enhancement * 100) * weights.prefixEnhancement : 0,
                contextual: factors.contextual ? this.calculateContextualScore(factors.contextual) * weights.contextual : 0
            }
        };
    }

    /**
     * Perform zero relevance specific aggregation
     */
    performZeroRelevanceAggregation(factors, weights) {
        const zeroFactor = factors.zeroResolution;
        const contextualFactor = factors.contextual;
        
        // Use resolved score as primary component
        const primaryScore = zeroFactor.newScore * weights.zeroResolution;
        
        // Add contextual enhancement
        const contextualScore = this.calculateContextualScore(contextualFactor) * weights.contextual;
        
        const finalScore = primaryScore + contextualScore;
        const confidence = zeroFactor.confidence * 0.8; // Slightly reduced confidence for zero resolution
        
        return {
            score: finalScore,
            confidence: confidence,
            strategy: 'zero_relevance',
            resolvedFrom: 0,
            resolutionMethod: zeroFactor.method,
            contributions: {
                zeroResolution: primaryScore,
                contextual: contextualScore
            }
        };
    }

    /**
     * Calculate contextual score from contextual factors
     */
    calculateContextualScore(contextualFactors) {
        if (!contextualFactors) return 0;
        
        let score = 0;
        
        // File recency factor
        if (contextualFactors.recency) {
            score += contextualFactors.recency * 10; // 0-1 to 0-10
        }
        
        // File size appropriateness
        if (contextualFactors.sizeAppropriate) {
            score += 5;
        }
        
        // Path relevance
        if (contextualFactors.pathRelevance) {
            score += contextualFactors.pathRelevance * 8; // 0-1 to 0-8
        }
        
        // Content quality indicators
        if (contextualFactors.qualityIndicators) {
            score += Math.min(contextualFactors.qualityIndicators * 2, 12);
        }
        
        return Math.min(score, 30); // Cap at 30
    }

    /**
     * Extract contextual factors from file and context
     */
    extractContextualFactors(file, context) {
        const now = new Date();
        const fileDate = new Date(file.lastModified || file.dateCreated || now);
        const daysSince = (now - fileDate) / (1000 * 60 * 60 * 24);
        
        return {
            recency: Math.max(0, 1 - (daysSince / 365)), // 0-1 based on age
            sizeAppropriate: file.size >= 100 && file.size <= 100000, // Boolean
            pathRelevance: this.calculatePathRelevance(file.path || ''),
            qualityIndicators: this.countQualityIndicators(file, context),
            hasCategories: (file.categories?.length || 0) > 0,
            isAnalyzed: Boolean(file.analyzed)
        };
    }

    /**
     * Calculate path relevance score
     */
    calculatePathRelevance(path) {
        if (!path) return 0;
        
        const relevantDirs = ['docs', 'documentation', 'src', 'lib', 'api', 'config', 'analysis'];
        const pathLower = path.toLowerCase();
        
        for (const dir of relevantDirs) {
            if (pathLower.includes(dir)) {
                return 1.0;
            }
        }
        
        // Organized structure bonus
        const levels = path.split(/[/\\]/).length;
        return levels >= 3 ? 0.6 : 0.3;
    }

    /**
     * Count quality indicators in file
     */
    countQualityIndicators(file, context) {
        const content = file.content || file.preview || context.content || '';
        if (!content) return 0;
        
        let indicators = 0;
        const lowerContent = content.toLowerCase();
        
        // Structure indicators
        if (content.match(/^#{1,6}\s+/m)) indicators++; // Headers
        if (content.match(/^[\s]*[-*+]\s+/m)) indicators++; // Lists
        if (content.match(/```/)) indicators++; // Code blocks
        if (content.match(/\[.*\]\(.*\)/)) indicators++; // Links
        
        // Content quality indicators
        const qualityWords = ['objective', 'summary', 'conclusion', 'result', 'analysis', 'solution'];
        for (const word of qualityWords) {
            if (lowerContent.includes(word)) {
                indicators++;
                break; // Count once for quality words
            }
        }
        
        return indicators;
    }

    /**
     * Validate input factors
     */
    validateFactors(factors) {
        const validated = {};
        
        // Ensure all expected factors exist with defaults
        validated.qdrantScore = factors.qdrantScore || { score: 0, confidence: 0, source: 'none' };
        validated.categoryBoost = factors.categoryBoost || { boost: 1.0, confidence: 0, strategy: 'none' };
        validated.prefixEnhancement = factors.prefixEnhancement || { enhancement: 0, confidence: 0, matches: 0 };
        validated.zeroResolution = factors.zeroResolution || { resolved: false, newScore: 0, confidence: 0 };
        validated.contextual = factors.contextual || {};
        
        return validated;
    }

    /**
     * Normalize final result to 0-100 scale
     */
    normalizeResult(aggregationResult) {
        let normalizedScore = aggregationResult.score;
        
        // Use ScoreNormalizer if available
        if (this.scoreNormalizer) {
            normalizedScore = this.scoreNormalizer.normalize(aggregationResult.score, {
                sourceRange: [0, 100],
                targetRange: [0, 100],
                method: 'linear'
            });
        }
        
        // Ensure bounds
        normalizedScore = Math.max(0, Math.min(100, normalizedScore));
        
        return {
            finalScore: Math.round(normalizedScore),
            confidence: Math.max(0, Math.min(1, aggregationResult.confidence)),
            rawScore: aggregationResult.score,
            normalizationApplied: Boolean(this.scoreNormalizer)
        };
    }

    /**
     * Generate detailed breakdown for UI tooltips
     */
    generateBreakdown(factors, aggregationResult, strategy) {
        return {
            strategy: {
                name: strategy.name,
                description: strategy.description,
                weights: strategy.weights
            },
            components: {
                qdrant: {
                    score: factors.qdrantScore.score,
                    contribution: aggregationResult.contributions?.qdrant || 0,
                    confidence: factors.qdrantScore.confidence,
                    source: factors.qdrantScore.source
                },
                boost: {
                    boost: factors.categoryBoost.boost,
                    contribution: aggregationResult.contributions?.boost || 0,
                    confidence: factors.categoryBoost.confidence,
                    strategy: factors.categoryBoost.strategy
                },
                prefix: {
                    enhancement: factors.prefixEnhancement.enhancement,
                    contribution: aggregationResult.contributions?.prefix || 0,
                    matches: factors.prefixEnhancement.matches,
                    confidence: factors.prefixEnhancement.confidence
                },
                contextual: {
                    score: this.calculateContextualScore(factors.contextual),
                    contribution: aggregationResult.contributions?.contextual || 0,
                    factors: factors.contextual
                }
            },
            zeroResolution: factors.zeroResolution.resolved ? {
                resolved: true,
                method: factors.zeroResolution.method,
                newScore: factors.zeroResolution.newScore,
                confidence: factors.zeroResolution.confidence
            } : null
        };
    }

    // Utility Methods

    /**
     * Create cache key for result caching
     */
    createCacheKey(factors, options) {
        const keyData = {
            factors: JSON.stringify(factors),
            weights: JSON.stringify(this.weights),
            options: JSON.stringify(options)
        };
        return btoa(JSON.stringify(keyData)).substring(0, 32);
    }

    /**
     * Cache aggregation result
     */
    cacheResult(key, result) {
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entries
            const oldestKeys = Array.from(this.cache.keys()).slice(0, 50);
            oldestKeys.forEach(k => this.cache.delete(k));
        }
        
        this.cache.set(key, result);
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats(processingTime) {
        const currentAvg = this.stats.averageProcessingTime;
        const count = this.stats.aggregations;
        this.stats.averageProcessingTime = 
            (currentAvg * (count - 1) + processingTime) / count;
            
        if (processingTime > this.performanceTarget) {
            this.stats.performanceBreaches++;
        }
    }

    /**
     * Validate component availability
     */
    validateComponents() {
        const components = {
            'QdrantScoreBridge': this.qdrantBridge,
            'BoostCalculator': this.boostCalculator,
            'PrefixEnhancer': this.prefixEnhancer,
            'ZeroRelevanceResolver': this.zeroResolver
        };
        
        const available = Object.entries(components)
            .filter(([name, component]) => component)
            .map(([name]) => name);
            
        const missing = Object.entries(components)
            .filter(([name, component]) => !component)
            .map(([name]) => name);
            
        this.logger.info(`ConfidenceAggregator: Available components: ${available.join(', ')}`);
        if (missing.length > 0) {
            this.logger.warn(`ConfidenceAggregator: Missing components: ${missing.join(', ')}`);
        }
    }

    /**
     * Setup dynamic weight adjustment
     */
    setupDynamicWeights() {
        // Future implementation for dynamic weight adjustment based on performance metrics
        this.dynamicWeightsEnabled = false;
    }

    /**
     * Set aggregation weights
     * @param {Object} newWeights - New weight configuration
     */
    setWeights(newWeights) {
        const validWeights = {};
        let totalWeight = 0;
        
        // Validate and normalized weights
        for (const [key, weight] of Object.entries(newWeights)) {
            if (typeof weight === 'number' && weight >= 0 && weight <= 1) {
                validWeights[key] = weight;
                totalWeight += weight;
            }
        }
        
        // Normalize to sum to 1.0
        if (totalWeight > 0) {
            for (const key of Object.keys(validWeights)) {
                validWeights[key] = validWeights[key] / totalWeight;
            }
            
            this.weights = { ...this.defaultWeights, ...validWeights };
            this.stats.weightAdjustments++;
            this.cache.clear(); // Clear cache when weights change
            
            this.logger.info('ConfidenceAggregator: Weights updated', this.weights);
            return true;
        }
        
        return false;
    }

    /**
     * Get aggregator statistics
     */
    getStats() {
        const performanceRatio = this.stats.aggregations > 0 ? 
            (this.stats.aggregations - this.stats.performanceBreaches) / this.stats.aggregations : 1;
            
        return {
            ...this.stats,
            performanceRatio: Math.round(performanceRatio * 100),
            averageProcessingTime: Math.round(this.stats.averageProcessingTime),
            cacheSize: this.cache.size,
            currentWeights: this.weights,
            enabled: this.isEnabled()
        };
    }

    /**
     * Get breakdown for a specific file ID
     */
    getBreakdown(fileId) {
        // Search cache for breakdown by fileId
        for (const [key, result] of this.cache.entries()) {
            if (result.fileId === fileId) {
                return result.breakdown;
            }
        }
        return null;
    }

    /**
     * Utility methods
     */
    isEnabled() {
        return this.featureFlags?.isEnabled('confidence_aggregation_enabled') !== false;
    }

    getDefaultAggregation() {
        return {
            finalScore: 0,
            confidence: 0,
            reason: 'ConfidenceAggregator disabled or not initialized'
        };
    }

    getErrorAggregation(error) {
        return {
            finalScore: 0,
            confidence: 0,
            error: error.message,
            reason: 'Aggregation calculation failed'
        };
    }

    /**
     * Console commands registration
     */
    registerConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.kcaggregate = {
                process: (factors) => this.aggregate(factors),
                processFile: (file, context) => this.processFile(file, context),
                setWeights: (weights) => this.setWeights(weights),
                getWeights: () => this.weights,
                stats: () => this.getStats(),
                breakdown: (fileId) => this.getBreakdown(fileId),
                clearCache: () => {
                    this.cache.clear();
                    return 'Cache cleared';
                },
                test: () => this.runTestAggregation()
            };
        }
    }

    /**
     * Run test aggregation for validation
     */
    async runTestAggregation() {
        const testFactors = {
            qdrantScore: { score: 75, confidence: 0.8, source: 'qdrant' },
            categoryBoost: { boost: 1.8, confidence: 0.9, strategy: 'linear' },
            prefixEnhancement: { enhancement: 0.15, confidence: 0.7, matches: 8 },
            zeroResolution: { resolved: false, newScore: 0, confidence: 0 },
            contextual: {
                recency: 0.8,
                sizeAppropriate: true,
                pathRelevance: 1.0,
                qualityIndicators: 4
            }
        };

        const result = await this.aggregate(testFactors);
        return {
            testFactors,
            result,
            expectedRange: [60, 90],
            passed: result.finalScore >= 60 && result.finalScore <= 90
        };
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.ConfidenceAggregator = ConfidenceAggregator;

// Auto-initialize if dependencies are available
if (window.KC?.FeatureFlagManagerInstance) {
    window.KC.ConfidenceAggregatorInstance = new ConfidenceAggregator();
    
    // Add feature flag for confidence aggregation
    window.KC.FeatureFlagManagerInstance.flags.set('confidence_aggregation_enabled', {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable confidence score aggregation from multiple components'
    });
}

export default ConfidenceAggregator;