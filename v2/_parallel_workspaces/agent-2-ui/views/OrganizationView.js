/**
 * OrganizationView.js - File organization interface for KC V2
 * 
 * Provides intelligent file organization with drag-and-drop categorization,
 * bulk operations, category management, and export functionality
 * 
 * Features:
 * - Drag-and-drop categorization with visual feedback
 * - Bulk operations for efficient organization
 * - Category creation and management
 * - Multi-format export options
 * - Real-time organization statistics
 * - Keyboard-first interaction
 * - Visual organization graph
 */

import appState from '../../../js/core/AppState.js';
import eventBus, { Events } from '../../../js/core/EventBus.js';
import { legacyBridge } from '../../../js/core/LegacyBridge.js';

export class OrganizationView {
  constructor() {
    this.container = null;
    this.isInitialized = false;
    
    // Organization state
    this.files = [];
    this.categories = [];
    this.activeCategory = null;
    this.draggedFiles = [];
    
    // View configuration
    this.viewMode = 'kanban'; // kanban, list, graph
    this.sortBy = 'relevance';
    this.filterBy = 'all';
    
    // Selection state
    this.selectedFiles = new Set();
    this.hoveredCategory = null;
    
    // Export configuration
    this.exportConfig = {
      format: 'json',
      includeContent: false,
      includeAnalysis: true,
      includeMetadata: true
    };
    
    // Drag and drop state
    this.isDragging = false;
    this.dragSource = null;
    this.dropTarget = null;
    
    // Statistics
    this.stats = {
      totalFiles: 0,
      categorizedFiles: 0,
      uncategorizedFiles: 0,
      categoriesUsed: 0,
      avgFilesPerCategory: 0
    };
    
    // Color palette for categories
    this.colorPalette = [
      '#4A90E2', '#7ED321', '#F5A623', '#BD10E0',
      '#9013FE', '#50E3C2', '#B8E986', '#FF6B6B',
      '#4ECDC4', '#FFE66D', '#A8E6CF', '#FFDAB9'
    ];
    
    console.log('[OrganizationView] Initialized');
  }

  /**
   * Initialize the organization view
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
      await this.loadOrganizationState();
      
      this.isInitialized = true;
      console.log('[OrganizationView] Initialized successfully');
      
    } catch (error) {
      console.error('[OrganizationView] Initialization failed:', error);
      this.renderError('Failed to initialize Organization View');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // V1 sync events
    eventBus.on('v1:categories_updated', () => {
      this.loadCategories();
    });
    
    eventBus.on('v1:files_updated', () => {
      this.loadFiles();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    // Drag and drop events
    document.addEventListener('dragover', (e) => this.handleDragOver(e));
    document.addEventListener('drop', (e) => this.handleDrop(e));
    document.addEventListener('dragend', () => this.handleDragEnd());
  }

  /**
   * Load organization state from V1
   */
  async loadOrganizationState() {
    try {
      await this.loadCategories();
      await this.loadFiles();
      this.updateStatistics();
      
    } catch (error) {
      console.error('[OrganizationView] Failed to load state:', error);
    }
  }

  /**
   * Load categories from V1
   */
  async loadCategories() {
    try {
      this.categories = await legacyBridge.executeV1Function('CategoryManager.getCategories');
      
      // Ensure each category has required fields
      this.categories = this.categories.map((cat, index) => ({
        id: cat.id || `cat_${Date.now()}_${index}`,
        name: cat.name,
        color: cat.color || this.colorPalette[index % this.colorPalette.length],
        count: 0,
        files: []
      }));
      
      // Add uncategorized category
      if (!this.categories.find(c => c.id === 'uncategorized')) {
        this.categories.unshift({
          id: 'uncategorized',
          name: 'Uncategorized',
          color: '#6C757D',
          count: 0,
          files: []
        });
      }
      
    } catch (error) {
      console.error('[OrganizationView] Failed to load categories:', error);
      this.categories = [{
        id: 'uncategorized',
        name: 'Uncategorized',
        color: '#6C757D',
        count: 0,
        files: []
      }];
    }
  }

