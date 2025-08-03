/**
 * Logs View for KC V2
 * Displays system logs with filtering and export capabilities
 */

import { EventBus } from '../../core/EventBus.js';
import { Logger } from '../../utils/Logger.js';

export class LogsView {
  constructor(api) {
    this.api = api;
    this.container = null;
    this.logger = new Logger('LogsView');
    this.filters = {
      level: 'all',
      search: '',
      context: ''
    };
    this.autoScroll = true;
    this.updateInterval = null;
  }

  initialize() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    EventBus.on('view:logs:show', () => this.render());
    
    // Subscribe to logger updates
    this.logger.subscribe((entry) => {
      if (this.container && document.getElementById('logs-content')) {
        this.appendLogEntry(entry);
      }
    });
  }

  render() {
    this.container = document.getElementById('view-container');
    this.container.innerHTML = this.getTemplate();
    this.attachEventHandlers();
    this.displayLogs();
    this.startAutoRefresh();
  }

  getTemplate() {
    return `
      <div id="logs-view" class="view">
        <div class="view-header">
          <h2 class="view-title">System Logs</h2>
          <div class="view-actions">
            <button class="btn btn-secondary" id="btn-clear-logs">
              Clear Logs
            </button>
            <button class="btn btn-secondary" id="btn-export-logs">
              Export Logs
            </button>
            <button class="btn btn-primary" id="btn-refresh-logs">
              Refresh
            </button>
          </div>
        </div>
        
        <div class="view-content">
          <div class="logs-container">
            <!-- Filters -->
            <div class="logs-filters">
              <div class="filter-group">
                <label>Level</label>
                <select id="log-level-filter" class="filter-select">
                  <option value="all">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="success">Success</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label>Search</label>
                <input type="text" id="log-search" class="filter-input" 
                  placeholder="Search logs...">
              </div>
              
              <div class="filter-group">
                <label>Context</label>
                <input type="text" id="log-context" class="filter-input" 
                  placeholder="Filter by context...">
              </div>
              
              <div class="filter-group">
                <label class="checkbox-option">
                  <input type="checkbox" id="auto-scroll" checked>
                  <span>Auto-scroll</span>
                </label>
              </div>
            </div>
            
            <!-- Log Display -->
            <div class="logs-display">
              <div class="logs-stats">
                <span id="log-count">0 logs</span>
                <span class="separator">|</span>
                <span id="filtered-count">0 filtered</span>
                <span class="separator">|</span>
                <span id="error-count">0 errors</span>
                <span class="separator">|</span>
                <span id="warn-count">0 warnings</span>
              </div>
              
              <div class="logs-content" id="logs-content">
                <!-- Logs will be rendered here -->
              </div>
            </div>
            
            <!-- Export Options (hidden by default) -->
            <div class="export-options" id="export-options" style="display: none;">
              <h3>Export Options</h3>
              <div class="export-format">
                <label>
                  <input type="radio" name="export-format" value="json" checked>
                  JSON
                </label>
                <label>
                  <input type="radio" name="export-format" value="csv">
                  CSV
                </label>
                <label>
                  <input type="radio" name="export-format" value="text">
                  Plain Text
                </label>
              </div>
              <div class="export-actions">
                <button class="btn btn-primary" id="btn-confirm-export">Export</button>
                <button class="btn btn-secondary" id="btn-cancel-export">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventHandlers() {
    // Filter handlers
    document.getElementById('log-level-filter').addEventListener('change', 
      (e) => this.updateFilter('level', e.target.value));
    
    document.getElementById('log-search').addEventListener('input', 
      (e) => this.updateFilter('search', e.target.value));
    
    document.getElementById('log-context').addEventListener('input', 
      (e) => this.updateFilter('context', e.target.value));
    
    document.getElementById('auto-scroll').addEventListener('change', 
      (e) => this.autoScroll = e.target.checked);
    
    // Action buttons
    document.getElementById('btn-clear-logs').addEventListener('click', 
      () => this.clearLogs());
    
    document.getElementById('btn-export-logs').addEventListener('click', 
      () => this.showExportOptions());
    
    document.getElementById('btn-refresh-logs').addEventListener('click', 
      () => this.displayLogs());
    
    // Export handlers
    document.getElementById('btn-confirm-export').addEventListener('click', 
      () => this.exportLogs());
    
    document.getElementById('btn-cancel-export').addEventListener('click', 
      () => this.hideExportOptions());
  }

  updateFilter(key, value) {
    this.filters[key] = value;
    this.displayLogs();
  }

  displayLogs() {
    const logs = this.logger.getLogs(this.filters);
    const container = document.getElementById('logs-content');
    
    // Clear existing logs
    container.innerHTML = '';
    
    // Render logs
    logs.forEach(log => this.renderLogEntry(log, container));
    
    // Update stats
    this.updateStats(logs);
    
    // Scroll to bottom if auto-scroll is enabled
    if (this.autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
  }

  renderLogEntry(log, container) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${log.level}`;
    entry.dataset.timestamp = log.timestamp;
    
    const time = new Date(log.timestamp).toLocaleTimeString();
    
    entry.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-level">[${log.level.toUpperCase()}]</span>
      <span class="log-context">[${log.context}]</span>
      <span class="log-message">${this.escapeHtml(log.message)}</span>
      ${log.data ? `<span class="log-data">${this.formatData(log.data)}</span>` : ''}
    `;
    
    container.appendChild(entry);
  }

  appendLogEntry(log) {
    if (log.type === 'clear') {
      this.displayLogs();
      return;
    }
    
    // Check if log passes filters
    if (this.filters.level !== 'all' && log.level !== this.filters.level) return;
    if (this.filters.search && !this.matchesSearch(log, this.filters.search)) return;
    if (this.filters.context && !log.context.includes(this.filters.context)) return;
    
    const container = document.getElementById('logs-content');
    this.renderLogEntry(log, container);
    
    // Update stats
    const logs = this.logger.getLogs(this.filters);
    this.updateStats(logs);
    
    // Auto-scroll
    if (this.autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
  }

  matchesSearch(log, search) {
    const searchLower = search.toLowerCase();
    return log.message.toLowerCase().includes(searchLower) ||
           (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower));
  }

  updateStats(logs) {
    const allLogs = this.logger.getLogs();
    const errorCount = allLogs.filter(l => l.level === 'error').length;
    const warnCount = allLogs.filter(l => l.level === 'warn').length;
    
    document.getElementById('log-count').textContent = `${allLogs.length} logs`;
    document.getElementById('filtered-count').textContent = `${logs.length} filtered`;
    document.getElementById('error-count').textContent = `${errorCount} errors`;
    document.getElementById('warn-count').textContent = `${warnCount} warnings`;
  }

  clearLogs() {
    if (confirm('Clear all logs? This cannot be undone.')) {
      this.logger.clear();
      this.displayLogs();
      
      EventBus.emit('notification:info', {
        message: 'Logs cleared'
      });
    }
  }

  showExportOptions() {
    document.getElementById('export-options').style.display = 'block';
  }

  hideExportOptions() {
    document.getElementById('export-options').style.display = 'none';
  }

  exportLogs() {
    const format = document.querySelector('input[name="export-format"]:checked').value;
    
    try {
      this.logger.downloadLogs('kc-logs', format);
      
      EventBus.emit('notification:success', {
        message: `Logs exported as ${format.toUpperCase()}`
      });
      
      this.hideExportOptions();
    } catch (error) {
      EventBus.emit('notification:error', {
        message: `Failed to export logs: ${error.message}`
      });
    }
  }

  formatData(data) {
    if (typeof data === 'string') {
      return this.escapeHtml(data);
    }
    
    try {
      return `<pre>${this.escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    } catch {
      return this.escapeHtml(String(data));
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  startAutoRefresh() {
    // Update stats every 5 seconds
    this.updateInterval = setInterval(() => {
      const logs = this.logger.getLogs(this.filters);
      this.updateStats(logs);
    }, 5000);
  }

  stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
  }

  // Log level specific methods for external use
  logDebug(message, data) {
    this.logger.debug(message, data);
  }

  logInfo(message, data) {
    this.logger.info(message, data);
  }

  logWarn(message, data) {
    this.logger.warn(message, data);
  }

  logError(message, data) {
    this.logger.error(message, data);
  }

  logSuccess(message, data) {
    this.logger.success(message, data);
  }

  // Special log viewer features
  highlightErrors() {
    const entries = document.querySelectorAll('.log-entry');
    entries.forEach(entry => {
      if (entry.classList.contains('log-error')) {
        entry.classList.add('highlight');
        setTimeout(() => entry.classList.remove('highlight'), 2000);
      }
    });
  }

  filterByTimeRange(start, end) {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    
    const entries = document.querySelectorAll('.log-entry');
    entries.forEach(entry => {
      const timestamp = new Date(entry.dataset.timestamp).getTime();
      entry.style.display = 
        (timestamp >= startTime && timestamp <= endTime) ? 'flex' : 'none';
    });
  }

  // Advanced filtering
  createCustomFilter(filterFn) {
    const logs = this.logger.getLogs();
    const filtered = logs.filter(filterFn);
    
    const container = document.getElementById('logs-content');
    container.innerHTML = '';
    
    filtered.forEach(log => this.renderLogEntry(log, container));
    this.updateStats(filtered);
  }

  // Search highlighting
  highlightSearch(term) {
    if (!term) return;
    
    const entries = document.querySelectorAll('.log-entry');
    entries.forEach(entry => {
      const content = entry.innerHTML;
      const highlighted = content.replace(
        new RegExp(term, 'gi'),
        `<mark>$&</mark>`
      );
      entry.innerHTML = highlighted;
    });
  }

  // Export filtered logs only
  exportFiltered() {
    const logs = this.logger.getLogs(this.filters);
    const format = document.querySelector('input[name="export-format"]:checked').value;
    
    const content = this.logger.exportLogs(format);
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kc-logs-filtered-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}