/**
 * Power User Application - Real Data Extension
 * Extends the base PowerApp with real file system capabilities
 */

import PowerApp from './power-app.js';

// Override the PowerApp class to add real file discovery
const originalInit = PowerApp.prototype.init;
PowerApp.prototype.init = async function() {
    await originalInit.call(this);
    
    // Add real file discovery to action buttons
    const discoverBtn = document.querySelector('[data-action="discover-real"]');
    if (discoverBtn) {
        discoverBtn.addEventListener('click', () => this.discoverRealFiles());
    }
};

// Add real file discovery method
PowerApp.prototype.discoverRealFiles = async function() {
    this.setStatus('Opening file picker...');
    this.showLoading(true);
    
    try {
        // Use File System Access API
        const dirHandle = await window.showDirectoryPicker();
        const files = [];
        
        this.setStatus('Discovering files...');
        
        // Recursively read directory
        await this.readDirectory(dirHandle, files, '');
        
        // Process files
        this.state.files = files.map((file, index) => ({
            id: `file-${index}`,
            name: file.name,
            path: file.path,
            handle: file.handle,
            relevance: Math.round(Math.random() * 100),
            confidence: 0,
            modified: file.lastModified || new Date(),
            analyzed: false,
            status: 'pending',
            size: file.size || 0,
            type: file.name.split('.').pop()
        }));
        
        this.updateStats();
        this.renderCurrentView();
        
        this.setStatus(`Discovered ${files.length} files`);
    } catch (error) {
        if (error.name === 'AbortError') {
            this.setStatus('Discovery cancelled');
        } else {
            console.error('File discovery failed:', error);
            this.setStatus('Discovery failed');
        }
    } finally {
        this.showLoading(false);
    }
};

// Add directory reading method
PowerApp.prototype.readDirectory = async function(dirHandle, files, path) {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            files.push({
                name: entry.name,
                path: path + '/' + entry.name,
                handle: entry,
                size: file.size,
                lastModified: new Date(file.lastModified)
            });
        } else if (entry.kind === 'directory') {
            // Recursively read subdirectories (limit depth for performance)
            if (path.split('/').length < 3) {
                await this.readDirectory(entry, files, path + '/' + entry.name);
            }
        }
    }
};

// Override renderListView to add action buttons
const originalRenderListView = PowerApp.prototype.renderListView;
PowerApp.prototype.renderListView = function() {
    if (!this.dom.fileList) return;
    
    const filteredFiles = this.getFilteredFiles();
    
    if (filteredFiles.length === 0) {
        this.dom.fileList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📁</div>
                <h3>No files discovered yet</h3>
                <p>Click "Discover Real Files" to browse your system</p>
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
                <div class="file-item-actions">
                    <button class="file-action-btn" data-file-id="${file.id}" data-action="analyze" title="Analyze with AI">
                        <span class="icon">🧠</span>
                        <span>Analyze</span>
                    </button>
                    <button class="file-action-btn" data-file-id="${file.id}" data-action="view" title="View Content">
                        <span class="icon">👁️</span>
                        <span>View</span>
                    </button>
                    <button class="file-action-btn" data-file-id="${file.id}" data-action="categorize" title="Categorize">
                        <span class="icon">📂</span>
                        <span>Categorize</span>
                    </button>
                    <button class="file-action-btn" data-file-id="${file.id}" data-action="archive" title="Archive">
                        <span class="icon">📦</span>
                        <span>Archive</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    this.dom.fileList.innerHTML = html;
};

// Override file selection handler to support all action buttons
const originalHandleFileSelection = PowerApp.prototype.handleFileSelection;
PowerApp.prototype.handleFileSelection = function(event) {
    // Check if clicked on any action button
    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn) {
        event.preventDefault();
        event.stopPropagation();
        const action = actionBtn.dataset.action;
        const fileId = actionBtn.dataset.fileId;
        
        // Handle different actions
        switch (action) {
            case 'toggle-status':
                this.toggleFileStatus(fileId);
                break;
            case 'analyze':
                this.analyzeFile(fileId);
                break;
            case 'view':
                this.viewFile(fileId);
                break;
            case 'categorize':
                this.categorizeFile(fileId);
                break;
            case 'archive':
                this.archiveFile(fileId);
                break;
        }
        return;
    }
    
    // Call original handler for other selection logic
    originalHandleFileSelection.call(this, event);
};

// Add file action methods
PowerApp.prototype.analyzeFile = async function(fileId) {
    const file = this.state.files.find(f => f.id === fileId);
    if (!file) return;
    
    this.setStatus(`Analyzing ${file.name}...`);
    // TODO: Implement AI analysis
    console.log('Analyzing file:', file.name);
    
    // For now, just mark as analyzed
    setTimeout(() => {
        file.analyzed = true;
        file.confidence = Math.round(Math.random() * 100);
        this.updateStats();
        this.renderCurrentView();
        this.setStatus('Analysis complete');
    }, 2000);
};

PowerApp.prototype.viewFile = async function(fileId) {
    const file = this.state.files.find(f => f.id === fileId);
    if (!file) return;
    
    // Show file content in details panel
    if (file.handle) {
        try {
            const fileObj = await file.handle.getFile();
            const content = await fileObj.text();
            this.showFileDetails(file, content);
        } catch (error) {
            console.error('Failed to read file:', error);
            this.setStatus('Failed to read file');
        }
    }
};

PowerApp.prototype.categorizeFile = function(fileId) {
    const file = this.state.files.find(f => f.id === fileId);
    if (!file) return;
    
    // TODO: Show category selection dialog
    console.log('Categorizing file:', file.name);
    
    // For now, just add a random category
    if (!file.categories) file.categories = [];
    file.categories.push('Technical');
    this.renderCurrentView();
};

PowerApp.prototype.archiveFile = function(fileId) {
    const file = this.state.files.find(f => f.id === fileId);
    if (!file) return;
    
    file.status = 'archived';
    this.renderCurrentView();
    this.updateStats();
};

PowerApp.prototype.showFileDetails = function(file, content) {
    const detailsContent = document.getElementById('details-content');
    if (!detailsContent) return;
    
    detailsContent.innerHTML = `
        <div class="file-details">
            <h3>${file.name}</h3>
            <div class="details-meta">
                <div class="meta-item">
                    <span class="meta-label">Path:</span>
                    <span class="meta-value">${file.path}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Size:</span>
                    <span class="meta-value">${this.formatFileSize(file.size)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Modified:</span>
                    <span class="meta-value">${this.formatDate(file.modified)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Relevance:</span>
                    <span class="meta-value">${file.relevance}%</span>
                </div>
                ${file.analyzed ? `
                <div class="meta-item">
                    <span class="meta-label">Confidence:</span>
                    <span class="meta-value">${file.confidence}%</span>
                </div>
                ` : ''}
            </div>
            <div class="file-content">
                <h4>Content Preview</h4>
                <pre>${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}</pre>
            </div>
        </div>
    `;
};

PowerApp.prototype.formatFileSize = function(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Override toggleSidebar to add collapsed class
const originalToggleSidebar = PowerApp.prototype.toggleSidebar;
PowerApp.prototype.toggleSidebar = function() {
    originalToggleSidebar.call(this);
    
    // Toggle collapsed class on sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed', this.state.sidebarCollapsed);
    }
};

// Export the enhanced PowerApp
export default PowerApp;