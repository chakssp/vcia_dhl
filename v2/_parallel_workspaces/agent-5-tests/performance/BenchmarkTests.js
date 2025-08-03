/**
 * Performance Benchmark Tests for KC V2
 * Measures system performance under various conditions
 */

import { PerformanceProfiler } from '../test-utils/PerformanceProfiler.js';
import { MemoryMonitor } from '../test-utils/MemoryMonitor.js';
import { TestDataGenerator } from '../test-utils/TestDataGenerator.js';
import { MetricsCollector } from '../test-utils/MetricsCollector.js';

describe('KC V2 Performance Benchmarks', () => {
  let profiler;
  let memoryMonitor;
  let testData;
  let metrics;

  beforeAll(() => {
    profiler = new PerformanceProfiler();
    memoryMonitor = new MemoryMonitor();
    testData = new TestDataGenerator();
    metrics = new MetricsCollector();
  });

  afterEach(() => {
    // Collect and report metrics
    const report = metrics.generateReport();
    console.log('Performance Report:', report);
    
    // Save metrics to file
    metrics.saveToFile(`benchmarks/benchmark-${Date.now()}.json`);
    metrics.reset();
  });

  describe('File Discovery Performance', () => {
    test('should discover 1000 files in under 2 seconds', async () => {
      const files = testData.generateFileStructure(1000);
      
      profiler.start('discovery-1000');
      memoryMonitor.start();
      
      const discoveryStart = performance.now();
      
      // Simulate file discovery
      const discovered = await simulateDiscovery(files);
      
      const discoveryTime = performance.now() - discoveryStart;
      const profile = profiler.stop('discovery-1000');
      const memoryUsage = memoryMonitor.stop();
      
      metrics.record('discovery-1000', {
        duration: discoveryTime,
        fileCount: discovered.length,
        memoryUsed: memoryUsage.heapUsed,
        memoryPeak: memoryUsage.heapPeak
      });
      
      expect(discoveryTime).toBeLessThan(2000);
      expect(discovered.length).toBe(1000);
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Under 100MB
    });

    test('should scale linearly with file count', async () => {
      const testSizes = [100, 500, 1000, 5000, 10000];
      const results = [];
      
      for (const size of testSizes) {
        const files = testData.generateFileStructure(size);
        
        const start = performance.now();
        await simulateDiscovery(files);
        const duration = performance.now() - start;
        
        results.push({ size, duration });
      }
      
      // Calculate scaling factor
      const scalingFactor = calculateScalingFactor(results);
      
      metrics.record('discovery-scaling', {
        results,
        scalingFactor
      });
      
      // Should be roughly linear (factor close to 1)
      expect(scalingFactor).toBeGreaterThan(0.8);
      expect(scalingFactor).toBeLessThan(1.3);
    });

    test('should handle deep directory structures efficiently', async () => {
      const deepStructure = testData.generateDeepFileTree(10, 10); // 10 levels, 10 files per level
      
      profiler.start('deep-discovery');
      
      const start = performance.now();
      const discovered = await simulateDeepDiscovery(deepStructure);
      const duration = performance.now() - start;
      
      const profile = profiler.stop('deep-discovery');
      
      metrics.record('deep-discovery', {
        duration,
        depth: 10,
        totalFiles: discovered.length,
        profile
      });
      
      expect(duration).toBeLessThan(5000);
      expect(discovered.length).toBeGreaterThan(0);
    });
  });

  describe('Analysis Performance', () => {
    test('should analyze files with consistent throughput', async () => {
      const files = testData.generateFiles(100, {
        sizeRange: [5000, 20000],
        contentType: 'technical'
      });
      
      profiler.start('analysis-throughput');
      
      const startTime = performance.now();
      const results = [];
      
      for (const file of files) {
        const analysisStart = performance.now();
        const result = await simulateAnalysis(file);
        const analysisDuration = performance.now() - analysisStart;
        
        results.push({
          fileSize: file.content.length,
          duration: analysisDuration,
          tokensProcessed: Math.floor(file.content.length / 4)
        });
      }
      
      const totalDuration = performance.now() - startTime;
      const profile = profiler.stop('analysis-throughput');
      
      // Calculate throughput
      const totalTokens = results.reduce((sum, r) => sum + r.tokensProcessed, 0);
      const throughput = totalTokens / (totalDuration / 1000); // tokens per second
      
      metrics.record('analysis-throughput', {
        fileCount: files.length,
        totalDuration,
        throughput,
        averageFileTime: totalDuration / files.length,
        profile
      });
      
      expect(throughput).toBeGreaterThan(1000); // At least 1000 tokens/second
      expect(totalDuration).toBeLessThan(30000); // Under 30 seconds for 100 files
    });

    test('should maintain performance with concurrent analysis', async () => {
      const files = testData.generateFiles(50);
      const concurrencyLevels = [1, 5, 10, 20];
      const results = {};
      
      for (const concurrency of concurrencyLevels) {
        profiler.start(`concurrent-${concurrency}`);
        memoryMonitor.start();
        
        const start = performance.now();
        
        // Process files with specified concurrency
        const batches = [];
        for (let i = 0; i < files.length; i += concurrency) {
          const batch = files.slice(i, i + concurrency);
          batches.push(Promise.all(batch.map(f => simulateAnalysis(f))));
        }
        
        await Promise.all(batches);
        
        const duration = performance.now() - start;
        const profile = profiler.stop(`concurrent-${concurrency}`);
        const memory = memoryMonitor.stop();
        
        results[concurrency] = {
          duration,
          throughput: files.length / (duration / 1000),
          memoryPeak: memory.heapPeak,
          cpuUsage: profile.cpuUsage
        };
      }
      
      metrics.record('concurrent-analysis', results);
      
      // Higher concurrency should improve throughput
      expect(results[10].throughput).toBeGreaterThan(results[1].throughput);
      
      // But not linearly due to overhead
      expect(results[20].throughput / results[10].throughput).toBeLessThan(2);
    });
  });

  describe('UI Rendering Performance', () => {
    test('should render large file lists efficiently', async () => {
      const fileCounts = [100, 500, 1000, 5000];
      const results = {};
      
      for (const count of fileCounts) {
        const files = testData.generateFiles(count);
        
        profiler.start(`render-${count}`);
        
        // Measure initial render
        const renderStart = performance.now();
        const container = await simulateFileListRender(files);
        const renderTime = performance.now() - renderStart;
        
        // Measure scroll performance
        const scrollStart = performance.now();
        await simulateScroll(container, 10);
        const scrollTime = performance.now() - scrollStart;
        
        // Measure filter/search
        const filterStart = performance.now();
        await simulateFilter(container, 'test');
        const filterTime = performance.now() - filterStart;
        
        const profile = profiler.stop(`render-${count}`);
        
        results[count] = {
          renderTime,
          scrollTime,
          filterTime,
          fps: profile.fps,
          jank: profile.jankCount
        };
      }
      
      metrics.record('ui-rendering', results);
      
      // Should maintain 60fps even with 5000 items
      expect(results[5000].fps).toBeGreaterThan(50);
      
      // Initial render should be fast
      expect(results[1000].renderTime).toBeLessThan(100);
      
      // Filtering should be near-instant
      expect(results[5000].filterTime).toBeLessThan(50);
    });

    test('should handle rapid UI updates efficiently', async () => {
      const updateCount = 1000;
      const batchSizes = [1, 10, 50, 100];
      const results = {};
      
      for (const batchSize of batchSizes) {
        profiler.start(`updates-${batchSize}`);
        
        const start = performance.now();
        
        // Simulate rapid updates
        for (let i = 0; i < updateCount; i += batchSize) {
          const updates = Array(batchSize).fill(null).map((_, j) => ({
            id: i + j,
            type: 'progress',
            value: Math.random() * 100
          }));
          
          await simulateUIUpdate(updates);
        }
        
        const duration = performance.now() - start;
        const profile = profiler.stop(`updates-${batchSize}`);
        
        results[batchSize] = {
          duration,
          updatesPerSecond: updateCount / (duration / 1000),
          frameDrops: profile.droppedFrames,
          avgFrameTime: profile.avgFrameTime
        };
      }
      
      metrics.record('rapid-updates', results);
      
      // Batching should improve performance
      expect(results[100].updatesPerSecond).toBeGreaterThan(results[1].updatesPerSecond);
      
      // Should handle at least 100 updates/second
      expect(results[10].updatesPerSecond).toBeGreaterThan(100);
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory during long operations', async () => {
      const iterations = 100;
      const measurements = [];
      
      // Force garbage collection before test
      if (global.gc) global.gc();
      
      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        // Simulate operations that could leak
        const files = testData.generateFiles(100);
        await simulateDiscovery(files);
        await simulateAnalysis(files[0]);
        
        // Clear references
        files.length = 0;
        
        if (i % 10 === 0) {
          if (global.gc) global.gc();
          const memory = process.memoryUsage();
          measurements.push({
            iteration: i,
            heapUsed: memory.heapUsed,
            external: memory.external
          });
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      metrics.record('memory-leak-test', {
        iterations,
        initialMemory: initialMemory.heapUsed,
        finalMemory: finalMemory.heapUsed,
        growth: memoryGrowth,
        measurements
      });
      
      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
    });

    test('should handle memory pressure gracefully', async () => {
      const largeDateset = testData.generateFiles(1000, {
        sizeRange: [100000, 500000] // Large files
      });
      
      memoryMonitor.start();
      memoryMonitor.setThreshold(0.8); // Alert at 80% heap usage
      
      const alerts = [];
      memoryMonitor.onAlert((alert) => alerts.push(alert));
      
      try {
        // Process large dataset
        for (const file of largeDateset) {
          await simulateAnalysis(file);
          
          // Check if we should pause
          if (memoryMonitor.shouldPause()) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (global.gc) global.gc();
          }
        }
      } catch (error) {
        // Should handle out of memory gracefully
        expect(error.message).toContain('memory');
      }
      
      const memoryStats = memoryMonitor.stop();
      
      metrics.record('memory-pressure', {
        peakUsage: memoryStats.heapPeak,
        alerts: alerts.length,
        gcPauses: memoryStats.gcCount
      });
      
      // Should have triggered memory management
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Network Performance', () => {
    test('should batch API requests efficiently', async () => {
      const requests = Array(100).fill(null).map((_, i) => ({
        type: 'file',
        id: `file-${i}`,
        data: { content: 'test'.repeat(100) }
      }));
      
      profiler.start('api-batching');
      
      // Test different batch sizes
      const batchSizes = [1, 10, 50];
      const results = {};
      
      for (const batchSize of batchSizes) {
        const start = performance.now();
        const responses = await simulateBatchAPI(requests, batchSize);
        const duration = performance.now() - start;
        
        results[batchSize] = {
          duration,
          requestsPerSecond: requests.length / (duration / 1000),
          avgLatency: duration / (requests.length / batchSize)
        };
      }
      
      const profile = profiler.stop('api-batching');
      
      metrics.record('api-batching', {
        results,
        profile
      });
      
      // Larger batches should be more efficient
      expect(results[50].requestsPerSecond).toBeGreaterThan(results[1].requestsPerSecond);
    });

    test('should handle WebSocket message throughput', async () => {
      const messageCount = 1000;
      const messageSizes = [100, 1000, 10000];
      const results = {};
      
      for (const size of messageSizes) {
        const messages = Array(messageCount).fill(null).map((_, i) => ({
          id: i,
          type: 'update',
          data: 'x'.repeat(size)
        }));
        
        profiler.start(`ws-${size}`);
        
        const start = performance.now();
        let received = 0;
        
        // Simulate WebSocket communication
        const ws = await simulateWebSocket();
        
        ws.onMessage((msg) => {
          received++;
        });
        
        // Send all messages
        for (const msg of messages) {
          await ws.send(msg);
        }
        
        // Wait for all messages to be received
        await waitFor(() => received === messageCount, 10000);
        
        const duration = performance.now() - start;
        const profile = profiler.stop(`ws-${size}`);
        
        results[size] = {
          duration,
          throughput: (messageCount * size) / (duration / 1000), // bytes per second
          messagesPerSecond: messageCount / (duration / 1000),
          latency: profile.avgLatency
        };
        
        ws.close();
      }
      
      metrics.record('websocket-throughput', results);
      
      // Should handle at least 100 messages per second
      expect(results[1000].messagesPerSecond).toBeGreaterThan(100);
      
      // Latency should be low
      expect(results[1000].latency).toBeLessThan(10);
    });
  });

  describe('Search and Indexing Performance', () => {
    test('should build search index efficiently', async () => {
      const documentCounts = [100, 1000, 10000];
      const results = {};
      
      for (const count of documentCounts) {
        const documents = testData.generateDocuments(count, {
          avgLength: 1000,
          keywords: ['javascript', 'performance', 'testing', 'optimization']
        });
        
        profiler.start(`index-${count}`);
        memoryMonitor.start();
        
        const start = performance.now();
        const index = await buildSearchIndex(documents);
        const duration = performance.now() - start;
        
        const profile = profiler.stop(`index-${count}`);
        const memory = memoryMonitor.stop();
        
        results[count] = {
          duration,
          docsPerSecond: count / (duration / 1000),
          indexSize: memory.heapUsed,
          profile
        };
      }
      
      metrics.record('search-indexing', results);
      
      // Should scale well
      const scalingFactor = (results[10000].duration / results[1000].duration) / 10;
      expect(scalingFactor).toBeLessThan(1.5); // Sub-linear scaling
      
      // Should be fast enough for real-time
      expect(results[1000].docsPerSecond).toBeGreaterThan(500);
    });

    test('should perform searches quickly', async () => {
      const index = await buildSearchIndex(
        testData.generateDocuments(10000)
      );
      
      const queries = [
        'simple',
        'complex AND query',
        'fuzzy~',
        '"exact phrase"',
        'field:value',
        'wild*card'
      ];
      
      const results = {};
      
      for (const query of queries) {
        profiler.start(`search-${query}`);
        
        const measurements = [];
        
        // Run query multiple times
        for (let i = 0; i < 100; i++) {
          const start = performance.now();
          const searchResults = await index.search(query);
          const duration = performance.now() - start;
          
          measurements.push({
            duration,
            resultCount: searchResults.length
          });
        }
        
        const profile = profiler.stop(`search-${query}`);
        
        const avgDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
        
        results[query] = {
          avgDuration,
          minDuration: Math.min(...measurements.map(m => m.duration)),
          maxDuration: Math.max(...measurements.map(m => m.duration)),
          profile
        };
      }
      
      metrics.record('search-performance', results);
      
      // All searches should be fast
      Object.values(results).forEach(result => {
        expect(result.avgDuration).toBeLessThan(50); // Under 50ms average
        expect(result.maxDuration).toBeLessThan(100); // Under 100ms worst case
      });
    });
  });

  // Helper functions
  async function simulateDiscovery(files) {
    // Simulate file system operations
    await new Promise(resolve => setTimeout(resolve, files.length * 0.5));
    return files.map(f => ({ ...f, discovered: true }));
  }

  async function simulateDeepDiscovery(structure) {
    const discovered = [];
    const traverse = async (node, depth = 0) => {
      if (node.files) {
        discovered.push(...node.files);
      }
      if (node.children) {
        for (const child of node.children) {
          await traverse(child, depth + 1);
        }
      }
    };
    await traverse(structure);
    return discovered;
  }

  async function simulateAnalysis(file) {
    const complexity = file.content.length / 1000;
    await new Promise(resolve => setTimeout(resolve, complexity * 10));
    return {
      fileId: file.id,
      insights: Math.floor(Math.random() * 5) + 1,
      confidence: Math.random()
    };
  }

  async function simulateFileListRender(files) {
    const container = { files, rendered: true };
    await new Promise(resolve => setTimeout(resolve, files.length * 0.01));
    return container;
  }

  async function simulateScroll(container, times) {
    for (let i = 0; i < times; i++) {
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
    }
  }

  async function simulateFilter(container, query) {
    await new Promise(resolve => setTimeout(resolve, 5));
    container.filtered = container.files.filter(f => 
      f.name.includes(query) || f.content.includes(query)
    );
  }

  async function simulateUIUpdate(updates) {
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  async function simulateBatchAPI(requests, batchSize) {
    const results = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      await new Promise(resolve => setTimeout(resolve, 50)); // Network latency
      results.push(...batch.map(r => ({ ...r, success: true })));
    }
    return results;
  }

  async function simulateWebSocket() {
    const handlers = [];
    return {
      send: async (msg) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        handlers.forEach(h => h(msg));
      },
      onMessage: (handler) => handlers.push(handler),
      close: () => {}
    };
  }

  async function buildSearchIndex(documents) {
    // Simulate indexing
    await new Promise(resolve => setTimeout(resolve, documents.length * 0.1));
    return {
      search: async (query) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return documents.filter(d => d.content.includes(query)).slice(0, 100);
      }
    };
  }

  function calculateScalingFactor(results) {
    // Simple linear regression
    const n = results.length;
    const sumX = results.reduce((sum, r) => sum + r.size, 0);
    const sumY = results.reduce((sum, r) => sum + r.duration, 0);
    const sumXY = results.reduce((sum, r) => sum + r.size * r.duration, 0);
    const sumX2 = results.reduce((sum, r) => sum + r.size * r.size, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope / (sumY / sumX); // Normalized scaling factor
  }

  async function waitFor(condition, timeout) {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    if (!condition()) {
      throw new Error('Timeout waiting for condition');
    }
  }
});