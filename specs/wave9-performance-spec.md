# 📋 Wave 9: Performance & Scale Team Specification
## Feature Branch: `feature/ml-confidence-integration`

### Team Assignment: Performance Engineering & Optimization

#### 🎯 Sprint Goal
Optimize ML system to handle 1000+ files with < 2s initial processing, implementing Web Workers, virtual scrolling, and intelligent caching strategies.

## 📊 Success Metrics (Week 6)
- [ ] Process 100 files in < 2 seconds
- [ ] Memory usage < 100MB with 1000 files
- [ ] Maintain 60fps during ML operations
- [ ] Worker pool utilization 70-90%
- [ ] Cache hit rate > 90%

## 🛠️ Technical Deliverables

### 1. ML Worker Pool (`js/ml/MLWorkerPool.js`)
```javascript
/**
 * Manages pool of Web Workers for parallel ML processing
 * Optimized for multi-core utilization
 */
class MLWorkerPool {
  constructor(options = {}) {
    this.size = options.size || navigator.hardwareConcurrency || 4;
    this.workers = [];
    this.queue = [];
    this.processing = new Map();
    this.terminated = false;
    
    this.stats = {
      processed: 0,
      errors: 0,
      totalTime: 0,
      queueTime: []
    };
    
    this.initialize();
  }
  
  initialize() {
    // Create worker pool
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker('/js/ml/ml-calculator.worker.js');
      
      worker.id = i;
      worker.busy = false;
      
      worker.onmessage = this.handleWorkerMessage.bind(this, worker);
      worker.onerror = this.handleWorkerError.bind(this, worker);
      
      this.workers.push(worker);
    }
    
    console.log(`ML Worker Pool initialized with ${this.size} workers`);
  }
  
  async calculate(files) {
    if (this.terminated) {
      throw new Error('Worker pool has been terminated');
    }
    
    const startTime = performance.now();
    const batches = this.createOptimalBatches(files);
    
    // Process batches in parallel
    const promises = batches.map(batch => this.processBatch(batch));
    const results = await Promise.all(promises);
    
    // Update stats
    this.stats.totalTime += performance.now() - startTime;
    this.stats.processed += files.length;
    
    return results.flat();
  }
  
  createOptimalBatches(files) {
    // Dynamic batch sizing based on file complexity
    const batches = [];
    let currentBatch = [];
    let currentComplexity = 0;
    
    const MAX_COMPLEXITY = 100; // Tunable
    
    for (const file of files) {
      const complexity = this.estimateComplexity(file);
      
      if (currentComplexity + complexity > MAX_COMPLEXITY && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentComplexity = 0;
      }
      
      currentBatch.push(file);
      currentComplexity += complexity;
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  }
  
  estimateComplexity(file) {
    // Estimate processing complexity
    const factors = {
      size: file.size / 1024, // KB
      contentLength: (file.content?.length || 0) / 1000,
      categories: file.categories?.length || 0,
      hasEmbedding: file.embedding ? 0 : 10 // New embeddings are expensive
    };
    
    return Object.values(factors).reduce((sum, val) => sum + val, 0);
  }
  
  async processBatch(batch) {
    return new Promise((resolve, reject) => {
      const task = {
        id: crypto.randomUUID(),
        batch,
        resolve,
        reject,
        queuedAt: performance.now()
      };
      
      this.queue.push(task);
      this.processQueue();
    });
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;
    
    const task = this.queue.shift();
    availableWorker.busy = true;
    
    // Track queue time
    const queueTime = performance.now() - task.queuedAt;
    this.stats.queueTime.push(queueTime);
    
    // Store task reference
    this.processing.set(availableWorker.id, task);
    
    // Send to worker
    availableWorker.postMessage({
      type: 'calculate',
      taskId: task.id,
      batch: task.batch
    });
  }
  
  handleWorkerMessage(worker, event) {
    const { type, taskId, results, error } = event.data;
    
    if (type === 'results') {
      const task = this.processing.get(worker.id);
      if (task && task.id === taskId) {
        task.resolve(results);
        this.processing.delete(worker.id);
      }
    }
    
    worker.busy = false;
    this.processQueue(); // Process next in queue
  }
  
  handleWorkerError(worker, error) {
    console.error(`Worker ${worker.id} error:`, error);
    
    const task = this.processing.get(worker.id);
    if (task) {
      task.reject(error);
      this.processing.delete(worker.id);
    }
    
    worker.busy = false;
    this.stats.errors++;
    
    // Restart worker if needed
    this.restartWorker(worker.id);
  }
  
  getStats() {
    const avgQueueTime = this.stats.queueTime.length > 0
      ? this.stats.queueTime.reduce((a, b) => a + b) / this.stats.queueTime.length
      : 0;
    
    return {
      workers: this.size,
      processed: this.stats.processed,
      errors: this.stats.errors,
      avgProcessingTime: this.stats.totalTime / this.stats.processed,
      avgQueueTime,
      utilization: this.getUtilization()
    };
  }
  
  getUtilization() {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    return (busyWorkers / this.size) * 100;
  }
  
  terminate() {
    this.terminated = true;
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.queue = [];
    this.processing.clear();
  }
}
```

