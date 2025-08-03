/**
 * ViewStateManager.js - State persistence and management for KC V2 views
 * 
 * Handles saving and restoring view states, managing transitions,
 * and optimizing memory usage across all views
 * 
 * Features:
 * - Automatic state persistence to localStorage
 * - Efficient state compression
 * - View transition management
 * - Memory optimization with LRU cache
 * - State versioning and migration
 * - Undo/redo functionality
 * - Performance monitoring
 */

import eventBus, { Events } from '../core/EventBus.js';

export class ViewStateManager {
  constructor() {
    // Storage configuration
    this.storageKey = 'kcv2_view_states';
    this.maxStateSize = 2 * 1024 * 1024; // 2MB per view
    this.maxHistorySize = 20; // Undo/redo history
    
    // State storage
    this.states = new Map();
    this.history = new Map(); // Per-view history
    this.currentHistoryIndex = new Map();
    
    // Active view tracking
    this.activeView = null;
    this.previousView = null;
    
    // Performance monitoring
    this.performanceMetrics = {
      saveCount: 0,
      loadCount: 0,
      totalSaveTime: 0,
      totalLoadTime: 0,
      compressionRatio: 0
    };
    
    // State versioning
    this.version = '1.0';
    this.migrations = new Map([
      ['0.9', this.migrateFrom09],
      ['1.0', null] // Current version
    ]);
    
    // Debounce timers
    this.saveTimers = new Map();
    this.saveDelay = 500; // ms
    
    // Memory management
    this.memoryLimit = 10 * 1024 * 1024; // 10MB total
    this.lruCache = new Map(); // Least recently used cache
    
    // View state schemas
    this.schemas = {
      discovery: {
        selectedFiles: 'array',
        currentFilter: 'string',
        currentSort: 'string',
        searchQuery: 'string',
        viewMode: 'string',
        pagination: 'object',
        scrollPosition: 'number'
      },
      analysis: {
        queue: 'array',
        config: 'object',
        terminalLines: 'array',
        progress: 'object',
        activeProvider: 'string'
      },
      organization: {
        selectedFiles: 'array',
        viewMode: 'string',
        activeCategory: 'string',
        exportConfig: 'object',
        scrollPosition: 'number'
      },
      settings: {
        activeSection: 'string',
        unsavedChanges: 'object',
        scrollPositions: 'object'
      }
    };
    
    // Initialize
    this.loadAllStates();
    this.setupEventListeners();
    
    console.log('[ViewStateManager] Initialized');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for view changes
    eventBus.on('view_changed', ({ view }) => {
      this.onViewChanged(view);
    });
    
    // Listen for state updates
    eventBus.on('view_state_update', ({ view, state }) => {
      this.saveState(view, state);
    });
    
    // Listen for memory pressure
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      this.monitorStorage();
    }
    
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveAllStates();
    });
    
    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Monitor storage quota
   */
  async monitorStorage() {
    try {
      const estimate = await navigator.storage.estimate();
      const percentUsed = (estimate.usage / estimate.quota) * 100;
      
      if (percentUsed > 90) {
        console.warn('[ViewStateManager] Storage usage high:', percentUsed.toFixed(2) + '%');
        this.performEmergencyCleanup();
      }
    } catch (error) {
      console.error('[ViewStateManager] Storage monitoring failed:', error);
    }
  }

  /**
   * Save view state with debouncing
   */
  saveState(viewName, state, immediate = false) {
    if (!viewName || !state) return;
    
    // Validate against schema
    if (!this.validateState(viewName, state)) {
      console.warn('[ViewStateManager] Invalid state for view:', viewName);
      return;
    }
    
    // Clear existing timer
    if (this.saveTimers.has(viewName)) {
      clearTimeout(this.saveTimers.get(viewName));
    }
    
    if (immediate) {
      this.performSave(viewName, state);
    } else {
      // Debounce save
      const timer = setTimeout(() => {
        this.performSave(viewName, state);
        this.saveTimers.delete(viewName);
      }, this.saveDelay);
      
      this.saveTimers.set(viewName, timer);
    }
  }

  /**
   * Perform actual save operation
   */
  performSave(viewName, state) {
    const startTime = performance.now();
    
    try {
      // Clone state to avoid mutations
      const stateCopy = this.cloneState(state);
      
      // Add to history for undo/redo
      this.addToHistory(viewName, stateCopy);
      
      // Compress state
      const compressed = this.compressState(stateCopy);
      
      // Check size
      if (compressed.size > this.maxStateSize) {
        console.warn(`[ViewStateManager] State too large for ${viewName}: ${this.formatBytes(compressed.size)}`);
        compressed.data = this.reduceStateSize(stateCopy);
      }
      
      // Store in memory
      this.states.set(viewName, compressed);
      
      // Update LRU cache
      this.updateLRU(viewName);
      
      // Persist to storage
      this.persistToStorage();
      
      // Update metrics
      const endTime = performance.now();
      this.performanceMetrics.saveCount++;
      this.performanceMetrics.totalSaveTime += (endTime - startTime);
      
      // Emit saved event
      eventBus.emit('view_state_saved', { view: viewName });
      
    } catch (error) {
      console.error(`[ViewStateManager] Failed to save state for ${viewName}:`, error);
    }
  }

  /**
   * Load view state
   */
  loadState(viewName) {
    const startTime = performance.now();
    
    try {
      // Check memory cache first
      if (this.states.has(viewName)) {
        const compressed = this.states.get(viewName);
        const state = this.decompressState(compressed);
        
        // Update LRU
        this.updateLRU(viewName);
        
        // Update metrics
        const endTime = performance.now();
        this.performanceMetrics.loadCount++;
        this.performanceMetrics.totalLoadTime += (endTime - startTime);
        
        return state;
      }
      
      // Load from storage if not in memory
      const stored = this.loadFromStorage();
      if (stored && stored[viewName]) {
        const state = this.decompressState(stored[viewName]);
        
        // Cache in memory
        this.states.set(viewName, stored[viewName]);
        
        return state;
      }
      
      return null;
      
    } catch (error) {
      console.error(`[ViewStateManager] Failed to load state for ${viewName}:`, error);
      return null;
    }
  }

  /**
   * Save all states to storage
   */
  saveAllStates() {
    // Clear all pending saves
    this.saveTimers.forEach(timer => clearTimeout(timer));
    this.saveTimers.clear();
    
    // Save immediately
    this.persistToStorage();
  }

  /**
   * Load all states from storage
   */
  loadAllStates() {
    try {
      const stored = this.loadFromStorage();
      if (!stored) return;
      
      // Load into memory
      Object.entries(stored).forEach(([viewName, compressed]) => {
        this.states.set(viewName, compressed);
      });
      
      console.log('[ViewStateManager] Loaded states for:', Array.from(this.states.keys()));
      
    } catch (error) {
      console.error('[ViewStateManager] Failed to load states:', error);
    }
  }

  /**
   * Persist states to localStorage
   */
  persistToStorage() {
    try {
      const toStore = {};
      
      // Convert Map to object
      this.states.forEach((compressed, viewName) => {
        toStore[viewName] = compressed;
      });
      
      // Add metadata
      const data = {
        version: this.version,
        timestamp: Date.now(),
        states: toStore
      };
      
      // Serialize and store
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.storageKey, serialized);
      
      // Update compression ratio metric
      const originalSize = JSON.stringify(toStore).length;
      this.performanceMetrics.compressionRatio = originalSize / serialized.length;
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[ViewStateManager] Storage quota exceeded, performing cleanup');
        this.performEmergencyCleanup();
        
        // Retry after cleanup
        try {
          this.persistToStorage();
        } catch (retryError) {
          console.error('[ViewStateManager] Failed to persist after cleanup:', retryError);
        }
      } else {
        console.error('[ViewStateManager] Failed to persist states:', error);
      }
    }
  }

  /**
   * Load states from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // Check version and migrate if needed
      if (data.version !== this.version) {
        return this.migrateStates(data);
      }
      
      return data.states;
      
    } catch (error) {
      console.error('[ViewStateManager] Failed to load from storage:', error);
      return null;
    }
  }

  /**
   * Handle view change
   */
  onViewChanged(newView) {
    // Save current view state before switching
    if (this.activeView && this.activeView !== newView) {
      this.saveState(this.activeView, this.captureCurrentState(this.activeView), true);
    }
    
    this.previousView = this.activeView;
    this.activeView = newView;
    
    // Emit transition event
    eventBus.emit('view_transition', {
      from: this.previousView,
      to: this.activeView
    });
  }

  /**
   * Capture current state from active view
   */
  captureCurrentState(viewName) {
    // This would be implemented by each view
    // For now, return empty state
    return {};
  }

  // === HISTORY MANAGEMENT ===

  /**
   * Add state to history for undo/redo
   */
  addToHistory(viewName, state) {
    if (!this.history.has(viewName)) {
      this.history.set(viewName, []);
      this.currentHistoryIndex.set(viewName, -1);
    }
    
    const history = this.history.get(viewName);
    const currentIndex = this.currentHistoryIndex.get(viewName);
    
    // Remove any states after current index (for new branch)
    history.splice(currentIndex + 1);
    
    // Add new state
    history.push({
      timestamp: Date.now(),
      state: this.cloneState(state)
    });
    
    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    } else {
      this.currentHistoryIndex.set(viewName, history.length - 1);
    }
  }

  /**
   * Undo to previous state
   */
  undo(viewName) {
    const history = this.history.get(viewName);
    const currentIndex = this.currentHistoryIndex.get(viewName);
    
    if (!history || currentIndex <= 0) return null;
    
    const newIndex = currentIndex - 1;
    this.currentHistoryIndex.set(viewName, newIndex);
    
    return this.cloneState(history[newIndex].state);
  }

  /**
   * Redo to next state
   */
  redo(viewName) {
    const history = this.history.get(viewName);
    const currentIndex = this.currentHistoryIndex.get(viewName);
    
    if (!history || currentIndex >= history.length - 1) return null;
    
    const newIndex = currentIndex + 1;
    this.currentHistoryIndex.set(viewName, newIndex);
    
    return this.cloneState(history[newIndex].state);
  }

  /**
   * Clear history for a view
   */
  clearHistory(viewName) {
    this.history.delete(viewName);
    this.currentHistoryIndex.delete(viewName);
  }

  // === STATE COMPRESSION ===

  /**
   * Compress state for storage
   */
  compressState(state) {
    const serialized = JSON.stringify(state);
    
    // Simple compression: remove whitespace and use shorter keys
    const compressed = this.compressJSON(serialized);
    
    return {
      data: compressed,
      size: compressed.length,
      originalSize: serialized.length,
      compressionRatio: serialized.length / compressed.length
    };
  }

  /**
   * Decompress state
   */
  decompressState(compressed) {
    if (!compressed || !compressed.data) return null;
    
    const decompressed = this.decompressJSON(compressed.data);
    return JSON.parse(decompressed);
  }

  /**
   * Simple JSON compression
   */
  compressJSON(json) {
    // Remove unnecessary whitespace
    let compressed = json.replace(/\s+/g, ' ');
    
    // Use shorter keys for common properties
    const replacements = {
      '"selectedFiles"': '"sf"',
      '"currentFilter"': '"cf"',
      '"currentSort"': '"cs"',
      '"searchQuery"': '"sq"',
      '"viewMode"': '"vm"',
      '"pagination"': '"pg"',
      '"scrollPosition"': '"sp"',
      '"timestamp"': '"ts"',
      '"categories"': '"cat"',
      '"relevanceScore"': '"rs"',
      '"confidenceScore"': '"conf"'
    };
    
    Object.entries(replacements).forEach(([full, short]) => {
      compressed = compressed.replace(new RegExp(full, 'g'), short);
    });
    
    return compressed;
  }

  /**
   * Decompress JSON
   */
  decompressJSON(compressed) {
    // Reverse the compression
    const replacements = {
      '"sf"': '"selectedFiles"',
      '"cf"': '"currentFilter"',
      '"cs"': '"currentSort"',
      '"sq"': '"searchQuery"',
      '"vm"': '"viewMode"',
      '"pg"': '"pagination"',
      '"sp"': '"scrollPosition"',
      '"ts"': '"timestamp"',
      '"cat"': '"categories"',
      '"rs"': '"relevanceScore"',
      '"conf"': '"confidenceScore"'
    };
    
    let decompressed = compressed;
    Object.entries(replacements).forEach(([short, full]) => {
      decompressed = decompressed.replace(new RegExp(short, 'g'), full);
    });
    
    return decompressed;
  }

  /**
   * Reduce state size by removing non-essential data
   */
  reduceStateSize(state) {
    const reduced = this.cloneState(state);
    
    // Remove large arrays if too big
    if (reduced.terminalLines && reduced.terminalLines.length > 100) {
      reduced.terminalLines = reduced.terminalLines.slice(-100);
    }
    
    if (reduced.queue && reduced.queue.length > 50) {
      // Keep only essential queue data
      reduced.queue = reduced.queue.map(item => ({
        id: item.id,
        status: item.status,
        fileName: item.fileName
      }));
    }
    
    // Remove file content if present
    if (reduced.files) {
      reduced.files = reduced.files.map(file => {
        const { content, preview, ...essentials } = file;
        return essentials;
      });
    }
    
    return reduced;
  }

  // === MEMORY MANAGEMENT ===

  /**
   * Update LRU cache
   */
  updateLRU(viewName) {
    // Remove and re-add to move to end (most recently used)
    this.lruCache.delete(viewName);
    this.lruCache.set(viewName, Date.now());
  }

  /**
   * Perform cleanup based on memory usage
   */
  cleanup() {
    const currentSize = this.getCurrentMemoryUsage();
    
    if (currentSize > this.memoryLimit) {
      console.log('[ViewStateManager] Memory limit exceeded, performing cleanup');
      
      // Remove least recently used states
      const toRemove = [];
      let freedMemory = 0;
      
      for (const [viewName, lastUsed] of this.lruCache) {
        if (viewName === this.activeView) continue; // Don't remove active view
        
        const state = this.states.get(viewName);
        if (state) {
          toRemove.push(viewName);
          freedMemory += state.size;
          
          if (currentSize - freedMemory < this.memoryLimit * 0.8) {
            break; // Free up to 80% of limit
          }
        }
      }
      
      // Remove from memory (keep in storage)
      toRemove.forEach(viewName => {
        this.states.delete(viewName);
        this.lruCache.delete(viewName);
        this.clearHistory(viewName);
      });
      
      console.log(`[ViewStateManager] Cleaned up ${toRemove.length} states, freed ${this.formatBytes(freedMemory)}`);
    }
  }

  /**
   * Emergency cleanup when storage is full
   */
  performEmergencyCleanup() {
    console.warn('[ViewStateManager] Performing emergency cleanup');
    
    // Clear all history
    this.history.clear();
    this.currentHistoryIndex.clear();
    
    // Keep only active view state
    const activeState = this.states.get(this.activeView);
    this.states.clear();
    if (activeState && this.activeView) {
      this.states.set(this.activeView, activeState);
    }
    
    // Clear old data from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('kcv2_') && key !== this.storageKey) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`[ViewStateManager] Emergency cleanup completed, removed ${keysToRemove.length} old keys`);
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    let totalSize = 0;
    
    this.states.forEach(compressed => {
      totalSize += compressed.size;
    });
    
    return totalSize;
  }

  // === STATE VALIDATION ===

  /**
   * Validate state against schema
   */
  validateState(viewName, state) {
    const schema = this.schemas[viewName];
    if (!schema) return true; // No schema, allow any state
    
    for (const [key, type] of Object.entries(schema)) {
      if (state.hasOwnProperty(key)) {
        if (!this.validateType(state[key], type)) {
          console.warn(`[ViewStateManager] Invalid type for ${key} in ${viewName} state`);
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Validate value type
   */
  validateType(value, expectedType) {
    switch (expectedType) {
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      default:
        return true;
    }
  }

  // === STATE MIGRATION ===

  /**
   * Migrate states from older versions
   */
  migrateStates(data) {
    let states = data.states;
    let currentVersion = data.version || '0.9';
    
    // Apply migrations in order
    for (const [version, migrationFn] of this.migrations) {
      if (this.compareVersions(currentVersion, version) < 0) {
        if (migrationFn) {
          states = migrationFn.call(this, states);
        }
        currentVersion = version;
      }
    }
    
    return states;
  }

  /**
   * Migration from version 0.9
   */
  migrateFrom09(states) {
    // Example migration: rename old properties
    Object.keys(states).forEach(viewName => {
      const state = states[viewName];
      if (state.data) {
        // Decompress first
        const decompressed = JSON.parse(state.data);
        
        // Apply migrations
        if (decompressed.selected_files) {
          decompressed.selectedFiles = decompressed.selected_files;
          delete decompressed.selected_files;
        }
        
        // Recompress
        state.data = JSON.stringify(decompressed);
      }
    });
    
    return states;
  }

  /**
   * Compare version strings
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  // === UTILITY METHODS ===

  /**
   * Deep clone state
   */
  cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const avgSaveTime = this.performanceMetrics.saveCount > 0
      ? this.performanceMetrics.totalSaveTime / this.performanceMetrics.saveCount
      : 0;
    
    const avgLoadTime = this.performanceMetrics.loadCount > 0
      ? this.performanceMetrics.totalLoadTime / this.performanceMetrics.loadCount
      : 0;
    
    return {
      ...this.performanceMetrics,
      avgSaveTime: avgSaveTime.toFixed(2) + 'ms',
      avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
      memoryUsage: this.formatBytes(this.getCurrentMemoryUsage()),
      stateCount: this.states.size,
      compressionRatio: this.performanceMetrics.compressionRatio.toFixed(2)
    };
  }

  /**
   * Export all states for debugging
   */
  exportStates() {
    const data = {
      version: this.version,
      timestamp: new Date().toISOString(),
      activeView: this.activeView,
      states: {},
      performance: this.getPerformanceStats()
    };
    
    this.states.forEach((compressed, viewName) => {
      data.states[viewName] = this.decompressState(compressed);
    });
    
    return data;
  }

  /**
   * Clear all states
   */
  clearAll() {
    this.states.clear();
    this.history.clear();
    this.currentHistoryIndex.clear();
    this.lruCache.clear();
    localStorage.removeItem(this.storageKey);
    
    console.log('[ViewStateManager] All states cleared');
  }

  /**
   * Get state summary for a view
   */
  getStateSummary(viewName) {
    const compressed = this.states.get(viewName);
    if (!compressed) return null;
    
    const history = this.history.get(viewName) || [];
    const currentIndex = this.currentHistoryIndex.get(viewName) || -1;
    
    return {
      size: this.formatBytes(compressed.size),
      compressionRatio: compressed.compressionRatio.toFixed(2),
      historyLength: history.length,
      canUndo: currentIndex > 0,
      canRedo: currentIndex < history.length - 1,
      lastModified: history.length > 0 
        ? new Date(history[history.length - 1].timestamp).toLocaleString()
        : 'Never'
    };
  }
}

// Create singleton instance
const viewStateManager = new ViewStateManager();

// Export both class and instance
export { ViewStateManager, viewStateManager as default };