/**
 * Integration Tests for ML Confidence Workflow
 * 
 * Tests the integration between components across all waves to ensure
 * they work together correctly to achieve the 85% confidence target.
 */

import ConfidenceCalculator from '../../../wave1/calculator/ConfidenceCalculator.js';
import ConfidenceTracker from '../../../wave1/tracker/ConfidenceTracker.js';
import VersionedAppState from '../../../wave1/appstate/VersionedAppState.js';
import CurationPanel from '../../../wave2/ui/CurationPanel.js';
import OptimizedCalculator from '../../../wave3/optimization/OptimizedCalculator.js';
import { CoordinationEvents } from '../../../wave1/shared/interfaces.js';

export default class TestWaveIntegration {
    constructor() {
        this.type = 'integration';
        this.name = 'Wave Component Integration Tests';
        this.components = {};
    }
    
    async setup(helpers, mocks) {
        this.helpers = helpers;
        this.mocks = mocks;
        
        // Initialize all components
        this.components = {
            calculator: new ConfidenceCalculator(),
            tracker: new ConfidenceTracker(),
            appState: new VersionedAppState('integration-test'),
            optimizedCalculator: new OptimizedCalculator(),
            eventBus: this.mocks.getMock('EventBus')
        };
        
        // Setup event monitoring
        this.eventLog = [];
        this.components.eventBus.on.callsFake((event, handler) => {
            this.eventLog.push({ event, timestamp: Date.now() });
        });
    }
    
    async teardown() {
        // Cleanup components
        if (this.components.optimizedCalculator) {
            await this.components.optimizedCalculator.cleanup();
        }
        this.components = {};
        this.eventLog = [];
    }
    
