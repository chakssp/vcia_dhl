/**
 * Performance Tests for ML Optimization Components
 * 
 * Comprehensive benchmarks to validate performance improvements:
 * - Single calculation performance
 * - Batch processing throughput
 * - Cache effectiveness
 * - Worker pool efficiency
 * - Memory usage patterns
 * - Concurrent processing limits
 */

import OptimizedCalculator from './OptimizedCalculator.js';
import ConfidenceCalculator from '../../wave1/calculator/ConfidenceCalculator.js';
import PerformanceMonitor from './PerformanceMonitor.js';

export default class PerformanceTests {
    constructor() {
        this.baselineCalculator = new ConfidenceCalculator();
        this.optimizedCalculator = new OptimizedCalculator();
        this.monitor = new PerformanceMonitor('PerformanceTests');
        
        this.testData = this.generateTestData();
        this.results = {};
    }
    
    /**
     * Run all performance tests
     */
    async runAll() {
        console.log('=== ML Optimization Performance Tests ===\n');
        
        // Warm up
        await this.warmup();
        
        // Run test suites
        await this.testSingleCalculation();
        await this.testBatchProcessing();
        await this.testCacheEffectiveness();
        await this.testWorkerPoolScaling();
        await this.testMemoryUsage();
        await this.testConcurrentProcessing();
        await this.testErrorHandling();
        
        // Generate report
        this.generateReport();
        
        // Cleanup
        await this.cleanup();
    }
    
    /**
     * Warm up calculators
     */
    async warmup() {
        console.log('Warming up calculators...');
        
        const warmupData = this.testData.slice(0, 10);
        
        for (const data of warmupData) {
            await this.baselineCalculator.calculate(data);
            await this.optimizedCalculator.calculate(data);
        }
        
        console.log('Warmup complete\n');
    }
    
    /**
     * Test single calculation performance
     */
    async testSingleCalculation() {
        console.log('Test 1: Single Calculation Performance');
        console.log('=====================================');
        
        const testItem = this.testData[0];
        const iterations = 100;
        
        // Baseline performance
        const baselineTimer = this.monitor.startTimer('baseline_single');
        for (let i = 0; i < iterations; i++) {
            await this.baselineCalculator.calculate(testItem);
        }
        const baselineTime = baselineTimer.end();
        const baselineAvg = baselineTime / iterations;
        
        // Optimized performance
        const optimizedTimer = this.monitor.startTimer('optimized_single');
        for (let i = 0; i < iterations; i++) {
            await this.optimizedCalculator.calculate(testItem);
        }
        const optimizedTime = optimizedTimer.end();
        const optimizedAvg = optimizedTime / iterations;
        
        // Calculate improvement
        const improvement = ((baselineAvg - optimizedAvg) / baselineAvg) * 100;
        
        this.results.singleCalculation = {
            baseline: baselineAvg,
            optimized: optimizedAvg,
            improvement: improvement
        };
        
        console.log(`Baseline: ${baselineAvg.toFixed(2)}ms per calculation`);
        console.log(`Optimized: ${optimizedAvg.toFixed(2)}ms per calculation`);
        console.log(`Improvement: ${improvement.toFixed(1)}%`);
        console.log(`Target: 50% improvement ${improvement >= 50 ? '✓' : '✗'}\n`);
    }
    
