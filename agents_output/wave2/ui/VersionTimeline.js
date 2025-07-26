/**
 * VersionTimeline.js - Version History Visualization
 * 
 * Displays version history with confidence evolution, allowing users to
 * navigate, compare, and restore previous versions. Integrates with VersionedAppState.
 */

(function(window) {
    'use strict';

    class VersionTimeline {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? 
                document.querySelector(container) : container;
            
            this.options = {
                orientation: 'horizontal', // horizontal | vertical
                showConfidence: true,
                showMetadata: true,
                showActions: true,
                animated: true,
                maxVisibleVersions: 10,
                nodeSize: 60,
                ...options
            };
            
            this.versions = [];
            this.currentVersionId = null;
            this.selectedVersions = new Set();
            this.versionedAppState = null;
            this.eventHandlers = new Map();
            
            this.init();
        }

        /**
         * Initialize the timeline
         */
        init() {
            this.render();
            this.setupEventListeners();
        }

        /**
         * Set the VersionedAppState instance
         */
        setVersionedAppState(versionedAppState) {
            this.versionedAppState = versionedAppState;
            this.loadVersions();
        }

        /**
         * Load versions from VersionedAppState
         */
        loadVersions() {
            if (!this.versionedAppState) return;
            
            this.versions = this.versionedAppState.getAllVersions();
            this.currentVersionId = this.versions.find(v => v.isCurrent)?.versionId;
            this.updateTimeline();
        }

        /**
         * Render the timeline structure
         */
        render() {
            const orientation = this.options.orientation;
            
            this.container.innerHTML = `
                <div class="version-timeline ${orientation}">
                    <div class="timeline-header">
                        <h3 class="timeline-title">Histórico de Versões</h3>
                        <div class="timeline-actions">
                            <button class="btn-sm btn-primary" id="create-snapshot-btn">
                                <svg class="icon" width="14" height="14" viewBox="0 0 16 16">
                                    <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                    <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                                </svg>
                                Criar Snapshot
                            </button>
                            <button class="btn-sm btn-secondary" id="compare-versions-btn" disabled>
                                <svg class="icon" width="14" height="14" viewBox="0 0 16 16">
                                    <path d="M9.5 1.5a.5.5 0 0 1-1 0V1h-3A1.5 1.5 0 0 0 4 2.5V3h-.5a.5.5 0 0 1 0-1H4v-.5A2.5 2.5 0 0 1 6.5 0h3a.5.5 0 0 1 .5.5v1zM3 4.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1 0-1zm0 3h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1 0-1zm0 3h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1 0-1z"/>
                                </svg>
                                Comparar
                            </button>
                        </div>
                    </div>
                    
                    <div class="timeline-controls">
                        <div class="timeline-filter">
                            <label>Filtrar por:</label>
                            <select class="filter-select" id="timeline-filter">
                                <option value="all">Todas as versões</option>
                                <option value="snapshots">Apenas snapshots</option>
                                <option value="milestones">Marcos importantes</option>
                            </select>
                        </div>
                        <div class="timeline-zoom">
                            <button class="btn-icon zoom-out" title="Diminuir zoom">
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <path d="M3 11a1 1 0 0 1 1-1h8a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1z"/>
                                </svg>
                            </button>
                            <span class="zoom-level">100%</span>
                            <button class="btn-icon zoom-in" title="Aumentar zoom">
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="timeline-container">
                        <div class="timeline-scroll">
                            <div class="timeline-track">
                                <!-- Version nodes will be inserted here -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="timeline-details" style="display: none;">
                        <!-- Version details will be shown here -->
                    </div>
                    
                    <div class="timeline-comparison" style="display: none;">
                        <!-- Version comparison will be shown here -->
                    </div>
                </div>
            `;
        }

        /**
         * Update timeline with current versions
         */
        updateTimeline() {
            const track = this.container.querySelector('.timeline-track');
            if (!track) return;
            
            track.innerHTML = '';
            
            if (this.versions.length === 0) {
                track.innerHTML = '<div class="timeline-empty">Nenhuma versão disponível</div>';
                return;
            }
            
            // Create timeline line
            const line = document.createElement('div');
            line.className = 'timeline-line';
            track.appendChild(line);
            
            // Create version nodes
            this.versions.forEach((version, index) => {
                const node = this.createVersionNode(version, index);
                track.appendChild(node);
            });
            
            // Scroll to current version
            if (this.currentVersionId) {
                this.scrollToVersion(this.currentVersionId);
            }
        }

        /**
         * Create a version node element
         */
        createVersionNode(version, index) {
            const node = document.createElement('div');
            node.className = 'version-node';
            node.dataset.versionId = version.versionId;
            
            if (version.isCurrent) {
                node.classList.add('current');
            }
            
            const confidence = version.metadata?.confidence || 0;
            const confidencePercent = Math.round(confidence * 100);
            const confidenceLevel = this.getConfidenceLevel(confidence);
            
            // Calculate position
            const spacing = this.options.orientation === 'horizontal' ? 150 : 120;
            const position = index * spacing + 50;
            
            if (this.options.orientation === 'horizontal') {
                node.style.left = `${position}px`;
            } else {
                node.style.top = `${position}px`;
            }
            
            node.innerHTML = `
                <div class="node-marker" data-confidence-level="${confidenceLevel}">
                    ${this.options.showConfidence ? `
                        <div class="confidence-indicator">
                            <svg class="confidence-ring" viewBox="0 0 60 60" width="${this.options.nodeSize}" height="${this.options.nodeSize}">
                                <circle cx="30" cy="30" r="28" 
                                        class="confidence-track" 
                                        fill="none" 
                                        stroke="var(--color-gray-200)" 
                                        stroke-width="4"/>
                                <circle cx="30" cy="30" r="28" 
                                        class="confidence-fill" 
                                        fill="none"
                                        stroke="var(--confidence-color)" 
                                        stroke-width="4"
                                        stroke-linecap="round"
                                        stroke-dasharray="${2 * Math.PI * 28}" 
                                        stroke-dashoffset="${2 * Math.PI * 28 * (1 - confidence)}"
                                        transform="rotate(-90 30 30)"/>
                            </svg>
                            <span class="confidence-text">${confidencePercent}%</span>
                        </div>
                    ` : `
                        <div class="version-number">v${index + 1}</div>
                    `}
                </div>
                
                <div class="node-content">
                    <div class="version-info">
                        <span class="version-label">Versão ${index + 1}</span>
                        <span class="version-time">${this.formatTime(version.timestamp)}</span>
                    </div>
                    
                    ${this.options.showMetadata && version.metadata ? `
                        <div class="version-metadata">
                            ${version.metadata.reason ? `
                                <div class="metadata-item">
                                    <svg class="icon" width="12" height="12" viewBox="0 0 16 16">
                                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                        <path d="M5.255 5.786a.237.237 0 0 0 .258.218h.178l.041-.02a.617.617 0 0 1 .258-.051c.892 0 1.249.514 1.249 1.34v.049c0 .443-.124.747-.435.913a2.03 2.03 0 0 1-.346.14.887.887 0 0 0-.385.169c-.21.151-.33.375-.33.68 0 .348.153.622.358.795a1.15 1.15 0 0 0 .745.247c.383 0 .678-.099.892-.296.123-.113.219-.25.285-.406l-.097-.432a1.49 1.49 0 0 1-.258.233.65.65 0 0 1-.373.108c-.263 0-.426-.118-.426-.334 0-.152.073-.267.216-.348.142-.081.31-.133.502-.155.408-.046.782-.173 1.076-.367.496-.328.768-.875.768-1.546 0-.712-.257-1.292-.77-1.554-.383-.196-.867-.294-1.451-.294-.395 0-.749.043-1.06.13a3.09 3.09 0 0 0-.897.358l.257.875z"/>
                                    </svg>
                                    <span class="metadata-text">${this.escapeHtml(version.metadata.reason)}</span>
                                </div>
                            ` : ''}
                            ${version.metadata.tags && version.metadata.tags.length > 0 ? `
                                <div class="metadata-tags">
                                    ${version.metadata.tags.map(tag => `
                                        <span class="tag">${this.escapeHtml(tag)}</span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${this.options.showActions ? `
                        <div class="version-actions">
                            <button class="btn-icon" title="Ver detalhes" data-action="view">
                                <svg width="14" height="14" viewBox="0 0 16 16">
                                    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                                </svg>
                            </button>
                            <button class="btn-icon" title="Comparar" data-action="compare">
                                <svg width="14" height="14" viewBox="0 0 16 16">
                                    <path d="M9.5 1.5a.5.5 0 0 1-1 0V1h-3A1.5 1.5 0 0 0 4 2.5V3h-.5a.5.5 0 0 1 0-1H4v-.5A2.5 2.5 0 0 1 6.5 0h3a.5.5 0 0 1 .5.5v1z"/>
                                </svg>
                            </button>
                            ${!version.isCurrent ? `
                                <button class="btn-icon" title="Restaurar" data-action="restore">
                                    <svg width="14" height="14" viewBox="0 0 16 16">
                                        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                
                ${index < this.versions.length - 1 ? `
                    <div class="node-connector"></div>
                ` : ''}
            `;
            
            // Add event listeners
            this.setupNodeEventListeners(node, version);
            
            return node;
        }

        /**
         * Setup event listeners for a version node
         */
        setupNodeEventListeners(node, version) {
            // Node click for selection
            node.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                
                if (e.ctrlKey || e.metaKey) {
                    this.toggleVersionSelection(version.versionId);
                } else {
                    this.selectVersion(version.versionId);
                }
            });
            
            // Action buttons
            const actionBtns = node.querySelectorAll('[data-action]');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.currentTarget.dataset.action;
                    this.handleVersionAction(version.versionId, action);
                });
            });
            
            // Hover effects
            node.addEventListener('mouseenter', () => {
                this.highlightConnections(version.versionId);
            });
            
            node.addEventListener('mouseleave', () => {
                this.clearHighlights();
            });
        }

        /**
         * Setup timeline event listeners
         */
        setupEventListeners() {
            // Create snapshot button
            const createSnapshotBtn = this.container.querySelector('#create-snapshot-btn');
            createSnapshotBtn?.addEventListener('click', () => {
                this.emit('createSnapshot');
            });
            
            // Compare button
            const compareBtn = this.container.querySelector('#compare-versions-btn');
            compareBtn?.addEventListener('click', () => {
                if (this.selectedVersions.size === 2) {
                    const versions = Array.from(this.selectedVersions);
                    this.compareVersions(versions[0], versions[1]);
                }
            });
            
            // Filter select
            const filterSelect = this.container.querySelector('#timeline-filter');
            filterSelect?.addEventListener('change', (e) => {
                this.applyFilter(e.target.value);
            });
            
            // Zoom controls
            const zoomIn = this.container.querySelector('.zoom-in');
            const zoomOut = this.container.querySelector('.zoom-out');
            
            zoomIn?.addEventListener('click', () => this.adjustZoom(1.2));
            zoomOut?.addEventListener('click', () => this.adjustZoom(0.8));
            
            // Keyboard navigation
            this.container.addEventListener('keydown', (e) => {
                this.handleKeyboard(e);
            });
        }

        /**
         * Handle version actions
         */
        handleVersionAction(versionId, action) {
            switch (action) {
                case 'view':
                    this.showVersionDetails(versionId);
                    break;
                case 'compare':
                    this.toggleVersionSelection(versionId);
                    break;
                case 'restore':
                    this.restoreVersion(versionId);
                    break;
            }
        }

        /**
         * Show version details
         */
        showVersionDetails(versionId) {
            if (!this.versionedAppState) return;
            
            const version = this.versionedAppState.getVersion(versionId);
            if (!version) return;
            
            const detailsEl = this.container.querySelector('.timeline-details');
            if (!detailsEl) return;
            
            detailsEl.innerHTML = `
                <div class="version-details-content">
                    <div class="details-header">
                        <h4>Detalhes da Versão</h4>
                        <button class="btn-icon close-details">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="details-body">
                        <div class="detail-section">
                            <h5>Informações Gerais</h5>
                            <dl class="detail-list">
                                <dt>ID da Versão:</dt>
                                <dd><code>${version.versionId}</code></dd>
                                
                                <dt>Data/Hora:</dt>
                                <dd>${new Date(version.timestamp).toLocaleString('pt-BR')}</dd>
                                
                                <dt>Tipo:</dt>
                                <dd>${version.type === 'full' ? 'Snapshot Completo' : 'Delta'}</dd>
                                
                                <dt>Tamanho:</dt>
                                <dd>${this.formatSize(version.size || 0)}</dd>
                            </dl>
                        </div>
                        
                        ${version.metadata ? `
                            <div class="detail-section">
                                <h5>Metadados</h5>
                                <dl class="detail-list">
                                    ${version.metadata.reason ? `
                                        <dt>Motivo:</dt>
                                        <dd>${this.escapeHtml(version.metadata.reason)}</dd>
                                    ` : ''}
                                    
                                    ${version.metadata.confidence !== undefined ? `
                                        <dt>Confiança:</dt>
                                        <dd>
                                            <div class="confidence-bar">
                                                <div class="confidence-fill" style="width: ${version.metadata.confidence * 100}%"></div>
                                            </div>
                                            <span>${Math.round(version.metadata.confidence * 100)}%</span>
                                        </dd>
                                    ` : ''}
                                    
                                    ${version.metadata.tags && version.metadata.tags.length > 0 ? `
                                        <dt>Tags:</dt>
                                        <dd>
                                            ${version.metadata.tags.map(tag => `
                                                <span class="tag">${this.escapeHtml(tag)}</span>
                                            `).join('')}
                                        </dd>
                                    ` : ''}
                                    
                                    ${version.metadata.analysisCount ? `
                                        <dt>Análises:</dt>
                                        <dd>${version.metadata.analysisCount}</dd>
                                    ` : ''}
                                </dl>
                            </div>
                        ` : ''}
                        
                        <div class="detail-section">
                            <h5>Estado Resumido</h5>
                            <pre class="state-preview">${JSON.stringify(this.summarizeState(version.state), null, 2)}</pre>
                        </div>
                    </div>
                    
                    <div class="details-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.timeline-details').style.display='none'">
                            Fechar
                        </button>
                        ${!version.isCurrent ? `
                            <button class="btn btn-primary" data-version-id="${version.versionId}" data-action="restore">
                                Restaurar Esta Versão
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            detailsEl.style.display = 'block';
            
            // Add close button listener
            const closeBtn = detailsEl.querySelector('.close-details');
            closeBtn?.addEventListener('click', () => {
                detailsEl.style.display = 'none';
            });
            
            // Add restore button listener
            const restoreBtn = detailsEl.querySelector('[data-action="restore"]');
            restoreBtn?.addEventListener('click', (e) => {
                const versionId = e.currentTarget.dataset.versionId;
                this.restoreVersion(versionId);
                detailsEl.style.display = 'none';
            });
        }

        /**
         * Compare two versions
         */
        compareVersions(versionIdA, versionIdB) {
            if (!this.versionedAppState) return;
            
            const changeSet = this.versionedAppState.compareVersions(versionIdA, versionIdB);
            if (!changeSet) return;
            
            const comparisonEl = this.container.querySelector('.timeline-comparison');
            if (!comparisonEl) return;
            
            comparisonEl.innerHTML = `
                <div class="comparison-content">
                    <div class="comparison-header">
                        <h4>Comparação de Versões</h4>
                        <button class="btn-icon close-comparison">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="comparison-summary">
                        <p class="summary-text">${changeSet.summary}</p>
                        <div class="summary-stats">
                            <div class="stat additions">
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                </svg>
                                <span>${changeSet.additions.length} adições</span>
                            </div>
                            <div class="stat modifications">
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                </svg>
                                <span>${changeSet.modifications.length} modificações</span>
                            </div>
                            <div class="stat deletions">
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                                <span>${changeSet.deletions.length} remoções</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="comparison-body">
                        ${changeSet.additions.length > 0 ? `
                            <div class="change-section additions">
                                <h5>Adições</h5>
                                <div class="change-list">
                                    ${changeSet.additions.map(change => `
                                        <div class="change-item">
                                            <span class="change-path">${change.path}</span>
                                            <span class="change-value">${this.formatValue(change.value)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${changeSet.modifications.length > 0 ? `
                            <div class="change-section modifications">
                                <h5>Modificações</h5>
                                <div class="change-list">
                                    ${changeSet.modifications.map(change => `
                                        <div class="change-item">
                                            <span class="change-path">${change.path}</span>
                                            <div class="change-values">
                                                <span class="old-value">${this.formatValue(change.oldValue)}</span>
                                                <svg class="arrow" width="16" height="16" viewBox="0 0 16 16">
                                                    <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                                                </svg>
                                                <span class="new-value">${this.formatValue(change.newValue)}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${changeSet.deletions.length > 0 ? `
                            <div class="change-section deletions">
                                <h5>Remoções</h5>
                                <div class="change-list">
                                    ${changeSet.deletions.map(change => `
                                        <div class="change-item">
                                            <span class="change-path">${change.path}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            comparisonEl.style.display = 'block';
            
            // Add close button listener
            const closeBtn = comparisonEl.querySelector('.close-comparison');
            closeBtn?.addEventListener('click', () => {
                comparisonEl.style.display = 'none';
                this.clearVersionSelection();
            });
        }

        /**
         * Restore a version
         */
        restoreVersion(versionId) {
            if (!this.versionedAppState) return;
            
            this.emit('beforeRestore', { versionId });
            
            try {
                const restoredState = this.versionedAppState.restoreVersion(versionId);
                
                this.currentVersionId = versionId;
                this.loadVersions();
                
                this.emit('versionRestored', { versionId, state: restoredState });
                
                // Show success notification
                this.showNotification('Versão restaurada com sucesso', 'success');
                
            } catch (error) {
                console.error('Error restoring version:', error);
                this.showNotification('Erro ao restaurar versão', 'error');
            }
        }

        /**
         * Select a version
         */
        selectVersion(versionId) {
            this.selectedVersions.clear();
            this.selectedVersions.add(versionId);
            this.updateSelectionUI();
        }

        /**
         * Toggle version selection
         */
        toggleVersionSelection(versionId) {
            if (this.selectedVersions.has(versionId)) {
                this.selectedVersions.delete(versionId);
            } else {
                if (this.selectedVersions.size >= 2) {
                    // Remove oldest selection
                    const first = this.selectedVersions.values().next().value;
                    this.selectedVersions.delete(first);
                }
                this.selectedVersions.add(versionId);
            }
            this.updateSelectionUI();
        }

        /**
         * Clear version selection
         */
        clearVersionSelection() {
            this.selectedVersions.clear();
            this.updateSelectionUI();
        }

        /**
         * Update selection UI
         */
        updateSelectionUI() {
            // Update node selection states
            const nodes = this.container.querySelectorAll('.version-node');
            nodes.forEach(node => {
                const versionId = node.dataset.versionId;
                if (this.selectedVersions.has(versionId)) {
                    node.classList.add('selected');
                } else {
                    node.classList.remove('selected');
                }
            });
            
            // Enable/disable compare button
            const compareBtn = this.container.querySelector('#compare-versions-btn');
            if (compareBtn) {
                compareBtn.disabled = this.selectedVersions.size !== 2;
            }
        }

        /**
         * Scroll to a specific version
         */
        scrollToVersion(versionId) {
            const node = this.container.querySelector(`[data-version-id="${versionId}"]`);
            if (node) {
                node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        }

        /**
         * Apply filter to timeline
         */
        applyFilter(filterType) {
            // Implementation depends on filter requirements
            console.log(`Applying filter: ${filterType}`);
        }

        /**
         * Adjust timeline zoom
         */
        adjustZoom(factor) {
            const track = this.container.querySelector('.timeline-track');
            const zoomLevel = this.container.querySelector('.zoom-level');
            
            if (track && zoomLevel) {
                const currentZoom = parseFloat(track.dataset.zoom || '1');
                const newZoom = Math.max(0.5, Math.min(2, currentZoom * factor));
                
                track.dataset.zoom = newZoom;
                track.style.transform = `scale(${newZoom})`;
                zoomLevel.textContent = `${Math.round(newZoom * 100)}%`;
            }
        }

        /**
         * Handle keyboard navigation
         */
        handleKeyboard(e) {
            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    this.navigateToPrevious();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    this.navigateToNext();
                    break;
                case 'Enter':
                    if (this.currentVersionId) {
                        this.showVersionDetails(this.currentVersionId);
                    }
                    break;
                case 'Escape':
                    this.clearVersionSelection();
                    break;
            }
        }

        /**
         * Navigate to previous version
         */
        navigateToPrevious() {
            const currentIndex = this.versions.findIndex(v => v.versionId === this.currentVersionId);
            if (currentIndex > 0) {
                this.currentVersionId = this.versions[currentIndex - 1].versionId;
                this.scrollToVersion(this.currentVersionId);
            }
        }

        /**
         * Navigate to next version
         */
        navigateToNext() {
            const currentIndex = this.versions.findIndex(v => v.versionId === this.currentVersionId);
            if (currentIndex < this.versions.length - 1) {
                this.currentVersionId = this.versions[currentIndex + 1].versionId;
                this.scrollToVersion(this.currentVersionId);
            }
        }

        /**
         * Highlight connections for a version
         */
        highlightConnections(versionId) {
            // Add visual highlight to show relationships
            const node = this.container.querySelector(`[data-version-id="${versionId}"]`);
            if (node) {
                node.classList.add('highlighted');
            }
        }

        /**
         * Clear all highlights
         */
        clearHighlights() {
            const highlighted = this.container.querySelectorAll('.highlighted');
            highlighted.forEach(el => el.classList.remove('highlighted'));
        }

        /**
         * Show notification
         */
        showNotification(message, type = 'info') {
            // Would integrate with existing notification system
            console.log(`[${type}] ${message}`);
        }

        // Utility methods

        /**
         * Get confidence level
         */
        getConfidenceLevel(confidence) {
            if (confidence >= 0.8) return 'high';
            if (confidence >= 0.5) return 'medium';
            return 'low';
        }

        /**
         * Format timestamp
         */
        formatTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 60) {
                return `${diffMins} min atrás`;
            }
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) {
                return `${diffHours}h atrás`;
            }
            
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        /**
         * Format file size
         */
        formatSize(bytes) {
            const units = ['B', 'KB', 'MB', 'GB'];
            let size = bytes;
            let unitIndex = 0;
            
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            
            return `${size.toFixed(1)} ${units[unitIndex]}`;
        }

        /**
         * Format value for display
         */
        formatValue(value) {
            if (value === null) return 'null';
            if (value === undefined) return 'undefined';
            if (typeof value === 'string') return `"${this.escapeHtml(value)}"`;
            if (typeof value === 'object') return JSON.stringify(value, null, 2);
            return String(value);
        }

        /**
         * Summarize state for preview
         */
        summarizeState(state) {
            if (!state) return {};
            
            // Extract key information for preview
            return {
                confidence: state.confidence,
                categories: state.categories,
                analysisCount: state.analysisCount,
                lastAnalyzed: state.lastAnalyzed,
                // Add more fields as needed
            };
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
         * Event emitter
         */
        on(event, handler) {
            if (!this.eventHandlers.has(event)) {
                this.eventHandlers.set(event, []);
            }
            this.eventHandlers.get(event).push(handler);
        }

        /**
         * Remove event handler
         */
        off(event, handler) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }

        /**
         * Emit event
         */
        emit(event, data) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                handlers.forEach(handler => handler(data));
            }
        }

        /**
         * Destroy the timeline
         */
        destroy() {
            this.eventHandlers.clear();
            this.container.innerHTML = '';
        }
    }

    // Export to global namespace
    window.VersionTimeline = VersionTimeline;

    // Auto-register with KC if available
    if (window.KC) {
        window.KC.VersionTimeline = VersionTimeline;
    }

})(window);