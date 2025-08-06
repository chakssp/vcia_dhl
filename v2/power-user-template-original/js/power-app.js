/**
 * Power User Application Main Logic
 * Terminal-inspired knowledge consolidator interface
 */

import KeyboardManager from './keyboard-manager.js';
import CommandPalette from './command-palette.js';

class PowerApp {
  constructor() {
    // Core managers
    this.keyboardManager = null;
    this.commandPalette = null;
    
    // Application state
    this.state = {
      currentView: 'list', // list, grid, graph
      sidebarCollapsed: false,
      detailsPanelVisible: true,
      selectedFiles: new Set(),
      files: [],
      categories: [],
      filters: {
        relevance: 'all',
        status: 'all',
        timeRange: 'all',
        fileType: 'all'
      },
      sortBy: 'relevance',
      sortDirection: 'desc'
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
    
    // Bind methods
    this.handleKeyboardAction = this.handleKeyboardAction.bind(this);
    this.handleCommandExecution = this.handleCommandExecution.bind(this);
    this.handleViewChange = this.handleViewChange.bind(this);
    this.handleFileSelection = this.handleFileSelection.bind(this);
    
    this.init();
  }

  async init() {
    try {
      await this.setupDOM();
      await this.setupManagers();
      await this.setupEventListeners();
      await this.loadInitialData();
      await this.updateUI();
      
      console.log('PowerApp initialized successfully');
      this.setStatus('Ready');
    } catch (error) {
      console.error('Failed to initialize PowerApp:', error);
      this.setStatus('Error during initialization');
    }
  }

  setupDOM() {
    // Cache important DOM references
    this.dom = {
      // Layout elements
      splitContainer: document.querySelector('.split-container'),
      sidebar: document.querySelector('.sidebar'),
      mainContent: document.querySelector('.main-content'),
      detailsPanel: document.querySelector('.details-panel'),
      
      // Status bar
      statusBar: document.querySelector('.status-bar'),
      filesCount: document.getElementById('files-count'),
      activeFilter: document.getElementById('active-filter'),
      currentOperation: document.getElementById('current-operation'),
      confidenceAvg: document.getElementById('confidence-avg'),
      analysisProgress: document.getElementById('analysis-progress'),
      
      // Controls
      commandTrigger: document.querySelector('.command-trigger'),
      collapseBtn: document.querySelector('.collapse-btn'),
      panelClose: document.querySelector('.panel-close'),
      
      // Views
      viewBtns: document.querySelectorAll('.view-btn'),
      listView: document.getElementById('list-view'),
      gridView: document.getElementById('grid-view'),
      graphView: document.getElementById('graph-view'),
      
      // File list
      fileList: document.getElementById('file-list'),
      bulkActions: document.getElementById('bulk-actions'),
      bulkCount: document.getElementById('bulk-count'),
      sortSelect: document.getElementById('sort-select'),
      sortDirection: document.getElementById('sort-direction'),
      
      // Filters
      relevanceFilter: document.getElementById('relevance-filter'),
      statusFilter: document.getElementById('status-filter'),
      timeFilter: document.getElementById('time-filter'),
      typeFilter: document.getElementById('type-filter'),
      
      // Search
      searchInput: document.getElementById('search-input'),
      
      // Categories
      categoriesList: document.getElementById('categories-list'),
      addCategoryBtn: document.querySelector('.add-category-btn'),
      
      // Overlays
      shortcutsHelp: document.getElementById('shortcuts-help'),
      shortcutsClose: document.querySelector('.shortcuts-close'),
      loadingIndicator: document.getElementById('loading-indicator')
    };
    
    // Validate critical DOM elements
    const critical = ['splitContainer', 'sidebar', 'mainContent', 'fileList'];
    for (const key of critical) {
      if (!this.dom[key]) {
        throw new Error(`Critical DOM element missing: ${key}`);
      }
    }
  }

  setupManagers() {
    // Initialize keyboard manager
    this.keyboardManager = new KeyboardManager();
    
    // Initialize command palette
    this.commandPalette = new CommandPalette();
  }

  setupEventListeners() {
    // Keyboard actions
    window.addEventListener('keyboard:action', this.handleKeyboardAction);
    
    // Command palette
    window.addEventListener('command-palette:execute', this.handleCommandExecution);
    if (this.dom.commandTrigger) {
      this.dom.commandTrigger.addEventListener('click', () => {
        this.commandPalette.toggle();
      });
    }
    
    // Layout controls
    if (this.dom.collapseBtn) {
      this.dom.collapseBtn.addEventListener('click', () => this.toggleSidebar());
    }
    
    if (this.dom.panelClose) {
      this.dom.panelClose.addEventListener('click', () => this.toggleDetailsPanel());
    }
    
    // View switching
    this.dom.viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });
    
