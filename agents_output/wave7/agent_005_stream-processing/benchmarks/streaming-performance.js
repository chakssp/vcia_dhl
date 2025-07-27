/**
 * streaming-performance.js
 * Performance benchmarks for stream processing components
 */

import { performance } from 'perf_hooks';
import { StreamConfidenceCalculator } from '../src/core/StreamConfidenceCalculator.js';
import { StreamConfidenceTracker } from '../src/core/StreamConfidenceTracker.js';
import { EventStore } from '../src/streaming/EventStore.js';
import { RingBuffer } from '../src/utils/RingBuffer.js';

class StreamingBenchmark {
  constructor() {
    this.results = {};
  }
  
  /**
   * Run all benchmarks
   */
  async runAll() {
    console.log('🚀 Starting Stream Processing Benchmarks...\n');
    
    await this.benchmarkRingBuffer();
    await this.benchmarkEventStore();
    await this.benchmarkStreamCalculator();
    await this.benchmarkEndToEnd();
    
    this.printResults();
  }
  
  /**
   * Benchmark ring buffer performance
   */
  async benchmarkRingBuffer() {
    console.log('📊 Benchmarking RingBuffer...');
    
    const sizes = [1000, 10000, 100000];
    const operations = 1000000;
    
    for (const size of sizes) {
      const buffer = new RingBuffer(size);
      
      // Write benchmark
      const writeStart = performance.now();
      for (let i = 0; i < operations; i++) {
        buffer.push({ id: i, data: 'test' });
      }
      const writeTime = performance.now() - writeStart;
      
      // Read benchmark
      const readStart = performance.now();
      for (let i = 0; i < operations; i++) {
        buffer.pop();
      }
      const readTime = performance.now() - readStart;
      
      this.results[`RingBuffer-${size}`] = {
        writeOps: Math.floor(operations / (writeTime / 1000)),
        readOps: Math.floor(operations / (readTime / 1000)),
        writeLatency: (writeTime / operations) * 1000, // microseconds
        readLatency: (readTime / operations) * 1000
      };
    }
  }
  
  /**
   * Benchmark event store
   */
  async benchmarkEventStore() {
    console.log('📊 Benchmarking EventStore...');
    
    const store = new EventStore({
      maxSize: 100000,
      partitions: 4
    });
    
    await store.initialize();
    
    const events = 50000;
    const writeStart = performance.now();
    
    // Write events
    for (let i = 0; i < events; i++) {
      await store.append({
        id: `event-${i}`,
        type: i % 2 === 0 ? 'content.changed' : 'category.assigned',
        fileId: `file-${i % 100}`,
        timestamp: Date.now() - (events - i) * 100,
        data: { content: 'test'.repeat(100) }
      });
    }
    
    const writeTime = performance.now() - writeStart;
    
    // Query benchmark
    const queryStart = performance.now();
    const results = await store.query({
      startTime: Date.now() - 3600000,
      limit: 1000
    });
    const queryTime = performance.now() - queryStart;
    
    // Range query
    const rangeStart = performance.now();
    const rangeResults = await store.getRange(
      Date.now() - 3600000,
      Date.now()
    );
    const rangeTime = performance.now() - rangeStart;
    
    this.results['EventStore'] = {
      writeOps: Math.floor(events / (writeTime / 1000)),
      queryLatency: queryTime,
      rangeQueryLatency: rangeTime,
      rangeQueryResults: rangeResults.length,
      totalEvents: store.size()
    };
  }
  
