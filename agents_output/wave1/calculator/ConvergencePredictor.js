/**
 * ConvergencePredictor - ML-based convergence prediction algorithms
 * 
 * Predicts whether confidence scores will converge to target levels
 * and estimates the number of iterations required.
 */

export default class ConvergencePredictor {
    constructor() {
        // Convergence strategies
        this.strategies = {
            linear: this.linearConvergence.bind(this),
            exponential: this.exponentialConvergence.bind(this),
            logarithmic: this.logarithmicConvergence.bind(this),
            adaptive: this.adaptiveConvergence.bind(this),
            ensemble: this.ensembleConvergence.bind(this)
        };
        
        // Default strategy
        this.defaultStrategy = 'adaptive';
        
        // Configuration
        this.config = {
            targetConfidence: 0.85,
            convergenceThreshold: 0.95, // 95% of target
            maxIterations: 10,
            minImprovement: 0.02, // 2% minimum improvement per iteration
            plateauDetection: 3, // iterations with no improvement
            confidenceInterval: 0.9 // 90% confidence interval for predictions
        };
        
        // Historical data for pattern learning
        this.historicalPatterns = new Map();
        this.patternWindow = 100; // Keep last 100 patterns per category
    }
    
    /**
     * Predict convergence for a file
     * @param {string} fileId - File identifier
     * @param {number} currentConfidence - Current confidence score
     * @param {object} dimensions - Current dimension scores
     * @param {array} iterationHistory - History of previous iterations
     * @returns {object} Convergence prediction
     */
    predict(fileId, currentConfidence, dimensions, iterationHistory = []) {
        // Handle case where we're predicting from history alone
        if (currentConfidence === null && iterationHistory.length > 0) {
            const lastIteration = iterationHistory[iterationHistory.length - 1];
            currentConfidence = lastIteration.overall || lastIteration.confidence || 0.5;
            dimensions = dimensions || lastIteration.dimensions || {};
        }
        
        // Extract features for prediction
        const features = this.extractConvergenceFeatures(
            currentConfidence,
            dimensions,
            iterationHistory
        );
        
        // Get pattern category for historical comparison
        const category = this.categorizePattern(features);
        
        // Apply selected strategy
        const strategy = this.selectStrategy(features, category);
        const basePrediction = this.strategies[strategy](features);
        
        // Enhance with historical pattern matching
        const enhancedPrediction = this.enhanceWithHistoricalPatterns(
            basePrediction,
            features,
            category
        );
        
        // Calculate confidence bounds
        const bounds = this.calculateConfidenceBounds(enhancedPrediction, features);
        
        // Store pattern for future learning
        if (fileId) {
            this.storePattern(fileId, features, category);
        }
        
        return {
            willConverge: enhancedPrediction.willConverge,
            estimatedIterations: Math.round(enhancedPrediction.estimatedIterations),
            confidence: enhancedPrediction.confidence,
            predictedFinalScore: enhancedPrediction.finalScore,
            strategy: strategy,
            bounds: bounds,
            plateauRisk: features.plateauRisk,
            improvementTrend: features.trend
        };
    }
    
    /**
     * Extract features for convergence prediction
     * @private
     */
    extractConvergenceFeatures(currentConfidence, dimensions, history) {
        const features = {
            currentConfidence,
            dimensions,
            iterationCount: history.length,
            history: history,
            
            // Improvement metrics
            improvements: this.calculateImprovements(history),
            avgImprovement: 0,
            trend: 'stable',
            acceleration: 0,
            
            // Plateau detection
            plateauCount: 0,
            plateauRisk: 0,
            
            // Dimension-specific features
            dimensionVariance: this.calculateDimensionVariance(dimensions),
            weakestDimension: this.findWeakestDimension(dimensions),
            strongestDimension: this.findStrongestDimension(dimensions),
            
            // Distance to target
            distanceToTarget: this.config.targetConfidence - currentConfidence,
            relativeDistance: (this.config.targetConfidence - currentConfidence) / this.config.targetConfidence
        };
        
        // Calculate improvement statistics
        if (features.improvements.length > 0) {
            features.avgImprovement = features.improvements.reduce((a, b) => a + b, 0) / features.improvements.length;
            features.trend = this.detectTrend(features.improvements);
            features.acceleration = this.calculateAcceleration(features.improvements);
            features.plateauCount = this.countPlateaus(features.improvements);
            features.plateauRisk = features.plateauCount / Math.max(1, features.improvements.length);
        }
        
        return features;
    }
    
