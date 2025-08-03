/**
 * test-utils.js
 * Comprehensive test utilities for VCIA Knowledge Consolidator
 * 
 * Provides:
 * - Mock factories for common objects
 * - Test data generators
 * - Custom assertion helpers
 * - Setup/teardown utilities
 * - Performance testing helpers
 */

/**
 * Mock Factories
 * Generate consistent mock objects for testing
 */
class MockFactories {
    /**
     * Create a mock file object with realistic properties
     * @param {Object} overrides - Properties to override defaults
     * @returns {Object} Mock file object
     */
    static createFile(overrides = {}) {
        const baseFile = {
            id: `file-${Math.random().toString(36).substr(2, 9)}`,
            name: 'test-document.md',
            path: '/test/documents/test-document.md',
            content: 'This is test content for a mock file with relevant information about AI and machine learning.',
            size: 1024,
            type: 'text/markdown',
            lastModified: Date.now(),
            handle: MockFactories.createFileHandle(),
            // Analysis properties
            relevanceScore: 75,
            analysisType: null,
            analyzed: false,
            approved: false,
            categories: [],
            // Preview properties
            preview: {
                segment1: 'This is test content for a mock file with relevant information about AI and machine learning.',
                segment2: '',
                segment3: '',
                segment4: '',
                segment5: '',
                structure: {
                    type: 'text',
                    wordCount: 16,
                    charCount: 95,
                    lineCount: 1,
                    paragraphCount: 1
                }
            }
        };
        
        return { ...baseFile, ...overrides };
    }

    /**
     * Create a mock FileSystemDirectoryHandle
     * @param {Object} overrides - Properties to override defaults
     * @returns {Object} Mock directory handle
     */
    static createDirectoryHandle(overrides = {}) {
        const baseHandle = {
            kind: 'directory',
            name: 'test-directory',
            entries: jest.fn().mockReturnValue([]),
            getDirectoryHandle: jest.fn(),
            getFileHandle: jest.fn(),
            resolve: jest.fn().mockResolvedValue(['test-directory']),
            isSameEntry: jest.fn().mockReturnValue(false)
        };
        
        return { ...baseHandle, ...overrides };
    }

    /**
     * Create a mock FileSystemFileHandle
     * @param {Object} overrides - Properties to override defaults
     * @returns {Object} Mock file handle
     */
    static createFileHandle(overrides = {}) {
        const baseHandle = {
            kind: 'file',
            name: 'test-file.md',
            getFile: jest.fn().mockResolvedValue(MockFactories.createFileObject()),
            resolve: jest.fn().mockResolvedValue(['test-directory', 'test-file.md']),
            isSameEntry: jest.fn().mockReturnValue(false)
        };
        
        return { ...baseHandle, ...overrides };
    }

    /**
     * Create a mock File object
     * @param {Object} overrides - Properties to override defaults
     * @returns {Object} Mock File object
     */
    static createFileObject(overrides = {}) {
        const baseFile = {
            name: 'test-file.md',
            size: 1024,
            type: 'text/markdown',
            lastModified: Date.now(),
            text: jest.fn().mockResolvedValue('Mock file content for testing purposes'),
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
            stream: jest.fn()
        };
        
        return { ...baseFile, ...overrides };
    }

    /**
     * Create a mock analysis result
     * @param {Object} overrides - Properties to override defaults
     * @returns {Object} Mock analysis result
     */
    static createAnalysisResult(overrides = {}) {
        const analysisTypes = [
            'Breakthrough Técnico',
            'Evolução Conceitual',
            'Momento Decisivo',
            'Insight Estratégico',
            'Aprendizado Geral'
        ];
        
        const baseResult = {
            fileId: `file-${Math.random().toString(36).substr(2, 9)}`,
            success: true,
            analysisType: analysisTypes[Math.floor(Math.random() * analysisTypes.length)],
            relevanceScore: Math.floor(Math.random() * 40) + 60, // 60-100
            insights: [
                'Key insight identified in content',
                'Strategic implications noted',
                'Technical breakthrough discovered'
            ],
            summary: 'Comprehensive analysis summary with key findings and recommendations.',
            processingTime: Math.floor(Math.random() * 2000) + 1000, // 1-3 seconds
            cost: Math.random() * 0.1, // $0-0.10
            confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
            timestamp: Date.now(),
            provider: 'ollama'
        };
        
        return { ...baseResult, ...overrides };
    }