  /**
   * Load files from V1
   */
  async loadFiles() {
    try {
      const allFiles = appState.getFiles();
      
      // Filter to analyzed files
      this.files = allFiles.filter(f => f.analyzed).map(file => ({
        ...file,
        categoryIds: file.categories?.map(c => c.id) || []
      }));
      
      // Update category counts
      this.updateCategoryCounts();
      
    } catch (error) {
      console.error('[OrganizationView] Failed to load files:', error);
      this.files = [];
    }
  }

  /**
   * Update category counts
   */
  updateCategoryCounts() {
    // Reset counts
    this.categories.forEach(cat => {
      cat.count = 0;
      cat.files = [];
    });
    
    // Count files per category
    this.files.forEach(file => {
      if (file.categoryIds.length === 0) {
        const uncat = this.categories.find(c => c.id === 'uncategorized');
        if (uncat) {
          uncat.count++;
          uncat.files.push(file.id);
        }
      } else {
        file.categoryIds.forEach(catId => {
          const cat = this.categories.find(c => c.id === catId);
          if (cat) {
            cat.count++;
            cat.files.push(file.id);
          }
        });
      }
    });
  }

  /**
   * Render the organization view
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="organization-view">
        ${this.renderHeader()}
        ${this.renderToolbar()}
        ${this.renderMainContent()}
        ${this.renderExportPanel()}
      </div>
    `;
    
    this.attachEventListeners();
  }

  /**
   * Render header with statistics
   */
  renderHeader() {
    return `
      <div class="organization-header">
        <div class="organization-title">
          <h2>📂 File Organization</h2>
          <div class="organization-stats">
            <span class="stat-item">
              <span class="stat-value">${this.stats.totalFiles}</span>
              <span class="stat-label">total files</span>
            </span>
            <span class="stat-item">
              <span class="stat-value">${this.stats.categorizedFiles}</span>
              <span class="stat-label">organized</span>
            </span>
            <span class="stat-item">
              <span class="stat-value">${this.stats.uncategorizedFiles}</span>
              <span class="stat-label">pending</span>
            </span>
            <span class="stat-item">
              <span class="stat-value">${this.stats.categoriesUsed}</span>
              <span class="stat-label">categories</span>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render toolbar
   */
  renderToolbar() {
    return `
      <div class="organization-toolbar">
        <div class="toolbar-left">
          <div class="view-toggle">
            <button class="btn-icon ${this.viewMode === 'kanban' ? 'active' : ''}" 
                    id="view-kanban" title="Kanban View">
              ⚏
            </button>
            <button class="btn-icon ${this.viewMode === 'list' ? 'active' : ''}" 
                    id="view-list" title="List View">
              ☰
            </button>
            <button class="btn-icon ${this.viewMode === 'graph' ? 'active' : ''}" 
                    id="view-graph" title="Graph View">
              🕸️
            </button>
          </div>
          
          <div class="filter-controls">
            <select id="filter-select" class="filter-select">
              <option value="all">All Files</option>
              <option value="uncategorized">Uncategorized Only</option>
              <option value="categorized">Categorized Only</option>
              <option value="multi-category">Multi-Category</option>
            </select>
            
            <select id="sort-select" class="filter-select">
              <option value="relevance">Sort by Relevance</option>
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="category">Sort by Category</option>
            </select>
          </div>
        </div>
        
        <div class="toolbar-right">
          <button class="btn btn-secondary" id="manage-categories">
            🏷️ Manage Categories
          </button>
          <button class="btn btn-primary" id="auto-organize">
            🤖 Auto-Organize
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render main content based on view mode
   */
  renderMainContent() {
    switch (this.viewMode) {
      case 'kanban':
        return this.renderKanbanView();
      case 'list':
        return this.renderListView();
      case 'graph':
        return this.renderGraphView();
      default:
        return this.renderKanbanView();
    }
  }

  /**
   * Render Kanban view
   */
  renderKanbanView() {
    return `
      <div class="kanban-view">
        <div class="kanban-board">
          ${this.categories.map(category => this.renderKanbanColumn(category)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render Kanban column
   */
  renderKanbanColumn(category) {
    const files = category.files.map(fileId => 
      this.files.find(f => f.id === fileId)
    ).filter(Boolean);
    
    const isUncategorized = category.id === 'uncategorized';
    
    return `
      <div class="kanban-column" data-category-id="${category.id}">
        <div class="kanban-header" style="background-color: ${category.color}20; border-color: ${category.color}">
          <h3 style="color: ${category.color}">
            ${category.name}
            <span class="category-count">${category.count}</span>
          </h3>
          ${!isUncategorized ? `
            <div class="category-actions">
              <button class="btn-icon" onclick="organizationView.editCategory('${category.id}')" title="Edit">
                ✏️
              </button>
              <button class="btn-icon" onclick="organizationView.deleteCategory('${category.id}')" title="Delete">
                🗑️
              </button>
            </div>
          ` : ''}
        </div>
        
        <div class="kanban-content" 
             data-category-id="${category.id}"
             ondragover="event.preventDefault()"
             ondrop="organizationView.handleColumnDrop(event, '${category.id}')">
          ${files.length > 0 ? 
            files.map(file => this.renderFileCard(file, category)).join('') :
            `<div class="empty-category">
              <p>Drop files here to categorize</p>
            </div>`
          }
        </div>
      </div>
    `;
  }

  /**
   * Render file card for kanban
   */
  renderFileCard(file, category) {
    const isSelected = this.selectedFiles.has(file.id);
    
    return `
      <div class="file-card ${isSelected ? 'selected' : ''}" 
           data-file-id="${file.id}"
           draggable="true"
           ondragstart="organizationView.handleDragStart(event, '${file.id}')"
           onclick="organizationView.toggleFileSelection('${file.id}', event)">
        
        <div class="file-card-header">
          <span class="file-icon">${this.getFileIcon(file)}</span>
          <span class="file-name" title="${file.name}">${file.name}</span>
        </div>
        
        <div class="file-card-body">
          ${file.analysisType ? `
            <span class="analysis-type">${file.analysisType}</span>
          ` : ''}
          
          <div class="file-scores">
            <span class="score-badge" title="Relevance">
              📊 ${Math.round((file.relevanceScore || 0) * 100)}%
            </span>
            ${file.confidenceScore ? `
              <span class="score-badge" title="Confidence">
                🎯 ${Math.round(file.confidenceScore * 100)}%
              </span>
            ` : ''}
          </div>
        </div>
        
        ${file.categoryIds.length > 1 ? `
          <div class="file-card-footer">
            <div class="multi-category-indicator" title="File belongs to multiple categories">
              🏷️ +${file.categoryIds.length - 1}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render list view
   */
  renderListView() {
    const filteredFiles = this.getFilteredFiles();
    
    return `
      <div class="list-view">
        <table class="organization-table">
          <thead>
            <tr>
              <th class="select-column">
                <input type="checkbox" id="select-all" onchange="organizationView.toggleSelectAll()">
              </th>
              <th>File Name</th>
              <th>Analysis Type</th>
              <th>Categories</th>
              <th>Relevance</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredFiles.map(file => this.renderFileRow(file)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render file row for list view
   */
  renderFileRow(file) {
    const isSelected = this.selectedFiles.has(file.id);
    const categories = file.categoryIds.map(id => 
      this.categories.find(c => c.id === id)
    ).filter(Boolean);
    
    return `
      <tr class="file-row ${isSelected ? 'selected' : ''}" data-file-id="${file.id}">
        <td class="select-column">
          <input type="checkbox" 
                 ${isSelected ? 'checked' : ''}
                 onchange="organizationView.toggleFileSelection('${file.id}', event)">
        </td>
        <td class="file-name">
          <span class="file-icon">${this.getFileIcon(file)}</span>
          ${file.name}
        </td>
        <td>${file.analysisType || '-'}</td>
        <td class="categories-cell">
          ${categories.length > 0 ? 
            categories.map(cat => `
              <span class="category-tag" 
                    style="background-color: ${cat.color}20; color: ${cat.color}">
                ${cat.name}
              </span>
            `).join('') :
            '<span class="no-category">Uncategorized</span>'
          }
        </td>
        <td>${Math.round((file.relevanceScore || 0) * 100)}%</td>
        <td>${file.confidenceScore ? Math.round(file.confidenceScore * 100) + '%' : '-'}</td>
        <td class="actions-cell">
          <button class="btn-icon" onclick="organizationView.categorizeFile('${file.id}')" title="Categorize">
            🏷️
          </button>
          <button class="btn-icon" onclick="organizationView.viewFileDetails('${file.id}')" title="View Details">
            👁️
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Render graph view
   */
  renderGraphView() {
    return `
      <div class="graph-view">
        <div class="graph-container" id="organization-graph">
          <div class="graph-loading">
            <div class="loading-spinner"></div>
            <p>Loading organization graph...</p>
          </div>
        </div>
        <div class="graph-controls">
          <button class="btn-icon" id="zoom-in" title="Zoom In">➕</button>
          <button class="btn-icon" id="zoom-out" title="Zoom Out">➖</button>
          <button class="btn-icon" id="reset-graph" title="Reset View">🔄</button>
          <button class="btn-icon" id="toggle-labels" title="Toggle Labels">🏷️</button>
        </div>
      </div>
    `;
  }

  /**
   * Render export panel
   */
  renderExportPanel() {
    if (this.selectedFiles.size === 0) return '';
    
    return `
      <div class="export-panel">
        <div class="export-header">
          <h3>📤 Export Options</h3>
          <span class="selected-count">${this.selectedFiles.size} files selected</span>
        </div>
        
        <div class="export-options">
          <div class="export-format">
            <label>Format:</label>
            <select id="export-format">
              <option value="json">JSON (RAG)</option>
              <option value="markdown">Markdown</option>
              <option value="csv">CSV</option>
              <option value="html">HTML</option>
            </select>
          </div>
          
          <div class="export-settings">
            <label class="checkbox-label">
              <input type="checkbox" id="include-content" ${this.exportConfig.includeContent ? 'checked' : ''}>
              Include file content
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="include-analysis" ${this.exportConfig.includeAnalysis ? 'checked' : ''}>
              Include AI analysis
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="include-metadata" ${this.exportConfig.includeMetadata ? 'checked' : ''}>
              Include metadata
            </label>
          </div>
          
          <div class="export-actions">
            <button class="btn btn-primary" id="export-selected">
              💾 Export Selected
            </button>
            <button class="btn btn-secondary" id="export-all">
              📦 Export All
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // View mode toggles
    document.getElementById('view-kanban')?.addEventListener('click', () => {
      this.viewMode = 'kanban';
      this.render();
    });
    
    document.getElementById('view-list')?.addEventListener('click', () => {
      this.viewMode = 'list';
      this.render();
    });
    
    document.getElementById('view-graph')?.addEventListener('click', () => {
      this.viewMode = 'graph';
      this.render();
      setTimeout(() => this.initializeGraph(), 100);
    });
    
    // Filter and sort
    document.getElementById('filter-select')?.addEventListener('change', (e) => {
      this.filterBy = e.target.value;
      this.render();
    });
    
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });
    
    // Category management
    document.getElementById('manage-categories')?.addEventListener('click', () => {
      this.openCategoryManager();
    });
    
    document.getElementById('auto-organize')?.addEventListener('click', () => {
      this.autoOrganize();
    });
    
    // Export options
    document.getElementById('export-format')?.addEventListener('change', (e) => {
      this.exportConfig.format = e.target.value;
    });
    
    document.getElementById('include-content')?.addEventListener('change', (e) => {
      this.exportConfig.includeContent = e.target.checked;
    });
    
    document.getElementById('include-analysis')?.addEventListener('change', (e) => {
      this.exportConfig.includeAnalysis = e.target.checked;
    });
    
    document.getElementById('include-metadata')?.addEventListener('change', (e) => {
      this.exportConfig.includeMetadata = e.target.checked;
    });
    
    document.getElementById('export-selected')?.addEventListener('click', () => {
      this.exportSelected();
    });
    
    document.getElementById('export-all')?.addEventListener('click', () => {
      this.exportAll();
    });
    
    // Graph controls
    if (this.viewMode === 'graph') {
      document.getElementById('zoom-in')?.addEventListener('click', () => {
        this.zoomGraph(1.2);
      });
      
      document.getElementById('zoom-out')?.addEventListener('click', () => {
        this.zoomGraph(0.8);
      });
      
      document.getElementById('reset-graph')?.addEventListener('click', () => {
        this.resetGraph();
      });
      
      document.getElementById('toggle-labels')?.addEventListener('click', () => {
        this.toggleGraphLabels();
      });
    }
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
        case 'a':
          e.preventDefault();
          this.selectAll();
          break;
        case 'd':
          e.preventDefault();
          this.deselectAll();
          break;
        case 'g':
          e.preventDefault();
          this.groupSelected();
          break;
        case 'e':
          e.preventDefault();
          this.exportSelected();
          break;
      }
    }
  }