    /**
     * Linear convergence prediction
     * Assumes constant improvement rate
     */
    linearConvergence(features) {
        const { currentConfidence, avgImprovement, distanceToTarget } = features;
        
        if (avgImprovement <= 0) {
            return {
                willConverge: false,
                estimatedIterations: Infinity,
                confidence: 0.3,
                finalScore: currentConfidence
            };
        }
        
        const iterationsNeeded = Math.ceil(distanceToTarget / avgImprovement);
        const willConverge = iterationsNeeded <= this.config.maxIterations;
        
        return {
            willConverge,
            estimatedIterations: Math.min(iterationsNeeded, this.config.maxIterations),
            confidence: this.calculatePredictionConfidence(features, 'linear'),
            finalScore: currentConfidence + (avgImprovement * Math.min(iterationsNeeded, this.config.maxIterations))
        };
    }
    
    /**
     * Exponential convergence prediction
     * Assumes decreasing improvement rate
     */
    exponentialConvergence(features) {
        const { currentConfidence, improvements, distanceToTarget, iterationCount } = features;
        
        if (improvements.length < 2) {
            return this.linearConvergence(features); // Fallback to linear
        }
        
        // Fit exponential decay model
        const decayRate = this.fitExponentialDecay(improvements);
        
        if (decayRate >= 0) {
            // No decay or increasing - use linear
            return this.linearConvergence(features);
        }
        
        // Project future improvements
        let projectedScore = currentConfidence;
        let iterations = 0;
        
        while (projectedScore < this.config.targetConfidence * this.config.convergenceThreshold && 
               iterations < this.config.maxIterations) {
            const improvement = features.avgImprovement * Math.exp(decayRate * (iterationCount + iterations));
            projectedScore += improvement;
            iterations++;
            
            if (improvement < this.config.minImprovement * 0.1) {
                break; // Improvement too small
            }
        }
        
        return {
            willConverge: projectedScore >= this.config.targetConfidence * this.config.convergenceThreshold,
            estimatedIterations: iterations,
            confidence: this.calculatePredictionConfidence(features, 'exponential'),
            finalScore: projectedScore
        };
    }
    
    /**
     * Logarithmic convergence prediction
     * Assumes rapid initial improvement then plateau
     */
    logarithmicConvergence(features) {
        const { currentConfidence, iterationCount, history } = features;
        
        if (iterationCount < 2) {
            return this.linearConvergence(features); // Need more data
        }
        
        // Fit logarithmic model: score = a * ln(iteration + 1) + b
        const { a, b } = this.fitLogarithmicModel(history);
        
        // Find iteration where target is reached
        const targetIteration = Math.exp((this.config.targetConfidence - b) / a) - 1;
        
        if (targetIteration < 0 || !isFinite(targetIteration)) {
            return {
                willConverge: false,
                estimatedIterations: this.config.maxIterations,
                confidence: 0.4,
                finalScore: a * Math.log(iterationCount + this.config.maxIterations + 1) + b
            };
        }
        
        const iterationsNeeded = Math.max(0, Math.ceil(targetIteration - iterationCount));
        
        return {
            willConverge: iterationsNeeded <= this.config.maxIterations,
            estimatedIterations: Math.min(iterationsNeeded, this.config.maxIterations),
            confidence: this.calculatePredictionConfidence(features, 'logarithmic'),
            finalScore: a * Math.log(iterationCount + iterationsNeeded + 1) + b
        };
    }
    
    /**
     * Adaptive convergence prediction
     * Selects best model based on historical pattern
     */
    adaptiveConvergence(features) {
        const { improvements, trend, plateauRisk } = features;
        
        // Select model based on detected patterns
        if (plateauRisk > 0.5) {
            // High plateau risk - use logarithmic
            return this.logarithmicConvergence(features);
        } else if (trend === 'accelerating') {
            // Accelerating improvement - use linear
            return this.linearConvergence(features);
        } else if (trend === 'decelerating') {
            // Decelerating improvement - use exponential
            return this.exponentialConvergence(features);
        } else {
            // Stable or unknown - use ensemble
            return this.ensembleConvergence(features);
        }
    }
    
    /**
     * Ensemble convergence prediction
     * Combines multiple models with weighted voting
     */
    ensembleConvergence(features) {
        const models = ['linear', 'exponential', 'logarithmic'];
        const predictions = [];
        const weights = [];
        
        // Get predictions from each model
        for (const model of models) {
            if (model !== 'adaptive' && model !== 'ensemble') {
                const prediction = this.strategies[model](features);
                predictions.push(prediction);
                weights.push(prediction.confidence);
            }
        }
        
        // Normalize weights
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);
        
        // Weighted average of predictions
        const ensemble = {
            willConverge: false,
            estimatedIterations: 0,
            confidence: 0,
            finalScore: 0
        };
        
        for (let i = 0; i < predictions.length; i++) {
            const pred = predictions[i];
            const weight = normalizedWeights[i];
            
            ensemble.estimatedIterations += pred.estimatedIterations * weight;
            ensemble.confidence += pred.confidence * weight;
            ensemble.finalScore += pred.finalScore * weight;
        }
        
