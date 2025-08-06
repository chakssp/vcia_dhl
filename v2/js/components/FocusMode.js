/**
 * FocusMode.js - Progressive disclosure pattern for V2.1
 * 
 * Simplifies the interface by hiding advanced features
 * and showing only essential elements for the current task
 */

import eventBus, { Events } from '../core/EventBus.js';
import appState from '../core/AppState.js';

export class FocusMode {
  constructor() {
    this.modes = {
      'simple': {
        name: 'Simple Mode',
        description: 'Essential features only',
        visible: [
          // Discovery essentials
          '.view-header',
          '#btn-select-directory',
          '.file-list',
          '#discovered-files',
          '.file-preview-panel',
          '.preview-content',
          
          // Basic stats
          '.results-stats',
          
          // Navigation
          '.nav-menu',
          '.status-bar'
        ],
        hidden: [
          // Advanced configuration
          '.pattern-config',
          '.directory-config',
          '#filter-panel-container',
          '.filter-advanced',
          
          // Secondary buttons
          '#btn-scan-options',
          '.directory-actions',
          
          // API monitoring
          '.status-api',
          '.status-qdrant'
        ]
      },
      'advanced': {
        name: 'Advanced Mode',
        description: 'All features available',
        visible: ['*'], // Everything visible
        hidden: []
      }
    };
    
    this.currentMode = 'simple';
    this.initialized = false;
  }

  /**
   * Initialize Focus Mode
   */
  initialize() {
    if (this.initialized) return;
    
    // Load saved mode preference
    const savedMode = appState.get('focusMode') || 'simple';
    this.currentMode = savedMode;
    
    // Create toggle button
    this.createToggleButton();
    
    // Apply initial mode
    this.applyMode();
    
    // Listen for keyboard shortcut
    this.setupKeyboardShortcut();
    
    this.initialized = true;
    console.log('[FocusMode] Initialized in', this.currentMode, 'mode');
  }

  /**
   * Create focus mode toggle button
   */
  createToggleButton() {
    // Add to status bar
    const statusRight = document.querySelector('.status-right');
    if (statusRight) {
      // Insert before the first item
      const firstItem = statusRight.querySelector('.status-item');
      
      const toggleContainer = document.createElement('span');
      toggleContainer.innerHTML = `
        <button id="focus-mode-toggle" class="focus-mode-toggle" title="Toggle Focus Mode (F9)">
          <span class="focus-mode-icon">🎯</span>
          <span class="focus-mode-label">${this.modes[this.currentMode].name}</span>
        </button>
        <span class="status-separator">|</span>
      `;
      
      statusRight.insertBefore(toggleContainer, firstItem);
      
      // Add click handler
      document.getElementById('focus-mode-toggle').addEventListener('click', () => {
        this.toggle();
      });
    }
    
    // Add styles
    this.injectStyles();
  }

  /**
   * Inject Focus Mode styles
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .focus-mode-toggle {
        background: transparent;
        border: 1px solid var(--border-secondary);
        color: var(--text-primary);
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }
      
      .focus-mode-toggle:hover {
        background: var(--bg-hover);
        border-color: var(--accent-primary);
      }
      
      .focus-mode-toggle.active {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
      }
      
      .focus-mode-icon {
        font-size: 14px;
      }
      
      /* Smooth transitions for hidden elements */
      .focus-mode-hidden {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: scale(0.98) !important;
        max-height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        transition: all 0.3s ease !important;
      }
      
      /* Adjust layout when elements are hidden */
      .discovery-panel {
        transition: all 0.3s ease;
      }
      
      .simple-mode .discovery-panel {
        grid-template-columns: 1fr;
      }
      
      .simple-mode .results-section {
        margin-top: 20px;
      }
      
      /* Focus mode indicator */
      .focus-mode-indicator {
        position: fixed;
        top: 60px;
        right: 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 12px;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s;
        z-index: 1000;
      }
      
      .focus-mode-indicator.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Simple mode specific styles */
      .simple-mode .file-item {
        padding: 12px 16px;
      }
      
      .simple-mode .file-item-preview {
        max-height: 60px;
        overflow: hidden;
      }
      
      /* Tooltip for hidden features */
      .focus-mode-tooltip {
        position: absolute;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        white-space: nowrap;
        z-index: 1001;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .focus-mode-tooltip.show {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup keyboard shortcut (F9)
   */
  setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Toggle between modes
   */
  toggle() {
    this.currentMode = this.currentMode === 'simple' ? 'advanced' : 'simple';
    this.applyMode();
    
    // Save preference
    appState.set('focusMode', this.currentMode);
    
    // Update button
    const button = document.getElementById('focus-mode-toggle');
    if (button) {
      button.querySelector('.focus-mode-label').textContent = this.modes[this.currentMode].name;
      button.classList.toggle('active', this.currentMode === 'advanced');
    }
    
    // Show indicator
    this.showModeIndicator();
    
    // Emit event
    eventBus.emit('focusMode:changed', { mode: this.currentMode });
    
    console.log('[FocusMode] Switched to', this.currentMode);
  }

  /**
   * Apply current mode
   */
  applyMode() {
    const mode = this.modes[this.currentMode];
    
    // Add mode class to body
    document.body.classList.remove('simple-mode', 'advanced-mode');
    document.body.classList.add(`${this.currentMode}-mode`);
    
    // Reset all elements
    document.querySelectorAll('.focus-mode-hidden').forEach(el => {
      el.classList.remove('focus-mode-hidden');
    });
    
    // Hide elements for simple mode
    if (this.currentMode === 'simple') {
      mode.hidden.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.classList.add('focus-mode-hidden');
        });
      });
    }
    
    // Adjust layout
    this.adjustLayout();
  }

  /**
   * Adjust layout based on mode
   */
  adjustLayout() {
    // In simple mode, expand file list to use full width
    if (this.currentMode === 'simple') {
      const discoveryPanel = document.querySelector('.discovery-panel');
      if (discoveryPanel) {
        // File list takes full width when config is hidden
        const fileList = discoveryPanel.querySelector('.results-section');
        if (fileList) {
          fileList.style.gridColumn = '1 / -1';
        }
      }
    } else {
      // Reset to original layout
      const fileList = document.querySelector('.results-section');
      if (fileList) {
        fileList.style.gridColumn = '';
      }
    }
  }

  /**
   * Show mode change indicator
   */
  showModeIndicator() {
    // Remove existing indicator
    const existing = document.querySelector('.focus-mode-indicator');
    if (existing) existing.remove();
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'focus-mode-indicator';
    indicator.textContent = `Switched to ${this.modes[this.currentMode].name}`;
    document.body.appendChild(indicator);
    
    // Show with animation
    requestAnimationFrame(() => {
      indicator.classList.add('show');
    });
    
    // Hide after 2 seconds
    setTimeout(() => {
      indicator.classList.remove('show');
      setTimeout(() => indicator.remove(), 300);
    }, 2000);
  }

  /**
   * Check if element should be visible
   */
  isElementVisible(element) {
    if (this.currentMode === 'advanced') return true;
    
    const mode = this.modes[this.currentMode];
    
    // Check if element matches any visible selector
    return mode.visible.some(selector => {
      if (selector === '*') return true;
      return element.matches(selector) || element.closest(selector);
    });
  }

  /**
   * Get current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Get mode info
   */
  getModeInfo() {
    return this.modes[this.currentMode];
  }
}

// Create singleton instance
export const focusMode = new FocusMode();

export default focusMode;