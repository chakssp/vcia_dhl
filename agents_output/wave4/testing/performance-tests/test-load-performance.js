/**
 * Load and Performance Tests for ML Confidence System
 * 
 * Validates system performance under various load conditions including
 * the critical 1000+ item processing requirement.
 */

import OptimizedCalculator from '../../../wave3/optimization/OptimizedCalculator.js';
import ConfidenceCalculator from '../../../wave1/calculator/ConfidenceCalculator.js';
import ConfidenceTracker from '../../../wave1/tracker/ConfidenceTracker.js';
import MLWorkerPool from '../../../wave3/optimization/MLWorkerPool.js';
import CacheStrategy from '../../../wave3/optimization/CacheStrategy.js';
import PerformanceMonitor from '../../../wave3/optimization/PerformanceMonitor.js';

export default class TestLoadPerformance {
    constructor() {
        this.type = 'performance';
        this.name = 'Load and Performance Tests';
        this.components = {};
        this.monitor = null;
    }
    
    async setup(helpers, mocks) {
        this.helpers = helpers;
        this.mocks = mocks;
        
        // Initialize components
        this.components = {
            standardCalculator: new ConfidenceCalculator(),
            optimizedCalculator: new OptimizedCalculator({
                workerCount: navigator.hardwareConcurrency || 4,
                cacheSize: 2000,
                enableBatching: true,
                adaptiveBatching: true
            }),
            tracker: new ConfidenceTracker({
                maxHistorySize: 100,
                enableAutoAnalysis: false // Disable for performance testing
            }),
            cache: new CacheStrategy({
                maxSize: 2000,
                ttl: 300000,
                compressionThreshold: 1024
            })
        };
        
        this.monitor = new PerformanceMonitor('LoadTests');
        
        // Warm up components
        await this.warmup();
    }
    
    async teardown() {
        if (this.components.optimizedCalculator) {
            await this.components.optimizedCalculator.cleanup();
        }
        this.monitor = null;
        this.components = {};
    }
    
    async warmup() {
        console.log('Warming up components...');
        const warmupData = this.helpers.generateBatch(10);
        
        for (const item of warmupData) {
            await this.components.standardCalculator.calculate(item);
            await this.components.optimizedCalculator.calculate(item);
        }
        
        console.log('Warmup complete');
    }
    