    /**
     * Test batch processing performance
     */
    async testBatchProcessing() {
        console.log('Test 2: Batch Processing Performance');
        console.log('===================================');
        
        const batchSizes = [10, 50, 100];
        const results = {};
        
        for (const size of batchSizes) {
            const batch = this.testData.slice(0, size);
            
            // Baseline sequential processing
            const baselineTimer = this.monitor.startTimer(`baseline_batch_${size}`);
            const baselineResults = [];
            for (const item of batch) {
                baselineResults.push(await this.baselineCalculator.calculate(item));
            }
            const baselineTime = baselineTimer.end();
            
            // Optimized batch processing
            const optimizedTimer = this.monitor.startTimer(`optimized_batch_${size}`);
            const optimizedResults = await this.optimizedCalculator.processBatch(batch);
            const optimizedTime = optimizedTimer.end();
            
            // Calculate throughput
            const baselineThroughput = size / (baselineTime / 1000);
            const optimizedThroughput = size / (optimizedTime / 1000);
            const improvement = ((optimizedThroughput - baselineThroughput) / baselineThroughput) * 100;
            
            results[size] = {
                baseline: { time: baselineTime, throughput: baselineThroughput },
                optimized: { time: optimizedTime, throughput: optimizedThroughput },
                improvement
            };
            
            console.log(`Batch size ${size}:`);
            console.log(`  Baseline: ${baselineThroughput.toFixed(1)} items/sec`);
            console.log(`  Optimized: ${optimizedThroughput.toFixed(1)} items/sec`);
            console.log(`  Improvement: ${improvement.toFixed(1)}%`);
        }
        
        this.results.batchProcessing = results;
        console.log();
    }
    
    /**
     * Test cache effectiveness
     */
    async testCacheEffectiveness() {
        console.log('Test 3: Cache Effectiveness');
        console.log('==========================');
        
        // Clear cache
        await this.optimizedCalculator.cache.clear();
        
        const testItems = this.testData.slice(0, 50);
        const repeats = 3;
        
        // First pass - cache misses
        const firstPassTimer = this.monitor.startTimer('cache_first_pass');
        for (const item of testItems) {
            await this.optimizedCalculator.calculate(item);
        }
        const firstPassTime = firstPassTimer.end();
        
        // Get initial cache stats
        const statsAfterFirst = this.optimizedCalculator.cache.getStats();
        
        // Subsequent passes - cache hits
        const cachedTimes = [];
        for (let i = 0; i < repeats; i++) {
            const timer = this.monitor.startTimer(`cache_pass_${i + 2}`);
            for (const item of testItems) {
                await this.optimizedCalculator.calculate(item);
            }
            cachedTimes.push(timer.end());
        }
        
        // Get final cache stats
        const finalStats = this.optimizedCalculator.cache.getStats();
        
        // Calculate average cached time
        const avgCachedTime = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length;
        const cacheSpeedup = firstPassTime / avgCachedTime;
        
        this.results.cacheEffectiveness = {
            firstPassTime,
            avgCachedTime,
            speedup: cacheSpeedup,
            hitRate: finalStats.hitRate,
            cacheSize: finalStats.size
        };
        
        console.log(`First pass (cold cache): ${firstPassTime.toFixed(2)}ms`);
        console.log(`Cached passes average: ${avgCachedTime.toFixed(2)}ms`);
        console.log(`Cache speedup: ${cacheSpeedup.toFixed(1)}x`);
        console.log(`Cache hit rate: ${finalStats.hitRate}`);
        console.log(`Target: 90%+ hit rate ${parseFloat(finalStats.hitRate) >= 90 ? '✓' : '✗'}\n`);
    }
    
    /**
     * Test worker pool scaling
     */
    async testWorkerPoolScaling() {
        console.log('Test 4: Worker Pool Scaling');
        console.log('==========================');
        
        const workerCounts = [1, 2, 4, 8];
        const batch = this.testData.slice(0, 100);
        const results = {};
        
        for (const count of workerCounts) {
            // Reconfigure worker pool
            await this.optimizedCalculator.workerPool.terminate();
            this.optimizedCalculator.workerPool = new (await import('./MLWorkerPool.js')).default({
                workerCount: count,
                workerScript: '/agents_output/wave3/optimization/workers/ml-calculator.worker.js'
            });
            await this.optimizedCalculator.workerPool.warmup();
            
            // Test performance
            const timer = this.monitor.startTimer(`workers_${count}`);
            await this.optimizedCalculator.processBatch(batch);
            const time = timer.end();
            
            const throughput = batch.length / (time / 1000);
            results[count] = { time, throughput };
            
            console.log(`${count} workers: ${throughput.toFixed(1)} items/sec`);
        }
        
        this.results.workerScaling = results;
        
        // Calculate scaling efficiency
        const baselineThroughput = results[1].throughput;
        const maxThroughput = results[8].throughput;
        const scalingEfficiency = (maxThroughput / baselineThroughput) / 8;
        
        console.log(`Scaling efficiency: ${(scalingEfficiency * 100).toFixed(1)}%\n`);
    }
    