    /**
     * Create a mock Qdrant point
     * @param {Object} overrides - Properties to override defaults
     * @returns {Object} Mock Qdrant point
     */
    static createQdrantPoint(overrides = {}) {
        const basePoint = {
            id: `point-${Math.random().toString(36).substr(2, 9)}`,
            vector: new Array(768).fill(0).map(() => Math.random() * 2 - 1), // Random values -1 to 1
            payload: {
                text: 'Sample text content for vector storage',
                category: 'IA/ML',
                file_id: `file-${Math.random().toString(36).substr(2, 9)}`,
                analysis_type: 'Insight Estratégico',
                relevance_score: 85,
                timestamp: Date.now(),
                chunk_index: 0,
                total_chunks: 1
            }
        };
        
        return { ...basePoint, ...overrides };
    }

    /**
     * Create a mock embedding vector
     * @param {number} dimensions - Vector dimensions (default: 768)
     * @param {Object} options - Generation options
     * @returns {Array} Mock embedding vector
     */
    static createEmbedding(dimensions = 768, options = {}) {
        const { normalize = true, seed = null } = options;
        
        // Use seed for reproducible vectors
        if (seed !== null) {
            Math.seedrandom = seed;
        }
        
        let vector = new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
        
        if (normalize) {
            const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
            vector = vector.map(val => val / magnitude);
        }
        
        return vector;
    }

    /**
     * Create mock event bus
     * @returns {Object} Mock EventBus
     */
    static createEventBus() {
        return {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn(),
            removeAllListeners: jest.fn()
        };
    }

    /**
     * Create mock logger
     * @returns {Object} Mock Logger
     */
    static createLogger() {
        return {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn()
        };
    }

    /**
     * Create mock AppState
     * @param {Object} initialState - Initial state data
     * @returns {Object} Mock AppState
     */
    static createAppState(initialState = {}) {
        const state = { ...initialState };
        
        return {
            get: jest.fn().mockImplementation((key) => state[key]),
            set: jest.fn().mockImplementation((key, value) => {
                state[key] = value;
            }),
            getAll: jest.fn().mockImplementation(() => ({ ...state })),
            clear: jest.fn().mockImplementation(() => {
                Object.keys(state).forEach(key => delete state[key]);
            }),
            _getInternalState: () => state // For testing purposes
        };
    }
}

/**
 * Test Data Generators
 * Generate realistic test datasets
 */
class TestDataGenerators {
    /**
     * Generate a collection of mock files with various characteristics
     * @param {number} count - Number of files to generate
     * @param {Object} options - Generation options
     * @returns {Array} Array of mock files
     */
    static generateFileCollection(count = 10, options = {}) {
        const {
            categories = ['IA/ML', 'Negócios/Estratégia', 'Tecnologia/Desenvolvimento', 'Projetos/Gestão'],
            fileTypes = ['.md', '.txt', '.docx'],
            relevanceRange = [30, 100],
            analyzedRatio = 0.5,
            approvedRatio = 0.7
        } = options;

        return Array.from({ length: count }, (_, i) => {
            const fileType = fileTypes[i % fileTypes.length];
            const isAnalyzed = Math.random() < analyzedRatio;
            const isApproved = isAnalyzed && Math.random() < approvedRatio;
            
            return MockFactories.createFile({
                id: `test-file-${i + 1}`,
                name: `document-${i + 1}${fileType}`,
                path: `/test/documents/document-${i + 1}${fileType}`,
                content: TestDataGenerators.generateRealisticContent(fileType),
                relevanceScore: Math.floor(Math.random() * (relevanceRange[1] - relevanceRange[0])) + relevanceRange[0],
                categories: Math.random() < 0.6 ? [categories[Math.floor(Math.random() * categories.length)]] : [],
                analyzed: isAnalyzed,
                approved: isApproved,
                analysisType: isAnalyzed ? TestDataGenerators.getRandomAnalysisType() : null,
                lastModified: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 // Within last year
            });
        });
    }

