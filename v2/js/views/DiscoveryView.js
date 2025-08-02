/**
 * DiscoveryView.js - Main file discovery interface for KC V2
 * 
 * Provides file grid display, real-time filtering, multiple selection,
 * and integration with V1's File System Access API through LegacyBridge
 * 
 * Features:
 * - Terminal-inspired UI with V2 design system
 * - Real-time sync with V1 file discovery
 * - Efficient handling of 1000+ files
 * - Smart preview on hover
 * - Bulk operations with keyboard shortcuts
 * - Pattern configuration interface
 */

import appState from '../core/AppState.js';
import eventBus, { Events } from '../core/EventBus.js';
import { legacyBridge } from '../core/LegacyBridge.js';

export class DiscoveryView {
  constructor() {
    this.container = null;
    this.files = [];
    this.filteredFiles = [];
    this.selectedFiles = new Set();
    this.isInitialized = false;
    this.hoverTimeout = null;
    this.previewModal = null;
    
    // Current state
    this.currentFilter = 'all';
    this.currentSort = 'relevance';
    this.searchQuery = '';
    this.viewMode = 'grid'; // grid, list
    
    // Pagination for performance
    this.pagination = {
      currentPage: 1,
      itemsPerPage: 100,
      totalPages: 0,
      totalItems: 0
    };
    
    // Performance optimization
    this.renderThrottle = null;
    this.renderDelay = 16; // 60fps
    
    // File type icons mapping
    this.fileIcons = {
      'md': '📝',
      'txt': '📄',
      'docx': '📘',
      'pdf': '📕',
      'gdoc': '📗',
      'default': '📄'
    };
    
    // Filter options
    this.filterOptions = [
      { value: 'all', label: 'All Files', count: 0 },
      { value: 'analyzed', label: 'Analyzed', count: 0 },
      { value: 'pending', label: 'Pending Analysis', count: 0 },
      { value: 'approved', label: 'Approved', count: 0 },
      { value: 'high-relevance', label: 'High Relevance (>70%)', count: 0 },
      { value: 'categorized', label: 'Categorized', count: 0 }
    ];
    
    // Sort options
    this.sortOptions = [
      { value: 'relevance', label: 'Relevance Score' },
      { value: 'name', label: 'File Name' },
      { value: 'date', label: 'Last Modified' },
      { value: 'size', label: 'File Size' },
      { value: 'confidence', label: 'Confidence Score' }
    ];
    
    console.log('[DiscoveryView] Initialized with V1 bridge integration');
  }

