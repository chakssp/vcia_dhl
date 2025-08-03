/**
 * workflow-complete.test.js
 * Integration tests for complete workflow scenarios
 * 
 * Tests cover:
 * - End-to-end workflow from discovery to export
 * - Cross-component interaction and data flow
 * - State consistency across workflow steps
 * - Error propagation and recovery
 * - Performance of complete workflows
 */

// Mock external dependencies
global.fetch = jest.fn();

// Mock File System Access API
global.window = {
    showDirectoryPicker: jest.fn(),
    KnowledgeConsolidator: {}
};

// Mock localStorage
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

describe('Complete Workflow Integration', () => {
    let mockComponents;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup comprehensive mocks for all components
        mockComponents = {
            EventBus: {
                emit: jest.fn(),
                on: jest.fn(),
                off: jest.fn()
            },
            AppState: {
                get: jest.fn(),
                set: jest.fn(),
                getAll: jest.fn().mockReturnValue({}),
                clear: jest.fn()
            },
            Logger: {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn()
            },
            DiscoveryManager: {
                initialize: jest.fn().mockResolvedValue(true),
                discoverFiles: jest.fn(),
                setConfiguration: jest.fn()
            },
            FilterManager: {
                initialize: jest.fn(),
                applyFilters: jest.fn(),
                updateCounters: jest.fn(),
                getFilteredFiles: jest.fn()
            },
            CategoryManager: {
                initialize: jest.fn(),
                getAllCategories: jest.fn().mockReturnValue(['IA/ML', 'Negócios']),
                createCategory: jest.fn().mockReturnValue({ success: true })
            },
            AnalysisManager: {
                initialize: jest.fn().mockResolvedValue(true),
                addToQueue: jest.fn().mockReturnValue('queue-123'),
                processQueue: jest.fn(),
                getStats: jest.fn().mockReturnValue({ processed: 0, errors: 0 })
            },
            RAGExportManager: {
                initialize: jest.fn(),
                consolidateData: jest.fn(),
                exportToJSON: jest.fn(),
                processApprovedFiles: jest.fn()
            },
            QdrantService: {
                checkConnection: jest.fn().mockResolvedValue(true),
                createCollection: jest.fn().mockResolvedValue(true),
                insertPoints: jest.fn().mockResolvedValue({ success: true }),
                searchByText: jest.fn().mockResolvedValue([])
            },
            EmbeddingService: {
                initialize: jest.fn().mockResolvedValue(true),
                generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1))
            }
        };

        // Setup global KC object
        global.window.KnowledgeConsolidator = mockComponents;
    });

    describe('Step 1: Discovery Workflow', () => {
        test('should complete full discovery process', async () => {
            // Mock file discovery response
            const mockFiles = [
                {
                    id: 'file-1',
                    name: 'document1.md',
                    path: '/test/document1.md',
                    content: 'AI and machine learning content for analysis',
                    size: 1024,
                    lastModified: Date.now()
                },
                {
                    id: 'file-2',
                    name: 'document2.md',
                    path: '/test/document2.md',
                    content: 'Business strategy and decision making insights',
                    size: 2048,
                    lastModified: Date.now() - 86400000 // 1 day ago
                }
            ];

            mockComponents.DiscoveryManager.discoverFiles.mockResolvedValue({
                files: mockFiles,
                stats: { discovered: 2, processed: 2, errors: 0 }
            });

            // Simulate discovery configuration
            const discoveryConfig = {
                targetDirectory: '/test',
                fileTypes: ['.md', '.txt'],
                exclusionPatterns: ['temp', 'cache'],
                maxDepth: 3
            };

            // Execute discovery
            await mockComponents.DiscoveryManager.initialize();
            mockComponents.DiscoveryManager.setConfiguration(discoveryConfig);
            const result = await mockComponents.DiscoveryManager.discoverFiles();

            // Verify discovery completed successfully
            expect(result.files).toHaveLength(2);
            expect(result.stats.discovered).toBe(2);
            expect(result.stats.errors).toBe(0);

            // Verify state updates
            expect(mockComponents.AppState.set).toHaveBeenCalledWith('files', mockFiles);
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('discovery_completed', expect.any(Object));
        });

        test('should handle discovery errors gracefully', async () => {
            mockComponents.DiscoveryManager.discoverFiles.mockRejectedValue(new Error('Access denied'));

            await expect(mockComponents.DiscoveryManager.discoverFiles()).rejects.toThrow('Access denied');

            // Verify error handling
            expect(mockComponents.Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Discovery failed'),
                expect.any(Error)
            );
        });
    });

    describe('Step 2: Filtering and Preview Workflow', () => {
        test('should apply filters and update UI consistently', async () => {
            const mockFiles = [
                {
                    id: 'file-1',
                    name: 'high-relevance.md',
                    relevanceScore: 85,
                    categories: ['IA/ML'],
                    lastModified: Date.now()
                },
                {
                    id: 'file-2',
                    name: 'low-relevance.md',
                    relevanceScore: 25,
                    categories: [],
                    lastModified: Date.now() - 86400000
                },
                {
                    id: 'file-3',
                    name: 'medium-relevance.md',
                    relevanceScore: 60,
                    categories: ['Negócios'],
                    lastModified: Date.now() - 3600000
                }
            ];

            mockComponents.AppState.get.mockReturnValue(mockFiles);
            mockComponents.FilterManager.getFilteredFiles.mockImplementation((files, filters) => {
                // Simulate filtering logic
                if (filters.relevanceThreshold === 70) {
                    return files.filter(f => f.relevanceScore >= 70);
                }
                return files;
            });

            // Apply high relevance filter
            const filterConfig = {
                relevanceThreshold: 70,
                timeFilter: 'all',
                categoryFilter: 'all'
            };

            mockComponents.FilterManager.initialize();
            const filteredFiles = mockComponents.FilterManager.getFilteredFiles(mockFiles, filterConfig);

            expect(filteredFiles).toHaveLength(1);
            expect(filteredFiles[0].name).toBe('high-relevance.md');

            // Verify UI updates
            expect(mockComponents.FilterManager.updateCounters).toHaveBeenCalled();
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('filters_applied', expect.any(Object));
        });

        test('should maintain state consistency during filtering', async () => {
            const mockFiles = Array.from({ length: 100 }, (_, i) => ({
                id: `file-${i}`,
                name: `document${i}.md`,
                relevanceScore: Math.random() * 100,
                categories: i % 2 === 0 ? ['IA/ML'] : ['Negócios']
            }));

            mockComponents.AppState.get.mockReturnValue(mockFiles);

            // Apply multiple filter operations
            const filterOperations = [
                { relevanceThreshold: 50 },
                { categoryFilter: 'IA/ML' },
                { relevanceThreshold: 70 }
            ];

            for (const filter of filterOperations) {
                mockComponents.FilterManager.applyFilters(filter);
                
                // Verify state consistency after each operation
                expect(mockComponents.AppState.get).toHaveBeenCalled();
                expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('filters_applied', expect.any(Object));
            }
        });
    });

    describe('Step 3: AI Analysis Workflow', () => {
        test('should complete full AI analysis pipeline', async () => {
            const mockFiles = [
                {
                    id: 'file-1',
                    name: 'analysis-target.md',
                    content: 'This content discusses breakthrough AI technologies and their strategic implications.',
                    categories: ['IA/ML'],
                    approved: true
                },
                {
                    id: 'file-2',
                    name: 'business-doc.md',
                    content: 'Strategic business decisions and market analysis for future growth.',
                    categories: ['Negócios'],
                    approved: true
                }
            ];

            // Mock AI analysis results
            mockComponents.AnalysisManager.processQueue.mockResolvedValue([
                {
                    fileId: 'file-1',
                    success: true,
                    analysisType: 'Breakthrough Técnico',
                    relevanceScore: 90,
                    insights: ['AI breakthrough identified', 'Strategic implications noted'],
                    processingTime: 2500,
                    cost: 0.05
                },
                {
                    fileId: 'file-2',
                    success: true,
                    analysisType: 'Insight Estratégico',
                    relevanceScore: 85,
                    insights: ['Business strategy insights', 'Market opportunity identified'],
                    processingTime: 2200,
                    cost: 0.04
                }
            ]);

            // Execute AI analysis workflow
            await mockComponents.AnalysisManager.initialize();
            const queueId = mockComponents.AnalysisManager.addToQueue(mockFiles, {
                template: 'decisiveMoments',
                batchSize: 2
            });
            const results = await mockComponents.AnalysisManager.processQueue();

            // Verify analysis completed successfully
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
            expect(results[0].analysisType).toBe('Breakthrough Técnico');
            expect(results[1].analysisType).toBe('Insight Estratégico');

            // Verify state updates and events
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('analysis_started', expect.any(Object));
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('analysis_completed', expect.any(Object));
            expect(mockComponents.AppState.set).toHaveBeenCalledWith('files', expect.any(Array));
        });

        test('should handle mixed success/failure in analysis', async () => {
            const mockFiles = [
                { id: 'file-1', content: 'Good content', approved: true },
                { id: 'file-2', content: 'Problem content', approved: true },
                { id: 'file-3', content: 'Another good content', approved: true }
            ];

            mockComponents.AnalysisManager.processQueue.mockResolvedValue([
                { fileId: 'file-1', success: true, analysisType: 'Insight Estratégico', relevanceScore: 80 },
                { fileId: 'file-2', success: false, error: 'Analysis failed: Content too short' },
                { fileId: 'file-3', success: true, analysisType: 'Momento Decisivo', relevanceScore: 95 }
            ]);

            const results = await mockComponents.AnalysisManager.processQueue();

            expect(results).toHaveLength(3);
            expect(results.filter(r => r.success)).toHaveLength(2);
            expect(results.filter(r => !r.success)).toHaveLength(1);
            expect(results[1].error).toContain('Analysis failed');

            // Verify proper error handling and partial success
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('analysis_error', expect.objectContaining({
                fileId: 'file-2'
            }));
        });
    });

    describe('Step 4: Export and RAG Pipeline Workflow', () => {
        test('should complete full export workflow to Qdrant', async () => {
            const mockAnalyzedFiles = [
                {
                    id: 'file-1',
                    name: 'analyzed-doc1.md',
                    content: 'AI content with breakthrough insights',
                    analysisType: 'Breakthrough Técnico',
                    relevanceScore: 90,
                    categories: ['IA/ML'],
                    analyzed: true,
                    approved: true
                },
                {
                    id: 'file-2',
                    name: 'analyzed-doc2.md',
                    content: 'Business strategy document with key decisions',
                    analysisType: 'Momento Decisivo',
                    relevanceScore: 85,
                    categories: ['Negócios'],
                    analyzed: true,
                    approved: true
                }
            ];

            // Mock export pipeline responses
            mockComponents.RAGExportManager.consolidateData.mockResolvedValue({
                points: [
                    {
                        id: 'point-1',
                        vector: new Array(768).fill(0.1),
                        payload: {
                            text: 'AI content with breakthrough insights',
                            file_id: 'file-1',
                            category: 'IA/ML',
                            analysis_type: 'Breakthrough Técnico',
                            relevance_score: 90
                        }
                    },
                    {
                        id: 'point-2',
                        vector: new Array(768).fill(0.2),
                        payload: {
                            text: 'Business strategy document with key decisions',
                            file_id: 'file-2',
                            category: 'Negócios',
                            analysis_type: 'Momento Decisivo',
                            relevance_score: 85
                        }
                    }
                ],
                stats: {
                    totalFiles: 2,
                    totalChunks: 2,
                    avgEmbeddingTime: 150,
                    totalEmbeddingTime: 300
                }
            });

            mockComponents.RAGExportManager.processApprovedFiles.mockResolvedValue({
                success: true,
                processed: 2,
                inserted: 2,
                errors: 0,
                points: ['point-1', 'point-2']
            });

            // Execute export workflow
            await mockComponents.RAGExportManager.initialize();
            
            // Step 1: Consolidate data
            const consolidatedData = await mockComponents.RAGExportManager.consolidateData();
            expect(consolidatedData.points).toHaveLength(2);
            expect(consolidatedData.stats.totalFiles).toBe(2);

            // Step 2: Process to Qdrant
            const processingResult = await mockComponents.RAGExportManager.processApprovedFiles();
            expect(processingResult.success).toBe(true);
            expect(processingResult.processed).toBe(2);
            expect(processingResult.inserted).toBe(2);

            // Verify Qdrant operations
            expect(mockComponents.QdrantService.checkConnection).toHaveBeenCalled();
            expect(mockComponents.QdrantService.insertPoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'point-1' }),
                    expect.objectContaining({ id: 'point-2' })
                ])
            );

            // Verify state and events
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('export_started', expect.any(Object));
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('export_completed', expect.any(Object));
        });

        test('should handle export failures gracefully', async () => {
            mockComponents.QdrantService.checkConnection.mockResolvedValue(false);
            mockComponents.RAGExportManager.processApprovedFiles.mockRejectedValue(
                new Error('Qdrant connection failed')
            );

            await expect(mockComponents.RAGExportManager.processApprovedFiles()).rejects.toThrow('Qdrant connection failed');

            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('export_error', expect.objectContaining({
                error: 'Qdrant connection failed'
            }));
        });
    });

    describe('End-to-End Workflow Integration', () => {
        test('should complete full workflow from discovery to export', async () => {
            // Step 1: Discovery
            const discoveredFiles = [
                {
                    id: 'file-1',
                    name: 'ai-research.md',
                    content: 'Cutting-edge AI research with breakthrough findings in machine learning.',
                    path: '/research/ai-research.md',
                    size: 2048,
                    lastModified: Date.now()
                },
                {
                    id: 'file-2',
                    name: 'business-plan.md',
                    content: 'Strategic business plan with key decisions for market expansion.',
                    path: '/business/business-plan.md',
                    size: 3072,
                    lastModified: Date.now() - 3600000
                }
            ];

            mockComponents.DiscoveryManager.discoverFiles.mockResolvedValue({
                files: discoveredFiles,
                stats: { discovered: 2, processed: 2, errors: 0 }
            });

            // Step 2: Analysis
            mockComponents.AnalysisManager.processQueue.mockResolvedValue([
                {
                    fileId: 'file-1',
                    success: true,
                    analysisType: 'Breakthrough Técnico',
                    relevanceScore: 95,
                    insights: ['Revolutionary AI findings']
                },
                {
                    fileId: 'file-2',
                    success: true,
                    analysisType: 'Momento Decisivo',
                    relevanceScore: 88,
                    insights: ['Strategic business decisions']
                }
            ]);

            // Step 3: Export
            mockComponents.RAGExportManager.processApprovedFiles.mockResolvedValue({
                success: true,
                processed: 2,
                inserted: 2,
                errors: 0
            });

            // Execute complete workflow
            const workflowSteps = [];

            // 1. Discovery
            await mockComponents.DiscoveryManager.initialize();
            const discoveryResult = await mockComponents.DiscoveryManager.discoverFiles();
            workflowSteps.push({ step: 'discovery', success: true, count: discoveryResult.files.length });

            // 2. AI Analysis
            await mockComponents.AnalysisManager.initialize();
            mockComponents.AnalysisManager.addToQueue(discoveryResult.files);
            const analysisResults = await mockComponents.AnalysisManager.processQueue();
            workflowSteps.push({ 
                step: 'analysis', 
                success: analysisResults.every(r => r.success),
                count: analysisResults.filter(r => r.success).length
            });

            // 3. Export
            await mockComponents.RAGExportManager.initialize();
            const exportResult = await mockComponents.RAGExportManager.processApprovedFiles();
            workflowSteps.push({ step: 'export', success: exportResult.success, count: exportResult.inserted });

            // Verify complete workflow success
            expect(workflowSteps).toHaveLength(3);
            expect(workflowSteps.every(step => step.success)).toBe(true);
            expect(workflowSteps[0].count).toBe(2); // Discovery
            expect(workflowSteps[1].count).toBe(2); // Analysis
            expect(workflowSteps[2].count).toBe(2); // Export

            // Verify cross-component state consistency
            expect(mockComponents.AppState.set).toHaveBeenCalledWith('files', expect.any(Array));
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('workflow_completed', expect.objectContaining({
                totalSteps: 3,
                successfulSteps: 3,
                totalFilesProcessed: 2
            }));
        });

        test('should handle workflow interruption and recovery', async () => {
            // Simulate discovery success, analysis failure, then recovery
            mockComponents.DiscoveryManager.discoverFiles.mockResolvedValue({
                files: [{ id: 'file-1', name: 'test.md', content: 'test content' }],
                stats: { discovered: 1, processed: 1, errors: 0 }
            });

            // First analysis attempt fails
            mockComponents.AnalysisManager.processQueue
                .mockRejectedValueOnce(new Error('Network timeout'))
                .mockResolvedValueOnce([{
                    fileId: 'file-1',
                    success: true,
                    analysisType: 'Aprendizado Geral',
                    relevanceScore: 70
                }]);

            // Execute workflow with recovery
            const discoveryResult = await mockComponents.DiscoveryManager.discoverFiles();
            expect(discoveryResult.files).toHaveLength(1);

            // First analysis attempt fails
            await expect(mockComponents.AnalysisManager.processQueue()).rejects.toThrow('Network timeout');

            // Recovery attempt succeeds
            const retryResults = await mockComponents.AnalysisManager.processQueue();
            expect(retryResults[0].success).toBe(true);

            // Verify error handling and recovery events
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('workflow_error', expect.any(Object));
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('workflow_recovered', expect.any(Object));
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle large file volumes efficiently', async () => {
            const largeFileSet = Array.from({ length: 500 }, (_, i) => ({
                id: `file-${i}`,
                name: `document${i}.md`,
                content: `Content for document ${i} with relevant information`,
                relevanceScore: Math.random() * 100,
                categories: ['IA/ML', 'Negócios'][i % 2]
            }));

            mockComponents.DiscoveryManager.discoverFiles.mockResolvedValue({
                files: largeFileSet,
                stats: { discovered: 500, processed: 500, errors: 0 }
            });

            // Measure discovery performance
            const startTime = Date.now();
            const result = await mockComponents.DiscoveryManager.discoverFiles();
            const endTime = Date.now();

            expect(result.files).toHaveLength(500);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

            // Verify batch processing
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('discovery_progress', expect.any(Object));
        });

        test('should maintain responsiveness during long operations', async () => {
            let progressEvents = 0;
            mockComponents.EventBus.emit.mockImplementation((event) => {
                if (event.includes('progress')) {
                    progressEvents++;
                }
            });

            // Simulate long-running operation with progress
            mockComponents.AnalysisManager.processQueue.mockImplementation(async () => {
                // Simulate batch processing with progress events
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    mockComponents.EventBus.emit('analysis_progress', { completed: i + 1, total: 10 });
                }
                return Array.from({ length: 10 }, (_, i) => ({
                    fileId: `file-${i}`,
                    success: true,
                    analysisType: 'Aprendizado Geral',
                    relevanceScore: 70
                }));
            });

            const results = await mockComponents.AnalysisManager.processQueue();

            expect(results).toHaveLength(10);
            expect(progressEvents).toBe(10); // Progress events emitted
        });
    });

    describe('Data Consistency and State Management', () => {
        test('should maintain data integrity across all workflow steps', async () => {
            const fileId = 'integrity-test-file';
            let fileState = {
                id: fileId,
                name: 'test.md',
                content: 'Test content for integrity validation',
                relevanceScore: 0,
                categories: [],
                analyzed: false,
                approved: false
            };

            // Track state changes
            const stateHistory = [];
            mockComponents.AppState.set.mockImplementation((key, value) => {
                if (key === 'files') {
                    const file = value.find(f => f.id === fileId);
                    if (file) {
                        stateHistory.push({ ...file, timestamp: Date.now() });
                    }
                }
            });

            // Simulate workflow state changes
            // 1. Discovery
            fileState = { ...fileState, relevanceScore: 75 };
            mockComponents.AppState.set('files', [fileState]);

            // 2. Analysis
            fileState = { ...fileState, analyzed: true, analysisType: 'Insight Estratégico' };
            mockComponents.AppState.set('files', [fileState]);

            // 3. Approval
            fileState = { ...fileState, approved: true };
            mockComponents.AppState.set('files', [fileState]);

            // 4. Categorization
            fileState = { ...fileState, categories: ['IA/ML'] };
            mockComponents.AppState.set('files', [fileState]);

            // Verify state progression
            expect(stateHistory).toHaveLength(4);
            expect(stateHistory[0].relevanceScore).toBe(75);
            expect(stateHistory[1].analyzed).toBe(true);
            expect(stateHistory[2].approved).toBe(true);
            expect(stateHistory[3].categories).toContain('IA/ML');

            // Verify no data corruption
            stateHistory.forEach(state => {
                expect(state.id).toBe(fileId);
                expect(state.name).toBe('test.md');
                expect(state.content).toBe('Test content for integrity validation');
            });
        });
    });
});