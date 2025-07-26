/**
 * Comprehensive Test Suite for ML Confidence Calculator
 * 
 * Tests all components: ConfidenceCalculator, MLAlgorithms, 
 * DimensionScorers, and ConvergencePredictor
 */

import ConfidenceCalculator from './ConfidenceCalculator.js';
import MLAlgorithms from './MLAlgorithms.js';
import DimensionScorers from './DimensionScorers.js';
import ConvergencePredictor from './ConvergencePredictor.js';

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.startTime = null;
    }
    
    test(name, fn) {
        this.tests.push({ name, fn });
    }
    
    async run() {
        console.log('🧪 ML Confidence Calculator Test Suite');
        console.log('=====================================\n');
        
        this.startTime = Date.now();
        
        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${test.name}`);
                console.error(`   Error: ${error.message}`);
                console.error(`   Stack: ${error.stack}`);
            }
        }
        
        const duration = Date.now() - this.startTime;
        console.log('\n=====================================');
        console.log(`Total: ${this.tests.length} | Passed: ${this.passed} | Failed: ${this.failed}`);
        console.log(`Duration: ${duration}ms`);
        console.log('=====================================\n');
        
        return this.failed === 0;
    }
}

// Test utilities
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertAlmostEqual(actual, expected, tolerance = 0.001) {
    assert(
        Math.abs(actual - expected) < tolerance,
        `Expected ${expected}, but got ${actual} (tolerance: ${tolerance})`
    );
}

function generateMockAnalysisData(overrides = {}) {
    return {
        fileId: 'test-file-001',
        content: `# Test Document
        
This is a test document with multiple sections and various content types.

## Section 1
- List item 1
- List item 2

## Section 2
\`\`\`javascript
function test() {
    return true;
}
\`\`\`

This document contains approximately 50 words of content for testing purposes.`,
        fileType: 'md',
        fileSize: 1024,
        categories: ['test', 'documentation'],
        categoryConfidence: 0.8,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        modifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        iterationCount: 0,
        previousConfidence: 0,
        embeddings: new Array(768).fill(0).map(() => (Math.random() - 0.5) * 2),
        ...overrides
    };
}

// Initialize test runner
const runner = new TestRunner();

// ConfidenceCalculator Tests
runner.test('ConfidenceCalculator: Should initialize with default weights', () => {
    const calculator = new ConfidenceCalculator();
    assert(calculator.weights.semantic === 0.4, 'Semantic weight should be 0.4');
    assert(calculator.weights.categorical === 0.2, 'Categorical weight should be 0.2');
    assert(calculator.weights.structural === 0.2, 'Structural weight should be 0.2');
    assert(calculator.weights.temporal === 0.2, 'Temporal weight should be 0.2');
});

runner.test('ConfidenceCalculator: Should calculate basic confidence metrics', async () => {
    const calculator = new ConfidenceCalculator();
    const analysisData = generateMockAnalysisData();
    
    const result = await calculator.calculate(analysisData);
    
    assert(result.fileId === 'test-file-001', 'File ID should match');
    assert(typeof result.overall === 'number', 'Overall score should be a number');
    assert(result.overall >= 0 && result.overall <= 1, 'Overall score should be between 0 and 1');
    assert(result.dimensions, 'Should have dimensions object');
    assert(result.convergencePrediction, 'Should have convergence prediction');
});

runner.test('ConfidenceCalculator: Should handle empty content gracefully', async () => {
    const calculator = new ConfidenceCalculator();
    const analysisData = generateMockAnalysisData({ content: '' });
    
    const result = await calculator.calculate(analysisData);
    
    assert(result.overall >= 0, 'Should handle empty content without error');
});

runner.test('ConfidenceCalculator: Should apply adaptive weights', async () => {
    const calculator = new ConfidenceCalculator();
    calculator.config.enableAdaptiveWeights = true;
    
    // Test with short content
    const shortData = generateMockAnalysisData({ content: 'Short content' });
    const shortResult = await calculator.calculate(shortData);
    
    // Test with long content
    const longContent = 'Long content '.repeat(500);
    const longData = generateMockAnalysisData({ content: longContent });
    const longResult = await calculator.calculate(longData);
    
    // Weights should be different for different content lengths
    assert(shortResult.weights.semantic !== longResult.weights.semantic, 
        'Adaptive weights should differ for different content');
});

