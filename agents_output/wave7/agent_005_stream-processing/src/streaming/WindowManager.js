/**
 * WindowManager.js
 * Manages multiple window types and tracks window lifecycle
 */

import { SlidingWindow } from './SlidingWindow.js';

export class WindowManager {
  constructor(options = {}) {
    this.options = {
      types: ['tumbling', 'hopping', 'session'],
      defaultSize: 1000,
      maxWindows: 10000,
      ...options
    };
    
    // Windows organized by type and key
    this.windows = new Map(); // type -> Map(key -> window)
    this.closedWindows = [];
    this.activeCount = 0;
    
    // Initialize window types
    this.options.types.forEach(type => {
      this.windows.set(type, new Map());
    });
  }
  
  /**
   * Add event to appropriate windows
   */
  addEvent(event) {
    const key = event.fileId || event.key || 'default';
    
    // Add to each window type
    this.options.types.forEach(type => {
      const window = this.getOrCreateWindow(type, key);
      window.add(event);
    });
    
    // Check for closed windows
    this.checkClosedWindows();
  }
  
  /**
   * Get or create window
   */
  getOrCreateWindow(type, key) {
    const typeWindows = this.windows.get(type);
    
    if (!typeWindows.has(key)) {
      const window = new SlidingWindow({
        type,
        size: this.options.defaultSize,
        id: `${type}-${key}-${Date.now()}`
      });
      
      typeWindows.set(key, window);
      this.activeCount++;
      
      // Enforce max windows limit
      if (this.activeCount > this.options.maxWindows) {
        this.evictOldestWindow();
      }
    }
    
    return typeWindows.get(key);
  }
  
  /**
   * Check for closed windows
   */
  checkClosedWindows() {
    const now = Date.now();
    
    this.windows.forEach((typeWindows, type) => {
      typeWindows.forEach((window, key) => {
        if (window.shouldClose(now)) {
          this.closeWindow(type, key, window);
        }
      });
    });
  }
  
  /**
   * Close a window
   */
  closeWindow(type, key, window) {
    const typeWindows = this.windows.get(type);
    
    // Add to closed windows queue
    this.closedWindows.push({
      type,
      key,
      window: window.clone() // Clone to preserve state
    });
    
    // Remove from active
    typeWindows.delete(key);
    this.activeCount--;
    
    // Reset window for reuse
    window.reset();
  }
  
  /**
   * Get closed windows and clear queue
   */
  getClosedWindows() {
    const closed = [...this.closedWindows];
    this.closedWindows = [];
    return closed.map(item => item.window);
  }
  
  /**
   * Get active windows for a key
   */
  getActiveWindows(key) {
    const active = [];
    
    this.windows.forEach((typeWindows, type) => {
      if (typeWindows.has(key)) {
        active.push(typeWindows.get(key));
      }
    });
    
    return active;
  }
  
  /**
   * Evict oldest window when limit reached
   */
  evictOldestWindow() {
    let oldest = null;
    let oldestType = null;
    let oldestKey = null;
    
    this.windows.forEach((typeWindows, type) => {
      typeWindows.forEach((window, key) => {
        if (!oldest || window.getLastUpdate() < oldest.getLastUpdate()) {
          oldest = window;
          oldestType = type;
          oldestKey = key;
        }
      });
    });
    
    if (oldest) {
      this.closeWindow(oldestType, oldestKey, oldest);
    }
  }
  
  /**
   * Get active window count
   */
  getActiveWindowCount() {
    return this.activeCount;
  }
  
  /**
   * Create snapshot for persistence
   */
  snapshot() {
    const snapshot = {
      timestamp: Date.now(),
      windows: {}
    };
    
    this.windows.forEach((typeWindows, type) => {
      snapshot.windows[type] = {};
      typeWindows.forEach((window, key) => {
        snapshot.windows[type][key] = window.getMetadata();
      });
    });
    
    return snapshot;
  }
  
  /**
   * Restore from snapshot
   */
  restore(snapshot) {
    // Clear existing windows
    this.windows.forEach(typeWindows => typeWindows.clear());
    this.activeCount = 0;
    
    // Restore windows
    Object.entries(snapshot.windows).forEach(([type, windows]) => {
      const typeWindows = this.windows.get(type);
      if (!typeWindows) return;
      
      Object.entries(windows).forEach(([key, metadata]) => {
        const window = new SlidingWindow({
          type: metadata.type,
          size: metadata.size
        });
        
        // Restore metadata
        window.start = metadata.start;
        window.end = metadata.end;
        window.lastUpdate = metadata.lastUpdate;
        
        typeWindows.set(key, window);
        this.activeCount++;
      });
    });
  }
}

export default WindowManager;