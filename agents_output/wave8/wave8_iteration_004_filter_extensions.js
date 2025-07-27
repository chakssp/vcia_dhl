/**
 * Wave 8 - Iteration 004: FilterPanelML Extensions
 * Sub-Wave 8.4: ML Filter Extensions + Performance Optimization + System Integration
 * 
 * This iteration extends the existing FilterPanel with ML-specific filtering capabilities
 * while maintaining full backward compatibility and existing performance standards.
 * 
 * Key Features:
 * - ML confidence range filters (0-100%)
 * - ML status filters (converged, improving, stagnant, needs-work)
 * - Iteration count filters for ML optimization cycles
 * - Performance-optimized filter algorithms for 1000+ files
 * - Visual indicators for ML-specific data
 * - Seamless integration with existing KC architecture
 * 
 * Performance Goals:
 * - Filter operations < 500ms on 1000+ files
 * - Non-destructive extension pattern
 * - GPU-accelerated visual updates
 * - Memory-efficient filter caching
 * 
 * @author Senior Frontend Engineers Team
 * @iteration 004
 * @date 2025-07-27
 */

// ============================================================================
// ML FILTER PERFORMANCE OPTIMIZER
// ============================================================================

/**
 * Performance-optimized filter operations for ML data
 * Uses Web Workers for heavy computations and caching for repeated operations
 */
class MLFilterPerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.batchSize = 100;
    this.workerPool = [];
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    
    // Initialize Web Workers for heavy filtering
    this.initializeWorkerPool();
  }
  
  /**
   * Initialize Web Worker pool for parallel processing
   */
  initializeWorkerPool() {
    if (typeof Worker === 'undefined') {
      console.log('[MLFilter] Web Workers not supported, using main thread');
      return;
    }
    
    // Create inline worker for ML filtering
    const workerCode = `
      self.onmessage = function(e) {
        const { files, filterConfig, batchIndex } = e.data;
        
        try {
          const filtered = files.filter(file => {
            return applyMLFilters(file, filterConfig);
          });
          
          self.postMessage({
            success: true,
            filtered,
            batchIndex
          });
        } catch (error) {
          self.postMessage({
            success: false,
            error: error.message,
            batchIndex
          });
        }
      };
      
      function applyMLFilters(file, config) {
        if (!file.mlConfidence) return false;
        
        const confidence = file.mlConfidence.overall * 100;
        const status = getMLStatus(file);
        const iterations = file.mlConfidence.iteration || 1;
        
        // Confidence range filter
        if (config.confidenceRange) {
          if (confidence < config.confidenceRange[0] || confidence > config.confidenceRange[1]) {
            return false;
          }
        }
        
        // Status filter
        if (config.statusFilter && config.statusFilter.length > 0) {
          if (!config.statusFilter.includes(status)) {
            return false;
          }
        }
        
        // Iteration filter
        if (config.iterationRange) {
          if (iterations < config.iterationRange.min || iterations > config.iterationRange.max) {
            return false;
          }
        }
        
        return true;
      }
      
      function getMLStatus(file) {
        if (!file.mlConfidence) return 'unprocessed';
        
        const confidence = file.mlConfidence.overall;
        const history = file.mlHistory || [];
        
        if (confidence >= 0.85) return 'converged';
        
        if (history.length >= 2) {
          const recent = history.slice(-2);
          const delta = recent[1].overall - recent[0].overall;
          
          if (delta > 0.02) return 'improving';
          if (Math.abs(delta) < 0.01) return 'stagnant';
        }
        
        return 'needs-work';
      }
    `;
    
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = new Worker(workerUrl);
        worker.busy = false;
        this.workerPool.push(worker);
      }
      
      console.log(`[MLFilter] Initialized ${this.maxWorkers} Web Workers`);
    } catch (error) {
      console.warn('[MLFilter] Failed to create Web Workers:', error);
    }
  }
  
  /**
   * Get or create cache key for filter configuration
   */
  getCacheKey(filterConfig) {
    return JSON.stringify(filterConfig);
  }
  
  /**
   * Check if cached result is still valid
   */
  isValidCache(cacheEntry) {
    return Date.now() - cacheEntry.timestamp < this.cacheExpiry;
  }
  
  /**
   * Apply ML filters with performance optimization
   * @param {Array} files - Files to filter
   * @param {Object} filterConfig - ML filter configuration
   * @returns {Promise<Array>} Filtered files
   */
  async applyFilters(files, filterConfig) {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = this.getCacheKey(filterConfig);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isValidCache(cached)) {
      // Apply cached filter to current file set
      const filtered = files.filter(file => 
        cached.fileIds.has(file.id)
      );
      
      console.log(`[MLFilter] Cache hit: ${performance.now() - startTime}ms`);
      return filtered;
    }
    
    // For small datasets, use main thread
    if (files.length < 200 || this.workerPool.length === 0) {
      const filtered = this.applyFiltersMainThread(files, filterConfig);
      
      // Cache result
      this.cache.set(cacheKey, {
        fileIds: new Set(filtered.map(f => f.id)),
        timestamp: Date.now()
      });
      
      console.log(`[MLFilter] Main thread: ${performance.now() - startTime}ms`);
      return filtered;
    }
    
    // Use Web Workers for large datasets
    return this.applyFiltersWorkers(files, filterConfig);
  }
  
  /**
   * Apply filters on main thread
   */
  applyFiltersMainThread(files, filterConfig) {
    return files.filter(file => {
      if (!file.mlConfidence) return false;
      
      const confidence = file.mlConfidence.overall * 100;
      const status = this.getMLStatus(file);
      const iterations = file.mlConfidence.iteration || 1;
      
      // Confidence range filter
      if (filterConfig.confidenceRange) {
        const [min, max] = filterConfig.confidenceRange;
        if (confidence < min || confidence > max) return false;
      }
      
      // Status filter
      if (filterConfig.statusFilter && filterConfig.statusFilter.length > 0) {
        if (!filterConfig.statusFilter.includes(status)) return false;
      }
      
      // Iteration filter
      if (filterConfig.iterationRange) {
        const { min, max } = filterConfig.iterationRange;
        if (iterations < min || iterations > max) return false;
      }
      
      return true;
    });
  }
  
  /**
   * Apply filters using Web Workers
   */
  async applyFiltersWorkers(files, filterConfig) {
    const startTime = performance.now();
    const batches = this.createBatches(files);
    const promises = [];
    
    for (let i = 0; i < batches.length; i++) {
      const worker = await this.getAvailableWorker();
      const promise = this.processWorkerBatch(worker, batches[i], filterConfig, i);
      promises.push(promise);
    }
    
    try {
      const results = await Promise.all(promises);
      const filtered = results.reduce((acc, batch) => acc.concat(batch.filtered), []);
      
      // Cache result
      const cacheKey = this.getCacheKey(filterConfig);
      this.cache.set(cacheKey, {
        fileIds: new Set(filtered.map(f => f.id)),
        timestamp: Date.now()
      });
      
      console.log(`[MLFilter] Workers (${batches.length} batches): ${performance.now() - startTime}ms`);
      return filtered;
    } catch (error) {
      console.error('[MLFilter] Worker processing failed:', error);
      // Fallback to main thread
      return this.applyFiltersMainThread(files, filterConfig);
    }
  }
  
  /**
   * Create processing batches
   */
  createBatches(files) {
    const batches = [];
    for (let i = 0; i < files.length; i += this.batchSize) {
      batches.push(files.slice(i, i + this.batchSize));
    }
    return batches;
  }
  
  /**
   * Get available worker from pool
   */
  async getAvailableWorker() {
    return new Promise((resolve) => {
      const checkWorker = () => {
        const available = this.workerPool.find(w => !w.busy);
        if (available) {
          available.busy = true;
          resolve(available);
        } else {
          setTimeout(checkWorker, 10);
        }
      };
      checkWorker();
    });
  }
  
  /**
   * Process batch with worker
   */
  processWorkerBatch(worker, batch, filterConfig, batchIndex) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.busy = false;
        reject(new Error('Worker timeout'));
      }, 5000);
      
      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.busy = false;
        
        if (e.data.success) {
          resolve(e.data);
        } else {
          reject(new Error(e.data.error));
        }
      };
      
      worker.postMessage({ files: batch, filterConfig, batchIndex });
    });
  }
  
  /**
   * Get ML status for a file
   */
  getMLStatus(file) {
    if (!file.mlConfidence) return 'unprocessed';
    
    const confidence = file.mlConfidence.overall;
    const history = file.mlHistory || [];
    
    if (confidence >= 0.85) return 'converged';
    
    if (history.length >= 2) {
      const recent = history.slice(-2);
      const delta = recent[1].overall - recent[0].overall;
      
      if (delta > 0.02) return 'improving';
      if (Math.abs(delta) < 0.01) return 'stagnant';
    }
    
    return 'needs-work';
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.clearCache();
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
  }
}

