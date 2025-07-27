/**
 * StreamConfidenceCalculator.js
 * Real-time confidence calculation with event streaming and sliding windows
 */

import { EventEmitter } from 'events';
import { RingBuffer } from '../utils/RingBuffer.js';
import { SlidingWindow } from '../streaming/SlidingWindow.js';
import { StreamMetrics } from '../utils/StreamMetrics.js';

export class StreamConfidenceCalculator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      windowSize: 1000,          // 1 second default
      windowType: 'hopping',     // hopping, tumbling, session
      hopSize: 100,              // 100ms hop for hopping windows
      maxEventRate: 10000,       // Max events per second
      backpressureThreshold: 0.8, // 80% of max rate
      ...options
    };
    
    // Streaming components
    this.eventBuffer = new RingBuffer(10000);
    this.windows = new Map(); // fileId -> SlidingWindow
    this.metrics = new StreamMetrics();
    
    // Online scoring algorithms
    this.scorers = {
      semantic: new StreamSemanticScorer(),
      categorical: new StreamCategoricalScorer(),
      structural: new StreamStructuralScorer(),
      temporal: new StreamTemporalScorer()
    };
    
    // Adaptive weights with online updates
    this.weights = {
      semantic: 0.35,
      categorical: 0.30,
      structural: 0.20,
      temporal: 0.15
    };
    
    // Stream processing state
    this.processing = false;
    this.eventCount = 0;
    this.lastWindowTime = Date.now();
    
    // Backpressure control
    this.paused = false;
    this.backpressureTimeout = null;
  }
  
  /**
   * Start the stream processor
   */
  async start() {
    if (this.processing) return;
    
    this.processing = true;
    this.startEventLoop();
    this.startWindowProcessor();
    this.startMetricsCollector();
    
    this.emit('processor.started', {
      timestamp: Date.now(),
      config: this.options
    });
  }
  
  /**
   * Process incoming event stream
   */
  async processEvent(event) {
    // Check backpressure
    if (this.checkBackpressure()) {
      await this.handleBackpressure();
    }
    
    // Add to ring buffer
    this.eventBuffer.push({
      ...event,
      received: Date.now(),
      sequence: this.eventCount++
    });
    
    // Update metrics
    this.metrics.recordEvent(event.type);
    
    // Emit for immediate processing if critical
    if (event.priority === 'critical') {
      this.processImmediate(event);
    }
  }
  
  /**
   * Main event processing loop
   */
  startEventLoop() {
    const processNext = async () => {
      if (!this.processing) return;
      
      const batch = this.eventBuffer.consume(100); // Process up to 100 events
      
      if (batch.length > 0) {
        await this.processBatch(batch);
      }
      
      // Use setImmediate for better throughput
      setImmediate(processNext);
    };
    
    processNext();
  }
  
  /**
   * Process a batch of events
   */
  async processBatch(events) {
    const startTime = performance.now();
    
    // Group by file ID for efficient processing
    const grouped = this.groupEventsByFile(events);
    
    // Process each file's events
    for (const [fileId, fileEvents] of grouped) {
      await this.processFileEvents(fileId, fileEvents);
    }
    
    // Record batch metrics
    this.metrics.recordBatch({
      size: events.length,
      duration: performance.now() - startTime,
      timestamp: Date.now()
    });
  }
  
  /**
   * Process events for a specific file
   */
  async processFileEvents(fileId, events) {
    // Get or create window for this file
    let window = this.windows.get(fileId);
    if (!window) {
      window = new SlidingWindow({
        size: this.options.windowSize,
        type: this.options.windowType,
        hop: this.options.hopSize
      });
      this.windows.set(fileId, window);
    }
    
    // Add events to window
    events.forEach(event => window.add(event));
    
    // Check if window is ready for calculation
    if (window.isReady()) {
      const confidence = await this.calculateWindowConfidence(fileId, window);
      this.emitConfidenceUpdate(fileId, confidence);
    }
  }
  
  /**
   * Calculate confidence for a window of events
   */
  async calculateWindowConfidence(fileId, window) {
    const windowData = window.getData();
    const startTime = performance.now();
    
    // Extract features from window
    const features = this.extractWindowFeatures(windowData);
    
    // Calculate dimensions in parallel with streaming
    const dimensions = await this.calculateStreamingDimensions(features);
    
    // Apply adaptive weights
    const overall = this.calculateAdaptiveScore(dimensions);
    
    const result = {
      fileId,
      overall,
      dimensions,
      window: {
        start: window.getStart(),
        end: window.getEnd(),
        eventCount: windowData.length
      },
      latency: performance.now() - startTime,
      timestamp: Date.now()
    };
    
    // Store in window for historical analysis
    window.setResult(result);
    
    return result;
  }
  
  /**
   * Extract features from event window
   */
  extractWindowFeatures(events) {
    const features = {
      eventTypes: new Map(),
      contentChanges: [],
      categoryChanges: [],
      temporalPattern: [],
      velocity: 0
    };
    
    events.forEach((event, index) => {
      // Count event types
      features.eventTypes.set(
        event.type,
        (features.eventTypes.get(event.type) || 0) + 1
      );
      
      // Track changes
      if (event.type === 'content.changed') {
        features.contentChanges.push(event.delta);
      }
      if (event.type === 'category.assigned') {
        features.categoryChanges.push(event.category);
      }
      
      // Temporal pattern
      if (index > 0) {
        const timeDelta = event.timestamp - events[index - 1].timestamp;
        features.temporalPattern.push(timeDelta);
      }
    });
    
    // Calculate velocity (events per second)
    if (events.length > 1) {
      const duration = events[events.length - 1].timestamp - events[0].timestamp;
      features.velocity = events.length / (duration / 1000);
    }
    
    return features;
  }
  
  /**
   * Calculate streaming dimensions
   */
  async calculateStreamingDimensions(features) {
    const dimensions = {};
    
    // Use streaming algorithms for each dimension
    const promises = Object.entries(this.scorers).map(async ([key, scorer]) => {
      dimensions[key] = await scorer.scoreStream(features);
    });
    
    await Promise.all(promises);
    return dimensions;
  }
  
  /**
   * Calculate adaptive score with online weight updates
   */
  calculateAdaptiveScore(dimensions) {
    let sum = 0;
    let totalWeight = 0;
    
    for (const [dimension, score] of Object.entries(dimensions)) {
      const weight = this.weights[dimension] || 0;
      sum += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? sum / totalWeight : 0.5;
  }
  
  /**
   * Window processor for time-based aggregation
   */
  startWindowProcessor() {
    setInterval(() => {
      const now = Date.now();
      
      // Process tumbling windows
      for (const [fileId, window] of this.windows) {
        if (window.type === 'tumbling' && window.shouldClose(now)) {
          this.processTumblingWindow(fileId, window);
          window.reset();
        }
      }
      
      // Clean up old windows
      this.cleanupWindows();
      
    }, this.options.hopSize);
  }
  
  /**
   * Process completed tumbling window
   */
  async processTumblingWindow(fileId, window) {
    if (window.isEmpty()) return;
    
    const confidence = await this.calculateWindowConfidence(fileId, window);
    this.emitWindowComplete(fileId, confidence);
  }
  
  /**
   * Check backpressure conditions
   */
  checkBackpressure() {
    const eventRate = this.metrics.getEventRate();
    const bufferUsage = this.eventBuffer.usage();
    
    return (
      eventRate > this.options.maxEventRate * this.options.backpressureThreshold ||
      bufferUsage > 0.9
    );
  }
  
  /**
   * Handle backpressure
   */
  async handleBackpressure() {
    if (this.paused) return;
    
    this.paused = true;
    this.emit('backpressure.activated', {
      eventRate: this.metrics.getEventRate(),
      bufferUsage: this.eventBuffer.usage()
    });
    
    // Exponential backoff
    const delay = Math.min(1000, 100 * Math.pow(2, this.metrics.backpressureCount));
    
    await new Promise(resolve => {
      this.backpressureTimeout = setTimeout(() => {
        this.paused = false;
        this.emit('backpressure.released');
        resolve();
      }, delay);
    });
    
    this.metrics.recordBackpressure();
  }
  
  /**
   * Process immediate high-priority events
   */
  async processImmediate(event) {
    const startTime = performance.now();
    
    // Fast path for critical events
    const quickScore = await this.quickScore(event);
    
    this.emit('confidence.immediate', {
      fileId: event.fileId,
      confidence: quickScore,
      latency: performance.now() - startTime,
      event: event
    });
  }
  
  /**
   * Quick scoring for immediate feedback
   */
  async quickScore(event) {
    // Use cached values and heuristics for speed
    const cached = this.getCachedScore(event.fileId);
    if (cached) {
      // Apply delta based on event type
      return this.applyEventDelta(cached, event);
    }
    
    // Fallback to simple heuristic
    return this.heuristicScore(event);
  }
  
  /**
   * Online weight optimization
   */
  async optimizeWeights(feedback) {
    const { fileId, expected, actual } = feedback;
    const error = expected - actual;
    
    // Stochastic gradient descent update
    const learningRate = 0.01;
    const momentum = 0.9;
    
    // Get last calculation details
    const window = this.windows.get(fileId);
    if (!window) return;
    
    const lastResult = window.getLastResult();
    if (!lastResult) return;
    
    // Update weights based on contribution to error
    for (const [dim, score] of Object.entries(lastResult.dimensions)) {
      const contribution = score * error;
      const gradient = -2 * contribution;
      
      // Apply momentum
      this.momentum = this.momentum || {};
      this.momentum[dim] = (this.momentum[dim] || 0) * momentum + gradient * learningRate;
      
      // Update weight
      this.weights[dim] = Math.max(0, Math.min(1, 
        this.weights[dim] - this.momentum[dim]
      ));
    }
    
    // Normalize weights
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const dim in this.weights) {
        this.weights[dim] /= sum;
      }
    }
    
    this.emit('weights.updated', this.weights);
  }
  
  /**
   * Emit confidence update
   */
  emitConfidenceUpdate(fileId, confidence) {
    this.emit('confidence.updated', {
      fileId,
      ...confidence,
      stream: true
    });
    
    // Also emit to KC EventBus if available
    if (globalThis.KC?.EventBus) {
      KC.EventBus.emit('ml:confidence:calculated', confidence);
    }
  }
  
  /**
   * Clean up old windows
   */
  cleanupWindows() {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    for (const [fileId, window] of this.windows) {
      if (now - window.getLastUpdate() > maxAge) {
        this.windows.delete(fileId);
      }
    }
  }
  
  /**
   * Get streaming metrics
   */
  getMetrics() {
    return {
      eventRate: this.metrics.getEventRate(),
      processingRate: this.metrics.getProcessingRate(),
      avgLatency: this.metrics.getAverageLatency(),
      backpressureCount: this.metrics.backpressureCount,
      windowCount: this.windows.size,
      bufferUsage: this.eventBuffer.usage()
    };
  }
  
  /**
   * Stop the processor
   */
  stop() {
    this.processing = false;
    
    if (this.backpressureTimeout) {
      clearTimeout(this.backpressureTimeout);
    }
    
    this.emit('processor.stopped');
  }
}

