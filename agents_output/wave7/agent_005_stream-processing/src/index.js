/**
 * index.js
 * Main entry point for Stream Processing ML Confidence System
 */

// Core components
export { StreamConfidenceCalculator } from './core/StreamConfidenceCalculator.js';
export { StreamConfidenceTracker } from './core/StreamConfidenceTracker.js';
export { StreamShadowController } from './core/StreamShadowController.js';
export { StreamMLOrchestrator } from './core/StreamMLOrchestrator.js';

// Streaming utilities
export { SlidingWindow } from './streaming/SlidingWindow.js';
export { EventStore } from './streaming/EventStore.js';
export { WindowManager } from './streaming/WindowManager.js';

// Utils
export { RingBuffer } from './utils/RingBuffer.js';

// Integration adapter for KC system
export class StreamMLIntegration {
  constructor(options = {}) {
    this.options = {
      enabled: true,
      streamingMode: 'hybrid', // 'full', 'shadow', 'hybrid'
      ...options
    };
    
    this.components = {};
    this.initialized = false;
  }
  
  /**
   * Initialize stream processing
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing Stream ML Processing...');
    
    // Initialize core components
    this.components.calculator = new StreamConfidenceCalculator({
      windowSize: 1000,
      windowType: 'hopping',
      hopSize: 100
    });
    
    this.components.tracker = new StreamConfidenceTracker({
      eventStoreSize: 1000000,
      checkpointInterval: 5000
    });
    
    this.components.shadow = new StreamShadowController({
      enabled: this.options.streamingMode !== 'full',
      samplingRate: 0.1
    });
    
    this.components.orchestrator = new StreamMLOrchestrator({
      partitions: 4,
      workerCount: 4
    });
    
    // Start components
    await this.components.calculator.start();
    await this.components.tracker.initialize();
    await this.components.shadow.initialize();
    await this.components.orchestrator.initialize();
    
    // Setup integrations
    this.setupKCIntegration();
    
    this.initialized = true;
    console.log('Stream ML Processing initialized successfully');
  }
  
  /**
   * Setup integration with KC system
   */
  setupKCIntegration() {
    if (!globalThis.KC) {
      console.warn('KC system not found. Running in standalone mode.');
      return;
    }
    
    // Bridge events from KC to streaming
    KC.EventBus.on('files:discovered', (files) => {
      files.forEach(file => {
        this.components.orchestrator.handleStreamRequest({
          event: {
            type: 'file.discovered',
            fileId: file.id,
            content: file.content,
            timestamp: Date.now()
          }
        });
      });
    });
    
    KC.EventBus.on('file:modified', (file) => {
      this.components.orchestrator.handleStreamRequest({
        event: {
          type: 'file.modified',
          fileId: file.id,
          content: file.content,
          timestamp: Date.now()
        },
        priority: 7
      });
    });
    
    KC.EventBus.on('category:assigned', (data) => {
      this.components.orchestrator.handleStreamRequest({
        event: {
          type: 'category.assigned',
          fileId: data.fileId,
          category: data.category,
          timestamp: Date.now()
        },
        priority: 8
      });
    });
    
    // Bridge confidence updates back to KC
    this.components.calculator.on('confidence.updated', (result) => {
      KC.EventBus.emit('ml:confidence:streaming', result);
    });
    
    this.components.tracker.on('convergence.detected', (data) => {
      KC.EventBus.emit('ml:convergence:streaming', data);
    });
    
    console.log('KC integration established');
  }
  
  /**
   * Process file with streaming
   */
  async processFile(file) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.components.shadow.processFile(file);
  }
  
  /**
   * Get real-time metrics
   */
  getMetrics() {
    return {
      calculator: this.components.calculator?.getMetrics(),
      tracker: this.components.tracker?.getMetrics(),
      shadow: this.components.shadow?.getMetrics(),
      orchestrator: this.components.orchestrator?.getStatus()
    };
  }
  
  /**
   * Get streaming report
   */
  async getReport() {
    const metrics = this.getMetrics();
    const shadowReport = await this.components.shadow?.getReport();
    const convergenceStats = await this.components.tracker?.getConvergenceStats();
    
    return {
      status: 'operational',
      mode: this.options.streamingMode,
      metrics,
      shadow: shadowReport,
      convergence: convergenceStats,
      recommendations: this.generateRecommendations(metrics)
    };
  }
  
  /**
   * Generate recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.calculator?.eventRate > 10000) {
      recommendations.push({
        type: 'scale',
        message: 'High event rate detected. Consider increasing partitions.',
        confidence: 0.9
      });
    }
    
    if (metrics.tracker?.convergenceRate > 0.85) {
      recommendations.push({
        type: 'optimize',
        message: 'High convergence rate. ML models performing well.',
        confidence: 0.95
      });
    }
    
    return recommendations;
  }
  
  /**
   * Shutdown streaming
   */
  async shutdown() {
    console.log('Shutting down Stream ML Processing...');
    
    await this.components.calculator?.stop();
    await this.components.tracker?.shutdown();
    await this.components.shadow?.shutdown();
    await this.components.orchestrator?.shutdown();
    
    this.initialized = false;
    console.log('Stream ML Processing shutdown complete');
  }
}

// Auto-initialize if KC is available
if (globalThis.KC) {
  KC.StreamML = new StreamMLIntegration();
  KC.StreamML.initialize().catch(console.error);
}

export default StreamMLIntegration;