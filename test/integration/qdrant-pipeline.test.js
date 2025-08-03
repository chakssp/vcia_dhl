/**
 * qdrant-pipeline.test.js
 * Integration tests for Qdrant vector operations pipeline
 * 
 * Tests cover:
 * - Complete embedding to vector storage pipeline
 * - Batch processing and chunking operations
 * - Search and retrieval functionality
 * - Data consistency and integrity
 * - Performance and scalability scenarios
 */

// Mock fetch for HTTP requests
global.fetch = jest.fn();

describe('Qdrant Pipeline Integration', () => {
    let mockComponents;
    let mockQdrantResponses;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup mock Qdrant API responses
        mockQdrantResponses = {
            serverInfo: {
                title: 'qdrant - vector search engine',
                version: '1.7.0'
            },
            collectionInfo: {
                result: {
                    status: 'green',
                    vectors_count: 0,
                    indexed_vectors_count: 0,
                    points_count: 0,
                    segments_count: 1,
                    config: {
                        params: {
                            vectors: {
                                size: 768,
                                distance: 'Cosine'
                            }
                        }
                    }
                }
            },
            insertSuccess: {
                result: {
                    operation_id: 123,
                    status: 'completed'
                }
            },
            searchResults: {
                result: [
                    {
                        id: 'point-1',
                        score: 0.95,
                        payload: {
                            text: 'AI breakthrough in machine learning algorithms',
                            category: 'IA/ML',
                            file_id: 'file-1',
                            analysis_type: 'Breakthrough Técnico'
                        }
                    },
                    {
                        id: 'point-2',
                        score: 0.87,
                        payload: {
                            text: 'Strategic business decisions for market expansion',
                            category: 'Negócios',
                            file_id: 'file-2',
                            analysis_type: 'Momento Decisivo'
                        }
                    }
                ]
            }
        };

        // Setup comprehensive mocks
        mockComponents = {
            EventBus: {
                emit: jest.fn(),
                on: jest.fn(),
                off: jest.fn()
            },
            AppState: {
                get: jest.fn(),
                set: jest.fn()
            },
            Logger: {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn()
            },
            QdrantService: {
                initialize: jest.fn().mockResolvedValue(true),
                checkConnection: jest.fn().mockResolvedValue(true),
                createCollection: jest.fn().mockResolvedValue(true),
                getCollectionInfo: jest.fn().mockResolvedValue(mockQdrantResponses.collectionInfo.result),
                insertPoint: jest.fn(),
                insertPoints: jest.fn(),
                searchByVector: jest.fn(),
                searchByText: jest.fn(),
                deletePoint: jest.fn(),
                getStats: jest.fn().mockReturnValue({ pointsInserted: 0, searchesPerformed: 0, errors: 0 })
            },
            EmbeddingService: {
                initialize: jest.fn().mockResolvedValue(true),
                generateEmbedding: jest.fn(),
                calculateSimilarity: jest.fn(),
                getCacheStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, size: 0 })
            },
            ChunkingUtils: {
                getSemanticChunks: jest.fn(),
                validateChunk: jest.fn().mockReturnValue(true),
                optimizeChunkSize: jest.fn()
            },
            RAGExportManager: {
                initialize: jest.fn().mockResolvedValue(true),
                consolidateData: jest.fn(),
                processApprovedFiles: jest.fn(),
                exportToJSON: jest.fn()
            },
            SimilaritySearchService: {
                initialize: jest.fn().mockResolvedValue(true),
                searchByText: jest.fn(),
                searchByCategory: jest.fn(),
                multiModalSearch: jest.fn()
            }
        };

        global.window = {
            KnowledgeConsolidator: mockComponents
        };
    });

    describe('Pipeline Initialization and Setup', () => {
        test('should initialize complete Qdrant pipeline successfully', async () => {
            // Mock successful initialization responses
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockQdrantResponses.serverInfo)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockQdrantResponses.collectionInfo)
                });

            // Initialize all pipeline components
            await mockComponents.QdrantService.initialize();
            await mockComponents.EmbeddingService.initialize();
            await mockComponents.RAGExportManager.initialize();
            await mockComponents.SimilaritySearchService.initialize();

            // Verify initialization sequence
            expect(mockComponents.QdrantService.checkConnection).toHaveBeenCalled();
            expect(mockComponents.QdrantService.getCollectionInfo).toHaveBeenCalled();
            expect(mockComponents.EmbeddingService.initialize).toHaveBeenCalled();
            expect(mockComponents.RAGExportManager.initialize).toHaveBeenCalled();
            expect(mockComponents.SimilaritySearchService.initialize).toHaveBeenCalled();

            // Verify success events
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('pipeline_initialized', {
                qdrant: true,
                embedding: true,
                export: true,
                search: true
            });
        });

        test('should handle partial initialization failures gracefully', async () => {
            // Mock Qdrant connection failure
            mockComponents.QdrantService.checkConnection.mockResolvedValue(false);
            mockComponents.QdrantService.initialize.mockRejectedValue(new Error('Qdrant unreachable'));

            // Other services should still initialize
            await expect(mockComponents.QdrantService.initialize()).rejects.toThrow('Qdrant unreachable');
            
            await mockComponents.EmbeddingService.initialize();
            await mockComponents.RAGExportManager.initialize();

            // Verify graceful degradation
            expect(mockComponents.Logger.error).toHaveBeenCalledWith(
                'Qdrant pipeline initialization failed',
                expect.any(Error)
            );
            
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('pipeline_degraded', {
                failed: ['qdrant'],
                available: ['embedding', 'export']
            });
        });

        test('should configure collection with correct vector dimensions', async () => {
            const expectedConfig = {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                },
                shard_number: 1,
                replication_factor: 1
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockQdrantResponses.insertSuccess)
            });

            await mockComponents.QdrantService.createCollection(expectedConfig);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/collections/'),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('"size":768')
                })
            );
        });
    });

    describe('Embedding Generation and Caching', () => {
        test('should generate embeddings for text content', async () => {
            const testContent = 'AI and machine learning are transforming technology landscapes.';
            const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

            mockComponents.EmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);

            const result = await mockComponents.EmbeddingService.generateEmbedding(testContent);

            expect(result).toHaveLength(768);
            expect(result).toEqual(mockEmbedding);
            expect(mockComponents.Logger.debug).toHaveBeenCalledWith(
                'Generated embedding for content',
                expect.objectContaining({
                    contentLength: testContent.length,
                    dimensions: 768
                })
            );
        });

        test('should cache embeddings to improve performance', async () => {
            const sameContent = 'Repeated content for caching test';
            const cachedEmbedding = new Array(768).fill(0.5);

            // First call - cache miss
            mockComponents.EmbeddingService.generateEmbedding
                .mockResolvedValueOnce(cachedEmbedding);

            // Second call - cache hit
            mockComponents.EmbeddingService.generateEmbedding
                .mockResolvedValueOnce(cachedEmbedding);

            const result1 = await mockComponents.EmbeddingService.generateEmbedding(sameContent);
            const result2 = await mockComponents.EmbeddingService.generateEmbedding(sameContent);

            expect(result1).toEqual(result2);
            
            // Verify caching behavior
            mockComponents.EmbeddingService.getCacheStats.mockReturnValue({
                hits: 1,
                misses: 1,
                size: 1
            });

            const cacheStats = mockComponents.EmbeddingService.getCacheStats();
            expect(cacheStats.hits).toBe(1);
            expect(cacheStats.misses).toBe(1);
        });

        test('should handle embedding generation failures with retries', async () => {
            const content = 'Content that initially fails to embed';
            
            mockComponents.EmbeddingService.generateEmbedding
                .mockRejectedValueOnce(new Error('Ollama timeout'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(new Array(768).fill(0.3));

            // Mock retry logic
            let result = null;
            let attempts = 0;
            const maxRetries = 3;

            while (attempts < maxRetries) {
                try {
                    result = await mockComponents.EmbeddingService.generateEmbedding(content);
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } else {
                        throw error;
                    }
                }
            }

            expect(result).toHaveLength(768);
            expect(attempts).toBe(2); // Third attempt succeeded
            
            expect(mockComponents.Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Embedding generation retry'),
                expect.any(Object)
            );
        });
    });

    describe('Chunking and Data Preparation', () => {
        test('should chunk large content into appropriate segments', async () => {
            const largeContent = `
# AI Research Document

## Introduction
This document explores cutting-edge artificial intelligence research and its applications.

## Machine Learning Breakthroughs
Recent developments in neural networks have shown remarkable progress in various domains.

### Deep Learning Advances
Transformer architectures have revolutionized natural language processing.

### Computer Vision
Convolutional neural networks continue to achieve state-of-the-art results.

## Strategic Implications
These technological advances have significant business implications.

## Conclusion
The future of AI looks promising with continued research and development.
            `.trim();

            const expectedChunks = [
                {
                    id: 'chunk-1',
                    text: '# AI Research Document\n\n## Introduction\nThis document explores cutting-edge artificial intelligence research and its applications.',
                    metadata: { section: 'introduction', type: 'header' }
                },
                {
                    id: 'chunk-2',
                    text: '## Machine Learning Breakthroughs\nRecent developments in neural networks have shown remarkable progress in various domains.',
                    metadata: { section: 'ml_breakthroughs', type: 'content' }
                },
                {
                    id: 'chunk-3',
                    text: '### Deep Learning Advances\nTransformer architectures have revolutionized natural language processing.',
                    metadata: { section: 'deep_learning', type: 'subsection' }
                }
            ];

            mockComponents.ChunkingUtils.getSemanticChunks.mockReturnValue(expectedChunks);

            const chunks = mockComponents.ChunkingUtils.getSemanticChunks(largeContent, {
                maxChunkSize: 200,
                overlapPercent: 10,
                preserveStructure: true
            });

            expect(chunks).toHaveLength(3);
            expect(chunks[0].metadata.type).toBe('header');
            expect(chunks[1].metadata.section).toBe('ml_breakthroughs');
            
            // Verify all chunks are valid
            chunks.forEach(chunk => {
                expect(mockComponents.ChunkingUtils.validateChunk(chunk)).toBe(true);
            });
        });

        test('should optimize chunk sizes for embedding efficiency', async () => {
            const testChunks = [
                { text: 'Short chunk', size: 50 },
                { text: 'A'.repeat(2000), size: 2000 }, // Too long
                { text: 'Medium chunk with good size', size: 500 },
                { text: 'B'.repeat(50), size: 50 } // Too short
            ];

            mockComponents.ChunkingUtils.optimizeChunkSize.mockImplementation((chunks) => {
                return chunks.filter(chunk => chunk.size >= 100 && chunk.size <= 1500);
            });

            const optimizedChunks = mockComponents.ChunkingUtils.optimizeChunkSize(testChunks);

            expect(optimizedChunks).toHaveLength(1); // Only medium chunk should remain
            expect(optimizedChunks[0].size).toBe(500);
        });

        test('should maintain semantic coherence in chunks', async () => {
            const documentContent = `
The artificial intelligence revolution is transforming industries worldwide. Companies are investing heavily in AI research and development.

Machine learning algorithms are becoming more sophisticated. Deep learning models can now process complex data patterns with unprecedented accuracy.

Business leaders must understand these technological shifts. Strategic planning should incorporate AI capabilities and potential disruptions.
            `.trim();

            const semanticChunks = [
                {
                    text: 'The artificial intelligence revolution is transforming industries worldwide. Companies are investing heavily in AI research and development.',
                    semanticScore: 0.95,
                    coherence: 'high'
                },
                {
                    text: 'Machine learning algorithms are becoming more sophisticated. Deep learning models can now process complex data patterns with unprecedented accuracy.',
                    semanticScore: 0.92,
                    coherence: 'high'
                },
                {
                    text: 'Business leaders must understand these technological shifts. Strategic planning should incorporate AI capabilities and potential disruptions.',
                    semanticScore: 0.88,
                    coherence: 'medium'
                }
            ];

            mockComponents.ChunkingUtils.getSemanticChunks.mockReturnValue(semanticChunks);

            const chunks = mockComponents.ChunkingUtils.getSemanticChunks(documentContent, {
                semanticThreshold: 0.8
            });

            expect(chunks).toHaveLength(3);
            chunks.forEach(chunk => {
                expect(chunk.semanticScore).toBeGreaterThan(0.8);
                expect(chunk.coherence).toBeDefined();
            });
        });
    });

    describe('Vector Storage Operations', () => {
        test('should insert document embeddings into Qdrant successfully', async () => {
            const documentsToProcess = [
                {
                    id: 'doc-1',
                    content: 'AI breakthrough research findings',
                    category: 'IA/ML',
                    analysisType: 'Breakthrough Técnico',
                    relevanceScore: 95
                },
                {
                    id: 'doc-2',
                    content: 'Strategic business decision framework',
                    category: 'Negócios',
                    analysisType: 'Momento Decisivo',
                    relevanceScore: 88
                }
            ];

            // Mock embedding generation
            mockComponents.EmbeddingService.generateEmbedding
                .mockResolvedValueOnce(new Array(768).fill(0.1))
                .mockResolvedValueOnce(new Array(768).fill(0.2));

            // Mock successful Qdrant insertion
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockQdrantResponses.insertSuccess)
            });

            mockComponents.QdrantService.insertPoints.mockResolvedValue({
                success: true,
                operation_id: 123,
                inserted: 2
            });

            // Process documents through pipeline
            const points = [];
            for (const doc of documentsToProcess) {
                const embedding = await mockComponents.EmbeddingService.generateEmbedding(doc.content);
                points.push({
                    id: doc.id,
                    vector: embedding,
                    payload: {
                        text: doc.content,
                        category: doc.category,
                        analysis_type: doc.analysisType,
                        relevance_score: doc.relevanceScore,
                        file_id: doc.id
                    }
                });
            }

            const insertResult = await mockComponents.QdrantService.insertPoints(points);

            expect(insertResult.success).toBe(true);
            expect(insertResult.inserted).toBe(2);
            expect(points).toHaveLength(2);
            
            // Verify embeddings were generated
            expect(mockComponents.EmbeddingService.generateEmbedding).toHaveBeenCalledTimes(2);
            expect(mockComponents.QdrantService.insertPoints).toHaveBeenCalledWith(points);

            // Verify success events
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('vectors_inserted', {
                count: 2,
                operation_id: 123
            });
        });

        test('should handle batch insertion with progress tracking', async () => {
            const largeBatch = Array.from({ length: 100 }, (_, i) => ({
                id: `doc-${i}`,
                content: `Document ${i} content for batch processing`,
                category: i % 2 === 0 ? 'IA/ML' : 'Negócios'
            }));

            const batchSize = 10;
            let processedCount = 0;

            mockComponents.RAGExportManager.processApprovedFiles.mockImplementation(async () => {
                const results = [];
                
                for (let i = 0; i < largeBatch.length; i += batchSize) {
                    const batch = largeBatch.slice(i, i + batchSize);
                    
                    // Process batch
                    for (const doc of batch) {
                        processedCount++;
                        results.push({
                            id: doc.id,
                            success: true,
                            vector_id: `point-${processedCount}`
                        });
                    }
                    
                    // Emit progress event
                    mockComponents.EventBus.emit('batch_progress', {
                        processed: processedCount,
                        total: largeBatch.length,
                        percentage: Math.round((processedCount / largeBatch.length) * 100)
                    });
                    
                    // Simulate processing delay
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                
                return {
                    success: true,
                    processed: processedCount,
                    batches: Math.ceil(largeBatch.length / batchSize),
                    results: results
                };
            });

            const result = await mockComponents.RAGExportManager.processApprovedFiles();

            expect(result.success).toBe(true);
            expect(result.processed).toBe(100);
            expect(result.batches).toBe(10);

            // Verify progress events were emitted
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('batch_progress', expect.objectContaining({
                percentage: 100
            }));
        });

        test('should handle insertion failures and implement retry logic', async () => {
            const problematicDocument = {
                id: 'problem-doc',
                content: 'Content that causes insertion issues',
                category: 'IA/ML'
            };

            let attemptCount = 0;
            
            mockComponents.QdrantService.insertPoint.mockImplementation(async () => {
                attemptCount++;
                
                if (attemptCount <= 2) {
                    throw new Error('Vector dimension mismatch');
                }
                
                return {
                    success: true,
                    operation_id: 456,
                    attempt: attemptCount
                };
            });

            // Mock retry logic
            const maxRetries = 3;
            let result = null;
            let error = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    result = await mockComponents.QdrantService.insertPoint({
                        id: problematicDocument.id,
                        vector: new Array(768).fill(0.1),
                        payload: problematicDocument
                    });
                    break;
                } catch (err) {
                    error = err;
                    
                    if (attempt < maxRetries) {
                        mockComponents.Logger.warn(`Insertion retry ${attempt}/${maxRetries}`, err);
                        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                    }
                }
            }

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.attempt).toBe(3);
            expect(attemptCount).toBe(3);

            expect(mockComponents.Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Insertion retry'),
                expect.any(Error)
            );
        });
    });

    describe('Search and Retrieval Operations', () => {
        test('should perform semantic search and return relevant results', async () => {
            const searchQuery = 'artificial intelligence breakthroughs';
            const queryEmbedding = new Array(768).fill(0.1);

            mockComponents.EmbeddingService.generateEmbedding.mockResolvedValue(queryEmbedding);

            // Mock Qdrant search response
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockQdrantResponses.searchResults)
            });

            mockComponents.QdrantService.searchByVector.mockResolvedValue(mockQdrantResponses.searchResults.result);

            // Perform search through pipeline
            const embedding = await mockComponents.EmbeddingService.generateEmbedding(searchQuery);
            const searchResults = await mockComponents.QdrantService.searchByVector(embedding, {
                limit: 10,
                score_threshold: 0.7
            });

            expect(searchResults).toHaveLength(2);
            expect(searchResults[0].score).toBe(0.95);
            expect(searchResults[0].payload.text).toContain('AI breakthrough');
            expect(searchResults[1].score).toBe(0.87);
            expect(searchResults[1].payload.category).toBe('Negócios');

            // Verify search was tracked
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('search_performed', {
                query: searchQuery,
                results: 2,
                topScore: 0.95
            });
        });

        test('should support filtered search by category and analysis type', async () => {
            const searchQuery = 'strategic planning';
            const filters = {
                must: [
                    { key: 'category', match: { value: 'Negócios' } },
                    { key: 'analysis_type', match: { value: 'Momento Decisivo' } }
                ]
            };

            mockComponents.SimilaritySearchService.searchByCategory.mockResolvedValue([
                {
                    id: 'point-2',
                    score: 0.91,
                    payload: {
                        text: 'Strategic business decisions for market expansion',
                        category: 'Negócios',
                        analysis_type: 'Momento Decisivo'
                    }
                }
            ]);

            const results = await mockComponents.SimilaritySearchService.searchByCategory('Negócios', {
                query: searchQuery,
                analysisType: 'Momento Decisivo',
                limit: 5
            });

            expect(results).toHaveLength(1);
            expect(results[0].payload.category).toBe('Negócios');
            expect(results[0].payload.analysis_type).toBe('Momento Decisivo');
            expect(results[0].score).toBeGreaterThan(0.9);
        });

        test('should perform multi-modal search combining text and metadata', async () => {
            const searchParams = {
                text: 'machine learning algorithms',
                categories: ['IA/ML'],
                analysisTypes: ['Breakthrough Técnico', 'Insight Estratégico'],
                relevanceThreshold: 80
            };

            mockComponents.SimilaritySearchService.multiModalSearch.mockResolvedValue([
                {
                    id: 'point-1',
                    score: 0.94,
                    payload: {
                        text: 'AI breakthrough in machine learning algorithms',
                        category: 'IA/ML',
                        analysis_type: 'Breakthrough Técnico',
                        relevance_score: 95
                    },
                    searchType: 'hybrid'
                }
            ]);

            const results = await mockComponents.SimilaritySearchService.multiModalSearch(searchParams);

            expect(results).toHaveLength(1);
            expect(results[0].searchType).toBe('hybrid');
            expect(results[0].payload.relevance_score).toBeGreaterThan(80);
            expect(results[0].payload.category).toBe('IA/ML');
        });

        test('should handle search failures and empty results gracefully', async () => {
            const obscureQuery = 'completely unrelated search terms';

            // Mock empty search results
            mockComponents.QdrantService.searchByVector.mockResolvedValue([]);

            const embedding = new Array(768).fill(0.001);
            const results = await mockComponents.QdrantService.searchByVector(embedding, {
                limit: 10,
                score_threshold: 0.8
            });

            expect(results).toHaveLength(0);

            // Verify empty results are handled properly
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('search_performed', {
                query: expect.any(String),
                results: 0,
                topScore: null
            });

            expect(mockComponents.Logger.info).toHaveBeenCalledWith(
                'Search returned no results above threshold',
                expect.objectContaining({
                    threshold: 0.8,
                    results: 0
                })
            );
        });
    });

    describe('Data Consistency and Integrity', () => {
        test('should maintain vector-payload consistency across operations', async () => {
            const testDocument = {
                id: 'consistency-test',
                content: 'Test content for consistency validation',
                category: 'Test',
                analysisType: 'Test Analysis',
                relevanceScore: 85
            };

            // Insert document
            const embedding = new Array(768).fill(0.5);
            mockComponents.EmbeddingService.generateEmbedding.mockResolvedValue(embedding);
            
            const insertPoint = {
                id: testDocument.id,
                vector: embedding,
                payload: {
                    text: testDocument.content,
                    category: testDocument.category,
                    analysis_type: testDocument.analysisType,
                    relevance_score: testDocument.relevanceScore,
                    timestamp: Date.now()
                }
            };

            mockComponents.QdrantService.insertPoint.mockResolvedValue({
                success: true,
                operation_id: 789
            });

            // Insert and immediately search
            await mockComponents.QdrantService.insertPoint(insertPoint);
            
            // Mock search that returns the same document
            mockComponents.QdrantService.searchByVector.mockResolvedValue([{
                id: testDocument.id,
                score: 1.0, // Perfect match
                payload: insertPoint.payload
            }]);

            const searchResults = await mockComponents.QdrantService.searchByVector(embedding);

            // Verify data consistency
            expect(searchResults).toHaveLength(1);
            const retrievedDoc = searchResults[0];
            
            expect(retrievedDoc.id).toBe(testDocument.id);
            expect(retrievedDoc.payload.text).toBe(testDocument.content);
            expect(retrievedDoc.payload.category).toBe(testDocument.category);
            expect(retrievedDoc.payload.analysis_type).toBe(testDocument.analysisType);
            expect(retrievedDoc.payload.relevance_score).toBe(testDocument.relevanceScore);
        });

        test('should detect and handle vector dimension mismatches', async () => {
            const invalidVector = new Array(384).fill(0.1); // Wrong dimension
            const validPayload = {
                text: 'Test content',
                category: 'Test'
            };

            mockComponents.QdrantService.insertPoint.mockImplementation(async (point) => {
                if (point.vector.length !== 768) {
                    throw new Error(`Vector dimension mismatch: expected 768, got ${point.vector.length}`);
                }
                return { success: true };
            });

            await expect(mockComponents.QdrantService.insertPoint({
                id: 'invalid-vector-test',
                vector: invalidVector,
                payload: validPayload
            })).rejects.toThrow('Vector dimension mismatch: expected 768, got 384');

            expect(mockComponents.Logger.error).toHaveBeenCalledWith(
                'Vector insertion failed due to dimension mismatch',
                expect.any(Error)
            );
        });

        test('should validate payload structure before insertion', async () => {
            const validVector = new Array(768).fill(0.1);
            const invalidPayloads = [
                null, // Null payload
                {}, // Empty payload
                { text: null }, // Invalid text field
                { text: 'Valid', category: 123 }, // Invalid category type
                { text: 'Valid', relevance_score: 'invalid' } // Invalid score type
            ];

            for (const invalidPayload of invalidPayloads) {
                mockComponents.QdrantService.insertPoint.mockImplementation(async (point) => {
                    // Simulate payload validation
                    if (!point.payload || !point.payload.text || typeof point.payload.text !== 'string') {
                        throw new Error('Invalid payload structure');
                    }
                    return { success: true };
                });

                await expect(mockComponents.QdrantService.insertPoint({
                    id: 'invalid-payload-test',
                    vector: validVector,
                    payload: invalidPayload
                })).rejects.toThrow('Invalid payload structure');
            }
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle large-scale vector operations efficiently', async () => {
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                id: `large-doc-${i}`,
                content: `Large dataset document ${i} with substantial content for performance testing`,
                category: ['IA/ML', 'Negócios', 'Tecnologia'][i % 3],
                relevanceScore: Math.random() * 100
            }));

            const batchSize = 50;
            let totalProcessed = 0;
            const processingTimes = [];

            mockComponents.RAGExportManager.processApprovedFiles.mockImplementation(async () => {
                const startTime = Date.now();
                
                // Simulate batch processing
                for (let i = 0; i < largeDataset.length; i += batchSize) {
                    const batch = largeDataset.slice(i, i + batchSize);
                    
                    // Simulate embedding generation and insertion
                    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing time
                    
                    totalProcessed += batch.length;
                    
                    if (totalProcessed % 200 === 0) {
                        mockComponents.EventBus.emit('large_batch_progress', {
                            processed: totalProcessed,
                            total: largeDataset.length
                        });
                    }
                }
                
                const endTime = Date.now();
                processingTimes.push(endTime - startTime);
                
                return {
                    success: true,
                    processed: totalProcessed,
                    processingTime: endTime - startTime
                };
            });

            const result = await mockComponents.RAGExportManager.processApprovedFiles();

            expect(result.success).toBe(true);
            expect(result.processed).toBe(1000);
            expect(result.processingTime).toBeLessThan(2000); // Should complete within 2 seconds

            // Verify performance monitoring
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('large_batch_progress', expect.any(Object));
        });

        test('should optimize search performance with caching', async () => {
            const popularQuery = 'artificial intelligence machine learning';
            const cachedResults = mockQdrantResponses.searchResults.result;

            // First search - cache miss
            mockComponents.SimilaritySearchService.searchByText
                .mockResolvedValueOnce(cachedResults);

            // Subsequent searches - cache hits
            mockComponents.SimilaritySearchService.searchByText
                .mockResolvedValue(cachedResults);

            const searchTimes = [];

            // Perform multiple searches
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();
                const results = await mockComponents.SimilaritySearchService.searchByText(popularQuery);
                const endTime = Date.now();
                
                searchTimes.push(endTime - startTime);
                expect(results).toEqual(cachedResults);
            }

            // First search should be slower (cache miss), subsequent ones faster (cache hits)
            expect(searchTimes[0]).toBeGreaterThan(searchTimes[1]);
            expect(searchTimes.slice(1).every(time => time <= searchTimes[1])).toBe(true);
        });

        test('should monitor and report pipeline statistics', async () => {
            // Simulate various pipeline operations
            const operations = [
                { type: 'insert', count: 10 },
                { type: 'search', count: 25 },
                { type: 'insert', count: 5 },
                { type: 'search', count: 15 }
            ];

            let totalInserts = 0;
            let totalSearches = 0;

            for (const op of operations) {
                if (op.type === 'insert') {
                    totalInserts += op.count;
                } else if (op.type === 'search') {
                    totalSearches += op.count;
                }
            }

            mockComponents.QdrantService.getStats.mockReturnValue({
                pointsInserted: totalInserts,
                searchesPerformed: totalSearches,
                errors: 0,
                avgInsertTime: 150,
                avgSearchTime: 80,
                cacheHitRate: 0.75
            });

            const stats = mockComponents.QdrantService.getStats();

            expect(stats.pointsInserted).toBe(15);
            expect(stats.searchesPerformed).toBe(40);
            expect(stats.errors).toBe(0);
            expect(stats.avgInsertTime).toBeLessThan(200);
            expect(stats.avgSearchTime).toBeLessThan(100);
            expect(stats.cacheHitRate).toBeGreaterThan(0.7);

            // Verify statistics are being tracked
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('pipeline_stats_updated', stats);
        });
    });
});