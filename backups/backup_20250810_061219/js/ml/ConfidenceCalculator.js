/**
 * ConfidenceCalculator - ML-based Multi-dimensional Confidence Scoring
 * 
 * Implements sophisticated ML algorithms for calculating confidence scores
 * across multiple dimensions (semantic, categorical, structural, temporal)
 * with convergence prediction and weight optimization capabilities.
 * 
 * @implements {ConfidenceCalculatorInterface}
 */

// Temporariamente remover imports até migrar todos os arquivos
// import { ConfidenceMetricsInterface } from '../shared/interfaces.js';
// import MLAlgorithms from './MLAlgorithms.js';
// import DimensionScorers from './DimensionScorers.js';
// import ConvergencePredictor from './ConvergencePredictor.js';

class ConfidenceCalculator {
    constructor() {
        // Initialize ML algorithms registry
        this.algorithms = new Map();
        this.initializeDefaultAlgorithms();
        
        // Default dimension weights - optimizable through feedback
        this.weights = {
            semantic: 0.4,
            categorical: 0.2,
            structural: 0.2,
            temporal: 0.2
        };
        
        // Performance tracking for weight optimization
        this.performanceHistory = [];
        this.maxHistorySize = 1000;
        
        // Initialize sub-components (temporariamente comentado)
        this.dimensionScorers = this.createBasicDimensionScorers();
        this.convergencePredictor = this.createBasicConvergencePredictor();
        this.mlAlgorithms = this.createBasicMLAlgorithms();
        // Original lines commented: = new DimensionScorers();
        // this.convergencePredictor = new ConvergencePredictor();
        // this.mlAlgorithms = new MLAlgorithms();
        
        // Configuration
        this.config = {
            minConfidence: 0.65,
            targetConfidence: 0.85,
            convergenceThreshold: 0.95,
            weightLearningRate: 0.01,
            enableAdaptiveWeights: true
        };
    }
    
    /**
     * Calculate multi-dimensional confidence metrics
     * @param {object} analysisData - Analysis data containing content, metadata, embeddings
     * @returns {ConfidenceMetrics} Calculated confidence metrics
     */
    calculate(analysisData) {
        const startTime = Date.now();
        
        try {
            // Extract features for ML processing
            const features = this.extractFeatures(analysisData);
            
            // Calculate individual dimension scores
            const dimensions = {
                semantic: this.dimensionScorers.calculateSemantic(features),
                categorical: this.dimensionScorers.calculateCategorical(features),
                structural: this.dimensionScorers.calculateStructural(features),
                temporal: this.dimensionScorers.calculateTemporal(features)
            };
            
            // Apply adaptive weights if enabled
            const weights = this.config.enableAdaptiveWeights ? 
                this.getAdaptiveWeights(features) : this.weights;
            
            // Calculate weighted overall confidence
            const overall = this.calculateWeightedAverage(dimensions, weights);
            
            // Predict convergence based on history
            const convergencePrediction = this.convergencePredictor.predict(
                analysisData.fileId,
                overall,
                dimensions,
                analysisData.iterationHistory || []
            );
            
            // Build metrics object
            const metrics = {
                fileId: analysisData.fileId,
                dimensions,
                overall,
                convergencePrediction,
                calculatedAt: new Date(),
                processingTime: Date.now() - startTime,
                algorithm: 'weighted_ensemble',
                weights: weights
            };
            
            // Track performance for future optimization
            this.trackPerformance(metrics, analysisData);
            
            return metrics;
            
        } catch (error) {
            console.error('ConfidenceCalculator: Error calculating metrics', error);
            throw new Error(`Failed to calculate confidence: ${error.message}`);
        }
    }
    
