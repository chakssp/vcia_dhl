/**
 * Unit Tests for ConfidenceTracker
 * 
 * Tests for the confidence tracking and convergence history management system.
 */

import ConfidenceTracker from '../../../wave1/tracker/ConfidenceTracker.js';
import ConvergenceAnalyzer from '../../../wave1/tracker/ConvergenceAnalyzer.js';
import TrackingStorage from '../../../wave1/tracker/TrackingStorage.js';

export default class TestConfidenceTracker {
    constructor() {
        this.type = 'unit';
        this.name = 'ConfidenceTracker Unit Tests';
        this.tracker = null;
        this.storage = null;
    }
    
    async setup(helpers, mocks) {
        this.helpers = helpers;
        this.mocks = mocks;
        
        // Mock storage for isolated testing
        this.storage = new TrackingStorage({
            storageType: 'memory',
            autoSave: false
        });
        
        this.tracker = new ConfidenceTracker({
            storage: this.storage,
            maxHistorySize: 50,
            enableAutoAnalysis: true
        });
    }
    
    async teardown() {
        await this.storage.clear();
        this.tracker = null;
        this.storage = null;
    }
    
    getTests() {
        return [
            // Initialization Tests
            {
                name: 'should initialize with default configuration',
                fn: async (ctx) => {
                    const tracker = new ConfidenceTracker();
                    
                    ctx.assert(tracker.trackedFiles instanceof Map, 'Should initialize trackedFiles Map');
                    ctx.assertEqual(tracker.config.maxHistorySize, 100, 'Default max history should be 100');
                    ctx.assert(tracker.config.enableAutoAnalysis, 'Auto analysis should be enabled by default');
                    ctx.assert(tracker.analyzer instanceof ConvergenceAnalyzer, 'Should initialize analyzer');
                }
            },
            
            // Basic Tracking Tests
            {
                name: 'should start tracking a new file',
                fn: async (ctx) => {
                    const fileId = 'test-file-1';
                    const initialData = {
                        content: 'Test content',
                        categories: ['test'],
                        metadata: { author: 'test' }
                    };
                    
                    await this.tracker.startTracking(fileId, initialData);
                    
                    ctx.assert(this.tracker.isTracking(fileId), 'Should be tracking the file');
                    
                    const trackingData = this.tracker.getTrackingData(fileId);
                    ctx.assertEqual(trackingData.fileId, fileId);
                    ctx.assertEqual(trackingData.initialData, initialData);
                    ctx.assert(Array.isArray(trackingData.history), 'Should have history array');
                    ctx.assertEqual(trackingData.history.length, 0, 'History should be empty initially');
                }
            },
            
            {
                name: 'should update metrics for tracked file',
                fn: async (ctx) => {
                    const fileId = 'test-file-2';
                    await this.tracker.startTracking(fileId, {});
                    
                    const metrics = {
                        overall: 0.75,
                        dimensions: {
                            semantic: 0.8,
                            categorical: 0.7,
                            structural: 0.75,
                            temporal: 0.7
                        },
                        convergencePrediction: {
                            willConverge: true,
                            estimatedIterations: 3,
                            confidence: 0.85
                        },
                        calculatedAt: new Date()
                    };
                    
                    await this.tracker.updateMetrics(fileId, metrics);
                    
                    const history = this.tracker.getConvergenceHistory(fileId);
                    ctx.assertEqual(history.length, 1, 'Should have one history entry');
                    ctx.assertEqual(history[0].overall, metrics.overall);
                    ctx.assertDeepEqual(history[0].dimensions, metrics.dimensions);
                }
            },
            
            // History Management Tests
            {
                name: 'should maintain history within max size limit',
                fn: async (ctx) => {
                    const fileId = 'test-file-3';
                    const maxSize = 5;
                    
                    const tracker = new ConfidenceTracker({
                        storage: this.storage,
                        maxHistorySize: maxSize
                    });
                    
                    await tracker.startTracking(fileId, {});
                    
                    // Add more entries than max
                    for (let i = 0; i < maxSize + 3; i++) {
                        await tracker.updateMetrics(fileId, {
                            overall: 0.5 + (i * 0.05),
                            dimensions: {},
                            calculatedAt: new Date()
                        });
                    }
                    
                    const history = tracker.getConvergenceHistory(fileId);
                    ctx.assertEqual(history.length, maxSize, `History should be limited to ${maxSize} entries`);
                    
                    // Should keep most recent entries
                    ctx.assert(history[0].overall > 0.6, 'Should keep most recent entries');
                }
            },
            
            // Convergence Analysis Tests
            {
                name: 'should detect convergence in improving trend',
                fn: async (ctx) => {
                    const fileId = 'test-file-4';
                    await this.tracker.startTracking(fileId, {});
                    
                    // Simulate improving confidence
                    const improvements = [0.4, 0.55, 0.65, 0.72, 0.78, 0.82, 0.84, 0.845, 0.848];
                    
                    for (const confidence of improvements) {
                        await this.tracker.updateMetrics(fileId, {
                            overall: confidence,
                            dimensions: {},
                            calculatedAt: new Date()
                        });
                    }
                    
                    const analysis = this.tracker.analyzeConvergence(fileId);
                    
                    ctx.assert(analysis, 'Should return analysis');
                    ctx.assert(analysis.isConverging, 'Should detect convergence');
                    ctx.assert(analysis.plateauDetected, 'Should detect plateau at end');
                    ctx.assert(analysis.trend === 'improving', 'Should detect improving trend');
                }
            },
            
            {
                name: 'should detect non-convergence in oscillating pattern',
                fn: async (ctx) => {
                    const fileId = 'test-file-5';
                    await this.tracker.startTracking(fileId, {});
                    
                    // Simulate oscillating confidence
                    const oscillations = [0.5, 0.7, 0.4, 0.8, 0.3, 0.75, 0.45, 0.8];
                    
                    for (const confidence of oscillations) {
                        await this.tracker.updateMetrics(fileId, {
                            overall: confidence,
                            dimensions: {},
                            calculatedAt: new Date()
                        });
                    }
                    
                    const analysis = this.tracker.analyzeConvergence(fileId);
                    
                    ctx.assert(!analysis.isConverging, 'Should not detect convergence');
                    ctx.assert(analysis.trend === 'unstable' || analysis.trend === 'oscillating', 
                        'Should detect unstable/oscillating trend');
                }
            },
            
            // Re-analysis Detection Tests
            {
                name: 'should recommend re-analysis for stagnant files',
                fn: async (ctx) => {
                    const fileId = 'test-file-6';
                    await this.tracker.startTracking(fileId, {});
                    
                    // Add stagnant history
                    for (let i = 0; i < 5; i++) {
                        await this.tracker.updateMetrics(fileId, {
                            overall: 0.6, // Same confidence
                            dimensions: {},
                            calculatedAt: new Date()
                        });
                    }
                    
                    const needsReanalysis = this.tracker.needsReanalysis(fileId);
                    
                    ctx.assert(needsReanalysis, 'Should recommend re-analysis for stagnant confidence');
                }
            },
            
            {
                name: 'should not recommend re-analysis for converged files',
                fn: async (ctx) => {
                    const fileId = 'test-file-7';
                    await this.tracker.startTracking(fileId, {});
                    
                    // Add converged history (high confidence, minimal changes)
                    const converged = [0.84, 0.85, 0.855, 0.858, 0.86];
                    
                    for (const confidence of converged) {
                        await this.tracker.updateMetrics(fileId, {
                            overall: confidence,
                            dimensions: {},
                            calculatedAt: new Date()
                        });
                    }
                    
                    const needsReanalysis = this.tracker.needsReanalysis(fileId);
                    
                    ctx.assert(!needsReanalysis, 'Should not recommend re-analysis for converged files');
                }
            },
            
            // Summary Statistics Tests
            {
                name: 'should generate accurate summary statistics',
                fn: async (ctx) => {
                    const fileId = 'test-file-8';
                    await this.tracker.startTracking(fileId, {});
                    
                    const metrics = [
                        { overall: 0.5, dimensions: { semantic: 0.6, categorical: 0.4 } },
                        { overall: 0.6, dimensions: { semantic: 0.7, categorical: 0.5 } },
                        { overall: 0.7, dimensions: { semantic: 0.8, categorical: 0.6 } },
                        { overall: 0.75, dimensions: { semantic: 0.85, categorical: 0.65 } }
                    ];
                    
                    for (const metric of metrics) {
                        await this.tracker.updateMetrics(fileId, {
                            ...metric,
                            calculatedAt: new Date()
                        });
                    }
                    
                    const summary = this.tracker.getSummary(fileId);
                    
                    ctx.assertEqual(summary.totalIterations, 4);
                    ctx.assertEqual(summary.currentConfidence, 0.75);
                    ctx.assertEqual(summary.initialConfidence, 0.5);
                    ctx.assertAlmostEqual(summary.totalImprovement, 0.25, 0.001);
                    ctx.assert(summary.averageImprovement > 0);
                    ctx.assert(summary.convergenceAnalysis);
                }
            },
            
            // Batch Operations Tests
            {
                name: 'should handle batch updates efficiently',
                fn: async (ctx) => {
                    const fileIds = ['batch-1', 'batch-2', 'batch-3'];
                    
                    // Start tracking multiple files
                    for (const fileId of fileIds) {
                        await this.tracker.startTracking(fileId, {});
                    }
                    
                    // Batch update
                    const updates = fileIds.map((fileId, index) => ({
                        fileId,
                        metrics: {
                            overall: 0.5 + (index * 0.1),
                            dimensions: {},
                            calculatedAt: new Date()
                        }
                    }));
                    
                    await this.tracker.batchUpdate(updates);
                    
                    // Verify all updates
                    for (let i = 0; i < fileIds.length; i++) {
                        const history = this.tracker.getConvergenceHistory(fileIds[i]);
                        ctx.assertEqual(history.length, 1);
                        ctx.assertEqual(history[0].overall, 0.5 + (i * 0.1));
                    }
                }
            },
            
            // Storage Integration Tests
            {
                name: 'should persist tracking data to storage',
                fn: async (ctx) => {
                    const fileId = 'test-persist-1';
                    await this.tracker.startTracking(fileId, { test: true });
                    
                    await this.tracker.updateMetrics(fileId, {
                        overall: 0.75,
                        dimensions: {},
                        calculatedAt: new Date()
                    });
                    
                    // Force save
                    await this.tracker.save();
                    
                    // Create new tracker with same storage
                    const newTracker = new ConfidenceTracker({
                        storage: this.storage
                    });
                    
                    await newTracker.load();
                    
                    ctx.assert(newTracker.isTracking(fileId), 'Should restore tracking state');
                    const history = newTracker.getConvergenceHistory(fileId);
                    ctx.assertEqual(history.length, 1);
                    ctx.assertEqual(history[0].overall, 0.75);
                }
            },
            
            // Error Handling Tests
            {
                name: 'should handle updates for untracked files',
                fn: async (ctx) => {
                    const fileId = 'untracked-file';
                    
                    await ctx.assertThrows(
                        async () => await this.tracker.updateMetrics(fileId, {}),
                        'not being tracked',
                        'Should throw error for untracked file'
                    );
                }
            },
            
            {
                name: 'should handle invalid metrics gracefully',
                fn: async (ctx) => {
                    const fileId = 'test-invalid';
                    await this.tracker.startTracking(fileId, {});
                    
                    // Invalid metrics
                    const invalidMetrics = {
                        overall: 'not-a-number',
                        dimensions: null
                    };
                    
                    await ctx.assertThrows(
                        async () => await this.tracker.updateMetrics(fileId, invalidMetrics),
                        'Invalid metrics',
                        'Should validate metrics structure'
                    );
                }
            },
            
            // Performance Tests
            {
                name: 'should handle tracking many files efficiently',
                fn: async (ctx) => {
                    const fileCount = 100;
                    const startTime = Date.now();
                    
                    // Start tracking many files
                    for (let i = 0; i < fileCount; i++) {
                        await this.tracker.startTracking(`perf-file-${i}`, {});
                    }
                    
                    const trackingTime = Date.now() - startTime;
                    
                    ctx.assert(this.tracker.getTrackedFiles().length === fileCount);
                    ctx.assert(trackingTime < 1000, 
                        `Should track ${fileCount} files in less than 1 second`);
                }
            },
            
            // Convergence Analyzer Integration
            {
                name: 'should integrate with convergence analyzer',
                fn: async (ctx) => {
                    const analyzer = new ConvergenceAnalyzer();
                    const history = [
                        { overall: 0.5, timestamp: new Date(Date.now() - 5000) },
                        { overall: 0.65, timestamp: new Date(Date.now() - 4000) },
                        { overall: 0.75, timestamp: new Date(Date.now() - 3000) },
                        { overall: 0.82, timestamp: new Date(Date.now() - 2000) },
                        { overall: 0.85, timestamp: new Date(Date.now() - 1000) }
                    ];
                    
                    const analysis = analyzer.analyze(history);
                    
                    ctx.assert(analysis.isConverging, 'Should detect convergence');
                    ctx.assertEqual(analysis.trend, 'improving');
                    ctx.assert(analysis.confidenceLevel > 0.8);
                    ctx.assert(analysis.improvementRate > 0);
                    ctx.assert(analysis.estimatedConvergencePoint > 0.85);
                }
            },
            
            // Cleanup Tests
            {
                name: 'should clean up tracking data properly',
                fn: async (ctx) => {
                    const fileId = 'test-cleanup';
                    await this.tracker.startTracking(fileId, {});
                    
                    await this.tracker.updateMetrics(fileId, {
                        overall: 0.75,
                        dimensions: {},
                        calculatedAt: new Date()
                    });
                    
                    ctx.assert(this.tracker.isTracking(fileId));
                    
                    await this.tracker.stopTracking(fileId);
                    
                    ctx.assert(!this.tracker.isTracking(fileId));
                    ctx.assertEqual(this.tracker.getConvergenceHistory(fileId), null);
                }
            }
        ];
    }
}

// Export for test framework
export { TestConfidenceTracker };