    /**
     * Generate realistic content based on file type
     * @param {string} fileType - File extension
     * @returns {string} Generated content
     */
    static generateRealisticContent(fileType) {
        const contentTemplates = {
            '.md': `# Document Title

## Introduction
This document explores important concepts in technology and business strategy.

## Key Insights
- Artificial intelligence is transforming industries
- Machine learning algorithms are becoming more sophisticated
- Strategic planning must account for technological disruption

## Analysis
The implementation of AI-driven solutions requires careful consideration of:
1. Technical feasibility
2. Business impact
3. Resource requirements

## Conclusion
These findings suggest significant opportunities for innovation and growth.`,

            '.txt': `Important findings from recent analysis:

Artificial intelligence and machine learning technologies are creating new opportunities for business transformation. Companies that invest in these technologies are seeing improved efficiency and competitive advantages.

Key recommendations:
- Develop AI strategy aligned with business goals
- Invest in talent and infrastructure
- Create partnerships with technology providers
- Monitor regulatory developments

The next phase should focus on implementation and measurement of results.`,

            '.docx': `EXECUTIVE SUMMARY

This report presents findings from a comprehensive analysis of market trends and technological developments.

BACKGROUND
The business landscape is rapidly evolving due to technological innovation and changing customer expectations.

METHODOLOGY
Our analysis included:
- Market research and competitive analysis
- Technology trend assessment
- Stakeholder interviews
- Financial modeling

FINDINGS
1. Significant growth opportunities in AI-powered solutions
2. Need for digital transformation initiatives
3. Importance of data-driven decision making

RECOMMENDATIONS
Immediate actions should include strategy development, team building, and pilot project implementation.`
        };

        return contentTemplates[fileType] || contentTemplates['.txt'];
    }

    /**
     * Get random analysis type
     * @returns {string} Random analysis type
     */
    static getRandomAnalysisType() {
        const types = [
            'Breakthrough Técnico',
            'Evolução Conceitual',
            'Momento Decisivo',
            'Insight Estratégico',
            'Aprendizado Geral'
        ];
        return types[Math.floor(Math.random() * types.length)];
    }

    /**
     * Generate mock Qdrant search results
     * @param {number} count - Number of results
     * @param {Object} options - Generation options
     * @returns {Array} Mock search results
     */
    static generateSearchResults(count = 5, options = {}) {
        const { scoreRange = [0.7, 1.0], categories = ['IA/ML', 'Negócios'] } = options;
        
        return Array.from({ length: count }, (_, i) => ({
            id: `result-${i + 1}`,
            score: Math.random() * (scoreRange[1] - scoreRange[0]) + scoreRange[0],
            payload: {
                text: `Search result ${i + 1} content with relevant information`,
                category: categories[i % categories.length],
                file_id: `file-${i + 1}`,
                analysis_type: TestDataGenerators.getRandomAnalysisType(),
                relevance_score: Math.floor(Math.random() * 40) + 60
            }
        })).sort((a, b) => b.score - a.score); // Sort by score descending
    }

    /**
     * Generate performance test data
     * @param {number} size - Size category ('small', 'medium', 'large')
     * @returns {Object} Performance test dataset
     */
    static generatePerformanceTestData(size = 'medium') {
        const sizeMappings = {
            small: { files: 50, avgContentLength: 500 },
            medium: { files: 500, avgContentLength: 2000 },
            large: { files: 2000, avgContentLength: 5000 }
        };
        
        const config = sizeMappings[size];
        const files = this.generateFileCollection(config.files, {
            avgContentLength: config.avgContentLength
        });
        
        return {
            files,
            expectedProcessingTime: config.files * 100, // ms per file estimate
            expectedMemoryUsage: config.files * config.avgContentLength * 2, // bytes estimate
            batchSize: Math.min(50, Math.floor(config.files / 10))
        };
    }
}

/**
 * Custom Assertion Helpers
 * Specialized assertions for testing components
 */
class CustomAssertions {
    /**
     * Assert that an object is a valid file structure
     * @param {Object} file - File object to validate
     */
    static expectValidFile(file) {
        expect(file).toHaveProperty('id');
        expect(file).toHaveProperty('name');
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('content');
        expect(file).toHaveProperty('size');
        expect(file).toHaveProperty('lastModified');
        
        expect(typeof file.id).toBe('string');
        expect(typeof file.name).toBe('string');
        expect(typeof file.path).toBe('string');
        expect(typeof file.content).toBe('string');
        expect(typeof file.size).toBe('number');
        expect(typeof file.lastModified).toBe('number');
        
        expect(file.id.length).toBeGreaterThan(0);
        expect(file.name.length).toBeGreaterThan(0);
        expect(file.size).toBeGreaterThan(0);
    }

    /**
     * Assert that an object is a valid analysis result
     * @param {Object} result - Analysis result to validate
     */
    static expectValidAnalysisResult(result) {
        expect(result).toHaveProperty('fileId');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('analysisType');
        expect(result).toHaveProperty('relevanceScore');
        
        expect(typeof result.fileId).toBe('string');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.analysisType).toBe('string');
        expect(typeof result.relevanceScore).toBe('number');
        
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(100);
        