  /**
   * Benchmark stream calculator
   */
  async benchmarkStreamCalculator() {
    console.log('📊 Benchmarking StreamConfidenceCalculator...');
    
    const calculator = new StreamConfidenceCalculator({
      windowSize: 1000,
      windowType: 'hopping',
      hopSize: 100
    });
    
    await calculator.start();
    
    const events = 10000;
    const latencies = [];
    
    // Track confidence updates
    calculator.on('confidence.updated', (update) => {
      latencies.push(update.latency);
    });
    
    const startTime = performance.now();
    
    // Send events
    for (let i = 0; i < events; i++) {
      await calculator.processEvent({
        type: 'content.changed',
        fileId: `file-${i % 10}`,
        content: 'Important content update',
        timestamp: Date.now() + i
      });
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const totalTime = performance.now() - startTime;
    
    calculator.stop();
    
    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    
    this.results['StreamCalculator'] = {
      eventsPerSecond: Math.floor(events / (totalTime / 1000)),
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50Latency: latencies[Math.floor(latencies.length * 0.5)],
      p95Latency: latencies[Math.floor(latencies.length * 0.95)],
      p99Latency: latencies[Math.floor(latencies.length * 0.99)],
      confidenceUpdates: latencies.length
    };
  }
  
  /**
   * Benchmark end-to-end stream processing
   */
  async benchmarkEndToEnd() {
    console.log('📊 Benchmarking End-to-End Pipeline...');
    
    const calculator = new StreamConfidenceCalculator();
    const tracker = new StreamConfidenceTracker();
    
    await calculator.start();
    await tracker.initialize();
    
    const fileCount = 100;
    const eventsPerFile = 100;
    const totalEvents = fileCount * eventsPerFile;
    
    let processedCount = 0;
    let convergenceCount = 0;
    
    // Track results
    calculator.on('confidence.updated', async (result) => {
      await tracker.track(result);
      processedCount++;
    });
    
    tracker.on('convergence.detected', () => {
      convergenceCount++;
    });
    
    const startTime = performance.now();
    
    // Simulate real-time file updates
    for (let f = 0; f < fileCount; f++) {
      for (let e = 0; e < eventsPerFile; e++) {
        calculator.processEvent({
          type: 'content.changed',
          fileId: `file-${f}`,
          content: `Update ${e}`,
          timestamp: Date.now()
        });
        
        // Simulate real-time spacing
        if (e % 10 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    }
    
    // Wait for processing to complete
    const maxWait = 10000; // 10 seconds max
    const waitStart = Date.now();
    
    while (processedCount < fileCount && Date.now() - waitStart < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const totalTime = performance.now() - startTime;
    
    calculator.stop();
    await tracker.shutdown();
    
    const metrics = await tracker.getConvergenceStats();
    
    this.results['EndToEnd'] = {
      totalEvents,
      processedFiles: processedCount,
      convergenceRate: metrics.rate,
      convergedFiles: convergenceCount,
      throughput: Math.floor(totalEvents / (totalTime / 1000)),
      totalTimeMs: totalTime,
      avgTimePerFile: totalTime / fileCount
    };
  }
  
  /**
   * Print benchmark results
   */
  printResults() {
    console.log('\n📊 Benchmark Results:\n');
    console.log('═'.repeat(80));
    
    for (const [name, metrics] of Object.entries(this.results)) {
      console.log(`\n${name}:`);
      console.log('─'.repeat(40));
      
      for (const [key, value] of Object.entries(metrics)) {
        const formattedValue = typeof value === 'number' ? 
          value.toLocaleString() : value;
        console.log(`  ${key.padEnd(20)}: ${formattedValue}`);
      }
    }
    
    console.log('\n═'.repeat(80));
    this.printSummary();
  }
  
  /**
   * Print performance summary
   */
  printSummary() {
    console.log('\n🎯 Performance Summary:\n');
    
    // Ring buffer performance
    if (this.results['RingBuffer-10000']) {
      const rb = this.results['RingBuffer-10000'];
      console.log(`✅ RingBuffer: ${rb.writeOps.toLocaleString()} writes/sec`);
      console.log(`   Latency: ${rb.writeLatency.toFixed(3)}μs per operation`);
    }
    
    // Event store performance
    if (this.results['EventStore']) {
      const es = this.results['EventStore'];
      console.log(`\n✅ EventStore: ${es.writeOps.toLocaleString()} events/sec`);
      console.log(`   Query latency: ${es.queryLatency.toFixed(2)}ms`);
    }
    
    // Stream calculator performance
    if (this.results['StreamCalculator']) {
      const sc = this.results['StreamCalculator'];
      console.log(`\n✅ StreamCalculator: ${sc.eventsPerSecond.toLocaleString()} events/sec`);
      console.log(`   P99 latency: ${sc.p99Latency.toFixed(2)}ms`);
    }
    
    // End-to-end performance
    if (this.results['EndToEnd']) {
      const e2e = this.results['EndToEnd'];
      console.log(`\n✅ End-to-End: ${e2e.throughput.toLocaleString()} events/sec`);
      console.log(`   Convergence rate: ${(e2e.convergenceRate * 100).toFixed(1)}%`);
      console.log(`   Avg time per file: ${e2e.avgTimePerFile.toFixed(2)}ms`);
    }
    
    console.log('\n🏁 Benchmark Complete!\n');
  }
}

// Run benchmarks
const benchmark = new StreamingBenchmark();
benchmark.runAll().catch(console.error);