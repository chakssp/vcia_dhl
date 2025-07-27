/**
 * streaming-demo.js
 * Comprehensive demonstration of stream processing capabilities
 */

import { 
  StreamConfidenceCalculator,
  StreamConfidenceTracker,
  StreamShadowController,
  StreamMLOrchestrator
} from '../src/index.js';

class StreamingDemo {
  constructor() {
    this.components = {};
    this.stats = {
      eventsGenerated: 0,
      confidenceUpdates: 0,
      convergenceDetected: 0,
      startTime: Date.now()
    };
  }
  
  /**
   * Initialize all components
   */
  async initialize() {
    console.log('🚀 Initializing Stream Processing Demo...\n');
    
    // Initialize calculator with aggressive settings for demo
    this.components.calculator = new StreamConfidenceCalculator({
      windowSize: 500,      // 500ms windows
      windowType: 'hopping',
      hopSize: 100,        // 100ms hops
      maxEventRate: 10000
    });
    
    // Initialize tracker
    this.components.tracker = new StreamConfidenceTracker({
      eventStoreSize: 100000,
      checkpointInterval: 2000
    });
    
    // Initialize shadow controller
    this.components.shadow = new StreamShadowController({
      enabled: true,
      samplingRate: 0.5,  // 50% for demo
      divergenceThreshold: 0.1
    });
    
    // Initialize orchestrator
    this.components.orchestrator = new StreamMLOrchestrator({
      partitions: 2,
      workerCount: 2
    });
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Start all components
    await this.components.calculator.start();
    await this.components.tracker.initialize();
    await this.components.shadow.initialize();
    await this.components.orchestrator.initialize();
    
    console.log('✅ All components initialized\n');
  }
  
  /**
   * Setup event handlers for monitoring
   */
  setupEventHandlers() {
    // Track confidence updates
    this.components.calculator.on('confidence.updated', (result) => {
      this.stats.confidenceUpdates++;
      this.logConfidenceUpdate(result);
    });
    
    // Track convergence
    this.components.tracker.on('convergence.detected', (data) => {
      this.stats.convergenceDetected++;
      this.logConvergence(data);
    });
    
    // Track shadow mode comparisons
    this.components.shadow.on('shadow.comparison', (comparison) => {
      this.logShadowComparison(comparison);
    });
    
    // Track backpressure
    this.components.calculator.on('backpressure.activated', (data) => {
      console.log('⚠️  Backpressure activated:', data);
    });
    
    // Track orchestrator status
    this.components.orchestrator.on('partitions.rebalanced', (data) => {
      console.log('🔄 Partitions rebalanced:', data);
    });
  }
  
  /**
   * Run the demo scenarios
   */
  async runDemo() {
    console.log('📊 Starting demo scenarios...\n');
    
    // Scenario 1: Real-time file updates
    await this.scenario1_RealtimeUpdates();
    
    // Scenario 2: Burst traffic handling
    await this.scenario2_BurstTraffic();
    
    // Scenario 3: Multi-file convergence
    await this.scenario3_Convergence();
    
    // Scenario 4: Shadow mode comparison
    await this.scenario4_ShadowMode();
    
    // Show final statistics
    this.showFinalStats();
  }
  
  /**
   * Scenario 1: Real-time file updates
   */
  async scenario1_RealtimeUpdates() {
    console.log('\n📝 Scenario 1: Real-time File Updates\n');
    console.log('Simulating continuous file modifications...\n');
    
    const fileId = 'doc-realtime-001';
    const updateCount = 20;
    
    for (let i = 0; i < updateCount; i++) {
      const event = {
        type: 'content.changed',
        fileId,
        content: `Update ${i}: ${this.generateContent()}`,
        timestamp: Date.now(),
        priority: Math.floor(Math.random() * 10)
      };
      
      await this.components.calculator.processEvent(event);
      this.stats.eventsGenerated++;
      
      // Simulate real-time spacing
      await this.delay(50 + Math.random() * 100);
    }
    
    console.log(`✅ Generated ${updateCount} updates for ${fileId}\n`);
  }
  