### 2. ML Calculator Worker (`js/ml/ml-calculator.worker.js`)
```javascript
/**
 * Web Worker for ML calculations
 * Runs in separate thread for performance
 */

// Import necessary modules
importScripts('/js/ml/ConfidenceCalculator.js');
importScripts('/js/ml/algorithms/SemanticScorer.js');
importScripts('/js/ml/algorithms/CategoricalScorer.js');
importScripts('/js/ml/algorithms/StructuralScorer.js');
importScripts('/js/ml/algorithms/TemporalScorer.js');

// Initialize calculator
const calculator = new ConfidenceCalculator();

// Message handler
self.onmessage = async function(event) {
  const { type, taskId, batch } = event.data;
  
  if (type === 'calculate') {
    try {
      const results = await processBatch(batch);
      
      self.postMessage({
        type: 'results',
        taskId,
        results
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        taskId,
        error: error.message
      });
    }
  }
};

async function processBatch(files) {
  const results = [];
  
  for (const file of files) {
    try {
      const confidence = await calculator.calculate(file);
      results.push({
        fileId: file.id,
        confidence,
        success: true
      });
    } catch (error) {
      results.push({
        fileId: file.id,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

// Performance optimization for worker
calculator.enableWorkerMode({
  skipCache: false, // Use cache even in worker
  lightweight: true, // Use lightweight algorithms
  parallel: false // No nested parallelism
});
```

