/**
 * Post-deployment Test Script
 * ML Confidence Workflow System
 * 
 * Validates system functionality after deployment
 * Ensures all optimizations are working and confidence targets are met
 */

import HealthCheckService from '../monitoring/health-check.js';
import MetricsCollector from '../monitoring/metrics-collector.js';
import { productionConfig } from '../config/production.config.js';

class PostDeploymentTester {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:8000',
            timeout: config.timeout || 30000,
            confidenceTarget: config.confidenceTarget || 0.85,
            testIterations: config.testIterations || 100,
            ...config
        };
        
        this.healthCheck = new HealthCheckService();
        this.metricsCollector = new MetricsCollector();
        
        this.results = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production',
            tests: [],
            metrics: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }
    
    /**
     * Run all post-deployment tests
     */
    async runTests() {
        console.log('🚀 Running post-deployment tests...\n');
        
        try {
            // Basic connectivity
            await this.testConnectivity();
            
            // Health checks
            await this.testHealthChecks();
            
            // Configuration validation
            await this.testConfiguration();
            
            // ML confidence tests
            await this.testMLConfidence();
            
            // Performance tests
            await this.testPerformance();
            
            // Cache effectiveness
            await this.testCache();
            
            // Worker pool
            await this.testWorkers();
            
            // API endpoints
            await this.testAPIEndpoints();
            
            // Security headers
            await this.testSecurity();
            
            // Integration tests
            await this.testIntegrations();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('Fatal error during testing:', error);
            this.results.fatalError = error.message;
            this.generateReport();
            process.exit(1);
        }
    }
    
    /**
     * Test basic connectivity
     */
    async testConnectivity() {
        const test = this.startTest('Basic Connectivity');
        
        try {
            const response = await fetch(`${this.config.baseUrl}/health`);
            
            if (response.ok) {
                this.passTest(test, 'Application is accessible');
            } else {
                this.failTest(test, `HTTP ${response.status} response`);
            }
        } catch (error) {
            this.failTest(test, `Cannot connect: ${error.message}`);
        }
    }
    
    /**
     * Test health checks
     */
    async testHealthChecks() {
        const test = this.startTest('Health Checks');
        
        try {
            const results = await this.healthCheck.runHealthChecks();
            
            if (results.status === 'healthy') {
                this.passTest(test, 'All health checks passed', results.summary);
            } else if (results.status === 'degraded') {
                this.warnTest(test, 'Some health checks degraded', results.summary);
            } else {
                this.failTest(test, 'Health checks failing', results.summary);
            }
            
            // Store health metrics
            this.results.metrics.health = results;
            
        } catch (error) {
            this.failTest(test, `Health check error: ${error.message}`);
        }
    }
    
    /**
     * Test configuration
     */
    async testConfiguration() {
        const test = this.startTest('Configuration Validation');
        
        try {
            // Test weight optimization is applied
            const weights = productionConfig.mlCalculator.weights;
            const expectedWeights = {
                semantic: 0.38,
                categorical: 0.27,
                structural: 0.23,
                temporal: 0.12
            };
            
            const weightsMatch = Object.keys(expectedWeights).every(
                key => Math.abs(weights[key] - expectedWeights[key]) < 0.001
            );
            
            if (!weightsMatch) {
                this.failTest(test, 'Optimized weights not applied correctly', { weights });
                return;
            }
            
            // Test convergence parameters
            const convergence = productionConfig.convergence;
            if (convergence.plateauThreshold !== 0.015) {
                this.warnTest(test, 'Convergence threshold not optimized', { convergence });
            }
            
            // Test cache configuration
            const cache = productionConfig.cache;
            if (!cache.warming.enabled) {
                this.warnTest(test, 'Predictive cache warming not enabled');
            }
            
            this.passTest(test, 'Configuration validated successfully');
            
        } catch (error) {
            this.failTest(test, `Configuration error: ${error.message}`);
        }
    }
    
    /**
     * Test ML confidence levels
     */
    async testMLConfidence() {
        const test = this.startTest('ML Confidence Target');
        
        try {
            const testResults = [];
            
            // Run multiple test analyses
            for (let i = 0; i < this.config.testIterations; i++) {
                const testData = this.generateTestData();
                
                const response = await fetch(`${this.config.baseUrl}/api/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testData)
                });
                
                if (!response.ok) {
                    this.failTest(test, `Analysis failed: HTTP ${response.status}`);
                    return;
                }
                
                const result = await response.json();
                testResults.push(result.confidence);
            }
            
            // Calculate statistics
            const avgConfidence = testResults.reduce((a, b) => a + b, 0) / testResults.length;
            const minConfidence = Math.min(...testResults);
            const maxConfidence = Math.max(...testResults);
            const above85 = testResults.filter(c => c >= 0.85).length;
            const percentAbove85 = (above85 / testResults.length) * 100;
            
            this.results.metrics.confidence = {
                average: avgConfidence,
                min: minConfidence,
                max: maxConfidence,
                above85Percent: percentAbove85,
                samples: testResults.length
            };
            
            // Check if target is met
            if (avgConfidence >= this.config.confidenceTarget) {
                this.passTest(test, 
                    `Target achieved: ${(avgConfidence * 100).toFixed(2)}% average confidence`,
                    this.results.metrics.confidence
                );
            } else {
                this.failTest(test,
                    `Below target: ${(avgConfidence * 100).toFixed(2)}% < 85%`,
                    this.results.metrics.confidence
                );
            }
            
        } catch (error) {
            this.failTest(test, `Confidence test error: ${error.message}`);
        }
    }
    
    /**
     * Test performance metrics
     */
    async testPerformance() {
        const test = this.startTest('Performance Metrics');
        
        try {
            const latencies = [];
            const startTime = Date.now();
            
            // Run performance tests
            for (let i = 0; i < 50; i++) {
                const reqStart = Date.now();
                
                const response = await fetch(`${this.config.baseUrl}/api/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.generateTestData())
                });
                
                const latency = Date.now() - reqStart;
                latencies.push(latency);
                
                if (!response.ok) {
                    this.warnTest(test, `Request failed: HTTP ${response.status}`);
                }
            }
            
            // Calculate metrics
            const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
            const p99Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)];
            const throughput = latencies.length / ((Date.now() - startTime) / 1000);
            
            this.results.metrics.performance = {
                avgLatency,
                p95Latency,
                p99Latency,
                throughput,
                samples: latencies.length
            };
            
            // Check against targets
            if (avgLatency < 1000 && p95Latency < 2000) {
                this.passTest(test, 
                    `Performance targets met: ${avgLatency.toFixed(0)}ms avg, ${throughput.toFixed(1)} req/s`,
                    this.results.metrics.performance
                );
            } else {
                this.warnTest(test,
                    `Performance below optimal: ${avgLatency.toFixed(0)}ms avg`,
                    this.results.metrics.performance
                );
            }
            
        } catch (error) {
            this.failTest(test, `Performance test error: ${error.message}`);
        }
    }
    
    /**
     * Test cache effectiveness
     */
    async testCache() {
        const test = this.startTest('Cache Effectiveness');
        
        try {
            // Get cache metrics
            const response = await fetch(`${this.config.baseUrl}/metrics`);
            const metricsText = await response.text();
            
            // Parse cache hit rate
            const hitRateMatch = metricsText.match(/ml_confidence_cache_hit_rate (\d+\.?\d*)/);
            const hitRate = hitRateMatch ? parseFloat(hitRateMatch[1]) : 0;
            
            this.results.metrics.cache = {
                hitRate,
                target: 95
            };
            
            if (hitRate >= 95) {
                this.passTest(test, `Cache hit rate: ${hitRate}%`);
            } else if (hitRate >= 90) {
                this.warnTest(test, `Cache hit rate below target: ${hitRate}% < 95%`);
            } else {
                this.failTest(test, `Poor cache performance: ${hitRate}%`);
            }
            
        } catch (error) {
            this.warnTest(test, `Cache test error: ${error.message}`);
        }
    }
    
    /**
     * Test worker pool
     */
    async testWorkers() {
        const test = this.startTest('Worker Pool');
        
        try {
            // Create concurrent load
            const concurrentRequests = 50;
            const requests = [];
            
            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(
                    fetch(`${this.config.baseUrl}/api/analyze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(this.generateTestData())
                    })
                );
            }
            
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const duration = Date.now() - startTime;
            
            const successCount = responses.filter(r => r.ok).length;
            const successRate = (successCount / concurrentRequests) * 100;
            
            this.results.metrics.workers = {
                concurrentRequests,
                successCount,
                successRate,
                duration
            };
            
            if (successRate === 100) {
                this.passTest(test, 
                    `Handled ${concurrentRequests} concurrent requests in ${duration}ms`,
                    this.results.metrics.workers
                );
            } else {
                this.warnTest(test,
                    `Some requests failed: ${successRate.toFixed(1)}% success rate`,
                    this.results.metrics.workers
                );
            }
            
        } catch (error) {
            this.failTest(test, `Worker test error: ${error.message}`);
        }
    }
    
    /**
     * Test API endpoints
     */
    async testAPIEndpoints() {
        const test = this.startTest('API Endpoints');
        
        const endpoints = [
            { path: '/health', method: 'GET' },
            { path: '/metrics', method: 'GET' },
            { path: '/api/confidence', method: 'GET' },
            { path: '/api/analyze', method: 'POST', body: this.generateTestData() }
        ];
        
        const results = [];
        
        for (const endpoint of endpoints) {
            try {
                const options = {
                    method: endpoint.method,
                    headers: { 'Content-Type': 'application/json' }
                };
                
                if (endpoint.body) {
                    options.body = JSON.stringify(endpoint.body);
                }
                
                const response = await fetch(`${this.config.baseUrl}${endpoint.path}`, options);
                
                results.push({
                    endpoint: `${endpoint.method} ${endpoint.path}`,
                    status: response.status,
                    ok: response.ok
                });
                
            } catch (error) {
                results.push({
                    endpoint: `${endpoint.method} ${endpoint.path}`,
                    error: error.message
                });
            }
        }
        
        const failures = results.filter(r => !r.ok);
        
        if (failures.length === 0) {
            this.passTest(test, 'All API endpoints operational', { endpoints: results });
        } else {
            this.failTest(test, `${failures.length} endpoints failing`, { endpoints: results });
        }
    }
    
    /**
     * Test security headers
     */
    async testSecurity() {
        const test = this.startTest('Security Headers');
        
        try {
            const response = await fetch(`${this.config.baseUrl}/health`);
            const headers = response.headers;
            
            const securityHeaders = {
                'strict-transport-security': headers.get('strict-transport-security'),
                'x-content-type-options': headers.get('x-content-type-options'),
                'x-frame-options': headers.get('x-frame-options'),
                'content-security-policy': headers.get('content-security-policy')
            };
            
            const missing = Object.entries(securityHeaders)
                .filter(([name, value]) => !value)
                .map(([name]) => name);
            
            if (missing.length === 0) {
                this.passTest(test, 'All security headers present', securityHeaders);
            } else {
                this.warnTest(test, `Missing security headers: ${missing.join(', ')}`, securityHeaders);
            }
            
        } catch (error) {
            this.warnTest(test, `Security test error: ${error.message}`);
        }
    }
    
    /**
     * Test external integrations
     */
    async testIntegrations() {
        const test = this.startTest('External Integrations');
        
        const integrations = [];
        
        // Test Qdrant
        try {
            const qdrantUrl = process.env.QDRANT_URL || 'http://qdr.vcia.com.br:6333';
            const response = await fetch(`${qdrantUrl}/health`);
            integrations.push({
                service: 'Qdrant',
                status: response.ok ? 'operational' : 'failing',
                latency: response.headers.get('x-response-time')
            });
        } catch (error) {
            integrations.push({
                service: 'Qdrant',
                status: 'unreachable',
                error: error.message
            });
        }
        
        // Test Ollama
        try {
            const response = await fetch('http://127.0.0.1:11434/api/tags');
            integrations.push({
                service: 'Ollama',
                status: response.ok ? 'operational' : 'failing'
            });
        } catch (error) {
            integrations.push({
                service: 'Ollama',
                status: 'unreachable',
                error: error.message
            });
        }
        
        const failures = integrations.filter(i => i.status !== 'operational');
        
        if (failures.length === 0) {
            this.passTest(test, 'All integrations operational', { integrations });
        } else {
            this.warnTest(test, `${failures.length} integrations not fully operational`, { integrations });
        }
    }
    
    /**
     * Generate test data
     */
    generateTestData() {
        const categories = ['technical', 'business', 'research', 'documentation'];
        const content = `Test content generated at ${Date.now()}. This is a sample document for testing 
                        the ML confidence workflow system with various optimization strategies applied.`;
        
        return {
            fileId: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            content,
            categories: [categories[Math.floor(Math.random() * categories.length)]],
            categoryConfidence: 0.8 + Math.random() * 0.2,
            embeddings: new Array(768).fill(0).map(() => (Math.random() - 0.5) * 2),
            createdAt: new Date().toISOString(),
            fileType: 'txt'
        };
    }
    
    /**
     * Test helpers
     */
    startTest(name) {
        const test = {
            name,
            startTime: Date.now(),
            status: 'running'
        };
        
        console.log(`\n📋 Testing ${name}...`);
        return test;
    }
    
    passTest(test, message, details) {
        test.status = 'passed';
        test.duration = Date.now() - test.startTime;
        test.message = message;
        test.details = details;
        
        this.results.tests.push(test);
        this.results.summary.passed++;
        this.results.summary.total++;
        
        console.log(`   ✅ ${message}`);
    }
    
    failTest(test, message, details) {
        test.status = 'failed';
        test.duration = Date.now() - test.startTime;
        test.message = message;
        test.details = details;
        
        this.results.tests.push(test);
        this.results.summary.failed++;
        this.results.summary.total++;
        
        console.log(`   ❌ ${message}`);
    }
    
    warnTest(test, message, details) {
        test.status = 'warning';
        test.duration = Date.now() - test.startTime;
        test.message = message;
        test.details = details;
        
        this.results.tests.push(test);
        this.results.summary.warnings++;
        this.results.summary.total++;
        
        console.log(`   ⚠️  ${message}`);
    }
    
    /**
     * Generate final report
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('POST-DEPLOYMENT TEST REPORT');
        console.log('='.repeat(60));
        
        console.log(`\nEnvironment: ${this.results.environment}`);
        console.log(`Timestamp: ${this.results.timestamp}`);
        console.log(`Total Tests: ${this.results.summary.total}`);
        
        console.log(`\n✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
        
        // Key metrics
        if (this.results.metrics.confidence) {
            console.log(`\n📊 ML Confidence:`);
            console.log(`   Average: ${(this.results.metrics.confidence.average * 100).toFixed(2)}%`);
            console.log(`   Above 85%: ${this.results.metrics.confidence.above85Percent.toFixed(1)}% of samples`);
        }
        
        if (this.results.metrics.performance) {
            console.log(`\n⚡ Performance:`);
            console.log(`   Avg Latency: ${this.results.metrics.performance.avgLatency.toFixed(0)}ms`);
            console.log(`   P95 Latency: ${this.results.metrics.performance.p95Latency.toFixed(0)}ms`);
            console.log(`   Throughput: ${this.results.metrics.performance.throughput.toFixed(1)} req/s`);
        }
        
        // Overall result
        const success = this.results.summary.failed === 0 && 
                       this.results.metrics.confidence?.average >= 0.85;
        
        if (success) {
            console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
            console.log('   All tests passed and confidence target achieved.');
        } else {
            console.log('\n⚠️  DEPLOYMENT REQUIRES ATTENTION');
            console.log('   Some tests failed or confidence target not met.');
        }
        
        // Save detailed report
        const reportPath = `./deployment-test-report-${Date.now()}.json`;
        require('fs').writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\nDetailed report saved to: ${reportPath}\n`);
        
        // Exit with appropriate code
        process.exit(success ? 0 : 1);
    }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new PostDeploymentTester({
        baseUrl: process.env.BASE_URL || 'http://localhost:8000'
    });
    
    tester.runTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export default PostDeploymentTester;