    getTests() {
        return [
            // Wave 1 Integration Tests
            {
                name: 'Wave 1: Calculator -> Tracker -> AppState flow',
                fn: async (ctx) => {
                    const fileId = 'test-file-1';
                    const analysisData = this.helpers.generateMockAnalysisData({ fileId });
                    
                    // Start tracking
                    await this.components.tracker.startTracking(fileId, analysisData);
                    
                    // Calculate confidence
                    const metrics = await this.components.calculator.calculate(analysisData);
                    
                    ctx.assert(metrics.overall > 0, 'Should calculate confidence');
                    ctx.assert(metrics.convergencePrediction, 'Should predict convergence');
                    
                    // Update tracker
                    await this.components.tracker.updateMetrics(fileId, metrics);
                    
                    // Create version snapshot
                    const versionId = this.components.appState.createSnapshot({
                        fileId,
                        metrics,
                        analysisData
                    }, {
                        agent: 'calculator',
                        confidence: metrics.overall
                    });
                    
                    ctx.assert(versionId, 'Should create version snapshot');
                    
                    // Verify integration
                    const history = this.components.tracker.getConvergenceHistory(fileId);
                    ctx.assertEqual(history.length, 1);
                    ctx.assertEqual(history[0].overall, metrics.overall);
                    
                    const currentState = this.components.appState.getCurrentState();
                    ctx.assertEqual(currentState.metrics.overall, metrics.overall);
                }
            },
            
            {
                name: 'Wave 1: Iterative improvement tracking',
                fn: async (ctx) => {
                    const fileId = 'test-file-2';
                    const baseData = this.helpers.generateMockAnalysisData({ fileId });
                    
                    await this.components.tracker.startTracking(fileId, baseData);
                    
                    // Simulate iterative improvements
                    const iterations = 5;
                    let previousConfidence = 0;
                    
                    for (let i = 0; i < iterations; i++) {
                        // Update analysis data with history
                        const analysisData = {
                            ...baseData,
                            iterationCount: i,
                            previousConfidence,
                            iterationHistory: this.components.tracker.getConvergenceHistory(fileId)
                        };
                        
                        // Calculate with iteration context
                        const metrics = await this.components.calculator.calculate(analysisData);
                        
                        // Update tracking
                        await this.components.tracker.updateMetrics(fileId, metrics);
                        
                        // Create version
                        this.components.appState.createSnapshot({
                            iteration: i,
                            metrics,
                            improvement: metrics.overall - previousConfidence
                        });
                        
                        // Verify improvement
                        ctx.assert(
                            metrics.overall >= previousConfidence,
                            `Iteration ${i} should show improvement or stability`
                        );
                        
                        previousConfidence = metrics.overall;
                    }
                    
                    // Check convergence
                    const finalAnalysis = this.components.tracker.analyzeConvergence(fileId);
                    ctx.assert(finalAnalysis.trend === 'improving' || finalAnalysis.trend === 'stable');
                    ctx.assert(this.components.appState.versions.length === iterations);
                }
            },
            
            // Wave 1-2 Integration Tests
            {
                name: 'Wave 1-2: State versioning with UI updates',
                fn: async (ctx) => {
                    const fileId = 'test-file-3';
                    
                    // Create initial state
                    const initialState = {
                        fileId,
                        confidence: 0.65,
                        categories: ['technical'],
                        userCuration: {
                            approved: false,
                            notes: ''
                        }
                    };
                    
                    this.components.appState.createSnapshot(initialState);
                    
                    // Simulate UI curation
                    const curatedState = {
                        ...initialState,
                        userCuration: {
                            approved: true,
                            notes: 'Good technical content',
                            categories: ['technical', 'tutorial']
                        }
                    };
                    
                    const curationVersion = this.components.appState.createSnapshot(
                        curatedState,
                        { agent: 'user', action: 'curation' }
                    );
                    
                    // Calculate new confidence with curation
                    const metrics = await this.components.calculator.calculate({
                        ...this.helpers.generateMockAnalysisData({ fileId }),
                        categories: curatedState.userCuration.categories,
                        categoryConfidence: 0.95 // High confidence due to manual curation
                    });
                    
                    ctx.assert(metrics.overall > initialState.confidence,
                        'Manual curation should improve confidence');
                    
                    // Update state with new metrics
                    this.components.appState.createSnapshot({
                        ...curatedState,
                        confidence: metrics.overall,
                        metrics
                    }, { agent: 'calculator', afterCuration: true });
                    
                    // Verify version chain
                    const changes = this.components.appState.compareVersions(
                        this.components.appState.versions[0].versionId,
                        curationVersion
                    );
                    
                    ctx.assert(changes.modifications.length > 0, 'Should track curation changes');
                }
            },
            
            // Wave 1-3 Integration Tests
            {
                name: 'Wave 1-3: Standard vs Optimized calculator comparison',
                fn: async (ctx) => {
                    const testBatch = this.helpers.generateBatch(20);
                    
                    // Standard calculation
                    const standardStart = Date.now();
                    const standardResults = [];
                    
                    for (const item of testBatch) {
                        const result = await this.components.calculator.calculate(item);
                        standardResults.push(result);
                    }
                    
                    const standardTime = Date.now() - standardStart;
                    
                    // Optimized batch calculation
                    const optimizedStart = Date.now();
                    const optimizedResults = await this.components.optimizedCalculator.processBatch(testBatch);
                    const optimizedTime = Date.now() - optimizedStart;
                    
                    // Performance improvement
                    const improvement = ((standardTime - optimizedTime) / standardTime) * 100;
                    ctx.assert(improvement > 30, 'Optimized should be at least 30% faster');
                    
                    // Result accuracy
                    for (let i = 0; i < testBatch.length; i++) {
                        ctx.assertAlmostEqual(
                            standardResults[i].overall,
                            optimizedResults[i].overall,
                            0.05,
                            'Results should be consistent between implementations'
                        );
                    }
                }
            },
            
            // Wave 2-3 Integration Tests
            {
                name: 'Wave 2-3: Batch curation with optimization',
                fn: async (ctx) => {
                    const files = this.helpers.generateBatch(10);
                    
                    // Process batch with optimization
                    const results = await this.components.optimizedCalculator.processBatch(files);
                    
                    // Track all results
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const result = results[i];
                        
                        await this.components.tracker.startTracking(file.fileId, file);
                        await this.components.tracker.updateMetrics(file.fileId, result);
                    }
                    
                    // Simulate bulk curation decisions
                    const curationDecisions = files.map((file, index) => ({
                        fileId: file.fileId,
                        approved: results[index].overall > 0.7,
                        categories: results[index].overall > 0.8 ? 
                            ['high-quality', ...file.categories] : file.categories
                    }));
                    
                    // Apply curation and recalculate
                    const curatedFiles = files.map((file, index) => ({
                        ...file,
                        ...curationDecisions[index],
                        categoryConfidence: curationDecisions[index].approved ? 0.95 : 0.5
                    }));
                    
                    const curatedResults = await this.components.optimizedCalculator.processBatch(curatedFiles);
                    
                    // Verify improvements for approved files
                    for (let i = 0; i < files.length; i++) {
                        if (curationDecisions[i].approved) {
                            ctx.assert(
                                curatedResults[i].overall > results[i].overall,
                                'Approved files should show confidence improvement'
                            );
                        }
                    }
                }
            },
            
            // Full Stack Integration Tests
            {
                name: 'Full Stack: Complete workflow integration',
                fn: async (ctx) => {
                    const fileId = 'full-stack-test';
                    const analysisData = this.helpers.generateMockAnalysisData({ 
                        fileId,
                        content: this.helpers.generateContent(2000, {
                            includeTitle: true,
                            includeSections: true,
                            includeCode: true
                        })
                    });
                    
                    // Phase 1: Initial analysis
                    await this.components.tracker.startTracking(fileId, analysisData);
                    let currentData = analysisData;
                    
                    // Iterative improvement loop
                    for (let iteration = 0; iteration < 5; iteration++) {
                        // Update data with history
                        currentData = {
                            ...currentData,
                            iterationCount: iteration,
                            iterationHistory: this.components.tracker.getConvergenceHistory(fileId)
                        };
                        
                        // Calculate confidence
                        const metrics = await this.components.calculator.calculate(currentData);
                        
                        // Update tracking
                        await this.components.tracker.updateMetrics(fileId, metrics);
                        
                        // Version snapshot
                        this.components.appState.createSnapshot({
                            iteration,
                            metrics,
                            data: currentData
                        }, {
                            agent: 'system',
                            iteration
                        });
                        
                        // Check if needs re-analysis
                        if (this.components.tracker.needsReanalysis(fileId)) {
                            ctx.assert(iteration < 3, 'Should not need re-analysis after convergence');
                        }
                        
                        // Update previous confidence
                        currentData.previousConfidence = metrics.overall;
                    }
                    
                    // Verify final state
                    const finalMetrics = this.components.tracker.getConvergenceHistory(fileId).slice(-1)[0];
                    const convergenceAnalysis = this.components.tracker.analyzeConvergence(fileId);
                    
                    ctx.assert(finalMetrics.overall > analysisData.previousConfidence || 0.5);
                    ctx.assert(convergenceAnalysis.isConverging || convergenceAnalysis.hasConverged);
                    ctx.assertEqual(this.components.appState.versions.length, 5);
                }
            },
            
            // Event Flow Integration Tests
            {
                name: 'Event flow between components',
                fn: async (ctx) => {
                    // Reset event tracking
                    this.eventLog = [];
                    const events = [];
                    
                    // Setup event capture
                    this.components.eventBus.emit.callsFake((event, data) => {
                        events.push({ event, data, timestamp: Date.now() });
                    });
                    
                    const fileId = 'event-test';
                    const data = this.helpers.generateMockAnalysisData({ fileId });
                    
                    // Execute workflow
                    await this.components.tracker.startTracking(fileId, data);
                    const metrics = await this.components.calculator.calculate(data);
                    await this.components.tracker.updateMetrics(fileId, metrics);
                    this.components.appState.createSnapshot({ fileId, metrics });
                    
                    // Verify event sequence
                    const eventTypes = events.map(e => e.event);
                    
                    ctx.assert(eventTypes.includes('tracking:started'), 'Should emit tracking start');
                    ctx.assert(eventTypes.includes('confidence:calculated'), 'Should emit calculation');
                    ctx.assert(eventTypes.includes('tracking:updated'), 'Should emit tracking update');
                    ctx.assert(eventTypes.includes('version:created'), 'Should emit version creation');
                }
            },
            
            // Error Propagation Tests
            {
                name: 'Error handling across components',
                fn: async (ctx) => {
                    // Test invalid data propagation
                    const invalidData = { fileId: 'invalid', content: null };
                    
                    try {
                        // Should handle gracefully through the stack
                        await this.components.tracker.startTracking('invalid', invalidData);
                        const metrics = await this.components.calculator.calculate(invalidData);
                        
                        // Should still produce valid output
                        ctx.assertInRange(metrics.overall, 0, 1);
                        ctx.assert(metrics.overall < 0.5, 'Invalid data should yield low confidence');
                        
                    } catch (error) {
                        // If error is thrown, it should be meaningful
                        ctx.assert(error.message.includes('Invalid'), 'Error should be descriptive');
                    }
                }
            },
            
            // Performance Integration Tests
            {
                name: 'Integrated performance with caching',
                fn: async (ctx) => {
                    const fileId = 'perf-test';
                    const data = this.helpers.generateMockAnalysisData({ fileId });
                    
                    // Warm up cache
                    await this.components.optimizedCalculator.warmCache([data]);
                    
                    // First calculation (may hit cache)
                    const start1 = Date.now();
                    const result1 = await this.components.optimizedCalculator.calculate(data);
                    const time1 = Date.now() - start1;
                    
                    // Second calculation (should hit cache)
                    const start2 = Date.now();
                    const result2 = await this.components.optimizedCalculator.calculate(data);
                    const time2 = Date.now() - start2;
                    
                    ctx.assert(time2 < time1 * 0.5, 'Cached calculation should be much faster');
                    ctx.assertDeepEqual(result1, result2, 'Results should be identical');
                    
                    // Verify cache stats
                    const stats = this.components.optimizedCalculator.getPerformanceStats();
                    ctx.assert(parseFloat(stats.optimization.cacheHitRate) > 0, 'Should have cache hits');
                }
            },
            
            // Convergence Achievement Tests
            {
                name: 'Achieve 85% confidence target through iteration',
                fn: async (ctx) => {
                    const fileId = 'convergence-test';
                    
                    // Start with good quality content
                    const highQualityData = this.helpers.generateMockAnalysisData({
                        fileId,
                        content: this.helpers.generateContent(3000, {
                            includeTitle: true,
                            includeSections: true,
                            includeLists: true,
                            includeCode: true
                        }),
                        categories: ['technical', 'tutorial', 'complete'],
                        categoryConfidence: 0.9,
                        metadata: {
                            importance: 'high',
                            quality: 'excellent'
                        }
                    });
                    
                    await this.components.tracker.startTracking(fileId, highQualityData);
                    
                    let achieved85 = false;
                    let iterations = 0;
                    const maxIterations = 10;
                    
                    while (!achieved85 && iterations < maxIterations) {
                        // Update with iteration context
                        const currentData = {
                            ...highQualityData,
                            iterationCount: iterations,
                            iterationHistory: this.components.tracker.getConvergenceHistory(fileId),
                            previousConfidence: iterations > 0 ? 
                                this.components.tracker.getConvergenceHistory(fileId).slice(-1)[0].overall : 0
                        };
                        
                        // Calculate with optimization
                        const metrics = await this.components.optimizedCalculator.calculate(currentData);
                        
                        // Update tracking
                        await this.components.tracker.updateMetrics(fileId, metrics);
                        
                        // Check if target achieved
                        if (metrics.overall >= 0.85) {
                            achieved85 = true;
                        }
                        
                        iterations++;
                        
                        // Apply weight optimization if not converging fast enough
                        if (iterations === 5 && metrics.overall < 0.8) {
                            const history = this.components.tracker.getConvergenceHistory(fileId);
                            const feedbackData = history.map((h, i) => ({
                                predictedConfidence: h.overall,
                                actualConfidence: Math.min(1, h.overall + 0.05), // Simulate higher actual
                                dimensions: h.dimensions
                            }));
                            
                            this.components.calculator.optimizeWeights(feedbackData);
                        }
                    }
                    
                    ctx.assert(achieved85, 'Should achieve 85% confidence target');
                    ctx.assert(iterations <= 8, 'Should converge within 8 iterations');
                    
                    const finalAnalysis = this.components.tracker.analyzeConvergence(fileId);
                    ctx.assert(finalAnalysis.hasConverged, 'Should detect convergence');
                }
            }
        ];
    }
}

// Export for test framework
export { TestWaveIntegration };