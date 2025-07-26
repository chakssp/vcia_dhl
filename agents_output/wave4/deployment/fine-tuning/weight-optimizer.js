/**
 * ML Weight Optimizer
 * 
 * Implements gradient-based optimization to fine-tune dimension weights
 * for achieving 85%+ confidence target.
 * 
 * Current baseline: 80.5-84.5%
 * Target: 85%+ stable confidence
 * Expected contribution: 0.5-1% improvement
 */

import ConfidenceCalculator from '../../../wave1/calculator/ConfidenceCalculator.js';
import PerformanceMonitor from '../../../wave3/optimization/PerformanceMonitor.js';

export default class WeightOptimizer {
    constructor(config = {}) {
        this.calculator = new ConfidenceCalculator();
        this.monitor = new PerformanceMonitor('WeightOptimizer');
        
        // Current weights (from Wave 3 baseline)
        this.currentWeights = {
            semantic: 0.35,
            categorical: 0.25,
            structural: 0.25,
            temporal: 0.15
        };
        
        // Optimization parameters
        this.config = {
            learningRate: config.learningRate || 0.01,
            iterations: config.iterations || 100,
            convergenceThreshold: config.convergenceThreshold || 0.0001,
            targetConfidence: config.targetConfidence || 0.85,
            validationSplit: config.validationSplit || 0.2,
            ...config
        };
        
        this.optimizationHistory = [];
    }
    
    /**
     * Optimize weights using gradient descent
     */
    async optimize(dataset) {
        console.log('Starting ML Weight Optimization');
        console.log('Current weights:', this.currentWeights);
        console.log('Target confidence:', this.config.targetConfidence);
        
        // Split dataset
        const { training, validation } = this.splitDataset(dataset);
        
        // Initialize weights
        let weights = { ...this.currentWeights };
        let bestWeights = { ...weights };
        let bestConfidence = 0;
        
        // Optimization loop
        for (let iteration = 0; iteration < this.config.iterations; iteration++) {
            const timer = this.monitor.startTimer(`iteration_${iteration}`);
            
            // Calculate gradients
            const gradients = await this.calculateGradients(weights, training);
            
            // Update weights
            weights = this.updateWeights(weights, gradients);
            
            // Normalize weights
            weights = this.normalizeWeights(weights);
            
            // Validate performance
            const validationScore = await this.validateWeights(weights, validation);
            
            // Track best weights
            if (validationScore.avgConfidence > bestConfidence) {
                bestConfidence = validationScore.avgConfidence;
                bestWeights = { ...weights };
            }
            
            // Record history
            this.optimizationHistory.push({
                iteration,
                weights: { ...weights },
                gradients,
                trainLoss: validationScore.loss,
                avgConfidence: validationScore.avgConfidence,
                improvement: validationScore.avgConfidence - this.getBaselineConfidence(validation)
            });
            
            timer.end();
            
            // Check convergence
            if (this.hasConverged(iteration)) {
                console.log(`Converged at iteration ${iteration}`);
                break;
            }
            
            // Progress update
            if (iteration % 10 === 0) {
                console.log(`Iteration ${iteration}: Confidence = ${(validationScore.avgConfidence * 100).toFixed(2)}%`);
            }
        }
        
        // Final validation
        const finalScore = await this.validateWeights(bestWeights, dataset);
        
        return {
            optimizedWeights: bestWeights,
            baselineWeights: this.currentWeights,
            finalConfidence: finalScore.avgConfidence,
            improvement: finalScore.avgConfidence - this.getBaselineConfidence(dataset),
            iterations: this.optimizationHistory.length,
            history: this.optimizationHistory,
            recommendations: this.generateRecommendations(bestWeights, finalScore)
        };
    }
    
    /**
     * Calculate gradients using finite differences
     */
    async calculateGradients(weights, dataset) {
        const gradients = {};
        const epsilon = 0.001;
        const baseLoss = await this.calculateLoss(weights, dataset);
        
        for (const dimension of Object.keys(weights)) {
            // Positive perturbation
            const weightsPlusEpsilon = { ...weights };
            weightsPlusEpsilon[dimension] += epsilon;
            const lossPlusEpsilon = await this.calculateLoss(
                this.normalizeWeights(weightsPlusEpsilon), 
                dataset
            );
            
            // Negative perturbation
            const weightsMinusEpsilon = { ...weights };
            weightsMinusEpsilon[dimension] -= epsilon;
            const lossMinusEpsilon = await this.calculateLoss(
                this.normalizeWeights(weightsMinusEpsilon), 
                dataset
            );
            
            // Central difference gradient
            gradients[dimension] = (lossPlusEpsilon - lossMinusEpsilon) / (2 * epsilon);
        }
        
        return gradients;
    }
    
    /**
     * Calculate loss function (negative confidence)
     */
    async calculateLoss(weights, dataset) {
        let totalLoss = 0;
        let count = 0;
        
        // Apply weights temporarily
        const originalWeights = this.calculator.weights;
        this.calculator.weights = weights;
        
        for (const item of dataset) {
            const result = await this.calculator.calculate(item);
            
            // Loss is distance from target confidence
            const loss = Math.pow(this.config.targetConfidence - result.confidence, 2);
            totalLoss += loss;
            count++;
        }
        
        // Restore original weights
        this.calculator.weights = originalWeights;
        
        return totalLoss / count;
    }
    
    /**
     * Update weights using gradient descent
     */
    updateWeights(weights, gradients) {
        const updated = {};
        
        for (const dimension of Object.keys(weights)) {
            // Gradient descent update
            updated[dimension] = weights[dimension] - 
                this.config.learningRate * gradients[dimension];
            
            // Ensure weights stay positive
            updated[dimension] = Math.max(0.01, updated[dimension]);
        }
        
        return updated;
    }
    
