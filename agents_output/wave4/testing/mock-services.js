/**
 * Mock Services for ML Confidence Test Framework
 * 
 * Provides mock implementations of external services and dependencies
 * for isolated testing of ML Confidence components.
 */

export default class MockServices {
    constructor() {
        this.services = new Map();
        this.calls = new Map();
        this.responses = new Map();
        this.errors = new Map();
        
        this.setupDefaultMocks();
    }
    
    /**
     * Initialize mock services
     */
    async initialize() {
        // Reset all mocks
        this.reset();
        
        // Initialize default responses
        this.setupDefaultResponses();
        
        console.log('✓ Mock services initialized');
    }
    
    /**
     * Setup default mock implementations
     */
    setupDefaultMocks() {
        // Mock EventBus
        this.registerMock('EventBus', {
            emit: this.createSpy('EventBus.emit'),
            on: this.createSpy('EventBus.on'),
            off: this.createSpy('EventBus.off'),
            once: this.createSpy('EventBus.once')
        });
        
        // Mock Ollama Service
        this.registerMock('OllamaService', {
            embeddings: this.createAsyncSpy('OllamaService.embeddings', 
                () => this.generateMockEmbeddings()),
            generate: this.createAsyncSpy('OllamaService.generate',
                () => ({ response: 'Mock AI response' }))
        });
        
        // Mock Qdrant Service
        this.registerMock('QdrantService', {
            upsert: this.createAsyncSpy('QdrantService.upsert', 
                () => ({ status: 'ok' })),
            search: this.createAsyncSpy('QdrantService.search',
                () => this.generateMockSearchResults()),
            delete: this.createAsyncSpy('QdrantService.delete',
                () => ({ status: 'ok' })),
            getPoint: this.createAsyncSpy('QdrantService.getPoint',
                () => this.generateMockPoint())
        });
        
        // Mock File System
        this.registerMock('FileSystem', {
            readFile: this.createAsyncSpy('FileSystem.readFile',
                (path) => this.getMockFileContent(path)),
            writeFile: this.createAsyncSpy('FileSystem.writeFile',
                () => ({ success: true })),
            exists: this.createAsyncSpy('FileSystem.exists',
                () => true),
            stat: this.createAsyncSpy('FileSystem.stat',
                (path) => this.getMockFileStats(path))
        });
        
        // Mock Storage
        this.registerMock('Storage', {
            setItem: this.createSpy('Storage.setItem'),
            getItem: this.createSpy('Storage.getItem', 
                (key) => this.getMockStorageItem(key)),
            removeItem: this.createSpy('Storage.removeItem'),
            clear: this.createSpy('Storage.clear')
        });
        
        // Mock Performance API
        this.registerMock('Performance', {
            now: this.createSpy('Performance.now', () => Date.now()),
            mark: this.createSpy('Performance.mark'),
            measure: this.createSpy('Performance.measure'),
            getEntriesByType: this.createSpy('Performance.getEntriesByType',
                () => [])
        });
        
        // Mock Worker
        this.registerMock('Worker', this.createMockWorker());
        
        // Mock IndexedDB
        this.registerMock('IndexedDB', this.createMockIndexedDB());
    }
    
    /**
     * Setup default responses
     */
    setupDefaultResponses() {
        // Default embeddings response
        this.setResponse('OllamaService.embeddings', () => ({
            embedding: Array(768).fill(0).map(() => Math.random() - 0.5)
        }));
        
        // Default search results
        this.setResponse('QdrantService.search', () => ({
            result: [
                {
                    id: 'mock-1',
                    score: 0.95,
                    payload: { content: 'Mock result 1' }
                },
                {
                    id: 'mock-2',
                    score: 0.87,
                    payload: { content: 'Mock result 2' }
                }
            ]
        }));
        
        // Default file content
        this.setResponse('FileSystem.readFile', (path) => {
            if (path.endsWith('.json')) {
                return JSON.stringify({ mock: true, path });
            }
            return `Mock content for ${path}`;
        });
    }
    
    /**
     * Register a mock service
     */
    registerMock(name, implementation) {
        this.services.set(name, implementation);
    }
    
    /**
     * Get mock service
     */
    getMock(name) {
        if (!this.services.has(name)) {
            throw new Error(`Mock service ${name} not found`);
        }
        return this.services.get(name);
    }
    
