/**
 * QdrantService.test.js
 * Unit tests for QdrantService - Vector Database Integration
 * 
 * Tests cover:
 * - Connection management and health checks
 * - Collection operations (create, info, delete)
 * - Point operations (insert, search, delete)
 * - Error handling and retry logic
 * - Configuration and initialization
 */

// Mock fetch for HTTP requests
global.fetch = jest.fn();

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

// Setup global mocks
global.window = {
    KnowledgeConsolidator: {
        Logger: mockLogger
    }
};

describe('QdrantService', () => {
    let qdrantService;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        global.fetch.mockClear();
        
        // Import and create instance
        require('../../../js/services/QdrantService.js');
        qdrantService = new window.QdrantService();
    });

    describe('Initialization and Configuration', () => {
        test('should initialize with default configuration', () => {
            expect(qdrantService.config.baseUrl).toBe('http://qdr.vcia.com.br:6333');
            expect(qdrantService.config.collectionName).toBe('knowledge_consolidator');
            expect(qdrantService.config.vectorSize).toBe(768);
            expect(qdrantService.config.distance).toBe('Cosine');
            expect(qdrantService.initialized).toBe(false);
        });

        test('should update configuration', () => {
            const newConfig = {
                baseUrl: 'http://localhost:6333',
                vectorSize: 384,
                distance: 'Euclid'
            };

            qdrantService.updateConfig(newConfig);

            expect(qdrantService.config.baseUrl).toBe('http://localhost:6333');
            expect(qdrantService.config.vectorSize).toBe(384);
            expect(qdrantService.config.distance).toBe('Euclid');
        });

        test('should validate configuration on update', () => {
            const invalidConfig = {
                vectorSize: -1, // Invalid negative size
                distance: 'InvalidDistance', // Invalid distance metric
                timeout: 'invalid' // Invalid timeout type
            };

            expect(() => {
                qdrantService.updateConfig(invalidConfig);
            }).toThrow('Invalid configuration');
        });
    });

    describe('Connection Management', () => {
        test('should check connection successfully', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    title: 'qdrant - vector search engine',
                    version: '1.7.0'
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            const isConnected = await qdrantService.checkConnection();

            expect(isConnected).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/',
                expect.objectContaining({
                    method: 'GET',
                    signal: expect.any(AbortSignal)
                })
            );
        });

        test('should handle connection failure', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            const isConnected = await qdrantService.checkConnection();

            expect(isConnected).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Erro ao conectar com Qdrant',
                expect.any(Error)
            );
        });

        test('should handle timeout on connection check', async () => {
            global.fetch.mockImplementation(() => 
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 100)
                )
            );

            const isConnected = await qdrantService.checkConnection();

            expect(isConnected).toBe(false);
        });

        test('should get server info successfully', async () => {
            const mockServerInfo = {
                title: 'qdrant - vector search engine',
                version: '1.7.0',
                git_sha: 'abc123'
            };

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockServerInfo)
            };
            global.fetch.mockResolvedValue(mockResponse);

            const info = await qdrantService.getServerInfo();

            expect(info).toEqual(mockServerInfo);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/',
                expect.any(Object)
            );
        });
    });

    describe('Collection Operations', () => {
        beforeEach(() => {
            // Mock successful connection for collection operations
            global.fetch.mockImplementation((url, options) => {
                if (url.includes('/collections/')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ result: true })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            });
        });

        test('should create collection successfully', async () => {
            const result = await qdrantService.createCollection();

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/collections/knowledge_consolidator',
                expect.objectContaining({
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: expect.stringContaining('"vectors"')
                })
            );
        });

        test('should create collection with custom configuration', async () => {
            const customConfig = {
                vectors: {
                    size: 384,
                    distance: 'Euclid'
                },
                shard_number: 2,
                replication_factor: 1
            };

            const result = await qdrantService.createCollection(customConfig);

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"size":384')
                })
            );
        });

        test('should handle collection creation failure', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: () => Promise.resolve({
                    status: { error: 'Collection already exists' }
                })
            });

            const result = await qdrantService.createCollection();

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        test('should get collection info successfully', async () => {
            const mockCollectionInfo = {
                result: {
                    status: 'green',
                    vectors_count: 100,
                    indexed_vectors_count: 100,
                    points_count: 100,
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
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockCollectionInfo)
            });

            const info = await qdrantService.getCollectionInfo();

            expect(info).toEqual(mockCollectionInfo.result);
            expect(qdrantService.collectionInfo).toEqual(mockCollectionInfo.result);
        });

        test('should delete collection successfully', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ result: true })
            });

            const result = await qdrantService.deleteCollection();

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/collections/knowledge_consolidator',
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
        });
    });

    describe('Point Operations', () => {
        beforeEach(() => {
            // Mock successful responses for point operations
            global.fetch.mockImplementation((url, options) => {
                if (url.includes('/points')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            result: { operation_id: 123, status: 'completed' }
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            });
        });

        test('should insert single point successfully', async () => {
            const point = {
                id: 'point-1',
                vector: new Array(768).fill(0.1),
                payload: {
                    text: 'Test content',
                    category: 'IA/ML',
                    file_id: 'file-1'
                }
            };

            const result = await qdrantService.insertPoint(point);

            expect(result.success).toBe(true);
            expect(result.operation_id).toBe(123);
            expect(qdrantService.stats.pointsInserted).toBe(1);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/collections/knowledge_consolidator/points',
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('point-1')
                })
            );
        });

        test('should insert multiple points in batch', async () => {
            const points = [
                {
                    id: 'point-1',
                    vector: new Array(768).fill(0.1),
                    payload: { text: 'Content 1' }
                },
                {
                    id: 'point-2',
                    vector: new Array(768).fill(0.2),
                    payload: { text: 'Content 2' }
                }
            ];

            const result = await qdrantService.insertPoints(points);

            expect(result.success).toBe(true);
            expect(qdrantService.stats.pointsInserted).toBe(2);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('point-1')
                })
            );
        });

        test('should validate points before insertion', async () => {
            const invalidPoints = [
                { id: 'point-1' }, // Missing vector
                { vector: [0.1, 0.2] }, // Missing id
                { id: 'point-2', vector: [0.1] } // Wrong vector size
            ];

            for (const point of invalidPoints) {
                await expect(qdrantService.insertPoint(point)).rejects.toThrow('Invalid point');
            }
        });

        test('should handle point insertion failure', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({
                    status: { error: 'Vector dimension mismatch' }
                })
            });

            const point = {
                id: 'point-1',
                vector: new Array(768).fill(0.1),
                payload: {}
            };

            const result = await qdrantService.insertPoint(point);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Vector dimension mismatch');
        });
    });

    describe('Search Operations', () => {
        beforeEach(() => {
            global.fetch.mockImplementation((url, options) => {
                if (url.includes('/search')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            result: [
                                {
                                    id: 'point-1',
                                    score: 0.95,
                                    payload: {
                                        text: 'Matching content',
                                        category: 'IA/ML'
                                    }
                                },
                                {
                                    id: 'point-2',
                                    score: 0.87,
                                    payload: {
                                        text: 'Another match',
                                        category: 'Tecnologia'
                                    }
                                }
                            ]
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            });
        });

        test('should search by vector successfully', async () => {
            const queryVector = new Array(768).fill(0.1);
            
            const results = await qdrantService.searchByVector(queryVector);

            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({
                id: 'point-1',
                score: 0.95,
                payload: expect.objectContaining({
                    text: 'Matching content'
                })
            });

            expect(qdrantService.stats.searchesPerformed).toBe(1);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/collections/knowledge_consolidator/points/search',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"vector"')
                })
            );
        });

        test('should search with filters', async () => {
            const queryVector = new Array(768).fill(0.1);
            const filter = {
                must: [
                    {
                        key: 'category',
                        match: { value: 'IA/ML' }
                    }
                ]
            };

            const results = await qdrantService.searchByVector(queryVector, {
                filter: filter,
                limit: 5,
                score_threshold: 0.8
            });

            expect(results).toHaveLength(2);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"filter"')
                })
            );
        });

        test('should search by text using embedding service', async () => {
            // Mock embedding service
            global.window.KnowledgeConsolidator.EmbeddingService = {
                generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1))
            };

            const results = await qdrantService.searchByText('test query');

            expect(results).toHaveLength(2);
            expect(global.window.KnowledgeConsolidator.EmbeddingService.generateEmbedding)
                .toHaveBeenCalledWith('test query');
        });

        test('should handle search errors', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({
                    status: { error: 'Invalid search parameters' }
                })
            });

            const queryVector = new Array(768).fill(0.1);

            await expect(qdrantService.searchByVector(queryVector)).rejects.toThrow('Search failed');
            expect(qdrantService.stats.errors).toBe(1);
        });

        test('should filter results by score threshold', async () => {
            const queryVector = new Array(768).fill(0.1);
            
            const results = await qdrantService.searchByVector(queryVector, {
                score_threshold: 0.9
            });

            // Only results with score >= 0.9 should be returned
            results.forEach(result => {
                expect(result.score).toBeGreaterThanOrEqual(0.9);
            });
        });
    });

    describe('Point Management', () => {
        beforeEach(() => {
            global.fetch.mockImplementation((url, options) => {
                if (options?.method === 'DELETE') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            result: { operation_id: 456, status: 'completed' }
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            });
        });

        test('should delete point by ID', async () => {
            const result = await qdrantService.deletePoint('point-1');

            expect(result.success).toBe(true);
            expect(result.operation_id).toBe(456);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/collections/knowledge_consolidator/points/delete',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('point-1')
                })
            );
        });

        test('should delete multiple points', async () => {
            const pointIds = ['point-1', 'point-2', 'point-3'];

            const result = await qdrantService.deletePoints(pointIds);

            expect(result.success).toBe(true);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('point-1')
                })
            );
        });

        test('should get point by ID', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    result: {
                        id: 'point-1',
                        payload: {
                            text: 'Retrieved content',
                            category: 'IA/ML'
                        },
                        vector: new Array(768).fill(0.1)
                    }
                })
            });

            const point = await qdrantService.getPoint('point-1');

            expect(point).toMatchObject({
                id: 'point-1',
                payload: expect.objectContaining({
                    text: 'Retrieved content'
                })
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'http://qdr.vcia.com.br:6333/collections/knowledge_consolidator/points/point-1',
                expect.objectContaining({
                    method: 'GET'
                })
            );
        });
    });

    describe('Statistics and Monitoring', () => {
        test('should track operation statistics', async () => {
            // Mock successful operations
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    result: { operation_id: 123, status: 'completed' }
                })
            });

            const point = {
                id: 'point-1',
                vector: new Array(768).fill(0.1),
                payload: {}
            };

            await qdrantService.insertPoint(point);
            await qdrantService.searchByVector(new Array(768).fill(0.1));

            const stats = qdrantService.getStats();

            expect(stats.pointsInserted).toBe(1);
            expect(stats.searchesPerformed).toBe(1);
            expect(stats.errors).toBe(0);
        });

        test('should track error statistics', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            const point = {
                id: 'point-1',
                vector: new Array(768).fill(0.1),
                payload: {}
            };

            try {
                await qdrantService.insertPoint(point);
            } catch (error) {
                // Expected to fail
            }

            const stats = qdrantService.getStats();
            expect(stats.errors).toBe(1);
        });

        test('should reset statistics', () => {
            qdrantService.stats.pointsInserted = 10;
            qdrantService.stats.searchesPerformed = 5;
            qdrantService.stats.errors = 2;

            qdrantService.resetStats();

            const stats = qdrantService.getStats();
            expect(stats.pointsInserted).toBe(0);
            expect(stats.searchesPerformed).toBe(0);
            expect(stats.errors).toBe(0);
        });
    });

    describe('Error Handling and Retry Logic', () => {
        test('should retry failed requests', async () => {
            let callCount = 0;
            global.fetch.mockImplementation(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ result: true })
                });
            });

            const result = await qdrantService.checkConnection();

            expect(result).toBe(true);
            expect(callCount).toBe(3); // Initial attempt + 2 retries
        });

        test('should fail after maximum retry attempts', async () => {
            global.fetch.mockRejectedValue(new Error('Persistent error'));

            const isConnected = await qdrantService.checkConnection();

            expect(isConnected).toBe(false);
            expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        test('should handle different HTTP error codes appropriately', async () => {
            const errorCases = [
                { status: 404, shouldRetry: false },
                { status: 500, shouldRetry: true },
                { status: 503, shouldRetry: true },
                { status: 401, shouldRetry: false }
            ];

            for (const errorCase of errorCases) {
                global.fetch.mockClear();
                global.fetch.mockResolvedValue({
                    ok: false,
                    status: errorCase.status,
                    statusText: 'Error',
                    json: () => Promise.resolve({ status: { error: 'Test error' } })
                });

                const point = {
                    id: 'test-point',
                    vector: new Array(768).fill(0.1),
                    payload: {}
                };

                const result = await qdrantService.insertPoint(point);

                expect(result.success).toBe(false);
                
                if (errorCase.shouldRetry) {
                    expect(global.fetch).toHaveBeenCalledTimes(3); // With retries
                } else {
                    expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
                }
            }
        });
    });
});