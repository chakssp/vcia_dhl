/**
 * SlidingWindow.js
 * High-performance sliding window implementation for stream processing
 */

export class SlidingWindow {
  constructor(options = {}) {
    this.size = options.size || 1000; // Window size in ms
    this.type = options.type || 'hopping'; // hopping, tumbling, session
    this.hop = options.hop || 100; // Hop size for hopping windows
    this.sessionGap = options.sessionGap || 300000; // 5 min gap for session windows
    
    this.events = [];
    this.start = null;
    this.end = null;
    this.lastUpdate = Date.now();
    this.lastResult = null;
    
    // For session windows
    this.sessionStart = null;
    this.lastEventTime = null;
  }
  
  /**
   * Add event to window
   */
  add(event) {
    const timestamp = event.timestamp || Date.now();
    
    // Initialize window start
    if (this.start === null) {
      this.start = timestamp;
      this.end = this.start + this.size;
      
      if (this.type === 'session') {
        this.sessionStart = timestamp;
      }
    }
    
    // Handle different window types
    switch (this.type) {
      case 'tumbling':
        this.addTumbling(event, timestamp);
        break;
      case 'hopping':
        this.addHopping(event, timestamp);
        break;
      case 'session':
        this.addSession(event, timestamp);
        break;
      default:
        this.events.push(event);
    }
    
    this.lastUpdate = Date.now();
    this.lastEventTime = timestamp;
  }
  
  /**
   * Add to tumbling window
   */
  addTumbling(event, timestamp) {
    if (timestamp >= this.start && timestamp < this.end) {
      this.events.push(event);
    } else if (timestamp >= this.end) {
      // Window closed, start new window
      this.reset();
      this.start = Math.floor(timestamp / this.size) * this.size;
      this.end = this.start + this.size;
      this.events.push(event);
    }
    // Ignore late events (timestamp < start)
  }
  
  /**
   * Add to hopping window
   */
  addHopping(event, timestamp) {
    // Hopping windows can contain events from multiple overlapping windows
    this.events.push(event);
    
    // Remove old events outside window
    const cutoff = timestamp - this.size;
    this.events = this.events.filter(e => 
      (e.timestamp || Date.now()) > cutoff
    );
    
    // Update window bounds
    if (this.events.length > 0) {
      this.start = Math.min(...this.events.map(e => e.timestamp || Date.now()));
      this.end = this.start + this.size;
    }
  }
  
  /**
   * Add to session window
   */
  addSession(event, timestamp) {
    // Check if session expired
    if (this.lastEventTime && timestamp - this.lastEventTime > this.sessionGap) {
      // Session expired, start new session
      this.reset();
      this.sessionStart = timestamp;
    }
    
    this.events.push(event);
  }
  
  /**
   * Check if window is ready for processing
   */
  isReady() {
    switch (this.type) {
      case 'tumbling':
        // Ready when current time passes window end
        return Date.now() >= this.end;
        
      case 'hopping':
        // Always ready if has events
        return this.events.length > 0;
        
      case 'session':
        // Ready when session gap exceeded
        return this.lastEventTime && 
               Date.now() - this.lastEventTime > this.sessionGap;
        
      default:
        return this.events.length > 0;
    }
  }
  
  /**
   * Check if window should close (for tumbling windows)
   */
  shouldClose(now) {
    return this.type === 'tumbling' && now >= this.end;
  }
  
  /**
   * Get window data
   */
  getData() {
    return [...this.events]; // Return copy
  }
  
  /**
   * Get window start time
   */
  getStart() {
    return this.start;
  }
  
  /**
   * Get window end time
   */
  getEnd() {
    return this.end;
  }
  
  /**
   * Get last update time
   */
  getLastUpdate() {
    return this.lastUpdate;
  }
  
  /**
   * Set window result
   */
  setResult(result) {
    this.lastResult = result;
  }
  
  /**
   * Get last result
   */
  getLastResult() {
    return this.lastResult;
  }
  
  /**
   * Check if window is empty
   */
  isEmpty() {
    return this.events.length === 0;
  }
  
  /**
   * Reset window
   */
  reset() {
    this.events = [];
    this.start = null;
    this.end = null;
    this.lastResult = null;
    
    if (this.type === 'session') {
      this.sessionStart = null;
      this.lastEventTime = null;
    }
  }
  
  /**
   * Get window metadata
   */
  getMetadata() {
    return {
      type: this.type,
      size: this.size,
      eventCount: this.events.length,
      start: this.start,
      end: this.end,
      duration: this.end - this.start,
      lastUpdate: this.lastUpdate
    };
  }
  
  /**
   * Clone window
   */
  clone() {
    const cloned = new SlidingWindow({
      size: this.size,
      type: this.type,
      hop: this.hop,
      sessionGap: this.sessionGap
    });
    
    cloned.events = [...this.events];
    cloned.start = this.start;
    cloned.end = this.end;
    cloned.lastUpdate = this.lastUpdate;
    cloned.lastResult = this.lastResult;
    cloned.sessionStart = this.sessionStart;
    cloned.lastEventTime = this.lastEventTime;
    
    return cloned;
  }
  
  /**
   * Merge with another window
   */
  merge(other) {
    if (other.type !== this.type) {
      throw new Error('Cannot merge windows of different types');
    }
    
    // Merge events
    this.events = [...this.events, ...other.events]
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Update bounds
    if (other.start < this.start) this.start = other.start;
    if (other.end > this.end) this.end = other.end;
    
    this.lastUpdate = Date.now();
  }
  
  /**
   * Get events in time range
   */
  getEventsInRange(startTime, endTime) {
    return this.events.filter(e => {
      const timestamp = e.timestamp || Date.now();
      return timestamp >= startTime && timestamp < endTime;
    });
  }
  
  /**
   * Watermark handling for out-of-order events
   */
  handleWatermark(watermark) {
    // Remove events older than watermark
    this.events = this.events.filter(e => 
      (e.timestamp || Date.now()) >= watermark
    );
  }
}

export default SlidingWindow;