    /**
     * Create a spy function
     */
    createSpy(name, implementation = () => {}) {
        const spy = (...args) => {
            // Record call
            if (!this.calls.has(name)) {
                this.calls.set(name, []);
            }
            this.calls.get(name).push({
                args,
                timestamp: Date.now(),
                stack: new Error().stack
            });
            
            // Check for configured error
            if (this.errors.has(name)) {
                const error = this.errors.get(name);
                if (typeof error === 'function') {
                    throw error(...args);
                }
                throw error;
            }
            
            // Check for configured response
            if (this.responses.has(name)) {
                const response = this.responses.get(name);
                if (typeof response === 'function') {
                    return response(...args);
                }
                return response;
            }
            
            // Use default implementation
            return implementation(...args);
        };
        
        // Add spy methods
        spy.calls = () => this.calls.get(name) || [];
        spy.callCount = () => spy.calls().length;
        spy.calledWith = (...args) => 
            spy.calls().some(call => 
                JSON.stringify(call.args) === JSON.stringify(args)
            );
        spy.lastCall = () => {
            const calls = spy.calls();
            return calls[calls.length - 1];
        };
        spy.reset = () => {
            this.calls.delete(name);
            this.responses.delete(name);
            this.errors.delete(name);
        };
        
        return spy;
    }
    
    /**
     * Create async spy
     */
    createAsyncSpy(name, implementation = async () => {}) {
        const spy = this.createSpy(name, implementation);
        
        // Wrap in async function
        const asyncSpy = async (...args) => {
            return spy(...args);
        };
        
        // Copy spy methods
        Object.setPrototypeOf(asyncSpy, spy);
        
        return asyncSpy;
    }
    
    /**
     * Set mock response
     */
    setResponse(name, response) {
        this.responses.set(name, response);
    }
    
    /**
     * Set mock error
     */
    setError(name, error) {
        this.errors.set(name, error);
    }
    
    /**
     * Get call history
     */
    getCalls(name) {
        return this.calls.get(name) || [];
    }
    
    /**
     * Reset all mocks
     */
    reset() {
        this.calls.clear();
        this.responses.clear();
        this.errors.clear();
    }
    
    /**
     * Create mock Worker implementation
     */
    createMockWorker() {
        class MockWorker {
            constructor(scriptURL) {
                this.scriptURL = scriptURL;
                this.listeners = new Map();
                this.terminated = false;
            }
            
            postMessage(data) {
                if (this.terminated) {
                    throw new Error('Worker terminated');
                }
                
                // Simulate async processing
                setTimeout(() => {
                    const mockResult = {
                        id: data.id,
                        result: { confidence: 0.85 },
                        type: 'result'
                    };
                    
                    this.dispatchEvent(new MessageEvent('message', {
                        data: mockResult
                    }));
                }, 10);
            }
            
            addEventListener(type, listener) {
                if (!this.listeners.has(type)) {
                    this.listeners.set(type, new Set());
                }
                this.listeners.get(type).add(listener);
            }
            
            removeEventListener(type, listener) {
                if (this.listeners.has(type)) {
                    this.listeners.get(type).delete(listener);
                }
            }
            
            dispatchEvent(event) {
                if (this.listeners.has(event.type)) {
                    this.listeners.get(event.type).forEach(listener => {
                        listener(event);
                    });
                }
            }
            
            terminate() {
                this.terminated = true;
                this.listeners.clear();
            }
        }
        
        return MockWorker;
    }
    
    /**
     * Create mock IndexedDB implementation
     */
    createMockIndexedDB() {
        const stores = new Map();
        
        return {
            open: (name, version) => {
                return {
                    onsuccess: null,
                    onerror: null,
                    onupgradeneeded: null,
                    
                    result: {
                        createObjectStore: (storeName, options) => {
                            stores.set(storeName, new Map());
                            return {
                                createIndex: () => {},
                                add: (value, key) => {
                                    stores.get(storeName).set(key, value);
                                }
                            };
                        },
                        
                        transaction: (storeNames, mode) => {
                            return {
                                objectStore: (storeName) => {
                                    const store = stores.get(storeName) || new Map();
                                    
                                    return {
                                        get: (key) => ({
                                            onsuccess: function() {
                                                this.result = store.get(key);
                                            }
                                        }),
                                        
                                        put: (value, key) => ({
                                            onsuccess: function() {
                                                store.set(key, value);
                                            }
                                        }),
                                        
                                        delete: (key) => ({
                                            onsuccess: function() {
                                                store.delete(key);
                                            }
                                        }),
                                        
                                        clear: () => ({
                                            onsuccess: function() {
                                                store.clear();
                                            }
                                        })
                                    };
                                }
                            };
                        }
                    }
                };
            }
        };
    }
    
    /**
     * Mock data generators
     */
    generateMockEmbeddings(dimensions = 768) {
        return Array(dimensions).fill(0).map(() => Math.random() - 0.5);
    }
    
