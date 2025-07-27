/**
 * StreamMLOrchestrator.js
 * Distributed stream coordination with partitioning and fault tolerance
 */

import { EventEmitter } from 'events';
import { PartitionedQueue } from '../streaming/PartitionedQueue.js';
import { StreamRouter } from '../streaming/StreamRouter.js';
import { WorkerPoolManager } from '../utils/WorkerPoolManager.js';
import { ConsistentHashing } from '../utils/ConsistentHashing.js';
import { LeaderElection } from '../utils/LeaderElection.js';

export class StreamMLOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      partitions: 4,
      replicationFactor: 2,
      workerCount: navigator.hardwareConcurrency || 4,
      queueCapacity: 100000,
      batchSize: 100,
      flushInterval: 100, // ms
      coordinationInterval: 1000, // ms
      nodeId: this.generateNodeId(),
      ...options
    };
    
    // Distributed components
    this.partitionedQueue = new PartitionedQueue({
      partitions: this.options.partitions,
      capacity: this.options.queueCapacity
    });
    
    this.router = new StreamRouter({
      partitions: this.options.partitions,
      strategy: 'consistent-hash'
    });
    
    this.workerPool = new WorkerPoolManager({
      workers: this.options.workerCount,
      workerScript: '/workers/ml-processor.worker.js'
    });
    
    this.consistentHash = new ConsistentHashing({
      replicas: 150, // Virtual nodes per physical node
      nodes: [this.options.nodeId]
    });
    
    this.leaderElection = new LeaderElection({
      nodeId: this.options.nodeId,
      heartbeatInterval: 1000
    });
    
    // Stream processing state
    this.state = 'initializing';
    this.isLeader = false;
    this.activeStreams = new Map();
    this.partitionOwnership = new Map();
    
    // Metrics
    this.metrics = {
      eventsRouted: 0,
      batchesProcessed: 0,
      rebalances: 0,
      failovers: 0
    };
    
    // Processing control
    this.processing = false;
    this.flushTimer = null;
  }
  
  /**
   * Initialize orchestrator
   */
  async initialize() {
    console.log(`Initializing Stream ML Orchestrator (Node: ${this.options.nodeId})`);
    
    try {
      // Initialize components
      await this.workerPool.initialize();
      await this.leaderElection.start();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Load ML components based on flags
      await this.loadMLComponents();
      
      // Start coordination
      this.startCoordination();
      
      // Start processing
      this.startProcessing();
      
      this.state = 'ready';
      this.emit('orchestrator.ready', {
        nodeId: this.options.nodeId,
        partitions: this.options.partitions,
        workers: this.options.workerCount
      });
      
    } catch (error) {
      this.state = 'error';
      console.error('Orchestrator initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Leader election events
    this.leaderElection.on('elected', () => {
      this.isLeader = true;
      this.onBecomeLeader();
    });
    
    this.leaderElection.on('demoted', () => {
      this.isLeader = false;
      this.onLoseLeadership();
    });
    
    // Node events
    this.leaderElection.on('node.joined', (nodeId) => {
      this.onNodeJoined(nodeId);
    });
    
    this.leaderElection.on('node.left', (nodeId) => {
      this.onNodeLeft(nodeId);
    });
    
    // Worker events
    this.workerPool.on('worker.ready', (workerId) => {
      this.assignPartitionsToWorker(workerId);
    });
    
    this.workerPool.on('worker.failed', (workerId) => {
      this.handleWorkerFailure(workerId);
    });
    
    // Stream events
    if (globalThis.KC?.EventBus) {
      KC.EventBus.on('ml:stream:request', this.handleStreamRequest.bind(this));
      KC.EventBus.on('ml:batch:request', this.handleBatchRequest.bind(this));
    }
  }
  
  /**
   * Handle becoming leader
   */
  onBecomeLeader() {
    console.log(`Node ${this.options.nodeId} became leader`);
    
    // Rebalance partitions across cluster
    this.rebalancePartitions();
    
    // Start monitoring
    this.startLeaderMonitoring();
    
    this.emit('orchestrator.leader', {
      nodeId: this.options.nodeId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle losing leadership
   */
  onLoseLeadership() {
    console.log(`Node ${this.options.nodeId} lost leadership`);
    
    // Stop leader-specific tasks
    this.stopLeaderMonitoring();
  }
  
  /**
   * Handle stream request
   */
  async handleStreamRequest(request) {
    if (this.state !== 'ready') {
      this.emit('orchestrator.not_ready', { request });
      return;
    }
    
    const { event, priority = 5 } = request;
    
    // Route to partition
    const partition = this.router.route(event.fileId || event.id);
    
    // Check if we own this partition
    if (!this.ownsPartition(partition)) {
      // Forward to owner node
      await this.forwardToOwner(partition, request);
      return;
    }
    
    // Add to partitioned queue
    this.partitionedQueue.enqueue(partition, {
      ...request,
      partition,
      receivedAt: Date.now()
    }, priority);
    
    this.metrics.eventsRouted++;
    
    // Trigger flush if high priority
    if (priority >= 8) {
      this.flushPartition(partition);
    }
  }
  
  /**
   * Handle batch request
   */
  async handleBatchRequest(request) {
    const { events, options = {} } = request;
    
    // Group events by partition
    const partitioned = this.partitionEvents(events);
    
    // Process each partition's batch
    const promises = Object.entries(partitioned).map(async ([partition, batch]) => {
      if (this.ownsPartition(parseInt(partition))) {
        return this.processBatch(partition, batch, options);
      } else {
        return this.forwardBatchToOwner(partition, batch, options);
      }
    });
    
    const results = await Promise.all(promises);
    
    this.emit('batch.processed', {
      totalEvents: events.length,
      partitions: Object.keys(partitioned).length,
      results
    });
    
    return results.flat();
  }
  
  /**
   * Partition events by key
   */
  partitionEvents(events) {
    const partitioned = {};
    
    events.forEach(event => {
      const partition = this.router.route(event.fileId || event.id);
      if (!partitioned[partition]) {
        partitioned[partition] = [];
      }
      partitioned[partition].push(event);
    });
    
    return partitioned;
  }
  
  /**
   * Start main processing loop
   */
  startProcessing() {
    this.processing = true;
    
    // Process each owned partition
    this.partitionOwnership.forEach((owner, partition) => {
      if (owner === this.options.nodeId) {
        this.startPartitionProcessor(partition);
      }
    });
    
    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flushAllPartitions();
    }, this.options.flushInterval);
  }
  
  /**
   * Start processor for a partition
   */
  startPartitionProcessor(partition) {
    const processPartition = async () => {
      if (!this.processing || !this.ownsPartition(partition)) return;
      
      // Get batch from queue
      const batch = this.partitionedQueue.dequeueBatch(
        partition,
        this.options.batchSize
      );
      
      if (batch.length > 0) {
        await this.processPartitionBatch(partition, batch);
      }
      
      // Continue processing
      setImmediate(() => processPartition());
    };
    
    processPartition();
  }
  
  /**
   * Process a batch from a partition
   */
  async processPartitionBatch(partition, batch) {
    const startTime = performance.now();
    
    try {
      // Get available worker
      const worker = await this.workerPool.getWorker();
      
      // Process in worker
      const results = await worker.process({
        type: 'batch',
        partition,
        events: batch,
        config: this.getProcessingConfig()
      });
      
      // Handle results
      this.handleProcessingResults(results);
      
      // Update metrics
      this.metrics.batchesProcessed++;
      
      this.emit('partition.batch.processed', {
        partition,
        batchSize: batch.length,
        duration: performance.now() - startTime
      });
      
    } catch (error) {
      console.error(`Error processing partition ${partition} batch:`, error);
      
      // Requeue failed events
      batch.forEach(event => {
        this.partitionedQueue.enqueue(partition, event, event.priority);
      });
    }
  }
  
  /**
   * Handle processing results
   */
  handleProcessingResults(results) {
    results.forEach(result => {
      // Emit confidence updates
      if (result.type === 'confidence') {
        this.emit('confidence.calculated', result);
        
        if (globalThis.KC?.EventBus) {
          KC.EventBus.emit('ml:confidence:calculated', result);
        }
      }
      
      // Handle convergence
      if (result.converged) {
        this.emit('convergence.detected', result);
      }
    });
  }
  
  /**
   * Rebalance partitions across cluster
   */
  rebalancePartitions() {
    if (!this.isLeader) return;
    
    const nodes = this.leaderElection.getActiveNodes();
    const partitionsPerNode = Math.ceil(this.options.partitions / nodes.length);
    
    // Clear current ownership
    this.partitionOwnership.clear();
    
    // Assign partitions using consistent hashing
    for (let partition = 0; partition < this.options.partitions; partition++) {
      const owner = this.consistentHash.getNode(`partition-${partition}`);
      this.partitionOwnership.set(partition, owner);
    }
    
    // Broadcast new ownership
    this.broadcastPartitionOwnership();
    
    this.metrics.rebalances++;
    
    this.emit('partitions.rebalanced', {
      ownership: Array.from(this.partitionOwnership.entries()),
      nodes: nodes.length
    });
  }
  
  /**
   * Handle node joining cluster
   */
  onNodeJoined(nodeId) {
    console.log(`Node ${nodeId} joined cluster`);
    
    // Add to consistent hash ring
    this.consistentHash.addNode(nodeId);
    
    // Rebalance if leader
    if (this.isLeader) {
      // Delay rebalance to avoid thrashing
      setTimeout(() => this.rebalancePartitions(), 5000);
    }
  }
  
  /**
   * Handle node leaving cluster
   */
  onNodeLeft(nodeId) {
    console.log(`Node ${nodeId} left cluster`);
    
    // Remove from consistent hash ring
    this.consistentHash.removeNode(nodeId);
    
    // Handle partition failover
    this.handleNodeFailure(nodeId);
  }
  
  /**
   * Handle node failure
   */
  handleNodeFailure(failedNode) {
    const failedPartitions = [];
    
    // Find partitions owned by failed node
    this.partitionOwnership.forEach((owner, partition) => {
      if (owner === failedNode) {
        failedPartitions.push(partition);
      }
    });
    
    if (failedPartitions.length === 0) return;
    
    console.log(`Handling failover for ${failedPartitions.length} partitions`);
    
    // Immediate failover
    failedPartitions.forEach(partition => {
      const newOwner = this.consistentHash.getNode(`partition-${partition}`);
      this.partitionOwnership.set(partition, newOwner);
      
      // If we're the new owner, start processing
      if (newOwner === this.options.nodeId) {
        this.startPartitionProcessor(partition);
      }
    });
    
    this.metrics.failovers++;
    
    this.emit('failover.completed', {
      failedNode,
      partitions: failedPartitions,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle worker failure
   */
  handleWorkerFailure(workerId) {
    console.warn(`Worker ${workerId} failed`);
    
    // Worker pool will automatically spawn replacement
    // We just need to reassign partitions when ready
  }
  
  /**
   * Assign partitions to worker
   */
  assignPartitionsToWorker(workerId) {
    // In a real implementation, distribute partitions among workers
    // For simplicity, workers share all owned partitions
  }
  
  /**
   * Start coordination loop
   */
  startCoordination() {
    setInterval(() => {
      // Heartbeat
      this.leaderElection.heartbeat();
      
      // Update metrics
      this.updateMetrics();
      
      // Check health
      this.checkHealth();
      
    }, this.options.coordinationInterval);
  }
  
  /**
   * Start leader monitoring
   */
  startLeaderMonitoring() {
    this.leaderMonitorTimer = setInterval(() => {
      // Monitor cluster health
      const health = this.getClusterHealth();
      
      if (health.unhealthyNodes > 0) {
        this.emit('cluster.unhealthy', health);
      }
      
      // Monitor queue depths
      const queueStats = this.partitionedQueue.getStats();
      if (queueStats.maxDepth > this.options.queueCapacity * 0.8) {
        this.emit('queue.pressure', queueStats);
      }
      
    }, 5000);
  }
  
  /**
   * Stop leader monitoring
   */
  stopLeaderMonitoring() {
    if (this.leaderMonitorTimer) {
      clearInterval(this.leaderMonitorTimer);
      this.leaderMonitorTimer = null;
    }
  }
  
  /**
   * Check if we own a partition
   */
  ownsPartition(partition) {
    return this.partitionOwnership.get(partition) === this.options.nodeId;
  }
  
  /**
   * Forward request to partition owner
   */
  async forwardToOwner(partition, request) {
    const owner = this.partitionOwnership.get(partition);
    
    // In production, use actual RPC/messaging
    console.log(`Forwarding partition ${partition} request to ${owner}`);
    
    this.emit('request.forwarded', {
      partition,
      owner,
      request
    });
  }
  
  /**
   * Flush partition immediately
   */
  flushPartition(partition) {
    if (!this.ownsPartition(partition)) return;
    
    const batch = this.partitionedQueue.flush(partition);
    if (batch.length > 0) {
      this.processPartitionBatch(partition, batch);
    }
  }
  
  /**
   * Flush all owned partitions
   */
  flushAllPartitions() {
    this.partitionOwnership.forEach((owner, partition) => {
      if (owner === this.options.nodeId) {
        this.flushPartition(partition);
      }
    });
  }
  
  /**
   * Get processing configuration
   */
  getProcessingConfig() {
    return {
      calculator: this.mlComponents?.calculator?.config,
      tracker: this.mlComponents?.tracker?.config,
      shadowMode: this.mlComponents?.shadowMode?.enabled
    };
  }
  
  /**
   * Load ML components
   */
  async loadMLComponents() {
    // In production, load based on feature flags
    this.mlComponents = {
      calculator: { config: { streaming: true } },
      tracker: { config: { eventSourcing: true } },
      shadowMode: { enabled: true }
    };
  }
  
  /**
   * Update metrics
   */
  updateMetrics() {
    const queueStats = this.partitionedQueue.getStats();
    const workerStats = this.workerPool.getStats();
    
    this.emit('metrics.updated', {
      orchestrator: this.metrics,
      queue: queueStats,
      workers: workerStats,
      timestamp: Date.now()
    });
  }
  
  /**
   * Check system health
   */
  checkHealth() {
    const health = {
      state: this.state,
      isLeader: this.isLeader,
      ownedPartitions: Array.from(this.partitionOwnership.entries())
        .filter(([_, owner]) => owner === this.options.nodeId)
        .map(([partition, _]) => partition),
      queueDepth: this.partitionedQueue.totalSize(),
      activeWorkers: this.workerPool.getActiveCount()
    };
    
    this.emit('health.check', health);
  }
  
  /**
   * Get cluster health
   */
  getClusterHealth() {
    const nodes = this.leaderElection.getActiveNodes();
    const unhealthyNodes = this.leaderElection.getUnhealthyNodes();
    
    return {
      totalNodes: nodes.length,
      healthyNodes: nodes.length - unhealthyNodes.length,
      unhealthyNodes: unhealthyNodes.length,
      partitionCoverage: this.checkPartitionCoverage()
    };
  }
  
  /**
   * Check partition coverage
   */
  checkPartitionCoverage() {
    let covered = 0;
    
    for (let i = 0; i < this.options.partitions; i++) {
      if (this.partitionOwnership.has(i)) {
        covered++;
      }
    }
    
    return covered / this.options.partitions;
  }
  
  /**
   * Broadcast partition ownership
   */
  broadcastPartitionOwnership() {
    // In production, broadcast to all nodes
    const ownership = Object.fromEntries(this.partitionOwnership);
    
    this.emit('ownership.broadcast', {
      ownership,
      version: Date.now()
    });
  }
  
  /**
   * Generate unique node ID
   */
  generateNodeId() {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      nodeId: this.options.nodeId,
      state: this.state,
      isLeader: this.isLeader,
      partitions: {
        total: this.options.partitions,
        owned: Array.from(this.partitionOwnership.entries())
          .filter(([_, owner]) => owner === this.options.nodeId)
          .length
      },
      cluster: {
        nodes: this.leaderElection.getActiveNodes().length,
        leader: this.leaderElection.getLeader()
      },
      metrics: this.metrics
    };
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down orchestrator...');
    
    this.processing = false;
    
    // Stop timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.stopLeaderMonitoring();
    
    // Flush remaining events
    this.flushAllPartitions();
    
    // Shutdown components
    await this.workerPool.shutdown();
    await this.leaderElection.stop();
    
    this.state = 'stopped';
    this.emit('orchestrator.shutdown');
  }
}

export default StreamMLOrchestrator;