runner.test('ConfidenceCalculator: Should optimize weights based on feedback', () => {
    const calculator = new ConfidenceCalculator();
    const initialWeights = { ...calculator.weights };
    
    const feedbackData = [
        {
            predictedConfidence: 0.6,
            actualConfidence: 0.8,
            dimensions: { semantic: 0.7, categorical: 0.5, structural: 0.6, temporal: 0.5 }
        },
        {
            predictedConfidence: 0.7,
            actualConfidence: 0.85,
            dimensions: { semantic: 0.8, categorical: 0.6, structural: 0.7, temporal: 0.6 }
        }
    ];
    
    calculator.optimizeWeights(feedbackData);
    
    // Weights should have changed
    assert(calculator.weights.semantic !== initialWeights.semantic, 
        'Weights should be updated after optimization');
    
    // Weights should still sum to 1
    const sum = Object.values(calculator.weights).reduce((a, b) => a + b, 0);
    assertAlmostEqual(sum, 1.0, 0.001);
});

runner.test('ConfidenceCalculator: Should register custom algorithms', () => {
    const calculator = new ConfidenceCalculator();
    
    const customAlgorithm = (features, weights) => {
        return 0.75; // Simple custom algorithm
    };
    
    calculator.registerAlgorithm('custom', customAlgorithm);
    assert(calculator.algorithms.has('custom'), 'Custom algorithm should be registered');
});

// MLAlgorithms Tests
runner.test('MLAlgorithms: Should calculate weighted ensemble score', () => {
    const mlAlgorithms = new MLAlgorithms();
    const features = {
        wordCount: 500,
        uniqueWords: 200,
        avgSentenceLength: 15,
        embeddings: new Array(768).fill(0.1),
        embeddingMagnitude: 5,
        embeddingVariance: 0.02,
        categoryConfidence: 0.8,
        hasTitle: true,
        hasSections: true,
        hasLists: false,
        hasCode: false,
        formatQuality: 0.7,
        fileType: 'md',
        daysSinceModification: 10,
        daysSinceCreation: 100,
        iterationCount: 2,
        previousConfidence: 0.6,
        improvementRate: 0.05
    };
    
    const score = mlAlgorithms.weightedEnsemble(features);
    assert(typeof score === 'number', 'Score should be a number');
    assert(score >= 0 && score <= 1, 'Score should be between 0 and 1');
});

runner.test('MLAlgorithms: Should calculate neural confidence', () => {
    const mlAlgorithms = new MLAlgorithms();
    const features = {
        embeddings: new Array(768).fill(0).map(() => Math.random() - 0.5),
        wordCount: 1000,
        uniqueWords: 400,
        categoryCount: 2,
        formatQuality: 0.8
    };
    
    const score = mlAlgorithms.neuralConfidence(features);
    assert(typeof score === 'number', 'Neural confidence should be a number');
    assert(score >= 0 && score <= 1, 'Neural confidence should be between 0 and 1');
});

runner.test('MLAlgorithms: Should calculate random forest score', () => {
    const mlAlgorithms = new MLAlgorithms();
    const features = generateMockAnalysisData();
    
    const score = mlAlgorithms.randomForest(features);
    assert(typeof score === 'number', 'Random forest score should be a number');
    assert(score >= 0 && score <= 1, 'Random forest score should be between 0 and 1');
});

runner.test('MLAlgorithms: Should calculate gradient boost score', () => {
    const mlAlgorithms = new MLAlgorithms();
    const features = generateMockAnalysisData();
    
    const score = mlAlgorithms.gradientBoost(features);
    assert(typeof score === 'number', 'Gradient boost score should be a number');
    assert(score >= 0 && score <= 1, 'Gradient boost score should be between 0 and 1');
});