// ============================================================================
// ML FILTER VISUAL INDICATORS
// ============================================================================

/**
 * Visual indicators for ML filter states
 * Provides GPU-accelerated visual feedback for filter operations
 */
class MLFilterVisualIndicators {
  constructor() {
    this.indicators = new Map();
    this.animationFrames = new Map();
  }
  
  /**
   * Create confidence distribution chart
   */
  createConfidenceChart(container, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 80;
    canvas.className = 'ml-confidence-chart';
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate distribution
    const buckets = [0, 0, 0, 0]; // uncertain, low, medium, high
    data.forEach(file => {
      if (file.mlConfidence) {
        const confidence = file.mlConfidence.overall;
        if (confidence >= 0.85) buckets[3]++;
        else if (confidence >= 0.70) buckets[2]++;
        else if (confidence >= 0.50) buckets[1]++;
        else buckets[0]++;
      }
    });
    
    const max = Math.max(...buckets);
    const colors = ['#6B7280', '#EF4444', '#F59E0B', '#10B981'];
    const labels = ['Uncertain', 'Low', 'Medium', 'High'];
    
    // Draw bars
    const barWidth = canvas.width / 4;
    buckets.forEach((count, i) => {
      const height = max > 0 ? (count / max) * 60 : 0;
      const x = i * barWidth;
      const y = canvas.height - height - 10;
      
      // Bar
      ctx.fillStyle = colors[i];
      ctx.fillRect(x + 10, y, barWidth - 20, height);
      
      // Label
      ctx.fillStyle = '#374151';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, canvas.height - 2);
      
      // Count
      ctx.fillText(count.toString(), x + barWidth / 2, y - 5);
    });
    