  /**
   * Initialize the discovery view
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
      await this.syncWithV1();
      
      this.isInitialized = true;
      console.log('[DiscoveryView] Initialized successfully');
      
      // Load initial files
      this.loadFiles();
      
    } catch (error) {
      console.error('[DiscoveryView] Initialization failed:', error);
      this.renderError('Failed to initialize Discovery View. Please ensure V1 system is loaded.');
    }
  }

  /**
   * Setup event listeners for V1 sync and user interactions
   */
  setupEventListeners() {
    // V1 sync events
    eventBus.on('v1:files_updated', (data) => {
      console.log('[DiscoveryView] V1 files updated:', data);
      this.loadFiles();
    });
    
    eventBus.on('v1:state_changed', ({ key, newValue }) => {
      if (key === 'files') {
        this.loadFiles();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    // Window resize for responsive layout
    window.addEventListener('resize', () => this.throttledRender());
    
    // Prevent memory leaks
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  /**
   * Sync with V1 state
   */
  async syncWithV1() {
    try {
      // Get files from V1 through bridge
      const v1Files = appState.getFiles();
      console.log('[DiscoveryView] Synced files from V1:', v1Files.length);
      
      // Transform and store
      this.files = this.transformV1Files(v1Files);
      this.updateFilterCounts();
      this.applyFilters();
      
    } catch (error) {
      console.error('[DiscoveryView] V1 sync failed:', error);
    }
  }

  /**
   * Transform V1 files to V2 format with additional metadata
   */
  transformV1Files(v1Files) {
    if (!Array.isArray(v1Files)) return [];
    
    return v1Files.map(file => ({
      ...file,
      // Ensure required fields
      id: file.id || this.generateFileId(file),
      displayName: this.getDisplayName(file),
      icon: this.getFileIcon(file),
      statusBadge: this.getStatusBadge(file),
      searchableText: this.getSearchableText(file),
      // V2 specific fields
      v2: {
        selected: false,
        lastViewed: null,
        bookmarked: false,
        notes: '',
        tags: []
      }
    }));
  }

  /**
   * Load files from app state
   */
  loadFiles() {
    const files = appState.getFiles();
    this.files = this.transformV1Files(files);
    this.updateFilterCounts();
    this.applyFilters();
    this.throttledRender();
  }

  /**
   * Apply current filters and search
   */
  applyFilters() {
    let filtered = [...this.files];
    
    // Apply filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(file => this.matchesFilter(file, this.currentFilter));
    }
    
    // Apply search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.searchableText.toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    filtered = this.sortFiles(filtered, this.currentSort);
    
    this.filteredFiles = filtered;
    this.updatePagination();
  }

  /**
   * Check if file matches filter
   */
  matchesFilter(file, filter) {
    switch (filter) {
      case 'analyzed':
        return file.analyzed === true;
      case 'pending':
        return !file.analyzed;
      case 'approved':
        return file.approved === true;
      case 'high-relevance':
        return (file.relevanceScore || 0) > 0.7;
      case 'categorized':
        return file.categories && file.categories.length > 0;
      default:
        return true;
    }
  }

  /**
   * Sort files by criteria
   */
  sortFiles(files, sortBy) {
    return files.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'confidence':
          return (b.confidenceScore || 0) - (a.confidenceScore || 0);
        case 'relevance':
        default:
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }
    });
  }

  /**
   * Update filter counts
   */
  updateFilterCounts() {
    this.filterOptions.forEach(option => {
      if (option.value === 'all') {
        option.count = this.files.length;
      } else {
        option.count = this.files.filter(file => this.matchesFilter(file, option.value)).length;
      }
    });
  }

  /**
   * Update pagination
   */
  updatePagination() {
    this.pagination.totalItems = this.filteredFiles.length;
    this.pagination.totalPages = Math.ceil(this.filteredFiles.length / this.pagination.itemsPerPage);
    this.pagination.currentPage = Math.min(this.pagination.currentPage, this.pagination.totalPages || 1);
  }

  /**
   * Get current page files
   */
  getCurrentPageFiles() {
    const start = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
    const end = start + this.pagination.itemsPerPage;
    return this.filteredFiles.slice(start, end);
  }

