/**
 * AnalysisView.js - AI analysis interface for KC V2
 * 
 * Provides real-time AI analysis management with multiple provider support,
 * batch processing, progress tracking, and terminal-style output
 * 
 * Features:
 * - Real-time analysis progress tracking
 * - Multiple AI provider status dashboard
 * - Batch analysis queue management
 * - Terminal-style results visualization
 * - Provider health monitoring
 * - Token usage tracking
 * - Analysis history
 */

import appState from '../../../js/core/AppState.js';
import eventBus, { Events } from '../../../js/core/EventBus.js';
import { legacyBridge } from '../../../js/core/LegacyBridge.js';

export class AnalysisView {
  constructor() {
    this.container = null;
    this.isInitialized = false;
    
    // Analysis state
    this.queue = [];
    this.processing = false;
    this.currentBatch = null;
    this.analysisHistory = [];
    
    // Provider status
    this.providers = {
      ollama: { name: 'Ollama', status: 'offline', health: 0, icon: '🤖' },
      openai: { name: 'OpenAI', status: 'offline', health: 0, icon: '🧠' },
      gemini: { name: 'Gemini', status: 'offline', health: 0, icon: '✨' },
      anthropic: { name: 'Anthropic', status: 'offline', health: 0, icon: '🎯' }
    };
    
    // Current configuration
    this.config = {
      batchSize: 5,
      provider: 'ollama',
      template: 'decisiveMoments',
      maxRetries: 3,
      timeout: 30000,
      autoRetry: true
    };
    
    // Terminal output
    this.terminalLines = [];
    this.maxTerminalLines = 1000;
    
    // Progress tracking
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      startTime: null,
      estimatedTime: null
    };
    
    // Update intervals
    this.updateInterval = null;
    this.healthCheckInterval = null;
    