    // Sort controls
    if (this.dom.sortSelect) {
      this.dom.sortSelect.addEventListener('change', (e) => {
        this.setSortBy(e.target.value);
      });
    }
    
    if (this.dom.sortDirection) {
      this.dom.sortDirection.addEventListener('click', () => {
        this.toggleSortDirection();
      });
    }
    
    // Filters
    const filterInputs = [
      this.dom.relevanceFilter,
      this.dom.statusFilter,
      this.dom.timeFilter,
      this.dom.typeFilter
    ];
    
    filterInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.updateFilters());
      }
    });
    
    // Search
    if (this.dom.searchInput) {
      this.dom.searchInput.addEventListener('input', (e) => {
        this.search(e.target.value);
      });
    }
    
    // Categories
    if (this.dom.addCategoryBtn) {
      this.dom.addCategoryBtn.addEventListener('click', () => {
        this.showAddCategoryDialog();
      });
    }
    
    // Shortcuts help
    if (this.dom.shortcutsClose) {
      this.dom.shortcutsClose.addEventListener('click', () => {
        this.hideShortcutsHelp();
      });
    }
    
    // Global click handler for file selection
    document.addEventListener('click', this.handleFileSelection);
    
    // Resize handling
    window.addEventListener('resize', () => this.handleResize());
  }

  handleKeyboardAction(event) {
    const { actionId } = event.detail;
    
    switch (actionId) {
      // Command palette
      case 'toggle-command-palette':
        this.commandPalette.toggle();
        break;
      
      // Layout
      case 'toggle-sidebar':
        this.toggleSidebar();
        break;
      case 'toggle-details':
        this.toggleDetailsPanel();
        break;
      case 'focus-search':
        this.focusSearch();
        break;
      
      // File operations
      case 'discover-files':
        this.discoverFiles();
        break;
      case 'analyze-files':
        this.analyzeFiles();
        break;
      case 'export-data':
        this.exportData();
        break;
      
      // Views
      case 'switch-view-list':
        this.switchView('list');
        break;
      case 'switch-view-grid':
        this.switchView('grid');
        break;
      case 'switch-view-graph':
        this.switchView('graph');
        break;
      
      // Selection
      case 'select-all':
        this.selectAllFiles();
        break;
      case 'clear-selection':
        this.clearSelection();
        break;
      
      // Help
      case 'show-shortcuts':
        this.showShortcutsHelp();
        break;
      
      default:
        console.log(`Unhandled keyboard action: ${actionId}`);
    }
  }

  handleCommandExecution(event) {
    const { commandId } = event.detail;
    
    // Map command IDs to actions
    const commandActions = {
      'discover': () => this.discoverFiles(),
      'analyze': () => this.analyzeFiles(),
      'export': () => this.exportData(),
      'settings': () => this.openSettings(),
      'shortcuts': () => this.showShortcutsHelp(),
      'toggle-sidebar': () => this.toggleSidebar(),
      'toggle-details': () => this.toggleDetailsPanel(),
      'focus-search': () => this.focusSearch(),
      'view-list': () => this.switchView('list'),
      'view-grid': () => this.switchView('grid'),
      'view-graph': () => this.switchView('graph'),
      'filter-all': () => this.resetFilters(),
      'filter-pending': () => this.setFilter('status', 'pending'),
      'filter-analyzed': () => this.setFilter('status', 'analyzed'),
      'select-all': () => this.selectAllFiles(),
      'select-none': () => this.clearSelection()
    };
    
    const action = commandActions[commandId];
    if (action) {
      action();
    } else {
      console.log(`Unhandled command: ${commandId}`);
    }
  }

  handleViewChange(view) {
    // Update view buttons
    this.dom.viewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update view containers
    [this.dom.listView, this.dom.gridView, this.dom.graphView].forEach(container => {
      if (container) {
        container.classList.toggle('active', container.id === `${view}-view`);
      }
    });
  }

  handleFileSelection(event) {
    // Check if clicked on status button
    const statusBtn = event.target.closest('[data-action="toggle-status"]');
    if (statusBtn) {
      event.preventDefault();
      event.stopPropagation();
      const fileId = statusBtn.dataset.fileId;
      this.toggleFileStatus(fileId);
      return;
    }

    const fileItem = event.target.closest('.file-item');
    if (!fileItem) return;
    
    const fileId = fileItem.dataset.fileId;
    if (!fileId) return;
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      this.toggleFileSelection(fileId);
    } else if (event.shiftKey) {
      // Range select
      this.rangeSelectFiles(fileId);
    } else {
      // Single select
      this.selectFile(fileId);
    }
    
    this.updateBulkActions();
  }

  handleResize() {
    // Handle responsive layout changes
    const width = window.innerWidth;
    
    if (width <= 768) {
      // Mobile layout
      if (!this.state.sidebarCollapsed) {
        this.state.sidebarCollapsed = true;
        this.updateLayoutClasses();
      }
    }
  }

  // Layout methods
  toggleSidebar() {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    this.updateLayoutClasses();
  }

  toggleDetailsPanel() {
    this.state.detailsPanelVisible = !this.state.detailsPanelVisible;
    this.updateLayoutClasses();
  }

  updateLayoutClasses() {
    if (this.dom.splitContainer) {
      this.dom.splitContainer.classList.toggle('sidebar-collapsed', this.state.sidebarCollapsed);
      this.dom.splitContainer.classList.toggle('details-hidden', !this.state.detailsPanelVisible);
    }
  }

  // View methods
  switchView(view) {
    if (this.state.currentView === view) return;
    
    this.state.currentView = view;
    this.handleViewChange(view);
    
    // Load view-specific data if needed
    switch (view) {
      case 'graph':
        this.loadGraphData();
        break;
      case 'grid':
        this.renderGridView();
        break;
      default:
        this.renderListView();
    }
  }

  // File operations
  async discoverFiles() {
    this.setStatus('Discovering files...');
    this.showLoading(true);
    
    try {
      // Simulate file discovery
      await this.simulateDelay(2000);
      
      // Mock file data
      this.state.files = this.generateMockFiles(50);
      this.updateStats();
      this.renderCurrentView();
      
      this.setStatus('Discovery complete');
    } catch (error) {
      console.error('File discovery failed:', error);
      this.setStatus('Discovery failed');
    } finally {
      this.showLoading(false);
    }
  }

  async analyzeFiles() {
    const selectedCount = this.state.selectedFiles.size;
    if (selectedCount === 0) {
      this.setStatus('No files selected for analysis');
      return;
    }
    
    this.setStatus(`Analyzing ${selectedCount} files...`);
    this.showLoading(true);
    
    try {
      // Simulate analysis
      await this.simulateDelay(3000);
      
      // Update analyzed files
      this.state.selectedFiles.forEach(fileId => {
        const file = this.state.files.find(f => f.id === fileId);
        if (file) {
          file.analyzed = true;
          file.confidence = Math.random() * 100;
        }
      });
      
      this.updateStats();
      this.renderCurrentView();
      this.clearSelection();
      
      this.setStatus('Analysis complete');
    } catch (error) {
      console.error('Analysis failed:', error);
      this.setStatus('Analysis failed');
    } finally {
      this.showLoading(false);
    }
  }

  async exportData() {
    this.setStatus('Exporting data...');
    this.showLoading(true);
    
    try {
      // Simulate export
      await this.simulateDelay(1500);
      
      const data = {
        files: this.state.files,
        categories: this.state.categories,
        stats: this.stats,
        exportedAt: new Date().toISOString()
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.setStatus('Export complete');
    } catch (error) {
      console.error('Export failed:', error);
      this.setStatus('Export failed');
    } finally {
      this.showLoading(false);
    }
  }

  // Selection methods
  selectFile(fileId) {
    this.state.selectedFiles.clear();
    this.state.selectedFiles.add(fileId);
    this.updateFileSelectionUI();
  }

  toggleFileSelection(fileId) {
    if (this.state.selectedFiles.has(fileId)) {
      this.state.selectedFiles.delete(fileId);
    } else {
      this.state.selectedFiles.add(fileId);
    }
    this.updateFileSelectionUI();
  }

  selectAllFiles() {
    this.state.files.forEach(file => {
      this.state.selectedFiles.add(file.id);
    });
    this.updateFileSelectionUI();
    this.updateBulkActions();
  }

  clearSelection() {
    this.state.selectedFiles.clear();
    this.updateFileSelectionUI();
    this.updateBulkActions();
  }

  // UI update methods
  updateStats() {
    this.stats.totalFiles = this.state.files.length;
    this.stats.analyzedFiles = this.state.files.filter(f => f.analyzed).length;
    this.stats.avgConfidence = this.calculateAverageConfidence();
    
    if (this.dom.filesCount) {
      this.dom.filesCount.textContent = `${this.stats.totalFiles} files`;
    }
    
    if (this.dom.confidenceAvg) {
      this.dom.confidenceAvg.textContent = `${Math.round(this.stats.avgConfidence)}%`;
    }
    
    if (this.dom.analysisProgress) {
      this.dom.analysisProgress.textContent = `${this.stats.analyzedFiles}/${this.stats.totalFiles}`;
    }
  }

  updateBulkActions() {
    const selectedCount = this.state.selectedFiles.size;
    
    if (this.dom.bulkActions) {
      this.dom.bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
    
    if (this.dom.bulkCount) {
      this.dom.bulkCount.textContent = `${selectedCount} selected`;
    }
  }

  updateFileSelectionUI() {
    // Update file item visual selection
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
      const fileId = item.dataset.fileId;
      const checkbox = item.querySelector('.file-checkbox');
      const isSelected = this.state.selectedFiles.has(fileId);
      
      item.classList.toggle('selected', isSelected);
      if (checkbox) {
        checkbox.classList.toggle('checked', isSelected);
      }
    });
  }

  renderCurrentView() {
    switch (this.state.currentView) {
      case 'grid':
        this.renderGridView();
        break;
      case 'graph':
        this.renderGraphView();
        break;
      default:
        this.renderListView();
    }
  }

  renderListView() {
    if (!this.dom.fileList) return;
    
    const filteredFiles = this.getFilteredFiles();
    
    if (filteredFiles.length === 0) {
      this.dom.fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>No files found</h3>
          <p>Try adjusting your filters or discover new files</p>
        </div>
      `;
      return;
    }
    
    const html = filteredFiles.map(file => {
      // Determina a cor da barra baseada na relevância
      let barColor = '#ef4444'; // red (baixa)
      if (file.relevance >= 70) barColor = '#22c55e'; // green (alta)
      else if (file.relevance >= 50) barColor = '#eab308'; // yellow (média)
      
      return `
        <div class="file-item" data-file-id="${file.id}">
          <div class="file-checkbox"></div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-path">${file.path}</div>
          </div>
          <div class="file-relevance">
            <span class="relevance-text">${Math.round(file.relevance)}%</span>
            <div class="relevance-bar">
              <div class="relevance-fill" style="width: ${file.relevance}%; background-color: ${barColor}"></div>
            </div>
          </div>
          <div class="file-date">${this.formatDate(file.modified)}</div>
          <div class="file-status">
            <button class="status-btn ${file.status}" data-file-id="${file.id}" data-action="toggle-status">
              ${file.status === 'pending' ? 'Pending' : 'Archived'}
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    this.dom.fileList.innerHTML = html;
  }

  renderGridView() {
    // Grid view implementation
    console.log('Rendering grid view...');
  }

  renderGraphView() {
    // Graph view implementation
    console.log('Rendering graph view...');
  }

  // Utility methods
  setStatus(status) {
    this.stats.processingStatus = status;
    if (this.dom.currentOperation) {
      this.dom.currentOperation.textContent = status;
    }
    console.log(`Status: ${status}`);
  }

  showLoading(show) {
    if (this.dom.loadingIndicator) {
      this.dom.loadingIndicator.setAttribute('aria-hidden', !show);
    }
  }

  focusSearch() {
    if (this.dom.searchInput) {
      this.dom.searchInput.focus();
    }
  }

  showShortcutsHelp() {
    if (this.dom.shortcutsHelp) {
      this.dom.shortcutsHelp.setAttribute('aria-hidden', 'false');
    }
  }

  hideShortcutsHelp() {
    if (this.dom.shortcutsHelp) {
      this.dom.shortcutsHelp.setAttribute('aria-hidden', 'true');
    }
  }

  async simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateMockFiles(count) {
    // Dados exatos do screenshot
    const screenshotFiles = [
      { name: 'project-plan-8.md', relevance: 46, date: 'Jun 8, 2025' },
      { name: 'meeting-notes-1.txt', relevance: 66, date: 'Jun 8, 2025' },
      { name: 'technical-spec-2.pdf', relevance: 76, date: 'Jun 8, 2025' },
      { name: 'user-story-3.docx', relevance: 35, date: 'Jun 8, 2025' },
      { name: 'design-doc-4.md', relevance: 65, date: 'Jun 8, 2025' },
      { name: 'project-plan-5.txt', relevance: 92, date: 'Jun 8, 2025' },
      { name: 'meeting-notes-6.pdf', relevance: 57, date: 'Jun 8, 2025' },
      { name: 'technical-spec-7.docx', relevance: 78, date: 'Jun 8, 2025' },
      { name: 'user-story-8.md', relevance: 38, date: 'Jun 8, 2025' },
      { name: 'design-doc-9.txt', relevance: 47, date: 'Jun 8, 2025' },
      { name: 'project-plan-10.pdf', relevance: 87, date: 'Jun 8, 2025' },
      { name: 'meeting-notes-11.docx', relevance: 63, date: 'Jun 8, 2025' },
      { name: 'technical-spec-12.md', relevance: 84, date: 'Jun 8, 2025' },
      { name: 'user-story-13.txt', relevance: 50, date: 'Jun 8, 2025' },
      { name: 'design-doc-14.pdf', relevance: 58, date: 'Jun 8, 2025' }
    ];

    const files = [];
    
    screenshotFiles.forEach((fileData, i) => {
      files.push({
        id: `file-${i}`,
        name: fileData.name,
        path: `/documents/projects/${fileData.name}`,
        relevance: fileData.relevance,
        confidence: fileData.relevance + Math.random() * 10,
        modified: new Date('2025-06-08'),
        analyzed: Math.random() > 0.6,
        status: Math.random() > 0.5 ? 'pending' : 'archived',
        size: Math.floor(Math.random() * 100000)
      });
    });
    
    return files;
  }

  getFilteredFiles() {
    return this.state.files.filter(file => {
      // Apply current filters
      if (this.state.filters.status !== 'all') {
        if (this.state.filters.status === 'pending' && file.analyzed) return false;
        if (this.state.filters.status === 'analyzed' && !file.analyzed) return false;
      }
      
      return true;
    });
  }

  calculateAverageConfidence() {
    const analyzedFiles = this.state.files.filter(f => f.analyzed);
    if (analyzedFiles.length === 0) return 0;
    
    const sum = analyzedFiles.reduce((acc, file) => acc + (file.confidence || 0), 0);
    return sum / analyzedFiles.length;
  }

  toggleFileStatus(fileId) {
    const file = this.state.files.find(f => f.id === fileId);
    if (file) {
      file.status = file.status === 'pending' ? 'archived' : 'pending';
      this.renderCurrentView();
      this.updateStats();
    }
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  }

  async loadInitialData() {
    // Load any persisted data
    console.log('Loading initial data...');
    
    // Carrega automaticamente os dados mockados para corresponder ao screenshot
    this.state.files = this.generateMockFiles(15);
    this.updateStats();
  }

  updateUI() {
    this.updateStats();
    this.updateLayoutClasses();
    this.renderCurrentView();
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.powerApp = new PowerApp();
});

// Export for debugging
export default PowerApp;