    /**
     * Extract ML features from analysis data
     * @private
     */
    extractFeatures(analysisData) {
        const features = {
            // Content features
            contentLength: analysisData.content?.length || 0,
            wordCount: this.countWords(analysisData.content),
            uniqueWords: this.countUniqueWords(analysisData.content),
            avgSentenceLength: this.calculateAvgSentenceLength(analysisData.content),
            
            // Semantic features from embeddings
            embeddings: analysisData.embeddings || [],
            embeddingMagnitude: this.calculateEmbeddingMagnitude(analysisData.embeddings),
            embeddingVariance: this.calculateEmbeddingVariance(analysisData.embeddings),
            
            // Categorical features
            categories: analysisData.categories || [],
            categoryCount: (analysisData.categories || []).length,
            categoryConfidence: analysisData.categoryConfidence || 0,
            
            // Structural features
            hasTitle: Boolean(analysisData.title),
            hasSections: this.detectSections(analysisData.content),
            hasLists: this.detectLists(analysisData.content),
            hasCode: this.detectCode(analysisData.content),
            formatQuality: this.assessFormatQuality(analysisData.content),
            
            // Temporal features
            createdAt: analysisData.createdAt ? new Date(analysisData.createdAt) : null,
            modifiedAt: analysisData.modifiedAt ? new Date(analysisData.modifiedAt) : null,
            analysisTimestamp: new Date(),
            daysSinceCreation: this.calculateDaysSince(analysisData.createdAt),
            daysSinceModification: this.calculateDaysSince(analysisData.modifiedAt),
            
            // Iteration features
            iterationCount: analysisData.iterationCount || 0,
            previousConfidence: analysisData.previousConfidence || 0,
            improvementRate: analysisData.improvementRate || 0,
            
            // Additional metadata
            fileType: analysisData.fileType || 'unknown',
            fileSize: analysisData.fileSize || 0,
            path: analysisData.path || '',
            depth: (analysisData.path || '').split('/').length - 1
        };
        
        return features;
    }
    