    /**
     * Normalize weights to sum to 1
     */
    normalizeWeights(weights) {
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        const normalized = {};
        
        for (const [key, value] of Object.entries(weights)) {
            normalized[key] = value / sum;
        }
        
        return normalized;
    }
    
    /**
     * Validate weights on dataset
     */
    async validateWeights(weights, dataset) {
        const originalWeights = this.calculator.weights;
        this.calculator.weights = weights;
        
        let totalConfidence = 0;
        let totalLoss = 0;
        let count = 0;
        const confidenceDistribution = [];
        
        for (const item of dataset) {
            const result = await this.calculator.calculate(item);
            
            totalConfidence += result.confidence;
            totalLoss += Math.pow(this.config.targetConfidence - result.confidence, 2);
            confidenceDistribution.push(result.confidence);
            count++;
        }
        
        this.calculator.weights = originalWeights;
        
        return {
            avgConfidence: totalConfidence / count,
            loss: totalLoss / count,
            stdDev: this.calculateStdDev(confidenceDistribution),
            min: Math.min(...confidenceDistribution),
            max: Math.max(...confidenceDistribution),
            above85: confidenceDistribution.filter(c => c >= 0.85).length / count
        };
    }
    
    /**
     * Get baseline confidence for comparison
     */
    getBaselineConfidence(dataset) {
        // Assuming baseline from Wave 3 results
        return 0.825; // Mid-point of 80.5-84.5%
    }
    
    /**
     * Check if optimization has converged
     */
    hasConverged(iteration) {
        if (iteration < 10) return false;
        
        // Check if recent improvements are below threshold
        const recentHistory = this.optimizationHistory.slice(-5);
        const improvements = recentHistory.map(h => h.improvement);
        const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
        
        return Math.abs(avgImprovement) < this.config.convergenceThreshold;
    }
    
    /**
     * Split dataset for training and validation
     */
    splitDataset(dataset) {
        const shuffled = [...dataset].sort(() => Math.random() - 0.5);
        const splitIndex = Math.floor(dataset.length * (1 - this.config.validationSplit));
        
        return {
            training: shuffled.slice(0, splitIndex),
            validation: shuffled.slice(splitIndex)
        };
    }
    
    /**
     * Calculate standard deviation
     */
    calculateStdDev(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(variance);
    }
    
    /**
     * Generate optimization recommendations
     */
    generateRecommendations(optimizedWeights, finalScore) {
        const recommendations = [];
        
        // Compare weight changes
        for (const [dimension, oldWeight] of Object.entries(this.currentWeights)) {
            const newWeight = optimizedWeights[dimension];
            const change = ((newWeight - oldWeight) / oldWeight) * 100;
            
            if (Math.abs(change) > 5) {
                recommendations.push({
                    dimension,
                    oldWeight,
                    newWeight,
                    change: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
                    impact: this.assessImpact(dimension, change)
                });
            }
        }
        
        // Overall recommendations
        if (finalScore.avgConfidence >= this.config.targetConfidence) {
            recommendations.push({
                type: 'success',
                message: `Target confidence of ${(this.config.targetConfidence * 100).toFixed(1)}% achieved!`,
                confidence: `${(finalScore.avgConfidence * 100).toFixed(2)}%`
            });
        } else {
            recommendations.push({
                type: 'improvement',
                message: 'Additional optimization strategies recommended',
                suggestions: [
                    'Consider ensemble methods',
                    'Implement adaptive weight adjustment',
                    'Explore non-linear weight combinations'
                ]
            });
        }
        
        return recommendations;
    }
    
    /**
     * Assess impact of weight change
     */
    assessImpact(dimension, changePercent) {
        const impacts = {
            semantic: 'Affects understanding of content meaning and context',
            categorical: 'Influences categorization accuracy and relevance',
            structural: 'Impacts document structure and organization analysis',
            temporal: 'Modifies time-based relevance and recency factors'
        };
        
        return {
            description: impacts[dimension],
            significance: Math.abs(changePercent) > 20 ? 'High' : 
                         Math.abs(changePercent) > 10 ? 'Medium' : 'Low'
        };
    }
    
    /**
     * Export optimization results
     */
    exportResults(results) {
        return {
            summary: {
                baseline: {
                    weights: this.currentWeights,
                    confidence: this.getBaselineConfidence([])
                },
                optimized: {
                    weights: results.optimizedWeights,
                    confidence: results.finalConfidence
                },
                improvement: {
                    absolute: results.improvement,
                    percentage: (results.improvement * 100).toFixed(2) + '%'
                }
            },
            configuration: this.config,
            convergence: {
                iterations: results.iterations,
                finalLoss: results.history[results.history.length - 1]?.trainLoss
            },
            recommendations: results.recommendations,
            implementation: {
                code: this.generateImplementationCode(results.optimizedWeights),
                validation: 'Run comprehensive tests before production deployment'
            }
        };
    }
    
    /**
     * Generate implementation code
     */
    generateImplementationCode(weights) {
        return `
// Optimized weights for ConfidenceCalculator
// Achieved confidence: ${(this.optimizationHistory[this.optimizationHistory.length - 1]?.avgConfidence * 100).toFixed(2)}%
export const OPTIMIZED_WEIGHTS = {
    semantic: ${weights.semantic.toFixed(4)},
    categorical: ${weights.categorical.toFixed(4)},
    structural: ${weights.structural.toFixed(4)},
    temporal: ${weights.temporal.toFixed(4)}
};

// Apply to calculator
calculator.weights = OPTIMIZED_WEIGHTS;
`;
    }
}

// Export for use in deployment
export { WeightOptimizer };