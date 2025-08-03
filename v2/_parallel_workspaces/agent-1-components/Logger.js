/**
 * Logger Utility for KC V2
 * Provides structured logging with levels, timestamps, and persistence
 */

export class Logger {
  constructor(context = 'KC V2') {
    this.context = context;
    this.logs = [];
    this.maxLogs = 1000;
    this.logLevel = this.loadLogLevel();
    this.listeners = new Set();
    this.colors = {
      debug: '#888',
      info: '#2196F3',
      warn: '#FF9800',
      error: '#F44336',
      success: '#4CAF50'
    };
  }

  loadLogLevel() {
    const saved = localStorage.getItem('kc-log-level');
    return saved || 'info';
  }

  setLogLevel(level) {
    this.logLevel = level;
    localStorage.setItem('kc-log-level', level);
  }

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      context: this.context,
      message,
      data: data || null
    };

    // Add to internal log storage
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify listeners
    this.notifyListeners(entry);

    return entry;
  }

  logToConsole(level, message, data) {
    const color = this.colors[level] || '#000';
    const timestamp = new Date().toTimeString().split(' ')[0];
    
    const consoleMethod = level === 'error' ? 'error' : 
                         level === 'warn' ? 'warn' : 'log';

    console[consoleMethod](
      `%c[${timestamp}] [${this.context}] ${message}`,
      `color: ${color}; font-weight: bold;`,
      data || ''
    );
  }

  debug(message, data) {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.formatMessage('debug', message, data);
    this.logToConsole('debug', message, data);
    return entry;
  }

  info(message, data) {
    if (!this.shouldLog('info')) return;
    
    const entry = this.formatMessage('info', message, data);
    this.logToConsole('info', message, data);
    return entry;
  }

  warn(message, data) {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.formatMessage('warn', message, data);
    this.logToConsole('warn', message, data);
    return entry;
  }

  error(message, data) {
    if (!this.shouldLog('error')) return;
    
    const entry = this.formatMessage('error', message, data);
    this.logToConsole('error', message, data);
    
    // Also log to error tracking if available
    if (window.errorTracker) {
      window.errorTracker.logError(message, data);
    }
    
    return entry;
  }

  success(message, data) {
    if (!this.shouldLog('info')) return;
    
    const entry = this.formatMessage('success', message, data);
    this.logToConsole('success', message, data);
    return entry;
  }

  // Group logging
  group(label) {
    console.group(label);
  }

  groupCollapsed(label) {
    console.groupCollapsed(label);
  }

  groupEnd() {
    console.groupEnd();
  }

  // Performance logging
  time(label) {
    console.time(label);
  }

  timeEnd(label) {
    console.timeEnd(label);
  }

  // Table logging
  table(data, columns) {
    console.table(data, columns);
  }

  // Clear logs
  clear() {
    this.logs = [];
    console.clear();
    this.notifyListeners({ type: 'clear' });
  }

  // Get logs
  getLogs(filter = {}) {
    let filtered = [...this.logs];

    if (filter.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter.context) {
      filtered = filtered.filter(log => log.context.includes(filter.context));
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.data).toLowerCase().includes(searchLower)
      );
    }

    if (filter.startTime) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= new Date(filter.startTime)
      );
    }

    if (filter.endTime) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) <= new Date(filter.endTime)
      );
    }

    return filtered;
  }

  // Export logs
  exportLogs(format = 'json') {
    const logs = this.getLogs();

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        const headers = ['Timestamp', 'Level', 'Context', 'Message', 'Data'];
        const rows = logs.map(log => [
          log.timestamp,
          log.level,
          log.context,
          log.message,
          JSON.stringify(log.data || '')
        ]);
        
        const csv = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        
        return csv;
      
      case 'text':
        return logs.map(log => 
          `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.context}] ${log.message}${
            log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
          }`
        ).join('\n\n');
      
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  // Download logs
  downloadLogs(filename = 'kc-logs', format = 'json') {
    const content = this.exportLogs(format);
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Listen to log events
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(entry) {
    this.listeners.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }

  // Create a child logger with a new context
  createChild(childContext) {
    const child = new Logger(`${this.context} > ${childContext}`);
    child.logLevel = this.logLevel;
    return child;
  }

  // Measure performance
  measure(name, fn) {
    const start = performance.now();
    
    try {
      const result = fn();
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result.then(value => {
          const duration = performance.now() - start;
          this.debug(`${name} completed in ${duration.toFixed(2)}ms`);
          return value;
        }).catch(error => {
          const duration = performance.now() - start;
          this.error(`${name} failed after ${duration.toFixed(2)}ms`, error);
          throw error;
        });
      }
      
      const duration = performance.now() - start;
      this.debug(`${name} completed in ${duration.toFixed(2)}ms`);
      return result;
      
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${name} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  // Create formatted sections
  section(title, fn) {
    this.info(`=== ${title} ===`);
    const result = fn();
    this.info(`=== End ${title} ===`);
    return result;
  }

  // Log with stack trace
  trace(message, data) {
    const stack = new Error().stack;
    this.debug(message, { ...data, stack });
  }

  // Assert logging
  assert(condition, message, data) {
    if (!condition) {
      this.error(`Assertion failed: ${message}`, data);
    }
  }

  // Count occurrences
  count(label) {
    if (!this._counts) this._counts = {};
    this._counts[label] = (this._counts[label] || 0) + 1;
    this.debug(`${label}: ${this._counts[label]}`);
  }

  // Reset count
  countReset(label) {
    if (!this._counts) this._counts = {};
    this._counts[label] = 0;
  }
}