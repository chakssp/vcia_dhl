/**
 * ConvergenceAnalyzer - Statistical Convergence Detection
 * 
 * Implements sophisticated statistical algorithms to detect convergence
 * in confidence metrics over time. Uses multiple convergence criteria
 * including variance, trend analysis, and plateau detection.
 */

export default class ConvergenceAnalyzer {
    constructor() {
        // Convergence detection thresholds
        this.thresholds = {
            variance: 0.01,          // Maximum variance for convergence
            trend: 0.005,            // Maximum trend slope for convergence
            plateau: 0.95,           // Minimum similarity for plateau detection
            minIterations: 5,        // Minimum iterations before checking convergence
            confidenceTarget: 0.85,  // Target confidence level
            windowSize: 10           // Window size for rolling calculations
        };
        
        // Statistical methods configuration
        this.methods = {
            useVarianceCheck: true,
            useTrendAnalysis: true,
            usePlateauDetection: true,
            useMovingAverage: true,
            useExponentialSmoothing: true
        };
        
        // Smoothing parameters
        this.smoothing = {
            alpha: 0.3,  // Exponential smoothing factor
            maWindow: 5  // Moving average window
        };
    }
    
    /**
     * Analyze metrics history for convergence
     * @param {array} history - Array of metric history entries
     * @returns {object} Convergence analysis results
     */
    analyzeHistory(history) {
        if (!history || history.length < this.thresholds.minIterations) {
            return {
                isConverged: false,
                confidence: 0,
                metrics: {
                    variance: null,
                    trend: null,
                    plateau: null,
                    rate: 0
                },
                reason: 'Insufficient data'
            };
        }
        
        // Extract overall confidence values
        const values = history.map(h => h.metrics.overall);
        
        // Calculate various convergence metrics
        const variance = this.calculateVariance(values);
        const trend = this.calculateTrend(values);
        const plateau = this.detectPlateau(values);
        const smoothed = this.exponentialSmoothing(values);
        const convergenceRate = this.calculateConvergenceRate(values);
        
        // Check convergence criteria
        const varianceConverged = this.methods.useVarianceCheck && 
            variance < this.thresholds.variance;
        
        const trendConverged = this.methods.useTrendAnalysis && 
            Math.abs(trend.slope) < this.thresholds.trend;
        
        const plateauConverged = this.methods.usePlateauDetection && 
            plateau.similarity > this.thresholds.plateau;
        
        const targetReached = values[values.length - 1] >= this.thresholds.confidenceTarget;
        
        // Determine overall convergence
        const convergedCount = [
            varianceConverged,
            trendConverged,
            plateauConverged,
            targetReached
        ].filter(Boolean).length;
        
        const isConverged = convergedCount >= 3;
        const convergenceConfidence = convergedCount / 4;
        
        // Prepare detailed metrics
        const metrics = {
            variance,
            trend: trend.slope,
            plateau: plateau.similarity,
            rate: convergenceRate,
            smoothedValue: smoothed[smoothed.length - 1],
            movingAverage: this.calculateMovingAverage(values, this.smoothing.maWindow),
            stability: this.calculateStability(values)
        };
        
        // Determine convergence reason
        let reason = 'Not converged';
        if (isConverged) {
            const reasons = [];
            if (varianceConverged) reasons.push('Low variance');
            if (trendConverged) reasons.push('Stable trend');
            if (plateauConverged) reasons.push('Plateau reached');
            if (targetReached) reasons.push('Target confidence achieved');
            reason = reasons.join(', ');
        }
        
        return {
            isConverged,
            confidence: convergenceConfidence,
            metrics,
            reason,
            details: {
                varianceConverged,
                trendConverged,
                plateauConverged,
                targetReached,
                iterations: history.length,
                currentValue: values[values.length - 1],
                improvement: this.calculateImprovement(values)
            }
        };
    }
    
    /**
     * Calculate variance of values
     * @param {array} values - Array of confidence values
     * @returns {number} Variance
     */
    calculateVariance(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    }
    