        if (result.success) {
            expect(result).toHaveProperty('insights');
            expect(Array.isArray(result.insights)).toBe(true);
        } else {
            expect(result).toHaveProperty('error');
            expect(typeof result.error).toBe('string');
        }
    }

    /**
     * Assert that an object is a valid Qdrant point
     * @param {Object} point - Qdrant point to validate
     */
    static expectValidQdrantPoint(point) {
        expect(point).toHaveProperty('id');
        expect(point).toHaveProperty('vector');
        expect(point).toHaveProperty('payload');
        
        expect(typeof point.id).toBe('string');
        expect(Array.isArray(point.vector)).toBe(true);
        expect(typeof point.payload).toBe('object');
        
        // Vector validation
        expect(point.vector.length).toBe(768); // Standard embedding size
        point.vector.forEach(value => {
            expect(typeof value).toBe('number');
            expect(value).toBeGreaterThanOrEqual(-1);
            expect(value).toBeLessThanOrEqual(1);
        });
        
        // Payload validation
        expect(point.payload).toHaveProperty('text');
        expect(typeof point.payload.text).toBe('string');
        expect(point.payload.text.length).toBeGreaterThan(0);
    }

    /**
     * Assert that search results are properly formatted and sorted
     * @param {Array} results - Search results to validate
     * @param {Object} options - Validation options
     */
    static expectValidSearchResults(results, options = {}) {
        const { minScore = 0, maxResults = 100, requireSorting = true } = options;
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeLessThanOrEqual(maxResults);
        
        results.forEach((result, index) => {
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('payload');
            
            expect(typeof result.score).toBe('number');
            expect(result.score).toBeGreaterThanOrEqual(minScore);
            expect(result.score).toBeLessThanOrEqual(1);
            
            // Check sorting
            if (requireSorting && index > 0) {
                expect(result.score).toBeLessThanOrEqual(results[index - 1].score);
            }
        });
    }

    /**
     * Assert that event was emitted with correct parameters
     * @param {Object} mockEventBus - Mocked EventBus
     * @param {string} eventName - Expected event name
     * @param {Object} expectedData - Expected event data (partial match)
     */
    static expectEventEmitted(mockEventBus, eventName, expectedData = {}) {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
            eventName,
            expect.objectContaining(expectedData)
        );
    }

    /**
     * Assert that state was updated correctly
     * @param {Object} mockAppState - Mocked AppState
     * @param {string} key - State key
     * @param {*} expectedValue - Expected value (can be partial for objects)
     */
    static expectStateUpdated(mockAppState, key, expectedValue) {
        if (typeof expectedValue === 'object' && expectedValue !== null) {
            expect(mockAppState.set).toHaveBeenCalledWith(
                key,
                expect.objectContaining(expectedValue)
            );
        } else {
            expect(mockAppState.set).toHaveBeenCalledWith(key, expectedValue);
        }
    }
}

/**
 * Setup and Teardown Utilities
 * Common setup and cleanup operations
 */
class SetupUtilities {
    /**
     * Setup complete test environment
     * @param {Object} options - Setup options
     * @returns {Object} Test environment
     */
    static setupTestEnvironment(options = {}) {
        const {
            withFiles = true,
            withCategories = true,
            withAnalysis = false,
            fileCount = 10
        } = options;

        const environment = {
            mockEventBus: MockFactories.createEventBus(),
            mockLogger: MockFactories.createLogger(),
            mockAppState: MockFactories.createAppState(),
            testFiles: withFiles ? TestDataGenerators.generateFileCollection(fileCount) : [],
            testCategories: withCategories ? ['IA/ML', 'Negócios', 'Tecnologia', 'Projetos'] : []
        };

        if (withAnalysis) {
            environment.testAnalysisResults = environment.testFiles.map(file => 
                MockFactories.createAnalysisResult({ fileId: file.id })
            );
        }

        // Setup global KC object
        global.window = global.window || {};
        global.window.KnowledgeConsolidator = {
            EventBus: environment.mockEventBus,
            Logger: environment.mockLogger,
            AppState: environment.mockAppState,
            Events: {
                FILES_UPDATED: 'files_updated',
                CATEGORIES_CHANGED: 'categories_changed',
                ANALYSIS_STARTED: 'analysis_started',
                ANALYSIS_COMPLETED: 'analysis_completed',
                STATE_CHANGED: 'state_changed'
            }
        };

        return environment;
    }

    /**
     * Cleanup test environment
     */
    static cleanupTestEnvironment() {
        if (global.window && global.window.KnowledgeConsolidator) {
            delete global.window.KnowledgeConsolidator;
        }
        
        jest.clearAllMocks();
    }