    console.log('[AnalysisView] Initialized');
  }

  /**
   * Initialize the analysis view
   */
  async initialize(container) {
    try {
      this.container = container;
      
      // Ensure legacy bridge is ready
      if (!legacyBridge.initialized) {
        await legacyBridge.initialize();
      }
      
      this.setupEventListeners();
      this.render();
      await this.loadAnalysisState();
      await this.checkProvidersHealth();
      
      // Start update intervals
      this.startUpdateIntervals();
      
      this.isInitialized = true;
      console.log('[AnalysisView] Initialized successfully');
      
    } catch (error) {
      console.error('[AnalysisView] Initialization failed:', error);
      this.renderError('Failed to initialize Analysis View');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // V1 sync events
    eventBus.on('v1:analysis_started', (data) => {
      this.onAnalysisStarted(data);
    });
    
    eventBus.on('v1:analysis_completed', (data) => {
      this.onAnalysisCompleted(data);
    });
    
    eventBus.on('v1:analysis_failed', (data) => {
      this.onAnalysisFailed(data);
    });
    
    eventBus.on('v1:analysis_progress', (data) => {
      this.updateProgress(data);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  /**
   * Start update intervals
   */
  startUpdateIntervals() {
    // Progress update every second
    this.updateInterval = setInterval(() => {
      if (this.processing) {
        this.updateTimeEstimates();
        this.updateProgressDisplay();
      }
    }, 1000);
    
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkProvidersHealth();
    }, 30000);
  }

  /**
   * Load analysis state from V1
   */
  async loadAnalysisState() {
    try {
      const files = appState.getFiles();
      const pendingFiles = files.filter(f => !f.analyzed && f.approved);
      
      this.queue = pendingFiles.map(file => ({
        id: file.id,
        file: file,
        status: 'pending',
        attempts: 0,
        error: null
      }));
      
      this.updateProgress({
        total: this.queue.length,
        completed: 0,
        failed: 0,
        pending: this.queue.length
      });
      
    } catch (error) {
      console.error('[AnalysisView] Failed to load analysis state:', error);
    }
  }

  /**
   * Check providers health
   */
  async checkProvidersHealth() {
    for (const [key, provider] of Object.entries(this.providers)) {
      try {
        const isAvailable = await legacyBridge.executeV1Function(
          `AIAPIManager.check${this.capitalize(key)}Availability`
        );
        
        provider.status = isAvailable ? 'online' : 'offline';
        provider.health = isAvailable ? 100 : 0;
        
        if (isAvailable) {
          // Get more detailed health info if available
          const stats = await legacyBridge.executeV1Function(
            `AIAPIManager.getProviderStats`,
            key
          );
          
          if (stats) {
            provider.health = stats.health || 100;
            provider.latency = stats.latency || 0;
            provider.tokensUsed = stats.tokensUsed || 0;
          }
        }
      } catch (error) {
        provider.status = 'error';
        provider.health = 0;
      }
    }
    
    this.updateProviderDisplay();
  }

  /**
   * Render the analysis view
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="analysis-view">
        ${this.renderHeader()}
        ${this.renderProviderStatus()}
        ${this.renderAnalysisControls()}
        ${this.renderProgressSection()}
        ${this.renderTerminal()}
        ${this.renderQueueSection()}
      </div>
    `;
    
    this.attachEventListeners();
  }

  /**
   * Render header
   */
  renderHeader() {
    const stats = this.getStats();
    
    return `
      <div class="analysis-header">
        <div class="analysis-title">
          <h2>🧠 AI Analysis</h2>
          <div class="analysis-stats">
            <span class="stat-item">
              <span class="stat-value">${stats.queue}</span>
              <span class="stat-label">queued</span>
            </span>
            <span class="stat-item">
              <span class="stat-value">${stats.processing}</span>
              <span class="stat-label">processing</span>
            </span>
            <span class="stat-item">
              <span class="stat-value">${stats.completed}</span>
              <span class="stat-label">completed</span>
            </span>
            <span class="stat-item ${stats.failed > 0 ? 'error' : ''}">
              <span class="stat-value">${stats.failed}</span>
              <span class="stat-label">failed</span>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render provider status
   */
  renderProviderStatus() {
    return `
      <div class="provider-status-panel">
        <h3>Provider Status</h3>
        <div class="provider-grid">
          ${Object.entries(this.providers).map(([key, provider]) => `
            <div class="provider-card ${provider.status} ${key === this.config.provider ? 'active' : ''}"
                 data-provider="${key}">
              <div class="provider-header">
                <span class="provider-icon">${provider.icon}</span>
                <span class="provider-name">${provider.name}</span>
                <span class="provider-status-indicator"></span>
              </div>
              <div class="provider-health">
                <div class="health-bar">
                  <div class="health-fill" style="width: ${provider.health}%"></div>
                </div>
                <span class="health-text">${provider.health}%</span>
              </div>
              <div class="provider-stats">
                ${provider.latency ? `
                  <span class="stat">⚡ ${provider.latency}ms</span>
                ` : ''}
                ${provider.tokensUsed ? `
                  <span class="stat">🎫 ${this.formatNumber(provider.tokensUsed)} tokens</span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render analysis controls
   */
  renderAnalysisControls() {
    const templates = [
      { value: 'decisiveMoments', label: 'Decisive Moments' },
      { value: 'technicalInsights', label: 'Technical Insights' },
      { value: 'projectAnalysis', label: 'Project Analysis' },
      { value: 'custom', label: 'Custom Template' }
    ];
    
    return `
      <div class="analysis-controls">
        <div class="control-group">
          <label>Provider:</label>
          <select id="provider-select" ${this.processing ? 'disabled' : ''}>
            ${Object.entries(this.providers).map(([key, provider]) => `
              <option value="${key}" ${key === this.config.provider ? 'selected' : ''}>
                ${provider.icon} ${provider.name}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="control-group">
          <label>Template:</label>
          <select id="template-select" ${this.processing ? 'disabled' : ''}>
            ${templates.map(t => `
              <option value="${t.value}" ${t.value === this.config.template ? 'selected' : ''}>
                ${t.label}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="control-group">
          <label>Batch Size:</label>
          <input type="number" 
                 id="batch-size" 
                 min="1" 
                 max="20" 
                 value="${this.config.batchSize}"
                 ${this.processing ? 'disabled' : ''}>
        </div>
        
        <div class="control-actions">
          ${this.processing ? `
            <button class="btn btn-danger" id="stop-analysis">
              ⏹️ Stop Analysis
            </button>
          ` : `
            <button class="btn btn-primary" id="start-analysis" 
                    ${this.queue.length === 0 ? 'disabled' : ''}>
              ▶️ Start Analysis
            </button>
          `}
          
          <button class="btn btn-secondary" id="add-files">
            ➕ Add Files
          </button>
          
          <button class="btn btn-secondary" id="clear-queue" 
                  ${this.queue.length === 0 ? 'disabled' : ''}>
            🗑️ Clear Queue
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render progress section
   */
  renderProgressSection() {
    if (!this.processing && this.progress.total === 0) {
      return '';
    }
    
    const percent = this.progress.total > 0 
      ? Math.round((this.progress.completed / this.progress.total) * 100)
      : 0;
    
    return `
      <div class="progress-section">
        <div class="progress-header">
          <h3>Analysis Progress</h3>
          <span class="progress-percent">${percent}%</span>
        </div>
        
        <div class="progress-bar-wrapper">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%"></div>
          </div>
        </div>
        
        <div class="progress-details">
          <div class="progress-stat">
            <span class="label">Completed:</span>
            <span class="value">${this.progress.completed} / ${this.progress.total}</span>
          </div>
          
          <div class="progress-stat">
            <span class="label">Failed:</span>
            <span class="value error">${this.progress.failed}</span>
          </div>
          
          <div class="progress-stat">
            <span class="label">Time Elapsed:</span>
            <span class="value">${this.getElapsedTime()}</span>
          </div>
          
          <div class="progress-stat">
            <span class="label">Est. Remaining:</span>
            <span class="value">${this.getEstimatedTime()}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render terminal output
   */
  renderTerminal() {
    return `
      <div class="terminal-section">
        <div class="terminal-header">
          <h3>📟 Analysis Output</h3>
          <div class="terminal-actions">
            <button class="btn-icon" id="clear-terminal" title="Clear Output">
              🗑️
            </button>
            <button class="btn-icon" id="export-logs" title="Export Logs">
              💾
            </button>
            <button class="btn-icon" id="toggle-autoscroll" title="Toggle Auto-scroll">
              📜
            </button>
          </div>
        </div>
        
        <div class="terminal-output" id="terminal-output">
          ${this.terminalLines.map(line => this.renderTerminalLine(line)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render terminal line
   */
  renderTerminalLine(line) {
    const timestamp = new Date(line.timestamp).toLocaleTimeString();
    const levelClass = line.level || 'info';
    const icon = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[levelClass] || 'ℹ️';
    
    return `
      <div class="terminal-line ${levelClass}">
        <span class="terminal-timestamp">[${timestamp}]</span>
        <span class="terminal-icon">${icon}</span>
        <span class="terminal-message">${this.escapeHtml(line.message)}</span>
      </div>
    `;
  }

  /**
   * Render queue section
   */
  renderQueueSection() {
    if (this.queue.length === 0) {
      return this.renderEmptyQueue();
    }
    
    const groupedQueue = this.groupQueueByStatus();
    
    return `
      <div class="queue-section">
        <div class="queue-header">
          <h3>📋 Analysis Queue</h3>
          <div class="queue-filters">
            <button class="filter-btn active" data-filter="all">
              All (${this.queue.length})
            </button>
            <button class="filter-btn" data-filter="pending">
              Pending (${groupedQueue.pending.length})
            </button>
            <button class="filter-btn" data-filter="processing">
              Processing (${groupedQueue.processing.length})
            </button>
            <button class="filter-btn" data-filter="completed">
              Completed (${groupedQueue.completed.length})
            </button>
            <button class="filter-btn" data-filter="failed">
              Failed (${groupedQueue.failed.length})
            </button>
          </div>
        </div>
        
        <div class="queue-list" id="queue-list">
          ${this.queue.map(item => this.renderQueueItem(item)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render queue item
   */
  renderQueueItem(item) {
    const statusIcon = {
      pending: '⏳',
      processing: '⚡',
      completed: '✅',
      failed: '❌'
    }[item.status] || '⏳';
    
    const statusClass = item.status;
    
    return `
      <div class="queue-item ${statusClass}" data-id="${item.id}">
        <div class="queue-item-header">
          <span class="queue-status">${statusIcon}</span>
          <span class="queue-name">${item.file.name}</span>
          <div class="queue-actions">
            ${item.status === 'failed' ? `
              <button class="btn-icon" onclick="analysisView.retryItem('${item.id}')" title="Retry">
                🔄
              </button>
            ` : ''}
            <button class="btn-icon" onclick="analysisView.removeItem('${item.id}')" title="Remove">
              ✕
            </button>
          </div>
        </div>
        
        ${item.status === 'processing' ? `
          <div class="queue-item-progress">
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" style="width: ${item.progress || 0}%"></div>
            </div>
          </div>
        ` : ''}
        
        ${item.error ? `
          <div class="queue-item-error">
            <span class="error-icon">⚠️</span>
            <span class="error-message">${item.error}</span>
          </div>
        ` : ''}
        
        ${item.result ? `
          <div class="queue-item-result">
            <span class="result-type">${item.result.analysisType}</span>
            <span class="result-score">+${item.result.relevanceBoost}%</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render empty queue
   */
  renderEmptyQueue() {
    return `
      <div class="empty-queue">
        <div class="empty-icon">📋</div>
        <h3>No Files in Queue</h3>
        <p>Add files from the Discovery view to start AI analysis.</p>
        <button class="btn btn-primary" id="add-files-empty">
          ➕ Add Files to Analyze
        </button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Provider selection
    document.getElementById('provider-select')?.addEventListener('change', (e) => {
      this.config.provider = e.target.value;
      this.updateProviderDisplay();
    });
    
    // Template selection
    document.getElementById('template-select')?.addEventListener('change', (e) => {
      this.config.template = e.target.value;
    });
    
    // Batch size
    document.getElementById('batch-size')?.addEventListener('change', (e) => {
      this.config.batchSize = parseInt(e.target.value) || 5;
    });
    
    // Analysis controls
    document.getElementById('start-analysis')?.addEventListener('click', () => {
      this.startAnalysis();
    });
    
    document.getElementById('stop-analysis')?.addEventListener('click', () => {
      this.stopAnalysis();
    });
    
    document.getElementById('add-files')?.addEventListener('click', () => {
      this.openFileSelector();
    });
    
    document.getElementById('add-files-empty')?.addEventListener('click', () => {
      this.openFileSelector();
    });
    
    document.getElementById('clear-queue')?.addEventListener('click', () => {
      this.clearQueue();
    });
    
    // Terminal controls
    document.getElementById('clear-terminal')?.addEventListener('click', () => {
      this.clearTerminal();
    });
    
    document.getElementById('export-logs')?.addEventListener('click', () => {
      this.exportLogs();
    });
    
    // Provider cards
    document.querySelectorAll('.provider-card').forEach(card => {
      card.addEventListener('click', () => {
        const provider = card.dataset.provider;
        if (this.providers[provider].status === 'online') {
          this.config.provider = provider;
          document.getElementById('provider-select').value = provider;
          this.updateProviderDisplay();
        }
      });
    });
    
    // Queue filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.filterQueue(filter);
        
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(e) {
    if (!this.container || !this.container.contains(document.activeElement)) {
      return;
    }
    
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (!this.processing && this.queue.length > 0) {
            this.startAnalysis();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (this.processing) {
            this.stopAnalysis();
          }
          break;
      }
    }
  }

  // === ANALYSIS OPERATIONS ===

  /**
   * Start analysis
   */
  async startAnalysis() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    this.progress.startTime = Date.now();
    
    this.addTerminalLine('Analysis started', 'info');
    this.addTerminalLine(`Provider: ${this.providers[this.config.provider].name}`, 'info');
    this.addTerminalLine(`Template: ${this.config.template}`, 'info');
    this.addTerminalLine(`Batch size: ${this.config.batchSize}`, 'info');
    
    this.render();
    
    // Process queue in batches
    while (this.queue.filter(item => item.status === 'pending').length > 0 && this.processing) {
      await this.processBatch();
    }
    
    this.processing = false;
    this.addTerminalLine('Analysis completed', 'success');
    this.render();
  }

  /**
   * Process a batch of files
   */
  async processBatch() {
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    const batch = pendingItems.slice(0, this.config.batchSize);
    
    if (batch.length === 0) return;
    
    this.currentBatch = batch;
    
    // Update status to processing
    batch.forEach(item => {
      item.status = 'processing';
      item.progress = 0;
    });
    
    this.render();
    
    // Process each item
    for (const item of batch) {
      if (!this.processing) break;
      
      await this.processItem(item);
    }
    
    this.currentBatch = null;
  }

  /**
   * Process single item
   */
  async processItem(item) {
    try {
      this.addTerminalLine(`Analyzing: ${item.file.name}`, 'info');
      
      // Call V1 analysis
      const result = await legacyBridge.executeV1Function(
        'AnalysisManager.analyzeFile',
        item.file,
        {
          provider: this.config.provider,
          template: this.config.template
        }
      );
      
      item.status = 'completed';
      item.result = result;
      item.progress = 100;
      
      this.progress.completed++;
      
      this.addTerminalLine(`✅ ${item.file.name}: ${result.analysisType} (+${result.relevanceBoost}%)`, 'success');
      
    } catch (error) {
      item.status = 'failed';
      item.error = error.message;
      item.attempts++;
      
      this.progress.failed++;
      
      this.addTerminalLine(`❌ ${item.file.name}: ${error.message}`, 'error');
      
      // Auto-retry if enabled
      if (this.config.autoRetry && item.attempts < this.config.maxRetries) {
        this.addTerminalLine(`Retrying ${item.file.name} (attempt ${item.attempts + 1})`, 'warning');
        item.status = 'pending';
        this.progress.failed--;
      }
    }
    
    this.updateProgressDisplay();
  }

  /**
   * Stop analysis
   */
  stopAnalysis() {
    this.processing = false;
    this.addTerminalLine('Analysis stopped by user', 'warning');
    
    // Reset processing items to pending
    this.queue.forEach(item => {
      if (item.status === 'processing') {
        item.status = 'pending';
        item.progress = 0;
      }
    });
    
    this.render();
  }

  /**
   * Open file selector
   */
  async openFileSelector() {
    try {
      // Get approved files that haven't been analyzed
      const files = appState.getFiles();
      const availableFiles = files.filter(f => f.approved && !f.analyzed);
      
      if (availableFiles.length === 0) {
        this.showNotification('No approved files available for analysis', 'warning');
        return;
      }
      
      // TODO: Implement file selector modal
      // For now, add all available files
      const newItems = availableFiles.map(file => ({
        id: file.id,
        file: file,
        status: 'pending',
        attempts: 0,
        error: null
      }));
      
      this.queue.push(...newItems);
      this.updateProgress({
        total: this.queue.length,
        pending: this.queue.filter(i => i.status === 'pending').length
      });
      
      this.render();
      this.showNotification(`Added ${newItems.length} files to queue`, 'success');
      
    } catch (error) {
      console.error('[AnalysisView] Failed to add files:', error);
      this.showNotification('Failed to add files: ' + error.message, 'error');
    }
  }

  /**
   * Clear queue
   */
  clearQueue() {
    if (!confirm('Clear all items from the analysis queue?')) return;
    
    this.queue = [];
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      startTime: null,
      estimatedTime: null
    };
    
    this.render();
    this.addTerminalLine('Queue cleared', 'info');
  }

  /**
   * Retry failed item
   */
  retryItem(itemId) {
    const item = this.queue.find(i => i.id === itemId);
    if (!item || item.status !== 'failed') return;
    
    item.status = 'pending';
    item.error = null;
    item.attempts = 0;
    
    this.progress.failed--;
    this.progress.pending++;
    
    this.render();
    this.addTerminalLine(`Retry queued: ${item.file.name}`, 'info');
  }

  /**
   * Remove item from queue
   */
  removeItem(itemId) {
    const index = this.queue.findIndex(i => i.id === itemId);
    if (index === -1) return;
    
    const item = this.queue[index];
    this.queue.splice(index, 1);
    
    // Update progress
    if (item.status === 'completed') this.progress.completed--;
    else if (item.status === 'failed') this.progress.failed--;
    else if (item.status === 'pending') this.progress.pending--;
    
    this.progress.total--;
    
    this.render();
  }

  // === TERMINAL OPERATIONS ===

  /**
   * Add line to terminal
   */
  addTerminalLine(message, level = 'info') {
    const line = {
      timestamp: Date.now(),
      message,
      level
    };
    
    this.terminalLines.push(line);
    
    // Limit terminal lines
    if (this.terminalLines.length > this.maxTerminalLines) {
      this.terminalLines = this.terminalLines.slice(-this.maxTerminalLines);
    }
    
    // Update terminal display
    this.updateTerminalDisplay();
  }

  /**
   * Update terminal display
   */
  updateTerminalDisplay() {
    const terminal = document.getElementById('terminal-output');
    if (!terminal) return;
    
    // Add new line
    const lastLine = this.terminalLines[this.terminalLines.length - 1];
    if (lastLine) {
      const lineHtml = this.renderTerminalLine(lastLine);
      terminal.insertAdjacentHTML('beforeend', lineHtml);
      
      // Auto-scroll to bottom
      terminal.scrollTop = terminal.scrollHeight;
    }
  }

  /**
   * Clear terminal
   */
  clearTerminal() {
    this.terminalLines = [];
    const terminal = document.getElementById('terminal-output');
    if (terminal) {
      terminal.innerHTML = '';
    }
  }

  /**
   * Export logs
   */
  exportLogs() {
    const logs = this.terminalLines.map(line => {
      const timestamp = new Date(line.timestamp).toISOString();
      return `[${timestamp}] [${line.level.toUpperCase()}] ${line.message}`;
    }).join('\n');
    
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Logs exported successfully', 'success');
  }

  // === UTILITY METHODS ===

  /**
   * Group queue by status
   */
  groupQueueByStatus() {
    return {
      pending: this.queue.filter(i => i.status === 'pending'),
      processing: this.queue.filter(i => i.status === 'processing'),
      completed: this.queue.filter(i => i.status === 'completed'),
      failed: this.queue.filter(i => i.status === 'failed')
    };
  }

  /**
   * Filter queue display
   */
  filterQueue(filter) {
    const items = document.querySelectorAll('.queue-item');
    items.forEach(item => {
      if (filter === 'all') {
        item.style.display = '';
      } else {
        const hasClass = item.classList.contains(filter);
        item.style.display = hasClass ? '' : 'none';
      }
    });
  }

  /**
   * Update progress display
   */
  updateProgressDisplay() {
    const progressSection = document.querySelector('.progress-section');
    if (progressSection) {
      progressSection.outerHTML = this.renderProgressSection();
    }
  }

  /**
   * Update provider display
   */
  updateProviderDisplay() {
    const providerPanel = document.querySelector('.provider-status-panel');
    if (providerPanel) {
      providerPanel.outerHTML = this.renderProviderStatus();
    }
  }

  /**
   * Update time estimates
   */
  updateTimeEstimates() {
    if (!this.progress.startTime || this.progress.completed === 0) return;
    
    const elapsed = Date.now() - this.progress.startTime;
    const avgTimePerItem = elapsed / this.progress.completed;
    const remaining = this.progress.total - this.progress.completed;
    
    this.progress.estimatedTime = remaining * avgTimePerItem;
  }

  /**
   * Get elapsed time
   */
  getElapsedTime() {
    if (!this.progress.startTime) return '00:00:00';
    
    const elapsed = Date.now() - this.progress.startTime;
    return this.formatDuration(elapsed);
  }

  /**
   * Get estimated time
   */
  getEstimatedTime() {
    if (!this.progress.estimatedTime) return '--:--:--';
    
    return this.formatDuration(this.progress.estimatedTime);
  }

  /**
   * Format duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const h = hours.toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    
    return `${h}:${m}:${s}`;
  }

  /**
   * Format number
   */
  formatNumber(num) {
    return num.toLocaleString();
  }

  /**
   * Capitalize string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get stats
   */
  getStats() {
    const grouped = this.groupQueueByStatus();
    return {
      queue: this.queue.length,
      processing: grouped.processing.length,
      completed: grouped.completed.length,
      failed: grouped.failed.length
    };
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    console.log(`[AnalysisView] ${type.toUpperCase()}: ${message}`);
    this.addTerminalLine(message, type);
  }

  /**
   * Render error state
   */
  renderError(message) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Analysis View Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          🔄 Reload Page
        </button>
      </div>
    `;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Destroy the view
   */
  destroy() {
    this.cleanup();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log('[AnalysisView] Destroyed');
  }

  // === EVENT HANDLERS ===

  /**
   * Handle analysis started event
   */
  onAnalysisStarted(data) {
    const item = this.queue.find(i => i.id === data.fileId);
    if (item) {
      item.status = 'processing';
      item.progress = 10;
      this.render();
    }
  }

  /**
   * Handle analysis completed event
   */
  onAnalysisCompleted(data) {
    const item = this.queue.find(i => i.id === data.fileId);
    if (item) {
      item.status = 'completed';
      item.progress = 100;
      item.result = data.result;
      this.progress.completed++;
      this.render();
    }
  }

  /**
   * Handle analysis failed event
   */
  onAnalysisFailed(data) {
    const item = this.queue.find(i => i.id === data.fileId);
    if (item) {
      item.status = 'failed';
      item.error = data.error;
      this.progress.failed++;
      this.render();
    }
  }
}

// Create global instance for onclick handlers
window.analysisView = null;

export default AnalysisView;