/**
 * AppState - Central state management for V2
 * Syncs with V1 through LegacyBridge
 */

import { legacyBridge } from './LegacyBridge.js';
import eventBus, { Events } from './EventBus.js';

export class AppState {
  constructor() {
    this.state = new Map();
    this.subscribers = new Map();
    this.localStorageKey = 'kc_v2_state';
    this.syncWithV1 = true;
    this.initialized = false;
  }

  /**
   * Initialize AppState
   */
  async initialize() {
    try {
      // Load state from localStorage
      this.loadFromLocalStorage();
      
      // Initialize legacy bridge
      if (this.syncWithV1) {
        await legacyBridge.initialize();
        
        // Listen for V1 state changes
        eventBus.on('v1:state_changed', ({ key, newValue }) => {
          this.set(`v1_${key}`, newValue, { fromV1: true });
        });
      }
      
      this.initialized = true;
      console.log('[AppState] Initialized successfully');
      
    } catch (error) {
      console.error('[AppState] Initialization error:', error);
      // Continue without V1 sync if bridge fails
      this.syncWithV1 = false;
    }
  }

  /**
   * Get state value
   * @param {string} key - State key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} State value
   */
  get(key, defaultValue = undefined) {
    // Check V2 state first
    if (this.state.has(key)) {
      return this.state.get(key);
    }
    
    // Check V1 state if bridge is active
    if (this.syncWithV1 && key.startsWith('v1_')) {
      const v1Key = key.replace('v1_', '');
      const v1Value = legacyBridge.getV1Data(v1Key);
      if (v1Value !== undefined) {
        return v1Value;
      }
    }
    
    return defaultValue;
  }

  /**
   * Set state value
   * @param {string} key - State key
   * @param {*} value - State value
   * @param {Object} options - Set options
   */
  set(key, value, options = {}) {
    const oldValue = this.state.get(key);
    
    // Update state
    this.state.set(key, value);
    
    // Notify subscribers
    this.notifySubscribers(key, value, oldValue);
    
    // Emit global state change event
    if (!options.silent) {
      eventBus.emit(Events.STATE_CHANGE, {
        key,
        newValue: value,
        oldValue,
        fromV1: options.fromV1 || false
      });
    }
    
    // Save to localStorage
    if (!options.skipPersist) {
      this.saveToLocalStorage();
    }
    
    // Sync back to V1 if needed
    if (this.syncWithV1 && !options.fromV1 && !key.startsWith('v1_')) {
      try {
        legacyBridge.setV1Data(key, value);
      } catch (error) {
        console.warn('[AppState] Failed to sync to V1:', error);
      }
    }
  }

  /**
   * Delete state value
   * @param {string} key - State key
   */
  delete(key) {
    const oldValue = this.state.get(key);
    
    if (this.state.has(key)) {
      this.state.delete(key);
      this.notifySubscribers(key, undefined, oldValue);
      
      eventBus.emit(Events.STATE_CHANGE, {
        key,
        newValue: undefined,
        oldValue,
        deleted: true
      });
      
      this.saveToLocalStorage();
    }
  }

  /**
   * Clear all state
   */
  clear() {
    this.state.clear();
    this.saveToLocalStorage();
    eventBus.emit(Events.STATE_CHANGE, { cleared: true });
  }

  /**
   * Merge multiple values into state
   * @param {Object} values - Object with key-value pairs
   */
  merge(values, options = {}) {
    Object.entries(values).forEach(([key, value]) => {
      this.set(key, value, { ...options, skipPersist: true });
    });
    
    if (!options.skipPersist) {
      this.saveToLocalStorage();
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(key).delete(callback);
      if (this.subscribers.get(key).size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  /**
   * Get all state as object
   * @returns {Object} State object
   */
  toObject() {
    const obj = {};
    this.state.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Get state keys
   * @returns {string[]} Array of state keys
   */
  keys() {
    return Array.from(this.state.keys());
  }

  /**
   * Check if key exists
   * @param {string} key - State key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.state.has(key) || 
           (this.syncWithV1 && key.startsWith('v1_') && 
            legacyBridge.getV1Data(key.replace('v1_', '')) !== undefined);
  }

  /**
   * Get V1 files with V2 transformations
   * @returns {Array} Transformed files array
   */
  getFiles() {
    // Try V2 files first
    let files = this.get('files', []);
    
    // If empty, try V1 files
    if (files.length === 0 && this.syncWithV1) {
      files = this.get('v1_files', []);
    }
    
    return files;
  }

  /**
   * Get V1 categories with V2 transformations
   * @returns {Array} Transformed categories array
   */
  getCategories() {
    // Try V2 categories first
    let categories = this.get('categories', []);
    
    // If empty, try V1 categories
    if (categories.length === 0 && this.syncWithV1) {
      categories = this.get('v1_categories', []);
    }
    
    return categories;
  }

  /**
   * Notify subscribers of state change
   * @private
   */
  notifySubscribers(key, newValue, oldValue) {
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(callback => {
        try {
          callback(newValue, oldValue, key);
        } catch (error) {
          console.error('[AppState] Subscriber error:', error);
        }
      });
    }
  }

  /**
   * Save state to localStorage
   * @private
   */
  saveToLocalStorage() {
    try {
      const stateObj = this.toObject();
      // Filter out large or sensitive data
      const filteredState = this.filterForStorage(stateObj);
      localStorage.setItem(this.localStorageKey, JSON.stringify(filteredState));
    } catch (error) {
      console.error('[AppState] Failed to save to localStorage:', error);
    }
  }

  /**
   * Load state from localStorage
   * @private
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const stateObj = JSON.parse(stored);
        Object.entries(stateObj).forEach(([key, value]) => {
          this.state.set(key, value);
        });
      }
    } catch (error) {
      console.error('[AppState] Failed to load from localStorage:', error);
    }
  }

  /**
   * Filter state for localStorage storage
   * @private
   */
  filterForStorage(stateObj) {
    const filtered = {};
    const excludeKeys = ['v1_files', 'v1_content', 'temp_data'];
    const maxValueSize = 100000; // 100KB per value
    
    Object.entries(stateObj).forEach(([key, value]) => {
      // Skip excluded keys
      if (excludeKeys.includes(key)) return;
      
      // Skip large values
      const size = JSON.stringify(value).length;
      if (size > maxValueSize) {
        console.warn(`[AppState] Skipping large value for ${key} (${size} bytes)`);
        return;
      }
      
      filtered[key] = value;
    });
    
    return filtered;
  }

  /**
   * Debug: Print current state
   */
  debug() {
    console.group('[AppState] Current State');
    this.state.forEach((value, key) => {
      console.log(`${key}:`, value);
    });
    console.groupEnd();
  }
}

// Create singleton instance
const appState = new AppState();
export default appState;