// DimensionScorers Tests
runner.test('DimensionScorers: Should calculate semantic score', () => {
    const scorers = new DimensionScorers();
    const features = {
        embeddings: new Array(768).fill(0.1),
        embeddingMagnitude: 5,
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
    assert(typeof score === 'number', 'Semantic score should be a number');
    assert(score >= 0 && score <= 1, 'Semantic score should be between 0 and 1');
});

runner.test('DimensionScorers: Should calculate categorical score', () => {
    const scorers = new DimensionScorers();
    
    // Test with optimal categories
    const optimalFeatures = {
        categoryCount: 3,
        categoryConfidence: 0.85,
        categories: ['docs', 'tutorial', 'reference']
    };
    const optimalScore = scorers.calculateCategorical(optimalFeatures);
    
    // Test with no categories
    const noCategories = {
        categoryCount: 0,
        categoryConfidence: 0,
        categories: []
    };
    const noCatScore = scorers.calculateCategorical(noCategories);
    
    assert(optimalScore > noCatScore, 'Optimal categories should score higher');
    assert(noCatScore < 0.5, 'No categories should have low score');
});

runner.test('DimensionScorers: Should calculate structural score', () => {
    const scorers = new DimensionScorers();
    
    // Well-structured document
    const goodStructure = {
        hasTitle: true,
        hasSections: true,
        hasLists: true,
        hasCode: true,
        formatQuality: 0.9,
        fileType: 'md',
        depth: 2,
        fileSize: 50000 // 50KB
    };
    const goodScore = scorers.calculateStructural(goodStructure);
    
    // Poorly structured document
    const poorStructure = {
        hasTitle: false,
        hasSections: false,
        hasLists: false,
        hasCode: false,
        formatQuality: 0.2,
        fileType: 'txt',
        depth: 8,
        fileSize: 5000000 // 5MB
    };
    const poorScore = scorers.calculateStructural(poorStructure);
    
    assert(goodScore > poorScore, 'Well-structured document should score higher');
});

runner.test('DimensionScorers: Should calculate temporal score', () => {
    const scorers = new DimensionScorers();
    
    // Recent file
    const recentFeatures = {
        daysSinceCreation: 5,
        daysSinceModification: 1,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        modifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        iterationCount: 0
    };
    const recentScore = scorers.calculateTemporal(recentFeatures);
    
    // Old file
    const oldFeatures = {
        daysSinceCreation: 500,
        daysSinceModification: 400,
        createdAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
        modifiedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        iterationCount: 0
    };
    const oldScore = scorers.calculateTemporal(oldFeatures);
    
    assert(recentScore > oldScore, 'Recent files should score higher');
});

// ConvergencePredictor Tests
runner.test('ConvergencePredictor: Should predict linear convergence', () => {
    const predictor = new ConvergencePredictor();
    const features = {
        currentConfidence: 0.6,
        dimensions: { semantic: 0.6, categorical: 0.5, structural: 0.7, temporal: 0.6 },
        iterationCount: 3,
        history: [
            { overall: 0.4 },
            { overall: 0.5 },
            { overall: 0.6 }
        ],
        improvements: [0.1, 0.1],
        avgImprovement: 0.1,
        trend: 'stable',
        distanceToTarget: 0.25,
        relativeDistance: 0.294
    };
    
    const prediction = predictor.linearConvergence(features);
    assert(prediction.willConverge !== undefined, 'Should predict convergence');
    assert(prediction.estimatedIterations > 0, 'Should estimate iterations');
});

runner.test('ConvergencePredictor: Should predict exponential convergence', () => {
    const predictor = new ConvergencePredictor();
    const features = {
        currentConfidence: 0.7,
        improvements: [0.2, 0.15, 0.1, 0.05],
        avgImprovement: 0.125,
        distanceToTarget: 0.15,
        iterationCount: 4,
        trend: 'decelerating'
    };
    
    const prediction = predictor.exponentialConvergence(features);
    assert(typeof prediction.finalScore === 'number', 'Should predict final score');
});

runner.test('ConvergencePredictor: Should use adaptive strategy selection', () => {
    const predictor = new ConvergencePredictor();
    
    // High plateau risk - should use logarithmic
    const plateauFeatures = {
        currentConfidence: 0.75,
        dimensions: {},
        improvements: [0.01, 0.01, 0.01],
        avgImprovement: 0.01,
        trend: 'stable',
        plateauRisk: 0.8,
        distanceToTarget: 0.1
    };
    
    const adaptivePrediction = predictor.adaptiveConvergence(plateauFeatures);
    assert(adaptivePrediction.estimatedIterations !== undefined, 'Should provide iteration estimate');
});

runner.test('ConvergencePredictor: Should calculate confidence bounds', () => {
    const predictor = new ConvergencePredictor();
    const prediction = predictor.predict(
        'test-file',
        0.7,
        { semantic: 0.7, categorical: 0.6, structural: 0.8, temporal: 0.7 },
        [{ overall: 0.5 }, { overall: 0.6 }, { overall: 0.7 }]
    );
    
    assert(prediction.bounds, 'Should calculate bounds');
    assert(prediction.bounds.iterations.lower <= prediction.bounds.iterations.upper, 
        'Iteration bounds should be ordered');
});

runner.test('ConvergencePredictor: Should handle empty history', () => {
    const predictor = new ConvergencePredictor();
    const prediction = predictor.predict(
        'test-file',
        0.5,
        { semantic: 0.5, categorical: 0.5, structural: 0.5, temporal: 0.5 },
        []
    );
    
    assert(prediction.willConverge !== undefined, 'Should handle empty history');
});

// Integration Tests
runner.test('Integration: Full confidence calculation flow', async () => {
    const calculator = new ConfidenceCalculator();
    const analysisData = generateMockAnalysisData({
        iterationHistory: [
            { overall: 0.4, dimensions: { semantic: 0.4, categorical: 0.3, structural: 0.5, temporal: 0.4 } },
            { overall: 0.55, dimensions: { semantic: 0.6, categorical: 0.5, structural: 0.6, temporal: 0.5 } },
            { overall: 0.68, dimensions: { semantic: 0.7, categorical: 0.65, structural: 0.7, temporal: 0.65 } }
        ],
        iterationCount: 3,
        previousConfidence: 0.68
    });
    
    const result = await calculator.calculate(analysisData);
    
    assert(result.overall > 0.68, 'Confidence should improve with iterations');
    assert(result.convergencePrediction.willConverge !== undefined, 'Should predict convergence');
    assert(result.processingTime !== undefined, 'Should track processing time');
});

runner.test('Integration: Performance tracking', async () => {
    const calculator = new ConfidenceCalculator();
    
    // Calculate multiple times
    for (let i = 0; i < 5; i++) {
        const data = generateMockAnalysisData({ 
            fileId: `test-file-${i}`,
            content: `Content iteration ${i}`
        });
        await calculator.calculate(data);
    }
    
    const stats = calculator.getPerformanceStats();
    assert(stats.totalCalculations === 5, 'Should track all calculations');
    assert(stats.avgProcessingTime > 0, 'Should calculate average processing time');
});

runner.test('Integration: Weight optimization feedback loop', async () => {
    const calculator = new ConfidenceCalculator();
    const initialWeights = { ...calculator.getWeights() };
    
    // Simulate feedback loop
    const feedbackData = [];
    
    for (let i = 0; i < 3; i++) {
        const data = generateMockAnalysisData();
        const result = await calculator.calculate(data);
        
        // Simulate actual confidence being higher
        feedbackData.push({
            predictedConfidence: result.overall,
            actualConfidence: Math.min(1, result.overall + 0.1),
            dimensions: result.dimensions
        });
    }
    
    calculator.optimizeWeights(feedbackData);
    const optimizedWeights = calculator.getWeights();
    
    assert(JSON.stringify(initialWeights) !== JSON.stringify(optimizedWeights), 
        'Weights should change after optimization');
});

// Edge Cases
runner.test('Edge Case: Very large content', async () => {
    const calculator = new ConfidenceCalculator();
    const largeContent = 'Lorem ipsum '.repeat(10000); // Very large content
    const data = generateMockAnalysisData({ content: largeContent });
    
    const result = await calculator.calculate(data);
    assert(result.overall !== undefined, 'Should handle large content');
});

runner.test('Edge Case: Missing embeddings', async () => {
    const calculator = new ConfidenceCalculator();
    const data = generateMockAnalysisData({ embeddings: null });
    
    const result = await calculator.calculate(data);
    assert(result.overall !== undefined, 'Should handle missing embeddings');
});

runner.test('Edge Case: Invalid dates', async () => {
    const calculator = new ConfidenceCalculator();
    const data = generateMockAnalysisData({ 
        createdAt: 'invalid-date',
        modifiedAt: null
    });
    
    const result = await calculator.calculate(data);
    assert(result.overall !== undefined, 'Should handle invalid dates');
});

runner.test('Edge Case: Extreme confidence values', () => {
    const predictor = new ConvergencePredictor();
    
    // Very high confidence
    const highPrediction = predictor.predict('test', 0.99, {}, []);
    assert(highPrediction.willConverge, 'Very high confidence should converge');
    
    // Very low confidence
    const lowPrediction = predictor.predict('test', 0.1, {}, []);
    assert(lowPrediction.estimatedIterations > 0, 'Should estimate iterations for low confidence');
});

// Run all tests
console.log('Starting ML Confidence Calculator tests...\n');
runner.run().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});