    /**
     * Calculate weighted average of dimension scores
     * @private
     */
    calculateWeightedAverage(dimensions, weights) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [dimension, score] of Object.entries(dimensions)) {
            const weight = weights[dimension] || 0;
            weightedSum += score * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    /**
     * Get adaptive weights based on features
     * @private
     */
    getAdaptiveWeights(features) {
        // Start with base weights
        const adaptiveWeights = { ...this.weights };
        
        // Adjust based on content characteristics
        if (features.contentLength < 500) {
            // Short content - reduce semantic weight, increase structural
            adaptiveWeights.semantic *= 0.8;
            adaptiveWeights.structural *= 1.2;
        }
        
        if (features.categoryCount === 0) {
            // No categories - redistribute categorical weight
            adaptiveWeights.categorical = 0.1;
            adaptiveWeights.semantic += 0.05;
            adaptiveWeights.structural += 0.05;
        }
        
        if (features.daysSinceModification > 365) {
            // Old content - increase temporal weight
            adaptiveWeights.temporal *= 1.5;
        }
        
        // Normalize weights to sum to 1
        const sum = Object.values(adaptiveWeights).reduce((a, b) => a + b, 0);
        for (const key in adaptiveWeights) {
            adaptiveWeights[key] /= sum;
        }
        
        return adaptiveWeights;
    }
    
    /**
     * Predict convergence for iterative refinement
     * @param {array} historyData - Historical confidence data
     * @returns {object} Convergence prediction
     */
    predictConvergence(historyData) {
        return this.convergencePredictor.predict(
            null, // fileId not needed for standalone prediction
            null, // current confidence will be extracted from history
            null, // dimensions will be extracted from history
            historyData
        );
    }
    
    /**
     * Optimize dimension weights based on feedback
     * @param {array} feedbackData - Array of feedback entries
     */
    optimizeWeights(feedbackData) {
        if (!feedbackData || feedbackData.length === 0) {
            console.warn('ConfidenceCalculator: No feedback data provided for weight optimization');
            return;
        }
        
        // Use gradient descent to optimize weights
        const gradients = this.calculateWeightGradients(feedbackData);
        
        // Update weights using learning rate
        for (const [dimension, gradient] of Object.entries(gradients)) {
            this.weights[dimension] += gradient * this.config.weightLearningRate;
            
            // Ensure weights stay within reasonable bounds
            this.weights[dimension] = Math.max(0.05, Math.min(0.8, this.weights[dimension]));
        }
        
        // Normalize weights to sum to 1
        const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
        for (const key in this.weights) {
            this.weights[key] /= sum;
        }
        
        console.log('ConfidenceCalculator: Weights optimized', this.weights);
    }
    
    /**
     * Calculate weight gradients for optimization
     * @private
     */
    calculateWeightGradients(feedbackData) {
        const gradients = {
            semantic: 0,
            categorical: 0,
            structural: 0,
            temporal: 0
        };
        
        // Calculate error gradients for each feedback entry
        for (const feedback of feedbackData) {
            const predicted = feedback.predictedConfidence;
            const actual = feedback.actualConfidence;
            const error = actual - predicted;
            
            // Gradient is proportional to error and dimension score
            for (const dimension in feedback.dimensions) {
                gradients[dimension] += error * feedback.dimensions[dimension];
            }
        }
        
        // Average gradients
        for (const dimension in gradients) {
            gradients[dimension] /= feedbackData.length;
        }
        
        return gradients;
    }
    
    /**
     * Register custom ML algorithm
     * @param {string} name - Algorithm name
     * @param {function} algorithm - Algorithm implementation
     */
    registerAlgorithm(name, algorithm) {
        if (!name || typeof algorithm !== 'function') {
            throw new Error('Invalid algorithm registration: name and function required');
        }
        
        this.algorithms.set(name, algorithm);
        console.log(`ConfidenceCalculator: Registered algorithm '${name}'`);
    }
    
    /**
     * Initialize default ML algorithms
     * @private
     */
    initializeDefaultAlgorithms() {
        // Weighted ensemble (default)
        this.registerAlgorithm('weighted_ensemble', (features, weights) => {
            return this.mlAlgorithms.weightedEnsemble(features, weights);
        });
        
        // Neural network-inspired
        this.registerAlgorithm('neural_confidence', (features) => {
            return this.mlAlgorithms.neuralConfidence(features);
        });
        
        // Random forest-inspired
        this.registerAlgorithm('random_forest', (features) => {
            return this.mlAlgorithms.randomForest(features);
        });
        
        // Gradient boosting-inspired
        this.registerAlgorithm('gradient_boost', (features) => {
            return this.mlAlgorithms.gradientBoost(features);
        });
    }
    
    /**
     * Track performance for future optimization
     * @private
     */
    trackPerformance(metrics, analysisData) {
        const performanceEntry = {
            timestamp: new Date(),
            fileId: metrics.fileId,
            predicted: metrics.overall,
            dimensions: metrics.dimensions,
            weights: metrics.weights,
            features: this.extractFeatures(analysisData),
            processingTime: metrics.processingTime
        };
        
        this.performanceHistory.push(performanceEntry);
        
        // Maintain history size limit
        if (this.performanceHistory.length > this.maxHistorySize) {
            this.performanceHistory.shift();
        }
    }
    
    // Utility methods for feature extraction
    
    countWords(content) {
        if (!content) return 0;
        return content.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    countUniqueWords(content) {
        if (!content) return 0;
        const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        return new Set(words).size;
    }
    
    calculateAvgSentenceLength(content) {
        if (!content) return 0;
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 0) return 0;
        const totalWords = sentences.reduce((sum, sentence) => {
            return sum + this.countWords(sentence);
        }, 0);
        return totalWords / sentences.length;
    }
    
    calculateEmbeddingMagnitude(embeddings) {
        if (!embeddings || embeddings.length === 0) return 0;
        return Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
    }
    
    calculateEmbeddingVariance(embeddings) {
        if (!embeddings || embeddings.length === 0) return 0;
        const mean = embeddings.reduce((sum, val) => sum + val, 0) / embeddings.length;
        const variance = embeddings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embeddings.length;
        return variance;
    }
    
    detectSections(content) {
        if (!content) return false;
        // Look for markdown headers or numbered sections
        return /^#+\s|^\d+\.\s/m.test(content);
    }
    
    detectLists(content) {
        if (!content) return false;
        // Look for bullet points or numbered lists
        return /^[\*\-\+]\s|^\d+\.\s/m.test(content);
    }
    
    detectCode(content) {
        if (!content) return false;
        // Look for code blocks or inline code
        return /```[\s\S]*?```|`[^`]+`/.test(content);
    }
    
    assessFormatQuality(content) {
        if (!content) return 0;
        let quality = 0.5; // Base quality
        
        // Bonus for structure
        if (this.detectSections(content)) quality += 0.2;
        if (this.detectLists(content)) quality += 0.1;
        if (this.detectCode(content)) quality += 0.1;
        
        // Penalty for poor formatting
        if (content.length > 1000 && !this.detectSections(content)) quality -= 0.2;
        
        return Math.max(0, Math.min(1, quality));
    }
    
    calculateDaysSince(dateString) {
        if (!dateString) return 0;
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Get current weights
     */
    getWeights() {
        return { ...this.weights };
    }
    
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        if (this.performanceHistory.length === 0) {
            return null;
        }
        
        const recentHistory = this.performanceHistory.slice(-100);
        const avgProcessingTime = recentHistory.reduce((sum, entry) => sum + entry.processingTime, 0) / recentHistory.length;
        const avgConfidence = recentHistory.reduce((sum, entry) => sum + entry.predicted, 0) / recentHistory.length;
        
        return {
            totalCalculations: this.performanceHistory.length,
            avgProcessingTime,
            avgConfidence,
            currentWeights: this.weights,
            historySize: this.performanceHistory.length
        };
    }
    
    // ========= IMPLEMENTAÇÕES BÁSICAS TEMPORÁRIAS =========
    
    /**
     * Cria implementação básica de DimensionScorers
     * @private
     */
    createBasicDimensionScorers() {
        return {
            calculateSemantic: (features) => {
                let score = 0.5; // Base score
                
                // Content richness
                if (features.wordCount > 500) score += 0.1;
                if (features.uniqueWords > 100) score += 0.1;
                
                // Embedding quality
                if (features.embeddingMagnitude > 0) {
                    score += Math.min(0.2, features.embeddingMagnitude / 100);
                }
                
                // Variance indicates diversity
                if (features.embeddingVariance > 0.1) score += 0.1;
                
                return Math.min(1, score);
            },
            
            calculateCategorical: (features) => {
                let score = 0.3; // Base score
                
                // Category presence
                if (features.categoryCount > 0) {
                    score += Math.min(0.3, features.categoryCount * 0.1);
                }
                
                // Category confidence
                score += (features.categoryConfidence || 0) * 0.4;
                
                return Math.min(1, score);
            },
            
            calculateStructural: (features) => {
                let score = features.formatQuality || 0.5;
                
                // Structure indicators
                if (features.hasTitle) score += 0.1;
                if (features.hasSections) score += 0.15;
                if (features.hasLists) score += 0.1;
                if (features.hasCode) score += 0.05;
                
                // Content organization
                const avgSentenceQuality = Math.min(1, features.avgSentenceLength / 20);
                score += avgSentenceQuality * 0.1;
                
                return Math.min(1, score);
            },
            
            calculateTemporal: (features) => {
                let score = 0.7; // Base score for current content
                
                // Recency bonus
                if (features.daysSinceModification < 30) {
                    score += 0.2;
                } else if (features.daysSinceModification < 90) {
                    score += 0.1;
                } else if (features.daysSinceModification > 365) {
                    score -= 0.2;
                }
                
                // Iteration improvement
                if (features.iterationCount > 0 && features.improvementRate > 0) {
                    score += Math.min(0.1, features.improvementRate);
                }
                
                return Math.max(0, Math.min(1, score));
            }
        };
    }
    
    /**
     * Cria implementação básica de ConvergencePredictor
     * @private
     */
    createBasicConvergencePredictor() {
        return {
            predict: (fileId, overall, dimensions, history) => {
                const willConverge = overall >= 0.85;
                const estimatedIterations = willConverge ? 0 : Math.ceil((0.85 - overall) / 0.05);
                
                return {
                    willConverge,
                    estimatedIterations,
                    confidence: overall >= 0.85 ? 0.95 : 0.7,
                    trend: history.length > 1 ? 
                        (history[history.length - 1] > history[0] ? 'improving' : 'stable') : 
                        'unknown'
                };
            }
        };
    }
    
    /**
     * Cria implementação básica de MLAlgorithms
     * @private
     */
    createBasicMLAlgorithms() {
        return {
            weightedEnsemble: (features, weights) => {
                // Implementação básica já existe em calculateWeightedAverage
                return 0.75; // Placeholder
            },
            
            neuralConfidence: (features) => {
                // Simulação simples de rede neural
                return Math.random() * 0.3 + 0.6; // 0.6 - 0.9
            },
            
            randomForest: (features) => {
                // Simulação simples de random forest
                return Math.random() * 0.2 + 0.7; // 0.7 - 0.9
            },
            
            gradientBoost: (features) => {
                // Simulação simples de gradient boost
                return Math.random() * 0.25 + 0.65; // 0.65 - 0.9
            }
        };
    }
}

// Register in global KC namespace
if (typeof window !== 'undefined') {
    window.KC = window.KC || {};
    window.KC.ConfidenceCalculator = ConfidenceCalculator;
}

// Registrar no window.KC para compatibilidade com SystemIntegrationOrchestrator
if (typeof window !== 'undefined') {
    window.KC = window.KC || {};
    window.KC.ConfidenceCalculator = ConfidenceCalculator;
    
    // Compatibilidade com KnowledgeConsolidator
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KnowledgeConsolidator.ConfidenceCalculator = ConfidenceCalculator;
}