### 3. Smart Cache Manager (`js/ml/MLCacheManager.js`)
```javascript
/**
 * Multi-layer caching system for ML results
 * Memory → IndexedDB → Redis (future)
 */
class MLCacheManager {
  constructor(options = {}) {
    this.memoryCache = new LRUCache({
      max: options.memoryMax || 1000,
      ttl: options.memoryTTL || 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true
    });
    
    this.persistentCache = new IndexedDBCache('ml-confidence-cache');
    this.compressionEnabled = options.compression !== false;
    
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    
    this.initialize();
  }
  
  async initialize() {
    await this.persistentCache.open();
    
    // Preload hot data
    await this.preloadHotData();
    
    // Setup eviction listener
    this.memoryCache.on('evict', this.handleEviction.bind(this));
  }
  
  async get(fileId) {
    // L1: Memory cache
    let result = this.memoryCache.get(fileId);
    if (result) {
      this.stats.hits++;
      return this.decompress(result);
    }
    
    // L2: IndexedDB
    result = await this.persistentCache.get(fileId);
    if (result) {
      this.stats.hits++;
      // Promote to memory
      this.memoryCache.set(fileId, result);
      return this.decompress(result);
    }
    
    this.stats.misses++;
    return null;
  }
  
  async set(fileId, confidence) {
    const compressed = this.compress(confidence);
    
    // Set in both layers
    this.memoryCache.set(fileId, compressed);
    await this.persistentCache.set(fileId, compressed);
    
    // Update access patterns
    this.updateAccessPattern(fileId);
  }
  
  compress(data) {
    if (!this.compressionEnabled) return data;
    
    // Simple compression: remove redundant data
    const compressed = {
      fId: data.fileId,
      o: data.overall, // overall
      d: data.dimensions, // dimensions
      t: data.timestamp,
      v: data.version
    };
    
    return compressed;
  }
  
  decompress(compressed) {
    if (!this.compressionEnabled) return compressed;
    
    return {
      fileId: compressed.fId,
      overall: compressed.o,
      dimensions: compressed.d,
      timestamp: compressed.t,
      version: compressed.v
    };
  }
  
  async preloadHotData() {
    // Load frequently accessed items
    const hotItems = await this.persistentCache.getHotItems(100);
    
    for (const item of hotItems) {
      this.memoryCache.set(item.key, item.value);
    }
    
    console.log(`Preloaded ${hotItems.length} hot items`);
  }
  
  handleEviction(key, value) {
    this.stats.evictions++;
    
    // Ensure it's persisted before eviction
    this.persistentCache.set(key, value).catch(error => {
      console.error('Failed to persist before eviction:', error);
    });
  }
  
  async updateAccessPattern(fileId) {
    // Track access patterns for optimization
    await this.persistentCache.incrementAccessCount(fileId);
  }
  
  async clear() {
    this.memoryCache.clear();
    await this.persistentCache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }
  
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    
    return {
      ...this.stats,
      hitRate: hitRate || 0,
      memorySize: this.memoryCache.size,
      memoryMax: this.memoryCache.max
    };
  }
}

/**
 * IndexedDB wrapper for persistent caching
 */
class IndexedDBCache {
  constructor(dbName) {
    this.dbName = dbName;
    this.db = null;
    this.version = 1;
  }
  
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'id' });
          store.createIndex('accessCount', 'accessCount', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };
    });
  }
  
  async get(key) {
    const tx = this.db.transaction(['cache'], 'readonly');
    const store = tx.objectStore('cache');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update access metadata
          this.updateAccess(key);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async set(key, value) {
    const tx = this.db.transaction(['cache'], 'readwrite');
    const store = tx.objectStore('cache');
    
    const record = {
      id: key,
      data: value,
      accessCount: 1,
      lastAccessed: Date.now(),
      created: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getHotItems(limit) {
    const tx = this.db.transaction(['cache'], 'readonly');
    const store = tx.objectStore('cache');
    const index = store.index('accessCount');
    
    return new Promise((resolve, reject) => {
      const items = [];
      const request = index.openCursor(null, 'prev'); // Descending order
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && items.length < limit) {
          items.push({
            key: cursor.value.id,
            value: cursor.value.data
          });
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}
```

