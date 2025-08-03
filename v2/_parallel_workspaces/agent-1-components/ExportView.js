/**
 * Export View for KC V2
 * Handles exporting results in various formats
 */

import { EventBus } from '../../core/EventBus.js';
import { AppState } from '../../core/AppState.js';

export class ExportView {
  constructor(api) {
    this.api = api;
    this.container = null;
    this.exportFormats = ['json', 'markdown', 'csv', 'pdf', 'qdrant'];
    this.selectedFiles = new Set();
    this.exportInProgress = false;
  }

  initialize() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    EventBus.on('view:export:show', () => this.render());
    EventBus.on('files:updated', () => this.updateFileList());
    EventBus.on('export:complete', (data) => this.handleExportComplete(data));
  }

  render() {
    this.container = document.getElementById('view-container');
    this.container.innerHTML = this.getTemplate();
    this.attachEventHandlers();
    this.loadExportHistory();
    this.updateFileList();
  }

  getTemplate() {
    return `
      <div id="export-view" class="view">
        <div class="view-header">
          <h2 class="view-title">Export Results</h2>
          <div class="view-actions">
            <button class="btn btn-primary" id="btn-export-selected" disabled>
              Export Selected
            </button>
            <button class="btn btn-secondary" id="btn-export-all">
              Export All
            </button>
          </div>
        </div>
        
        <div class="view-content">
          <div class="export-container">
            <!-- Export Configuration -->
            <div class="export-config">
              <h3>Export Configuration</h3>
              
              <!-- Format Selection -->
              <div class="config-group">
                <label>Export Format</label>
                <div class="format-options">
                  ${this.exportFormats.map(format => `
                    <label class="format-option">
                      <input type="radio" name="export-format" value="${format}" 
                        ${format === 'json' ? 'checked' : ''}>
                      <span class="format-label">${format.toUpperCase()}</span>
                      <span class="format-desc">${this.getFormatDescription(format)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Export Options -->
              <div class="config-group">
                <label>Options</label>
                <div class="export-options">
                  <label class="checkbox-option">
                    <input type="checkbox" id="include-metadata" checked>
                    <span>Include metadata</span>
                  </label>
                  <label class="checkbox-option">
                    <input type="checkbox" id="include-analysis" checked>
                    <span>Include AI analysis</span>
                  </label>
                  <label class="checkbox-option">
                    <input type="checkbox" id="include-categories" checked>
                    <span>Include categories</span>
                  </label>
                  <label class="checkbox-option">
                    <input type="checkbox" id="compress-output">
                    <span>Compress output</span>
                  </label>
                </div>
              </div>

              <!-- Qdrant Options (shown when Qdrant format selected) -->
              <div class="config-group qdrant-options" style="display: none;">
                <label>Qdrant Configuration</label>
                <div class="qdrant-config">
                  <div class="input-group">
                    <label>Collection Name</label>
                    <input type="text" id="qdrant-collection" value="knowledge_consolidator" 
                      placeholder="Collection name">
                  </div>
                  <div class="input-group">
                    <label>Batch Size</label>
                    <input type="number" id="qdrant-batch-size" value="100" min="1" max="1000">
                  </div>
                  <label class="checkbox-option">
                    <input type="checkbox" id="qdrant-create-collection" checked>
                    <span>Create collection if not exists</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- File Selection -->
            <div class="export-files">
              <h3>Select Files to Export</h3>
              <div class="file-selection-tools">
                <button class="btn btn-small" id="btn-select-all">Select All</button>
                <button class="btn btn-small" id="btn-select-none">Select None</button>
                <button class="btn btn-small" id="btn-select-analyzed">Select Analyzed</button>
                <span class="selection-count">
                  <span id="selected-count">0</span> of <span id="total-count">0</span> selected
                </span>
              </div>
              
              <div class="file-list" id="export-file-list">
                <!-- Files will be rendered here -->
              </div>
            </div>

            <!-- Export Progress -->
            <div class="export-progress" id="export-progress" style="display: none;">
              <h3>Export Progress</h3>
              <div class="progress-bar">
                <div class="progress-fill" id="export-progress-fill" style="width: 0%"></div>
              </div>
              <div class="progress-info">
                <span id="export-status">Preparing export...</span>
                <span id="export-percentage">0%</span>
              </div>
              <div class="progress-details" id="export-details"></div>
            </div>

            <!-- Export History -->
            <div class="export-history">
              <h3>Export History</h3>
              <div class="history-list" id="export-history">
                <!-- History items will be rendered here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getFormatDescription(format) {
    const descriptions = {
      json: 'Structured data for programmatic access',
      markdown: 'Human-readable documentation format',
      csv: 'Spreadsheet-compatible tabular data',
      pdf: 'Formatted document for sharing',
      qdrant: 'Vector database for semantic search'
    };
    return descriptions[format] || '';
  }

  attachEventHandlers() {
    // Format selection
    document.querySelectorAll('input[name="export-format"]').forEach(input => {
      input.addEventListener('change', (e) => this.handleFormatChange(e.target.value));
    });

    // Export buttons
    document.getElementById('btn-export-selected').addEventListener('click', 
      () => this.exportSelected());
    document.getElementById('btn-export-all').addEventListener('click', 
      () => this.exportAll());

    // Selection buttons
    document.getElementById('btn-select-all').addEventListener('click', 
      () => this.selectAll());
    document.getElementById('btn-select-none').addEventListener('click', 
      () => this.selectNone());
    document.getElementById('btn-select-analyzed').addEventListener('click', 
      () => this.selectAnalyzed());
  }

  handleFormatChange(format) {
    const qdrantOptions = document.querySelector('.qdrant-options');
    if (format === 'qdrant') {
      qdrantOptions.style.display = 'block';
    } else {
      qdrantOptions.style.display = 'none';
    }
  }

  updateFileList() {
    const files = AppState.get('files') || [];
    const container = document.getElementById('export-file-list');
    
    container.innerHTML = files.map(file => `
      <div class="export-file-item ${this.selectedFiles.has(file.id) ? 'selected' : ''}" 
        data-file-id="${file.id}">
        <input type="checkbox" class="file-checkbox" 
          ${this.selectedFiles.has(file.id) ? 'checked' : ''}>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-meta">
            ${file.size ? `<span>${this.formatFileSize(file.size)}</span>` : ''}
            ${file.analyzed ? '<span class="tag tag-success">Analyzed</span>' : ''}
            ${file.categories?.length ? 
              `<span class="tag">${file.categories.length} categories</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // Update counts
    document.getElementById('total-count').textContent = files.length;
    this.updateSelectionCount();

    // Attach click handlers
    container.querySelectorAll('.export-file-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          const checkbox = item.querySelector('.file-checkbox');
          checkbox.checked = !checkbox.checked;
        }
        this.toggleFileSelection(item.dataset.fileId);
      });
    });
  }

  toggleFileSelection(fileId) {
    if (this.selectedFiles.has(fileId)) {
      this.selectedFiles.delete(fileId);
    } else {
      this.selectedFiles.add(fileId);
    }
    this.updateSelectionCount();
  }

  updateSelectionCount() {
    const count = this.selectedFiles.size;
    document.getElementById('selected-count').textContent = count;
    document.getElementById('btn-export-selected').disabled = count === 0;
  }

  selectAll() {
    const files = AppState.get('files') || [];
    files.forEach(file => this.selectedFiles.add(file.id));
    this.updateFileList();
  }

  selectNone() {
    this.selectedFiles.clear();
    this.updateFileList();
  }

  selectAnalyzed() {
    const files = AppState.get('files') || [];
    this.selectedFiles.clear();
    files.filter(f => f.analyzed).forEach(file => this.selectedFiles.add(file.id));
    this.updateFileList();
  }

  async exportSelected() {
    const fileIds = Array.from(this.selectedFiles);
    await this.performExport(fileIds);
  }

  async exportAll() {
    const files = AppState.get('files') || [];
    const fileIds = files.map(f => f.id);
    await this.performExport(fileIds);
  }

  async performExport(fileIds) {
    if (this.exportInProgress) return;
    
    this.exportInProgress = true;
    const format = document.querySelector('input[name="export-format"]:checked').value;
    const options = this.getExportOptions();

    // Show progress
    const progressEl = document.getElementById('export-progress');
    progressEl.style.display = 'block';
    
    try {
      // Prepare export data
      this.updateProgress(0, 'Preparing export data...');
      
      const exportData = {
        format,
        fileIds,
        options,
        timestamp: new Date().toISOString()
      };

      // Different handling for different formats
      switch (format) {
        case 'qdrant':
          await this.exportToQdrant(exportData);
          break;
        case 'pdf':
          await this.exportToPDF(exportData);
          break;
        default:
          await this.exportToFile(exportData);
      }

    } catch (error) {
      console.error('Export failed:', error);
      EventBus.emit('notification:error', {
        message: `Export failed: ${error.message}`
      });
    } finally {
      this.exportInProgress = false;
      progressEl.style.display = 'none';
    }
  }

  getExportOptions() {
    return {
      includeMetadata: document.getElementById('include-metadata').checked,
      includeAnalysis: document.getElementById('include-analysis').checked,
      includeCategories: document.getElementById('include-categories').checked,
      compress: document.getElementById('compress-output').checked,
      qdrant: {
        collection: document.getElementById('qdrant-collection').value,
        batchSize: parseInt(document.getElementById('qdrant-batch-size').value),
        createCollection: document.getElementById('qdrant-create-collection').checked
      }
    };
  }

  async exportToFile(exportData) {
    const { format, fileIds, options } = exportData;
    
    // Get files data
    const files = AppState.get('files') || [];
    const selectedFiles = files.filter(f => fileIds.includes(f.id));
    
    // Prepare export content
    let content;
    switch (format) {
      case 'json':
        content = this.generateJSON(selectedFiles, options);
        break;
      case 'markdown':
        content = this.generateMarkdown(selectedFiles, options);
        break;
      case 'csv':
        content = this.generateCSV(selectedFiles, options);
        break;
    }

    // Compress if needed
    if (options.compress) {
      content = await this.compressContent(content);
    }

    // Download file
    this.downloadFile(content, format, options.compress);
    
    // Save to history
    this.addToHistory({
      format,
      fileCount: selectedFiles.length,
      timestamp: new Date().toISOString(),
      compressed: options.compress
    });
  }

  generateJSON(files, options) {
    const data = {
      version: '2.0.0',
      exported: new Date().toISOString(),
      fileCount: files.length,
      files: files.map(file => {
        const exportFile = { id: file.id, name: file.name };
        
        if (options.includeMetadata) {
          exportFile.metadata = {
            size: file.size,
            created: file.created,
            modified: file.modified,
            path: file.path
          };
        }
        
        if (options.includeAnalysis && file.analysis) {
          exportFile.analysis = file.analysis;
        }
        
        if (options.includeCategories && file.categories) {
          exportFile.categories = file.categories;
        }
        
        return exportFile;
      })
    };
    
    return JSON.stringify(data, null, 2);
  }

  generateMarkdown(files, options) {
    let markdown = '# Knowledge Consolidator Export\n\n';
    markdown += `> Exported on ${new Date().toLocaleString()}\n\n`;
    markdown += `Total files: ${files.length}\n\n`;
    
    files.forEach(file => {
      markdown += `## ${file.name}\n\n`;
      
      if (options.includeMetadata) {
        markdown += '### Metadata\n';
        markdown += `- Size: ${this.formatFileSize(file.size || 0)}\n`;
        markdown += `- Created: ${new Date(file.created).toLocaleString()}\n`;
        markdown += `- Modified: ${new Date(file.modified).toLocaleString()}\n\n`;
      }
      
      if (options.includeCategories && file.categories?.length) {
        markdown += '### Categories\n';
        file.categories.forEach(cat => {
          markdown += `- ${cat}\n`;
        });
        markdown += '\n';
      }
      
      if (options.includeAnalysis && file.analysis) {
        markdown += '### Analysis\n';
        markdown += `${file.analysis.summary || 'No analysis available'}\n\n`;
      }
      
      markdown += '---\n\n';
    });
    
    return markdown;
  }

  generateCSV(files, options) {
    const headers = ['ID', 'Name'];
    
    if (options.includeMetadata) {
      headers.push('Size', 'Created', 'Modified');
    }
    
    if (options.includeCategories) {
      headers.push('Categories');
    }
    
    if (options.includeAnalysis) {
      headers.push('Analysis Summary');
    }
    
    const rows = files.map(file => {
      const row = [file.id, file.name];
      
      if (options.includeMetadata) {
        row.push(
          file.size || '',
          file.created || '',
          file.modified || ''
        );
      }
      
      if (options.includeCategories) {
        row.push((file.categories || []).join('; '));
      }
      
      if (options.includeAnalysis) {
        row.push(file.analysis?.summary || '');
      }
      
      return row;
    });
    
    // Generate CSV
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    return csv;
  }

  async exportToQdrant(exportData) {
    const { fileIds, options } = exportData;
    const { collection, batchSize, createCollection } = options.qdrant;
    
    try {
      // Create collection if needed
      if (createCollection) {
        this.updateProgress(10, 'Creating Qdrant collection...');
        await this.api.createQdrantCollection(collection);
      }
      
      // Get files
      const files = AppState.get('files') || [];
      const selectedFiles = files.filter(f => fileIds.includes(f.id));
      
      // Process in batches
      for (let i = 0; i < selectedFiles.length; i += batchSize) {
        const batch = selectedFiles.slice(i, i + batchSize);
        const progress = 10 + (i / selectedFiles.length) * 80;
        
        this.updateProgress(progress, `Processing batch ${Math.floor(i / batchSize) + 1}...`);
        
        // Generate embeddings and upload
        await this.api.uploadToQdrant(collection, batch, options);
      }
      
      this.updateProgress(100, 'Export complete!');
      
      // Save to history
      this.addToHistory({
        format: 'qdrant',
        collection,
        fileCount: selectedFiles.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      throw new Error(`Qdrant export failed: ${error.message}`);
    }
  }

  async exportToPDF(exportData) {
    this.updateProgress(50, 'Generating PDF...');
    
    // This would integrate with a PDF generation library
    // For now, we'll convert to markdown and indicate PDF generation
    const { fileIds, options } = exportData;
    const files = AppState.get('files') || [];
    const selectedFiles = files.filter(f => fileIds.includes(f.id));
    
    const markdown = this.generateMarkdown(selectedFiles, options);
    
    // In a real implementation, this would use a library like jsPDF
    console.log('PDF generation would happen here with content:', markdown);
    
    this.updateProgress(100, 'PDF generated!');
    
    EventBus.emit('notification:info', {
      message: 'PDF export is not yet implemented in this version'
    });
  }

  async compressContent(content) {
    // Simple compression using browser's CompressionStream API if available
    if ('CompressionStream' in window) {
      const encoder = new TextEncoder();
      const stream = new Response(encoder.encode(content)).body
        .pipeThrough(new CompressionStream('gzip'));
      
      const compressed = await new Response(stream).blob();
      return compressed;
    }
    
    // Fallback: return original content
    return content;
  }

  downloadFile(content, format, compressed) {
    const blob = content instanceof Blob ? content : 
      new Blob([content], { type: this.getMimeType(format) });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = compressed ? `${format}.gz` : format;
    const filename = `kc-export-${timestamp}.${extension}`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getMimeType(format) {
    const mimeTypes = {
      json: 'application/json',
      markdown: 'text/markdown',
      csv: 'text/csv',
      pdf: 'application/pdf'
    };
    return mimeTypes[format] || 'text/plain';
  }

  updateProgress(percentage, status) {
    document.getElementById('export-progress-fill').style.width = `${percentage}%`;
    document.getElementById('export-percentage').textContent = `${Math.round(percentage)}%`;
    document.getElementById('export-status').textContent = status;
  }

  loadExportHistory() {
    const history = JSON.parse(localStorage.getItem('kc-export-history') || '[]');
    this.renderHistory(history);
  }

  addToHistory(entry) {
    const history = JSON.parse(localStorage.getItem('kc-export-history') || '[]');
    history.unshift(entry);
    
    // Keep only last 20 entries
    if (history.length > 20) {
      history.pop();
    }
    
    localStorage.setItem('kc-export-history', JSON.stringify(history));
    this.renderHistory(history);
  }

  renderHistory(history) {
    const container = document.getElementById('export-history');
    
    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state">No export history</div>';
      return;
    }
    
    container.innerHTML = history.map(entry => `
      <div class="history-item">
        <div class="history-format">${entry.format.toUpperCase()}</div>
        <div class="history-info">
          <div class="history-files">${entry.fileCount} files</div>
          <div class="history-time">${this.formatRelativeTime(entry.timestamp)}</div>
        </div>
        ${entry.collection ? 
          `<div class="history-extra">Collection: ${entry.collection}</div>` : ''}
      </div>
    `).join('');
  }

  formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  handleExportComplete(data) {
    EventBus.emit('notification:success', {
      message: `Export completed successfully!`
    });
  }
}