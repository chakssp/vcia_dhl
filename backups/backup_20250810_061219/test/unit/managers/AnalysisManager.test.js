/**
 * AnalysisManager.test.js
 * Unit tests for AnalysisManager - AI Analysis Orchestrator
 * 
 * Tests cover:
 * - Initialization and configuration
 * - Queue management
 * - File analysis processing
 * - Error handling and retry logic
 * - Cost tracking and statistics
 */

// Mock dependencies before importing
const mockEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
};

const mockAppState = {
    get: jest.fn(),
    set: jest.fn()
};

const mockAIAPIManager = {
    getActiveProvider: jest.fn(),
    analyzeContent: jest.fn(),
    isProviderReady: jest.fn()
};

const mockPromptManager = {
    getTemplate: jest.fn(),
    applyTemplate: jest.fn()
};

// Setup global mocks
global.window = {
    KnowledgeConsolidator: {
        EventBus: mockEventBus,
        Events: {
            ANALYSIS_STARTED: 'analysis_started',
            ANALYSIS_COMPLETED: 'analysis_completed',
            ANALYSIS_ERROR: 'analysis_error',
            FILES_UPDATED: 'files_updated'
        },
        AppState: mockAppState,
        AIAPIManager: mockAIAPIManager,
        PromptManager: mockPromptManager,
        Logger: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        }
    }
};