/**
 * Streaming semantic scorer
 */
class StreamSemanticScorer {
  constructor() {
    this.embeddingCache = new Map();
    this.centroidCache = new Map();
  }
  
  async scoreStream(features) {
    // Fast semantic scoring using incremental embeddings
    const { contentChanges } = features;
    
    if (contentChanges.length === 0) {
      return this.lastScore || 0.5;
    }
    
    // Incremental embedding update
    const embedding = await this.updateEmbedding(contentChanges);
    const score = await this.calculateSemanticScore(embedding);
    
    this.lastScore = score;
    return score;
  }
  
  async updateEmbedding(changes) {
    // Simulate incremental embedding update
    // In production, use actual embedding service
    return Array(384).fill(0).map(() => Math.random());
  }
  
  async calculateSemanticScore(embedding) {
    // Compare with cached centroids
    let maxSim = 0;
    
    for (const [category, centroid] of this.centroidCache) {
      const sim = this.cosineSimilarity(embedding, centroid);
      maxSim = Math.max(maxSim, sim);
    }
    
    return maxSim;
  }
  
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Streaming categorical scorer
 */
class StreamCategoricalScorer {
  async scoreStream(features) {
    const { categoryChanges, eventTypes } = features;
    
    // Score based on category stability and event patterns
    const categoryScore = this.scoreCategoryStability(categoryChanges);
    const patternScore = this.scoreEventPattern(eventTypes);
    
    return 0.6 * categoryScore + 0.4 * patternScore;
  }
  