        // Majority vote for convergence
        const convergeVotes = predictions.filter(p => p.willConverge).length;
        ensemble.willConverge = convergeVotes > predictions.length / 2;
        
        // Round iterations
        ensemble.estimatedIterations = Math.round(ensemble.estimatedIterations);
        
        return ensemble;
    }
    
    /**
     * Select optimal strategy based on features
     * @private
     */
    selectStrategy(features, category) {
        // Check if we have historical data for this category
        if (this.historicalPatterns.has(category)) {
            const patterns = this.historicalPatterns.get(category);
            const bestStrategy = this.findBestHistoricalStrategy(patterns);
            if (bestStrategy) return bestStrategy;
        }
        
        // Otherwise use adaptive strategy
        return this.defaultStrategy;
    }
    
    /**
     * Enhance prediction with historical pattern matching
     * @private
     */
    enhanceWithHistoricalPatterns(basePrediction, features, category) {
        if (!this.historicalPatterns.has(category)) {
            return basePrediction;
        }
        
        const patterns = this.historicalPatterns.get(category);
        const similarPatterns = this.findSimilarPatterns(patterns, features);
        
        if (similarPatterns.length === 0) {
            return basePrediction;
        }
        
        // Adjust prediction based on similar historical outcomes
        const historicalOutcomes = similarPatterns.map(p => ({
            actualIterations: p.actualIterations,
            actualConverged: p.actualConverged,
            finalScore: p.finalScore
        }));
        
        const avgActualIterations = historicalOutcomes.reduce((sum, o) => sum + o.actualIterations, 0) / historicalOutcomes.length;
        const convergenceRate = historicalOutcomes.filter(o => o.actualConverged).length / historicalOutcomes.length;
        
        // Blend historical and model predictions
        const blendWeight = Math.min(0.5, similarPatterns.length / 10); // More history = more weight
        
        return {
            willConverge: convergenceRate > 0.5,
            estimatedIterations: Math.round(
                basePrediction.estimatedIterations * (1 - blendWeight) + 
                avgActualIterations * blendWeight
            ),
            confidence: basePrediction.confidence * (1 - blendWeight) + convergenceRate * blendWeight,
            finalScore: basePrediction.finalScore
        };
    }
    
    /**
     * Calculate confidence bounds for prediction
     * @private
     */
    calculateConfidenceBounds(prediction, features) {
        const { confidence, estimatedIterations } = prediction;
        const uncertainty = 1 - confidence;
        
        // Calculate bounds based on uncertainty and historical variance
        const iterationBounds = {
            lower: Math.max(1, Math.round(estimatedIterations * (1 - uncertainty))),
            upper: Math.round(estimatedIterations * (1 + uncertainty))
        };
        
        const scoreBounds = {
            lower: Math.max(features.currentConfidence, prediction.finalScore * (1 - uncertainty * 0.2)),
            upper: Math.min(1, prediction.finalScore * (1 + uncertainty * 0.1))
        };
        
        return {
            iterations: iterationBounds,
            finalScore: scoreBounds,
            confidenceLevel: this.config.confidenceInterval
        };
    }
    
    // Helper methods
    
    calculateImprovements(history) {
        const improvements = [];
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1].overall || history[i - 1].confidence || 0;
            const curr = history[i].overall || history[i].confidence || 0;
            improvements.push(curr - prev);
        }
        return improvements;
    }
    
    detectTrend(improvements) {
        if (improvements.length < 2) return 'stable';
        
        let increasing = 0;
        let decreasing = 0;
        
        for (let i = 1; i < improvements.length; i++) {
            if (improvements[i] > improvements[i - 1]) increasing++;
            else if (improvements[i] < improvements[i - 1]) decreasing++;
        }
        
        const total = improvements.length - 1;
        if (increasing / total > 0.6) return 'accelerating';
        if (decreasing / total > 0.6) return 'decelerating';
        return 'stable';
    }
    
    calculateAcceleration(improvements) {
        if (improvements.length < 3) return 0;
        
        const accelerations = [];
        for (let i = 2; i < improvements.length; i++) {
            const accel = improvements[i] - 2 * improvements[i - 1] + improvements[i - 2];
            accelerations.push(accel);
        }
        
        return accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    }
    
    countPlateaus(improvements) {
        let plateauCount = 0;
        for (const improvement of improvements) {
            if (Math.abs(improvement) < this.config.minImprovement) {
                plateauCount++;
            }
        }
        return plateauCount;
    }
    
    calculateDimensionVariance(dimensions) {
        const values = Object.values(dimensions);
        if (values.length === 0) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    }
    
    findWeakestDimension(dimensions) {
        let weakest = null;
        let minScore = Infinity;
        
        for (const [dim, score] of Object.entries(dimensions)) {
            if (score < minScore) {
                minScore = score;
                weakest = dim;
            }
        }
        
        return { dimension: weakest, score: minScore };
    }
    
    findStrongestDimension(dimensions) {
        let strongest = null;
        let maxScore = -Infinity;
        
        for (const [dim, score] of Object.entries(dimensions)) {
            if (score > maxScore) {
                maxScore = score;
                strongest = dim;
            }
        }
        
        return { dimension: strongest, score: maxScore };
    }
    
    fitExponentialDecay(improvements) {
        if (improvements.length < 2) return 0;
        
        // Simplified exponential fitting
        const firstImprovement = improvements[0] || 0.01;
        const lastImprovement = improvements[improvements.length - 1] || 0.01;
        const ratio = lastImprovement / firstImprovement;
        
        if (ratio <= 0) return -1; // Invalid
        
        return Math.log(ratio) / (improvements.length - 1);
    }
    
    fitLogarithmicModel(history) {
        // Simplified logarithmic fitting
        // In real implementation, would use least squares or similar
        const n = history.length;
        if (n < 2) return { a: 0.1, b: 0.5 };
        
        const firstScore = history[0].overall || history[0].confidence || 0.5;
        const lastScore = history[n - 1].overall || history[n - 1].confidence || 0.5;
        
        const a = (lastScore - firstScore) / Math.log(n);
        const b = firstScore;
        
        return { a, b };
    }
    
    calculatePredictionConfidence(features, model) {
        let confidence = 0.5; // Base confidence
        
        // More history = higher confidence
        confidence += Math.min(0.2, features.iterationCount * 0.02);
        
        // Lower variance = higher confidence
        confidence += Math.max(0, 0.2 - features.dimensionVariance);
        
        // Model-specific adjustments
        if (model === 'linear' && features.trend === 'stable') confidence += 0.1;
        if (model === 'exponential' && features.trend === 'decelerating') confidence += 0.1;
        if (model === 'logarithmic' && features.plateauRisk > 0.3) confidence += 0.1;
        
        return Math.max(0.2, Math.min(0.95, confidence));
    }
    
    categorizePattern(features) {
        // Create category based on key features
        const confidence = Math.floor(features.currentConfidence * 10) / 10;
        const variance = Math.floor(features.dimensionVariance * 10) / 10;
        const trend = features.trend;
        
        return `conf:${confidence}_var:${variance}_trend:${trend}`;
    }
    
    storePattern(fileId, features, category) {
        if (!this.historicalPatterns.has(category)) {
            this.historicalPatterns.set(category, []);
        }
        
        const patterns = this.historicalPatterns.get(category);
        patterns.push({
            fileId,
            timestamp: new Date(),
            features: { ...features },
            category
        });
        
        // Maintain window size
        if (patterns.length > this.patternWindow) {
            patterns.shift();
        }
    }
    
    findSimilarPatterns(patterns, features) {
        // Find patterns with similar starting conditions
        return patterns.filter(p => {
            const similarity = this.calculatePatternSimilarity(p.features, features);
            return similarity > 0.8; // 80% similarity threshold
        });
    }
    
    calculatePatternSimilarity(pattern1, pattern2) {
        // Simple similarity based on key metrics
        const confDiff = Math.abs(pattern1.currentConfidence - pattern2.currentConfidence);
        const varDiff = Math.abs(pattern1.dimensionVariance - pattern2.dimensionVariance);
        const iterDiff = Math.abs(pattern1.iterationCount - pattern2.iterationCount);
        
        const confSim = 1 - confDiff;
        const varSim = 1 - varDiff;
        const iterSim = 1 - (iterDiff / 10); // Normalize by max expected iterations
        
        return (confSim + varSim + iterSim) / 3;
    }
    
    findBestHistoricalStrategy(patterns) {
        // Analyze which strategy worked best for similar patterns
        const strategySuccess = {};
        
        for (const pattern of patterns) {
            if (pattern.strategy && pattern.actualConverged !== undefined) {
                if (!strategySuccess[pattern.strategy]) {
                    strategySuccess[pattern.strategy] = { success: 0, total: 0 };
                }
                strategySuccess[pattern.strategy].total++;
                if (pattern.actualConverged) {
                    strategySuccess[pattern.strategy].success++;
                }
            }
        }
        
        // Find strategy with best success rate
        let bestStrategy = null;
        let bestRate = 0;
        
        for (const [strategy, stats] of Object.entries(strategySuccess)) {
            if (stats.total >= 5) { // Minimum sample size
                const rate = stats.success / stats.total;
                if (rate > bestRate) {
                    bestRate = rate;
                    bestStrategy = strategy;
                }
            }
        }
        
        return bestStrategy;
    }
}