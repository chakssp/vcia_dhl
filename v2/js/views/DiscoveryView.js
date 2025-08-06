/**
 * DiscoveryView.js - Main file discovery interface for KC V2
 * Updated to match V1 functionality with file preview
 */

import appState from '../core/AppState.js';
import eventBus, { Events } from '../core/EventBus.js';
import FilterPanel from '../components/FilterPanel.js';

export class DiscoveryView {
  constructor() {
    this.container = null;
    this.files = [];
    this.filteredFiles = [];
    this.selectedFiles = new Set();
    this.isInitialized = false;
    
    // Pattern configuration
    this.includePatterns = ['*.md', '*.txt'];
    this.excludePatterns = ['.git/', 'node_modules/', '*.tmp', '*.cache'];
    
    // Directory management
    this.directories = [];
    
    // Currently selected file for preview
    this.currentPreviewFile = null;
    
    // Filter panel instance
    this.filterPanel = new FilterPanel();
    
    // Make this instance globally accessible for inline handlers
    window._discoveryView = this;
    
    console.log('[DiscoveryView] Initialized');
  }

  /**
   * Initialize the discovery view
   */
  async initialize(container) {
    try {
      this.container = container;
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Wait for next tick to ensure DOM is ready
      setTimeout(() => {
        // Initialize filter panel
        const filterPanelContainer = document.getElementById('filter-panel-container');
        console.log('[DiscoveryView] Filter panel container:', filterPanelContainer);
        if (filterPanelContainer) {
          console.log('[DiscoveryView] Initializing FilterPanel...');
          this.filterPanel.initialize(filterPanelContainer);
          console.log('[DiscoveryView] FilterPanel initialized');
        } else {
          console.error('[DiscoveryView] Filter panel container not found');
        }
      }, 0);
      
      // Load any existing files from AppState
      const existingFiles = appState.get('files') || appState.get('discoveredFiles') || [];
      if (existingFiles.length > 0) {
        this.files = existingFiles;
      }
      
      // Always update file list to show templates if no files
      this.updateFileList();
      
      // Attach UI event listeners
      this.attachUIEventListeners();
      
      this.isInitialized = true;
      console.log('[DiscoveryView] Initialized successfully');
      
    } catch (error) {
      console.error('[DiscoveryView] Initialization failed:', error);
    }
  }

  /**
   * Setup event listeners for file discovery events
   */
  setupEventListeners() {
    // File discovery events
    eventBus.on('discovery:completed', (data) => {
      console.log('[DiscoveryView] Discovery completed:', data);
      if (data.files) {
        this.files = data.files;
        this.updateFileList();
        this.updateStats();
      }
    });
    
    eventBus.on('discovery:progress', (data) => {
      console.log('[DiscoveryView] Discovery progress:', data);
    });
    
    eventBus.on('discovery:error', (data) => {
      console.error('[DiscoveryView] Discovery error:', data);
      this.showNotification(data.error || 'Discovery failed', 'error');
    });
    
    // State change events
    eventBus.on('state:changed', ({ key, newValue }) => {
      if (key === 'files' || key === 'discoveredFiles') {
        this.files = newValue || [];
        this.updateFileList();
      }
    });
    
    // Filter change events
    eventBus.on('filters:changed', () => {
      this.updateFileList();
    });
    
    eventBus.on('filters:reset', () => {
      this.updateFileList();
    });
  }

