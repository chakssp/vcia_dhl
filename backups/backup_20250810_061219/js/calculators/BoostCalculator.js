/**
 * BoostCalculator - Apply category, temporal, and semantic boosts to confidence scores
 * Implements UnifiedConfidenceSystem boost calculation specification
 * 
 * Strategic Context: 4 boost strategies for different optimization scenarios
 * Integrates with QdrantScoreBridge and uses FeatureFlagManager control
 */

class BoostCalculator {
    constructor() {
        this.logger = window.KC?.Logger || console;
        this.featureFlags = window.KC?.FeatureFlagManagerInstance;
        this.strategies = new Map();
        this.currentStrategy = 'linear';
        this.cache = new Map();
        this.stats = {
            calculations: 0,
            cacheHits: 0,
            strategyUsage: {}
        };
        
        this.initializeStrategies();
        this.registerConsoleCommands();
    }

    /**
     * Initialize boost calculation strategies
     */
    initializeStrategies() {
        // Linear Strategy - Current CategoryManager formula
        this.strategies.set('linear', {
            name: 'Linear Strategy',
            description: 'Linear boost based on category count',
            calculate: (factors) => this.calculateLinearBoost(factors)
        });

        // Logarithmic Strategy - Diminishing returns
        this.strategies.set('logarithmic', {
            name: 'Logarithmic Strategy', 
            description: 'Logarithmic boost with diminishing returns',
            calculate: (factors) => this.calculateLogarithmicBoost(factors)
        });

        // Hybrid Strategy - Combines linear and logarithmic
        this.strategies.set('hybrid', {
            name: 'Hybrid Strategy',
            description: 'Adaptive combination of linear and logarithmic',
            calculate: (factors) => this.calculateHybridBoost(factors)
        });

        // Adaptive Strategy - Dynamic adjustment based on metrics
        this.strategies.set('adaptive', {
            name: 'Adaptive Strategy',
            description: 'Dynamically adjusts based on system metrics',
            calculate: (factors) => this.calculateAdaptiveBoost(factors)
        });

        this.logger.info('BoostCalculator: Initialized with 4 strategies');
    }

