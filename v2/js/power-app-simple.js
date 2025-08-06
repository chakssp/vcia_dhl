/**
 * Power User Application - Simplified Version for Testing
 * Terminal-inspired knowledge consolidator interface
 */

import KeyboardManager from './keyboard-manager.js';
import CommandPalette from './command-palette.js';

class PowerApp {
  constructor() {
    console.log('PowerApp: Constructor started');
    
    // Core managers
    this.keyboardManager = null;
    this.commandPalette = null;
    
    // Application state
    this.state = {
      currentView: 'list',
      sidebarCollapsed: false,
      detailsPanelVisible: true,
      selectedFiles: new Set(),
      files: [],
      categories: []
    };
    
    // DOM references
    this.dom = {};
    
    // Stats
    this.stats = {
      totalFiles: 0,
      analyzedFiles: 0,
      avgConfidence: 0,
      processingStatus: 'Ready'
    };
    
    this.init();
  }

  async init() {
    console.log('PowerApp: Init started');
    try {
      await this.setupDOM();
      await this.setupManagers();
      await this.setupEventListeners();
      
      console.log('PowerApp initialized successfully');
      this.setStatus('Ready');
    } catch (error) {
      console.error('Failed to initialize PowerApp:', error);
      this.setStatus('Error during initialization');
    }
  }

  setupDOM() {
    console.log('PowerApp: Setting up DOM');
    
    this.dom = {
      // Status bar
      filesCount: document.getElementById('files-count'),
      currentOperation: document.getElementById('current-operation'),
      
      // Controls
      commandTrigger: document.querySelector('.command-trigger'),
      collapseBtn: document.querySelector('.collapse-btn'),
      panelClose: document.querySelector('.panel-close'),
      
      // Main containers
      splitContainer: document.querySelector('.split-container'),
      sidebar: document.querySelector('.sidebar'),
      fileList: document.getElementById('file-list'),
      
      // Action buttons
      actionBtns: document.querySelectorAll('.action-btn')
    };
    
    console.log('DOM elements found:', Object.keys(this.dom).filter(key => this.dom[key]));
  }

  async setupManagers() {
    console.log('PowerApp: Setting up managers');
    
    try {
      this.keyboardManager = new KeyboardManager();
      console.log('KeyboardManager initialized');
    } catch (error) {
      console.error('Failed to initialize KeyboardManager:', error);
    }
    
    try {
      this.commandPalette = new CommandPalette();
      console.log('CommandPalette initialized');
    } catch (error) {
      console.error('Failed to initialize CommandPalette:', error);
    }
  }

  setupEventListeners() {
    console.log('PowerApp: Setting up event listeners');
    
    // Command trigger
    if (this.dom.commandTrigger) {
      this.dom.commandTrigger.addEventListener('click', () => {
        console.log('Command trigger clicked');
        this.commandPalette.toggle();
      });
    }
    
    // Collapse button
    if (this.dom.collapseBtn) {
      this.dom.collapseBtn.addEventListener('click', () => {
        console.log('Collapse button clicked');
        this.toggleSidebar();
      });
    }
    
    // Action buttons
    this.dom.actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        console.log('Action button clicked:', action);
        this.handleAction(action);
      });
    });
    
    // Listen for keyboard shortcuts
    window.addEventListener('keyboard:action', (event) => {
      console.log('Keyboard action:', event.detail);
      this.handleKeyboardAction(event.detail.actionId);
    });
    
    // Listen for command execution
    window.addEventListener('command-palette:execute', (event) => {
      console.log('Command executed:', event.detail);
      this.handleAction(event.detail.commandId);
    });
  }

  handleAction(action) {
    console.log('Handling action:', action);
    
    switch (action) {
      case 'discover':
        this.discoverFiles();
        break;
      case 'analyze':
        alert('Analyze functionality coming soon!');
        break;
      case 'export':
        alert('Export functionality coming soon!');
        break;
      case 'settings':
        alert('Settings coming soon!');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  handleKeyboardAction(actionId) {
    switch (actionId) {
      case 'toggle-command-palette':
        this.commandPalette.toggle();
        break;
      case 'toggle-sidebar':
        this.toggleSidebar();
        break;
      case 'discover-files':
        this.discoverFiles();
        break;
      default:
        console.log('Unhandled keyboard action:', actionId);
    }
  }

  toggleSidebar() {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    if (this.dom.splitContainer) {
      this.dom.splitContainer.classList.toggle('sidebar-collapsed', this.state.sidebarCollapsed);
    }
    console.log('Sidebar toggled:', this.state.sidebarCollapsed ? 'collapsed' : 'expanded');
  }

  async discoverFiles() {
    this.setStatus('Discovering files...');
    
    // Simulate file discovery
    setTimeout(() => {
      this.state.files = this.generateMockFiles(10);
      this.updateStats();
      this.renderFileList();
      this.setStatus('Discovery complete');
    }, 2000);
  }

  generateMockFiles(count) {
    const files = [];
    for (let i = 0; i < count; i++) {
      files.push({
        id: `file-${i}`,
        name: `document-${i}.md`,
        path: `/test/document-${i}.md`,
        relevanceScore: Math.random() * 100,
        lastModified: new Date()
      });
    }
    return files;
  }

  renderFileList() {
    if (!this.dom.fileList) return;
    
    const html = this.state.files.map(file => `
      <div class="file-item" data-file-id="${file.id}">
        <div class="file-checkbox"></div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-path">${file.path}</div>
        </div>
        <div class="file-relevance">
          <span>${Math.round(file.relevanceScore)}%</span>
          <div class="relevance-bar">
            <div class="relevance-fill" style="width: ${file.relevanceScore}%"></div>
          </div>
        </div>
        <div class="file-date">${file.lastModified.toLocaleDateString()}</div>
        <div class="file-status">
          <span class="status-badge">Pending</span>
        </div>
      </div>
    `).join('');
    
    this.dom.fileList.innerHTML = html;
  }

  updateStats() {
    this.stats.totalFiles = this.state.files.length;
    
    if (this.dom.filesCount) {
      this.dom.filesCount.textContent = `${this.stats.totalFiles} files`;
    }
  }

  setStatus(status) {
    this.stats.processingStatus = status;
    if (this.dom.currentOperation) {
      this.dom.currentOperation.textContent = status;
    }
    console.log(`Status: ${status}`);
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing PowerApp');
  window.powerApp = new PowerApp();
});

// Export for debugging
export default PowerApp;