    generateMockSearchResults(count = 5) {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            results.push({
                id: `result-${i}`,
                score: Math.random() * 0.5 + 0.5, // 0.5-1.0
                payload: {
                    fileId: `file-${i}`,
                    content: `Mock search result ${i}`,
                    categories: ['test', 'mock'],
                    confidence: Math.random()
                }
            });
        }
        
        return { result: results };
    }
    
    generateMockPoint() {
        return {
            id: 'mock-point-1',
            vector: this.generateMockEmbeddings(),
            payload: {
                fileId: 'mock-file-1',
                content: 'Mock point content',
                metadata: {
                    created: new Date().toISOString(),
                    modified: new Date().toISOString()
                }
            }
        };
    }
    
    getMockFileContent(path) {
        const mockContents = {
            '/test/file1.md': '# Test File 1\n\nThis is test content.',
            '/test/file2.json': JSON.stringify({ test: true, value: 42 }),
            '/test/config.yaml': 'test: true\nvalue: 42'
        };
        
        return mockContents[path] || `Mock content for ${path}`;
    }
    
    getMockFileStats(path) {
        return {
            size: Math.floor(Math.random() * 100000),
            isFile: () => true,
            isDirectory: () => false,
            mtime: new Date(),
            ctime: new Date(Date.now() - 86400000), // 1 day ago
            mode: 0o644
        };
    }
    
    getMockStorageItem(key) {
        const mockStorage = {
            'ml-confidence-state': JSON.stringify({
                version: '1.0.0',
                files: [],
                settings: {}
            }),
            'ml-confidence-cache': JSON.stringify({
                entries: [],
                timestamp: Date.now()
            })
        };
        
        return mockStorage[key] || null;
    }
    
    /**
     * Create mock for specific ML components
     */
    createMLMocks() {
        return {
            ConfidenceCalculator: {
                calculate: this.createAsyncSpy('ConfidenceCalculator.calculate',
                    async (data) => ({
                        fileId: data.fileId,
                        overall: 0.75 + Math.random() * 0.1,
                        dimensions: {
                            semantic: 0.8,
                            categorical: 0.7,
                            structural: 0.75,
                            temporal: 0.72
                        },
                        convergencePrediction: {
                            willConverge: true,
                            estimatedIterations: 3,
                            confidence: 0.9
                        },
                        calculatedAt: new Date()
                    })),
                
                optimizeWeights: this.createSpy('ConfidenceCalculator.optimizeWeights'),
                getWeights: this.createSpy('ConfidenceCalculator.getWeights',
                    () => ({ semantic: 0.4, categorical: 0.2, structural: 0.2, temporal: 0.2 }))
            },
            
            ConfidenceTracker: {
                startTracking: this.createSpy('ConfidenceTracker.startTracking'),
                updateMetrics: this.createSpy('ConfidenceTracker.updateMetrics'),
                getConvergenceHistory: this.createSpy('ConfidenceTracker.getConvergenceHistory',
                    () => [
                        { iteration: 1, confidence: 0.65 },
                        { iteration: 2, confidence: 0.75 },
                        { iteration: 3, confidence: 0.82 }
                    ]),
                needsReanalysis: this.createSpy('ConfidenceTracker.needsReanalysis',
                    () => false)
            },
            
            OptimizedCalculator: {
                processBatch: this.createAsyncSpy('OptimizedCalculator.processBatch',
                    async (batch) => batch.map(item => ({
                        fileId: item.fileId,
                        overall: 0.8 + Math.random() * 0.05,
                        processingTime: Math.random() * 100
                    }))),
                warmCache: this.createAsyncSpy('OptimizedCalculator.warmCache'),
                cleanup: this.createAsyncSpy('OptimizedCalculator.cleanup')
            }
        };
    }
    
    /**
     * Cleanup mock services
     */
    async cleanup() {
        this.reset();
        this.services.clear();
        console.log('✓ Mock services cleaned up');
    }
    
    /**
     * Verify no unexpected calls
     */
    verifyNoUnexpectedCalls() {
        const unexpectedCalls = [];
        
        this.calls.forEach((calls, name) => {
            if (calls.length > 0 && !this.responses.has(name)) {
                unexpectedCalls.push({
                    name,
                    callCount: calls.length,
                    lastCall: calls[calls.length - 1]
                });
            }
        });
        
        if (unexpectedCalls.length > 0) {
            throw new Error(
                `Unexpected mock calls:\n` +
                unexpectedCalls.map(c => 
                    `  - ${c.name} called ${c.callCount} times`
                ).join('\n')
            );
        }
    }
}

// Export for use in tests
export { MockServices };