  scoreCategoryStability(changes) {
    if (changes.length === 0) return 0.5;
    
    // Measure category consistency
    const categories = new Set(changes);
    const stability = 1 / categories.size;
    
    return Math.min(1, stability);
  }
  
  scoreEventPattern(eventTypes) {
    // Score based on positive event patterns
    const positiveEvents = ['category.assigned', 'confidence.improved'];
    let score = 0.5;
    
    for (const [type, count] of eventTypes) {
      if (positiveEvents.includes(type)) {
        score += 0.1 * Math.log(count + 1);
      }
    }
    
    return Math.min(1, score);
  }
}

/**
 * Streaming structural scorer
 */
class StreamStructuralScorer {
  async scoreStream(features) {
    const { contentChanges, velocity } = features;
    
    // Score based on content structure changes
    const structureScore = this.scoreStructureChanges(contentChanges);
    const velocityScore = this.scoreVelocity(velocity);
    
    return 0.7 * structureScore + 0.3 * velocityScore;
  }
  
  scoreStructureChanges(changes) {
    if (changes.length === 0) return 0.5;
    
    // Analyze structural patterns in changes
    let score = 0.5;
    
    changes.forEach(change => {
      // Positive changes improve score
      if (change && change.improved) {
        score += 0.1;
      }
    });
    
    return Math.min(1, score);
  }
  
