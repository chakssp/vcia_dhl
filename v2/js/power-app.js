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
      sidebarCollapsed: true, // Start collapsed for quick access mode
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
    
    // Settings
    this.settings = this.loadSettings();
    
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
        this.state.sortBy = e.target.value;
        this.renderCurrentView();
      });
    }
    
    if (this.dom.sortDirection) {
      this.dom.sortDirection.addEventListener('click', () => {
        this.state.sortDirection = this.state.sortDirection === 'desc' ? 'asc' : 'desc';
        this.dom.sortDirection.querySelector('.icon').textContent = 
          this.state.sortDirection === 'desc' ? '↓' : '↑';
        this.renderCurrentView();
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
        input.addEventListener('change', () => {
          // Simple filter update - just re-render
          this.renderCurrentView();
        });
      }
    });
    
    // Search
    if (this.dom.searchInput) {
      this.dom.searchInput.addEventListener('input', (e) => {
        // Simple search - just re-render
        this.renderCurrentView();
      });
    }
    
    // Categories
    if (this.dom.addCategoryBtn) {
      this.dom.addCategoryBtn.addEventListener('click', () => {
        this.showAddCategoryDialog();
      });
    }
    
    // Quick action buttons
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        switch(action) {
          case 'discover-real':
            this.discoverFiles();
            break;
          case 'analyze':
            this.analyzeFiles();
            break;
          case 'export':
            this.exportData();
            break;
          case 'settings':
            this.openSettings();
            break;
        }
      });
    });
    
    // Bulk action buttons
    const bulkBtns = document.querySelectorAll('.bulk-btn');
    bulkBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleBulkAction(action);
      });
    });
    
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
      case 'select-all-visible':
        this.selectAllVisibleFiles();
        break;
      case 'clear-selection':
        this.clearSelection();
        break;
        
      // Search patterns
      case 'manage-search-patterns':
        this.openSearchPatternsDialog();
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
    // Update sidebar collapsed state
    if (this.dom.sidebar) {
      this.dom.sidebar.classList.toggle('collapsed', this.state.sidebarCollapsed);
    }
    
    // Update split container classes
    if (this.dom.splitContainer) {
      this.dom.splitContainer.classList.toggle('sidebar-collapsed', this.state.sidebarCollapsed);
      this.dom.splitContainer.classList.toggle('details-hidden', !this.state.detailsPanelVisible);
    }
    
    // Save state to localStorage
    this.saveSettings();
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
      // Check if File System Access API is available
      if ('showDirectoryPicker' in window) {
        await this.discoverRealFiles();
      } else {
        // Fallback to mock data
        await this.simulateDelay(2000);
        this.state.files = this.generateMockFiles(50);
      }
      
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
  
  async discoverRealFiles() {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const files = [];
      await this.readDirectory(dirHandle, files, '');
      
      // Convert to our file format
      this.state.files = files.map((file, index) => ({
        id: `file-${index}`,
        name: file.name,
        path: file.path,
        type: file.name.split('.').pop() || 'unknown',
        relevance: Math.floor(Math.random() * 100), // Calculate real relevance later
        confidence: 0,
        modified: file.lastModified || new Date(),
        analyzed: false,
        status: 'pending',
        size: file.size || 0,
        categories: []
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('User cancelled directory selection');
      }
      throw error;
    }
  }
  
  async readDirectory(dirHandle, files, path) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        files.push({
          name: file.name,
          path: path + '/' + file.name,
          size: file.size,
          lastModified: new Date(file.lastModified)
        });
      } else if (entry.kind === 'directory') {
        // Recursively read subdirectories (limit depth for performance)
        const subPath = path + '/' + entry.name;
        if (subPath.split('/').length < 5) { // Limit depth
          await this.readDirectory(entry, files, subPath);
        }
      }
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
      
      const format = this.settings?.exportFormat || 'json';
      const includeMetadata = this.settings?.includeMetadata !== false;
      
      const data = {
        files: this.state.files,
        categories: this.state.categories,
        stats: this.stats,
        exportedAt: new Date().toISOString()
      };
      
      let content, mimeType, extension;
      
      switch (format) {
        case 'markdown':
          content = this.exportToMarkdown(data, includeMetadata);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
          
        case 'csv':
          content = this.exportToCSV(data);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
          
        case 'json':
        default:
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
      }
      
      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-export-${Date.now()}.${extension}`;
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
  
  exportToMarkdown(data, includeMetadata) {
    let markdown = `# Knowledge Export\n\n`;
    markdown += `**Exported at:** ${new Date(data.exportedAt).toLocaleString()}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Files:** ${data.files.length}\n`;
    markdown += `- **Analyzed Files:** ${data.files.filter(f => f.analyzed).length}\n`;
    markdown += `- **Categories:** ${data.categories.length}\n`;
    markdown += `- **Average Confidence:** ${Math.round(this.stats.avgConfidence)}%\n\n`;
    
    // Categories
    if (data.categories.length > 0) {
      markdown += `## Categories\n\n`;
      data.categories.forEach(cat => {
        markdown += `- **${cat.name}** (${cat.color})\n`;
      });
      markdown += '\n';
    }
    
    // Files
    markdown += `## Files\n\n`;
    data.files.forEach(file => {
      markdown += `### ${file.name}\n\n`;
      markdown += `- **Path:** ${file.path}\n`;
      markdown += `- **Relevance:** ${file.relevance}%\n`;
      markdown += `- **Status:** ${file.status}\n`;
      
      if (includeMetadata) {
        markdown += `- **Size:** ${this.formatFileSize(file.size)}\n`;
        markdown += `- **Modified:** ${new Date(file.modified).toLocaleDateString()}\n`;
        markdown += `- **Type:** ${file.type}\n`;
        if (file.analyzed) {
          markdown += `- **Confidence:** ${Math.round(file.confidence)}%\n`;
        }
      }
      
      markdown += '\n';
    });
    
    return markdown;
  }
  
  exportToCSV(data) {
    const headers = ['Name', 'Path', 'Type', 'Relevance', 'Status', 'Analyzed', 'Confidence', 'Size', 'Modified'];
    const rows = [headers];
    
    data.files.forEach(file => {
      rows.push([
        file.name,
        file.path,
        file.type,
        file.relevance,
        file.status,
        file.analyzed ? 'Yes' : 'No',
        file.confidence || 0,
        file.size || 0,
        new Date(file.modified).toISOString()
      ]);
    });
    
    return rows.map(row => row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(cell).replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    }).join(',')).join('\n');
  }
  
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Bulk action handler
  handleBulkAction(action) {
    const selectedIds = Array.from(this.state.selectedFiles);
    if (selectedIds.length === 0) return;
    
    switch (action) {
      case 'analyze':
        this.analyzeBulkFiles(selectedIds);
        break;
      case 'categorize':
        this.showCategorizeMenu();
        break;
      case 'archive':
        this.archiveBulkFiles(selectedIds);
        break;
    }
  }
  
  async analyzeBulkFiles(fileIds) {
    this.setStatus(`Analyzing ${fileIds.length} files...`);
    
    let completed = 0;
    for (const fileId of fileIds) {
      const file = this.state.files.find(f => f.id === fileId);
      if (file && !file.analyzed) {
        file.analyzed = true;
        file.confidence = Math.round(50 + Math.random() * 50);
        completed++;
      }
    }
    
    this.clearSelection();
    this.renderCurrentView();
    this.updateStats();
    this.setStatus(`Analyzed ${completed} files`);
  }
  
  archiveBulkFiles(fileIds) {
    fileIds.forEach(fileId => {
      const file = this.state.files.find(f => f.id === fileId);
      if (file) {
        file.status = 'archived';
      }
    });
    
    this.clearSelection();
    this.renderCurrentView();
    this.updateStats();
    this.setStatus(`Archived ${fileIds.length} files`);
  }
  
  showCategorizeMenu() {
    const selectedCount = this.state.selectedFiles.size;
    if (selectedCount === 0) return;
    
    // Create dropdown menu near the categorize button
    const categorizeBtn = document.querySelector('[data-action="categorize"]');
    if (!categorizeBtn) return;
    
    const rect = categorizeBtn.getBoundingClientRect();
    
    const menu = document.createElement('div');
    menu.className = 'category-dropdown';
    menu.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 5}px;
      left: ${rect.left}px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: var(--space-2);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      min-width: 200px;
    `;
    
    if (this.state.categories.length === 0) {
      menu.innerHTML = `
        <div style="padding: var(--space-3); color: var(--text-secondary);">
          No categories yet. Create one first!
        </div>
      `;
    } else {
      menu.innerHTML = `
        <div class="category-menu-title" style="padding: var(--space-2); font-weight: 600; border-bottom: 1px solid var(--border-color); margin-bottom: var(--space-2);">
          Assign Category to ${selectedCount} files
        </div>
        ${this.state.categories.map(cat => `
          <div class="category-menu-item" data-category-id="${cat.id}" style="
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2);
            cursor: pointer;
            border-radius: var(--radius);
            transition: background 0.2s;
          ">
            <span class="category-color" style="background-color: ${cat.color}; width: 16px; height: 16px; border-radius: 50%;"></span>
            <span>${cat.name}</span>
          </div>
        `).join('')}
      `;
    }
    
    document.body.appendChild(menu);
    
    // Add hover effect
    const style = document.createElement('style');
    style.textContent = '.category-menu-item:hover { background: var(--bg-hover); }';
    document.head.appendChild(style);
    
    // Click handlers
    const items = menu.querySelectorAll('.category-menu-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const categoryId = item.dataset.categoryId;
        this.assignCategoryToSelected(categoryId);
        document.body.removeChild(menu);
        document.head.removeChild(style);
      });
    });
    
    // Click outside to close
    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== categorizeBtn) {
        document.body.removeChild(menu);
        document.head.removeChild(style);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
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
  
  selectAllVisibleFiles() {
    // Seleciona apenas arquivos visíveis (filtrados)
    const visibleFiles = this.getFilteredFiles();
    
    // Limpa seleção atual
    this.state.selectedFiles.clear();
    
    // Adiciona apenas arquivos visíveis
    visibleFiles.forEach(file => {
      this.state.selectedFiles.add(file.id);
    });
    
    this.updateFileSelectionUI();
    this.updateBulkActions();
  }
  
  rangeSelectFiles(endFileId) {
    // Get all visible file items
    const fileItems = Array.from(document.querySelectorAll('.file-item'));
    const fileIds = fileItems.map(item => item.dataset.fileId);
    
    // Find the last selected file
    let lastSelected = null;
    if (this.state.selectedFiles.size > 0) {
      lastSelected = Array.from(this.state.selectedFiles).pop();
    }
    
    if (!lastSelected) {
      this.selectFile(endFileId);
      return;
    }
    
    const startIdx = fileIds.indexOf(lastSelected);
    const endIdx = fileIds.indexOf(endFileId);
    
    if (startIdx === -1 || endIdx === -1) {
      this.selectFile(endFileId);
      return;
    }
    
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    
    // Clear previous selection and select range
    this.state.selectedFiles.clear();
    for (let i = minIdx; i <= maxIdx; i++) {
      this.state.selectedFiles.add(fileIds[i]);
    }
    
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
      
      // Get category colors for this file
      const categoryColors = [];
      if (file.categories && file.categories.length > 0) {
        file.categories.forEach(catId => {
          const cat = this.state.categories.find(c => c.id === catId);
          if (cat) categoryColors.push(cat.color);
        });
      }
      
      return `
        <div class="file-item" data-file-id="${file.id}">
          <div class="file-checkbox"></div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-meta">
              <span class="file-path">${file.path}</span>
              ${categoryColors.length > 0 ? `
                <div class="file-categories">
                  ${categoryColors.map(color => `
                    <span class="category-dot" style="background-color: ${color}"></span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
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
    const container = document.getElementById('file-grid');
    if (!container) return;
    
    const filteredFiles = this.getFilteredFiles();
    
    if (filteredFiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>No files found</h3>
          <p>Try adjusting your filters or discover new files</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filteredFiles.map(file => `
      <div class="grid-item" data-file-id="${file.id}">
        <div class="grid-icon">📄</div>
        <div class="grid-name">${file.name}</div>
        <div class="grid-relevance">${Math.round(file.relevance)}%</div>
      </div>
    `).join('');
  }

  renderGraphView() {
    // Graph view implementation
    console.log('Rendering graph view...');
    this.loadGraphData();
  }
  
  loadGraphData() {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    
    canvas.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⊚</div>
        <h3>Graph Visualization</h3>
        <p>Knowledge graph visualization coming soon!</p>
      </div>
    `;
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
  
  openSettings() {
    const dialog = this.createSettingsDialog();
    document.body.appendChild(dialog);
  }
  
  openSearchPatternsDialog() {
    const dialog = this.createSearchPatternsDialog();
    document.body.appendChild(dialog);
  }
  
  createSettingsDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'settings-panel';
    dialog.style.cssText = 'background: var(--bg-primary); border: 3px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius-lg); max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1);';
    
    dialog.innerHTML = `
        <div class="settings-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
          <h2 class="settings-title">Settings</h2>
          <button class="close-btn" style="background: transparent; border: none; color: var(--text-primary); font-size: 24px; cursor: pointer;">×</button>
        </div>
        
        <div class="settings-section">
          <div class="settings-group">
            <h3 class="settings-group-title">General Preferences</h3>
            <div class="settings-item">
              <div class="settings-label">
                <span class="settings-label-text">Auto-save changes</span>
                <span class="settings-label-desc">Automatically save files and settings</span>
              </div>
              <div class="settings-control">
                <label class="toggle-switch">
                  <input type="checkbox" class="toggle-input" ${this.settings?.autoSave ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div class="settings-item">
              <div class="settings-label">
                <span class="settings-label-text">Show file previews</span>
                <span class="settings-label-desc">Display content preview in file list</span>
              </div>
              <div class="settings-control">
                <label class="toggle-switch">
                  <input type="checkbox" class="toggle-input" ${this.settings?.showPreviews !== false ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="settings-group">
            <h3 class="settings-group-title">Analysis Settings</h3>
            <div class="settings-item">
              <div class="settings-label">
                <span class="settings-label-text">Default provider</span>
                <span class="settings-label-desc">Primary AI provider for analysis</span>
              </div>
              <div class="settings-control">
                <select class="form-input" style="width: 200px;">
                  <option value="openai">OpenAI GPT-4</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="local">Local Model</option>
                </select>
              </div>
            </div>
            <div class="settings-item">
              <div class="settings-label">
                <span class="settings-label-text">Batch size</span>
                <span class="settings-label-desc">Number of files to analyze at once</span>
              </div>
              <div class="settings-control">
                <input type="number" class="form-input" value="${this.settings?.batchSize || 5}" min="1" max="20" style="width: 80px;">
              </div>
            </div>
          </div>
          
          <div class="settings-group">
            <h3 class="settings-group-title">Export Settings</h3>
            <div class="settings-item">
              <div class="settings-label">
                <span class="settings-label-text">Default format</span>
                <span class="settings-label-desc">Preferred export file format</span>
              </div>
              <div class="settings-control">
                <select class="form-input" style="width: 200px;">
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
            <div class="settings-item">
              <div class="settings-label">
                <span class="settings-label-text">Include metadata</span>
                <span class="settings-label-desc">Export file metadata and analysis results</span>
              </div>
              <div class="settings-control">
                <label class="toggle-switch">
                  <input type="checkbox" class="toggle-input" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="settings-group">
            <h3 class="settings-group-title">Advanced</h3>
            <div class="settings-item">
              <div class="settings-label">
                <span class="settings-label-text">Clear all data</span>
                <span class="settings-label-desc">Remove all files, categories and settings</span>
              </div>
              <div class="settings-control">
                <button class="dialog-btn" style="background: var(--danger-color, #f85149);" onclick="if(confirm('Are you sure? This cannot be undone.')) { localStorage.clear(); location.reload(); }">
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dialog-actions" style="margin-top: var(--space-4);">
          <button class="dialog-btn dialog-btn-cancel">Cancel</button>
          <button class="dialog-btn dialog-btn-save">Save Settings</button>
        </div>
      </div>
    `;
    
    // Adicionar dialog ao overlay
    overlay.appendChild(dialog);
    
    // Event listeners
    const closeBtn = dialog.querySelector('.close-btn');
    const cancelBtn = dialog.querySelector('.dialog-btn-cancel');
    const saveBtn = dialog.querySelector('.dialog-btn-save');
    
    const closeDialog = () => document.body.removeChild(overlay);
    
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    saveBtn.addEventListener('click', () => {
      // Save settings
      this.saveSettings(dialog);
      closeDialog();
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });
    
    return overlay;
  }
  
  saveSettings(dialog = null) {
    // If called from settings dialog
    if (dialog) {
      // Collect settings from dialog
      const settings = {
        autoSave: dialog.querySelector('input[type="checkbox"]')?.checked,
        showPreviews: dialog.querySelectorAll('input[type="checkbox"]')[1]?.checked,
        defaultProvider: dialog.querySelector('select')?.value,
        batchSize: parseInt(dialog.querySelector('input[type="number"]')?.value || 5),
        exportFormat: dialog.querySelectorAll('select')[1]?.value,
        includeMetadata: dialog.querySelectorAll('input[type="checkbox"]')[2]?.checked,
        sidebarCollapsed: this.state.sidebarCollapsed,
        detailsPanelVisible: this.state.detailsPanelVisible
      };
      
      this.settings = settings;
    } else {
      // Just save current state
      this.settings.sidebarCollapsed = this.state.sidebarCollapsed;
      this.settings.detailsPanelVisible = this.state.detailsPanelVisible;
    }
    
    localStorage.setItem('powerApp_settings', JSON.stringify(this.settings));
    
    // Apply settings
    if (this.settings.autoSave) {
      this.enableAutoSave();
    }
  }
  
  enableAutoSave() {
    // Auto-save every 30 seconds
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      this.saveToLocalStorage();
      console.log('Auto-saved at', new Date().toLocaleTimeString());
    }, 30000);
  }
  
  createSearchPatternsDialog() {
    // Carregar patterns salvos ou usar padrão
    const savedPatterns = localStorage.getItem('searchPatterns');
    const patterns = savedPatterns ? JSON.parse(savedPatterns) : {
      include: ['*.md', '*.txt', '*.js', '*.html', '*.css'],
      exclude: ['node_modules', '.git', 'dist', 'build', '*.min.js']
    };
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-patterns-dialog';
    dialog.style.cssText = 'background: var(--bg-primary); border: 3px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius-lg); padding: var(--space-4); min-width: 500px; max-width: 600px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1);';
    
    dialog.innerHTML = `
        <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
          <h2 style="margin: 0; color: var(--text-primary);">Search Patterns</h2>
          <button class="close-btn" style="background: transparent; border: none; color: var(--text-primary); font-size: 24px; cursor: pointer;">×</button>
        </div>
        
        <div class="patterns-section" style="margin-bottom: var(--space-4);">
          <h3 style="color: var(--text-primary); margin-bottom: var(--space-2);">Include Patterns</h3>
          <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-2);">
            Files matching these patterns will be included (one per line)
          </p>
          <textarea 
            id="include-patterns" 
            style="width: 100%; min-height: 120px; background: #424242; border: 1px solid #3D331F; 
                   border-radius: var(--radius); padding: var(--space-2); color: #ffffff; 
                   font-family: var(--font-family-mono); font-size: var(--font-size-sm); -webkit-font-smoothing: antialiased;"
          >${patterns.include.join('\n')}</textarea>
        </div>
        
        <div class="patterns-section" style="margin-bottom: var(--space-4);">
          <h3 style="color: var(--text-primary); margin-bottom: var(--space-2);">Exclude Patterns</h3>
          <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-2);">
            Files/folders matching these patterns will be excluded (one per line)
          </p>
          <textarea 
            id="exclude-patterns" 
            style="width: 100%; min-height: 120px; background: #424242; border: 1px solid #3D331F; 
                   border-radius: var(--radius); padding: var(--space-2); color: #ffffff; 
                   font-family: var(--font-family-mono); font-size: var(--font-size-sm); -webkit-font-smoothing: antialiased;"
          >${patterns.exclude.join('\n')}</textarea>
        </div>
        
        <div class="patterns-help" style="background: var(--bg-secondary); padding: var(--space-3); border-radius: var(--radius); margin-bottom: var(--space-4);">
          <h4 style="color: var(--text-primary); margin-bottom: var(--space-2);">Pattern Syntax:</h4>
          <ul style="color: var(--text-secondary); font-size: var(--font-size-sm); margin: 0; padding-left: var(--space-4);">
            <li>* matches any characters (e.g., *.js)</li>
            <li>** matches any directories (e.g., src/**/*.js)</li>
            <li>! at start excludes the pattern</li>
            <li>Use folder names to exclude entire directories</li>
          </ul>
        </div>
        
        <div class="dialog-actions" style="display: flex; gap: var(--space-2); justify-content: flex-end;">
          <button class="cancel-btn" style="padding: var(--space-2) var(--space-3); background: transparent; 
                  border: 1px solid var(--border-color); border-radius: var(--radius); 
                  color: var(--text-secondary); cursor: pointer;">Cancel</button>
          <button class="save-patterns-btn" style="padding: var(--space-2) var(--space-3); 
                  background: var(--accent-color); border: none; border-radius: var(--radius); 
                  color: var(--bg-primary); cursor: pointer;">Save Patterns</button>
        </div>
      </div>
    `;
    
    // Adicionar dialog ao overlay
    overlay.appendChild(dialog);
    
    // Event listeners
    const closeBtn = dialog.querySelector('.close-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const saveBtn = dialog.querySelector('.save-patterns-btn');
    
    closeBtn.addEventListener('click', () => overlay.remove());
    cancelBtn.addEventListener('click', () => overlay.remove());
    
    saveBtn.addEventListener('click', () => {
      const includePatterns = dialog.querySelector('#include-patterns').value
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
        
      const excludePatterns = dialog.querySelector('#exclude-patterns').value
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      const newPatterns = {
        include: includePatterns,
        exclude: excludePatterns
      };
      
      // Salvar no localStorage
      localStorage.setItem('searchPatterns', JSON.stringify(newPatterns));
      
      // Aplicar novos patterns se houver arquivos descobertos
      if (this.state.files.length > 0) {
        this.applySearchPatterns(newPatterns);
      }
      
      overlay.remove();
      
      // Mostrar feedback
      this.setStatus('Search patterns updated');
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    
    return overlay;
  }
  
  applySearchPatterns(patterns) {
    // Aplicar patterns aos arquivos existentes
    const filteredFiles = this.state.files.filter(file => {
      const filePath = file.path || file.name;
      
      // Verificar exclusões primeiro
      for (const excludePattern of patterns.exclude) {
        if (this.matchPattern(filePath, excludePattern)) {
          return false;
        }
      }
      
      // Verificar inclusões
      for (const includePattern of patterns.include) {
        if (this.matchPattern(filePath, includePattern)) {
          return true;
        }
      }
      
      // Se não há patterns de inclusão, incluir por padrão
      return patterns.include.length === 0;
    });
    
    // Atualizar lista de arquivos
    this.state.files = filteredFiles;
    this.renderFiles();
    this.updateStats();
  }
  
  matchPattern(filePath, pattern) {
    // Converter pattern glob para regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(filePath);
  }
  
  resetFilters() {
    this.state.filters = {
      relevance: 'all',
      status: 'all',
      timeRange: 'all',
      fileType: 'all'
    };
    
    // Reset UI
    if (this.dom.relevanceFilter) this.dom.relevanceFilter.value = 'all';
    if (this.dom.statusFilter) this.dom.statusFilter.value = 'all';
    if (this.dom.timeFilter) this.dom.timeFilter.value = 'all';
    if (this.dom.typeFilter) this.dom.typeFilter.value = 'all';
    if (this.dom.searchInput) this.dom.searchInput.value = '';
    
    this.renderCurrentView();
  }
  
  setFilter(filterType, value) {
    this.state.filters[filterType] = value;
    
    // Update UI
    switch(filterType) {
      case 'status':
        if (this.dom.statusFilter) this.dom.statusFilter.value = value;
        break;
      case 'relevance':
        if (this.dom.relevanceFilter) this.dom.relevanceFilter.value = value;
        break;
      case 'timeRange':
        if (this.dom.timeFilter) this.dom.timeFilter.value = value;
        break;
      case 'fileType':
        if (this.dom.typeFilter) this.dom.typeFilter.value = value;
        break;
    }
    
    this.renderCurrentView();
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
    let filtered = this.state.files;
    
    // Search filter
    const searchValue = this.dom.searchInput ? this.dom.searchInput.value.toLowerCase() : '';
    if (searchValue) {
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchValue) ||
        file.path.toLowerCase().includes(searchValue)
      );
    }
    
    // Relevance filter
    const relevanceValue = this.dom.relevanceFilter ? this.dom.relevanceFilter.value : 'all';
    if (relevanceValue !== 'all') {
      const minRelevance = parseInt(relevanceValue);
      filtered = filtered.filter(file => file.relevance >= minRelevance);
    }
    
    // Status filter
    const statusValue = this.dom.statusFilter ? this.dom.statusFilter.value : 'all';
    if (statusValue !== 'all') {
      filtered = filtered.filter(file => {
        switch (statusValue) {
          case 'pending':
            return file.status === 'pending' && !file.analyzed;
          case 'analyzed':
            return file.analyzed;
          case 'archived':
            return file.status === 'archived';
          default:
            return true;
        }
      });
    }
    
    // Type filter
    const typeValue = this.dom.typeFilter ? this.dom.typeFilter.value : 'all';
    if (typeValue !== 'all') {
      filtered = filtered.filter(file => file.type === typeValue);
    }
    
    // Category filter (from selected category)
    if (this.state.selectedCategoryFilter) {
      filtered = filtered.filter(file => 
        file.categories && file.categories.includes(this.state.selectedCategoryFilter)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (this.state.sortBy) {
        case 'relevance':
          aVal = a.relevance;
          bVal = b.relevance;
          break;
        case 'date':
          aVal = new Date(a.modified).getTime();
          bVal = new Date(b.modified).getTime();
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'size':
          aVal = a.size;
          bVal = b.size;
          break;
        default:
          aVal = a.relevance;
          bVal = b.relevance;
      }
      
      if (this.state.sortDirection === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });
    
    return filtered;
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
  
  showAddCategoryDialog() {
    // Create custom dialog instead of prompt
    const dialog = this.createCategoryDialog();
    document.body.appendChild(dialog);
    
    // Focus on input
    const input = dialog.querySelector('#category-name-input');
    if (input) input.focus();
  }
  
  createCategoryDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'category-dialog';
    
    dialog.innerHTML = `
      <div class="category-dialog-header">
        <h3 class="category-dialog-title">Add New Category</h3>
      </div>
      <div class="category-form">
        <div class="form-group">
          <label class="form-label" for="category-name-input">Category Name</label>
          <input type="text" id="category-name-input" class="form-input" placeholder="Enter category name">
        </div>
        <div class="form-group">
          <label class="form-label">Choose Color</label>
          <div class="color-picker">
            ${this.getColorOptions().map((color, index) => `
              <div class="color-option ${index === 0 ? 'selected' : ''}" 
                   data-color="${color}" 
                   style="background-color: ${color}"></div>
            `).join('')}
          </div>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn-cancel">Cancel</button>
          <button class="dialog-btn dialog-btn-save">Save Category</button>
        </div>
      </div>
    `;
    
    // Adicionar dialog ao overlay
    overlay.appendChild(dialog);
    
    // Add event listeners
    const cancelBtn = dialog.querySelector('.dialog-btn-cancel');
    const saveBtn = dialog.querySelector('.dialog-btn-save');
    const input = dialog.querySelector('#category-name-input');
    const colorOptions = dialog.querySelectorAll('.color-option');
    
    let selectedColor = this.getColorOptions()[0];
    
    // Color selection
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedColor = option.dataset.color;
      });
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // Save button
    const saveCategory = () => {
      const name = input.value.trim();
      if (name) {
        if (!this.state.categories) {
          this.state.categories = [];
        }
        this.state.categories.push({
          id: `cat-${Date.now()}`,
          name: name,
          color: selectedColor
        });
        this.renderCategories();
        this.saveToLocalStorage();
        document.body.removeChild(overlay);
      }
    };
    
    saveBtn.addEventListener('click', saveCategory);
    cancelBtn.addEventListener('click', () => document.body.removeChild(overlay));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveCategory();
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    return overlay;
  }
  
  renderCategories() {
    if (!this.dom.categoriesList) return;
    
    if (!this.state.categories || this.state.categories.length === 0) {
      this.dom.categoriesList.innerHTML = '<div style="padding: 10px; color: #8b949e;">No categories yet</div>';
      return;
    }
    
    // Calculate file count per category
    const categoryCounts = {};
    this.state.files.forEach(file => {
      if (file.categories && file.categories.length > 0) {
        file.categories.forEach(catId => {
          categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
        });
      }
    });
    
    this.dom.categoriesList.innerHTML = this.state.categories.map(cat => {
      const count = categoryCounts[cat.id] || 0;
      return `
        <div class="category-item" data-category-id="${cat.id}" title="${cat.name} - Click to assign | Shift+Click to filter">
          <span class="category-color" style="background-color: ${cat.color}"></span>
          <span class="category-name">${cat.name}</span>
          <span class="category-count">${count}</span>
        </div>
      `;
    }).join('');
    
    // Add click handlers to assign categories
    this.dom.categoriesList.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const categoryId = item.dataset.categoryId;
        
        if (e.shiftKey) {
          // Shift+Click: Filter by category
          this.filterByCategory(categoryId);
        } else {
          // Normal click: Assign to selected files
          this.assignCategoryToSelected(categoryId);
        }
      });
    });
  }
  
  filterByCategory(categoryId) {
    if (this.state.selectedCategoryFilter === categoryId) {
      // If already filtering by this category, clear filter
      this.state.selectedCategoryFilter = null;
      this.setStatus('Category filter cleared');
    } else {
      // Set category filter
      this.state.selectedCategoryFilter = categoryId;
      const category = this.state.categories.find(cat => cat.id === categoryId);
      this.setStatus(`Filtering by category: ${category?.name || 'Unknown'}`);
    }
    
    // Update UI
    this.renderCurrentView();
    
    // Update visual state of categories
    this.dom.categoriesList.querySelectorAll('.category-item').forEach(item => {
      item.classList.toggle('active', item.dataset.categoryId === this.state.selectedCategoryFilter);
    });
  }
  
  assignCategoryToSelected(categoryId) {
    const selectedCount = this.state.selectedFiles.size;
    
    if (selectedCount === 0) {
      this.setStatus('No files selected. Select files first to assign categories.');
      return;
    }
    
    const category = this.state.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    // Add category to selected files
    let filesUpdated = 0;
    this.state.selectedFiles.forEach(fileId => {
      const file = this.state.files.find(f => f.id === fileId);
      if (file) {
        if (!file.categories) {
          file.categories = [];
        }
        // Toggle category - if already has it, remove; if not, add
        const catIndex = file.categories.indexOf(categoryId);
        if (catIndex > -1) {
          file.categories.splice(catIndex, 1);
        } else {
          file.categories.push(categoryId);
        }
        filesUpdated++;
      }
    });
    
    // Update UI
    this.renderCategories();
    this.renderCurrentView();
    this.saveToLocalStorage();
    
    // Update status
    this.setStatus(`Updated category "${category.name}" for ${filesUpdated} files`);
    
    // Visual feedback
    const catItem = this.dom.categoriesList.querySelector(`[data-category-id="${categoryId}"]`);
    if (catItem) {
      catItem.style.transform = 'scale(0.95)';
      setTimeout(() => {
        catItem.style.transform = 'scale(1)';
      }, 100);
    }
  }
  
  getColorOptions() {
    return [
      '#f85149', // red
      '#fb8500', // orange
      '#ffd500', // yellow
      '#8ac926', // green
      '#06ffa5', // cyan
      '#00b4d8', // blue
      '#b07c9e', // purple
      '#ff006e', // pink
      '#8338ec', // violet
      '#3a86ff'  // sky blue
    ];
  }
  
  getRandomColor() {
    const colors = this.getColorOptions();
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async loadInitialData() {
    // Load any persisted data
    console.log('Loading initial data...');
    
    // Load from localStorage
    this.loadFromLocalStorage();
    
    // If no files, generate mock data
    if (this.state.files.length === 0) {
      this.state.files = this.generateMockFiles(15);
    }
    
    this.updateStats();
    this.renderCategories();
    
    // Apply settings
    if (this.settings.autoSave) {
      this.enableAutoSave();
    }
  }
  
  saveToLocalStorage() {
    try {
      const dataToSave = {
        files: this.state.files,
        categories: this.state.categories,
        filters: this.state.filters,
        sortBy: this.state.sortBy,
        sortDirection: this.state.sortDirection
      };
      localStorage.setItem('powerApp_data', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
  
  loadFromLocalStorage() {
    try {
      const savedData = localStorage.getItem('powerApp_data');
      if (savedData) {
        const data = JSON.parse(savedData);
        if (data.files) this.state.files = data.files;
        if (data.categories) this.state.categories = data.categories;
        if (data.filters) this.state.filters = data.filters;
        if (data.sortBy) this.state.sortBy = data.sortBy;
        if (data.sortDirection) this.state.sortDirection = data.sortDirection;
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }
  
  loadSettings() {
    try {
      const savedSettings = localStorage.getItem('powerApp_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Apply saved UI state
        if (settings.sidebarCollapsed !== undefined) {
          this.state.sidebarCollapsed = settings.sidebarCollapsed;
        }
        if (settings.detailsPanelVisible !== undefined) {
          this.state.detailsPanelVisible = settings.detailsPanelVisible;
        }
        
        return settings;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    
    // Default settings
    return {
      autoSave: true,
      showPreviews: true,
      defaultProvider: 'openai',
      batchSize: 5,
      exportFormat: 'json',
      includeMetadata: true,
      sidebarCollapsed: true, // Default to collapsed for quick access
      detailsPanelVisible: true
    };
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