/**
 * EventStore.js
 * High-performance event store with partitioning and time-based indexing
 */

export class EventStore {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000000;
    this.partitions = options.partitions || 4;
    this.compressionEnabled = options.compression || true;
    this.ttl = options.ttl || 86400000; // 24 hours default
    
    // Partitioned storage
    this.stores = new Map();
    this.indices = new Map();
    
    // Time-based index for efficient range queries
    this.timeIndex = new Map(); // timestamp -> event IDs
    
    // Initialize partitions
    for (let i = 0; i < this.partitions; i++) {
      this.stores.set(i, new Map());
      this.indices.set(i, {
        byFile: new Map(),
        byType: new Map(),
        byTime: new Map()
      });
    }
    
    // Metrics
    this.metrics = {
      totalEvents: 0,
      compressedEvents: 0,
      evictions: 0
    };
    
    // Cleanup timer
    this.cleanupTimer = null;
  }
  
  /**
   * Initialize event store
   */
  async initialize() {
    // Start cleanup process
    this.startCleanup();
    
    // Load persisted data if available
    await this.loadFromDisk();
  }
  
  /**
   * Append event to store
   */
  async append(event) {
    const partition = event.partition || this.getPartition(event.id);
    const store = this.stores.get(partition);
    const index = this.indices.get(partition);
    
    // Compress if enabled
    const storedEvent = this.compressionEnabled ? 
      await this.compress(event) : event;
    
    // Store event
    store.set(event.id, storedEvent);
    
    // Update indices
    this.updateIndices(partition, event);
    
    // Update time index
    const timeKey = Math.floor(event.timestamp / 1000); // Second precision
    if (!this.timeIndex.has(timeKey)) {
      this.timeIndex.set(timeKey, new Set());
    }
    this.timeIndex.get(timeKey).add(event.id);
    
    // Update metrics
    this.metrics.totalEvents++;
    if (storedEvent !== event) {
      this.metrics.compressedEvents++;
    }
    
    // Check size limit
    if (store.size > this.maxSize / this.partitions) {
      this.evictOldest(partition);
    }
    
    return event.id;
  }
  
  /**
   * Query events with filters
   */
  async query(options = {}) {
    const {
      partition,
      startTime,
      endTime,
      fileId,
      type,
      limit = 100,
      offset = 0,
      filter
    } = options;
    
    let results = [];
    
    // Determine partitions to query
    const partitionsToQuery = partition !== undefined ? 
      [partition] : Array.from(this.stores.keys());
    
    for (const p of partitionsToQuery) {
      const partitionResults = await this.queryPartition(p, {
        startTime,
        endTime,
        fileId,
        type,
        filter
      });
      
      results = results.concat(partitionResults);
    }
    
    // Sort by timestamp
    results.sort((a, b) => a.timestamp - b.timestamp);
    
    // Apply pagination
    return results.slice(offset, offset + limit);
  }
  
  /**
   * Query single partition
   */
  async queryPartition(partition, options) {
    const store = this.stores.get(partition);
    const index = this.indices.get(partition);
    const results = [];
    
    // Use indices for efficient querying
    let candidates = new Set();
    
    if (options.fileId) {
      const fileEvents = index.byFile.get(options.fileId) || new Set();
      candidates = new Set(fileEvents);
    } else if (options.type) {
      const typeEvents = index.byType.get(options.type) || new Set();
      candidates = new Set(typeEvents);
    } else if (options.startTime || options.endTime) {
      // Use time index
      candidates = this.getEventsByTimeRange(options.startTime, options.endTime);
    } else {
      // Full scan
      candidates = new Set(store.keys());
    }
    
    // Apply filters
    for (const eventId of candidates) {
      const event = await this.getEvent(partition, eventId);
      if (!event) continue;
      
      // Time filter
      if (options.startTime && event.timestamp < options.startTime) continue;
      if (options.endTime && event.timestamp > options.endTime) continue;
      
      // Custom filter
      if (options.filter && !options.filter(event)) continue;
      
      results.push(event);
    }
    
    return results;
  }
  
  /**
   * Get event by ID
   */
  async getEvent(partition, eventId) {
    const store = this.stores.get(partition);
    const compressed = store.get(eventId);
    
    if (!compressed) return null;
    
    return this.compressionEnabled ? 
      await this.decompress(compressed) : compressed;
  }
  
  /**
   * Get events by time range
   */
  getEventsByTimeRange(startTime, endTime) {
    const events = new Set();
    
    const startKey = startTime ? Math.floor(startTime / 1000) : 0;
    const endKey = endTime ? Math.floor(endTime / 1000) : Infinity;
    
    for (const [timeKey, eventIds] of this.timeIndex) {
      if (timeKey >= startKey && timeKey <= endKey) {
        eventIds.forEach(id => events.add(id));
      }
    }
    
    return events;
  }
  
  /**
   * Update indices for event
   */
  updateIndices(partition, event) {
    const index = this.indices.get(partition);
    
    // By file index
    if (event.fileId) {
      if (!index.byFile.has(event.fileId)) {
        index.byFile.set(event.fileId, new Set());
      }
      index.byFile.get(event.fileId).add(event.id);
    }
    
    // By type index
    if (event.type) {
      if (!index.byType.has(event.type)) {
        index.byType.set(event.type, new Set());
      }
      index.byType.get(event.type).add(event.id);
    }
    
    // By time bucket (hour)
    const timeBucket = Math.floor(event.timestamp / 3600000);
    if (!index.byTime.has(timeBucket)) {
      index.byTime.set(timeBucket, new Set());
    }
    index.byTime.get(timeBucket).add(event.id);
  }
  
  /**
   * Evict oldest events when size limit reached
   */
  evictOldest(partition) {
    const store = this.stores.get(partition);
    const index = this.indices.get(partition);
    
    // Get oldest events (simple strategy)
    const events = Array.from(store.entries())
      .map(([id, event]) => ({ id, timestamp: event.timestamp || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Evict oldest 10%
    const toEvict = Math.floor(events.length * 0.1);
    
    for (let i = 0; i < toEvict; i++) {
      const eventId = events[i].id;
      const event = store.get(eventId);
      
      // Remove from store
      store.delete(eventId);
      
      // Remove from indices
      if (event.fileId) {
        index.byFile.get(event.fileId)?.delete(eventId);
      }
      if (event.type) {
        index.byType.get(event.type)?.delete(eventId);
      }
      
      // Remove from time index
      const timeKey = Math.floor(event.timestamp / 1000);
      this.timeIndex.get(timeKey)?.delete(eventId);
      
      this.metrics.evictions++;
    }
  }
  
  /**
   * Get range of events
   */
  async getRange(startTime, endTime) {
    return this.query({ startTime, endTime, limit: 10000 });
  }
  
  /**
   * Create snapshot
   */
  async snapshot() {
    const snapshot = {
      timestamp: Date.now(),
      eventCount: this.metrics.totalEvents,
      partitions: {}
    };
    
    // Snapshot each partition
    for (const [partition, store] of this.stores) {
      snapshot.partitions[partition] = {
        size: store.size,
        events: Array.from(store.values())
      };
    }
    
    // In production, persist to disk
    return snapshot;
  }
  
  /**
   * Compact store by removing old events
   */
  async compact(beforeTimestamp) {
    let removed = 0;
    
    for (const [partition, store] of this.stores) {
      const toRemove = [];
      
      for (const [id, event] of store) {
        if (event.timestamp < beforeTimestamp) {
          toRemove.push(id);
        }
      }
      
      toRemove.forEach(id => {
        store.delete(id);
        removed++;
      });
      
      // Clean indices
      this.cleanIndices(partition);
    }
    
    return removed;
  }
  
  /**
   * Clean indices
   */
  cleanIndices(partition) {
    const index = this.indices.get(partition);
    const store = this.stores.get(partition);
    
    // Clean file index
    for (const [fileId, eventIds] of index.byFile) {
      const validIds = new Set();
      for (const id of eventIds) {
        if (store.has(id)) {
          validIds.add(id);
        }
      }
      if (validIds.size === 0) {
        index.byFile.delete(fileId);
      } else {
        index.byFile.set(fileId, validIds);
      }
    }
    
    // Similar for other indices...
  }
  
  /**
   * Compress event (simple JSON compression)
   */
  async compress(event) {
    // In production, use proper compression (zlib, etc.)
    return {
      ...event,
      _compressed: true,
      _data: JSON.stringify(event)
    };
  }
  
  /**
   * Decompress event
   */
  async decompress(compressed) {
    if (!compressed._compressed) return compressed;
    
    return JSON.parse(compressed._data);
  }
  
  /**
   * Get partition for event
   */
  getPartition(eventId) {
    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
      hash = ((hash << 5) - hash) + eventId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % this.partitions;
  }
  
  /**
   * Start cleanup process
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - this.ttl;
      this.compact(cutoff);
    }, 3600000); // Every hour
  }
  
  /**
   * Load from disk (placeholder)
   */
  async loadFromDisk() {
    // In production, load persisted events
  }
  
  /**
   * Get total size
   */
  size() {
    let total = 0;
    for (const store of this.stores.values()) {
      total += store.size;
    }
    return total;
  }
  
  /**
   * Close event store
   */
  async close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Persist to disk
    await this.snapshot();
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      totalEvents: this.size(),
      partitions: {},
      indices: {
        timeIndexSize: this.timeIndex.size
      },
      metrics: this.metrics
    };
    
    for (const [partition, store] of this.stores) {
      const index = this.indices.get(partition);
      stats.partitions[partition] = {
        events: store.size,
        fileIndex: index.byFile.size,
        typeIndex: index.byType.size,
        timeIndex: index.byTime.size
      };
    }
    
    return stats;
  }
}

export default EventStore;