    /**
     * Calculate trend using linear regression
     * @param {array} values - Array of confidence values
     * @returns {object} Trend analysis with slope and R-squared
     */
    calculateTrend(values) {
        const n = values.length;
        if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
        
        // Create x values (iterations)
        const x = Array.from({ length: n }, (_, i) => i);
        
        // Calculate sums
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        // Calculate slope and intercept
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculate R-squared
        const meanY = sumY / n;
        const totalSS = values.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
        const residualSS = values.reduce((sum, yi, i) => 
            sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
        const rSquared = 1 - (residualSS / totalSS);
        
        return { slope, intercept, rSquared };
    }
    
    /**
     * Detect plateau in values
     * @param {array} values - Array of confidence values
     * @returns {object} Plateau detection results
     */
    detectPlateau(values) {
        if (values.length < this.thresholds.windowSize) {
            return { detected: false, similarity: 0, startIndex: -1 };
        }
        
        // Get recent values
        const window = values.slice(-this.thresholds.windowSize);
        const windowMean = window.reduce((sum, val) => sum + val, 0) / window.length;
        
        // Calculate similarity within window
        const maxDiff = Math.max(...window.map(val => Math.abs(val - windowMean)));
        const similarity = 1 - maxDiff;
        
        // Detect if plateau exists
        const detected = similarity > this.thresholds.plateau;
        
        // Find plateau start if detected
        let startIndex = -1;
        if (detected) {
            for (let i = values.length - this.thresholds.windowSize - 1; i >= 0; i--) {
                const diff = Math.abs(values[i] - windowMean);
                if (diff > (1 - this.thresholds.plateau)) {
                    startIndex = i + 1;
                    break;
                }
            }
            if (startIndex === -1) startIndex = 0;
        }
        
        return { detected, similarity, startIndex, mean: windowMean };
    }
    
    /**
     * Apply exponential smoothing
     * @param {array} values - Array of confidence values
     * @returns {array} Smoothed values
     */
    exponentialSmoothing(values) {
        if (values.length === 0) return [];
        
        const smoothed = [values[0]];
        const alpha = this.smoothing.alpha;
        
        for (let i = 1; i < values.length; i++) {
            smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
        }
        
        return smoothed;
    }
    
    /**
     * Calculate moving average
     * @param {array} values - Array of confidence values
     * @param {number} window - Window size
     * @returns {number} Moving average of last window values
     */
    calculateMovingAverage(values, window) {
        if (values.length < window) {
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        }
        
        const windowValues = values.slice(-window);
        return windowValues.reduce((sum, val) => sum + val, 0) / window;
    }
    
    /**
     * Calculate convergence rate
     * @param {array} values - Array of confidence values
     * @returns {number} Convergence rate (0-1)
     */
    calculateConvergenceRate(values) {
        if (values.length < 2) return 0;
        
        // Calculate improvements between consecutive values
        const improvements = [];
        for (let i = 1; i < values.length; i++) {
            improvements.push(values[i] - values[i - 1]);
        }
        
        // Calculate rate based on diminishing improvements
        const recentImprovements = improvements.slice(-5);
        const avgImprovement = recentImprovements.reduce((sum, val) => sum + Math.abs(val), 0) / 
            recentImprovements.length;
        
        // Rate approaches 1 as improvements approach 0
        return 1 - Math.min(avgImprovement * 10, 1);
    }
    
    /**
     * Calculate stability score
     * @param {array} values - Array of confidence values
     * @returns {number} Stability score (0-1)
     */
    calculateStability(values) {
        if (values.length < 3) return 0;
        
        const recentValues = values.slice(-10);
        const variance = this.calculateVariance(recentValues);
        
        // Stability increases as variance decreases
        return Math.exp(-variance * 100);
    }
    
    /**
     * Calculate overall improvement
     * @param {array} values - Array of confidence values
     * @returns {number} Improvement percentage
     */
    calculateImprovement(values) {
        if (values.length < 2) return 0;
        
        const initial = values[0];
        const final = values[values.length - 1];
        
        return ((final - initial) / initial) * 100;
    }
    
    /**
     * Predict iterations to convergence
     * @param {array} history - Metrics history
     * @returns {number} Estimated iterations to convergence
     */
    predictIterationsToConvergence(history) {
        if (!history || history.length < 3) return -1;
        
        const values = history.map(h => h.metrics.overall);
        const trend = this.calculateTrend(values);
        
        // If already converged
        const convergenceAnalysis = this.analyzeHistory(history);
        if (convergenceAnalysis.isConverged) return 0;
        
        // If trend is negative or flat
        if (trend.slope <= 0) return -1;
        
        // Estimate based on current rate
        const current = values[values.length - 1];
        const target = this.thresholds.confidenceTarget;
        const remainingImprovement = target - current;
        
        if (remainingImprovement <= 0) return 1;
        
        // Account for diminishing returns
        const convergenceRate = this.calculateConvergenceRate(values);
        const adjustedSlope = trend.slope * (1 - convergenceRate * 0.5);
        
        if (adjustedSlope <= 0) return -1;
        
        return Math.ceil(remainingImprovement / adjustedSlope);
    }
    
    /**
     * Get convergence recommendations
     * @param {object} analysis - Convergence analysis results
     * @returns {array} Array of recommendations
     */
    getRecommendations(analysis) {
        const recommendations = [];
        
        if (!analysis.isConverged) {
            if (!analysis.details.targetReached) {
                recommendations.push({
                    type: 'improvement',
                    priority: 'high',
                    message: 'Confidence below target. Consider adjusting analysis parameters.'
                });
            }
            
            if (!analysis.details.varianceConverged) {
                recommendations.push({
                    type: 'stability',
                    priority: 'medium',
                    message: 'High variance detected. Results may be unstable.'
                });
            }
            
            if (!analysis.details.trendConverged) {
                recommendations.push({
                    type: 'trend',
                    priority: 'medium',
                    message: 'Confidence still trending. More iterations may help.'
                });
            }
        } else {
            recommendations.push({
                type: 'success',
                priority: 'low',
                message: `Converged successfully after ${analysis.details.iterations} iterations.`
            });
        }
        
        return recommendations;
    }
    
    /**
     * Export convergence report
     * @param {array} history - Metrics history
     * @returns {object} Detailed convergence report
     */
    exportConvergenceReport(history) {
        const analysis = this.analyzeHistory(history);
        const values = history.map(h => h.metrics.overall);
        
        return {
            summary: {
                isConverged: analysis.isConverged,
                convergenceConfidence: analysis.confidence,
                iterations: history.length,
                finalValue: values[values.length - 1],
                improvement: `${analysis.details.improvement.toFixed(1)}%`
            },
            metrics: analysis.metrics,
            timeline: history.map((h, i) => ({
                iteration: i + 1,
                timestamp: h.timestamp,
                confidence: h.metrics.overall,
                dimensions: h.metrics.dimensions
            })),
            recommendations: this.getRecommendations(analysis),
            prediction: {
                iterationsToConvergence: this.predictIterationsToConvergence(history)
            }
        };
    }
}

// Export for use in browser environment
if (typeof window !== 'undefined' && window.KnowledgeConsolidator) {
    window.KnowledgeConsolidator.ConvergenceAnalyzer = ConvergenceAnalyzer;
}