/**
 * StatusBar - Real-time status indicators and information
 * #FE-002 - Frontend Engineers Team
 */

import eventBus, { Events } from '../core/EventBus.js';
import appState from '../core/AppState.js';
import { legacyBridge } from '../core/LegacyBridge.js';

export class StatusBar {
  constructor(apiService) {
    this.apiService = apiService;
    this.elements = {};
    this.updateInterval = null;
    this.statusChecks = new Map();
  }

  /**
   * Initialize status bar
   */
  initialize() {
    // Get DOM elements
    this.elements = {
      mode: document.getElementById('status-mode'),
      files: document.getElementById('status-files'),
      message: document.getElementById('status-message'),
      api: document.getElementById('status-api'),
      apiIndicator: document.querySelector('#status-api .status-indicator'),
      qdrant: document.getElementById('status-qdrant'),
      qdrantIndicator: document.querySelector('#status-qdrant .status-indicator'),
      time: document.getElementById('status-time')
    };
    
    // Start time update
    this.startTimeUpdate();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initial status checks
    this.checkAPIStatus();
    this.checkQdrantStatus();
    this.updateFileCount();
    
    // Start periodic status checks
    this.startStatusChecks();
    
    console.log('[StatusBar] Initialized');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for file updates
    eventBus.on('v1:files_updated', () => {
      this.updateFileCount();
    });
    
    eventBus.on(Events.STATE_CHANGE, ({ key }) => {
      if (key === 'files' || key === 'v1_files') {
        this.updateFileCount();
      }
    });
    
    // Listen for API events
    eventBus.on(Events.API_REQUEST, () => {
      this.setAPIStatus('active');
    });
    
    eventBus.on(Events.API_RESPONSE, () => {
      this.setAPIStatus('online');
    });
    
    eventBus.on(Events.API_ERROR, () => {
      this.setAPIStatus('error');
    });
    
    // Listen for system messages
    eventBus.on(Events.SYSTEM_INFO, ({ message }) => {
      this.showMessage(message, 'info');
    });
    
    eventBus.on(Events.SYSTEM_WARNING, ({ message }) => {
      this.showMessage(message, 'warning');
    });
    
    eventBus.on(Events.SYSTEM_ERROR, ({ message }) => {
      this.showMessage(message, 'error');
    });
  }

  /**
   * Start time update interval
   */
  startTimeUpdate() {
    const updateTime = () => {
      if (this.elements.time) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.elements.time.textContent = `${hours}:${minutes}`;
      }
    };
    
    updateTime();
    this.updateInterval = setInterval(updateTime, 1000);
  }

  /**
   * Start periodic status checks
   */
  startStatusChecks() {
    // Check API status every 30 seconds
    this.statusChecks.set('api', setInterval(() => {
      this.checkAPIStatus();
    }, 30000));
    
    // Check Qdrant status every 45 seconds
    this.statusChecks.set('qdrant', setInterval(() => {
      this.checkQdrantStatus();
    }, 45000));
  }

  /**
   * Check API status
   */
  async checkAPIStatus() {
    try {
      const health = await this.apiService.checkHealth();
      if (health.status === 'ok') {
        this.setAPIStatus('online');
      } else {
        this.setAPIStatus('warning');
      }
    } catch (error) {
      this.setAPIStatus('offline');
    }
  }

  /**
   * Check Qdrant status
   */
  async checkQdrantStatus() {
    try {
      // Try V2 endpoint first
      const response = await fetch('http://localhost:3333/api/qdrant/health').catch(() => null);
      
      if (response && response.ok) {
        this.setQdrantStatus('online');
        return;
      }
      
      // Try V1 Qdrant service
      if (legacyBridge.initialized && legacyBridge.qdrantService) {
        const stats = await legacyBridge.qdrantService.getStats();
        if (stats) {
          this.setQdrantStatus('online');
          return;
        }
      }
      
      this.setQdrantStatus('offline');
    } catch (error) {
      this.setQdrantStatus('offline');
    }
  }

  /**
   * Update file count
   */
  updateFileCount() {
    const files = appState.getFiles();
    const count = files.length;
    
    if (this.elements.files) {
      this.elements.files.textContent = `${count} arquivo${count !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Set API status
   */
  setAPIStatus(status) {
    if (!this.elements.apiIndicator) return;
    
    // Remove all status classes
    this.elements.apiIndicator.classList.remove('online', 'offline', 'warning', 'active');
    
    switch (status) {
      case 'online':
        this.elements.apiIndicator.classList.add('online');
        break;
      case 'offline':
        this.elements.apiIndicator.classList.add('offline');
        break;
      case 'warning':
        this.elements.apiIndicator.classList.add('warning');
        break;
      case 'active':
        this.elements.apiIndicator.classList.add('online', 'pulse');
        setTimeout(() => {
          this.elements.apiIndicator.classList.remove('pulse');
        }, 1000);
        break;
      case 'error':
        this.elements.apiIndicator.classList.add('offline');
        this.showMessage('API error', 'error');
        break;
    }
  }

  /**
   * Set Qdrant status
   */
  setQdrantStatus(status) {
    if (!this.elements.qdrantIndicator) return;
    
    // Remove all status classes
    this.elements.qdrantIndicator.classList.remove('online', 'offline', 'warning');
    
    switch (status) {
      case 'online':
        this.elements.qdrantIndicator.classList.add('online');
        break;
      case 'offline':
        this.elements.qdrantIndicator.classList.add('offline');
        break;
      case 'warning':
        this.elements.qdrantIndicator.classList.add('warning');
        break;
    }
  }

  /**
   * Show status message
   */
  showMessage(message, type = 'info', duration = 3000) {
    if (!this.elements.message) return;
    
    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    // Set message
    this.elements.message.textContent = message;
    this.elements.message.className = `status-message visible ${type}`;
    
    // Auto-hide after duration
    if (duration > 0) {
      this.messageTimeout = setTimeout(() => {
        this.hideMessage();
      }, duration);
    }
  }

  /**
   * Hide status message
   */
  hideMessage() {
    if (this.elements.message) {
      this.elements.message.classList.remove('visible');
      
      // Clear text after animation
      setTimeout(() => {
        this.elements.message.textContent = '';
      }, 300);
    }
  }

  /**
   * Update status with object
   */
  updateStatus(updates) {
    if (updates.mode && this.elements.mode) {
      this.elements.mode.textContent = updates.mode;
    }
    
    if (updates.files !== undefined) {
      this.updateFileCount();
    }
    
    if (updates.api !== undefined) {
      this.setAPIStatus(updates.api);
    }
    
    if (updates.qdrant !== undefined) {
      this.setQdrantStatus(updates.qdrant);
    }
    
    if (updates.message) {
      this.showMessage(updates.message, updates.messageType || 'info');
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      mode: this.elements.mode?.textContent || '',
      files: appState.getFiles().length,
      api: this.elements.apiIndicator?.classList.contains('online') ? 'online' : 'offline',
      qdrant: this.elements.qdrantIndicator?.classList.contains('online') ? 'online' : 'offline',
      time: this.elements.time?.textContent || ''
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    // Clear intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Clear status check intervals
    this.statusChecks.forEach(interval => clearInterval(interval));
    this.statusChecks.clear();
    
    // Clear message timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
  }
}

// Create singleton instance
export const statusBar = new StatusBar();