    container.appendChild(canvas);
    return canvas;
  }
  
  /**
   * Create status indicator badges
   */
  createStatusIndicators(container, data) {
    const statusCounts = {
      converged: 0,
      improving: 0,
      stagnant: 0,
      'needs-work': 0,
      unprocessed: 0
    };
    
    data.forEach(file => {
      const status = this.getMLStatus(file);
      statusCounts[status]++;
    });
    
    const wrapper = document.createElement('div');
    wrapper.className = 'ml-status-indicators';
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const badge = document.createElement('div');
      badge.className = `ml-status-badge ${status}`;
      badge.innerHTML = `
        <span class="status-icon">${this.getStatusIcon(status)}</span>
        <span class="status-label">${this.getStatusLabel(status)}</span>
        <span class="status-count">${count}</span>
      `;
      wrapper.appendChild(badge);
    });
    
    container.appendChild(wrapper);
    return wrapper;
  }
  
  /**
   * Animate filter application
   */
  animateFilterChange(element, from, to) {
    if (this.animationFrames.has(element)) {
      cancelAnimationFrame(this.animationFrames.get(element));
    }
    
    const duration = 300;
    const start = performance.now();
    
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Update opacity
      element.style.opacity = eased;
      
      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(element, frameId);
      } else {
        this.animationFrames.delete(element);
      }
    };
    
    element.style.opacity = '0';
    const frameId = requestAnimationFrame(animate);
    this.animationFrames.set(element, frameId);
  }
  
  /**
   * Get ML status for file (duplicate for visual component)
   */
  getMLStatus(file) {
    if (!file.mlConfidence) return 'unprocessed';
    
    const confidence = file.mlConfidence.overall;
    const history = file.mlHistory || [];
    
    if (confidence >= 0.85) return 'converged';
    
    if (history.length >= 2) {
      const recent = history.slice(-2);
      const delta = recent[1].overall - recent[0].overall;
      
      if (delta > 0.02) return 'improving';
      if (Math.abs(delta) < 0.01) return 'stagnant';
    }
    
    return 'needs-work';
  }
  
  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      converged: '✅',
      improving: '📈',
      stagnant: '⏸️',
      'needs-work': '🔴',
      unprocessed: '⚪'
    };
    return icons[status] || '❓';
  }
  
  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      converged: 'Converged',
      improving: 'Improving',
      stagnant: 'Stagnant',
      'needs-work': 'Needs Work',
      unprocessed: 'Unprocessed'
    };
    return labels[status] || 'Unknown';
  }
}

// ============================================================================
// FILTERPANEL ML EXTENSION
// ============================================================================

/**
 * Extension class that adds ML-specific filters to the existing FilterPanel
 * Follows non-destructive extension pattern for maximum compatibility
 */
class FilterPanelML {
  constructor(filterPanel) {
    this.filterPanel = filterPanel;
    this.optimizer = new MLFilterPerformanceOptimizer();
    this.visualIndicators = new MLFilterVisualIndicators();
    this.isInitialized = false;
    
    // ML filter state
    this.mlFilters = {
      confidence: {
        enabled: false,
        range: [0, 100],
        default: [0, 100]
      },
      status: {
        enabled: false,
        selected: ['converged', 'improving', 'stagnant', 'needs-work'],
        options: ['converged', 'improving', 'stagnant', 'needs-work', 'unprocessed']
      },
      iterations: {
        enabled: false,
        range: { min: 1, max: 10 },
        default: { min: 1, max: 10 }
      }
    };
    
    // Performance tracking
    this.performanceMetrics = {
      lastFilterTime: 0,
      averageFilterTime: 0,
      filterCount: 0
    };
  }
  
  /**
   * Initialize ML extensions
   */
  initialize() {
    if (this.isInitialized) return;
    
    this.extendFilterPanelUI();
    this.setupEventListeners();
    this.injectMLStyles();
    
    this.isInitialized = true;
    
    // Emit initialization event
    KC.EventBus.emit('ml:filter:initialized', {
      timestamp: Date.now(),
      capabilities: ['confidence-range', 'status-filter', 'iteration-count']
    });
    
    console.log('[MLFilter] Extensions initialized successfully');
  }
  
  /**
   * Extend the existing FilterPanel UI with ML controls
   */
  extendFilterPanelUI() {
    if (!this.filterPanel.container) {
      console.error('[MLFilter] FilterPanel container not found');
      return;
    }
    
    // Create ML filter section
    const mlSection = document.createElement('div');
    mlSection.className = 'filter-section ml-filter-section';
    mlSection.innerHTML = `
      <div class="filter-section-header">
        <h4 class="filter-section-title">
          <span class="section-icon">🤖</span>
          ML Confidence Filters
        </h4>
        <button class="ml-filter-toggle" 
                type="button" 
                aria-label="Toggle ML filters"
                data-ml-filter="toggle">
          <span class="toggle-icon">▼</span>
        </button>
      </div>
      
      <div class="ml-filter-content" data-ml-content="main">
        <!-- Confidence Range Filter -->
        <div class="ml-filter-group" data-ml-filter="confidence">
          <label class="ml-filter-label">
            <input type="checkbox" class="ml-filter-checkbox" data-ml-checkbox="confidence">
            <span class="ml-filter-title">Confidence Range</span>
            <span class="ml-filter-description">Filter by ML confidence score</span>
          </label>
          
          <div class="ml-range-container" data-ml-range="confidence">
            <div class="ml-range-inputs">
              <input type="range" 
                     class="ml-range-slider" 
                     data-ml-slider="confidence-min"
                     min="0" max="100" value="0" step="5">
              <input type="range" 
                     class="ml-range-slider" 
                     data-ml-slider="confidence-max"
                     min="0" max="100" value="100" step="5">
            </div>
            <div class="ml-range-values">
              <span data-ml-value="confidence-min">0%</span>
              <span class="range-separator">–</span>
              <span data-ml-value="confidence-max">100%</span>
            </div>
          </div>
        </div>
        
        <!-- Status Filter -->
        <div class="ml-filter-group" data-ml-filter="status">
          <label class="ml-filter-label">
            <input type="checkbox" class="ml-filter-checkbox" data-ml-checkbox="status">
            <span class="ml-filter-title">ML Status</span>
            <span class="ml-filter-description">Filter by convergence status</span>
          </label>
          
          <div class="ml-status-options" data-ml-options="status">
            <label class="ml-status-option">
              <input type="checkbox" value="converged" checked data-ml-status="converged">
              <span class="status-badge converged">✅ Converged</span>
            </label>
            <label class="ml-status-option">
              <input type="checkbox" value="improving" checked data-ml-status="improving">
              <span class="status-badge improving">📈 Improving</span>
            </label>
            <label class="ml-status-option">
              <input type="checkbox" value="stagnant" checked data-ml-status="stagnant">
              <span class="status-badge stagnant">⏸️ Stagnant</span>
            </label>
            <label class="ml-status-option">
              <input type="checkbox" value="needs-work" checked data-ml-status="needs-work">
              <span class="status-badge needs-work">🔴 Needs Work</span>
            </label>
          </div>
        </div>
        
        <!-- Iteration Count Filter -->
        <div class="ml-filter-group" data-ml-filter="iterations">
          <label class="ml-filter-label">
            <input type="checkbox" class="ml-filter-checkbox" data-ml-checkbox="iterations">
            <span class="ml-filter-title">Iteration Count</span>
            <span class="ml-filter-description">Filter by optimization iterations</span>
          </label>
          
          <div class="ml-iteration-container" data-ml-range="iterations">
            <div class="ml-iteration-inputs">
              <label>
                Min: <input type="number" min="1" max="50" value="1" 
                           class="ml-iteration-input" data-ml-iteration="min">
              </label>
              <label>
                Max: <input type="number" min="1" max="50" value="10" 
                           class="ml-iteration-input" data-ml-iteration="max">
              </label>
            </div>
          </div>
        </div>
        
        <!-- ML Insights Panel -->
        <div class="ml-insights-panel" data-ml-insights="main">
          <div class="ml-confidence-distribution" data-ml-chart="confidence"></div>
          <div class="ml-status-overview" data-ml-status="overview"></div>
          <div class="ml-performance-metrics" data-ml-metrics="performance">
            <small class="performance-text">Last filter: <span data-ml-perf="time">-</span>ms</small>
          </div>
        </div>
      </div>
    `;
    
    // Insert ML section after existing filters
    const existingFilters = this.filterPanel.container.querySelector('.filter-controls');
    if (existingFilters) {
      existingFilters.appendChild(mlSection);
    } else {
      this.filterPanel.container.appendChild(mlSection);
    }
    
    // Initialize visual state
    this.updateMLVisualIndicators();
  }
  