    getTests() {
        return [
            // Single Item Performance Tests
            {
                name: '< 1s single calculation performance',
                fn: async (ctx) => {
                    const testData = this.helpers.generateMockAnalysisData({
                        content: this.helpers.generateContent(2000),
                        embeddings: this.helpers.generateEmbeddings()
                    });
                    
                    const iterations = 100;
                    const times = [];
                    
                    for (let i = 0; i < iterations; i++) {
                        const start = performance.now();
                        await this.components.optimizedCalculator.calculate(testData);
                        const duration = performance.now() - start;
                        times.push(duration);
                    }
                    
                    const stats = this.calculateStats(times);
                    
                    ctx.assert(stats.mean < 1000, `Mean time ${stats.mean.toFixed(2)}ms should be < 1000ms`);
                    ctx.assert(stats.p95 < 1000, `P95 time ${stats.p95.toFixed(2)}ms should be < 1000ms`);
                    ctx.assert(stats.max < 2000, `Max time ${stats.max.toFixed(2)}ms should be < 2000ms`);
                    
                    // Store metrics for reporting
                    ctx.metrics = {
                        singleCalculation: stats
                    };
                }
            },
            
            // Batch Processing Tests
            {
                name: 'Batch processing throughput (100 items)',
                fn: async (ctx) => {
                    const batchSizes = [10, 50, 100];
                    const results = {};
                    
                    for (const size of batchSizes) {
                        const batch = this.helpers.getCachedBatch(size);
                        
                        // Standard sequential processing
                        const standardTimer = this.monitor.startTimer(`standard_${size}`);
                        const standardResults = [];
                        for (const item of batch) {
                            standardResults.push(await this.components.standardCalculator.calculate(item));
                        }
                        const standardTime = standardTimer.end();
                        
                        // Optimized batch processing
                        const optimizedTimer = this.monitor.startTimer(`optimized_${size}`);
                        const optimizedResults = await this.components.optimizedCalculator.processBatch(batch);
                        const optimizedTime = optimizedTimer.end();
                        
                        const standardThroughput = (size / standardTime) * 1000; // items/sec
                        const optimizedThroughput = (size / optimizedTime) * 1000; // items/sec
                        const improvement = ((optimizedThroughput - standardThroughput) / standardThroughput) * 100;
                        
                        results[size] = {
                            standard: { time: standardTime, throughput: standardThroughput },
                            optimized: { time: optimizedTime, throughput: optimizedThroughput },
                            improvement
                        };
                        
                        ctx.assert(improvement > 50, `Batch ${size}: ${improvement.toFixed(1)}% improvement should be > 50%`);
                    }
                    
                    ctx.metrics = { batchProcessing: results };
                }
            },
            
            // 1000+ Items Load Test
            {
                name: 'Load test with 1000+ items',
                timeout: 300000, // 5 minutes
                fn: async (ctx) => {
                    const itemCounts = [100, 500, 1000, 1500];
                    const results = {};
                    
                    for (const count of itemCounts) {
                        console.log(`Testing with ${count} items...`);
                        
                        // Generate test data
                        const timer = this.monitor.startTimer(`generate_${count}`);
                        const testData = this.helpers.generateBatch(count, {
                            content: this.helpers.generateContent(1000)
                        });
                        timer.end();
                        
                        // Memory before
                        const memBefore = this.getMemoryUsage();
                        
                        // Process batch
                        const processTimer = this.monitor.startTimer(`process_${count}`);
                        const processedResults = await this.components.optimizedCalculator.processBatch(testData, {
                            maxConcurrent: 50,
                            batchSize: 25,
                            progressCallback: (progress) => {
                                if (progress % 100 === 0) {
                                    console.log(`  Processed ${progress}/${count} items`);
                                }
                            }
                        });
                        const processTime = processTimer.end();
                        
                        // Memory after
                        const memAfter = this.getMemoryUsage();
                        const memoryIncrease = memAfter - memBefore;
                        
                        // Calculate metrics
                        const throughput = (count / processTime) * 1000; // items/sec
                        const avgTimePerItem = processTime / count;
                        
                        results[count] = {
                            totalTime: processTime,
                            throughput,
                            avgTimePerItem,
                            memoryIncrease: memoryIncrease / (1024 * 1024), // MB
                            success: processedResults.length === count,
                            failed: processedResults.filter(r => r && r.error).length
                        };
                        
                        // Assertions
                        ctx.assert(results[count].success, `Should process all ${count} items`);
                        ctx.assert(results[count].failed === 0, `No items should fail`);
                        ctx.assert(avgTimePerItem < 100, `Average time per item should be < 100ms`);
                        
                        // Allow GC between tests
                        await this.helpers.delay(1000);
                    }
                    
                    // Verify 1000+ items specifically
                    const test1000 = results[1000];
                    ctx.assert(test1000.throughput > 10, 'Should process > 10 items/sec for 1000 items');
                    ctx.assert(test1000.memoryIncrease < 200, 'Memory increase should be < 200MB');
                    
                    ctx.metrics = { loadTest: results };
                }
            },
            
            // Concurrent Processing Tests
            {
                name: 'Concurrent request handling',
                fn: async (ctx) => {
                    const concurrentLevels = [10, 50, 100, 200];
                    const results = {};
                    
                    for (const level of concurrentLevels) {
                        const testData = this.helpers.generateBatch(level);
                        
                        const timer = this.monitor.startTimer(`concurrent_${level}`);
                        
                        try {
                            // Create concurrent calculations
                            const promises = testData.map(item => 
                                this.components.optimizedCalculator.calculate(item)
                            );
                            
                            const concurrentResults = await Promise.all(promises);
                            const time = timer.end();
                            
                            const throughput = (level / time) * 1000;
                            const avgTime = time / level;
                            
                            results[level] = {
                                success: true,
                                time,
                                throughput,
                                avgTime,
                                allCompleted: concurrentResults.length === level
                            };
                            
                            ctx.assert(results[level].allCompleted, `All ${level} concurrent requests should complete`);
                            
                        } catch (error) {
                            results[level] = {
                                success: false,
                                error: error.message
                            };
                        }
                    }
                    
                    // At least 100 concurrent should work
                    ctx.assert(results[100].success, 'Should handle 100+ concurrent requests');
                    
                    ctx.metrics = { concurrentProcessing: results };
                }
            },
            
            // Memory Leak Detection
            {
                name: 'Memory leak detection under load',
                timeout: 120000,
                fn: async (ctx) => {
                    if (!performance.memory) {
                        ctx.skip = true;
                        return;
                    }
                    
                    const iterations = 10;
                    const batchSize = 100;
                    const memoryReadings = [];
                    
                    // Force GC if available
                    if (global.gc) {
                        global.gc();
                        await this.helpers.delay(100);
                    }
                    
                    const initialMemory = performance.memory.usedJSHeapSize;
                    
                    for (let i = 0; i < iterations; i++) {
                        const batch = this.helpers.generateBatch(batchSize);
                        
                        // Process batch
                        await this.components.optimizedCalculator.processBatch(batch);
                        
                        // Track files
                        for (const item of batch.slice(0, 10)) {
                            await this.components.tracker.startTracking(item.fileId, item);
                            await this.components.tracker.updateMetrics(item.fileId, {
                                overall: Math.random(),
                                dimensions: {},
                                calculatedAt: new Date()
                            });
                        }
                        
                        // Clean up tracking
                        for (const item of batch.slice(0, 10)) {
                            await this.components.tracker.stopTracking(item.fileId);
                        }
                        
                        // Force GC periodically
                        if (i % 3 === 0 && global.gc) {
                            global.gc();
                            await this.helpers.delay(100);
                        }
                        
                        memoryReadings.push(performance.memory.usedJSHeapSize);
                    }
                    
                    // Final GC
                    if (global.gc) {
                        global.gc();
                        await this.helpers.delay(500);
                    }
                    
                    const finalMemory = performance.memory.usedJSHeapSize;
                    const totalLeak = (finalMemory - initialMemory) / (1024 * 1024); // MB
                    const avgLeak = totalLeak / iterations;
                    
                    ctx.assert(avgLeak < 5, `Average leak per iteration (${avgLeak.toFixed(2)}MB) should be < 5MB`);
                    ctx.assert(totalLeak < 50, `Total leak (${totalLeak.toFixed(2)}MB) should be < 50MB`);
                    
                    ctx.metrics = {
                        memoryLeak: {
                            initial: initialMemory / (1024 * 1024),
                            final: finalMemory / (1024 * 1024),
                            totalLeak,
                            avgLeakPerIteration: avgLeak,
                            readings: memoryReadings.map(r => r / (1024 * 1024))
                        }
                    };
                }
            },
            
            // Cache Performance Tests
            {
                name: 'Cache effectiveness under load',
                fn: async (ctx) => {
                    // Clear cache
                    await this.components.optimizedCalculator.cache.clear();
                    
                    // Generate repeating dataset
                    const uniqueItems = 50;
                    const totalRequests = 500;
                    const baseData = this.helpers.generateBatch(uniqueItems);
                    
                    // Create request pattern with repetitions
                    const requests = [];
                    for (let i = 0; i < totalRequests; i++) {
                        requests.push(baseData[i % uniqueItems]);
                    }
                    
                    // Process with cache tracking
                    const cacheStats = {
                        hits: 0,
                        misses: 0,
                        times: []
                    };
                    
                    for (const [index, item] of requests.entries()) {
                        const start = performance.now();
                        const result = await this.components.optimizedCalculator.calculate(item);
                        const time = performance.now() - start;
                        
                        cacheStats.times.push(time);
                        
                        // Track cache performance after warmup
                        if (index >= uniqueItems) {
                            if (time < 5) {
                                cacheStats.hits++;
                            } else {
                                cacheStats.misses++;
                            }
                        }
                    }
                    
                    const hitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100;
                    const avgColdTime = cacheStats.times.slice(0, uniqueItems).reduce((a, b) => a + b) / uniqueItems;
                    const avgWarmTime = cacheStats.times.slice(uniqueItems).reduce((a, b) => a + b) / (totalRequests - uniqueItems);
                    const speedup = avgColdTime / avgWarmTime;
                    
                    ctx.assert(hitRate > 90, `Cache hit rate (${hitRate.toFixed(1)}%) should be > 90%`);
                    ctx.assert(speedup > 10, `Cache speedup (${speedup.toFixed(1)}x) should be > 10x`);
                    
                    ctx.metrics = {
                        cachePerformance: {
                            hitRate,
                            avgColdTime,
                            avgWarmTime,
                            speedup,
                            totalRequests
                        }
                    };
                }
            },
            
            // Worker Pool Scaling Tests
            {
                name: 'Worker pool scaling efficiency',
                fn: async (ctx) => {
                    const workerCounts = [1, 2, 4, 8];
                    const batchSize = 200;
                    const results = {};
                    
                    for (const workerCount of workerCounts) {
                        // Create new calculator with specific worker count
                        const calculator = new OptimizedCalculator({
                            workerCount,
                            enableWorkers: true
                        });
                        
                        await calculator.initialize();
                        
                        const batch = this.helpers.getCachedBatch(batchSize);
                        
                        const timer = this.monitor.startTimer(`workers_${workerCount}`);
                        await calculator.processBatch(batch);
                        const time = timer.end();
                        
                        const throughput = (batchSize / time) * 1000;
                        
                        results[workerCount] = {
                            time,
                            throughput,
                            throughputPerWorker: throughput / workerCount
                        };
                        
                        await calculator.cleanup();
                    }
                    
                    // Calculate scaling efficiency
                    const baseline = results[1].throughput;
                    const scaling8 = results[8].throughput / baseline;
                    const efficiency = (scaling8 / 8) * 100;
                    
                    ctx.assert(efficiency > 50, `Scaling efficiency (${efficiency.toFixed(1)}%) should be > 50%`);
                    
                    ctx.metrics = {
                        workerScaling: results,
                        scalingEfficiency: efficiency
                    };
                }
            },
            
            // Stress Test
            {
                name: 'Stress test - system limits',
                timeout: 300000,
                fn: async (ctx) => {
                    const testConfigs = [
                        { items: 2000, concurrent: 100, batchSize: 50 },
                        { items: 5000, concurrent: 50, batchSize: 100 }
                    ];
                    
                    const results = [];
                    
                    for (const config of testConfigs) {
                        console.log(`Stress test: ${config.items} items, ${config.concurrent} concurrent`);
                        
                        const startMem = this.getMemoryUsage();
                        const startTime = Date.now();
                        
                        try {
                            // Generate data in chunks to avoid memory issues
                            const chunks = Math.ceil(config.items / config.batchSize);
                            const allResults = [];
                            
                            for (let i = 0; i < chunks; i++) {
                                const chunkSize = Math.min(config.batchSize, config.items - i * config.batchSize);
                                const chunk = this.helpers.generateBatch(chunkSize);
                                
                                const chunkResults = await this.components.optimizedCalculator.processBatch(chunk, {
                                    maxConcurrent: config.concurrent
                                });
                                
                                allResults.push(...chunkResults);
                                
                                // Progress
                                if (i % 10 === 0) {
                                    console.log(`  Progress: ${allResults.length}/${config.items}`);
                                }
                            }
                            
                            const totalTime = Date.now() - startTime;
                            const endMem = this.getMemoryUsage();
                            
                            results.push({
                                config,
                                success: true,
                                processed: allResults.length,
                                totalTime,
                                throughput: (config.items / totalTime) * 1000,
                                memoryUsed: (endMem - startMem) / (1024 * 1024),
                                errors: allResults.filter(r => r && r.error).length
                            });
                            
                        } catch (error) {
                            results.push({
                                config,
                                success: false,
                                error: error.message
                            });
                        }
                    }
                    
                    // At least the first config should succeed
                    ctx.assert(results[0].success, 'Should handle 2000 items stress test');
                    
                    ctx.metrics = { stressTest: results };
                }
            },
            
            // Real-world Simulation
            {
                name: 'Real-world usage simulation',
                timeout: 180000,
                fn: async (ctx) => {
                    // Simulate realistic usage pattern
                    const duration = 60000; // 1 minute
                    const startTime = Date.now();
                    const stats = {
                        totalProcessed: 0,
                        batchProcessed: 0,
                        cacheHits: 0,
                        errors: 0,
                        responseTimes: []
                    };
                    
                    // Pre-generate some common files
                    const commonFiles = this.helpers.generateBatch(20);
                    const operations = ['single', 'batch', 'cached'];
                    
                    while (Date.now() - startTime < duration) {
                        const operation = this.helpers.randomChoice(operations);
                        
                        try {
                            switch (operation) {
                                case 'single':
                                    // New file calculation
                                    const newFile = this.helpers.generateMockAnalysisData();
                                    const singleStart = performance.now();
                                    await this.components.optimizedCalculator.calculate(newFile);
                                    stats.responseTimes.push(performance.now() - singleStart);
                                    stats.totalProcessed++;
                                    break;
                                    
                                case 'batch':
                                    // Batch processing
                                    const batchSize = Math.floor(Math.random() * 20) + 5;
                                    const batch = this.helpers.generateBatch(batchSize);
                                    const batchStart = performance.now();
                                    await this.components.optimizedCalculator.processBatch(batch);
                                    const batchTime = performance.now() - batchStart;
                                    stats.responseTimes.push(...Array(batchSize).fill(batchTime / batchSize));
                                    stats.totalProcessed += batchSize;
                                    stats.batchProcessed += batchSize;
                                    break;
                                    
                                case 'cached':
                                    // Repeated file (cache hit)
                                    const cachedFile = this.helpers.randomChoice(commonFiles);
                                    const cacheStart = performance.now();
                                    await this.components.optimizedCalculator.calculate(cachedFile);
                                    const cacheTime = performance.now() - cacheStart;
                                    stats.responseTimes.push(cacheTime);
                                    stats.totalProcessed++;
                                    if (cacheTime < 5) stats.cacheHits++;
                                    break;
                            }
                            
                            // Simulate variable load
                            await this.helpers.delay(Math.random() * 100);
                            
                        } catch (error) {
                            stats.errors++;
                        }
                    }
                    
                    const actualDuration = Date.now() - startTime;
                    const throughput = (stats.totalProcessed / actualDuration) * 1000;
                    const avgResponseTime = stats.responseTimes.reduce((a, b) => a + b) / stats.responseTimes.length;
                    const p95ResponseTime = stats.responseTimes.sort((a, b) => a - b)[Math.floor(stats.responseTimes.length * 0.95)];
                    
                    ctx.assert(throughput > 5, 'Real-world throughput should be > 5 items/sec');
                    ctx.assert(avgResponseTime < 200, 'Average response time should be < 200ms');
                    ctx.assert(stats.errors === 0, 'Should have no errors in normal operation');
                    
                    ctx.metrics = {
                        realWorldSimulation: {
                            duration: actualDuration,
                            totalProcessed: stats.totalProcessed,
                            throughput,
                            avgResponseTime,
                            p95ResponseTime,
                            cacheHitRate: (stats.cacheHits / stats.totalProcessed) * 100,
                            errorRate: (stats.errors / stats.totalProcessed) * 100
                        }
                    };
                }
            }
        ];
    }
    
    calculateStats(times) {
        const sorted = times.sort((a, b) => a - b);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: times.reduce((a, b) => a + b) / times.length,
            median: sorted[Math.floor(times.length / 2)],
            p95: sorted[Math.floor(times.length * 0.95)],
            p99: sorted[Math.floor(times.length * 0.99)]
        };
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }
}

// Export for test framework
export { TestLoadPerformance };