    /**
     * Setup mock fetch for API testing
     * @param {Object} responses - Mock responses for different URLs
     */
    static setupMockFetch(responses = {}) {
        global.fetch = jest.fn().mockImplementation((url, options) => {
            const method = options?.method || 'GET';
            const key = `${method} ${url}`;
            
            if (responses[key]) {
                return Promise.resolve(responses[key]);
            }
            
            if (responses[url]) {
                return Promise.resolve(responses[url]);
            }
            
            // Default success response
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ success: true }),
                text: () => Promise.resolve('OK')
            });
        });
    }

    /**
     * Setup performance monitoring for tests
     * @returns {Object} Performance monitor
     */
    static setupPerformanceMonitor() {
        const startTimes = new Map();
        const measurements = [];

        return {
            start: (label) => {
                startTimes.set(label, performance.now());
            },
            
            end: (label) => {
                const startTime = startTimes.get(label);
                if (startTime) {
                    const duration = performance.now() - startTime;
                    measurements.push({ label, duration, timestamp: Date.now() });
                    startTimes.delete(label);
                    return duration;
                }
                return 0;
            },
            
            getMeasurements: () => [...measurements],
            
            getStats: () => {
                if (measurements.length === 0) return null;
                
                const durations = measurements.map(m => m.duration);
                return {
                    count: measurements.length,
                    min: Math.min(...durations),
                    max: Math.max(...durations),
                    avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
                    total: durations.reduce((sum, d) => sum + d, 0)
                };
            },
            
            clear: () => {
                startTimes.clear();
                measurements.length = 0;
            }
        };
    }
}

/**
 * Performance Testing Helpers
 * Utilities for testing performance characteristics
 */
class PerformanceHelpers {
    /**
     * Test function execution time
     * @param {Function} fn - Function to test
     * @param {number} iterations - Number of iterations
     * @returns {Object} Performance results
     */
    static async timeFunction(fn, iterations = 1) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            const end = performance.now();
            times.push(end - start);
        }
        
        return {
            iterations,
            times,
            min: Math.min(...times),
            max: Math.max(...times),
            avg: times.reduce((sum, time) => sum + time, 0) / times.length,
            total: times.reduce((sum, time) => sum + time, 0)
        };
    }

    /**
     * Test memory usage during execution
     * @param {Function} fn - Function to test
     * @returns {Object} Memory usage results
     */
    static async measureMemory(fn) {
        const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };
        
        await fn();
        
        const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };
        
        return {
            initial: initialMemory.heapUsed,
            final: finalMemory.heapUsed,
            delta: finalMemory.heapUsed - initialMemory.heapUsed,
            peak: Math.max(initialMemory.heapUsed, finalMemory.heapUsed)
        };
    }

    /**
     * Create load test scenario
     * @param {Function} operation - Operation to test under load
     * @param {Object} options - Load test options
     * @returns {Function} Load test function
     */
    static createLoadTest(operation, options = {}) {
        const {
            concurrency = 10,
            duration = 5000,
            rampUpTime = 1000
        } = options;

        return async () => {
            const results = [];
            const startTime = Date.now();
            const endTime = startTime + duration;
            
            const workers = Array.from({ length: concurrency }, async (_, i) => {
                // Stagger start times for ramp-up
                await new Promise(resolve => setTimeout(resolve, (i / concurrency) * rampUpTime));
                
                const workerResults = [];
                
                while (Date.now() < endTime) {
                    const operationStart = performance.now();
                    
                    try {
                        await operation();
                        const operationEnd = performance.now();
                        workerResults.push({
                            success: true,
                            duration: operationEnd - operationStart,
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        workerResults.push({
                            success: false,
                            error: error.message,
                            timestamp: Date.now()
                        });
                    }
                }
                
                return workerResults;
            });
            
            const allResults = await Promise.all(workers);
            const flatResults = allResults.flat();
            
            const successCount = flatResults.filter(r => r.success).length;
            const errorCount = flatResults.filter(r => !r.success).length;
            const durations = flatResults.filter(r => r.success).map(r => r.duration);
            
            return {
                totalOperations: flatResults.length,
                successCount,
                errorCount,
                successRate: successCount / flatResults.length,
                avgDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
                minDuration: durations.length > 0 ? Math.min(...durations) : 0,
                maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
                throughput: successCount / (duration / 1000), // operations per second
                results: flatResults
            };
        };
    }
}

// Export all utilities
module.exports = {
    MockFactories,
    TestDataGenerators,
    CustomAssertions,
    SetupUtilities,
    PerformanceHelpers
};

// For CommonJS environments
if (typeof window !== 'undefined') {
    window.TestUtils = {
        MockFactories,
        TestDataGenerators,
        CustomAssertions,
        SetupUtilities,
        PerformanceHelpers
    };
}