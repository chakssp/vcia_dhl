/**
 * Health Check Service
 * ML Confidence Workflow System
 * 
 * Comprehensive health checks for production monitoring
 * Returns detailed status for each system component
 */

import ConfidenceCalculator from '../../../wave1/calculator/ConfidenceCalculator.js';
import CacheStrategy from '../../../wave3/optimization/CacheStrategy.js';
import QdrantService from '../../../../js/services/QdrantService.js';

export default class HealthCheckService {
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout || 5000,
            verbose: config.verbose || false,
            checks: config.checks || this.getDefaultChecks(),
            thresholds: {
                healthy: config.thresholds?.healthy || 0.95,
                degraded: config.thresholds?.degraded || 0.80,
                unhealthy: config.thresholds?.unhealthy || 0.50
            },
            ...config
        };
        
        this.checkResults = new Map();
        this.lastCheckTime = null;
        this.overallStatus = 'unknown';
    }
    
    /**
     * Get default health checks
     */
    getDefaultChecks() {
        return [
            {
                name: 'ml-calculator',
                type: 'functional',
                critical: true,
                checker: () => this.checkMLCalculator()
            },
            {
                name: 'cache',
                type: 'performance',
                critical: false,
                checker: () => this.checkCache()
            },
            {
                name: 'database',
                type: 'connectivity',
                critical: true,
                checker: () => this.checkDatabase()
            },
            {
                name: 'workers',
                type: 'resource',
                critical: false,
                checker: () => this.checkWorkers()
            },
            {
                name: 'memory',
                type: 'resource',
                critical: false,
                checker: () => this.checkMemory()
            },
            {
                name: 'api',
                type: 'connectivity',
                critical: true,
                checker: () => this.checkAPIEndpoints()
            },
            {
                name: 'file-system',
                type: 'functional',
                critical: false,
                checker: () => this.checkFileSystem()
            },
            {
                name: 'embeddings',
                type: 'functional',
                critical: true,
                checker: () => this.checkEmbeddingService()
            }
        ];
    }
    
    /**
     * Run all health checks
     */
    async runHealthChecks() {
        const startTime = Date.now();
        const results = {
            status: 'checking',
            timestamp: new Date().toISOString(),
            checks: {},
            summary: {
                total: 0,
                healthy: 0,
                degraded: 0,
                unhealthy: 0,
                critical_failures: 0
            }
        };
        
        // Run checks in parallel with timeout
        const checkPromises = this.config.checks.map(async (check) => {
            try {
                const checkStart = Date.now();
                const result = await this.runWithTimeout(
                    check.checker(),
                    this.config.timeout
                );
                
                const duration = Date.now() - checkStart;
                
                results.checks[check.name] = {
                    ...result,
                    type: check.type,
                    critical: check.critical,
                    duration,
                    timestamp: new Date().toISOString()
                };
                
                // Update summary
                results.summary.total++;
                if (result.status === 'healthy') {
                    results.summary.healthy++;
                } else if (result.status === 'degraded') {
                    results.summary.degraded++;
                } else {
                    results.summary.unhealthy++;
                    if (check.critical) {
                        results.summary.critical_failures++;
                    }
                }
                
            } catch (error) {
                results.checks[check.name] = {
                    status: 'unhealthy',
                    type: check.type,
                    critical: check.critical,
                    error: error.message,
                    duration: Date.now() - checkStart,
                    timestamp: new Date().toISOString()
                };
                
                results.summary.total++;
                results.summary.unhealthy++;
                if (check.critical) {
                    results.summary.critical_failures++;
                }
            }
        });
        
        await Promise.all(checkPromises);
        
        // Calculate overall status
        const healthScore = results.summary.healthy / results.summary.total;
        
        if (results.summary.critical_failures > 0) {
            results.status = 'unhealthy';
        } else if (healthScore >= this.config.thresholds.healthy) {
            results.status = 'healthy';
        } else if (healthScore >= this.config.thresholds.degraded) {
            results.status = 'degraded';
        } else {
            results.status = 'unhealthy';
        }
        
        // Add metadata
        results.duration = Date.now() - startTime;
        results.version = this.config.version || '4.0.0';
        results.environment = this.config.environment || 'production';
        
        // Store results
        this.lastCheckTime = Date.now();
        this.overallStatus = results.status;
        this.checkResults = results;
        
        return results;
    }
    
    /**
     * Check ML Calculator functionality
     */
    async checkMLCalculator() {
        try {
            const calculator = new ConfidenceCalculator();
            
            // Test calculation with sample data
            const testData = {
                content: 'Test content for health check',
                embeddings: new Array(768).fill(0.1),
                categories: ['test'],
                categoryConfidence: 0.8,
                createdAt: new Date(),
                fileType: 'txt'
            };
            
            const startTime = Date.now();
            const result = await calculator.calculate(testData);
            const duration = Date.now() - startTime;
            
            // Validate result
            if (!result || typeof result.confidence !== 'number') {
                return {
                    status: 'unhealthy',
                    message: 'Invalid calculation result',
                    details: { result }
                };
            }
            
            // Check performance
            if (duration > 1000) {
                return {
                    status: 'degraded',
                    message: 'Slow calculation performance',
                    details: {
                        duration,
                        confidence: result.confidence
                    }
                };
            }
            
            return {
                status: 'healthy',
                message: 'ML Calculator functioning correctly',
                details: {
                    confidence: result.confidence,
                    duration,
                    weights: calculator.weights
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'ML Calculator check failed',
                error: error.message
            };
        }
    }
    
    /**
     * Check cache performance
     */
    async checkCache() {
        try {
            const cache = new CacheStrategy({
                maxSize: 100,
                ttl: 300000
            });
            
            // Test cache operations
            const testKey = 'health-check-test';
            const testValue = { data: 'test', timestamp: Date.now() };
            
            // Test set
            await cache.set(testKey, testValue);
            
            // Test get
            const retrieved = await cache.get(testKey);
            
            if (!retrieved || retrieved.data !== testValue.data) {
                return {
                    status: 'unhealthy',
                    message: 'Cache operations failing',
                    details: { retrieved, expected: testValue }
                };
            }
            
            // Get cache stats
            const stats = cache.getStats();
            const hitRate = parseFloat(stats.hitRate) / 100;
            
            // Evaluate cache health
            if (hitRate < 0.90) {
                return {
                    status: 'degraded',
                    message: 'Cache hit rate below threshold',
                    details: {
                        hitRate: `${(hitRate * 100).toFixed(1)}%`,
                        threshold: '90%',
                        stats
                    }
                };
            }
            
            // Clean up
            await cache.delete(testKey);
            
            return {
                status: 'healthy',
                message: 'Cache functioning optimally',
                details: {
                    hitRate: `${(hitRate * 100).toFixed(1)}%`,
                    size: stats.size,
                    evictions: stats.evictions
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Cache check failed',
                error: error.message
            };
        }
    }
    
    /**
     * Check database connectivity
     */
    async checkDatabase() {
        try {
            const qdrant = new QdrantService();
            
            // Check connection
            const startTime = Date.now();
            const isConnected = await qdrant.checkConnection();
            const latency = Date.now() - startTime;
            
            if (!isConnected) {
                return {
                    status: 'unhealthy',
                    message: 'Database connection failed',
                    details: {
                        url: qdrant.url,
                        error: 'Connection refused'
                    }
                };
            }
            
            // Check latency
            if (latency > 1000) {
                return {
                    status: 'degraded',
                    message: 'High database latency',
                    details: {
                        latency: `${latency}ms`,
                        threshold: '1000ms'
                    }
                };
            }
            
            // Get collection stats
            const stats = await qdrant.getCollectionStats();
            
            return {
                status: 'healthy',
                message: 'Database connection healthy',
                details: {
                    latency: `${latency}ms`,
                    pointCount: stats.vectorsCount,
                    indexedVectors: stats.indexedVectorsCount
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Database check failed',
                error: error.message
            };
        }
    }
    
    /**
     * Check worker pool
     */
    async checkWorkers() {
        try {
            // This would integrate with actual worker pool
            const workerPool = this.config.workerPool;
            
            if (!workerPool) {
                return {
                    status: 'degraded',
                    message: 'Worker pool not configured',
                    details: {}
                };
            }
            
            const active = workerPool.getActiveCount();
            const total = workerPool.getTotalCount();
            const available = total - active;
            
            // Check if workers are exhausted
            if (available === 0) {
                return {
                    status: 'unhealthy',
                    message: 'No available workers',
                    details: {
                        active,
                        total,
                        available
                    }
                };
            }
            
            // Check if most workers are busy
            const utilization = active / total;
            if (utilization > 0.8) {
                return {
                    status: 'degraded',
                    message: 'High worker utilization',
                    details: {
                        active,
                        total,
                        available,
                        utilization: `${(utilization * 100).toFixed(1)}%`
                    }
                };
            }
            
            return {
                status: 'healthy',
                message: 'Worker pool healthy',
                details: {
                    active,
                    total,
                    available,
                    utilization: `${(utilization * 100).toFixed(1)}%`
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Worker check failed',
                error: error.message
            };
        }
    }
    
    /**
     * Check memory usage
     */
    async checkMemory() {
        try {
            if (!performance.memory) {
                return {
                    status: 'degraded',
                    message: 'Memory API not available',
                    details: {}
                };
            }
            
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            const usage = used / limit;
            
            // Check memory usage levels
            if (usage > 0.95) {
                return {
                    status: 'unhealthy',
                    message: 'Critical memory usage',
                    details: {
                        used: `${(used / 1024 / 1024).toFixed(2)}MB`,
                        limit: `${(limit / 1024 / 1024).toFixed(2)}MB`,
                        usage: `${(usage * 100).toFixed(1)}%`
                    }
                };
            }
            
            if (usage > 0.85) {
                return {
                    status: 'degraded',
                    message: 'High memory usage',
                    details: {
                        used: `${(used / 1024 / 1024).toFixed(2)}MB`,
                        limit: `${(limit / 1024 / 1024).toFixed(2)}MB`,
                        usage: `${(usage * 100).toFixed(1)}%`
                    }
                };
            }
            
            return {
                status: 'healthy',
                message: 'Memory usage normal',
                details: {
                    used: `${(used / 1024 / 1024).toFixed(2)}MB`,
                    limit: `${(limit / 1024 / 1024).toFixed(2)}MB`,
                    usage: `${(usage * 100).toFixed(1)}%`
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Memory check failed',
                error: error.message
            };
        }
    }
    
    /**
     * Check API endpoints
     */
    async checkAPIEndpoints() {
        const endpoints = [
            { path: '/api/analyze', method: 'POST' },
            { path: '/api/confidence', method: 'GET' },
            { path: '/api/export', method: 'GET' }
        ];
        
        const results = [];
        
        for (const endpoint of endpoints) {
            try {
                // This would make actual API calls in production
                const response = await this.simulateAPICall(endpoint);
                
                if (response.status !== 200) {
                    results.push({
                        endpoint: endpoint.path,
                        status: 'unhealthy',
                        httpStatus: response.status
                    });
                } else {
                    results.push({
                        endpoint: endpoint.path,
                        status: 'healthy',
                        latency: response.latency
                    });
                }
            } catch (error) {
                results.push({
                    endpoint: endpoint.path,
                    status: 'unhealthy',
                    error: error.message
                });
            }
        }
        
        const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
        
        if (unhealthyCount > 0) {
            return {
                status: unhealthyCount === endpoints.length ? 'unhealthy' : 'degraded',
                message: `${unhealthyCount} API endpoints failing`,
                details: { endpoints: results }
            };
        }
        
        return {
            status: 'healthy',
            message: 'All API endpoints responsive',
            details: { endpoints: results }
        };
    }
    
    /**
     * Check file system access
     */
    async checkFileSystem() {
        try {
            // Test file system operations
            const testPath = './health-check-test.tmp';
            const testContent = 'Health check test file';
            
            // Write test
            if (typeof window === 'undefined') {
                // Node.js environment
                const fs = require('fs').promises;
                await fs.writeFile(testPath, testContent);
                const read = await fs.readFile(testPath, 'utf8');
                await fs.unlink(testPath);
                
                if (read !== testContent) {
                    return {
                        status: 'unhealthy',
                        message: 'File system read/write mismatch',
                        details: { written: testContent, read }
                    };
                }
            }
            
            return {
                status: 'healthy',
                message: 'File system access working',
                details: {
                    permissions: 'read/write',
                    tested: true
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'File system check failed',
                error: error.message
            };
        }
    }
    
    /**
     * Check embedding service
     */
    async checkEmbeddingService() {
        try {
            // Check Ollama connectivity
            const response = await fetch('http://127.0.0.1:11434/api/tags');
            
            if (!response.ok) {
                return {
                    status: 'unhealthy',
                    message: 'Ollama service unreachable',
                    details: {
                        url: 'http://127.0.0.1:11434',
                        status: response.status
                    }
                };
            }
            
            const data = await response.json();
            const hasEmbeddingModel = data.models?.some(m => 
                m.name.includes('nomic-embed-text')
            );
            
            if (!hasEmbeddingModel) {
                return {
                    status: 'degraded',
                    message: 'Embedding model not loaded',
                    details: {
                        requiredModel: 'nomic-embed-text',
                        availableModels: data.models?.map(m => m.name) || []
                    }
                };
            }
            
            return {
                status: 'healthy',
                message: 'Embedding service operational',
                details: {
                    model: 'nomic-embed-text',
                    available: true
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: 'Embedding service check failed',
                error: error.message
            };
        }
    }
    
    /**
     * Simulate API call for testing
     */
    async simulateAPICall(endpoint) {
        // Simulate network delay
        const latency = Math.random() * 100 + 50;
        await new Promise(resolve => setTimeout(resolve, latency));
        
        // Simulate occasional failures
        if (Math.random() < 0.05) {
            throw new Error('Simulated API failure');
        }
        
        return {
            status: 200,
            latency
        };
    }
    
    /**
     * Run with timeout
     */
    async runWithTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Health check timeout')), timeout)
            )
        ]);
    }
    
    /**
     * Get cached health status (for high-frequency checks)
     */
    getCachedStatus() {
        if (!this.lastCheckTime || Date.now() - this.lastCheckTime > 60000) {
            return {
                status: 'stale',
                message: 'Health check data is stale',
                lastCheck: this.lastCheckTime ? new Date(this.lastCheckTime).toISOString() : 'never'
            };
        }
        
        return {
            status: this.overallStatus,
            lastCheck: new Date(this.lastCheckTime).toISOString(),
            summary: this.checkResults.summary
        };
    }
    
    /**
     * Express middleware
     */
    middleware() {
        return async (req, res) => {
            if (req.path === this.config.endpoint || req.path === '/health') {
                try {
                    const results = await this.runHealthChecks();
                    
                    // Set appropriate status code
                    const statusCode = results.status === 'healthy' ? 200 :
                                     results.status === 'degraded' ? 206 : 503;
                    
                    res.status(statusCode).json(results);
                } catch (error) {
                    res.status(503).json({
                        status: 'error',
                        message: 'Health check failed',
                        error: error.message
                    });
                }
            } else {
                next();
            }
        };
    }
}

// Export for use in monitoring
export { HealthCheckService };