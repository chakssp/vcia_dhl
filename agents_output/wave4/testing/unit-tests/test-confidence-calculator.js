/**
 * Unit Tests for ConfidenceCalculator
 * 
 * Comprehensive test coverage for the ML confidence calculation engine
 * including edge cases, error handling, and algorithm validation.
 */

import ConfidenceCalculator from '../../../wave1/calculator/ConfidenceCalculator.js';
import MLAlgorithms from '../../../wave1/calculator/MLAlgorithms.js';
import DimensionScorers from '../../../wave1/calculator/DimensionScorers.js';
import ConvergencePredictor from '../../../wave1/calculator/ConvergencePredictor.js';

export default class TestConfidenceCalculator {
    constructor() {
        this.type = 'unit';
        this.name = 'ConfidenceCalculator Unit Tests';
        this.calculator = null;
    }
    
    async setup(helpers, mocks) {
        this.helpers = helpers;
        this.mocks = mocks;
        this.calculator = new ConfidenceCalculator();
    }
    
    async teardown() {
        this.calculator = null;
    }
    
    getTests() {
        return [
            // Initialization Tests
            {
                name: 'should initialize with default weights',
                fn: async (ctx) => {
                    const weights = this.calculator.getWeights();
                    
                    ctx.assertEqual(weights.semantic, 0.4, 'Semantic weight should be 0.4');
                    ctx.assertEqual(weights.categorical, 0.2, 'Categorical weight should be 0.2');
                    ctx.assertEqual(weights.structural, 0.2, 'Structural weight should be 0.2');
                    ctx.assertEqual(weights.temporal, 0.2, 'Temporal weight should be 0.2');
                    
                    // Verify weights sum to 1
                    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
                    ctx.assertAlmostEqual(sum, 1.0, 0.001, 'Weights should sum to 1.0');
                }
            },
            
            {
                name: 'should initialize with custom configuration',
                fn: async (ctx) => {
                    const customCalc = new ConfidenceCalculator({
                        enableAdaptiveWeights: true,
                        enableIterativeLearning: true,
                        convergenceThreshold: 0.9
                    });
                    
                    ctx.assert(customCalc.config.enableAdaptiveWeights, 'Adaptive weights should be enabled');
                    ctx.assert(customCalc.config.enableIterativeLearning, 'Iterative learning should be enabled');
                    ctx.assertEqual(customCalc.config.convergenceThreshold, 0.9);
                }
            },
            
            // Basic Calculation Tests
            {
                name: 'should calculate confidence for valid analysis data',
                fn: async (ctx) => {
                    const analysisData = this.helpers.generateMockAnalysisData();
                    const result = await this.calculator.calculate(analysisData);
                    
                    ctx.assert(result, 'Should return a result');
                    ctx.assertEqual(result.fileId, analysisData.fileId, 'File ID should match');
                    ctx.assertType(result.overall, 'number', 'Overall score should be a number');
                    ctx.assertInRange(result.overall, 0, 1, 'Overall score should be between 0 and 1');
                    
                    // Check all required fields
                    ctx.assert(result.dimensions, 'Should have dimensions object');
                    ctx.assert(result.convergencePrediction, 'Should have convergence prediction');
                    ctx.assert(result.calculatedAt instanceof Date, 'Should have calculation timestamp');
                    ctx.assertType(result.processingTime, 'number', 'Should track processing time');
                }
            },
            
            {
                name: 'should calculate all dimension scores',
                fn: async (ctx) => {
                    const analysisData = this.helpers.generateMockAnalysisData();
                    const result = await this.calculator.calculate(analysisData);
                    
                    const dimensions = ['semantic', 'categorical', 'structural', 'temporal'];
                    
                    dimensions.forEach(dim => {
                        ctx.assertType(result.dimensions[dim], 'number', 
                            `${dim} score should be a number`);
                        ctx.assertInRange(result.dimensions[dim], 0, 1, 
                            `${dim} score should be between 0 and 1`);
                    });
                }
            },
            
            // Edge Case Tests
            {
                name: 'should handle empty content gracefully',
                fn: async (ctx) => {
                    const analysisData = this.helpers.generateMockAnalysisData({
                        content: ''
                    });
                    
                    const result = await this.calculator.calculate(analysisData);
                    
                    ctx.assert(result, 'Should return result for empty content');
                    ctx.assertInRange(result.overall, 0, 1, 'Should return valid score');
                    ctx.assert(result.overall < 0.5, 'Empty content should have low score');
                }
            },
            
            {
                name: 'should handle missing embeddings',
                fn: async (ctx) => {
                    const analysisData = this.helpers.generateMockAnalysisData({
                        embeddings: null
                    });
                    
                    const result = await this.calculator.calculate(analysisData);
                    
                    ctx.assert(result, 'Should handle missing embeddings');
                    ctx.assertInRange(result.overall, 0, 1, 'Should return valid score');
                    ctx.assert(result.dimensions.semantic < 0.5, 
                        'Semantic score should be low without embeddings');
                }
            },
            
            {
                name: 'should handle invalid dates',
                fn: async (ctx) => {
                    const analysisData = this.helpers.generateMockAnalysisData({
                        createdAt: 'invalid-date',
                        modifiedAt: null
                    });
                    
                    const result = await this.calculator.calculate(analysisData);
                    
                    ctx.assert(result, 'Should handle invalid dates');
                    ctx.assertInRange(result.overall, 0, 1, 'Should return valid score');
                }
            },
            
            {
                name: 'should handle very large content',
                fn: async (ctx) => {
                    const largeContent = this.helpers.generateContent(50000);
                    const analysisData = this.helpers.generateMockAnalysisData({
                        content: largeContent
                    });
                    
                    const result = await this.calculator.calculate(analysisData);
                    
                    ctx.assert(result, 'Should handle large content');
                    ctx.assertInRange(result.overall, 0, 1, 'Should return valid score');
                    ctx.assert(result.processingTime < 1000, 
                        'Should process large content in reasonable time');
                }
            },
            
            // Adaptive Weights Tests
            {
                name: 'should apply adaptive weights based on content',
                fn: async (ctx) => {
                    this.calculator.config.enableAdaptiveWeights = true;
                    
                    // Test with short content
                    const shortData = this.helpers.generateMockAnalysisData({
                        content: 'Short content'
                    });
                    const shortResult = await this.calculator.calculate(shortData);
                    
                    // Test with long content
                    const longData = this.helpers.generateMockAnalysisData({
                        content: this.helpers.generateContent(5000)
                    });
                    const longResult = await this.calculator.calculate(longData);
                    
                    // Weights should differ
                    ctx.assert(
                        shortResult.weights.semantic !== longResult.weights.semantic,
                        'Adaptive weights should differ for different content lengths'
                    );
                    
                    // Long content should emphasize semantic more
                    ctx.assert(
                        longResult.weights.semantic > shortResult.weights.semantic,
                        'Long content should have higher semantic weight'
                    );
                }
            },
            
            // Weight Optimization Tests
            {
                name: 'should optimize weights based on feedback',
                fn: async (ctx) => {
                    const initialWeights = { ...this.calculator.getWeights() };
                    
                    const feedbackData = [
                        {
                            predictedConfidence: 0.6,
                            actualConfidence: 0.8,
                            dimensions: { 
                                semantic: 0.9, 
                                categorical: 0.7, 
                                structural: 0.6, 
                                temporal: 0.5 
                            }
                        },
                        {
                            predictedConfidence: 0.7,
                            actualConfidence: 0.85,
                            dimensions: { 
                                semantic: 0.95, 
                                categorical: 0.75, 
                                structural: 0.7, 
                                temporal: 0.6 
                            }
                        }
                    ];
                    
                    this.calculator.optimizeWeights(feedbackData);
                    const optimizedWeights = this.calculator.getWeights();
                    
                    // Weights should change
                    ctx.assert(
                        JSON.stringify(initialWeights) !== JSON.stringify(optimizedWeights),
                        'Weights should be updated after optimization'
                    );
                    
                    // Semantic should increase (it had highest values in feedback)
                    ctx.assert(
                        optimizedWeights.semantic > initialWeights.semantic,
                        'Semantic weight should increase based on feedback'
                    );
                    
                    // Weights should still sum to 1
                    const sum = Object.values(optimizedWeights).reduce((a, b) => a + b, 0);
                    ctx.assertAlmostEqual(sum, 1.0, 0.001, 'Optimized weights should sum to 1.0');
                }
            },
            
            // Convergence Prediction Tests
            {
                name: 'should predict convergence for iterative analysis',
                fn: async (ctx) => {
                    const history = [
                        { overall: 0.4, dimensions: { semantic: 0.4, categorical: 0.3, structural: 0.5, temporal: 0.4 } },
                        { overall: 0.55, dimensions: { semantic: 0.6, categorical: 0.5, structural: 0.6, temporal: 0.5 } },
                        { overall: 0.68, dimensions: { semantic: 0.7, categorical: 0.65, structural: 0.7, temporal: 0.65 } }
                    ];
                    
                    const analysisData = this.helpers.generateMockAnalysisData({
                        iterationHistory: history,
                        iterationCount: 3,
                        previousConfidence: 0.68
                    });
                    
                    const result = await this.calculator.calculate(analysisData);
                    
                    ctx.assert(result.convergencePrediction, 'Should include convergence prediction');
                    ctx.assertType(result.convergencePrediction.willConverge, 'boolean');
                    ctx.assertType(result.convergencePrediction.estimatedIterations, 'number');
                    ctx.assertInRange(result.convergencePrediction.confidence, 0, 1);
                    
                    // Should show improvement
                    ctx.assert(
                        result.overall > 0.68,
                        'Confidence should improve with positive history'
                    );
                }
            },
            
            // Algorithm Registration Tests
            {
                name: 'should register and use custom algorithms',
                fn: async (ctx) => {
                    const customAlgorithm = (features, weights) => {
                        return 0.777; // Fixed value for testing
                    };
                    
                    this.calculator.registerAlgorithm('custom', customAlgorithm);
                    
                    ctx.assert(
                        this.calculator.algorithms.has('custom'),
                        'Custom algorithm should be registered'
                    );
                    
                    // Configure to use custom algorithm
                    this.calculator.config.algorithm = 'custom';
                    
                    const analysisData = this.helpers.generateMockAnalysisData();
                    const result = await this.calculator.calculate(analysisData);
                    
                    // Overall score should be influenced by custom algorithm
                    ctx.assert(
                        Math.abs(result.overall - 0.777) < 0.1,
                        'Custom algorithm should influence the result'
                    );
                }
            },
            
            // Performance Tracking Tests
            {
                name: 'should track performance statistics',
                fn: async (ctx) => {
                    // Reset stats
                    this.calculator.performanceStats = {
                        totalCalculations: 0,
                        totalProcessingTime: 0,
                        totalConfidence: 0,
                        historySize: 0
                    };
                    
                    // Perform multiple calculations
                    const calculations = 5;
                    for (let i = 0; i < calculations; i++) {
                        const data = this.helpers.generateMockAnalysisData();
                        await this.calculator.calculate(data);
                    }
                    
                    const stats = this.calculator.getPerformanceStats();
                    
                    ctx.assertEqual(stats.totalCalculations, calculations);
                    ctx.assert(stats.avgProcessingTime > 0, 'Should track processing time');
                    ctx.assert(stats.avgConfidence > 0, 'Should track average confidence');
                    ctx.assertInRange(stats.avgConfidence, 0, 1);
                }
            },
            
            // Error Handling Tests
            {
                name: 'should handle null input gracefully',
                fn: async (ctx) => {
                    await ctx.assertThrows(
                        async () => await this.calculator.calculate(null),
                        'Invalid analysis data',
                        'Should throw error for null input'
                    );
                }
            },
            
            {
                name: 'should handle malformed data structure',
                fn: async (ctx) => {
                    const malformedData = { 
                        // Missing required fields
                        content: 'test' 
                    };
                    
                    const result = await this.calculator.calculate(malformedData);
                    
                    ctx.assert(result, 'Should handle malformed data');
                    ctx.assertInRange(result.overall, 0, 1, 'Should return valid score');
                }
            },
            
            // Dimension Scorer Tests
            {
                name: 'should calculate semantic dimension correctly',
                fn: async (ctx) => {
                    const scorers = new DimensionScorers();
                    const features = {
                        embeddings: this.helpers.generateEmbeddings(),
                        embeddingMagnitude: 5.2,
                        embeddingVariance: 0.02,
                        wordCount: 500,
                        uniqueWords: 200,
                        avgSentenceLength: 15,
                        categoryConfidence: 0.8,
                        hasTitle: true,
                        hasSections: true,
                        formatQuality: 0.7
                    };
                    
                    const score = scorers.calculateSemantic(features);
                    
                    ctx.assertType(score, 'number');
                    ctx.assertInRange(score, 0, 1);
                    ctx.assert(score > 0.5, 'Good features should yield high semantic score');
                }
            },
            
            {
                name: 'should calculate temporal dimension with decay',
                fn: async (ctx) => {
                    const scorers = new DimensionScorers();
                    
                    // Recent file
                    const recentFeatures = {
                        daysSinceCreation: 1,
                        daysSinceModification: 0,
                        iterationCount: 0
                    };
                    const recentScore = scorers.calculateTemporal(recentFeatures);
                    
                    // Old file
                    const oldFeatures = {
                        daysSinceCreation: 365,
                        daysSinceModification: 300,
                        iterationCount: 0
                    };
                    const oldScore = scorers.calculateTemporal(oldFeatures);
                    
                    ctx.assert(recentScore > oldScore, 'Recent files should score higher');
                    ctx.assert(recentScore > 0.8, 'Very recent files should have high temporal score');
                    ctx.assert(oldScore < 0.5, 'Old files should have low temporal score');
                }
            },
            
            // ML Algorithm Tests
            {
                name: 'should use weighted ensemble algorithm',
                fn: async (ctx) => {
                    const mlAlgorithms = new MLAlgorithms();
                    const features = {
                        wordCount: 1000,
                        uniqueWords: 400,
                        avgSentenceLength: 20,
                        embeddings: this.helpers.generateEmbeddings(),
                        embeddingMagnitude: 5,
                        embeddingVariance: 0.02,
                        categoryConfidence: 0.85,
                        hasTitle: true,
                        hasSections: true,
                        hasLists: true,
                        hasCode: false,
                        formatQuality: 0.8,
                        fileType: 'md',
                        daysSinceModification: 5,
                        daysSinceCreation: 30,
                        iterationCount: 2,
                        previousConfidence: 0.7,
                        improvementRate: 0.1
                    };
                    
                    const score = mlAlgorithms.weightedEnsemble(features);
                    
                    ctx.assertType(score, 'number');
                    ctx.assertInRange(score, 0, 1);
                    ctx.assert(score > 0.6, 'Good features should yield high ensemble score');
                }
            },
            
            // Integration with Convergence Predictor
            {
                name: 'should integrate with convergence predictor',
                fn: async (ctx) => {
                    const predictor = new ConvergencePredictor();
                    const prediction = predictor.predict(
                        'test-file',
                        0.75,
                        { semantic: 0.8, categorical: 0.7, structural: 0.75, temporal: 0.7 },
                        [
                            { overall: 0.5 },
                            { overall: 0.65 },
                            { overall: 0.75 }
                        ]
                    );
                    
                    ctx.assert(prediction.willConverge, 'Should predict convergence for improving trend');
                    ctx.assert(prediction.estimatedIterations < 5, 'Should estimate reasonable iterations');
                    ctx.assert(prediction.confidence > 0.7, 'Should have high confidence in prediction');
                    ctx.assert(prediction.strategy, 'Should select a convergence strategy');
                }
            }
        ];
    }
}

// Export for test framework
export { TestConfidenceCalculator };