  scoreVelocity(velocity) {
    // Optimal velocity range: 1-10 events/second
    if (velocity < 1) return 0.3;
    if (velocity > 10) return 0.4;
    
    // Peak at 5 events/second
    return 0.5 + 0.5 * Math.exp(-Math.pow(velocity - 5, 2) / 10);
  }
}

/**
 * Streaming temporal scorer
 */
class StreamTemporalScorer {
  async scoreStream(features) {
    const { temporalPattern, eventTypes } = features;
    
    // Score based on temporal patterns
    const patternScore = this.scoreTemporalPattern(temporalPattern);
    const recencyScore = this.scoreRecency(features);
    
    return 0.6 * patternScore + 0.4 * recencyScore;
  }
  
  scoreTemporalPattern(pattern) {
    if (pattern.length === 0) return 0.5;
    
    // Score consistency of temporal pattern
    const mean = pattern.reduce((a, b) => a + b, 0) / pattern.length;
    const variance = pattern.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pattern.length;
    
    // Lower variance = more consistent = higher score
    const consistency = 1 / (1 + variance / 1000);
    
    return consistency;
  }
  
  scoreRecency(features) {
    // More recent events get higher scores
    const now = Date.now();
    const decay = 0.95; // 5% decay per hour
    
    return Math.pow(decay, (now - features.timestamp) / 3600000);
  }
}

export default StreamConfidenceCalculator;