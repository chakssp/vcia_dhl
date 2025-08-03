/**
 * EventBus - Central event management system
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.eventLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event).add(handler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (one-time only)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  once(event, handler) {
    const onceHandler = (...args) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    
    this.on(event, onceHandler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  off(event, handler) {
    if (this.events.has(event)) {
      this.events.get(event).delete(handler);
      
      // Clean up empty event sets
      if (this.events.get(event).size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   */
  emit(event, ...args) {
    // Log event
    this.logEvent(event, args);
    
    if (this.events.has(event)) {
      const handlers = Array.from(this.events.get(event));
      
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Clear all handlers for an event
   * @param {string} event - Event name
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get all registered events
   * @returns {string[]} Array of event names
   */
  getEvents() {
    return Array.from(this.events.keys());
  }

  /**
   * Get handler count for an event
   * @param {string} event - Event name
   * @returns {number} Number of handlers
   */
  getHandlerCount(event) {
    return this.events.has(event) ? this.events.get(event).size : 0;
  }

  /**
   * Log event for debugging
   * @private
   */
  logEvent(event, args) {
    const entry = {
      event,
      args,
      timestamp: Date.now(),
      handlers: this.getHandlerCount(event)
    };
    
    this.eventLog.push(entry);
    
    // Maintain log size limit
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Get event log
   * @param {string} [event] - Filter by event name
   * @returns {Array} Event log entries
   */
  getEventLog(event) {
    if (event) {
      return this.eventLog.filter(entry => entry.event === event);
    }
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog() {
    this.eventLog = [];
  }
}

// Event names constants
export const Events = {
  // Navigation
  VIEW_CHANGE: 'view:change',
  
  // File operations
  FILE_DISCOVERED: 'file:discovered',
  FILE_SELECTED: 'file:selected',
  FILE_ANALYZED: 'file:analyzed',
  FILE_CATEGORIZED: 'file:categorized',
  
  // API operations
  API_REQUEST: 'api:request',
  API_RESPONSE: 'api:response',
  API_ERROR: 'api:error',
  
  // UI events
  MODAL_OPEN: 'ui:modal:open',
  MODAL_CLOSE: 'ui:modal:close',
  NOTIFICATION_SHOW: 'ui:notification:show',
  
  // State changes
  STATE_CHANGE: 'state:change',
  SETTINGS_CHANGE: 'settings:change',
  
  // System events
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info'
};

// Create singleton instance
const eventBus = new EventBus();
export default eventBus;