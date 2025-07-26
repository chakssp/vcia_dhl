/**
 * FileCard.js - Individual File Display Component
 * 
 * Displays file information with confidence metrics, version indicators,
 * and action buttons. Integrates with ConfidenceTracker for real-time updates.
 */

(function(window) {
    'use strict';

    class FileCard {
        constructor(file, options = {}) {
            this.file = file;
            this.options = {
                showActions: true,
                showMetrics: true,
                showStatus: true,
                animateUpdates: true,
                ...options
            };
            
            this.element = null;
            this.eventHandlers = new Map();
            this.isLoading = false;
            this.isSelected = false;
            
            this.create();
        }

        /**
         * Create the file card element
         */
        create() {
            this.element = document.createElement('div');
            this.element.className = 'file-card';
            this.element.dataset.fileId = this.file.id;
            this.element.dataset.confidenceLevel = this.getConfidenceLevel();
            
            this.render();
            this.setupEventListeners();
        }

        /**
         * Render the card content
         */
        render() {
            const confidence = this.file.confidence?.overall || 0;
            const confidencePercent = Math.round(confidence * 100);
            
            // SVG circle calculations
            const radius = 45;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (confidence * circumference);
            
            this.element.innerHTML = `
                <div class="card-inner">
                    <!-- Loading Overlay -->
                    <div class="card-loading-overlay" style="display: none;">
                        <div class="spinner-small"></div>
                    </div>
                    
                    <!-- Selection Checkbox -->
                    <div class="card-selection">
                        <input type="checkbox" 
                               class="selection-checkbox" 
                               id="select-${this.file.id}"
                               ${this.isSelected ? 'checked' : ''}>
                        <label for="select-${this.file.id}" class="selection-label"></label>
                    </div>
                    
                    <!-- Header Section -->
                    <div class="card-header">
                        <div class="file-info">
                            <h3 class="file-name" title="${this.escapeHtml(this.file.name)}">
                                ${this.escapeHtml(this.file.name)}
                            </h3>
                            <div class="file-meta">
                                <span class="file-type">${this.file.type || 'unknown'}</span>
                                <span class="file-size">${this.formatFileSize(this.file.size)}</span>
                            </div>
                        </div>
                        
                        <div class="confidence-badge">
                            <svg class="confidence-ring" viewBox="0 0 100 100" width="60" height="60">
                                <circle cx="50" cy="50" r="${radius}" 
                                        class="confidence-track" 
                                        fill="none" 
                                        stroke="var(--color-gray-200)" 
                                        stroke-width="4"/>
                                <circle cx="50" cy="50" r="${radius}" 
                                        class="confidence-fill" 
                                        fill="none"
                                        stroke="var(--confidence-color)" 
                                        stroke-width="4"
                                        stroke-linecap="round"
                                        stroke-dasharray="${circumference}" 
                                        stroke-dashoffset="${offset}"
                                        transform="rotate(-90 50 50)"/>
                            </svg>
                            <div class="confidence-value-container">
                                <span class="confidence-value">${confidencePercent}</span>
                                <span class="confidence-percent">%</span>
                            </div>
                        </div>
                    </div>
                    
                    ${this.options.showMetrics ? this.renderMetrics() : ''}
                    ${this.options.showStatus ? this.renderStatus() : ''}
                    ${this.options.showActions ? this.renderActions() : ''}
                </div>
            `;
        }

        /**
         * Render metrics section
         */
        renderMetrics() {
            const dimensions = this.file.confidence?.dimensions || {};
            const hasMetrics = Object.keys(dimensions).length > 0;
            
            if (!hasMetrics) {
                return `
                    <div class="card-metrics no-data">
                        <p class="no-metrics-text">Aguardando análise...</p>
                    </div>
                `;
            }
            
            return `
                <div class="card-metrics">
                    <div class="metric-grid">
                        ${this.renderDimension('semantic', 'Semântico', dimensions.semantic || 0)}
                        ${this.renderDimension('categorical', 'Categórico', dimensions.categorical || 0)}
                        ${this.renderDimension('structural', 'Estrutural', dimensions.structural || 0)}
                        ${this.renderDimension('temporal', 'Temporal', dimensions.temporal || 0)}
                    </div>
                </div>
            `;
        }

        /**
         * Render individual dimension metric
         */
        renderDimension(key, label, value) {
            const percent = Math.round(value * 100);
            const level = this.getMetricLevel(value);
            
            return `
                <div class="metric metric-${key}" data-level="${level}">
                    <div class="metric-header">
                        <span class="metric-label">${label}</span>
                        <span class="metric-value">${percent}%</span>
                    </div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }

        /**
         * Render status section
         */
        renderStatus() {
            const version = this.file.analysisCount || 1;
            const lastAnalyzed = this.formatTimeAgo(this.file.lastAnalyzed);
            const convergence = this.file.confidence?.convergencePrediction;
            
            return `
                <div class="card-status">
                    <div class="status-row">
                        <div class="version-info">
                            <svg class="icon-version" width="12" height="12" viewBox="0 0 16 16">
                                <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                            </svg>
                            <span>Versão ${version}</span>
                        </div>
                        <div class="time-info">
                            <svg class="icon-time" width="12" height="12" viewBox="0 0 16 16">
                                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                            </svg>
                            <span>${lastAnalyzed}</span>
                        </div>
                    </div>
                    ${convergence ? this.renderConvergenceStatus(convergence) : ''}
                </div>
            `;
        }

        /**
         * Render convergence status
         */
        renderConvergenceStatus(prediction) {
            const isConverging = prediction.willConverge;
            const statusClass = isConverging ? 'converging' : 'diverging';
            const statusIcon = isConverging ? 'trending-up' : 'trending-down';
            
            let statusText = '';
            if (isConverging) {
                if (prediction.isConverged) {
                    statusText = 'Convergido';
                } else {
                    statusText = `Convergindo (${prediction.estimatedIterations} iterações)`;
                }
            } else {
                statusText = 'Não convergindo';
            }
            
            return `
                <div class="convergence-status ${statusClass}">
                    <svg class="icon-${statusIcon}" width="14" height="14" viewBox="0 0 16 16">
                        ${isConverging ? `
                            <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                            <path d="M0 4a.5.5 0 0 1 .5-.5h15a.5.5 0 0 1 0 1H.5A.5.5 0 0 1 0 4zm0 8a.5.5 0 0 1 .5-.5h15a.5.5 0 0 1 0 1H.5A.5.5 0 0 1 0 12zM8 1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 1zm0 11.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5z"/>
                        ` : `
                            <path d="M3.204 5h9.592L8 10.481 3.204 5zm-.753.659 4.796 5.48a1 1 0 0 0 1.506 0l4.796-5.48c.566-.647.106-1.659-.753-1.659H3.204a1 1 0 0 0-.753 1.659z"/>
                        `}
                    </svg>
                    <span class="status-text">${statusText}</span>
                    ${prediction.confidence ? `
                        <span class="confidence-delta">(±${Math.round(prediction.confidence * 100)}%)</span>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Render action buttons
         */
        renderActions() {
            return `
                <div class="card-actions">
                    <button class="action-btn" 
                            data-action="analyze" 
                            title="Analisar arquivo"
                            ${this.isLoading ? 'disabled' : ''}>
                        <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                        <span class="action-text">Analisar</span>
                    </button>
                    
                    <button class="action-btn" 
                            data-action="versions" 
                            title="Histórico de versões">
                        <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 1-1 0v-3A1.5 1.5 0 0 1 1.5 0h3a.5.5 0 0 1 0 1h-3zM11 .5a.5.5 0 0 1 .5-.5h3A1.5 1.5 0 0 1 16 1.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 1-.5-.5zM.5 11a.5.5 0 0 1 .5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 1 0 1h-3A1.5 1.5 0 0 1 0 14.5v-3a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a.5.5 0 0 1 0-1h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 1 .5-.5z"/>
                            <path d="M4 4h1v1H4V4zm2 0h1v1H6V4zm2 0h1v1H8V4zm2 0h1v1h-1V4zm0 2v1H9V6h1zm0 2v1H9V8h1zm0 2v1H9v-1h1zm2-8h1v1h-1V4zm0 2h1v1h-1V6zm0 2h1v1h-1V8zm0 2h1v1h-1v-1z"/>
                        </svg>
                        <span class="action-text">Versões</span>
                    </button>
                    
                    <button class="action-btn" 
                            data-action="details" 
                            title="Ver detalhes">
                        <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                            <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                        <span class="action-text">Detalhes</span>
                    </button>
                </div>
            `;
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Selection checkbox
            const checkbox = this.element.querySelector('.selection-checkbox');
            checkbox?.addEventListener('change', (e) => {
                this.isSelected = e.target.checked;
                this.element.classList.toggle('selected', this.isSelected);
                this.emit('selectionChange', { selected: this.isSelected });
            });
            
            // Action buttons
            const actionBtns = this.element.querySelectorAll('[data-action]');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.currentTarget.dataset.action;
                    this.emit('action', { action, fileId: this.file.id });
                });
            });
            
            // Card click
            this.element.addEventListener('click', (e) => {
                // Don't trigger if clicking on interactive elements
                if (e.target.closest('button, input, label')) return;
                this.emit('click', { fileId: this.file.id });
            });
            
            // Double click for quick open
            this.element.addEventListener('dblclick', (e) => {
                this.emit('dblclick', { fileId: this.file.id });
            });
        }

        /**
         * Update the card with new data
         */
        update(newFile) {
            const oldConfidence = this.file.confidence?.overall || 0;
            const newConfidence = newFile.confidence?.overall || 0;
            
            this.file = newFile;
            
            if (this.options.animateUpdates && Math.abs(oldConfidence - newConfidence) > 0.01) {
                this.animateUpdate();
            } else {
                this.render();
            }
            
            // Update data attributes
            this.element.dataset.confidenceLevel = this.getConfidenceLevel();
        }

        /**
         * Animate confidence update
         */
        animateUpdate() {
            this.element.classList.add('updating');
            
            // Animate the confidence ring
            const ring = this.element.querySelector('.confidence-fill');
            const valueEl = this.element.querySelector('.confidence-value');
            
            if (ring && valueEl) {
                const confidence = this.file.confidence?.overall || 0;
                const percent = Math.round(confidence * 100);
                const circumference = 2 * Math.PI * 45;
                const offset = circumference - (confidence * circumference);
                
                ring.style.transition = 'stroke-dashoffset 0.8s ease-out';
                ring.style.strokeDashoffset = offset;
                
                // Animate number
                this.animateNumber(valueEl, percent);
            }
            
            // Update other metrics with fade
            setTimeout(() => {
                this.render();
                this.element.classList.remove('updating');
            }, 800);
        }

        /**
         * Animate number change
         */
        animateNumber(element, target) {
            const start = parseInt(element.textContent) || 0;
            const duration = 800;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const current = Math.round(start + (target - start) * this.easeOutCubic(progress));
                
                element.textContent = current;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        }

        /**
         * Easing function for animations
         */
        easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        /**
         * Show loading state
         */
        showLoading() {
            this.isLoading = true;
            this.element.classList.add('loading');
            const overlay = this.element.querySelector('.card-loading-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
            }
            
            // Disable action buttons
            const buttons = this.element.querySelectorAll('.action-btn');
            buttons.forEach(btn => btn.disabled = true);
        }

        /**
         * Hide loading state
         */
        hideLoading() {
            this.isLoading = false;
            this.element.classList.remove('loading');
            const overlay = this.element.querySelector('.card-loading-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
            
            // Enable action buttons
            const buttons = this.element.querySelectorAll('.action-btn');
            buttons.forEach(btn => btn.disabled = false);
        }

        /**
         * Set selection state
         */
        setSelected(selected) {
            this.isSelected = selected;
            const checkbox = this.element.querySelector('.selection-checkbox');
            if (checkbox) {
                checkbox.checked = selected;
            }
            this.element.classList.toggle('selected', selected);
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
         * Destroy the card
         */
        destroy() {
            // Remove event listeners
            this.eventHandlers.clear();
            
            // Remove element
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            
            this.element = null;
        }

        // Utility methods

        /**
         * Get confidence level category
         */
        getConfidenceLevel() {
            const confidence = this.file.confidence?.overall || 0;
            if (confidence >= 0.8) return 'high';
            if (confidence >= 0.5) return 'medium';
            return 'low';
        }

        /**
         * Get metric level
         */
        getMetricLevel(value) {
            if (value >= 0.8) return 'high';
            if (value >= 0.5) return 'medium';
            return 'low';
        }

        /**
         * Format file size
         */
        formatFileSize(bytes) {
            if (!bytes) return '0 B';
            const units = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + units[i];
        }

        /**
         * Format time ago
         */
        formatTimeAgo(date) {
            if (!date) return 'Nunca analisado';
            
            const now = new Date();
            const past = new Date(date);
            const diffMs = now - past;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Agora mesmo';
            if (diffMins < 60) return `${diffMins} min atrás`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h atrás`;
            
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays}d atrás`;
            
            const diffWeeks = Math.floor(diffDays / 7);
            if (diffWeeks < 4) return `${diffWeeks}sem atrás`;
            
            return past.toLocaleDateString('pt-BR');
        }

        /**
         * Escape HTML for safe rendering
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Export to global namespace
    window.FileCard = FileCard;

    // Auto-register with KC if available
    if (window.KC) {
        window.KC.FileCard = FileCard;
    }

})(window);