  /**
   * Setup event listeners for ML filters
   */
  setupEventListeners() {
    const container = this.filterPanel.container;
    if (!container) return;
    
    // Toggle ML filter section
    const toggleBtn = container.querySelector('[data-ml-filter="toggle"]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleMLFilterSection();
      });
    }
    
    // Confidence range sliders
    const confidenceSliders = container.querySelectorAll('[data-ml-slider^="confidence"]');
    confidenceSliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        this.handleConfidenceRangeChange(e);
      });
    });
    
    // Status checkboxes
    const statusCheckboxes = container.querySelectorAll('[data-ml-status]');
    statusCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.handleStatusFilterChange(e);
      });
    });
    
    // Iteration inputs
    const iterationInputs = container.querySelectorAll('[data-ml-iteration]');
    iterationInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleIterationRangeChange(e);
      });
    });
    
    // Filter enable/disable checkboxes
    const filterCheckboxes = container.querySelectorAll('[data-ml-checkbox]');
    filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.handleFilterToggle(e);
      });
    });
    
    // Listen for file updates to refresh visual indicators
    KC.EventBus.on('files:updated', () => {
      this.updateMLVisualIndicators();
    });
    
    KC.EventBus.on('ml:confidence:updated', () => {
      this.updateMLVisualIndicators();
    });
  }
  
  /**
   * Toggle ML filter section visibility
   */
  toggleMLFilterSection() {
    const content = this.filterPanel.container.querySelector('[data-ml-content="main"]');
    const toggleIcon = this.filterPanel.container.querySelector('.toggle-icon');
    
    if (content) {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      
      if (toggleIcon) {
        toggleIcon.textContent = isVisible ? '▶' : '▼';
      }
      
      // Save preference
      localStorage.setItem('kc_ml_filters_visible', !isVisible);
    }
  }
  
  /**
   * Handle confidence range changes
   */
  handleConfidenceRangeChange(event) {
    const isMin = event.target.dataset.mlSlider === 'confidence-min';
    const value = parseInt(event.target.value);
    
    if (isMin) {
      this.mlFilters.confidence.range[0] = value;
      // Ensure min <= max
      if (value > this.mlFilters.confidence.range[1]) {
        this.mlFilters.confidence.range[1] = value;
        const maxSlider = this.filterPanel.container.querySelector('[data-ml-slider="confidence-max"]');
        if (maxSlider) maxSlider.value = value;
      }
    } else {
      this.mlFilters.confidence.range[1] = value;
      // Ensure max >= min
      if (value < this.mlFilters.confidence.range[0]) {
        this.mlFilters.confidence.range[0] = value;
        const minSlider = this.filterPanel.container.querySelector('[data-ml-slider="confidence-min"]');
        if (minSlider) minSlider.value = value;
      }
    }
    
    // Update value displays
    this.updateRangeValues();
    
    // Apply filter if enabled
    if (this.mlFilters.confidence.enabled) {
      this.applyMLFilters();
    }
  }
  
  /**
   * Handle status filter changes
   */
  handleStatusFilterChange(event) {
    const status = event.target.value;
    const isChecked = event.target.checked;
    
    if (isChecked) {
      if (!this.mlFilters.status.selected.includes(status)) {
        this.mlFilters.status.selected.push(status);
      }
    } else {
      this.mlFilters.status.selected = this.mlFilters.status.selected.filter(s => s !== status);
    }
    
    // Apply filter if enabled
    if (this.mlFilters.status.enabled) {
      this.applyMLFilters();
    }
  }
  
  /**
   * Handle iteration range changes
   */
  handleIterationRangeChange(event) {
    const isMin = event.target.dataset.mlIteration === 'min';
    const value = parseInt(event.target.value);
    
    if (isMin) {
      this.mlFilters.iterations.range.min = Math.max(1, value);
    } else {
      this.mlFilters.iterations.range.max = Math.max(1, value);
    }
    
    // Ensure min <= max
    if (this.mlFilters.iterations.range.min > this.mlFilters.iterations.range.max) {
      if (isMin) {
        this.mlFilters.iterations.range.max = this.mlFilters.iterations.range.min;
        const maxInput = this.filterPanel.container.querySelector('[data-ml-iteration="max"]');
        if (maxInput) maxInput.value = this.mlFilters.iterations.range.max;
      } else {
        this.mlFilters.iterations.range.min = this.mlFilters.iterations.range.max;
        const minInput = this.filterPanel.container.querySelector('[data-ml-iteration="min"]');
        if (minInput) minInput.value = this.mlFilters.iterations.range.min;
      }
    }
    
    // Apply filter if enabled
    if (this.mlFilters.iterations.enabled) {
      this.applyMLFilters();
    }
  }
  
  /**
   * Handle filter toggle
   */
  handleFilterToggle(event) {
    const filterType = event.target.dataset.mlCheckbox;
    const isEnabled = event.target.checked;
    
    this.mlFilters[filterType].enabled = isEnabled;
    
    // Show/hide filter controls
    const filterGroup = this.filterPanel.container.querySelector(`[data-ml-filter="${filterType}"]`);
    if (filterGroup) {
      const controls = filterGroup.querySelectorAll('[data-ml-range], [data-ml-options]');
      controls.forEach(control => {
        control.style.opacity = isEnabled ? '1' : '0.5';
        control.style.pointerEvents = isEnabled ? 'auto' : 'none';
      });
    }
    
    // Apply or clear filter
    this.applyMLFilters();
  }
  
  /**
   * Update range value displays
   */
  updateRangeValues() {
    const minDisplay = this.filterPanel.container.querySelector('[data-ml-value="confidence-min"]');
    const maxDisplay = this.filterPanel.container.querySelector('[data-ml-value="confidence-max"]');
    
    if (minDisplay) minDisplay.textContent = `${this.mlFilters.confidence.range[0]}%`;
    if (maxDisplay) maxDisplay.textContent = `${this.mlFilters.confidence.range[1]}%`;
  }
  
  /**
   * Apply ML filters to file list
   */
  async applyMLFilters() {
    const startTime = performance.now();
    
    // Get current files from FilterPanel or AppState
    const allFiles = KC.AppState.get('files') || [];
    
    // Create filter configuration
    const filterConfig = this.buildFilterConfig();
    
    try {
      // Apply ML-specific filters
      const mlFiltered = await this.optimizer.applyFilters(allFiles, filterConfig);
      
      // Combine with existing filters if any
      const finalFiltered = this.combineWithExistingFilters(mlFiltered);
      
      // Update performance metrics
      const filterTime = performance.now() - startTime;
      this.updatePerformanceMetrics(filterTime);
      
      // Update UI
      this.updateFilteredResults(finalFiltered);
      this.updateMLVisualIndicators(finalFiltered);
      
      // Emit filter event
      KC.EventBus.emit('ml:filter:applied', {
        filterConfig,
        resultCount: finalFiltered.length,
        filterTime,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('[MLFilter] Filter application failed:', error);
      
      // Fallback to showing all files
      KC.EventBus.emit('ml:filter:error', {
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Build filter configuration object
   */
  buildFilterConfig() {
    const config = {};
    
    // Confidence range
    if (this.mlFilters.confidence.enabled) {
      config.confidenceRange = this.mlFilters.confidence.range;
    }
    
    // Status filter
    if (this.mlFilters.status.enabled && this.mlFilters.status.selected.length > 0) {
      config.statusFilter = this.mlFilters.status.selected;
    }
    
    // Iteration range
    if (this.mlFilters.iterations.enabled) {
      config.iterationRange = this.mlFilters.iterations.range;
    }
    
    return config;
  }
  
  /**
   * Combine ML filters with existing FilterPanel filters
   */
  combineWithExistingFilters(mlFiltered) {
    // If FilterPanel has active filters, apply them to ML results
    if (this.filterPanel.filterManager && typeof this.filterPanel.filterManager.applyFilters === 'function') {
      return this.filterPanel.filterManager.applyFilters(mlFiltered);
    }
    
    return mlFiltered;
  }
  
  /**
   * Update filtered results in UI
   */
  updateFilteredResults(filteredFiles) {
    // Update FileRenderer if available
    if (this.filterPanel.fileRenderer && typeof this.filterPanel.fileRenderer.updateFilteredFiles === 'function') {
      this.filterPanel.fileRenderer.updateFilteredFiles(filteredFiles);
    }
    
    // Update counters
    this.updateFilterCounters(filteredFiles);
  }
  
  /**
   * Update filter counters
   */
  updateFilterCounters(filteredFiles) {
    // Update existing filter panel counters
    if (this.filterPanel.updateCounters && typeof this.filterPanel.updateCounters === 'function') {
      this.filterPanel.updateCounters(filteredFiles);
    }
    
    // Update ML-specific counters
    const mlStats = this.calculateMLStats(filteredFiles);
    this.displayMLStats(mlStats);
  }
  
  /**
   * Calculate ML statistics
   */
  calculateMLStats(files) {
    const stats = {
      total: files.length,
      withML: 0,
      convergenceDistribution: {
        converged: 0,
        improving: 0,
        stagnant: 0,
        'needs-work': 0,
        unprocessed: 0
      },
      averageConfidence: 0,
      confidenceDistribution: [0, 0, 0, 0] // uncertain, low, medium, high
    };
    
    let totalConfidence = 0;
    
    files.forEach(file => {
      if (file.mlConfidence) {
        stats.withML++;
        
        const confidence = file.mlConfidence.overall;
        totalConfidence += confidence;
        
        // Status distribution
        const status = this.optimizer.getMLStatus(file);
        stats.convergenceDistribution[status]++;
        
        // Confidence distribution
        if (confidence >= 0.85) stats.confidenceDistribution[3]++;
        else if (confidence >= 0.70) stats.confidenceDistribution[2]++;
        else if (confidence >= 0.50) stats.confidenceDistribution[1]++;
        else stats.confidenceDistribution[0]++;
      } else {
        stats.convergenceDistribution.unprocessed++;
      }
    });
    
    stats.averageConfidence = stats.withML > 0 ? totalConfidence / stats.withML : 0;
    
    return stats;
  }
  
  /**
   * Display ML statistics
   */
  displayMLStats(stats) {
    // Update charts and indicators
    const chartContainer = this.filterPanel.container.querySelector('[data-ml-chart="confidence"]');
    if (chartContainer) {
      chartContainer.innerHTML = '';
      this.visualIndicators.createConfidenceChart(chartContainer, KC.AppState.get('files') || []);
    }
    
    const statusContainer = this.filterPanel.container.querySelector('[data-ml-status="overview"]');
    if (statusContainer) {
      statusContainer.innerHTML = '';
      this.visualIndicators.createStatusIndicators(statusContainer, KC.AppState.get('files') || []);
    }
  }
  
  /**
   * Update ML visual indicators
   */
  updateMLVisualIndicators(files = null) {
    const targetFiles = files || KC.AppState.get('files') || [];
    
    if (targetFiles.length === 0) return;
    
    // Update charts with animation
    const chartContainer = this.filterPanel.container?.querySelector('[data-ml-chart="confidence"]');
    if (chartContainer) {
      // Animate update
      this.visualIndicators.animateFilterChange(chartContainer, 0, 1);
      
      setTimeout(() => {
        chartContainer.innerHTML = '';
        this.visualIndicators.createConfidenceChart(chartContainer, targetFiles);
      }, 150);
    }
    
    const statusContainer = this.filterPanel.container?.querySelector('[data-ml-status="overview"]');
    if (statusContainer) {
      // Animate update
      this.visualIndicators.animateFilterChange(statusContainer, 0, 1);
      
      setTimeout(() => {
        statusContainer.innerHTML = '';
        this.visualIndicators.createStatusIndicators(statusContainer, targetFiles);
      }, 150);
    }
  }
  
  /**
   * Update performance metrics display
   */
  updatePerformanceMetrics(filterTime) {
    this.performanceMetrics.lastFilterTime = filterTime;
    this.performanceMetrics.filterCount++;
    
    // Calculate running average
    this.performanceMetrics.averageFilterTime = 
      (this.performanceMetrics.averageFilterTime * (this.performanceMetrics.filterCount - 1) + filterTime) / 
      this.performanceMetrics.filterCount;
    
    // Update display
    const perfDisplay = this.filterPanel.container?.querySelector('[data-ml-perf="time"]');
    if (perfDisplay) {
      perfDisplay.textContent = Math.round(filterTime);
      
      // Color code based on performance
      perfDisplay.className = filterTime < 100 ? 'perf-good' : 
                            filterTime < 300 ? 'perf-ok' : 'perf-slow';
    }
  }
  
  /**
   * Reset ML filters to default state
   */
  resetMLFilters() {
    // Reset filter state
    this.mlFilters.confidence.enabled = false;
    this.mlFilters.confidence.range = [...this.mlFilters.confidence.default];
    
    this.mlFilters.status.enabled = false;
    this.mlFilters.status.selected = [...this.mlFilters.status.options.slice(0, 4)]; // All except unprocessed
    
    this.mlFilters.iterations.enabled = false;
    this.mlFilters.iterations.range = { ...this.mlFilters.iterations.default };
    
    // Reset UI
    this.resetMLFilterUI();
    
    // Apply reset (clears filters)
    this.applyMLFilters();
    
    // Emit reset event
    KC.EventBus.emit('ml:filter:reset', {
      timestamp: Date.now()
    });
  }
  
  /**
   * Reset ML filter UI to default state
   */
  resetMLFilterUI() {
    const container = this.filterPanel.container;
    if (!container) return;
    
    // Reset checkboxes
    container.querySelectorAll('[data-ml-checkbox]').forEach(cb => {
      cb.checked = false;
    });
    
    // Reset sliders
    const minSlider = container.querySelector('[data-ml-slider="confidence-min"]');
    const maxSlider = container.querySelector('[data-ml-slider="confidence-max"]');
    if (minSlider) minSlider.value = 0;
    if (maxSlider) maxSlider.value = 100;
    
    // Reset status checkboxes
    container.querySelectorAll('[data-ml-status]').forEach(cb => {
      cb.checked = cb.value !== 'unprocessed';
    });
    
    // Reset iteration inputs
    const minIteration = container.querySelector('[data-ml-iteration="min"]');
    const maxIteration = container.querySelector('[data-ml-iteration="max"]');
    if (minIteration) minIteration.value = 1;
    if (maxIteration) maxIteration.value = 10;
    
    // Update displays
    this.updateRangeValues();
    
    // Reset visual states
    container.querySelectorAll('[data-ml-range], [data-ml-options]').forEach(control => {
      control.style.opacity = '0.5';
      control.style.pointerEvents = 'none';
    });
  }
  
  /**
   * Inject ML-specific CSS styles
   */
  injectMLStyles() {
    if (document.getElementById('ml-filter-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'ml-filter-styles';
    
    styleSheet.textContent = `
      /* ML Filter Section */
      .ml-filter-section {
        margin-top: 16px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      
      .filter-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        cursor: pointer;
      }
      
      .filter-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }
      
      .section-icon {
        font-size: 16px;
      }
      
      .ml-filter-toggle {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: #6b7280;
        transition: color 0.2s ease;
      }
      
      .ml-filter-toggle:hover {
        color: #374151;
      }
      
      .toggle-icon {
        font-size: 12px;
        transition: transform 0.2s ease;
      }
      
      /* ML Filter Groups */
      .ml-filter-group {
        margin-bottom: 16px;
        padding: 12px;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }
      
      .ml-filter-label {
        display: block;
        margin-bottom: 8px;
        cursor: pointer;
      }
      
      .ml-filter-checkbox {
        margin-right: 8px;
      }
      
      .ml-filter-title {
        font-weight: 500;
        color: #374151;
        font-size: 13px;
      }
      
      .ml-filter-description {
        display: block;
        font-size: 11px;
        color: #6b7280;
        margin-top: 2px;
      }
      
      /* Confidence Range Controls */
      .ml-range-container {
        opacity: 0.5;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      
      .ml-range-inputs {
        position: relative;
        margin-bottom: 8px;
      }
      
      .ml-range-slider {
        width: 100%;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        outline: none;
        -webkit-appearance: none;
        position: absolute;
        top: 0;
      }
      
      .ml-range-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #3b82f6;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .ml-range-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #3b82f6;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .ml-range-values {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #6b7280;
        margin-top: 20px;
      }
      
      .range-separator {
        color: #9ca3af;
      }
      
      /* Status Options */
      .ml-status-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        opacity: 0.5;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      
      .ml-status-option {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .status-badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
      }
      
      .status-badge.converged {
        background: #d1fae5;
        color: #065f46;
      }
      
      .status-badge.improving {
        background: #fef3c7;
        color: #78350f;
      }
      
      .status-badge.stagnant {
        background: #f3f4f6;
        color: #374151;
      }
      
      .status-badge.needs-work {
        background: #fee2e2;
        color: #7f1d1d;
      }
      
      /* Iteration Controls */
      .ml-iteration-container {
        opacity: 0.5;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      
      .ml-iteration-inputs {
        display: flex;
        gap: 12px;
      }
      
      .ml-iteration-input {
        width: 60px;
        padding: 4px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
      }
      
      /* ML Insights Panel */
      .ml-insights-panel {
        margin-top: 16px;
        padding: 12px;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }
      
      .ml-confidence-chart {
        width: 100%;
        height: 80px;
        margin-bottom: 12px;
      }
      
      .ml-status-indicators {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 8px;
      }
      
      .ml-status-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        font-size: 10px;
      }
      
      .status-icon {
        font-size: 12px;
      }
      
      .status-count {
        font-weight: 600;
        color: #374151;
      }
      
      /* Performance Metrics */
      .ml-performance-metrics {
        text-align: center;
        padding-top: 8px;
        border-top: 1px solid #e5e7eb;
      }
      
      .performance-text {
        color: #6b7280;
        font-size: 10px;
      }
      
      .perf-good { color: #059669; }
      .perf-ok { color: #d97706; }
      .perf-slow { color: #dc2626; }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .ml-filter-section {
          padding: 12px;
        }
        
        .ml-status-options {
          grid-template-columns: 1fr;
        }
        
        .ml-iteration-inputs {
          flex-direction: column;
          gap: 8px;
        }
        
        .ml-status-indicators {
          justify-content: center;
        }
      }
      
      /* Dark Theme Support */
      [data-theme="dark"] .ml-filter-section {
        background: #1f2937;
        border-color: #374151;
      }
      
      [data-theme="dark"] .ml-filter-group {
        background: #111827;
        border-color: #374151;
      }
      
      [data-theme="dark"] .filter-section-title {
        color: #f9fafb;
      }
      
      [data-theme="dark"] .ml-filter-title {
        color: #f3f4f6;
      }
      
      [data-theme="dark"] .ml-filter-description {
        color: #9ca3af;
      }
      
      /* Reduced Motion */
      @media (prefers-reduced-motion: reduce) {
        .ml-range-container,
        .ml-status-options,
        .ml-iteration-container {
          transition: none;
        }
        
        .toggle-icon {
          transition: none;
        }
      }
    `;
    
    document.head.appendChild(styleSheet);
  }
  
  /**
   * Get current ML filter state
   */
  getFilterState() {
    return {
      ...this.mlFilters,
      performance: { ...this.performanceMetrics }
    };
  }
  
  /**
   * Set ML filter state
   */
  setFilterState(state) {
    if (state.confidence) {
      this.mlFilters.confidence = { ...this.mlFilters.confidence, ...state.confidence };
    }
    
    if (state.status) {
      this.mlFilters.status = { ...this.mlFilters.status, ...state.status };
    }
    
    if (state.iterations) {
      this.mlFilters.iterations = { ...this.mlFilters.iterations, ...state.iterations };
    }
    
    // Update UI to match state
    this.syncUIWithState();
    
    // Apply filters
    this.applyMLFilters();
  }
  
  /**
   * Sync UI with current filter state
   */
  syncUIWithState() {
    const container = this.filterPanel.container;
    if (!container) return;
    
    // Sync confidence filter
    const confCheckbox = container.querySelector('[data-ml-checkbox="confidence"]');
    if (confCheckbox) confCheckbox.checked = this.mlFilters.confidence.enabled;
    
    const minSlider = container.querySelector('[data-ml-slider="confidence-min"]');
    const maxSlider = container.querySelector('[data-ml-slider="confidence-max"]');
    if (minSlider) minSlider.value = this.mlFilters.confidence.range[0];
    if (maxSlider) maxSlider.value = this.mlFilters.confidence.range[1];
    
    // Sync status filter
    const statusCheckbox = container.querySelector('[data-ml-checkbox="status"]');
    if (statusCheckbox) statusCheckbox.checked = this.mlFilters.status.enabled;
    
    container.querySelectorAll('[data-ml-status]').forEach(cb => {
      cb.checked = this.mlFilters.status.selected.includes(cb.value);
    });
    
    // Sync iterations filter
    const iterCheckbox = container.querySelector('[data-ml-checkbox="iterations"]');
    if (iterCheckbox) iterCheckbox.checked = this.mlFilters.iterations.enabled;
    
    const minIter = container.querySelector('[data-ml-iteration="min"]');
    const maxIter = container.querySelector('[data-ml-iteration="max"]');
    if (minIter) minIter.value = this.mlFilters.iterations.range.min;
    if (maxIter) maxIter.value = this.mlFilters.iterations.range.max;
    
    // Update displays
    this.updateRangeValues();
    
    // Update control states
    Object.keys(this.mlFilters).forEach(filterType => {
      const filterGroup = container.querySelector(`[data-ml-filter="${filterType}"]`);
      if (filterGroup) {
        const controls = filterGroup.querySelectorAll('[data-ml-range], [data-ml-options]');
        const isEnabled = this.mlFilters[filterType].enabled;
        
        controls.forEach(control => {
          control.style.opacity = isEnabled ? '1' : '0.5';
          control.style.pointerEvents = isEnabled ? 'auto' : 'none';
        });
      }
    });
  }
  
  /**
   * Cleanup and destroy ML extensions
   */
  destroy() {
    // Cleanup optimizer
    if (this.optimizer) {
      this.optimizer.destroy();
    }
    
    // Cancel animation frames
    if (this.visualIndicators && this.visualIndicators.animationFrames) {
      this.visualIndicators.animationFrames.forEach(frameId => {
        cancelAnimationFrame(frameId);
      });
    }
    
    // Remove ML filter UI
    const mlSection = this.filterPanel.container?.querySelector('.ml-filter-section');
    if (mlSection) {
      mlSection.remove();
    }
    
    // Remove styles
    const styles = document.getElementById('ml-filter-styles');
    if (styles) {
      styles.remove();
    }
    
    // Remove event listeners (they'll be removed with DOM elements)
    
    this.isInitialized = false;
    
    console.log('[MLFilter] Extensions destroyed');
  }
}

// ============================================================================
// STATIC EXTENSION METHOD
// ============================================================================

/**
 * Static method to extend an existing FilterPanel instance with ML capabilities
 * This allows for non-destructive extension of existing FilterPanel instances
 */
FilterPanelML.extend = function(filterPanelInstance) {
  if (!filterPanelInstance) {
    console.error('[MLFilter] Invalid FilterPanel instance provided');
    return null;
  }
  
  // Create ML extension
  const mlExtension = new FilterPanelML(filterPanelInstance);
  
  // Initialize
  mlExtension.initialize();
  
  // Add ML methods to FilterPanel instance
  filterPanelInstance.mlExtension = mlExtension;
  
  // Add convenience methods
  filterPanelInstance.enableMLFilters = () => mlExtension.initialize();
  filterPanelInstance.disableMLFilters = () => mlExtension.destroy();
  filterPanelInstance.resetMLFilters = () => mlExtension.resetMLFilters();
  filterPanelInstance.getMLFilterState = () => mlExtension.getFilterState();
  filterPanelInstance.setMLFilterState = (state) => mlExtension.setFilterState(state);
  
  // Emit extension event
  KC.EventBus.emit('ml:filter:extended', {
    filterPanel: filterPanelInstance,
    mlExtension: mlExtension,
    timestamp: Date.now()
  });
  
  console.log('[MLFilter] FilterPanel extended with ML capabilities');
  
  return mlExtension;
};

// ============================================================================
// INTEGRATION WITH KC ARCHITECTURE
// ============================================================================

/**
 * Register ML Filter extensions with KC system
 */
const registerMLFilterExtensions = () => {
  // Register with KC if available
  if (window.KC) {
    KC.ML = KC.ML || {};
    KC.ML.FilterExtensions = FilterPanelML;
    KC.ML.FilterPerformanceOptimizer = MLFilterPerformanceOptimizer;
    KC.ML.FilterVisualIndicators = MLFilterVisualIndicators;
    
    // Add global extension method
    KC.ML.extendFilterPanel = FilterPanelML.extend;
    
    console.log('[MLFilter] Extensions registered with KC system');
  }
  
  // Auto-extend existing FilterPanel if found
  if (window.KC && KC.FilterPanel) {
    // Check if FilterPanel instance exists
    const existingPanel = KC.FilterPanel.instance || KC.FilterPanel;
    if (existingPanel && typeof existingPanel.container !== 'undefined') {
      FilterPanelML.extend(existingPanel);
    }
  }
};

// ============================================================================
// INITIALIZATION AND EXPORTS
// ============================================================================

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerMLFilterExtensions);
} else {
  registerMLFilterExtensions();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FilterPanelML,
    MLFilterPerformanceOptimizer,
    MLFilterVisualIndicators,
    registerMLFilterExtensions
  };
}

// Export for global usage
window.FilterPanelML = FilterPanelML;

console.log('[MLFilter] Iteration 004 - Filter Extensions loaded successfully');