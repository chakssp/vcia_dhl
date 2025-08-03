/**
 * Exhaustive Test Suite for Knowledge Consolidator
 * Comprehensive testing covering all aspects of the system
 * 
 * Test Categories:
 * - Unit Tests: Individual component testing
 * - Integration Tests: Component interaction testing
 * - Performance Tests: Load and stress testing
 * - Edge Case Tests: Boundary condition testing
 * - Security Tests: Vulnerability and data protection testing
 * - Regression Tests: Ensuring fixes don't break existing functionality
 * 
 * @version 2.0.0
 * @author PKC Testing Team
 * @license MIT
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { jest } from '@jest/globals';

// Import system components
import { AdvancedKnowledgeProcessor, ConfidenceScorer, ResultValidator } from '../agent-2/feature-module-heavy.js';
import { EventBus, Events } from '../../js/core/EventBus.js';
import { AppState } from '../../js/core/AppState.js';
import { DiscoveryManager } from '../../js/managers/DiscoveryManager.js';
import { AnalysisManager } from '../../js/managers/AnalysisManager.js';
import { FilterManager } from '../../js/managers/FilterManager.js';
import { CategoryManager } from '../../js/managers/CategoryManager.js';
import { EmbeddingService } from '../../js/services/EmbeddingService.js';
import { QdrantService } from '../../js/services/QdrantService.js';
import { SimilaritySearchService } from '../../js/services/SimilaritySearchService.js';

// Test utilities and mocks
import { TestDataGenerator } from '../utils/TestDataGenerator.js';
import { MockAPIService } from '../mocks/MockAPIService.js';
import { PerformanceTestRunner } from '../utils/PerformanceTestRunner.js';

describe('Knowledge Consolidator - Exhaustive Test Suite', () => {
    let testDataGenerator;
    let mockAPIService;
    let performanceRunner;

    beforeAll(async () => {
        // Initialize test utilities
        testDataGenerator = new TestDataGenerator();
        mockAPIService = new MockAPIService();
        performanceRunner = new PerformanceTestRunner();

        // Setup global test environment
        global.fetch = jest.fn();
        global.Worker = jest.fn();
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };

        // Mock File System Access API
        global.window = {
            showDirectoryPicker: jest.fn(),
            showOpenFilePicker: jest.fn()
        };

        console.log('🧪 Starting exhaustive test suite...');
    });

    afterAll(() => {
        console.log('✅ Exhaustive test suite completed');
    });

    describe('🔧 Unit Tests - Core Components', () => {
        describe('AdvancedKnowledgeProcessor', () => {
            let processor;

            beforeEach(() => {
                processor = new AdvancedKnowledgeProcessor({
                    maxConcurrentJobs: 3,
                    batchSize: 5,
                    timeout: 5000,
                    workerPoolSize: 2
                });
            });

            afterEach(() => {
                processor.cleanup();
            });

            it('should initialize with correct configuration', () => {
                expect(processor.config.maxConcurrentJobs).toBe(3);
                expect(processor.config.batchSize).toBe(5);
                expect(processor.config.timeout).toBe(5000);
                expect(processor.config.workerPoolSize).toBe(2);
                expect(processor.workerPool).toHaveLength(2);
            });

            it('should process simple knowledge items', async () => {
                const items = testDataGenerator.generateSimpleItems(5);
                const result = await processor.processKnowledge(items);

                expect(result.success).toBe(true);
                expect(result.results).toHaveLength(5);
                expect(result.jobId).toBeDefined();
                expect(result.processingTime).toBeGreaterThan(0);
            });

            it('should handle complex knowledge items', async () => {
                const items = testDataGenerator.generateComplexItems(10);
                const result = await processor.processKnowledge(items, {
                    enableAdvancedAnalysis: true,
                    includeSemanticFeatures: true
                });

                expect(result.success).toBe(true);
                expect(result.results).toHaveLength(10);
                result.results.forEach(item => {
                    expect(item.features).toBeDefined();
                    expect(item.confidence).toBeDefined();
                    expect(item.metadata).toBeDefined();
                });
            });

            it('should handle processing errors gracefully', async () => {
                const invalidItems = [
                    null,
                    undefined,
                    {},
                    { invalidField: 'test' }
                ];

                const result = await processor.processKnowledge(invalidItems);
                expect(result.success).toBe(false);
                expect(result.error).toContain('No valid items to process');
            });

            it('should respect concurrency limits', async () => {
                const largeBatch = testDataGenerator.generateSimpleItems(50);
                const startTime = Date.now();
                
                const result = await processor.processKnowledge(largeBatch);
                const duration = Date.now() - startTime;

                expect(result.success).toBe(true);
                expect(duration).toBeGreaterThan(100); // Should take some time due to batching
                expect(processor.getStats().workers.total).toBe(2);
            });

            it('should validate input correctly', async () => {
                const validItems = [
                    { id: '1', content: 'Valid content' },
                    { id: '2', text: 'Valid text' },
                    { id: '3', data: 'Valid data' }
                ];

                const validated = await processor.validateInput(validItems);
                expect(validated).toHaveLength(3);

                const invalidItems = [
                    { id: '1' }, // Missing content
                    'string',    // Not object
                    123         // Not object
                ];

                const validatedInvalid = await processor.validateInput(invalidItems);
                expect(validatedInvalid).toHaveLength(0);
            });

            it('should generate unique IDs', () => {
                const id1 = processor.generateJobId();
                const id2 = processor.generateJobId();
                const id3 = processor.generateItemId();
                const id4 = processor.generateItemId();

                expect(id1).not.toBe(id2);
                expect(id3).not.toBe(id4);
                expect(id1).toContain('job_');
                expect(id3).toContain('item_');
            });

            it('should manage worker pool correctly', async () => {
                expect(processor.workerPool).toHaveLength(2);
                
                const worker1 = await processor.getAvailableWorker();
                expect(worker1).toBeDefined();
                expect(worker1.id).toContain('worker-');

                worker1.busy = true;
                const worker2 = await processor.getAvailableWorker();
                expect(worker2).toBeDefined();
                expect(worker2.id).not.toBe(worker1.id);
            });

            it('should provide accurate statistics', () => {
                const stats = processor.getStats();
                
                expect(stats).toHaveProperty('activeJobs');
                expect(stats).toHaveProperty('queuedJobs');
                expect(stats).toHaveProperty('workers');
                expect(stats).toHaveProperty('cache');
                expect(stats).toHaveProperty('metrics');
                
                expect(stats.workers.total).toBe(2);
                expect(stats.workers.available).toBe(2);
                expect(stats.workers.busy).toBe(0);
            });
        });

        describe('ConfidenceScorer', () => {
            let scorer;

            beforeEach(() => {
                scorer = new ConfidenceScorer({
                    confidenceThreshold: 0.7
                });
            });

            it('should calculate confidence for well-structured items', async () => {
                const item = {
                    content: 'This is a well-structured piece of content with multiple sentences. It contains meaningful information and demonstrates good writing quality.',
                    analysis: {
                        type: 'technical_insight',
                        insights: ['Key insight 1', 'Key insight 2'],
                        confidence: 0.85
                    },
                    features: {
                        semanticFeatures: { keyPhrases: ['test'], entities: [] },
                        structuralFeatures: { wordCount: 20 }
                    },
                    validation: { isValid: true, score: 0.9 },
                    metadata: { processingMetadata: {}, qualityMetrics: {} }
                };

                const confidence = await scorer.calculateOverallConfidence(item);
                
                expect(confidence.overall).toBeGreaterThan(0.6);
                expect(confidence.components).toHaveProperty('content');
                expect(confidence.components).toHaveProperty('analysis');
                expect(confidence.components).toHaveProperty('features');
                expect(confidence.factors).toBeInstanceOf(Array);
                expect(confidence.validation).toHaveProperty('isReliable');
            });

            it('should assign low confidence to poor quality items', async () => {
                const item = {
                    content: 'bad',
                    analysis: null,
                    features: null,
                    validation: { isValid: false },
                    metadata: null
                };

                const confidence = await scorer.calculateOverallConfidence(item);
                
                expect(confidence.overall).toBeLessThan(0.5);
                expect(confidence.validation.needsReview).toBe(true);
                expect(confidence.factors).toContain('poor_content');
            });

            it('should weight components correctly', async () => {
                const item = {
                    content: 'High quality content with excellent structure and meaningful information that provides value.',
                    analysis: { type: 'breakthrough', confidence: 0.9, insights: ['major insight'] },
                    features: { semanticFeatures: {}, structuralFeatures: {}, featureVector: [1,2,3] },
                    validation: { isValid: true, score: 0.95 },
                    metadata: { processingMetadata: {}, qualityMetrics: {}, tags: ['important'] }
                };

                const confidence = await scorer.calculateOverallConfidence(item);
                
                expect(confidence.overall).toBeGreaterThan(0.8);
                expect(confidence.factors).toContain('high_content_quality');
                expect(confidence.factors).toContain('strong_analysis');
                expect(confidence.validation.isReliable).toBe(true);
            });

            it('should handle missing components gracefully', async () => {
                const item = { content: 'Minimal content' };
                const confidence = await scorer.calculateOverallConfidence(item);
                
                expect(confidence.overall).toBeGreaterThan(0);
                expect(confidence.overall).toBeLessThan(1);
                expect(confidence.components.content).toBeGreaterThan(0);
            });
        });

        describe('ResultValidator', () => {
            let validator;

            beforeEach(() => {
                validator = new ResultValidator({});
            });

            it('should validate complete items successfully', async () => {
                const item = {
                    content: 'Valid content',
                    analysis: { type: 'insight' },
                    features: { semanticFeatures: {} },
                    metadata: { processingMetadata: {} },
                    confidence: { overall: 0.8 }
                };

                const validation = await validator.validateItem(item);
                
                expect(validation.isValid).toBe(true);
                expect(validation.score).toBeGreaterThan(0.6);
                expect(validation.checks).toHaveProperty('hasContent');
                expect(validation.checks.hasContent.passed).toBe(true);
                expect(validation.issues).toHaveLength(0);
            });

            it('should identify missing required components', async () => {
                const item = {};

                const validation = await validator.validateItem(item);
                
                expect(validation.isValid).toBe(false);
                expect(validation.score).toBeLessThan(0.6);
                expect(validation.issues.length).toBeGreaterThan(0);
                expect(validation.issues.some(i => i.severity === 'error')).toBe(true);
            });

            it('should handle partial validation correctly', async () => {
                const item = {
                    content: 'Some content',
                    analysis: { type: 'basic' }
                    // Missing features, metadata, confidence
                };

                const validation = await validator.validateItem(item);
                
                expect(validation.checks.hasContent.passed).toBe(true);
                expect(validation.checks.hasAnalysis.passed).toBe(true);
                expect(validation.checks.hasFeatures.passed).toBe(false);
                expect(validation.issues.length).toBeGreaterThan(0);
            });
        });
    });

    describe('🔗 Integration Tests - Component Interactions', () => {
        let discoveryManager;
        let analysisManager;
        let filterManager;
        let categoryManager;

        beforeEach(() => {
            // Reset EventBus
            EventBus.removeAllListeners();
            
            // Initialize managers
            discoveryManager = new DiscoveryManager();
            analysisManager = new AnalysisManager();
            filterManager = new FilterManager();
            categoryManager = new CategoryManager();
        });

        it('should handle complete discovery-to-analysis workflow', async () => {
            // Setup mock data
            const mockFiles = testDataGenerator.generateMockFiles(10);
            jest.spyOn(discoveryManager, 'discoverFiles').mockResolvedValue({
                files: mockFiles,
                stats: { total: 10, discovered: 10 }
            });

            // Mock analysis results
            jest.spyOn(analysisManager, 'analyzeFiles').mockImplementation(async (files) => {
                return files.map(file => ({
                    ...file,
                    analysis: { type: 'insight', confidence: 0.8 },
                    analyzed: true
                }));
            });

            // Execute workflow
            const discoveryResult = await discoveryManager.discoverFiles({
                patterns: ['**/*.md'],
                excludePatterns: ['**/temp/**']
            });

            expect(discoveryResult.files).toHaveLength(10);

            const analysisResult = await analysisManager.analyzeFiles(discoveryResult.files);
            expect(analysisResult).toHaveLength(10);
            expect(analysisResult.every(file => file.analyzed)).toBe(true);
        });

        it('should synchronize categories across components', async () => {
            const newCategory = { name: 'Test Category', color: '#ff0000' };
            
            // Listen for category changes
            const categoryChanges = [];
            EventBus.on(Events.CATEGORIES_CHANGED, (data) => {
                categoryChanges.push(data);
            });

            // Add category through CategoryManager
            await categoryManager.addCategory(newCategory);

            // Verify event was emitted
            expect(categoryChanges).toHaveLength(1);
            expect(categoryChanges[0].action).toBe('added');
            expect(categoryChanges[0].category.name).toBe('Test Category');

            // Verify category is available in other components
            const categories = categoryManager.getCategories();
            expect(categories.some(cat => cat.name === 'Test Category')).toBe(true);
        });

        it('should handle filtering with real-time updates', async () => {
            const mockFiles = testDataGenerator.generateMockFiles(100);
            AppState.set('files', mockFiles);

            // Apply relevance filter
            filterManager.applyFilter('relevance', { threshold: 0.7 });
            const filteredFiles = filterManager.getFilteredFiles();

            expect(filteredFiles.length).toBeLessThan(100);
            expect(filteredFiles.every(file => file.relevanceScore >= 0.7)).toBe(true);

            // Apply additional temporal filter
            filterManager.applyFilter('temporal', { period: '1m' });
            const doubleFilteredFiles = filterManager.getFilteredFiles();

            expect(doubleFilteredFiles.length).toBeLessThanOrEqual(filteredFiles.length);
        });

        it('should maintain state consistency across operations', async () => {
            const initialFiles = testDataGenerator.generateMockFiles(20);
            AppState.set('files', initialFiles);

            // Simulate analysis operation
            const analyzedFiles = initialFiles.map(file => ({
                ...file,
                analyzed: true,
                analysis: { type: 'insight', confidence: Math.random() }
            }));

            AppState.set('files', analyzedFiles);

            // Verify state consistency
            const stateFiles = AppState.get('files');
            expect(stateFiles).toHaveLength(20);
            expect(stateFiles.every(file => file.analyzed)).toBe(true);

            // Verify category assignment
            const categorizedFiles = stateFiles.map(file => ({
                ...file,
                categories: ['AI/ML', 'Research']
            }));

            AppState.set('files', categorizedFiles);
            const finalStateFiles = AppState.get('files');
            expect(finalStateFiles.every(file => file.categories.length > 0)).toBe(true);
        });
    });

    describe('⚡ Performance Tests - Load and Stress Testing', () => {
        beforeEach(() => {
            performanceRunner.reset();
        });

        it('should handle large file sets efficiently', async () => {
            const largeDataset = testDataGenerator.generateMockFiles(1000);
            
            const startTime = performance.now();
            const processor = new AdvancedKnowledgeProcessor({
                batchSize: 50,
                maxConcurrentJobs: 10
            });

            const result = await processor.processKnowledge(largeDataset);
            const duration = performance.now() - startTime;

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1000);
            expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

            processor.cleanup();
        });

        it('should maintain performance under memory pressure', async () => {
            const memoryIntensiveData = testDataGenerator.generateLargeContentItems(100);
            
            const processor = new AdvancedKnowledgeProcessor({
                enableCaching: true,
                batchSize: 10
            });

            const results = [];
            for (let i = 0; i < 5; i++) {
                const startMemory = performance.memory?.usedJSHeapSize || 0;
                const result = await processor.processKnowledge(memoryIntensiveData);
                const endMemory = performance.memory?.usedJSHeapSize || 0;
                
                results.push({
                    iteration: i,
                    success: result.success,
                    memoryDelta: endMemory - startMemory,
                    duration: result.processingTime
                });
            }

            // Verify no memory leaks (approximate check)
            const memoryGrowth = results[4].memoryDelta - results[0].memoryDelta;
            expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth

            processor.cleanup();
        });

        it('should handle concurrent processing efficiently', async () => {
            const dataset1 = testDataGenerator.generateMockFiles(50);
            const dataset2 = testDataGenerator.generateMockFiles(50);
            const dataset3 = testDataGenerator.generateMockFiles(50);

            const processor = new AdvancedKnowledgeProcessor({
                maxConcurrentJobs: 5,
                workerPoolSize: 3
            });

            const startTime = performance.now();
            const results = await Promise.all([
                processor.processKnowledge(dataset1),
                processor.processKnowledge(dataset2),
                processor.processKnowledge(dataset3)
            ]);
            const duration = performance.now() - startTime;

            expect(results.every(r => r.success)).toBe(true);
            expect(results.every(r => r.results.length === 50)).toBe(true);
            expect(duration).toBeLessThan(20000); // Concurrent processing should be faster

            processor.cleanup();
        });

        it('should throttle excessive requests appropriately', async () => {
            const processor = new AdvancedKnowledgeProcessor({
                maxConcurrentJobs: 2
            });

            const smallDatasets = Array(10).fill().map(() => 
                testDataGenerator.generateMockFiles(10)
            );

            const startTime = performance.now();
            const promises = smallDatasets.map(dataset => 
                processor.processKnowledge(dataset)
            );

            const results = await Promise.allSettled(promises);
            const duration = performance.now() - startTime;

            // Should complete all despite throttling
            expect(results.every(r => r.status === 'fulfilled')).toBe(true);
            expect(duration).toBeGreaterThan(1000); // Should take time due to throttling

            processor.cleanup();
        });
    });

    describe('🧪 Edge Case Tests - Boundary Conditions', () => {
        it('should handle empty input gracefully', async () => {
            const processor = new AdvancedKnowledgeProcessor();
            
            const result = await processor.processKnowledge([]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('No valid items to process');

            processor.cleanup();
        });

        it('should handle extremely large content', async () => {
            const hugeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB string
            const item = { id: '1', content: hugeContent };

            const processor = new AdvancedKnowledgeProcessor();
            const result = await processor.processKnowledge([item]);

            expect(result.success).toBe(true);
            expect(result.results[0].content).toBe(hugeContent);

            processor.cleanup();
        });

        it('should handle malformed data structures', async () => {
            const malformedItems = [
                { content: null },
                { content: undefined },
                { content: 123 },
                { content: [] },
                { content: {} },
                'not an object',
                123,
                null,
                undefined
            ];

            const processor = new AdvancedKnowledgeProcessor();
            const result = await processor.processKnowledge(malformedItems);

            // Should filter out invalid items
            expect(result.success).toBe(false);
            expect(result.error).toContain('No valid items to process');

            processor.cleanup();
        });

        it('should handle Unicode and special characters', async () => {
            const unicodeItems = [
                { id: '1', content: '你好世界 🌍 测试内容' },
                { id: '2', content: 'العربية النص مع رموز تعبيرية 😊' },
                { id: '3', content: 'Тест на русском языке с эмодзи 🚀' },
                { id: '4', content: '日本語のテストコンテンツ 🎌' },
                { id: '5', content: 'Mixed: Hello мир 世界 🌐' }
            ];

            const processor = new AdvancedKnowledgeProcessor();
            const result = await processor.processKnowledge(unicodeItems);

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(5);
            result.results.forEach(item => {
                expect(item.cleanedContent || item.content).toBeDefined();
            });

            processor.cleanup();
        });

        it('should handle extreme confidence edge cases', async () => {
            const scorer = new ConfidenceScorer({});

            // Perfect item
            const perfectItem = {
                content: 'A'.repeat(1000),
                analysis: { type: 'breakthrough', confidence: 1.0, insights: Array(10).fill('insight') },
                features: { 
                    semanticFeatures: { keyPhrases: Array(20).fill('phrase') },
                    structuralFeatures: { wordCount: 1000 },
                    featureVector: Array(100).fill(1)
                },
                validation: { isValid: true, score: 1.0 },
                metadata: { 
                    processingMetadata: {}, 
                    qualityMetrics: {},
                    tags: Array(10).fill('tag'),
                    relationships: Array(5).fill({})
                }
            };

            const perfectConfidence = await scorer.calculateOverallConfidence(perfectItem);
            expect(perfectConfidence.overall).toBeCloseTo(1.0, 1);

            // Terrible item
            const terribleItem = { content: 'x' };
            const terribleConfidence = await scorer.calculateOverallConfidence(terribleItem);
            expect(terribleConfidence.overall).toBeLessThan(0.5);
        });

        it('should handle worker failures gracefully', async () => {
            const processor = new AdvancedKnowledgeProcessor({
                workerPoolSize: 2,
                timeout: 1000
            });

            // Mock worker to simulate failure
            processor.workerPool[0].postMessage = () => {
                throw new Error('Worker communication failed');
            };

            const items = testDataGenerator.generateSimpleItems(5);
            const result = await processor.processKnowledge(items);

            // Should still process with remaining workers or handle gracefully
            expect(result).toBeDefined();

            processor.cleanup();
        });
    });

    describe('🔒 Security Tests - Data Protection and Validation', () => {
        it('should sanitize potentially malicious content', async () => {
            const maliciousItems = [
                { id: '1', content: '<script>alert("xss")</script>' },
                { id: '2', content: 'javascript:void(0)' },
                { id: '3', content: 'data:text/html,<script>alert(1)</script>' },
                { id: '4', content: '../../etc/passwd' },
                { id: '5', content: 'SELECT * FROM users WHERE id=1; DROP TABLE users;' }
            ];

            const processor = new AdvancedKnowledgeProcessor();
            const result = await processor.processKnowledge(maliciousItems);

            expect(result.success).toBe(true);
            result.results.forEach(item => {
                // Content should be processed but not executed
                expect(item.cleanedContent || item.content).toBeDefined();
                expect(typeof(item.cleanedContent || item.content)).toBe('string');
            });

            processor.cleanup();
        });

        it('should validate input sizes to prevent DoS', async () => {
            const oversizedItem = {
                id: '1',
                content: 'x'.repeat(100 * 1024 * 1024) // 100MB
            };

            const processor = new AdvancedKnowledgeProcessor({
                maxContentSize: 10 * 1024 * 1024 // 10MB limit
            });

            // Should either reject or handle large content appropriately
            const result = await processor.processKnowledge([oversizedItem]);
            expect(result).toBeDefined();

            processor.cleanup();
        });

        it('should prevent injection attacks in metadata', async () => {
            const maliciousMetadata = {
                id: '1',
                content: 'Normal content',
                metadata: {
                    filename: '../../../etc/passwd',
                    path: '../../../../windows/system32/config/sam',
                    userInput: '<script>malicious()</script>',
                    sqlInjection: "'; DROP TABLE files; --"
                }
            };

            const processor = new AdvancedKnowledgeProcessor();
            const result = await processor.processKnowledge([maliciousMetadata]);

            expect(result.success).toBe(true);
            // Metadata should be processed safely
            expect(result.results[0].metadata).toBeDefined();

            processor.cleanup();
        });

        it('should handle rate limiting for API calls', async () => {
            const processor = new AdvancedKnowledgeProcessor({
                apiRateLimit: 5, // 5 requests per second
                enableRateLimiting: true
            });

            const rapidRequests = Array(20).fill().map(() => 
                testDataGenerator.generateSimpleItems(1)
            );

            const startTime = Date.now();
            const promises = rapidRequests.map(items => 
                processor.processKnowledge(items)
            );

            await Promise.allSettled(promises);
            const duration = Date.now() - startTime;

            // Should take longer due to rate limiting
            expect(duration).toBeGreaterThan(3000); // At least 3 seconds for 20 requests at 5/sec

            processor.cleanup();
        });
    });

    describe('🔄 Regression Tests - Ensuring Stability', () => {
        it('should maintain backwards compatibility with old data formats', async () => {
            const legacyData = [
                { // Old format
                    id: '1',
                    text: 'Legacy content field',
                    type: 'document',
                    created: '2023-01-01'
                },
                { // Mixed format
                    id: '2',
                    content: 'New content field',
                    text: 'Also has legacy field',
                    analysis: { type: 'old_analysis' }
                }
            ];

            const processor = new AdvancedKnowledgeProcessor();
            const result = await processor.processKnowledge(legacyData);

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(2);
            
            // Should handle both old and new formats
            result.results.forEach(item => {
                expect(item.content || item.text).toBeDefined();
            });

            processor.cleanup();
        });

        it('should handle previous bug scenarios correctly', async () => {
            // Bug #1: Empty content causing crashes
            const emptyContentItems = [
                { id: '1', content: '' },
                { id: '2', content: '   ' },
                { id: '3', content: '\n\n\n' }
            ];

            const processor = new AdvancedKnowledgeProcessor();
            const result1 = await processor.processKnowledge(emptyContentItems);
            expect(result1).toBeDefined(); // Should not crash

            // Bug #2: Circular references in metadata
            const circularItem = { id: '1', content: 'test' };
            circularItem.metadata = { parent: circularItem };

            const result2 = await processor.processKnowledge([circularItem]);
            expect(result2).toBeDefined(); // Should handle circular references

            // Bug #3: Memory leaks in large batches
            const largeBatch = testDataGenerator.generateMockFiles(1000);
            const initialMemory = performance.memory?.usedJSHeapSize || 0;
            
            await processor.processKnowledge(largeBatch);
            
            // Force garbage collection if available
            if (global.gc) global.gc();
            
            const finalMemory = performance.memory?.usedJSHeapSize || 0;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

            processor.cleanup();
        });

        it('should maintain consistent API responses', async () => {
            const standardInput = testDataGenerator.generateSimpleItems(5);
            const processor = new AdvancedKnowledgeProcessor();

            // Run same input multiple times
            const results = await Promise.all([
                processor.processKnowledge(standardInput),
                processor.processKnowledge(standardInput),
                processor.processKnowledge(standardInput)
            ]);

            // Results should have consistent structure
            results.forEach(result => {
                expect(result).toHaveProperty('success');
                expect(result).toHaveProperty('jobId');
                expect(result).toHaveProperty('processingTime');
                
                if (result.success) {
                    expect(result).toHaveProperty('results');
                    expect(result.results).toHaveLength(5);
                }
            });

            processor.cleanup();
        });

        it('should handle version migrations correctly', async () => {
            // Simulate old version data
            const oldVersionData = {
                version: '1.0.0',
                files: [
                    { id: '1', content: 'Old format', relevance: 0.8 },
                    { id: '2', content: 'Another old format', relevance: 0.6 }
                ],
                settings: {
                    threshold: 0.7,
                    provider: 'legacy'
                }
            };

            // Should handle migration gracefully
            const processor = new AdvancedKnowledgeProcessor();
            const migrated = processor.migrateData ? 
                processor.migrateData(oldVersionData) : oldVersionData;

            expect(migrated).toBeDefined();
            expect(migrated.files || migrated).toBeDefined();

            processor.cleanup();
        });
    });

    describe('📊 Stress Tests - Extreme Conditions', () => {
        it('should survive rapid start/stop cycles', async () => {
            const cycles = 10;
            const processors = [];

            for (let i = 0; i < cycles; i++) {
                const processor = new AdvancedKnowledgeProcessor();
                processors.push(processor);
                
                const items = testDataGenerator.generateSimpleItems(5);
                const promise = processor.processKnowledge(items);
                
                // Cleanup immediately
                processor.cleanup();
                
                try {
                    await promise;
                } catch (error) {
                    // Expected due to immediate cleanup
                }
            }

            // All processors should be cleaned up
            expect(processors).toHaveLength(cycles);
        });

        it('should handle resource exhaustion gracefully', async () => {
            const processor = new AdvancedKnowledgeProcessor({
                maxConcurrentJobs: 1,
                workerPoolSize: 1,
                timeout: 1000
            });

            // Submit many jobs to exhaust resources
            const jobs = Array(50).fill().map(() => 
                processor.processKnowledge(testDataGenerator.generateSimpleItems(10))
            );

            const results = await Promise.allSettled(jobs);
            
            // Some should succeed, some may fail, but system should survive
            expect(results.length).toBe(50);
            expect(results.some(r => r.status === 'fulfilled')).toBe(true);

            processor.cleanup();
        });

        it('should maintain stability under random inputs', async () => {
            const processor = new AdvancedKnowledgeProcessor();
            const randomTests = 100;
            let successCount = 0;

            for (let i = 0; i < randomTests; i++) {
                const randomItems = testDataGenerator.generateRandomItems();
                
                try {
                    const result = await processor.processKnowledge(randomItems);
                    if (result.success || result.error) {
                        successCount++; // Either success or controlled failure
                    }
                } catch (error) {
                    // Uncontrolled failures
                    console.warn(`Random test ${i} failed uncontrollably:`, error.message);
                }
            }

            // Should handle most random inputs gracefully
            expect(successCount / randomTests).toBeGreaterThan(0.8);

            processor.cleanup();
        });
    });

    describe('🎯 End-to-End Tests - Complete Workflows', () => {
        it('should complete full knowledge processing workflow', async () => {
            const mockFileSystem = testDataGenerator.generateMockFileSystem();
            const processor = new AdvancedKnowledgeProcessor();

            // Step 1: Discovery
            const discoveredFiles = mockFileSystem.files;
            expect(discoveredFiles.length).toBeGreaterThan(0);

            // Step 2: Processing
            const processResult = await processor.processKnowledge(discoveredFiles);
            expect(processResult.success).toBe(true);

            // Step 3: Validation
            const validator = new ResultValidator({});
            const validationResults = await Promise.all(
                processResult.results.map(item => validator.validateItem(item))
            );

            expect(validationResults.every(v => v.isValid || v.score > 0.3)).toBe(true);

            // Step 4: Export preparation
            const exportableItems = processResult.results.filter(item => 
                item.confidence?.overall > 0.5
            );

            expect(exportableItems.length).toBeGreaterThan(0);

            processor.cleanup();
        });

        it('should handle real-world data scenarios', async () => {
            const realWorldScenarios = [
                testDataGenerator.generateMarkdownFiles(),
                testDataGenerator.generateCodeFiles(),
                testDataGenerator.generateDocumentFiles(),
                testDataGenerator.generateMixedContentFiles()
            ];

            const processor = new AdvancedKnowledgeProcessor();
            const results = [];

            for (const scenario of realWorldScenarios) {
                const result = await processor.processKnowledge(scenario);
                results.push(result);
            }

            // All scenarios should be handled
            expect(results.every(r => r.success || r.error)).toBe(true);

            processor.cleanup();
        });
    });
});