    /**
     * Test memory usage
     */
    async testMemoryUsage() {
        console.log('Test 5: Memory Usage');
        console.log('===================');
        
        if (!performance.memory) {
            console.log('Memory API not available in this environment\n');
            return;
        }
        
        // Clear everything
        await this.cleanup();
        
        // Measure baseline memory
        const baselineMemory = performance.memory.usedJSHeapSize;
        
        // Process large batch
        const largeBatch = this.generateTestData(1000);
        const timer = this.monitor.startTimer('memory_test');
        
        await this.optimizedCalculator.processBatch(largeBatch);
        
        timer.end();
        
        // Measure peak memory
        const peakMemory = performance.memory.usedJSHeapSize;
        const memoryIncrease = (peakMemory - baselineMemory) / (1024 * 1024); // MB
        
        this.results.memoryUsage = {
            baseline: baselineMemory / (1024 * 1024),
            peak: peakMemory / (1024 * 1024),
            increase: memoryIncrease
        };
        
        console.log(`Baseline memory: ${(baselineMemory / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`Peak memory: ${(peakMemory / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
        console.log(`Target: < 100MB footprint ${memoryIncrease < 100 ? '✓' : '✗'}\n`);
    }
    
    /**
     * Test concurrent processing
     */
    async testConcurrentProcessing() {
        console.log('Test 6: Concurrent Processing');
        console.log('============================');
        
        const concurrentLevels = [10, 50, 100, 200];
        const results = {};
        
        for (const level of concurrentLevels) {
            const batch = this.testData.slice(0, level);
            
            // Create concurrent calculations
            const timer = this.monitor.startTimer(`concurrent_${level}`);
            const promises = batch.map(item => this.optimizedCalculator.calculate(item));
            
            try {
                await Promise.all(promises);
                const time = timer.end();
                
                const throughput = level / (time / 1000);
                results[level] = { 
                    success: true, 
                    time, 
                    throughput,
                    avgTime: time / level
                };
                
                console.log(`${level} concurrent: ${throughput.toFixed(1)} items/sec, ${(time / level).toFixed(2)}ms avg`);
                
            } catch (error) {
                results[level] = { success: false, error: error.message };
                console.log(`${level} concurrent: FAILED - ${error.message}`);
            }
        }
        
        this.results.concurrentProcessing = results;
        
        const supports100 = results[100] && results[100].success;
        console.log(`Target: 100+ concurrent ${supports100 ? '✓' : '✗'}\n`);
    }
    
    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('Test 7: Error Handling & Recovery');
        console.log('=================================');
        
        // Test with invalid data
        const invalidData = [
            null,
            undefined,
            {},
            { content: null },
            { embeddings: 'invalid' },
            { categories: 'not-an-array' }
        ];
        
        let errors = 0;
        let recovered = 0;
        
        for (const data of invalidData) {
            try {
                await this.optimizedCalculator.calculate(data);
                recovered++;
            } catch (error) {
                errors++;
            }
        }
        
        // Test batch with mixed valid/invalid
        const mixedBatch = [
            ...this.testData.slice(0, 5),
            null,
            undefined,
            ...this.testData.slice(5, 10)
        ];
        
        const batchTimer = this.monitor.startTimer('error_batch');
        const batchResults = await this.optimizedCalculator.processBatch(mixedBatch);
        batchTimer.end();
        
        const failedInBatch = batchResults.filter(r => r && r.failed).length;
        const successInBatch = batchResults.filter(r => r && !r.failed).length;
        
        this.results.errorHandling = {
            invalidDataErrors: errors,
            invalidDataRecovered: recovered,
            batchFailed: failedInBatch,
            batchSuccess: successInBatch
        };
        
        console.log(`Invalid data: ${errors} errors, ${recovered} recovered`);
        console.log(`Mixed batch: ${successInBatch} success, ${failedInBatch} failed`);
        console.log(`Graceful degradation: ${recovered > 0 || successInBatch > 5 ? '✓' : '✗'}\n`);
    }
    
    /**
     * Generate test data
     */
    generateTestData(count = 200) {
        const data = [];
        
        for (let i = 0; i < count; i++) {
            data.push({
                fileId: `file_${i}`,
                content: this.generateContent(Math.random() * 2000 + 500),
                embeddings: this.generateEmbeddings(),
                categories: this.generateCategories(),
                categoryConfidence: Math.random(),
                createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
                modifiedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                fileType: ['md', 'txt', 'doc', 'pdf'][Math.floor(Math.random() * 4)],
                fileSize: Math.floor(Math.random() * 1000000),
                path: `/folder${Math.floor(i / 10)}/subfolder/file_${i}`,
                iteration: Math.floor(Math.random() * 5) + 1,
                previousConfidence: Math.random() * 0.7,
                improvementRate: Math.random() * 0.3
            });
        }
        
        return data;
    }
    
    /**
     * Generate test content
     */
    generateContent(length) {
        const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 
                      'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor'];
        let content = '';
        
        while (content.length < length) {
            content += words[Math.floor(Math.random() * words.length)] + ' ';
        }
        
        // Add some structure
        if (Math.random() > 0.5) {
            content = '# Title\n\n' + content;
        }
        if (Math.random() > 0.5) {
            content += '\n\n## Section\n\n' + words.join(' ');
        }
        if (Math.random() > 0.5) {
            content += '\n\n- Item 1\n- Item 2\n- Item 3';
        }
        
        return content;
    }
    
    /**
     * Generate test embeddings
     */
    generateEmbeddings() {
        const dimensions = 768;
        const embeddings = [];
        
        for (let i = 0; i < dimensions; i++) {
            embeddings.push((Math.random() - 0.5) * 2);
        }
        
        return embeddings;
    }
    
    /**
     * Generate test categories
     */
    generateCategories() {
        const allCategories = ['technical', 'business', 'personal', 'research', 
                              'documentation', 'planning', 'analysis'];
        const count = Math.floor(Math.random() * 4);
        const categories = [];
        
        for (let i = 0; i < count; i++) {
            categories.push(allCategories[Math.floor(Math.random() * allCategories.length)]);
        }
        
        return [...new Set(categories)];
    }
    
    /**
     * Generate performance report
     */
    generateReport() {
        console.log('=== Performance Test Summary ===\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            environment: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
                hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 'Unknown',
                memory: performance.memory ? {
                    jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2) + 'MB',
                    totalJSHeapSize: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB',
                    usedJSHeapSize: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB'
                } : 'Not available'
            },
            results: this.results,
            targets: {
                singleCalculation: {
                    target: '< 1s (50% improvement)',
                    achieved: this.results.singleCalculation?.improvement >= 50
                },
                cacheHitRate: {
                    target: '90%+',
                    achieved: parseFloat(this.results.cacheEffectiveness?.hitRate) >= 90
                },
                concurrentSupport: {
                    target: '100+ concurrent',
                    achieved: this.results.concurrentProcessing?.[100]?.success
                },
                memoryFootprint: {
                    target: '< 100MB',
                    achieved: this.results.memoryUsage?.increase < 100
                }
            }
        };
        
        console.log(JSON.stringify(report, null, 2));
        
        // Save report
        this.saveReport(report);
        
        return report;
    }
    
    /**
     * Save report to file (if in Node.js environment)
     */
    saveReport(report) {
        if (typeof window === 'undefined') {
            try {
                const fs = require('fs');
                const filename = `performance-report-${Date.now()}.json`;
                fs.writeFileSync(filename, JSON.stringify(report, null, 2));
                console.log(`\nReport saved to ${filename}`);
            } catch (error) {
                // Not in Node.js
            }
        }
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        await this.optimizedCalculator.cleanup();
    }
}

// Run tests if executed directly
if (typeof window === 'undefined' && process.argv[1] === import.meta.url) {
    const tests = new PerformanceTests();
    tests.runAll().catch(console.error);
}