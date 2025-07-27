/**
 * StreamConfidenceTracker.js
 * Event-sourced confidence tracking with sliding windows and real-time updates
 */

import { EventEmitter } from 'events';
import { EventStore } from '../streaming/EventStore.js';
import { WindowManager } from '../streaming/WindowManager.js';
import { StreamConvergenceDetector } from '../streaming/StreamConvergenceDetector.js';
import { DistributedState } from '../utils/DistributedState.js';

export class StreamConfidenceTracker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      eventStoreSize: 1000000,     // 1M events
      windowTypes: ['tumbling', 'hopping', 'session'],
      checkpointInterval: 5000,     // 5 seconds
      snapshotThreshold: 10000,     // Snapshot after 10k events
      partitions: 4,                // Number of partitions
      replicationFactor: 2,         // Replication for fault tolerance
      ...options
    };
    
    // Event sourcing components
    this.eventStore = new EventStore({
      maxSize: this.options.eventStoreSize,
      partitions: this.options.partitions
    });
    
    // Window management
    this.windowManager = new WindowManager({
      types: this.options.windowTypes
    });
    
    // Convergence detection with streaming
    this.convergenceDetector = new StreamConvergenceDetector({
      windowSize: 1000,
      threshold: 0.85
    });
    
    // Distributed state for scalability
    this.state = new DistributedState({
      partitions: this.options.partitions,
      replication: this.options.replicationFactor
    });
    
    // Checkpointing for fault tolerance
    this.lastCheckpoint = Date.now();
    this.checkpointTimer = null;
    
    // Metrics
    this.metrics = {
      eventsProcessed: 0,
      convergenceDetected: 0,
      windowsProcessed: 0,
      snapshotsTaken: 0
    };
  }
  
  /**
   * Initialize the tracker
   */
  async initialize() {
    // Initialize event store
    await this.eventStore.initialize();
    
    // Load state from checkpoint
    await this.loadCheckpoint();
    
    // Start background processes
    this.startCheckpointing();
    this.startWindowProcessing();
    this.startConvergenceMonitoring();
    
    // Subscribe to confidence events
    this.subscribeToEvents();
    
    this.emit('tracker.initialized', {
      partitions: this.options.partitions,
      eventCount: this.eventStore.size()
    });
  }
  
  /**
   * Track confidence event with event sourcing
   */
  async track(event) {
    const enrichedEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      sequence: this.metrics.eventsProcessed++,
      partition: this.getPartition(event.fileId)
    };
    
    // Store in event store
    await this.eventStore.append(enrichedEvent);
    
    // Update windows
    this.windowManager.addEvent(enrichedEvent);
    
    // Update state
    await this.updateState(enrichedEvent);
    
    // Check for convergence in real-time
    this.checkConvergence(enrichedEvent);
    
    // Emit for downstream processing
    this.emit('confidence.tracked', enrichedEvent);
    
    // Check if snapshot needed
    if (this.shouldSnapshot()) {
      await this.takeSnapshot();
    }
  }
  
  /**
   * Update distributed state
   */
  async updateState(event) {
    const { fileId } = event;
    
    // Get current state
    const currentState = await this.state.get(fileId) || {
      history: [],
      stats: {
        count: 0,
        sum: 0,
        sumSquares: 0,
        min: 1,
        max: 0
      }
    };
    
    // Update history with sliding window
    currentState.history.push({
      confidence: event.overall,
      timestamp: event.timestamp,
      dimensions: event.dimensions
    });
    
    // Keep only recent history (sliding window)
    if (currentState.history.length > 100) {
      currentState.history = currentState.history.slice(-100);
    }
    
    // Update statistics incrementally
    const stats = currentState.stats;
    stats.count++;
    stats.sum += event.overall;
    stats.sumSquares += event.overall * event.overall;
    stats.min = Math.min(stats.min, event.overall);
    stats.max = Math.max(stats.max, event.overall);
    
    // Calculate running statistics
    stats.mean = stats.sum / stats.count;
    stats.variance = (stats.sumSquares / stats.count) - (stats.mean * stats.mean);
    stats.stdDev = Math.sqrt(Math.max(0, stats.variance));
    
    // Store updated state
    await this.state.set(fileId, currentState);
  }
  
  /**
   * Check for convergence using streaming algorithm
   */
  checkConvergence(event) {
    const { fileId } = event;
    
    // Add to convergence detector
    const result = this.convergenceDetector.addDataPoint(fileId, event.overall);
    
    if (result.converged) {
      this.metrics.convergenceDetected++;
      
      this.emit('convergence.detected', {
        fileId,
        iterations: result.iterations,
        confidence: result.confidence,
        stability: result.stability,
        timestamp: Date.now()
      });
      
      // Update state with convergence info
      this.state.update(fileId, state => {
        state.converged = true;
        state.convergenceInfo = result;
        return state;
      });
    }
  }
  
  /**
   * Process windows in background
   */
  startWindowProcessing() {
    setInterval(() => {
      const closedWindows = this.windowManager.getClosedWindows();
      
      closedWindows.forEach(window => {
        this.processWindow(window);
      });
      
    }, 100); // Check every 100ms
  }
  
  /**
   * Process a closed window
   */
  async processWindow(window) {
    const stats = this.calculateWindowStats(window);
    
    this.metrics.windowsProcessed++;
    
    this.emit('window.processed', {
      windowId: window.id,
      type: window.type,
      start: window.start,
      end: window.end,
      eventCount: window.events.length,
      stats
    });
    
    // Store window results
    await this.storeWindowResult(window, stats);
  }
  
  /**
   * Calculate statistics for a window
   */
  calculateWindowStats(window) {
    const events = window.events;
    if (events.length === 0) return null;
    
    const confidences = events.map(e => e.overall);
    
    return {
      count: events.length,
      mean: confidences.reduce((a, b) => a + b) / events.length,
      min: Math.min(...confidences),
      max: Math.max(...confidences),
      trend: this.calculateTrend(confidences),
      volatility: this.calculateVolatility(confidences)
    };
  }
  
  /**
   * Calculate trend using linear regression
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    // Simple linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b);
    const sumY = values.reduce((a, b) => a + b);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }
  
  /**
   * Calculate volatility
   */
  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i-1]) / values[i-1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Get real-time statistics for a file
   */
  async getStats(fileId) {
    const state = await this.state.get(fileId);
    if (!state) return null;
    
    // Get active windows
    const activeWindows = this.windowManager.getActiveWindows(fileId);
    
    return {
      historical: state.stats,
      current: state.history[state.history.length - 1],
      converged: state.converged,
      convergenceInfo: state.convergenceInfo,
      activeWindows: activeWindows.map(w => ({
        type: w.type,
        size: w.events.length,
        start: w.start
      })),
      trend: this.calculateTrend(state.history.map(h => h.confidence))
    };
  }
  
  /**
   * Query events with filters
   */
  async queryEvents(query) {
    const { fileId, startTime, endTime, limit = 100 } = query;
    
    // Use event store's efficient querying
    const events = await this.eventStore.query({
      partition: fileId ? this.getPartition(fileId) : undefined,
      startTime,
      endTime,
      limit,
      filter: event => !fileId || event.fileId === fileId
    });
    
    return events;
  }
  
  /**
   * Replay events from a point in time
   */
  async replay(fromTimestamp, toTimestamp) {
    const events = await this.eventStore.getRange(fromTimestamp, toTimestamp);
    
    const replayState = new Map();
    
    for (const event of events) {
      // Replay logic to rebuild state
      const fileState = replayState.get(event.fileId) || { history: [] };
      fileState.history.push(event);
      replayState.set(event.fileId, fileState);
    }
    
    return replayState;
  }
  
  /**
   * Start checkpointing process
   */
  startCheckpointing() {
    this.checkpointTimer = setInterval(async () => {
      await this.checkpoint();
    }, this.options.checkpointInterval);
  }
  
  /**
   * Create a checkpoint
   */
  async checkpoint() {
    const checkpoint = {
      timestamp: Date.now(),
      eventCount: this.metrics.eventsProcessed,
      state: await this.state.snapshot(),
      windows: this.windowManager.snapshot(),
      convergence: this.convergenceDetector.snapshot()
    };
    
    // Store checkpoint (in production, use persistent storage)
    await this.storeCheckpoint(checkpoint);
    
    this.lastCheckpoint = checkpoint.timestamp;
    
    this.emit('checkpoint.created', {
      timestamp: checkpoint.timestamp,
      size: JSON.stringify(checkpoint).length
    });
  }
  
  /**
   * Take a snapshot of the event store
   */
  async takeSnapshot() {
    const snapshot = await this.eventStore.snapshot();
    
    this.metrics.snapshotsTaken++;
    
    this.emit('snapshot.created', {
      timestamp: Date.now(),
      eventCount: snapshot.eventCount,
      size: snapshot.size
    });
    
    // Compact event store after snapshot
    await this.eventStore.compact(snapshot.timestamp);
  }
  
  /**
   * Should take snapshot based on event count
   */
  shouldSnapshot() {
    return this.metrics.eventsProcessed % this.options.snapshotThreshold === 0;
  }
  
  /**
   * Monitor convergence across all files
   */
  startConvergenceMonitoring() {
    setInterval(async () => {
      const stats = await this.getConvergenceStats();
      
      this.emit('convergence.stats', stats);
      
      // Alert if convergence rate drops
      if (stats.rate < 0.7) {
        this.emit('convergence.alert', {
          rate: stats.rate,
          message: 'Convergence rate below threshold'
        });
      }
      
    }, 5000); // Every 5 seconds
  }
  
  /**
   * Get overall convergence statistics
   */
  async getConvergenceStats() {
    const allStates = await this.state.getAll();
    
    let converged = 0;
    let total = 0;
    let avgIterations = 0;
    
    for (const [fileId, state] of allStates) {
      total++;
      if (state.converged) {
        converged++;
        avgIterations += state.convergenceInfo.iterations;
      }
    }
    
    return {
      rate: total > 0 ? converged / total : 0,
      convergedCount: converged,
      totalCount: total,
      avgIterations: converged > 0 ? avgIterations / converged : 0,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get partition for file ID
   */
  getPartition(fileId) {
    // Simple hash-based partitioning
    let hash = 0;
    for (let i = 0; i < fileId.length; i++) {
      hash = ((hash << 5) - hash) + fileId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % this.options.partitions;
  }
  
  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Subscribe to confidence events
   */
  subscribeToEvents() {
    // Subscribe to calculator events
    if (globalThis.KC?.EventBus) {
      KC.EventBus.on('ml:confidence:calculated', this.track.bind(this));
    }
  }
  
  /**
   * Store checkpoint (implement based on storage backend)
   */
  async storeCheckpoint(checkpoint) {
    // In production, store to persistent storage
    // For now, store in memory
    this._lastCheckpoint = checkpoint;
  }
  
  /**
   * Load checkpoint on initialization
   */
  async loadCheckpoint() {
    // In production, load from persistent storage
    if (this._lastCheckpoint) {
      await this.state.restore(this._lastCheckpoint.state);
      this.windowManager.restore(this._lastCheckpoint.windows);
      this.convergenceDetector.restore(this._lastCheckpoint.convergence);
    }
  }
  
  /**
   * Store window result
   */
  async storeWindowResult(window, stats) {
    // Store aggregated window results for historical analysis
    const result = {
      windowId: window.id,
      type: window.type,
      start: window.start,
      end: window.end,
      stats,
      timestamp: Date.now()
    };
    
    // In production, store to time-series database
    this.emit('window.result', result);
  }
  
  /**
   * Get streaming metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      eventStoreSize: this.eventStore.size(),
      activeWindows: this.windowManager.getActiveWindowCount(),
      partitions: this.options.partitions,
      checkpointLag: Date.now() - this.lastCheckpoint
    };
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    // Stop timers
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }
    
    // Final checkpoint
    await this.checkpoint();
    
    // Close resources
    await this.eventStore.close();
    await this.state.close();
    
    this.emit('tracker.shutdown');
  }
}

export default StreamConfidenceTracker;