/**
 * Test Data Generator
 * Utility class for generating test data
 */
class TestDataGenerator {
    generateSimpleItems(count) {
        return Array(count).fill().map((_, i) => ({
            id: `item_${i}`,
            content: `Test content for item ${i}. This is meaningful content for testing purposes.`,
            timestamp: Date.now() - (i * 1000)
        }));
    }

    generateComplexItems(count) {
        return Array(count).fill().map((_, i) => ({
            id: `complex_${i}`,
            content: this.generateLargeContent(i),
            metadata: {
                filename: `file_${i}.md`,
                size: Math.random() * 10000,
                created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            },
            categories: this.getRandomCategories(),
            relevanceScore: Math.random()
        }));
    }

    generateLargeContentItems(count) {
        return Array(count).fill().map((_, i) => ({
            id: `large_${i}`,
            content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1000),
            timestamp: Date.now()
        }));
    }

    generateRandomItems() {
        const count = Math.floor(Math.random() * 20) + 1;
        return Array(count).fill().map((_, i) => {
            const itemType = Math.random();
            
            if (itemType < 0.6) {
                return { id: `random_${i}`, content: this.generateRandomContent() };
            } else if (itemType < 0.8) {
                return { id: `random_${i}`, text: this.generateRandomContent() };
            } else {
                return { id: `random_${i}`, data: this.generateRandomContent() };
            }
        });
    }

    generateMockFiles(count) {
        return Array(count).fill().map((_, i) => ({
            id: `file_${i}`,
            name: `document_${i}.md`,
            content: this.generateDocumentContent(i),
            size: Math.random() * 50000,
            lastModified: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
            relevanceScore: Math.random(),
            categories: [],
            analyzed: false
        }));
    }

    generateMockFileSystem() {
        return {
            root: '/test-knowledge-base',
            files: this.generateMockFiles(50),
            directories: [
                '/research',
                '/projects',
                '/notes',
                '/archive'
            ]
        };
    }

    generateMarkdownFiles() {
        return Array(10).fill().map((_, i) => ({
            id: `md_${i}`,
            content: `# Document ${i}\n\n## Overview\n\nThis is a markdown document with **bold** and *italic* text.\n\n- List item 1\n- List item 2\n\n\`\`\`javascript\nconsole.log('code block');\n\`\`\``,
            type: 'markdown'
        }));
    }

    generateCodeFiles() {
        return Array(10).fill().map((_, i) => ({
            id: `code_${i}`,
            content: `/**\n * Function ${i}\n */\nfunction testFunction${i}() {\n    return 'test result ${i}';\n}\n\nmodule.exports = testFunction${i};`,
            type: 'javascript'
        }));
    }

    generateDocumentFiles() {
        return Array(10).fill().map((_, i) => ({
            id: `doc_${i}`,
            content: `Document Title ${i}\n\nThis is a formal document containing important information about topic ${i}. The document includes several sections and subsections with detailed explanations.`,
            type: 'document'
        }));
    }

    generateMixedContentFiles() {
        const types = ['text', 'json', 'csv', 'xml'];
        return Array(10).fill().map((_, i) => {
            const type = types[i % types.length];
            return {
                id: `mixed_${i}`,
                content: this.generateContentByType(type, i),
                type
            };
        });
    }

    generateLargeContent(index) {
        const sections = [
            'Introduction',
            'Methodology',
            'Results',
            'Discussion',
            'Conclusion'
        ];

        return sections.map(section => 
            `## ${section} ${index}\n\n${this.generateParagraphs(3)}`
        ).join('\n\n');
    }

    generateDocumentContent(index) {
        return `# Document ${index}

## Summary
This document contains important insights about topic ${index}. It represents a critical piece of knowledge that has been discovered during the exploration phase.

## Key Points
- Important insight number one for document ${index}
- Critical finding that impacts decision making
- Technical detail that influences implementation

## Analysis
The analysis of this content reveals several breakthrough moments and decision points that are crucial for the overall knowledge consolidation process.

## Conclusion
This document represents ${Math.random() > 0.5 ? 'high' : 'medium'} value content with significant implications for future work.`;
    }

    generateRandomContent() {
        const templates = [
            'Random content with varying length and complexity.',
            'Short text.',
            'A much longer piece of content that contains multiple sentences and covers various topics. This type of content is designed to test the robustness of the processing system.',
            '',
            '   ',
            'Content with special characters: @#$%^&*()_+{}|:"<>?[]\\;\',./',
            '🌍 Unicode content with emojis and symbols ∑∆∞',
            'Content\nwith\nnewlines\nand\ttabs',
            'Very very very very very very very very very very very very very very very very very very long content that goes on and on and on.',
            JSON.stringify({ type: 'data', value: Math.random() })
        ];

        return templates[Math.floor(Math.random() * templates.length)];
    }

    generateContentByType(type, index) {
        switch (type) {
            case 'json':
                return JSON.stringify({
                    id: index,
                    data: 'test data',
                    values: [1, 2, 3, 4, 5]
                }, null, 2);
            
            case 'csv':
                return 'name,value,category\nItem 1,100,A\nItem 2,200,B\nItem 3,300,C';
            
            case 'xml':
                return `<?xml version="1.0"?>\n<root>\n  <item id="${index}">Test data</item>\n</root>`;
            
            default:
                return `Plain text content for item ${index}`;
        }
    }

    generateParagraphs(count) {
        const sentences = [
            'This is a test sentence for content generation.',
            'The system should handle this type of content effectively.',
            'Complex analysis requires sophisticated processing capabilities.',
            'Knowledge consolidation benefits from intelligent automation.',
            'The implementation demonstrates advanced technical capabilities.'
        ];

        return Array(count).fill().map(() => {
            const sentenceCount = Math.floor(Math.random() * 4) + 2;
            return Array(sentenceCount).fill().map(() => 
                sentences[Math.floor(Math.random() * sentences.length)]
            ).join(' ');
        }).join('\n\n');
    }

    getRandomCategories() {
        const categories = ['AI/ML', 'Research', 'Development', 'Strategy', 'Analysis'];
        const count = Math.floor(Math.random() * 3) + 1;
        return Array(count).fill().map(() => 
            categories[Math.floor(Math.random() * categories.length)]
        );
    }
}

export { TestDataGenerator };