  /**
   * Attach UI event listeners
   */
  attachUIEventListeners() {
    // Main action buttons
    const selectDirBtn = document.getElementById('btn-select-directory');
    if (selectDirBtn) {
      selectDirBtn.addEventListener('click', () => this.startDiscovery());
    }
    
    const scanOptionsBtn = document.getElementById('btn-scan-options');
    if (scanOptionsBtn) {
      scanOptionsBtn.addEventListener('click', () => this.openPatternConfiguration());
    }
    
    // Directory management
    const locateFolderBtn = document.getElementById('btn-locate-folder');
    if (locateFolderBtn) {
      locateFolderBtn.addEventListener('click', () => this.locateFolder());
    }
    
    const addLocationsBtn = document.getElementById('btn-add-locations');
    if (addLocationsBtn) {
      addLocationsBtn.addEventListener('click', () => this.addLocations());
    }
    
    const resetDirsBtn = document.getElementById('btn-reset-dirs');
    if (resetDirsBtn) {
      resetDirsBtn.addEventListener('click', () => this.resetDirectories());
    }
    
    // Pattern configuration
    const patternChips = document.querySelectorAll('.pattern-chip');
    patternChips.forEach(chip => {
      chip.addEventListener('click', (e) => this.togglePatternChip(e.target));
    });
    
    const customPatternInput = document.getElementById('custom-include-pattern');
    if (customPatternInput) {
      customPatternInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addCustomPattern(e.target.value);
          e.target.value = '';
        }
      });
    }
    
    const applyExclusionsBtn = document.getElementById('btn-apply-exclusions');
    if (applyExclusionsBtn) {
      applyExclusionsBtn.addEventListener('click', () => this.applyExclusions());
    }
  }

  /**
   * Activate view when shown
   */
  activate() {
    console.log('[DiscoveryView] View activated');
    this.attachUIEventListeners();
  }
  
  /**
   * Deactivate view when hidden
   */
  deactivate() {
    console.log('[DiscoveryView] View deactivated');
  }

  /**
   * Start file discovery
   */
  async startDiscovery() {
    try {
      // Import the real DiscoveryManager
      const DiscoveryManager = (await import('../managers/DiscoveryManager.js')).default;
      
      // Get pattern configuration
      const patterns = {
        include: this.getActiveIncludePatterns(),
        exclude: this.getExcludePatterns()
      };
      
      console.log('[DiscoveryView] Starting discovery with patterns:', patterns);
      
      // Show loading state
      this.showNotification('Starting file discovery...', 'info');
      
      // Start real discovery
      const success = await DiscoveryManager.startDiscovery({ patterns });
      
      if (success) {
        const files = appState.get('files') || appState.get('discoveredFiles') || [];
        this.showNotification(`${files.length} files discovered!`, 'success');
      }
      
    } catch (error) {
      console.error('[DiscoveryView] Discovery failed:', error);
      this.showNotification('Error: ' + error.message, 'error');
    }
  }

  /**
   * Open pattern configuration modal
   */
  openPatternConfiguration() {
    // TODO: Implement pattern configuration modal
    console.log('[DiscoveryView] Opening pattern configuration');
    this.showNotification('Advanced pattern configuration coming soon', 'info');
  }

  /**
   * Locate folder using File System Access API
   */
  async locateFolder() {
    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read'
      });
      
      const path = dirHandle.name;
      this.addDirectoryToList(path, dirHandle);
      
      // Update textarea
      const textarea = document.getElementById('directory-paths');
      if (textarea) {
        const currentPaths = textarea.value.trim();
        textarea.value = currentPaths ? currentPaths + '\n' + path : path;
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[DiscoveryView] Error selecting directory:', error);
        this.showNotification('Error selecting directory', 'error');
      }
    }
  }

  /**
   * Add locations from textarea
   */
  addLocations() {
    const textarea = document.getElementById('directory-paths');
    if (!textarea) return;
    
    const paths = textarea.value.split('\n').filter(p => p.trim());
    paths.forEach(path => {
      if (!this.directories.find(d => d.path === path)) {
        this.addDirectoryToList(path);
      }
    });
    
    textarea.value = '';
  }

  /**
   * Add directory to list
   */
  addDirectoryToList(path, handle = null) {
    this.directories.push({ path, handle });
    this.renderDirectoryList();
  }

  /**
   * Render directory list
   */
  renderDirectoryList() {
    const dirList = document.getElementById('directory-list');
    if (!dirList) return;
    
    if (this.directories.length === 0) {
      dirList.innerHTML = '<div class="directory-item">No directories added</div>';
      return;
    }
    
    dirList.innerHTML = this.directories.map((dir, index) => `
      <div class="directory-item">
        <span>${dir.path}</span>
        <span class="directory-remove" onclick="window._discoveryView.removeDirectory(${index})">×</span>
      </div>
    `).join('');
  }

  /**
   * Remove directory
   */
  removeDirectory(index) {
    this.directories.splice(index, 1);
    this.renderDirectoryList();
  }

  /**
   * Reset directories
   */
  resetDirectories() {
    this.directories = [];
    this.renderDirectoryList();
    
    const textarea = document.getElementById('directory-paths');
    if (textarea) textarea.value = '';
  }

  /**
   * Toggle pattern chip
   */
  togglePatternChip(chip) {
    chip.classList.toggle('active');
  }

  /**
   * Get active include patterns
   */
  getActiveIncludePatterns() {
    const patterns = [];
    document.querySelectorAll('.pattern-chip.active').forEach(chip => {
      patterns.push(chip.dataset.pattern);
    });
    return patterns.length > 0 ? patterns : ['*'];
  }

  /**
   * Get exclude patterns
   */
  getExcludePatterns() {
    const textarea = document.getElementById('exclude-patterns');
    if (!textarea) return [];
    
    return textarea.value.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Add custom pattern
   */
  addCustomPattern(pattern) {
    if (!pattern.trim()) return;
    
    // Create new chip
    const chipsContainer = document.querySelector('.pattern-chips');
    if (chipsContainer) {
      const chip = document.createElement('span');
      chip.className = 'pattern-chip active';
      chip.dataset.pattern = pattern;
      chip.textContent = pattern;
      chip.addEventListener('click', (e) => this.togglePatternChip(e.target));
      chipsContainer.appendChild(chip);
    }
  }

  /**
   * Apply exclusions
   */
  applyExclusions() {
    this.excludePatterns = this.getExcludePatterns();
    this.showNotification('Exclusion patterns applied', 'success');
    
    // Re-filter files if any are loaded
    if (this.files.length > 0) {
      this.updateFileList();
    }
  }

  /**
   * Show template preview files when no real files discovered
   */
  showTemplatePreview(container) {
    // Generate sample files with Brazilian context
    const templateFiles = [
      {
        id: 'template-1',
        name: 'projeto-modernizacao-sistema.md',
        path: '/Documents/Projects/2024/Modernização',
        size: 24576,
        lastModified: new Date('2024-01-15'),
        relevanceScore: 95,
        preview: 'Proposta de Modernização do Sistema Legado\n\nObjetivo: Migrar sistema monolítico para arquitetura de microserviços...\n\nJustificativa: O sistema atual apresenta limitações de escalabilidade e manutenção. A modernização permitirá maior agilidade no desenvolvimento de novas funcionalidades e redução de custos operacionais.\n\nDecisão Estratégica: Adotar containerização com Kubernetes para garantir alta disponibilidade...',
        categories: ['Projetos', 'Arquitetura'],
        icon: '📋'
      },
      {
        id: 'template-2', 
        name: 'analise-migracao-cloud-aws.md',
        path: '/Documents/Análises/Cloud/2024',
        size: 18432,
        lastModified: new Date('2024-02-20'),
        relevanceScore: 88,
        preview: 'Análise de Migração para AWS Cloud\n\nContexto: Avaliação da viabilidade técnica e financeira para migração completa da infraestrutura on-premise para AWS...\n\nPontos Críticos Identificados:\n- Redução de 40% nos custos operacionais\n- Aumento da disponibilidade para 99.99%\n- Necessidade de treinamento da equipe\n\nRecomendação: Iniciar com projeto piloto...',
        categories: ['Cloud', 'Análises Técnicas'],
        icon: '☁️'
      },
      {
        id: 'template-3',
        name: 'decisao-framework-frontend.md', 
        path: '/Documents/Decisões/Tech/2024',
        size: 15360,
        lastModified: new Date('2024-03-10'),
        relevanceScore: 92,
        preview: 'Decisão: Adoção do React como Framework Frontend Padrão\n\nApós análise comparativa entre React, Angular e Vue.js, decidimos adotar React pelos seguintes motivos:\n\n1. Maior pool de desenvolvedores no mercado brasileiro\n2. Ecossistema maduro e estável\n3. Performance superior em nossa POC\n4. Melhor integração com nossa stack atual...',
        categories: ['Decisões Técnicas', 'Frontend'],
        icon: '⚛️'
      },
      {
        id: 'template-4',
        name: 'retrospectiva-sprint-42.md',
        path: '/Documents/Sprints/2024/Q1',
        size: 12288,
        lastModified: new Date('2024-03-25'),
        relevanceScore: 75,
        preview: 'Retrospectiva Sprint 42 - Time Phoenix\n\nPontos Positivos:\n- Entrega do módulo de pagamentos no prazo\n- Redução de bugs em 30%\n- Melhoria na comunicação entre squads\n\nPontos de Melhoria:\n- Reuniões muito longas\n- Falta de documentação técnica\n\nAções para próxima sprint:\n- Implementar timebox rígido nas dailies\n- Criar templates de documentação...',
        categories: ['Sprints', 'Retrospectivas'],
        icon: '🔄'
      },
      {
        id: 'template-5',
        name: 'plano-implementacao-lgpd.md',
        path: '/Documents/Compliance/LGPD/2024',
        size: 28672,
        lastModified: new Date('2024-01-30'),
        relevanceScore: 98,
        preview: 'Plano de Implementação LGPD - Fase 2\n\nObjetivo: Garantir conformidade total com a Lei Geral de Proteção de Dados\n\nAções Prioritárias:\n1. Mapeamento de todos os dados pessoais processados\n2. Implementação de consentimento explícito\n3. Criação de política de retenção de dados\n4. Desenvolvimento de APIs para solicitações de titulares\n\nPrazo crítico: Junho/2024...',
        categories: ['Compliance', 'LGPD'],
        icon: '🔒'
      }
    ];

    // Render template files with special styling
    container.innerHTML = `
      <div class="template-preview-notice">
        <div class="notice-header">
          <span class="notice-icon">🎯</span>
          <h3>Preview Mode - Exemplos de Arquivos</h3>
        </div>
        <p class="notice-text">
          Estes são arquivos de exemplo para demonstrar as capacidades do sistema.
          Clique em "Select Directory" para descobrir seus arquivos reais.
        </p>
      </div>
      
      ${templateFiles.map(file => `
        <div class="file-item template-file" data-file-id="${file.id}" onclick="window._discoveryView.selectTemplateFile('${file.id}')">
          <div class="template-badge">EXEMPLO</div>
          <div class="file-item-header">
            <div class="file-item-name">
              <span class="file-icon">${file.icon || this.getFileIcon(file)}</span>
              <span>${file.name}</span>
            </div>
            <span class="file-item-size">${this.formatFileSize(file.size)}</span>
          </div>
          
          <div class="file-item-path">${file.path}</div>
          
          <div class="file-item-preview">
            ${this.escapeHtml(file.preview.substring(0, 200))}...
          </div>
          
          <div class="file-item-footer">
            <div class="file-item-meta">
              <span>Modified: ${this.formatDate(file.lastModified)}</span>
              <span class="relevance-highlight">Relevance: ${file.relevanceScore}%</span>
            </div>
            <div class="file-item-categories">
              ${file.categories.map(cat => `<span class="category-chip">${cat}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
      
      <style>
        .template-preview-notice {
          background: var(--bg-secondary);
          border: 1px solid var(--accent-primary);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .notice-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .notice-icon {
          font-size: 24px;
        }
        
        .notice-header h3 {
          margin: 0;
          color: var(--accent-primary);
        }
        
        .notice-text {
          margin: 0;
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .template-file {
          position: relative;
          border: 1px dashed var(--border-secondary);
          background: rgba(var(--accent-rgb), 0.05);
        }
        
        .template-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: var(--accent-primary);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }
        
        .relevance-highlight {
          color: var(--accent-primary);
          font-weight: 500;
        }
        
        .category-chip {
          display: inline-block;
          padding: 2px 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          font-size: 11px;
          margin-right: 4px;
        }
        
        .file-item-categories {
          margin-top: 4px;
        }
      </style>
    `;
    
    // Store template files for preview
    this.templateFiles = templateFiles;
  }

  /**
   * Select template file for preview
   */
  selectTemplateFile(fileId) {
    const file = this.templateFiles.find(f => f.id === fileId);
    if (!file) return;
    
    // Update selected state
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.fileId === fileId);
    });
    
    this.currentPreviewFile = file;
    this.showFilePreview(file);
  }

  /**
   * Update file list display
   */
  updateFileList() {
    const fileListContainer = document.getElementById('discovered-files');
    if (!fileListContainer) return;
    
    // Apply exclusion patterns
    let tempFiles = this.files.filter(file => {
      const fileName = file.name || '';
      return !this.excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(fileName);
        }
        return fileName.includes(pattern);
      });
    });
    
    // Apply filters from FilterPanel
    this.filteredFiles = this.filterPanel.applyFiltersToFiles(tempFiles);
    
    // Update stats
    this.updateStats();
    
    if (this.filteredFiles.length === 0) {
      // Show template preview files when no real files
      this.showTemplatePreview(fileListContainer);
      return;
    }
    
    // Render file list
    fileListContainer.innerHTML = this.filteredFiles.map(file => `
      <div class="file-item" data-file-id="${file.id}" onclick="window._discoveryView.selectFile('${file.id}')">
        <div class="file-item-header">
          <div class="file-item-name">
            <span class="file-icon">${this.getFileIcon(file)}</span>
            <span>${file.name}</span>
          </div>
          <span class="file-item-size">${this.formatFileSize(file.size)}</span>
        </div>
        
        <div class="file-item-path">${file.path || 'Unknown path'}</div>
        
        ${file.preview ? `
          <div class="file-item-preview">
            ${this.escapeHtml(file.preview.substring(0, 150))}...
          </div>
        ` : ''}
        
        <div class="file-item-footer">
          <div class="file-item-meta">
            <span>Modified: ${this.formatDate(file.lastModified)}</span>
            <span>Relevance: ${Math.round(file.relevanceScore || 0)}%</span>
          </div>
          <div class="file-item-actions">
            <button class="btn btn-small" onclick="event.stopPropagation(); window._discoveryView.analyzeFile('${file.id}')">
              Analyze
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Select file and show preview
   */
  async selectFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    // Update selected state
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.fileId === fileId);
    });
    
    this.currentPreviewFile = file;
    await this.showFilePreview(file);
  }

  /**
   * Show file preview in right panel
   */
  async showFilePreview(file) {
    const previewContent = document.getElementById('preview-content');
    const previewFilename = document.getElementById('preview-filename');
    const previewSize = document.getElementById('preview-size');
    
    if (!previewContent) return;
    
    // Update header
    if (previewFilename) previewFilename.textContent = file.name;
    if (previewSize) previewSize.textContent = this.formatFileSize(file.size);
    
    // Show loading state
    previewContent.innerHTML = '<div class="preview-loading">Loading preview...</div>';
    
    try {
      // Get file content if we have a handle
      let content = file.content || file.preview || '';
      
      if (file.handle && !content) {
        try {
          const fileObj = await file.handle.getFile();
          content = await fileObj.text();
        } catch (error) {
          console.error('[DiscoveryView] Error reading file:', error);
          content = 'Error reading file content';
        }
      }
      
      // Display content
      previewContent.innerHTML = `
        <pre class="preview-text">${this.escapeHtml(content)}</pre>
      `;
      
    } catch (error) {
      console.error('[DiscoveryView] Error showing preview:', error);
      previewContent.innerHTML = `
        <div class="preview-error">
          Error loading preview: ${error.message}
        </div>
      `;
    }
  }

  /**
   * Analyze file
   */
  async analyzeFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    console.log('[DiscoveryView] Analyzing file:', file.name);
    this.showNotification(`Analysis for ${file.name} not yet implemented`, 'info');
  }

  /**
   * Update statistics
   */
  updateStats() {
    const totalFiles = document.getElementById('total-files');
    const filteredFiles = document.getElementById('filtered-files');
    
    if (totalFiles) totalFiles.textContent = `${this.files.length} files`;
    if (filteredFiles) filteredFiles.textContent = `${this.filteredFiles.length} filtered`;
  }

  /**
   * Get file icon based on type
   */
  getFileIcon(file) {
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const icons = {
      'md': '📝',
      'txt': '📄',
      'docx': '📘',
      'pdf': '📕',
      'gdoc': '📗',
      'json': '📊',
      'js': '🟨',
      'html': '🌐',
      'css': '🎨'
    };
    return icons[ext] || '📄';
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
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
    return d.toLocaleDateString();
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    console.log(`[DiscoveryView] ${type}: ${message}`);
    
    // Update status bar
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.classList.add('visible');
      
      setTimeout(() => {
        statusMessage.classList.remove('visible');
      }, 5000);
    }
    
    eventBus.emit('status:message', { message, type });
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.files = [];
    this.filteredFiles = [];
    this.directories = [];
    this.currentPreviewFile = null;
  }

  /**
   * Destroy view
   */
  destroy() {
    this.cleanup();
    console.log('[DiscoveryView] Destroyed');
  }
}

export default DiscoveryView;