  /**
   * Scenario 2: Burst traffic handling
   */
  async scenario2_BurstTraffic() {
    console.log('\n💥 Scenario 2: Burst Traffic Handling\n');
    console.log('Sending 1000 events in rapid succession...\n');
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 1000; i++) {
      const event = {
        type: i % 3 === 0 ? 'file.created' : 'content.changed',
        fileId: `burst-file-${i % 50}`,
        content: this.generateContent(),
        timestamp: Date.now()
      };
      
      promises.push(this.components.calculator.processEvent(event));
      this.stats.eventsGenerated++;
    }
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Processed 1000 events in ${duration}ms`);
    console.log(`   Throughput: ${Math.floor(1000 / (duration / 1000))} events/sec\n`);
  }
  
  /**
   * Scenario 3: Multi-file convergence
   */
  async scenario3_Convergence() {
    console.log('\n🎯 Scenario 3: Multi-file Convergence\n');
    console.log('Tracking convergence for multiple files...\n');
    
    const fileCount = 10;
    const files = Array.from({ length: fileCount }, (_, i) => ({
      id: `convergence-file-${i}`,
      targetConfidence: 0.7 + Math.random() * 0.2
    }));
    
    // Simulate iterative improvements
    for (let iteration = 0; iteration < 10; iteration++) {
      for (const file of files) {
        // Generate event that gradually improves confidence
        const improvement = iteration * 0.05;
        const noise = (Math.random() - 0.5) * 0.1;
        
        const event = {
          type: 'content.improved',
          fileId: file.id,
          confidence: Math.min(1, file.targetConfidence * (1 + improvement) + noise),
          timestamp: Date.now()
        };
        
        // Process through calculator
        await this.components.calculator.processEvent(event);
        
        // Track result
        await this.components.tracker.track({
          fileId: file.id,
          overall: event.confidence,
          timestamp: event.timestamp
        });
        
        this.stats.eventsGenerated++;
      }
      
      await this.delay(100);
    }
    
    const convergenceStats = await this.components.tracker.getConvergenceStats();
    console.log(`✅ Convergence achieved for ${convergenceStats.convergedCount}/${fileCount} files`);
    console.log(`   Average iterations: ${convergenceStats.avgIterations.toFixed(1)}\n`);
  }
  
  /**
   * Scenario 4: Shadow mode comparison
   */
  async scenario4_ShadowMode() {
    console.log('\n👥 Scenario 4: Shadow Mode Comparison\n');
    console.log('Comparing traditional vs ML processing...\n');
    
    const testFiles = Array.from({ length: 20 }, (_, i) => ({
      id: `shadow-test-${i}`,
      content: this.generateContent(),
      userId: `user-${i % 5}`
    }));
    
    for (const file of testFiles) {
      await this.components.shadow.processFile(file);
      this.stats.eventsGenerated++;
      await this.delay(50);
    }
    
    const report = await this.components.shadow.getReport();
    
    console.log('✅ Shadow Mode Results:');
    console.log(`   Total comparisons: ${report.comparisons.total}`);
    console.log(`   Average divergence: ${(report.comparisons.avgDivergence * 100).toFixed(1)}%`);
    console.log(`   Latency overhead: ${report.latency.overhead.toFixed(1)}ms\n`);
  }
  
  /**
   * Generate random content
   */
  generateContent() {
    const topics = [
      'machine learning optimization',
      'distributed systems architecture',
      'real-time data processing',
      'streaming analytics pipeline',
      'convergence detection algorithm'
    ];
    
    return topics[Math.floor(Math.random() * topics.length)] + 
           ' ' + Math.random().toString(36).substring(7);
  }
  
  /**
   * Log confidence update
   */
  logConfidenceUpdate(result) {
    if (this.stats.confidenceUpdates % 10 === 0) {
      console.log(`📈 Confidence Update #${this.stats.confidenceUpdates}:`, {
        fileId: result.fileId.substring(0, 20) + '...',
        confidence: result.overall.toFixed(3),
        latency: `${result.latency.toFixed(1)}ms`
      });
    }
  }
  
  /**
   * Log convergence detection
   */
  logConvergence(data) {
    console.log(`🎯 Convergence Detected:`, {
      fileId: data.fileId,
      iterations: data.iterations,
      confidence: data.confidence.toFixed(3),
      stability: data.stability.toFixed(3)
    });
  }
  
  /**
   * Log shadow comparison
   */
  logShadowComparison(comparison) {
    if (comparison.divergence > 0.05) {
      console.log(`⚡ High Divergence:`, {
        fileId: comparison.fileId.substring(0, 20) + '...',
        traditional: comparison.traditional.toFixed(3),
        ml: comparison.ml.toFixed(3),
        divergence: (comparison.divergence * 100).toFixed(1) + '%'
      });
    }
  }
  
  /**
   * Show final statistics
   */
  showFinalStats() {
    const duration = Date.now() - this.stats.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Statistics');
    console.log('='.repeat(60));
    
    console.log('\nEvents:');
    console.log(`  Generated: ${this.stats.eventsGenerated.toLocaleString()}`);
    console.log(`  Confidence Updates: ${this.stats.confidenceUpdates.toLocaleString()}`);
    console.log(`  Convergence Detected: ${this.stats.convergenceDetected}`);
    
    console.log('\nPerformance:');
    console.log(`  Total Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`  Events/sec: ${Math.floor(this.stats.eventsGenerated / (duration / 1000)).toLocaleString()}`);
    
    console.log('\nComponent Metrics:');
    console.log('  Calculator:', this.components.calculator.getMetrics());
    console.log('  Tracker:', this.components.tracker.getMetrics());
    console.log('  Orchestrator:', this.components.orchestrator.getStatus());
    
    console.log('\n✅ Demo Complete!\n');
  }
  
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Cleanup
   */
  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    await this.components.calculator?.stop();
    await this.components.tracker?.shutdown();
    await this.components.shadow?.shutdown();
    await this.components.orchestrator?.shutdown();
    
    console.log('✅ Cleanup complete');
  }
}

// Run the demo
async function main() {
  const demo = new StreamingDemo();
  
  try {
    await demo.initialize();
    await demo.runDemo();
  } catch (error) {
    console.error('❌ Demo error:', error);
  } finally {
    await demo.cleanup();
  }
}

// Execute
main().catch(console.error);