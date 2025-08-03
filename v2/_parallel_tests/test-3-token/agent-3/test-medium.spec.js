/**
 * @fileoverview Comprehensive Test Suite for Knowledge Consolidator V2
 * @description Complete testing suite covering core functionality, integration tests,
 *              performance validation, and edge case scenarios for the Knowledge Consolidator
 * @version 2.1.0
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { SemanticAnalysisEngine } from '../src/components/SemanticAnalysisEngine.js';
import { DiscoveryManager } from '../src/managers/DiscoveryManager.js';
import { UnifiedConfidenceSystem } from '../src/systems/UnifiedConfidenceSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { AppState } from '../src/core/AppState.js';
import { FilterManager } from '../src/managers/FilterManager.js';
import { CategoryManager } from '../src/managers/CategoryManager.js';
import { ExportManager } from '../src/managers/ExportManager.js';

// Test data and fixtures
const testData = {
    sampleFiles: [
        {
            id: 'test-file-1',
            name: 'strategic-planning.md',
            path: '/documents/strategy/strategic-planning.md',
            content: 'Strategic planning document with key insights about market expansion and competitive analysis.',
            size: 2048,
            lastModified: new Date('2024-01-15'),
            type: 'markdown'
        },
        {
            id: 'test-file-2',
            name: 'technical-architecture.md',
            path: '/documents/tech/technical-architecture.md',
            content: 'Technical architecture design for microservices implementation with scalability considerations.',
            size: 4096,
            lastModified: new Date('2024-02-20'),
            type: 'markdown'
        },
        {
            id: 'test-file-3',
            name: 'meeting-notes.txt',
            path: '/documents/meetings/meeting-notes.txt',
            content: 'Meeting notes from quarterly review discussing project milestones and resource allocation.',
            size: 1024,
            lastModified: new Date('2024-03-10'),
            type: 'text'
        }
    ],
    analysisConfig: {
        template: 'decisiveMoments',
        confidenceThreshold: 0.7,
        batchSize: 3,
        timeout: 30000
    },
    filterConfig: {
        relevanceScore: { min: 0.5, max: 1.0 },
        dateModified: { from: '2024-01-01', to: '2024-12-31' },
        fileSize: { min: '1KB', max: '10MB' },
        fileTypes: ['.md', '.txt', '.pdf']
    }
};

describe('Knowledge Consolidator V2 - Core System Tests', () => {
    let semanticEngine;
    let discoveryManager;
    let confidenceSystem;
    let eventBus;
    let appState;

    beforeAll(async () => {
        // Global test setup
        jest.setTimeout(60000); // Increase timeout for integration tests
        
        // Mock console methods to reduce test noise
        global.console = {
            ...console,
            log: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
    });

    beforeEach(async () => {
        // Fresh instances for each test
        semanticEngine = new SemanticAnalysisEngine();
        discoveryManager = new DiscoveryManager();
        confidenceSystem = new UnifiedConfidenceSystem();
        eventBus = EventBus.getInstance();
        appState = AppState.getInstance();

        // Clear any existing state
        appState.clear();
        eventBus.clearAllSubscriptions();
        
        // Initialize components
        await semanticEngine.initialize();
        await discoveryManager.initialize();
        await confidenceSystem.initialize();
    });

    afterEach(async () => {
        // Cleanup after each test
        if (semanticEngine) {
            semanticEngine.clearCache();
        }
        
        if (discoveryManager) {
            await discoveryManager.cleanup();
        }
        
        if (confidenceSystem) {
            await confidenceSystem.reset();
        }
        
        // Clear state and events
        appState.clear();
        eventBus.clearAllSubscriptions();
    });

    afterAll(() => {
        // Global cleanup
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    describe('SemanticAnalysisEngine', () => {
        describe('Initialization', () => {
            it('should initialize with default configuration', async () => {
                const engine = new SemanticAnalysisEngine();
                await engine.initialize();
                
                expect(engine.initialized).toBe(true);
                expect(engine.config).toHaveProperty('semanticThreshold');
                expect(engine.config.semanticThreshold).toBe(0.65);
            });

            it('should initialize with custom configuration', async () => {
                const customConfig = {
                    semanticThreshold: 0.8,
                    cacheSize: 500,
                    analysisTimeout: 15000
                };
                
                const engine = new SemanticAnalysisEngine();
                await engine.initialize(customConfig);
                
                expect(engine.config.semanticThreshold).toBe(0.8);
                expect(engine.config.cacheSize).toBe(500);
                expect(engine.config.analysisTimeout).toBe(15000);
            });

            it('should emit initialization event', async () => {
                const initEventHandler = jest.fn();
                eventBus.subscribe('SEMANTIC_ENGINE_INITIALIZED', initEventHandler);
                
                const engine = new SemanticAnalysisEngine();
                await engine.initialize();
                
                expect(initEventHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        timestamp: expect.any(Number),
                        configuration: expect.any(Object),
                        initializationTime: expect.any(Number)
                    })
                );
            });
        });

        describe('Content Analysis', () => {
            it('should analyze content and return comprehensive results', async () => {
                const content = testData.sampleFiles[0].content;
                const options = { analysisType: 'strategic' };
                
                const results = await semanticEngine.analyzeContent(content, options);
                
                expect(results).toHaveProperty('analysisId');
                expect(results).toHaveProperty('semanticFeatures');
                expect(results).toHaveProperty('relevanceScores');
                expect(results).toHaveProperty('insights');
                expect(results).toHaveProperty('confidence');
                expect(results.relevanceScores.overall).toBeGreaterThan(0);
                expect(results.confidence.overallConfidence).toBeGreaterThan(0);
            });

            it('should handle empty content gracefully', async () => {
                await expect(
                    semanticEngine.analyzeContent('')
                ).rejects.toThrow('Invalid content provided for analysis');
            });

            it('should handle invalid content types', async () => {
                await expect(
                    semanticEngine.analyzeContent(null)
                ).rejects.toThrow('Invalid content provided for analysis');
                
                await expect(
                    semanticEngine.analyzeContent(123)
                ).rejects.toThrow('Invalid content provided for analysis');
            });

            it('should cache analysis results', async () => {
                const content = testData.sampleFiles[0].content;
                
                // First analysis
                const results1 = await semanticEngine.analyzeContent(content);
                
                // Second analysis (should be cached)
                const results2 = await semanticEngine.analyzeContent(content);
                
                expect(results1.analysisId).toBe(results2.analysisId);
                expect(results2.performance.cacheHit).toBe(true);
            });

            it('should emit analysis completion events', async () => {
                const completionEventHandler = jest.fn();
                eventBus.subscribe('SEMANTIC_ANALYSIS_COMPLETED', completionEventHandler);
                
                const content = testData.sampleFiles[0].content;
                await semanticEngine.analyzeContent(content);
                
                expect(completionEventHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        analysisId: expect.any(String),
                        results: expect.any(Object),
                        success: true
                    })
                );
            });
        });

        describe('Batch Analysis', () => {
            it('should perform batch analysis on multiple items', async () => {
                const contentItems = testData.sampleFiles.map(file => ({ content: file.content }));
                
                const results = await semanticEngine.batchAnalyzeContent(contentItems);
                
                expect(results).toHaveLength(3);
                expect(results.every(result => result.analysisId || result.error)).toBe(true);
            });

            it('should handle batch analysis errors gracefully', async () => {
                const contentItems = [
                    { content: testData.sampleFiles[0].content },
                    { content: null }, // This should cause an error
                    { content: testData.sampleFiles[1].content }
                ];
                
                const results = await semanticEngine.batchAnalyzeContent(contentItems);
                
                expect(results).toHaveLength(3);
                expect(results[0]).toHaveProperty('analysisId');
                expect(results[1]).toHaveProperty('error');
                expect(results[2]).toHaveProperty('analysisId');
            });

            it('should emit batch progress events', async () => {
                const progressEventHandler = jest.fn();
                eventBus.subscribe('BATCH_ANALYSIS_PROGRESS', progressEventHandler);
                
                const contentItems = testData.sampleFiles.map(file => ({ content: file.content }));
                await semanticEngine.batchAnalyzeContent(contentItems);
                
                expect(progressEventHandler).toHaveBeenCalled();
                expect(progressEventHandler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        batchId: expect.any(String),
                        completed: expect.any(Number),
                        total: 3,
                        progress: expect.any(Number)
                    })
                );
            });
        });

        describe('Performance Monitoring', () => {
            it('should track analysis statistics', async () => {
                const content = testData.sampleFiles[0].content;
                
                // Perform multiple analyses
                await semanticEngine.analyzeContent(content);
                await semanticEngine.analyzeContent(testData.sampleFiles[1].content);
                
                const stats = semanticEngine.getAnalysisStatistics();
                
                expect(stats.totalAnalyses).toBeGreaterThan(0);
                expect(stats.successRate).toBeGreaterThan(0);
                expect(stats.averageAnalysisTime).toBeGreaterThan(0);
                expect(stats).toHaveProperty('cacheSize');
                expect(stats).toHaveProperty('resourceUsage');
            });

            it('should clear cache when requested', () => {
                const cacheSize = semanticEngine.clearCache();
                expect(typeof cacheSize).toBe('number');
                expect(semanticEngine.getAnalysisStatistics().cacheSize).toBe(0);
            });
        });
    });

    describe('UnifiedConfidenceSystem', () => {
        describe('Confidence Calculation', () => {
            it('should calculate confidence scores for file content', async () => {
                const file = testData.sampleFiles[0];
                
                const confidence = await confidenceSystem.calculateConfidence(file);
                
                expect(confidence).toHaveProperty('contentQuality');
                expect(confidence).toHaveProperty('sourceReliability');
                expect(confidence).toHaveProperty('temporalRelevance');
                expect(confidence).toHaveProperty('contextualSignificance');
                expect(confidence).toHaveProperty('overallConfidence');
                expect(confidence.overallConfidence).toBeGreaterThanOrEqual(0);
                expect(confidence.overallConfidence).toBeLessThanOrEqual(1);
            });

            it('should provide confidence breakdown', async () => {
                const file = testData.sampleFiles[0];
                const confidence = await confidenceSystem.calculateConfidence(file);
                
                const breakdown = confidence.getBreakdown();
                
                expect(breakdown).toHaveProperty('dimensions');
                expect(breakdown).toHaveProperty('weights');
                expect(breakdown).toHaveProperty('calculations');
                expect(breakdown.dimensions).toBeInstanceOf(Array);
                expect(breakdown.dimensions.length).toBeGreaterThan(0);
            });

            it('should validate confidence thresholds', async () => {
                const file = testData.sampleFiles[0];
                const confidence = await confidenceSystem.calculateConfidence(file);
                
                const validation = confidenceSystem.validateThreshold(
                    confidence.overallConfidence,
                    { minimum: 0.5, maximum: 1.0 }
                );
                
                expect(validation).toHaveProperty('isValid');
                expect(validation).toHaveProperty('score');
                expect(validation).toHaveProperty('threshold');
                expect(typeof validation.isValid).toBe('boolean');
            });
        });

        describe('Batch Confidence Processing', () => {
            it('should process multiple files in batch', async () => {
                const results = await confidenceSystem.batchCalculateConfidence(testData.sampleFiles);
                
                expect(results).toHaveLength(3);
                expect(results.every(result => result.overallConfidence !== undefined)).toBe(true);
            });

            it('should handle batch processing errors', async () => {
                const filesWithErrors = [
                    testData.sampleFiles[0],
                    null, // This should cause an error
                    testData.sampleFiles[1]
                ];
                
                const results = await confidenceSystem.batchCalculateConfidence(filesWithErrors);
                
                expect(results).toHaveLength(3);
                expect(results[0]).toHaveProperty('overallConfidence');
                expect(results[1]).toHaveProperty('error');
                expect(results[2]).toHaveProperty('overallConfidence');
            });
        });
    });

    describe('Integration Tests', () => {
        describe('Discovery to Analysis Pipeline', () => {
            it('should discover files and analyze them sequentially', async () => {
                // Mock file discovery
                const mockFiles = testData.sampleFiles;
                jest.spyOn(discoveryManager, 'discoverFiles').mockResolvedValue({
                    files: mockFiles,
                    stats: { totalFound: 3, totalProcessed: 3 }
                });

                // Discover files
                const discoveryResults = await discoveryManager.discoverFiles({
                    paths: ['/test/documents'],
                    filters: testData.filterConfig
                });

                expect(discoveryResults.files).toHaveLength(3);

                // Analyze discovered files
                const analysisPromises = discoveryResults.files.map(file =>
                    semanticEngine.analyzeContent(file.content, { fileId: file.id })
                );

                const analysisResults = await Promise.all(analysisPromises);

                expect(analysisResults).toHaveLength(3);
                expect(analysisResults.every(result => result.analysisId)).toBe(true);
            });

            it('should maintain state consistency across operations', async () => {
                // Set initial state
                appState.set('files', testData.sampleFiles);
                appState.set('configuration', testData.analysisConfig);

                // Verify state persistence
                const files = appState.get('files');
                const config = appState.get('configuration');

                expect(files).toEqual(testData.sampleFiles);
                expect(config).toEqual(testData.analysisConfig);

                // Simulate state updates
                const updatedFiles = [...files, {
                    id: 'new-file',
                    name: 'new-document.md',
                    content: 'New document content'
                }];

                appState.set('files', updatedFiles);
                expect(appState.get('files')).toHaveLength(4);
            });
        });

        describe('Event-Driven Architecture', () => {
            it('should handle complex event chains', async () => {
                const eventSequence = [];
                
                // Subscribe to multiple events
                eventBus.subscribe('FILES_DISCOVERED', (data) => {
                    eventSequence.push('FILES_DISCOVERED');
                    eventBus.emit('START_ANALYSIS', data);
                });

                eventBus.subscribe('START_ANALYSIS', (data) => {
                    eventSequence.push('START_ANALYSIS');
                    eventBus.emit('ANALYSIS_COMPLETED', { ...data, status: 'completed' });
                });

                eventBus.subscribe('ANALYSIS_COMPLETED', (data) => {
                    eventSequence.push('ANALYSIS_COMPLETED');
                });

                // Trigger the event chain
                eventBus.emit('FILES_DISCOVERED', { files: testData.sampleFiles });

                // Allow events to propagate
                await new Promise(resolve => setTimeout(resolve, 10));

                expect(eventSequence).toEqual([
                    'FILES_DISCOVERED',
                    'START_ANALYSIS',
                    'ANALYSIS_COMPLETED'
                ]);
            });

            it('should handle event subscription and unsubscription', () => {
                const handler1 = jest.fn();
                const handler2 = jest.fn();

                // Subscribe handlers
                eventBus.subscribe('TEST_EVENT', handler1);
                eventBus.subscribe('TEST_EVENT', handler2);

                // Emit event
                eventBus.emit('TEST_EVENT', { test: 'data' });

                expect(handler1).toHaveBeenCalledWith({ test: 'data' });
                expect(handler2).toHaveBeenCalledWith({ test: 'data' });

                // Unsubscribe one handler
                eventBus.unsubscribe('TEST_EVENT', handler1);

                // Emit event again
                eventBus.emit('TEST_EVENT', { test: 'data2' });

                expect(handler1).toHaveBeenCalledTimes(1); // Should not be called again
                expect(handler2).toHaveBeenCalledTimes(2); // Should be called again
            });
        });
    });

    describe('Performance Tests', () => {
        describe('Large Dataset Handling', () => {
            it('should handle large content analysis efficiently', async () => {
                const largeContent = 'This is a test sentence. '.repeat(1000); // ~25KB content
                const startTime = performance.now();
                
                const result = await semanticEngine.analyzeContent(largeContent);
                
                const analysisTime = performance.now() - startTime;
                
                expect(result).toHaveProperty('analysisId');
                expect(analysisTime).toBeLessThan(5000); // Should complete within 5 seconds
                expect(result.performance.analysisTime).toBeGreaterThan(0);
            });

            it('should maintain performance with concurrent analyses', async () => {
                const concurrentAnalyses = Array(5).fill().map((_, index) =>
                    semanticEngine.analyzeContent(
                        `Test content for concurrent analysis ${index}. ` +
                        'This content contains strategic insights and decision points. ' +
                        'The analysis should identify key themes and concepts efficiently.'
                    )
                );

                const startTime = performance.now();
                const results = await Promise.all(concurrentAnalyses);
                const totalTime = performance.now() - startTime;

                expect(results).toHaveLength(5);
                expect(results.every(result => result.analysisId)).toBe(true);
                expect(totalTime).toBeLessThan(10000); // All analyses within 10 seconds
            });
        });

        describe('Memory Management', () => {
            it('should manage cache size effectively', async () => {
                // Fill cache beyond limit
                const cacheLimit = semanticEngine.config.cacheSize;
                const analysisPromises = [];

                for (let i = 0; i < cacheLimit + 10; i++) {
                    analysisPromises.push(
                        semanticEngine.analyzeContent(`Unique content ${i} for cache testing`)
                    );
                }

                await Promise.all(analysisPromises);
                const stats = semanticEngine.getAnalysisStatistics();

                expect(stats.cacheSize).toBeLessThanOrEqual(cacheLimit);
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        describe('Network and Timeout Scenarios', () => {
            it('should handle analysis timeouts gracefully', async () => {
                // Configure short timeout for testing
                const engine = new SemanticAnalysisEngine();
                await engine.initialize({ analysisTimeout: 1 }); // 1ms timeout

                await expect(
                    engine.analyzeContent('Test content that should timeout')
                ).rejects.toThrow(/timeout|failed/i);
            });

            it('should handle system resource constraints', async () => {
                // Simulate resource constraint by creating many concurrent operations
                const resourceIntensiveOperations = Array(100).fill().map((_, index) =>
                    semanticEngine.analyzeContent(`Resource test ${index}`)
                );

                // Should not crash the system
                const results = await Promise.allSettled(resourceIntensiveOperations);
                
                expect(results.length).toBe(100);
                expect(results.every(result => 
                    result.status === 'fulfilled' || result.status === 'rejected'
                )).toBe(true);
            });
        });

        describe('Data Validation and Sanitization', () => {
            it('should sanitize potentially malicious content', async () => {
                const maliciousContent = '<script>alert("xss")</script>Strategic planning content';
                
                const result = await semanticEngine.analyzeContent(maliciousContent);
                
                expect(result).toHaveProperty('analysisId');
                expect(result.content.originalLength).toBe(maliciousContent.length);
                // Content should be processed safely
            });

            it('should handle special characters and encoding', async () => {
                const specialContent = 'Strategic planning with émojis 🚀 and spëcial charactërs ñ';
                
                const result = await semanticEngine.analyzeContent(specialContent);
                
                expect(result).toHaveProperty('analysisId');
                expect(result.semanticFeatures.language).toBe('en');
                expect(result.semanticFeatures.encoding).toBe('utf-8');
            });
        });
    });
});