### 4. Virtual Scroll Manager (`js/ml/VirtualScrollManager.js`)
```javascript
/**
 * Implements virtual scrolling for large file lists
 * Renders only visible items for performance
 */
class VirtualScrollManager {
  constructor(container, options = {}) {
    this.container = container;
    this.itemHeight = options.itemHeight || 80; // px
    this.buffer = options.buffer || 5; // items above/below viewport
    this.items = [];
    this.filteredItems = [];
    
    this.scrollTop = 0;
    this.visibleStart = 0;
    this.visibleEnd = 0;
    
    this.wrapper = null;
    this.scroller = null;
    this.content = null;
    
    this.initialize();
  }
  
  initialize() {
    // Create virtual scroll structure
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'virtual-scroll-wrapper';
    this.wrapper.style.cssText = `
      height: 100%;
      overflow-y: auto;
      position: relative;
    `;
    
    this.scroller = document.createElement('div');
    this.scroller.className = 'virtual-scroll-spacer';
    
    this.content = document.createElement('div');
    this.content.className = 'virtual-scroll-content';
    this.content.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    `;
    
    this.wrapper.appendChild(this.scroller);
    this.wrapper.appendChild(this.content);
    
    // Replace container content
    this.container.innerHTML = '';
    this.container.appendChild(this.wrapper);
    
    // Attach scroll listener
    this.wrapper.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Attach resize observer
    this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
    this.resizeObserver.observe(this.wrapper);
  }
  
  setItems(items) {
    this.items = items;
    this.filteredItems = items;
    this.updateScrollHeight();
    this.render();
  }
  
  filterItems(predicate) {
    this.filteredItems = this.items.filter(predicate);
    this.updateScrollHeight();
    this.render();
  }
  
  updateScrollHeight() {
    const totalHeight = this.filteredItems.length * this.itemHeight;
    this.scroller.style.height = `${totalHeight}px`;
  }
  
  handleScroll() {
    this.scrollTop = this.wrapper.scrollTop;
    this.updateVisibleRange();
    this.render();
  }
  
  handleResize() {
    this.updateVisibleRange();
    this.render();
  }
  
  updateVisibleRange() {
    const viewportHeight = this.wrapper.clientHeight;
    const totalItems = this.filteredItems.length;
    
    // Calculate visible range with buffer
    this.visibleStart = Math.max(0, 
      Math.floor(this.scrollTop / this.itemHeight) - this.buffer
    );
    
    this.visibleEnd = Math.min(totalItems - 1,
      Math.ceil((this.scrollTop + viewportHeight) / this.itemHeight) + this.buffer
    );
  }
  
  render() {
    const fragment = document.createDocumentFragment();
    
    // Clear content
    this.content.innerHTML = '';
    
    // Render only visible items
    for (let i = this.visibleStart; i <= this.visibleEnd; i++) {
      const item = this.filteredItems[i];
      if (!item) continue;
      
      const element = this.renderItem(item, i);
      element.style.position = 'absolute';
      element.style.top = `${i * this.itemHeight}px`;
      element.style.height = `${this.itemHeight}px`;
      element.style.left = '0';
      element.style.right = '0';
      
      fragment.appendChild(element);
    }
    
    this.content.appendChild(fragment);
    
    // Emit render event
    KC.EventBus.emit('virtual-scroll:rendered', {
      start: this.visibleStart,
      end: this.visibleEnd,
      total: this.filteredItems.length
    });
  }
  
  renderItem(item, index) {
    // Use existing FileRenderer with modifications
    const div = document.createElement('div');
    div.className = 'virtual-scroll-item file-item';
    div.dataset.fileId = item.id;
    div.dataset.index = index;
    
    // Reuse FileRenderer template but with performance optimizations
    div.innerHTML = this.getItemTemplate(item);
    
    // Attach event listeners using delegation
    this.attachItemListeners(div, item);
    
    return div;
  }
  
  getItemTemplate(file) {
    // Optimized template with minimal DOM
    const confidence = file.mlConfidence;
    const hasConfidence = confidence && KC.MLFeatureFlags.isEnabled('ui.badges');
    
    return `
      <div class="file-item-content">
        <div class="file-info">
          <div class="file-name">${this.escapeHtml(file.name)}</div>
          <div class="file-meta">
            <span class="file-size">${this.formatSize(file.size)}</span>
            <span class="file-date">${this.formatDate(file.lastModified)}</span>
          </div>
        </div>
        ${hasConfidence ? `
          <div class="confidence-badge-mini" style="--confidence: ${confidence.overall}">
            <span class="confidence-value">${Math.round(confidence.overall * 100)}%</span>
          </div>
        ` : ''}
        <div class="file-actions">
          <button class="btn-icon" data-action="analyze">🔍</button>
          <button class="btn-icon" data-action="view">👁️</button>
        </div>
      </div>
    `;
  }
  
  attachItemListeners(element, item) {
    // Use event delegation for better performance
    element.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        KC.EventBus.emit(`file:${action}`, { file: item });
      }
    });
  }
  
  scrollToItem(index) {
    const position = index * this.itemHeight;
    this.wrapper.scrollTop = position;
  }
  
  destroy() {
    this.resizeObserver.disconnect();
    this.wrapper.removeEventListener('scroll', this.handleScroll);
    this.container.innerHTML = '';
  }
  
  // Utility methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  
  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString();
  }
}
```

### 5. Performance Monitor (`js/ml/MLPerformanceMonitor.js`)
```javascript
/**
 * Monitors and optimizes ML performance in real-time
 */
class MLPerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: [],
      memory: [],
      processingTime: [],
      queueLength: []
    };
    
    this.thresholds = {
      fps: 30,
      memory: 150 * 1024 * 1024, // 150MB
      processingTime: 2000, // 2s
      queueLength: 100
    };
    
    this.monitoring = false;
    this.rafId = null;
  }
  
  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.lastFrameTime = performance.now();
    this.monitorFrame();
    
    // Start memory monitoring
    this.memoryInterval = setInterval(() => {
      this.monitorMemory();
    }, 1000);
    
    // Listen to ML events
    KC.EventBus.on('ml:processing:start', this.onProcessingStart.bind(this));
    KC.EventBus.on('ml:processing:end', this.onProcessingEnd.bind(this));
  }
  
  monitorFrame() {
    if (!this.monitoring) return;
    
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    const fps = 1000 / delta;
    
    this.metrics.fps.push(fps);
    if (this.metrics.fps.length > 60) {
      this.metrics.fps.shift();
    }
    
    // Check for performance issues
    if (fps < this.thresholds.fps) {
      this.handleLowFPS(fps);
    }
    
    this.lastFrameTime = now;
    this.rafId = requestAnimationFrame(() => this.monitorFrame());
  }
  
  monitorMemory() {
    if (!performance.memory) return;
    
    const used = performance.memory.usedJSHeapSize;
    this.metrics.memory.push(used);
    
    if (this.metrics.memory.length > 60) {
      this.metrics.memory.shift();
    }
    
    if (used > this.thresholds.memory) {
      this.handleHighMemory(used);
    }
  }
  
  handleLowFPS(fps) {
    console.warn(`Low FPS detected: ${fps.toFixed(1)}`);
    
    // Reduce visual complexity
    if (fps < 20) {
      KC.EventBus.emit('performance:reduce-visuals');
    }
    
    // Defer non-critical updates
    if (fps < 30) {
      KC.EventBus.emit('performance:defer-updates');
    }
  }
  
  handleHighMemory(used) {
    console.warn(`High memory usage: ${(used / 1024 / 1024).toFixed(1)}MB`);
    
    // Trigger cache cleanup
    KC.EventBus.emit('performance:cleanup-cache');
    
    // Reduce batch sizes
    KC.EventBus.emit('performance:reduce-batch-size');
  }
  
  onProcessingStart(event) {
    event.startTime = performance.now();
  }
  
  onProcessingEnd(event) {
    if (!event.startTime) return;
    
    const duration = performance.now() - event.startTime;
    this.metrics.processingTime.push(duration);
    
    if (this.metrics.processingTime.length > 100) {
      this.metrics.processingTime.shift();
    }
  }
  
  getReport() {
    return {
      avgFPS: this.getAverage(this.metrics.fps),
      minFPS: Math.min(...this.metrics.fps),
      avgMemoryMB: this.getAverage(this.metrics.memory) / 1024 / 1024,
      peakMemoryMB: Math.max(...this.metrics.memory) / 1024 / 1024,
      avgProcessingTime: this.getAverage(this.metrics.processingTime),
      p95ProcessingTime: this.getPercentile(this.metrics.processingTime, 95),
      recommendations: this.generateRecommendations()
    };
  }
  
  generateRecommendations() {
    const recommendations = [];
    const report = this.getReport();
    
    if (report.avgFPS < 50) {
      recommendations.push({
        type: 'performance',
        message: 'Consider reducing visual effects or batch sizes',
        severity: 'medium'
      });
    }
    
    if (report.peakMemoryMB > 100) {
      recommendations.push({
        type: 'memory',
        message: 'High memory usage detected. Clear cache or reduce data retention',
        severity: 'high'
      });
    }
    
    if (report.p95ProcessingTime > 1000) {
      recommendations.push({
        type: 'processing',
        message: 'Processing times are high. Consider increasing worker pool size',
        severity: 'medium'
      });
    }
    
    return recommendations;
  }
  
  getAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b) / arr.length;
  }
  
  getPercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile / 100) - 1;
    return sorted[index];
  }
  
  stop() {
    this.monitoring = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
  }
}
```

## 📝 Testing Requirements

### 1. Performance Tests (`test/ml/performance.test.js`)
```javascript
describe('ML Performance Optimization', () => {
  describe('Worker Pool', () => {
    it('should process 100 files in < 2 seconds', async () => {
      const pool = new MLWorkerPool({ size: 4 });
      const files = generateMockFiles(100);
      
      const start = performance.now();
      const results = await pool.calculate(files);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(2000);
      expect(results).toHaveLength(100);
      
      pool.terminate();
    });
    
    it('should maintain 70-90% utilization', async () => {
      const pool = new MLWorkerPool({ size: 4 });
      const files = generateMockFiles(200);
      
      const utilizationSamples = [];
      const interval = setInterval(() => {
        utilizationSamples.push(pool.getUtilization());
      }, 100);
      
      await pool.calculate(files);
      clearInterval(interval);
      
      const avgUtilization = utilizationSamples.reduce((a, b) => a + b) / utilizationSamples.length;
      expect(avgUtilization).toBeGreaterThan(70);
      expect(avgUtilization).toBeLessThan(90);
      
      pool.terminate();
    });
  });
  
  describe('Cache Performance', () => {
    it('should achieve > 90% hit rate with warm cache', async () => {
      const cache = new MLCacheManager();
      const files = generateMockFiles(50);
      
      // Warm up cache
      for (const file of files) {
        await cache.set(file.id, generateMockConfidence());
      }
      
      // Test hit rate
      for (let i = 0; i < 100; i++) {
        const file = files[Math.floor(Math.random() * files.length)];
        await cache.get(file.id);
      }
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.9);
    });
  });
  
  describe('Virtual Scroll', () => {
    it('should handle 1000+ items smoothly', () => {
      const container = document.createElement('div');
      container.style.height = '600px';
      document.body.appendChild(container);
      
      const virtualScroll = new VirtualScrollManager(container);
      const items = generateMockFiles(1000);
      
      virtualScroll.setItems(items);
      
      // Check that only visible items are rendered
      const renderedItems = container.querySelectorAll('.virtual-scroll-item');
      expect(renderedItems.length).toBeLessThan(20); // Much less than 1000
      
      virtualScroll.destroy();
      document.body.removeChild(container);
    });
  });
});
```

### 2. Load Tests (`test/ml/load.test.js`)
```javascript
describe('ML Load Tests', () => {
  it('should handle 1000 files with < 100MB memory', async () => {
    const initialMemory = performance.memory.usedJSHeapSize;
    
    // Create and process 1000 files
    const files = generateLargeDataset(1000);
    const orchestrator = new MLOrchestrator();
    await orchestrator.initialize();
    
    await orchestrator.processBatch(files);
    
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024;
    
    expect(memoryUsed).toBeLessThan(100);
  });
  
  it('should maintain 60fps during operations', async () => {
    const monitor = new MLPerformanceMonitor();
    monitor.start();
    
    // Perform heavy operations
    const files = generateMockFiles(500);
    await processWithAnimationFrame(files);
    
    const report = monitor.getReport();
    expect(report.avgFPS).toBeGreaterThan(55);
    expect(report.minFPS).toBeGreaterThan(30);
    
    monitor.stop();
  });
});
```

## 🚀 Implementation Checklist

### Pre-implementation
- [ ] Profile current performance baseline
- [ ] Identify bottlenecks with Chrome DevTools
- [ ] Review Worker API compatibility
- [ ] Plan cache eviction strategy

### Implementation Steps
1. Implement MLWorkerPool with dynamic sizing
2. Create worker scripts with proper error handling
3. Build multi-layer cache system
4. Integrate virtual scrolling
5. Add performance monitoring

### Optimization Targets
- [ ] Initial load time < 1s
- [ ] Smooth scrolling with 1000+ items
- [ ] Memory usage stable under load
- [ ] No UI freezes during processing

## 🔍 Performance Monitoring Points

### Key Metrics to Track
```javascript
// Real-time performance tracking
const performanceMetrics = {
  // Processing
  ml_processing_rate: 'files/second',
  ml_worker_utilization: 'percentage',
  ml_queue_depth: 'count',
  
  // Memory
  ml_memory_heap_used: 'MB',
  ml_cache_size: 'entries',
  ml_cache_hit_rate: 'percentage',
  
  // UI Performance
  ml_frame_rate: 'fps',
  ml_render_time: 'ms',
  ml_scroll_jank: 'count'
};
```

### Performance Budgets
- JavaScript bundle: < 500KB (gzipped)
- Time to Interactive: < 3s
- First Contentful Paint: < 1s
- Cumulative Layout Shift: < 0.1

---

**Team Contact**: @performance-team
**Review Required By**: Performance Lead + Tech Lead
**Deadline**: End of Week 6