    /**
     * Calculate boost for a file with given context
     * @param {Object} file - File object from AppState
     * @param {Object} context - Additional context for calculation
     * @returns {Object} Boost calculation result
     */
    async calculate(file, context = {}) {
        if (!this.isEnabled()) {
            return this.getDefaultBoost();
        }

        const startTime = performance.now();
        
        try {
            // Create cache key
            const cacheKey = this.createCacheKey(file, context);
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                this.stats.cacheHits++;
                return this.cache.get(cacheKey);
            }

            // Extract boost factors
            const factors = this.extractBoostFactors(file, context);
            
            // Get current strategy
            const strategy = this.strategies.get(this.currentStrategy);
            if (!strategy) {
                throw new Error(`Unknown strategy: ${this.currentStrategy}`);
            }

            // Calculate boost using selected strategy
            const boostResult = await strategy.calculate(factors);
            
            // Add metadata
            const result = {
                ...boostResult,
                fileId: file.id,
                strategy: this.currentStrategy,
                factors: factors,
                calculationTime: performance.now() - startTime,
                timestamp: new Date().toISOString()
            };

            // Cache result
            this.cache.set(cacheKey, result);
            
            // Update stats
            this.stats.calculations++;
            this.stats.strategyUsage[this.currentStrategy] = 
                (this.stats.strategyUsage[this.currentStrategy] || 0) + 1;

            return result;

        } catch (error) {
            this.logger.error('BoostCalculator: Calculation failed', error);
            return this.getErrorBoost(error);
        }
    }

    /**
     * Set active boost strategy
     * @param {string} strategyName - Name of the strategy to use
     */
    setStrategy(strategyName) {
        if (!this.strategies.has(strategyName)) {
            this.logger.error(`BoostCalculator: Unknown strategy '${strategyName}'`);
            return false;
        }

        this.currentStrategy = strategyName;
        this.cache.clear(); // Clear cache when strategy changes
        
        this.logger.info(`BoostCalculator: Strategy changed to '${strategyName}'`);
        return true;
    }

    /**
     * Get available strategies
     */
    getStrategies() {
        const result = {};
        for (const [name, strategy] of this.strategies.entries()) {
            result[name] = {
                name: strategy.name,
                description: strategy.description,
                active: name === this.currentStrategy
            };
        }
        return result;
    }

    /**
     * Get calculator statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentStrategy: this.currentStrategy,
            cacheSize: this.cache.size,
            strategies: this.getStrategies(),
            enabled: this.isEnabled()
        };
    }

    // Strategy Implementations

    /**
     * Linear boost strategy - Uses RelevanceUtils logarithmic formula
     */
    calculateLinearBoost(factors) {
        const { categoryCount, temporalWeight, semanticDensity } = factors;
        
        // Base category boost (using RelevanceUtils for consistency)
        const categoryBoost = categoryCount > 0 ? 1 + (Math.log(categoryCount + 1) * 0.05) : 1.0;
        
        // Temporal boost (recency factor)
        const temporalBoost = 1.0 + (temporalWeight * 0.15);
        
        // Semantic boost (content density)
        const semanticBoost = 1.0 + (semanticDensity * 0.2);
        
        // Combined linear boost
        const totalBoost = categoryBoost * temporalBoost * semanticBoost;
        
        return {
            totalBoost: Math.min(totalBoost, 3.0), // Cap at 3x
            breakdown: {
                category: categoryBoost,
                temporal: temporalBoost,
                semantic: semanticBoost
            },
            strategy: 'linear'
        };
    }

    /**
     * Logarithmic boost strategy - Diminishing returns for high category counts
     */
    calculateLogarithmicBoost(factors) {
        const { categoryCount, temporalWeight, semanticDensity } = factors;
        
        // Logarithmic category boost with diminishing returns
        const categoryBoost = categoryCount > 0 ? 
            1 + Math.log(categoryCount + 1) * 0.05 : 1.0;
        
        // Logarithmic temporal boost
        const temporalBoost = 1.0 + Math.log(temporalWeight + 1) * 0.1;
        
        // Semantic boost remains linear for content quality
        const semanticBoost = 1.0 + (semanticDensity * 0.15);
        
        const totalBoost = categoryBoost * temporalBoost * semanticBoost;
        
        return {
            totalBoost: Math.min(totalBoost, 2.5), // Lower cap for logarithmic
            breakdown: {
                category: categoryBoost,
                temporal: temporalBoost,
                semantic: semanticBoost
            },
            strategy: 'logarithmic'
        };
    }

    /**
     * Hybrid strategy - Combines linear and logarithmic based on context
     */
    calculateHybridBoost(factors) {
        const { categoryCount, fileSize, contentComplexity } = factors;
        
        // Use linear for low category counts, logarithmic for high counts
        const useLinear = categoryCount <= 3;
        
        if (useLinear) {
            const linearResult = this.calculateLinearBoost(factors);
            return {
                ...linearResult,
                strategy: 'hybrid-linear',
                reason: 'Low category count, using linear boost'
            };
        } else {
            const logResult = this.calculateLogarithmicBoost(factors);
            return {
                ...logResult,
                strategy: 'hybrid-logarithmic',
                reason: 'High category count, using logarithmic boost'
            };
        }
    }

    /**
     * Adaptive strategy - Dynamically adjusts based on system metrics
     */
    calculateAdaptiveBoost(factors) {
        const { categoryCount, temporalWeight, semanticDensity, fileSize } = factors;
        
        // Get system metrics for adaptation
        const systemMetrics = this.getSystemMetrics();
        
        // Adapt category boost based on overall system distribution
        const avgCategoriesPerFile = systemMetrics.avgCategoriesPerFile || 2;
        const categoryMultiplier = categoryCount > avgCategoriesPerFile ? 0.08 : 0.12;
        
        const categoryBoost = categoryCount > 0 ? 
            1.3 + (categoryCount * categoryMultiplier) : 1.0;
        
        // Adapt temporal boost based on file age distribution
        const temporalMultiplier = systemMetrics.recentFilesRatio > 0.5 ? 0.1 : 0.2;
        const temporalBoost = 1.0 + (temporalWeight * temporalMultiplier);
        
        // Adapt semantic boost based on content quality distribution
        const semanticMultiplier = systemMetrics.highQualityRatio > 0.3 ? 0.15 : 0.25;
        const semanticBoost = 1.0 + (semanticDensity * semanticMultiplier);
        
        const totalBoost = categoryBoost * temporalBoost * semanticBoost;
        
        return {
            totalBoost: Math.min(totalBoost, 2.8),
            breakdown: {
                category: categoryBoost,
                temporal: temporalBoost,
                semantic: semanticBoost
            },
            strategy: 'adaptive',
            adaptation: {
                categoryMultiplier,
                temporalMultiplier,
                semanticMultiplier,
                systemMetrics
            }
        };
    }

    // Helper Methods

    /**
     * Extract boost factors from file and context
     */
    extractBoostFactors(file, context) {
        const now = new Date();
        const fileDate = new Date(file.lastModified || file.dateCreated || now);
        const daysSinceModified = (now - fileDate) / (1000 * 60 * 60 * 24);
        
        return {
            categoryCount: file.categories?.length || 0,
            temporalWeight: Math.max(0, 1 - (daysSinceModified / 365)), // 0-1 based on recency
            semanticDensity: file.semanticDensity || context.semanticDensity || 0.1,
            fileSize: file.size || 0,
            contentComplexity: context.contentComplexity || 0.5,
            hasAnalysis: Boolean(file.analyzed),
            relevanceScore: file.relevanceScore || 0
        };
    }

    /**
     * Get system metrics for adaptive strategy
     */
    getSystemMetrics() {
        try {
            const files = window.KC?.AppState?.get('files') || [];
            if (files.length === 0) return this.getDefaultSystemMetrics();
            
            const totalCategories = files.reduce((sum, file) => 
                sum + (file.categories?.length || 0), 0);
            const avgCategoriesPerFile = totalCategories / files.length;
            
            const recentFiles = files.filter(file => {
                const fileDate = new Date(file.lastModified || file.dateCreated);
                const daysSince = (new Date() - fileDate) / (1000 * 60 * 60 * 24);
                return daysSince <= 90; // Files from last 90 days
            });
            const recentFilesRatio = recentFiles.length / files.length;
            
            const highQualityFiles = files.filter(file => 
                (file.relevanceScore || 0) > 50 || 
                (file.categories?.length || 0) > 2
            );
            const highQualityRatio = highQualityFiles.length / files.length;
            
            return {
                avgCategoriesPerFile,
                recentFilesRatio,
                highQualityRatio,
                totalFiles: files.length
            };
            
        } catch (error) {
            this.logger.error('BoostCalculator: Error getting system metrics', error);
            return this.getDefaultSystemMetrics();
        }
    }

    getDefaultSystemMetrics() {
        return {
            avgCategoriesPerFile: 2.0,
            recentFilesRatio: 0.3,
            highQualityRatio: 0.4,
            totalFiles: 0
        };
    }

    /**
     * Create cache key for result caching
     */
    createCacheKey(file, context) {
        const factors = this.extractBoostFactors(file, context);
        return `${file.id}_${this.currentStrategy}_${JSON.stringify(factors)}`;
    }

    /**
     * Check if boost calculator is enabled via feature flags
     */
    isEnabled() {
        return this.featureFlags?.isEnabled('confidence_boost_calculator') !== false;
    }

    /**
     * Get default boost for disabled state
     */
    getDefaultBoost() {
        return {
            totalBoost: 1.0,
            breakdown: { category: 1.0, temporal: 1.0, semantic: 1.0 },
            strategy: 'disabled',
            reason: 'BoostCalculator disabled via feature flag'
        };
    }

    /**
     * Get error boost for calculation failures
     */
    getErrorBoost(error) {
        return {
            totalBoost: 1.0,
            breakdown: { category: 1.0, temporal: 1.0, semantic: 1.0 },
            strategy: 'error',
            error: error.message,
            reason: 'Calculation failed, using default boost'
        };
    }

    /**
     * Register console commands for debugging
     */
    registerConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.kcboost = {
                calculate: (file, strategy = null) => {
                    if (strategy) this.setStrategy(strategy);
                    return this.calculate(file);
                },
                setStrategy: (strategy) => this.setStrategy(strategy),
                getStrategies: () => this.getStrategies(),
                stats: () => this.getStats(),
                clearCache: () => {
                    this.cache.clear();
                    return 'Cache cleared';
                },
                test: () => this.runTestCalculations()
            };
        }
    }

    /**
     * Run test calculations for validation
     */
    async runTestCalculations() {
        const testFile = {
            id: 'test_file_boost',
            categories: ['Técnico', 'Estratégico'],
            lastModified: new Date().toISOString(),
            relevanceScore: 75,
            size: 5000
        };

        const results = {};
        
        for (const strategyName of this.strategies.keys()) {
            this.setStrategy(strategyName);
            results[strategyName] = await this.calculate(testFile, {
                semanticDensity: 0.3,
                contentComplexity: 0.7
            });
        }

        return results;
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.BoostCalculator = BoostCalculator;

// Auto-initialize if feature flags are available
if (window.KC?.FeatureFlagManagerInstance) {
    window.KC.BoostCalculatorInstance = new BoostCalculator();
    
    // Add feature flag for boost calculator
    window.KC.FeatureFlagManagerInstance.flags.set('confidence_boost_calculator', {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable boost calculation for confidence scores'
    });
}

export default BoostCalculator;