  // === DRAG AND DROP ===

  /**
   * Handle drag start
   */
  handleDragStart(e, fileId) {
    this.isDragging = true;
    this.draggedFiles = this.selectedFiles.has(fileId) 
      ? Array.from(this.selectedFiles) 
      : [fileId];
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.draggedFiles.join(','));
    
    // Visual feedback
    e.target.classList.add('dragging');
    
    // Create custom drag image for multiple files
    if (this.draggedFiles.length > 1) {
      const dragImage = document.createElement('div');
      dragImage.className = 'drag-image';
      dragImage.textContent = `${this.draggedFiles.length} files`;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => dragImage.remove(), 0);
    }
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Find drop target
    const column = e.target.closest('.kanban-content');
    if (column) {
      // Remove previous hover states
      document.querySelectorAll('.drop-hover').forEach(el => {
        el.classList.remove('drop-hover');
      });
      
      column.classList.add('drop-hover');
      this.dropTarget = column.dataset.categoryId;
    }
  }

  /**
   * Handle drop on column
   */
  handleColumnDrop(e, categoryId) {
    e.preventDefault();
    
    if (!this.isDragging || !this.draggedFiles.length) return;
    
    // Move files to category
    this.moveFilesToCategory(this.draggedFiles, categoryId);
    
    // Cleanup
    this.handleDragEnd();
  }

  /**
   * Handle drag end
   */
  handleDragEnd() {
    this.isDragging = false;
    this.draggedFiles = [];
    this.dropTarget = null;
    
    // Remove visual feedback
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    
    document.querySelectorAll('.drop-hover').forEach(el => {
      el.classList.remove('drop-hover');
    });
  }

  // === FILE OPERATIONS ===

  /**
   * Toggle file selection
   */
  toggleFileSelection(fileId, event) {
    if (event?.shiftKey && this.lastSelectedFile) {
      // Range selection
      this.selectRange(this.lastSelectedFile, fileId);
    } else if (event?.ctrlKey || event?.metaKey) {
      // Toggle selection
      if (this.selectedFiles.has(fileId)) {
        this.selectedFiles.delete(fileId);
      } else {
        this.selectedFiles.add(fileId);
      }
    } else {
      // Single selection
      this.selectedFiles.clear();
      this.selectedFiles.add(fileId);
    }
    
    this.lastSelectedFile = fileId;
    this.render();
  }

  /**
   * Select range of files
   */
  selectRange(startId, endId) {
    const files = this.getFilteredFiles();
    const startIndex = files.findIndex(f => f.id === startId);
    const endIndex = files.findIndex(f => f.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
    
    for (let i = min; i <= max; i++) {
      this.selectedFiles.add(files[i].id);
    }
  }

  /**
   * Select all files
   */
  selectAll() {
    const files = this.getFilteredFiles();
    files.forEach(file => this.selectedFiles.add(file.id));
    this.render();
  }

  /**
   * Deselect all files
   */
  deselectAll() {
    this.selectedFiles.clear();
    this.render();
  }

  /**
   * Toggle select all
   */
  toggleSelectAll() {
    const checkbox = document.getElementById('select-all');
    if (checkbox?.checked) {
      this.selectAll();
    } else {
      this.deselectAll();
    }
  }

  /**
   * Move files to category
   */
  async moveFilesToCategory(fileIds, categoryId) {
    try {
      const category = this.categories.find(c => c.id === categoryId);
      if (!category) return;
      
      for (const fileId of fileIds) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) continue;
        
        // Update file categories
        if (categoryId === 'uncategorized') {
          file.categoryIds = [];
          file.categories = [];
        } else {
          // Remove from uncategorized if adding to a category
          file.categoryIds = file.categoryIds.filter(id => id !== 'uncategorized');
          
          // Add to new category if not already there
          if (!file.categoryIds.includes(categoryId)) {
            file.categoryIds.push(categoryId);
            file.categories = file.categoryIds.map(id => 
              this.categories.find(c => c.id === id)
            ).filter(Boolean);
          }
        }
        
        // Update V1 state
        await legacyBridge.executeV1Function('CategoryManager.updateFileCategories', file.id, file.categories);
      }
      
      // Update counts and render
      this.updateCategoryCounts();
      this.updateStatistics();
      this.render();
      
      this.showNotification(`${fileIds.length} files moved to ${category.name}`, 'success');
      
    } catch (error) {
      console.error('[OrganizationView] Failed to move files:', error);
      this.showNotification('Failed to move files: ' + error.message, 'error');
    }
  }

  /**
   * Categorize single file
   */
  categorizeFile(fileId) {
    // TODO: Implement categorization modal
    console.log('[OrganizationView] Categorizing file:', fileId);
    this.showNotification('File categorization modal not yet implemented', 'info');
  }

  /**
   * View file details
   */
  viewFileDetails(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    // TODO: Implement file details modal
    console.log('[OrganizationView] Viewing file details:', file);
    this.showNotification('File details modal not yet implemented', 'info');
  }

  /**
   * Group selected files into new category
   */
  async groupSelected() {
    if (this.selectedFiles.size === 0) return;
    
    const name = prompt('Enter name for new category:');
    if (!name) return;
    
    try {
      // Create new category
      const newCategory = await legacyBridge.executeV1Function('CategoryManager.createCategory', {
        name,
        color: this.colorPalette[this.categories.length % this.colorPalette.length]
      });
      
      // Move selected files to new category
      await this.moveFilesToCategory(Array.from(this.selectedFiles), newCategory.id);
      
      // Reload and render
      await this.loadCategories();
      this.render();
      
    } catch (error) {
      console.error('[OrganizationView] Failed to group files:', error);
      this.showNotification('Failed to create category: ' + error.message, 'error');
    }
  }

  // === CATEGORY OPERATIONS ===

  /**
   * Open category manager
   */
  openCategoryManager() {
    // TODO: Implement category manager modal
    console.log('[OrganizationView] Opening category manager');
    this.showNotification('Category manager not yet implemented', 'info');
  }

  /**
   * Edit category
   */
  async editCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category || category.id === 'uncategorized') return;
    
    const newName = prompt('Edit category name:', category.name);
    if (!newName || newName === category.name) return;
    
    try {
      await legacyBridge.executeV1Function('CategoryManager.updateCategory', categoryId, {
        name: newName
      });
      
      await this.loadCategories();
      this.render();
      
    } catch (error) {
      console.error('[OrganizationView] Failed to edit category:', error);
      this.showNotification('Failed to edit category: ' + error.message, 'error');
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category || category.id === 'uncategorized') return;
    
    if (!confirm(`Delete category "${category.name}"? Files will become uncategorized.`)) {
      return;
    }
    
    try {
      await legacyBridge.executeV1Function('CategoryManager.deleteCategory', categoryId);
      
      await this.loadCategories();
      await this.loadFiles();
      this.render();
      
    } catch (error) {
      console.error('[OrganizationView] Failed to delete category:', error);
      this.showNotification('Failed to delete category: ' + error.message, 'error');
    }
  }

  /**
   * Auto-organize files
   */
  async autoOrganize() {
    try {
      // TODO: Implement AI-powered auto-organization
      console.log('[OrganizationView] Auto-organizing files');
      this.showNotification('AI auto-organization not yet implemented', 'info');
      
    } catch (error) {
      console.error('[OrganizationView] Auto-organize failed:', error);
      this.showNotification('Auto-organize failed: ' + error.message, 'error');
    }
  }

  // === EXPORT OPERATIONS ===

  /**
   * Export selected files
   */
  async exportSelected() {
    if (this.selectedFiles.size === 0) return;
    
    const files = Array.from(this.selectedFiles).map(id => 
      this.files.find(f => f.id === id)
    ).filter(Boolean);
    
    await this.exportFiles(files, `selected-${this.selectedFiles.size}-files`);
  }

  /**
   * Export all files
   */
  async exportAll() {
    await this.exportFiles(this.files, 'all-organized-files');
  }

  /**
   * Export files in specified format
   */
  async exportFiles(files, filename) {
    try {
      let content;
      let mimeType;
      let extension;
      
      switch (this.exportConfig.format) {
        case 'json':
          content = await this.exportAsJSON(files);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'markdown':
          content = await this.exportAsMarkdown(files);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
        case 'csv':
          content = await this.exportAsCSV(files);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'html':
          content = await this.exportAsHTML(files);
          mimeType = 'text/html';
          extension = 'html';
          break;
        default:
          throw new Error('Invalid export format');
      }
      
      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${Date.now()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification(`Exported ${files.length} files as ${this.exportConfig.format.toUpperCase()}`, 'success');
      
    } catch (error) {
      console.error('[OrganizationView] Export failed:', error);
      this.showNotification('Export failed: ' + error.message, 'error');
    }
  }

  /**
   * Export as JSON (RAG format)
   */
  async exportAsJSON(files) {
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalFiles: files.length,
        categories: this.categories.filter(c => c.id !== 'uncategorized'),
        exportConfig: this.exportConfig
      },
      files: files.map(file => {
        const obj = {
          id: file.id,
          name: file.name,
          path: file.path,
          categories: file.categories || []
        };
        
        if (this.exportConfig.includeContent) {
          obj.content = file.content;
          obj.preview = file.preview;
        }
        
        if (this.exportConfig.includeAnalysis) {
          obj.analysisType = file.analysisType;
          obj.relevanceScore = file.relevanceScore;
          obj.confidenceScore = file.confidenceScore;
        }
        
        if (this.exportConfig.includeMetadata) {
          obj.size = file.size;
          obj.lastModified = file.lastModified;
          obj.analyzed = file.analyzed;
        }
        
        return obj;
      })
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export as Markdown
   */
  async exportAsMarkdown(files) {
    const lines = ['# Knowledge Base Export', ''];
    lines.push(`*Exported on ${new Date().toLocaleString()}*`);
    lines.push(`*Total files: ${files.length}*`);
    lines.push('');
    
    // Group by category
    const byCategory = {};
    files.forEach(file => {
      const catNames = file.categories?.map(c => c.name).join(', ') || 'Uncategorized';
      if (!byCategory[catNames]) byCategory[catNames] = [];
      byCategory[catNames].push(file);
    });
    
    // Write each category
    Object.entries(byCategory).forEach(([category, catFiles]) => {
      lines.push(`## ${category}`);
      lines.push('');
      
      catFiles.forEach(file => {
        lines.push(`### ${file.name}`);
        
        if (this.exportConfig.includeAnalysis && file.analysisType) {
          lines.push(`**Analysis**: ${file.analysisType} (${Math.round((file.relevanceScore || 0) * 100)}% relevance)`);
        }
        
        if (this.exportConfig.includeContent && file.preview) {
          lines.push('');
          lines.push(file.preview.segment1 || 'No preview available');
        }
        
        lines.push('');
      });
    });
    
    return lines.join('\n');
  }

  /**
   * Export as CSV
   */
  async exportAsCSV(files) {
    const headers = ['File Name', 'Path', 'Categories'];
    
    if (this.exportConfig.includeAnalysis) {
      headers.push('Analysis Type', 'Relevance %', 'Confidence %');
    }
    
    if (this.exportConfig.includeMetadata) {
      headers.push('Size', 'Last Modified');
    }
    
    const rows = [headers];
    
    files.forEach(file => {
      const row = [
        file.name,
        file.path || '',
        file.categories?.map(c => c.name).join('; ') || ''
      ];
      
      if (this.exportConfig.includeAnalysis) {
        row.push(
          file.analysisType || '',
          Math.round((file.relevanceScore || 0) * 100).toString(),
          file.confidenceScore ? Math.round(file.confidenceScore * 100).toString() : ''
        );
      }
      
      if (this.exportConfig.includeMetadata) {
        row.push(
          file.size ? this.formatFileSize(file.size) : '',
          file.lastModified ? new Date(file.lastModified).toLocaleDateString() : ''
        );
      }
      
      rows.push(row);
    });
    
    // Convert to CSV
    return rows.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Export as HTML
   */
  async exportAsHTML(files) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Knowledge Base Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .category { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .file { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
    .metadata { font-size: 0.9em; color: #666; }
    .score { display: inline-block; margin: 0 10px; padding: 2px 8px; background: #e0e0e0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Knowledge Base Export</h1>
  <p>Exported on ${new Date().toLocaleString()}</p>
  <p>Total files: ${files.length}</p>
  
  ${this.generateHTMLContent(files)}
</body>
</html>`;
    
    return html;
  }

  /**
   * Generate HTML content for export
   */
  generateHTMLContent(files) {
    const byCategory = {};
    files.forEach(file => {
      const catNames = file.categories?.map(c => c.name).join(', ') || 'Uncategorized';
      if (!byCategory[catNames]) byCategory[catNames] = [];
      byCategory[catNames].push(file);
    });
    
    return Object.entries(byCategory).map(([category, catFiles]) => `
      <div class="category">
        <h2>${category}</h2>
        ${catFiles.map(file => `
          <div class="file">
            <h3>${file.name}</h3>
            ${this.exportConfig.includeAnalysis && file.analysisType ? `
              <p class="metadata">
                Analysis: ${file.analysisType}
                <span class="score">Relevance: ${Math.round((file.relevanceScore || 0) * 100)}%</span>
                ${file.confidenceScore ? `<span class="score">Confidence: ${Math.round(file.confidenceScore * 100)}%</span>` : ''}
              </p>
            ` : ''}
            ${this.exportConfig.includeContent && file.preview ? `
              <p>${file.preview.segment1 || 'No preview available'}</p>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // === GRAPH VIEW ===

  /**
   * Initialize organization graph
   */
  initializeGraph() {
    // TODO: Implement D3.js or vis.js graph visualization
    console.log('[OrganizationView] Initializing organization graph');
    
    const container = document.getElementById('organization-graph');
    if (container) {
      container.innerHTML = `
        <div class="graph-placeholder">
          <p>Organization graph visualization will be implemented here</p>
          <p>It will show relationships between files and categories</p>
        </div>
      `;
    }
  }

  /**
   * Zoom graph
   */
  zoomGraph(factor) {
    console.log('[OrganizationView] Zooming graph by factor:', factor);
  }

  /**
   * Reset graph view
   */
  resetGraph() {
    console.log('[OrganizationView] Resetting graph view');
  }

  /**
   * Toggle graph labels
   */
  toggleGraphLabels() {
    console.log('[OrganizationView] Toggling graph labels');
  }

  // === UTILITY METHODS ===

  /**
   * Get filtered files
   */
  getFilteredFiles() {
    let filtered = [...this.files];
    
    // Apply filter
    switch (this.filterBy) {
      case 'uncategorized':
        filtered = filtered.filter(f => f.categoryIds.length === 0);
        break;
      case 'categorized':
        filtered = filtered.filter(f => f.categoryIds.length > 0);
        break;
      case 'multi-category':
        filtered = filtered.filter(f => f.categoryIds.length > 1);
        break;
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return (b.lastModified || 0) - (a.lastModified || 0);
        case 'category':
          const aCat = a.categories?.[0]?.name || 'zzz';
          const bCat = b.categories?.[0]?.name || 'zzz';
          return aCat.localeCompare(bCat);
        case 'relevance':
        default:
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }
    });
    
    return filtered;
  }

  /**
   * Update statistics
   */
  updateStatistics() {
    this.stats.totalFiles = this.files.length;
    this.stats.categorizedFiles = this.files.filter(f => f.categoryIds.length > 0).length;
    this.stats.uncategorizedFiles = this.files.filter(f => f.categoryIds.length === 0).length;
    this.stats.categoriesUsed = this.categories.filter(c => c.count > 0 && c.id !== 'uncategorized').length;
    this.stats.avgFilesPerCategory = this.stats.categoriesUsed > 0 
      ? Math.round(this.stats.categorizedFiles / this.stats.categoriesUsed)
      : 0;
  }

  /**
   * Get file icon
   */
  getFileIcon(file) {
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const icons = {
      'md': '📝',
      'txt': '📄',
      'docx': '📘',
      'pdf': '📕',
      'gdoc': '📗',
      'default': '📄'
    };
    return icons[ext] || icons.default;
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
   * Show notification
   */
  showNotification(message, type = 'info') {
    console.log(`[OrganizationView] ${type.toUpperCase()}: ${message}`);
  }

  /**
   * Render error state
   */
  renderError(message) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Organization View Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          🔄 Reload Page
        </button>
      </div>
    `;
  }

  /**
   * Destroy the view
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log('[OrganizationView] Destroyed');
  }
}

// Create global instance for onclick handlers
window.organizationView = null;

export default OrganizationView;