  /**
   * Render the discovery view
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="discovery-view">
        ${this.renderHeader()}
        ${this.renderControls()}
        ${this.renderFileGrid()}
        ${this.renderPagination()}
        ${this.renderBulkActions()}
      </div>
    `;
    
    this.attachEventListeners();
    this.updateFileGridHeight();
  }

  /**
   * Render header with stats
   */
  renderHeader() {
    const stats = this.getStats();
    
    return `
      <div class="discovery-header">
        <div class="discovery-title">
          <h2>📁 File Discovery</h2>
          <div class="discovery-stats">
            <span class="stat-item">
              <span class="stat-value">${stats.total}</span>
              <span class="stat-label">files</span>
            </span>
            <span class="stat-item">
              <span class="stat-value">${stats.filtered}</span>
              <span class="stat-label">shown</span>
            </span>
            <span class="stat-item">
              <span class="stat-value">${stats.selected}</span>
              <span class="stat-label">selected</span>
            </span>
          </div>
        </div>
        
        <div class="discovery-actions">
          <button class="btn btn-primary" id="start-discovery">
            🔍 Discover Files
          </button>
          <button class="btn btn-secondary" id="configure-patterns">
            ⚙️ Configure Patterns
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render filter and search controls
   */
  renderControls() {
    return `
      <div class="discovery-controls">
        <div class="search-section">
          <div class="search-input-wrapper">
            <input 
              type="text" 
              id="file-search" 
              class="search-input" 
              placeholder="🔍 Search files..."
              value="${this.searchQuery}"
            >
            <button class="btn-icon search-clear ${this.searchQuery ? 'visible' : ''}" id="clear-search">
              ✕
            </button>
          </div>
        </div>
        
        <div class="filter-section">
          <div class="filter-group">
            <label>Filter:</label>
            <select id="file-filter" class="filter-select">
              ${this.filterOptions.map(option => `
                <option value="${option.value}" ${option.value === this.currentFilter ? 'selected' : ''}>
                  ${option.label} (${option.count})
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <label>Sort:</label>
            <select id="file-sort" class="filter-select">
              ${this.sortOptions.map(option => `
                <option value="${option.value}" ${option.value === this.currentSort ? 'selected' : ''}>
                  ${option.label}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="view-toggle">
            <button class="btn-icon ${this.viewMode === 'grid' ? 'active' : ''}" id="view-grid" title="Grid View">
              ⚏
            </button>
            <button class="btn-icon ${this.viewMode === 'list' ? 'active' : ''}" id="view-list" title="List View">
              ☰
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render file grid/list
   */
  renderFileGrid() {
    const files = this.getCurrentPageFiles();
    const isEmpty = files.length === 0;
    
    if (isEmpty) {
      return this.renderEmptyState();
    }
    
    return `
      <div class="file-grid-wrapper">
        <div class="file-grid ${this.viewMode}" id="file-grid">
          ${files.map(file => this.renderFileCard(file)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual file card
   */
  renderFileCard(file) {
    const isSelected = this.selectedFiles.has(file.id);
    const relevancePercent = Math.round((file.relevanceScore || 0) * 100);
    const confidencePercent = Math.round((file.confidenceScore || 0) * 100);
    
    return `
      <div class="file-card ${isSelected ? 'selected' : ''}" 
           data-file-id="${file.id}"
           data-file-path="${file.path || ''}"
           tabindex="0">
        
        <div class="file-card-header">
          <div class="file-checkbox">
            <input type="checkbox" 
                   id="file-${file.id}" 
                   ${isSelected ? 'checked' : ''}
                   onclick="event.stopPropagation()">
          </div>
          
          <div class="file-info">
            <div class="file-name">
              <span class="file-icon">${file.icon}</span>
              <span class="file-title" title="${file.name}">${file.displayName}</span>
            </div>
            
            <div class="file-path" title="${file.path || 'Unknown path'}">
              ${this.truncatePath(file.path || 'Unknown path')}
            </div>
          </div>
          
          <div class="file-status">
            ${file.statusBadge}
          </div>
        </div>
        
        <div class="file-card-body">
          ${this.renderFilePreview(file)}
        </div>
        
        <div class="file-card-footer">
          <div class="file-meta">
            <span class="meta-item" title="File size">
              📏 ${this.formatFileSize(file.size || 0)}
            </span>
            <span class="meta-item" title="Last modified">
              📅 ${this.formatDate(file.lastModified)}
            </span>
          </div>
          
          <div class="file-scores">
            <div class="score-item relevance" title="Relevance Score">
              <div class="score-bar">
                <div class="score-fill" style="width: ${relevancePercent}%"></div>
              </div>
              <span class="score-text">${relevancePercent}%</span>
            </div>
            
            ${file.confidenceScore ? `
              <div class="score-item confidence" title="Confidence Score">
                <div class="score-bar">
                  <div class="score-fill" style="width: ${confidencePercent}%"></div>
                </div>
                <span class="score-text">${confidencePercent}%</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="file-card-actions">
          <button class="btn-icon" onclick="discoveryView.analyzeFile('${file.id}')" title="Analyze with AI">
            🧠
          </button>
          <button class="btn-icon" onclick="discoveryView.previewFile('${file.id}')" title="Preview Content">
            👁️
          </button>
          <button class="btn-icon" onclick="discoveryView.categorizeFile('${file.id}')" title="Categorize">
            🏷️
          </button>
          <button class="btn-icon" onclick="discoveryView.approveFile('${file.id}')" title="Approve">
            ✅
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render file preview section
   */
  renderFilePreview(file) {
    if (!file.preview) return '<div class="file-preview-empty">No preview available</div>';
    
    // Get first segment or first 150 characters
    const preview = file.preview.segment1 || 
                   (typeof file.preview === 'string' ? file.preview : '') ||
                   (file.content ? file.content.substring(0, 150) + '...' : '');
    
    return `
      <div class="file-preview">
        <p>${this.escapeHtml(preview)}</p>
        ${file.categories && file.categories.length > 0 ? `
          <div class="file-categories">
            ${file.categories.map(cat => `
              <span class="tag" style="background-color: ${cat.color || '#4A90E2'}20; color: ${cat.color || '#4A90E2'}">
                ${cat.name}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
    if (this.pagination.totalPages <= 1) return '';
    
    const { currentPage, totalPages, totalItems, itemsPerPage } = this.pagination;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    return `
      <div class="pagination-wrapper">
        <div class="pagination-info">
          Showing ${startItem}-${endItem} of ${totalItems} files
        </div>
        
        <div class="pagination-controls">
          <button class="btn btn-secondary" 
                  id="prev-page" 
                  ${currentPage === 1 ? 'disabled' : ''}>
            ← Previous
          </button>
          
          <div class="pagination-pages">
            ${this.renderPageNumbers()}
          </div>
          
          <button class="btn btn-secondary" 
                  id="next-page" 
                  ${currentPage === totalPages ? 'disabled' : ''}>
            Next →
          </button>
        </div>
        
        <div class="items-per-page">
          <label>Items per page:</label>
          <select id="items-per-page">
            <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
            <option value="200" ${itemsPerPage === 200 ? 'selected' : ''}>200</option>
            <option value="500" ${itemsPerPage === 500 ? 'selected' : ''}>500</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Render page numbers
   */
  renderPageNumbers() {
    const { currentPage, totalPages } = this.pagination;
    const pages = [];
    
    // Show first page
    if (currentPage > 3) {
      pages.push(`<button class="page-btn" data-page="1">1</button>`);
      if (currentPage > 4) {
        pages.push(`<span class="page-ellipsis">...</span>`);
      }
    }
    
    // Show pages around current
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.push(`
        <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `);
    }
    
    // Show last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        pages.push(`<span class="page-ellipsis">...</span>`);
      }
      pages.push(`<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`);
    }
    
    return pages.join('');
  }

  /**
   * Render bulk actions panel
   */
  renderBulkActions() {
    const selectedCount = this.selectedFiles.size;
    
    if (selectedCount === 0) return '';
    
    return `
      <div class="bulk-actions-panel">
        <div class="bulk-actions-header">
          <span class="selected-count">${selectedCount} files selected</span>
          <button class="btn-icon" id="clear-selection" title="Clear selection">✕</button>
        </div>
        
        <div class="bulk-actions-buttons">
          <button class="btn btn-primary" id="bulk-analyze">
            🧠 Analyze Selected
          </button>
          <button class="btn btn-secondary" id="bulk-categorize">
            🏷️ Categorize Selected
          </button>
          <button class="btn btn-success" id="bulk-approve">
            ✅ Approve Selected
          </button>
          <button class="btn btn-danger" id="bulk-remove">
            🗑️ Remove Selected
          </button>
        </div>
        
        <div class="bulk-actions-shortcuts">
          <span class="shortcut">Ctrl+A: Select All</span>
          <span class="shortcut">Ctrl+I: Analyze</span>
          <span class="shortcut">Ctrl+K: Categorize</span>
          <span class="shortcut">Ctrl+D: Approve</span>
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const hasFiles = this.files.length > 0;
    
    if (!hasFiles) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>No Files Discovered</h3>
          <p>Start by discovering files from your directories or Obsidian vaults.</p>
          <button class="btn btn-primary" id="start-discovery">
            🔍 Start Discovery
          </button>
        </div>
      `;
    } else {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No Files Match Current Filter</h3>
          <p>Try adjusting your search terms or filter criteria.</p>
          <button class="btn btn-secondary" id="clear-filters">
            Clear Filters
          </button>
        </div>
      `;
    }
  }

  /**
   * Render error state
   */
  renderError(message) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Discovery View Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          🔄 Reload Page
        </button>
      </div>
    `;
  }

  /**
   * Attach event listeners after render
   */
  attachEventListeners() {
    // Search input
    const searchInput = document.getElementById('file-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.applyFilters();
        this.throttledRender();
        
        // Update clear button visibility
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
          clearBtn.classList.toggle('visible', e.target.value.length > 0);
        }
      });
    }
    
    // Clear search
    const clearSearch = document.getElementById('clear-search');
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        this.searchQuery = '';
        this.applyFilters();
        this.throttledRender();
      });
    }
    
    // Filter select
    const filterSelect = document.getElementById('file-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.applyFilters();
        this.throttledRender();
      });
    }
    
    // Sort select
    const sortSelect = document.getElementById('file-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.applyFilters();
        this.throttledRender();
      });
    }
    
    // View toggle
    document.getElementById('view-grid')?.addEventListener('click', () => {
      this.viewMode = 'grid';
      this.throttledRender();
    });
    
    document.getElementById('view-list')?.addEventListener('click', () => {
      this.viewMode = 'list';
      this.throttledRender();
    });
    
    // File cards
    this.attachFileCardListeners();
    
    // Pagination
    this.attachPaginationListeners();
    
    // Bulk actions
    this.attachBulkActionListeners();
    
    // Discovery actions
    document.getElementById('start-discovery')?.addEventListener('click', () => {
      this.startDiscovery();
    });
    
    document.getElementById('configure-patterns')?.addEventListener('click', () => {
      this.openPatternConfiguration();
    });
  }

  /**
   * Attach file card event listeners
   */
  attachFileCardListeners() {
    const fileCards = document.querySelectorAll('.file-card');
    
    fileCards.forEach(card => {
      const fileId = card.dataset.fileId;
      
      // Click to select
      card.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox' && !e.target.closest('.file-card-actions')) {
          this.toggleFileSelection(fileId);
        }
      });
      
      // Checkbox
      const checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.toggleFileSelection(fileId);
        });
      }
      
      // Hover for preview
      card.addEventListener('mouseenter', () => {
        this.showFilePreview(fileId, card);
      });
      
      card.addEventListener('mouseleave', () => {
        this.hideFilePreview();
      });
      
      // Keyboard navigation
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleFileSelection(fileId);
        }
      });
    });
  }

  /**
   * Attach pagination event listeners
   */
  attachPaginationListeners() {
    // Page buttons
    document.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        this.goToPage(page);
      });
    });
    
    // Previous/Next
    document.getElementById('prev-page')?.addEventListener('click', () => {
      this.goToPage(this.pagination.currentPage - 1);
    });
    
    document.getElementById('next-page')?.addEventListener('click', () => {
      this.goToPage(this.pagination.currentPage + 1);
    });
    
    // Items per page
    document.getElementById('items-per-page')?.addEventListener('change', (e) => {
      this.pagination.itemsPerPage = parseInt(e.target.value);
      this.pagination.currentPage = 1;
      this.updatePagination();
      this.throttledRender();
    });
  }

  /**
   * Attach bulk action event listeners
   */
  attachBulkActionListeners() {
    document.getElementById('clear-selection')?.addEventListener('click', () => {
      this.clearSelection();
    });
    
    document.getElementById('bulk-analyze')?.addEventListener('click', () => {
      this.bulkAnalyze();
    });
    
    document.getElementById('bulk-categorize')?.addEventListener('click', () => {
      this.bulkCategorize();
    });
    
    document.getElementById('bulk-approve')?.addEventListener('click', () => {
      this.bulkApprove();
    });
    
    document.getElementById('bulk-remove')?.addEventListener('click', () => {
      this.bulkRemove();
    });
    
    // Clear filters
    document.getElementById('clear-filters')?.addEventListener('click', () => {
      this.clearFilters();
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(e) {
    // Only handle if discovery view is active
    if (!this.container || !this.container.contains(document.activeElement)) {
      return;
    }
    
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'a':
          e.preventDefault();
          this.selectAll();
          break;
        case 'i':
          e.preventDefault();
          this.bulkAnalyze();
          break;
        case 'k':
          e.preventDefault();
          this.bulkCategorize();
          break;
        case 'd':
          e.preventDefault();
          this.bulkApprove();
          break;
        case '/':
          e.preventDefault();
          document.getElementById('file-search')?.focus();
          break;
      }
    } else if (e.key === 'Escape') {
      this.clearSelection();
      document.getElementById('file-search')?.blur();
    }
  }

  // === FILE OPERATIONS ===

  /**
   * Start file discovery process
   */
  async startDiscovery() {
    try {
      // Call V1 discovery through bridge
      await legacyBridge.executeV1Function('DiscoveryManager.startDiscovery');
      console.log('[DiscoveryView] Discovery started');
      
    } catch (error) {
      console.error('[DiscoveryView] Discovery failed:', error);
      this.showNotification('Failed to start discovery: ' + error.message, 'error');
    }
  }

  /**
   * Open pattern configuration modal
   */
  openPatternConfiguration() {
    // TODO: Implement pattern configuration modal
    console.log('[DiscoveryView] Opening pattern configuration');
    this.showNotification('Pattern configuration not yet implemented', 'info');
  }

  /**
   * Analyze single file
   */
  async analyzeFile(fileId) {
    try {
      const file = this.files.find(f => f.id === fileId);
      if (!file) return;
      
      await legacyBridge.executeV1Function('AnalysisManager.analyzeFile', file);
      this.showNotification(`Analysis started for ${file.name}`, 'success');
      
    } catch (error) {
      console.error('[DiscoveryView] File analysis failed:', error);
      this.showNotification('Analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Preview file content
   */
  previewFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    // TODO: Implement file preview modal
    console.log('[DiscoveryView] Previewing file:', file.name);
    this.showNotification('File preview not yet implemented', 'info');
  }

  /**
   * Categorize single file
   */
  categorizeFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    // TODO: Implement categorization modal
    console.log('[DiscoveryView] Categorizing file:', file.name);
    this.showNotification('File categorization not yet implemented', 'info');
  }

  /**
   * Approve single file
   */
  async approveFile(fileId) {
    try {
      const file = this.files.find(f => f.id === fileId);
      if (!file) return;
      
      // Update file status through V1
      file.approved = true;
      legacyBridge.setV1Data('files', this.files);
      
      this.loadFiles();
      this.showNotification(`${file.name} approved`, 'success');
      
    } catch (error) {
      console.error('[DiscoveryView] File approval failed:', error);
      this.showNotification('Approval failed: ' + error.message, 'error');
    }
  }

  // === SELECTION OPERATIONS ===

  /**
   * Toggle file selection
   */
  toggleFileSelection(fileId) {
    if (this.selectedFiles.has(fileId)) {
      this.selectedFiles.delete(fileId);
    } else {
      this.selectedFiles.add(fileId);
    }
    
    this.updateFileCardSelection(fileId);
    this.throttledRender();
  }

  /**
   * Update file card selection visual state
   */
  updateFileCardSelection(fileId) {
    const card = document.querySelector(`[data-file-id="${fileId}"]`);
    const checkbox = card?.querySelector('input[type="checkbox"]');
    
    if (card && checkbox) {
      const isSelected = this.selectedFiles.has(fileId);
      card.classList.toggle('selected', isSelected);
      checkbox.checked = isSelected;
    }
  }

  /**
   * Select all visible files
   */
  selectAll() {
    const currentFiles = this.getCurrentPageFiles();
    currentFiles.forEach(file => this.selectedFiles.add(file.id));
    this.throttledRender();
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedFiles.clear();
    this.throttledRender();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.currentFilter = 'all';
    this.currentSort = 'relevance';
    this.searchQuery = '';
    this.applyFilters();
    this.throttledRender();
  }

  // === BULK OPERATIONS ===

  /**
   * Bulk analyze selected files
   */
  async bulkAnalyze() {
    const selectedFiles = this.getSelectedFiles();
    if (selectedFiles.length === 0) return;
    
    try {
      for (const file of selectedFiles) {
        await legacyBridge.executeV1Function('AnalysisManager.analyzeFile', file);
      }
      
      this.showNotification(`Analysis started for ${selectedFiles.length} files`, 'success');
      this.clearSelection();
      
    } catch (error) {
      console.error('[DiscoveryView] Bulk analysis failed:', error);
      this.showNotification('Bulk analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Bulk categorize selected files
   */
  bulkCategorize() {
    const selectedFiles = this.getSelectedFiles();
    if (selectedFiles.length === 0) return;
    
    // TODO: Implement bulk categorization modal
    console.log('[DiscoveryView] Bulk categorizing files:', selectedFiles.length);
    this.showNotification('Bulk categorization not yet implemented', 'info');
  }

  /**
   * Bulk approve selected files
   */
  async bulkApprove() {
    const selectedFiles = this.getSelectedFiles();
    if (selectedFiles.length === 0) return;
    
    try {
      selectedFiles.forEach(file => file.approved = true);
      legacyBridge.setV1Data('files', this.files);
      
      this.loadFiles();
      this.clearSelection();
      this.showNotification(`${selectedFiles.length} files approved`, 'success');
      
    } catch (error) {
      console.error('[DiscoveryView] Bulk approval failed:', error);
      this.showNotification('Bulk approval failed: ' + error.message, 'error');
    }
  }

  /**
   * Bulk remove selected files
   */
  async bulkRemove() {
    const selectedFiles = this.getSelectedFiles();
    if (selectedFiles.length === 0) return;
    
    if (!confirm(`Remove ${selectedFiles.length} files from discovery?`)) {
      return;
    }
    
    try {
      const fileIds = Array.from(this.selectedFiles);
      this.files = this.files.filter(file => !fileIds.includes(file.id));
      
      legacyBridge.setV1Data('files', this.files);
      
      this.clearSelection();
      this.loadFiles();
      this.showNotification(`${selectedFiles.length} files removed`, 'success');
      
    } catch (error) {
      console.error('[DiscoveryView] Bulk removal failed:', error);
      this.showNotification('Bulk removal failed: ' + error.message, 'error');
    }
  }

  // === PAGINATION ===

  /**
   * Go to specific page
   */
  goToPage(page) {
    if (page < 1 || page > this.pagination.totalPages) return;
    
    this.pagination.currentPage = page;
    this.throttledRender();
    
    // Scroll to top of file grid
    document.getElementById('file-grid')?.scrollIntoView({ behavior: 'smooth' });
  }

  // === PREVIEW SYSTEM ===

  /**
   * Show file preview tooltip
   */
  showFilePreview(fileId, cardElement) {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    this.hoverTimeout = setTimeout(() => {
      const file = this.files.find(f => f.id === fileId);
      if (!file || !file.preview) return;
      
      // TODO: Implement rich preview tooltip
      console.log('[DiscoveryView] Showing preview for:', file.name);
    }, 500);
  }

  /**
   * Hide file preview tooltip
   */
  hideFilePreview() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    
    // TODO: Hide preview tooltip
  }

  // === UTILITY METHODS ===

  /**
   * Get selected files
   */
  getSelectedFiles() {
    return this.files.filter(file => this.selectedFiles.has(file.id));
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      total: this.files.length,
      filtered: this.filteredFiles.length,
      selected: this.selectedFiles.size,
      analyzed: this.files.filter(f => f.analyzed).length,
      approved: this.files.filter(f => f.approved).length
    };
  }

  /**
   * Generate file ID
   */
  generateFileId(file) {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get display name for file
   */
  getDisplayName(file) {
    const name = file.name || file.path?.split('/').pop() || 'Unknown';
    return name.length > 30 ? name.substring(0, 27) + '...' : name;
  }

  /**
   * Get file icon
   */
  getFileIcon(file) {
    const ext = file.name?.split('.').pop()?.toLowerCase();
    return this.fileIcons[ext] || this.fileIcons.default;
  }

  /**
   * Get status badge
   */
  getStatusBadge(file) {
    if (file.approved) {
      return '<span class="badge badge-success">✅ Approved</span>';
    } else if (file.analyzed) {
      return '<span class="badge badge-primary">🧠 Analyzed</span>';
    } else {
      return '<span class="badge">⏳ Pending</span>';
    }
  }

  /**
   * Get searchable text
   */
  getSearchableText(file) {
    const parts = [
      file.name || '',
      file.path || '',
      file.content || '',
      file.preview?.segment1 || '',
      ...(file.categories || []).map(cat => cat.name)
    ];
    
    return parts.join(' ').toLowerCase();
  }

  /**
   * Truncate path for display
   */
  truncatePath(path, maxLength = 50) {
    if (path.length <= maxLength) return path;
    
    const parts = path.split('/');
    if (parts.length <= 2) return path;
    
    return `.../${parts.slice(-2).join('/')}`;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format date
   */
  formatDate(date) {
    if (!date) return 'Unknown';
    
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return d.toLocaleDateString();
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
   * Update file grid height for responsive layout
   */
  updateFileGridHeight() {
    const gridWrapper = document.querySelector('.file-grid-wrapper');
    if (!gridWrapper) return;
    
    // Calculate available height
    const header = document.querySelector('.discovery-header');
    const controls = document.querySelector('.discovery-controls');
    const pagination = document.querySelector('.pagination-wrapper');
    const bulkActions = document.querySelector('.bulk-actions-panel');
    
    let usedHeight = 0;
    [header, controls, pagination, bulkActions].forEach(el => {
      if (el) usedHeight += el.offsetHeight;
    });
    
    const availableHeight = window.innerHeight - usedHeight - 100; // 100px buffer
    gridWrapper.style.maxHeight = `${Math.max(400, availableHeight)}px`;
  }

  /**
   * Throttled render to prevent performance issues
   */
  throttledRender() {
    if (this.renderThrottle) {
      clearTimeout(this.renderThrottle);
    }
    
    this.renderThrottle = setTimeout(() => {
      this.render();
      this.renderThrottle = null;
    }, this.renderDelay);
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // TODO: Implement notification system
    console.log(`[DiscoveryView] ${type.toUpperCase()}: ${message}`);
    
    // For now, use browser notification
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    if (this.renderThrottle) {
      clearTimeout(this.renderThrottle);
    }
    
    this.selectedFiles.clear();
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyboard);
    window.removeEventListener('resize', this.throttledRender);
  }

  /**
   * Destroy the view
   */
  destroy() {
    this.cleanup();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log('[DiscoveryView] Destroyed');
  }
}

// Create global instance for onclick handlers
window.discoveryView = null;

export default DiscoveryView;