describe('AnalysisManager', () => {
    let analysisManager;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Import after mocks are set up
        require('../../../js/managers/AnalysisManager.js');
        analysisManager = new window.KnowledgeConsolidator.AnalysisManager();
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(analysisManager.state.queue).toEqual([]);
            expect(analysisManager.state.processing).toBe(false);
            expect(analysisManager.config.model).toBe('claude-3-sonnet');
            expect(analysisManager.config.batchSize).toBe(5);
            expect(analysisManager.isInitialized).toBe(false);
        });

        test('should load saved configuration during initialization', async () => {
            const savedConfig = {
                model: 'gpt-4',
                temperature: 0.8,
                batchSize: 3
            };
            
            mockAppState.get.mockReturnValue(savedConfig);
            
            await analysisManager.initialize();
            
            expect(mockAppState.get).toHaveBeenCalledWith('analysisConfig');
            expect(analysisManager.config.model).toBe('gpt-4');
            expect(analysisManager.config.temperature).toBe(0.8);
            expect(analysisManager.config.batchSize).toBe(3);
            expect(analysisManager.isInitialized).toBe(true);
        });

        test('should handle initialization errors gracefully', async () => {
            mockAppState.get.mockImplementation(() => {
                throw new Error('Storage error');
            });

            await expect(analysisManager.initialize()).rejects.toThrow('Storage error');
            expect(analysisManager.isInitialized).toBe(false);
        });
    });

    describe('Queue Management', () => {
        beforeEach(async () => {
            await analysisManager.initialize();
        });

        test('should add files to analysis queue', () => {
            const files = [
                { id: 'file1', name: 'test1.md', content: 'Content 1' },
                { id: 'file2', name: 'test2.md', content: 'Content 2' }
            ];

            const queueId = analysisManager.addToQueue(files, {
                template: 'technicalInsights',
                context: 'Test context'
            });

            expect(queueId).toBeDefined();
            expect(analysisManager.state.queue).toHaveLength(1);
            expect(analysisManager.state.queue[0].files).toEqual(files);
            expect(analysisManager.state.queue[0].options.template).toBe('technicalInsights');
        });

        test('should validate files before adding to queue', () => {
            const invalidFiles = [
                { id: 'file1' }, // missing name and content
                { name: 'test.md' } // missing id and content
            ];

            expect(() => {
                analysisManager.addToQueue(invalidFiles);
            }).toThrow('Invalid file format');
        });

        test('should clear queue', () => {
            const files = [{ id: 'file1', name: 'test.md', content: 'Content' }];
            analysisManager.addToQueue(files);
            
            expect(analysisManager.state.queue).toHaveLength(1);
            
            analysisManager.clearQueue();
            
            expect(analysisManager.state.queue).toHaveLength(0);
        });

        test('should get queue status', () => {
            const files = [{ id: 'file1', name: 'test.md', content: 'Content' }];
            analysisManager.addToQueue(files);

            const status = analysisManager.getQueueStatus();

            expect(status.total).toBe(1);
            expect(status.processing).toBe(false);
            expect(status.completed).toBe(0);
            expect(status.pending).toBe(1);
        });
    });

    describe('File Analysis', () => {
        beforeEach(async () => {
            await analysisManager.initialize();
            mockAIAPIManager.getActiveProvider.mockReturnValue('claude');
            mockAIAPIManager.isProviderReady.mockReturnValue(true);
            mockPromptManager.getTemplate.mockReturnValue({
                prompt: 'Analyze this content: {content}',
                variables: ['content']
            });
        });

        test('should analyze single file successfully', async () => {
            const file = {
                id: 'file1',
                name: 'test.md',
                content: 'Test content for analysis'
            };

            const mockAnalysisResult = {
                analysisType: 'Breakthrough Técnico',
                relevanceScore: 85,
                insights: ['Key insight 1', 'Key insight 2'],
                summary: 'Analysis summary'
            };

            mockAIAPIManager.analyzeContent.mockResolvedValue(mockAnalysisResult);
            mockPromptManager.applyTemplate.mockReturnValue('Analyze this content: Test content for analysis');

            const result = await analysisManager.analyzeFile(file);

            expect(mockAIAPIManager.analyzeContent).toHaveBeenCalledWith(
                'Analyze this content: Test content for analysis',
                expect.objectContaining({
                    model: 'claude-3-sonnet',
                    temperature: 0.7,
                    maxTokens: 2000
                })
            );

            expect(result).toMatchObject(mockAnalysisResult);
            expect(result.fileId).toBe('file1');
            expect(result.processingTime).toBeDefined();
        });

        test('should handle analysis errors with retry logic', async () => {
            const file = {
                id: 'file1',
                name: 'test.md',
                content: 'Test content'
            };

            // First two calls fail, third succeeds
            mockAIAPIManager.analyzeContent
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Rate limit'))
                .mockResolvedValueOnce({
                    analysisType: 'Aprendizado Geral',
                    relevanceScore: 60
                });

            const result = await analysisManager.analyzeFile(file);

            expect(mockAIAPIManager.analyzeContent).toHaveBeenCalledTimes(3);
            expect(result.analysisType).toBe('Aprendizado Geral');
            expect(analysisManager.state.stats.errors).toBe(2); // Two retry attempts
        });

        test('should fail after maximum retry attempts', async () => {
            const file = {
                id: 'file1',
                name: 'test.md',
                content: 'Test content'
            };

            mockAIAPIManager.analyzeContent.mockRejectedValue(new Error('Persistent error'));

            await expect(analysisManager.analyzeFile(file)).rejects.toThrow('Persistent error');
            
            expect(mockAIAPIManager.analyzeContent).toHaveBeenCalledTimes(3); // Initial + 2 retries
            expect(analysisManager.state.stats.errors).toBe(3);
        });
    });

    describe('Batch Processing', () => {
        beforeEach(async () => {
            await analysisManager.initialize();
            mockAIAPIManager.getActiveProvider.mockReturnValue('claude');
            mockAIAPIManager.isProviderReady.mockReturnValue(true);
            mockPromptManager.getTemplate.mockReturnValue({
                prompt: 'Analyze: {content}',
                variables: ['content']
            });
            mockPromptManager.applyTemplate.mockImplementation((template, file) => 
                `Analyze: ${file.content}`
            );
        });

        test('should process queue in batches', async () => {
            const files = Array.from({ length: 12 }, (_, i) => ({
                id: `file${i + 1}`,
                name: `test${i + 1}.md`,
                content: `Content ${i + 1}`
            }));

            mockAIAPIManager.analyzeContent.mockResolvedValue({
                analysisType: 'Aprendizado Geral',
                relevanceScore: 70
            });

            analysisManager.addToQueue(files);
            const results = await analysisManager.processQueue();

            expect(results).toHaveLength(12);
            expect(mockAIAPIManager.analyzeContent).toHaveBeenCalledTimes(12);
            
            // Verify batch processing (default batch size is 5)
            expect(analysisManager.state.stats.processed).toBe(12);
        });

        test('should emit progress events during batch processing', async () => {
            const files = Array.from({ length: 3 }, (_, i) => ({
                id: `file${i + 1}`,
                name: `test${i + 1}.md`,
                content: `Content ${i + 1}`
            }));

            mockAIAPIManager.analyzeContent.mockResolvedValue({
                analysisType: 'Aprendizado Geral',
                relevanceScore: 70
            });

            analysisManager.addToQueue(files);
            await analysisManager.processQueue();

            expect(mockEventBus.emit).toHaveBeenCalledWith('analysis_started', expect.any(Object));
            expect(mockEventBus.emit).toHaveBeenCalledWith('analysis_completed', expect.any(Object));
        });

        test('should handle mixed success and failure in batch', async () => {
            const files = [
                { id: 'file1', name: 'success.md', content: 'Good content' },
                { id: 'file2', name: 'fail.md', content: 'Bad content' },
                { id: 'file3', name: 'success2.md', content: 'Good content 2' }
            ];

            mockAIAPIManager.analyzeContent
                .mockResolvedValueOnce({ analysisType: 'Insight Estratégico', relevanceScore: 80 })
                .mockRejectedValueOnce(new Error('Analysis failed'))
                .mockResolvedValueOnce({ analysisType: 'Momento Decisivo', relevanceScore: 90 });

            analysisManager.addToQueue(files);
            const results = await analysisManager.processQueue();

            expect(results).toHaveLength(3);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBe('Analysis failed');
            expect(results[2].success).toBe(true);
        });
    });

    describe('Statistics and Cost Tracking', () => {
        beforeEach(async () => {
            await analysisManager.initialize();
        });

        test('should track processing statistics', async () => {
            const file = {
                id: 'file1',
                name: 'test.md',
                content: 'Test content'
            };

            mockAIAPIManager.analyzeContent.mockResolvedValue({
                analysisType: 'Breakthrough Técnico',
                relevanceScore: 85,
                cost: 0.05,
                tokensUsed: 1200
            });

            await analysisManager.analyzeFile(file);

            const stats = analysisManager.getStats();
            expect(stats.processed).toBe(1);
            expect(stats.errors).toBe(0);
            expect(stats.totalCost).toBe(0.05);
            expect(stats.avgProcessingTime).toBeGreaterThan(0);
        });

        test('should calculate average processing time', async () => {
            const files = [
                { id: 'file1', name: 'test1.md', content: 'Content 1' },
                { id: 'file2', name: 'test2.md', content: 'Content 2' }
            ];

            mockAIAPIManager.analyzeContent.mockResolvedValue({
                analysisType: 'Aprendizado Geral',
                relevanceScore: 70,
                cost: 0.03
            });

            for (const file of files) {
                await analysisManager.analyzeFile(file);
            }

            const stats = analysisManager.getStats();
            expect(stats.processed).toBe(2);
            expect(stats.totalCost).toBe(0.06);
            expect(stats.avgProcessingTime).toBeGreaterThan(0);
        });
    });

    describe('Configuration Management', () => {
        beforeEach(async () => {
            await analysisManager.initialize();
        });

        test('should update configuration', () => {
            const newConfig = {
                model: 'gpt-4',
                temperature: 0.9,
                batchSize: 10
            };

            analysisManager.updateConfig(newConfig);

            expect(analysisManager.config.model).toBe('gpt-4');
            expect(analysisManager.config.temperature).toBe(0.9);
            expect(analysisManager.config.batchSize).toBe(10);
            expect(mockAppState.set).toHaveBeenCalledWith('analysisConfig', expect.objectContaining(newConfig));
        });

        test('should validate configuration updates', () => {
            const invalidConfig = {
                batchSize: -1, // Invalid negative value
                temperature: 2.0 // Invalid temperature > 1
            };

            expect(() => {
                analysisManager.updateConfig(invalidConfig);
            }).toThrow('Invalid configuration');
        });

        test('should reset to default configuration', () => {
            analysisManager.updateConfig({ model: 'gpt-4', batchSize: 10 });
            
            analysisManager.resetConfig();

            expect(analysisManager.config.model).toBe('claude-3-sonnet');
            expect(analysisManager.config.batchSize).toBe(5);
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await analysisManager.initialize();
        });

        test('should handle provider unavailability', async () => {
            mockAIAPIManager.isProviderReady.mockReturnValue(false);

            const file = { id: 'file1', name: 'test.md', content: 'Content' };

            await expect(analysisManager.analyzeFile(file)).rejects.toThrow('No AI provider available');
        });

        test('should handle invalid template', async () => {
            mockPromptManager.getTemplate.mockReturnValue(null);

            const file = { id: 'file1', name: 'test.md', content: 'Content' };

            await expect(analysisManager.analyzeFile(file)).rejects.toThrow('Invalid template');
        });

        test('should handle timeout errors', async () => {
            mockAIAPIManager.analyzeContent.mockImplementation(() => 
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 100)
                )
            );

            const file = { id: 'file1', name: 'test.md', content: 'Content' };

            await expect(analysisManager.analyzeFile(file)).rejects.toThrow('Request timeout');
        });
    });

    describe('Event System Integration', () => {
        beforeEach(async () => {
            await analysisManager.initialize();
        });

        test('should emit analysis events', async () => {
            const file = { id: 'file1', name: 'test.md', content: 'Content' };

            mockAIAPIManager.analyzeContent.mockResolvedValue({
                analysisType: 'Insight Estratégico',
                relevanceScore: 80
            });

            await analysisManager.analyzeFile(file);

            expect(mockEventBus.emit).toHaveBeenCalledWith('analysis_started', expect.objectContaining({
                fileId: 'file1'
            }));

            expect(mockEventBus.emit).toHaveBeenCalledWith('analysis_completed', expect.objectContaining({
                fileId: 'file1',
                success: true
            }));
        });

        test('should emit error events on failure', async () => {
            const file = { id: 'file1', name: 'test.md', content: 'Content' };

            mockAIAPIManager.analyzeContent.mockRejectedValue(new Error('Analysis failed'));

            await expect(analysisManager.analyzeFile(file)).rejects.toThrow('Analysis failed');

            expect(mockEventBus.emit).toHaveBeenCalledWith('analysis_error', expect.objectContaining({
                fileId: 'file1',
                error: 'Analysis failed'
            }));
        });
    });
});