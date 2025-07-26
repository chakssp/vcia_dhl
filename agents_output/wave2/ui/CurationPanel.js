/**
 * CurationPanel.js - Main UI Component Orchestrator
 * 
 * Integrates all Wave 1 components (VersionedAppState, ConfidenceTracker, 
 * ConfidenceCalculator) into a cohesive interface for ML confidence workflow management.
 * Follows KC patterns with EventBus integration and vanilla JavaScript.
 */

(function(window) {
    'use strict';

    // Import Wave 1 components
    const VersionedAppState = window.VersionedAppState || (() => {
        console.warn('VersionedAppState not loaded - using mock');
        return class MockVersionedAppState {};
    })();
    
    const ConfidenceTracker = window.KnowledgeConsolidator?.ConfidenceTracker || (() => {
        console.warn('ConfidenceTracker not loaded - using mock');
        return class MockConfidenceTracker {};
    })();
    
    const ConfidenceCalculator = window.ConfidenceCalculator || (() => {
        console.warn('ConfidenceCalculator not loaded - using mock');
        return class MockConfidenceCalculator {};
    })();

    class CurationPanel {
        constructor(containerId) {
            this.container = document.querySelector(containerId);
            if (!this.container) {
                throw new Error(`Container ${containerId} not found`);
            }

            // Core components
            this.eventBus = window.KC?.EventBus || this.createMockEventBus();
            this.appState = window.KC?.AppState || new Map();
            
            // Wave 1 component instances
            this.versionedStates = new Map(); // fileId -> VersionedAppState instance
            this.confidenceTracker = null;
            this.confidenceCalculator = null;
            
            // UI component instances
            this.fileCards = new Map(); // fileId -> FileCard instance
            this.selectedFiles = new Set();
            
            // Configuration
            this.config = {
                viewMode: 'grid', // grid | list | timeline
                sortBy: 'confidence', // confidence | date | name | size
                sortOrder: 'desc', // asc | desc
                confidenceThreshold: 0.5,
                itemsPerPage: 50,
                currentPage: 1,
                enableVirtualScroll: true,
                animationDuration: 300
            };
            
            // Performance tracking
            this.performanceMetrics = {
                renderTime: 0,
                updateTime: 0,
                lastRender: Date.now()
            };
            
            this.initialize();
        }

        /**
         * Initialize the CurationPanel
         */
        async initialize() {
            try {
                // Initialize Wave 1 components
                this.initializeWave1Components();
                
                // Render base UI structure
                this.render();
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Load initial data
                await this.loadInitialData();
                
                // Emit ready event
                this.eventBus.emit('curation:panel:ready', {
                    timestamp: Date.now()
                });
                
            } catch (error) {
                console.error('CurationPanel initialization failed:', error);
                this.showError('Failed to initialize CurationPanel');
            }
        }

        /**
         * Initialize Wave 1 components
         */
        initializeWave1Components() {
            // Initialize ConfidenceTracker
            this.confidenceTracker = new ConfidenceTracker(this.eventBus, this.appState);
            
            // Initialize ConfidenceCalculator
            this.confidenceCalculator = new ConfidenceCalculator();
            
            console.log('Wave 1 components initialized');
        }

        /**
         * Render the base UI structure
         */
        render() {
            const startTime = performance.now();
            
            this.container.innerHTML = `
                <div class="curation-panel" role="main" aria-label="Painel de Curadoria ML">
                    <!-- Header Section -->
                    <header class="curation-header">
                        <div class="header-content">
                            <div class="header-title">
                                <h1>ML Confidence Curation</h1>
                                <p class="header-subtitle">Gerencie e acompanhe a evolução da confiança dos seus arquivos</p>
                            </div>
                            <div class="header-actions">
                                <button class="btn btn-primary" id="batch-analyze-btn">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M8 1a.5.5 0 0 1 .5.5v6h6a.5.5 0 0 1 0 1h-6v6a.5.5 0 0 1-1 0v-6h-6a.5.5 0 0 1 0-1h6v-6A.5.5 0 0 1 8 1z"/>
                                    </svg>
                                    Análise em Lote
                                </button>
                                <button class="btn btn-secondary" id="export-btn">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                                    </svg>
                                    Exportar
                                </button>
                            </div>
                        </div>
                    </header>

                    <!-- Control Bar -->
                    <div class="control-bar">
                        <div class="control-section filters">
                            <div class="filter-group">
                                <label for="confidence-filter">Confiança Mínima:</label>
                                <input type="range" 
                                       id="confidence-filter" 
                                       min="0" 
                                       max="100" 
                                       value="${this.config.confidenceThreshold * 100}"
                                       class="confidence-slider">
                                <span class="confidence-value">${Math.round(this.config.confidenceThreshold * 100)}%</span>
                            </div>
                            <div class="filter-group">
                                <label for="category-filter">Categoria:</label>
                                <select id="category-filter" class="filter-select">
                                    <option value="all">Todas</option>
                                    <option value="technical">Técnico</option>
                                    <option value="strategic">Estratégico</option>
                                    <option value="conceptual">Conceitual</option>
                                    <option value="development">Desenvolvimento</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="control-section sorting">
                            <div class="sort-group">
                                <label for="sort-by">Ordenar por:</label>
                                <select id="sort-by" class="sort-select">
                                    <option value="confidence" selected>Confiança</option>
                                    <option value="date">Data</option>
                                    <option value="name">Nome</option>
                                    <option value="size">Tamanho</option>
                                </select>
                                <button class="btn-icon sort-order" id="sort-order-btn" title="Ordem crescente/decrescente">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M3.5 3.5a.5.5 0 0 0-1 0v8.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L3.5 12.293V3.5zm4 .5a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1h-1zm0 3a.5.5 0 0 1 0-1h3a.5.5 0 0 1 0 1h-3zm0 3a.5.5 0 0 1 0-1h5a.5.5 0 0 1 0 1h-5zM7 12.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7a.5.5 0 0 0-.5.5z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="control-section view-modes">
                            <div class="view-mode-group" role="group" aria-label="Modo de visualização">
                                <button class="view-mode-btn active" data-mode="grid" title="Visualização em grade">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                                    </svg>
                                </button>
                                <button class="view-mode-btn" data-mode="list" title="Visualização em lista">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                                        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                                    </svg>
                                </button>
                                <button class="view-mode-btn" data-mode="timeline" title="Visualização em linha do tempo">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"/>
                                        <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"/>
                                        <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div class="main-content">
                        <div class="content-wrapper">
                            <!-- File List/Grid Container -->
                            <div id="file-container" class="file-container grid-view">
                                <!-- File cards will be dynamically inserted here -->
                            </div>
                            
                            <!-- Empty State -->
                            <div class="empty-state" style="display: none;">
                                <svg class="empty-icon" width="64" height="64" viewBox="0 0 16 16">
                                    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                                </svg>
                                <h3>Nenhum arquivo encontrado</h3>
                                <p>Execute uma descoberta de arquivos ou ajuste os filtros</p>
                            </div>
                        </div>
                        
                        <!-- Detail View (hidden by default) -->
                        <div id="detail-view" class="detail-view" style="display: none;">
                            <!-- Detail content will be dynamically inserted here -->
                        </div>
                    </div>

                    <!-- Side Panels Container -->
                    <div class="side-panels">
                        <!-- ML Configuration Panel -->
                        <div id="ml-config-panel" class="side-panel ml-config-panel collapsed">
                            <!-- ML config content will be loaded by MLConfigPanel component -->
                        </div>
                        
                        <!-- Version Control Panel -->
                        <div id="version-control-panel" class="side-panel version-panel collapsed">
                            <!-- Version control content will be loaded by VersionPanel component -->
                        </div>
                    </div>

                    <!-- Batch Operations Panel (hidden by default) -->
                    <div id="batch-operations" class="batch-operations-panel" style="display: none;">
                        <!-- Batch operations content will be dynamically inserted here -->
                    </div>

                    <!-- Loading Overlay -->
                    <div class="loading-overlay" style="display: none;">
                        <div class="spinner"></div>
                        <p class="loading-text">Carregando...</p>
                    </div>
                </div>
            `;
            
            this.performanceMetrics.renderTime = performance.now() - startTime;
            console.log(`CurationPanel rendered in ${this.performanceMetrics.renderTime.toFixed(2)}ms`);
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Control bar listeners
            this.setupControlBarListeners();
            
            // Header action listeners
            this.setupHeaderActionListeners();
            
            // EventBus listeners for Wave 1 components
            this.setupWave1EventListeners();
            
            // Window resize listener for responsive behavior
            window.addEventListener('resize', this.debounce(() => {
                this.handleResize();
            }, 250));
        }

        /**
         * Setup control bar event listeners
         */
        setupControlBarListeners() {
            // Confidence threshold slider
            const confidenceSlider = this.container.querySelector('#confidence-filter');
            const confidenceValue = this.container.querySelector('.confidence-value');
            
            confidenceSlider?.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value) / 100;
                this.config.confidenceThreshold = value;
                confidenceValue.textContent = `${Math.round(value * 100)}%`;
                this.applyFilters();
            });
            
            // Category filter
            const categoryFilter = this.container.querySelector('#category-filter');
            categoryFilter?.addEventListener('change', (e) => {
                this.applyFilters();
            });
            
            // Sort controls
            const sortBy = this.container.querySelector('#sort-by');
            sortBy?.addEventListener('change', (e) => {
                this.config.sortBy = e.target.value;
                this.applySorting();
            });
            
            const sortOrderBtn = this.container.querySelector('#sort-order-btn');
            sortOrderBtn?.addEventListener('click', () => {
                this.config.sortOrder = this.config.sortOrder === 'asc' ? 'desc' : 'asc';
                sortOrderBtn.classList.toggle('ascending');
                this.applySorting();
            });
            
            // View mode buttons
            const viewModeBtns = this.container.querySelectorAll('.view-mode-btn');
            viewModeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.switchViewMode(mode);
                });
            });
        }

        /**
         * Setup header action listeners
         */
        setupHeaderActionListeners() {
            // Batch analyze button
            const batchAnalyzeBtn = this.container.querySelector('#batch-analyze-btn');
            batchAnalyzeBtn?.addEventListener('click', () => {
                this.showBatchAnalysis();
            });
            
            // Export button
            const exportBtn = this.container.querySelector('#export-btn');
            exportBtn?.addEventListener('click', () => {
                this.showExportDialog();
            });
        }

        /**
         * Setup Wave 1 component event listeners
         */
        setupWave1EventListeners() {
            // Listen for confidence updates
            this.eventBus.on('confidence:metrics:updated', (data) => {
                this.handleConfidenceUpdate(data);
            });
            
            // Listen for version creation
            this.eventBus.on('appstate:snapshot:created', (data) => {
                this.handleVersionCreated(data);
            });
            
            // Listen for convergence events
            this.eventBus.on('confidence:converged', (data) => {
                this.handleConvergence(data);
            });
            
            // Listen for file events
            this.eventBus.on('file:analyzed', (data) => {
                this.handleFileAnalyzed(data);
            });
        }

        /**
         * Load initial data
         */
        async loadInitialData() {
            this.showLoading('Carregando arquivos...');
            
            try {
                // Get files from AppState
                const files = this.appState.get('files') || [];
                
                // Process and display files
                await this.processFiles(files);
                
                // Update UI
                this.updateFileDisplay();
                
            } catch (error) {
                console.error('Error loading initial data:', error);
                this.showError('Erro ao carregar arquivos');
            } finally {
                this.hideLoading();
            }
        }

        /**
         * Process files for display
         */
        async processFiles(files) {
            for (const file of files) {
                // Calculate initial confidence if not present
                if (!file.confidence) {
                    const analysisData = {
                        fileId: file.id,
                        content: file.content || '',
                        categories: file.categories || [],
                        createdAt: file.createdAt,
                        modifiedAt: file.modifiedAt,
                        fileType: file.type,
                        fileSize: file.size,
                        path: file.path
                    };
                    
                    const metrics = this.confidenceCalculator.calculate(analysisData);
                    file.confidence = metrics;
                    
                    // Start tracking
                    this.confidenceTracker.startTracking(file.id, {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type
                    });
                    
                    // Update metrics
                    this.confidenceTracker.updateMetrics(file.id, metrics);
                }
                
                // Initialize versioned state
                if (!this.versionedStates.has(file.id)) {
                    const versionedState = new VersionedAppState(file.id);
                    versionedState.createSnapshot(file, {
                        reason: 'Initial state',
                        confidence: file.confidence.overall
                    });
                    this.versionedStates.set(file.id, versionedState);
                }
            }
        }

        /**
         * Analyze a single file
         */
        async analyzeFile(fileId) {
            const file = this.getFileById(fileId);
            if (!file) return;
            
            this.showFileLoading(fileId, 'Analisando...');
            
            try {
                // Simulate analysis (in real implementation, would call AI service)
                await this.simulateDelay(1500);
                
                // Calculate new confidence metrics
                const analysisData = {
                    fileId: file.id,
                    content: file.content || '',
                    categories: file.categories || [],
                    createdAt: file.createdAt,
                    modifiedAt: file.modifiedAt,
                    fileType: file.type,
                    fileSize: file.size,
                    path: file.path,
                    iterationCount: (file.analysisCount || 0) + 1,
                    previousConfidence: file.confidence?.overall || 0
                };
                
                const metrics = this.confidenceCalculator.calculate(analysisData);
                
                // Update tracking
                this.confidenceTracker.updateMetrics(fileId, metrics);
                
                // Create version snapshot
                const versionedState = this.versionedStates.get(fileId);
                if (versionedState) {
                    versionedState.createSnapshot({
                        ...file,
                        confidence: metrics,
                        analysisCount: (file.analysisCount || 0) + 1,
                        lastAnalyzed: new Date()
                    }, {
                        reason: 'ML analysis completed',
                        confidence: metrics.overall
                    });
                }
                
                // Update file data
                file.confidence = metrics;
                file.analysisCount = (file.analysisCount || 0) + 1;
                file.lastAnalyzed = new Date();
                
                // Emit event
                this.eventBus.emit('file:analyzed', {
                    fileId,
                    metrics,
                    iteration: file.analysisCount
                });
                
                // Update UI
                this.updateFileCard(fileId);
                
                // Show success notification
                this.showNotification({
                    type: 'success',
                    message: `Análise concluída: ${Math.round(metrics.overall * 100)}% de confiança`,
                    duration: 3000
                });
                
            } catch (error) {
                console.error('Error analyzing file:', error);
                this.showNotification({
                    type: 'error',
                    message: 'Erro ao analisar arquivo',
                    duration: 5000
                });
            } finally {
                this.hideFileLoading(fileId);
            }
        }

        /**
         * Update file display based on current filters and sorting
         */
        updateFileDisplay() {
            const container = this.container.querySelector('#file-container');
            const files = this.getFilteredAndSortedFiles();
            
            // Clear existing content
            container.innerHTML = '';
            this.fileCards.clear();
            
            // Show empty state if no files
            if (files.length === 0) {
                this.showEmptyState();
                return;
            }
            
            this.hideEmptyState();
            
            // Render file cards
            files.forEach(file => {
                const card = this.createFileCard(file);
                container.appendChild(card);
            });
        }

        /**
         * Create a file card element
         */
        createFileCard(file) {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.fileId = file.id;
            card.dataset.confidenceLevel = this.getConfidenceLevel(file.confidence?.overall || 0);
            
            const confidence = file.confidence?.overall || 0;
            const confidencePercent = Math.round(confidence * 100);
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (confidence * circumference);
            
            card.innerHTML = `
                <div class="card-header">
                    <h3 class="file-name" title="${file.name}">${file.name}</h3>
                    <div class="confidence-badge">
                        <svg class="confidence-ring" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" class="confidence-track"/>
                            <circle cx="50" cy="50" r="45" class="confidence-fill" 
                                    stroke-dasharray="${circumference}" 
                                    stroke-dashoffset="${offset}"/>
                        </svg>
                        <span class="confidence-value">${confidencePercent}%</span>
                    </div>
                </div>
                
                <div class="card-metrics">
                    <div class="metric-grid">
                        ${this.renderDimensionMetrics(file.confidence?.dimensions || {})}
                    </div>
                </div>
                
                <div class="card-status">
                    <span class="version-info">v${file.analysisCount || 1} • ${this.formatTimeAgo(file.lastAnalyzed)}</span>
                    ${this.renderConvergenceStatus(file.confidence?.convergencePrediction)}
                </div>
                
                <div class="card-actions">
                    <button class="btn-icon" title="Analisar" data-action="analyze">
                        <svg class="icon-analyze" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                    </button>
                    <button class="btn-icon" title="Versões" data-action="versions">
                        <svg class="icon-versions" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                        </svg>
                    </button>
                    <button class="btn-icon" title="Detalhes" data-action="details">
                        <svg class="icon-details" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Store card reference
            this.fileCards.set(file.id, card);
            
            // Add event listeners
            this.setupFileCardListeners(card, file);
            
            return card;
        }

        /**
         * Render dimension metrics
         */
        renderDimensionMetrics(dimensions) {
            const dimensionNames = {
                semantic: 'Semântico',
                categorical: 'Categórico',
                structural: 'Estrutural',
                temporal: 'Temporal'
            };
            
            return Object.entries(dimensions).map(([key, value]) => `
                <div class="metric">
                    <span class="label">${dimensionNames[key] || key}</span>
                    <div class="mini-bar" style="--value: ${value}"></div>
                </div>
            `).join('');
        }

        /**
         * Render convergence status
         */
        renderConvergenceStatus(prediction) {
            if (!prediction) return '';
            
            const statusClass = prediction.willConverge ? 'converging' : 'diverging';
            const statusText = prediction.willConverge 
                ? `Convergindo (${prediction.estimatedIterations} iterações)`
                : 'Não convergindo';
            
            return `
                <span class="convergence-status ${statusClass}">
                    <svg class="icon" width="12" height="12" viewBox="0 0 16 16">
                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                    </svg>
                    ${statusText}
                </span>
            `;
        }

        /**
         * Setup file card event listeners
         */
        setupFileCardListeners(card, file) {
            // Action buttons
            const actionBtns = card.querySelectorAll('[data-action]');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.currentTarget.dataset.action;
                    this.handleFileAction(file.id, action);
                });
            });
            
            // Card click for selection
            card.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    this.toggleFileSelection(file.id);
                } else {
                    this.selectFile(file.id);
                }
            });
        }

        /**
         * Handle file card actions
         */
        handleFileAction(fileId, action) {
            switch (action) {
                case 'analyze':
                    this.analyzeFile(fileId);
                    break;
                case 'versions':
                    this.showVersionHistory(fileId);
                    break;
                case 'details':
                    this.showFileDetails(fileId);
                    break;
            }
        }

        // Utility methods
        
        /**
         * Get confidence level category
         */
        getConfidenceLevel(confidence) {
            if (confidence >= 0.8) return 'high';
            if (confidence >= 0.5) return 'medium';
            return 'low';
        }

        /**
         * Format time ago
         */
        formatTimeAgo(date) {
            if (!date) return 'Nunca';
            
            const now = new Date();
            const past = new Date(date);
            const diffMs = now - past;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Agora';
            if (diffMins < 60) return `${diffMins}m atrás`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h atrás`;
            
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 30) return `${diffDays}d atrás`;
            
            return past.toLocaleDateString('pt-BR');
        }

        /**
         * Debounce utility
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        /**
         * Create mock EventBus if not available
         */
        createMockEventBus() {
            return {
                on: (event, callback) => console.log(`Mock EventBus: on ${event}`),
                emit: (event, data) => console.log(`Mock EventBus: emit ${event}`, data),
                off: (event, callback) => console.log(`Mock EventBus: off ${event}`)
            };
        }

        /**
         * Simulate async delay
         */
        simulateDelay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Placeholder methods for features to be implemented
        
        applyFilters() {
            console.log('Applying filters...');
            this.updateFileDisplay();
        }
        
        applySorting() {
            console.log('Applying sorting...');
            this.updateFileDisplay();
        }
        
        switchViewMode(mode) {
            console.log(`Switching to ${mode} view`);
            this.config.viewMode = mode;
            // Update UI classes
            const container = this.container.querySelector('#file-container');
            container.className = `file-container ${mode}-view`;
        }
        
        showBatchAnalysis() {
            console.log('Showing batch analysis...');
        }
        
        showExportDialog() {
            console.log('Showing export dialog...');
        }
        
        handleConfidenceUpdate(data) {
            console.log('Confidence updated:', data);
            this.updateFileCard(data.fileId);
        }
        
        handleVersionCreated(data) {
            console.log('Version created:', data);
        }
        
        handleConvergence(data) {
            console.log('File converged:', data);
            this.showNotification({
                type: 'success',
                message: `Arquivo convergiu com ${Math.round(data.finalMetrics.overall * 100)}% de confiança`,
                duration: 5000
            });
        }
        
        handleFileAnalyzed(data) {
            console.log('File analyzed:', data);
        }
        
        showLoading(message) {
            const overlay = this.container.querySelector('.loading-overlay');
            const text = this.container.querySelector('.loading-text');
            if (overlay && text) {
                text.textContent = message || 'Carregando...';
                overlay.style.display = 'flex';
            }
        }
        
        hideLoading() {
            const overlay = this.container.querySelector('.loading-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
        
        showError(message) {
            console.error(message);
            this.showNotification({
                type: 'error',
                message,
                duration: 5000
            });
        }
        
        showNotification(options) {
            console.log('Notification:', options);
            // Would integrate with existing notification system
        }
        
        showEmptyState() {
            const emptyState = this.container.querySelector('.empty-state');
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
        }
        
        hideEmptyState() {
            const emptyState = this.container.querySelector('.empty-state');
            if (emptyState) {
                emptyState.style.display = 'none';
            }
        }
        
        showFileLoading(fileId, message) {
            const card = this.fileCards.get(fileId);
            if (card) {
                card.classList.add('loading');
            }
        }
        
        hideFileLoading(fileId) {
            const card = this.fileCards.get(fileId);
            if (card) {
                card.classList.remove('loading');
            }
        }
        
        updateFileCard(fileId) {
            const file = this.getFileById(fileId);
            if (file) {
                const oldCard = this.fileCards.get(fileId);
                if (oldCard) {
                    const newCard = this.createFileCard(file);
                    oldCard.replaceWith(newCard);
                }
            }
        }
        
        getFileById(fileId) {
            const files = this.appState.get('files') || [];
            return files.find(f => f.id === fileId);
        }
        
        getFilteredAndSortedFiles() {
            let files = this.appState.get('files') || [];
            
            // Apply confidence threshold filter
            files = files.filter(file => {
                const confidence = file.confidence?.overall || 0;
                return confidence >= this.config.confidenceThreshold;
            });
            
            // Apply category filter
            const categoryFilter = this.container.querySelector('#category-filter')?.value;
            if (categoryFilter && categoryFilter !== 'all') {
                files = files.filter(file => {
                    return file.categories?.includes(categoryFilter);
                });
            }
            
            // Apply sorting
            files.sort((a, b) => {
                let compareValue = 0;
                
                switch (this.config.sortBy) {
                    case 'confidence':
                        compareValue = (a.confidence?.overall || 0) - (b.confidence?.overall || 0);
                        break;
                    case 'date':
                        compareValue = new Date(a.lastAnalyzed || 0) - new Date(b.lastAnalyzed || 0);
                        break;
                    case 'name':
                        compareValue = a.name.localeCompare(b.name);
                        break;
                    case 'size':
                        compareValue = a.size - b.size;
                        break;
                }
                
                return this.config.sortOrder === 'asc' ? compareValue : -compareValue;
            });
            
            return files;
        }
        
        toggleFileSelection(fileId) {
            if (this.selectedFiles.has(fileId)) {
                this.selectedFiles.delete(fileId);
            } else {
                this.selectedFiles.add(fileId);
            }
            this.updateSelectionUI();
        }
        
        selectFile(fileId) {
            this.selectedFiles.clear();
            this.selectedFiles.add(fileId);
            this.updateSelectionUI();
        }
        
        updateSelectionUI() {
            // Update card selection states
            this.fileCards.forEach((card, fileId) => {
                if (this.selectedFiles.has(fileId)) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
            
            // Show/hide batch operations if multiple files selected
            if (this.selectedFiles.size > 1) {
                this.showBatchOperations();
            } else {
                this.hideBatchOperations();
            }
        }
        
        showBatchOperations() {
            const batchPanel = this.container.querySelector('#batch-operations');
            if (batchPanel) {
                batchPanel.style.display = 'block';
                // Update content based on selected files
            }
        }
        
        hideBatchOperations() {
            const batchPanel = this.container.querySelector('#batch-operations');
            if (batchPanel) {
                batchPanel.style.display = 'none';
            }
        }
        
        showVersionHistory(fileId) {
            console.log(`Showing version history for ${fileId}`);
            // Would show version timeline component
        }
        
        showFileDetails(fileId) {
            console.log(`Showing details for ${fileId}`);
            // Would show detail view
        }
        
        handleResize() {
            // Handle responsive behavior
            const width = window.innerWidth;
            if (width < 768) {
                // Mobile adjustments
                this.config.itemsPerPage = 20;
            } else if (width < 1024) {
                // Tablet adjustments
                this.config.itemsPerPage = 50;
            } else {
                // Desktop
                this.config.itemsPerPage = 100;
            }
        }
    }

    // Export to global namespace
    window.CurationPanel = CurationPanel;

    // Auto-initialize if KC is available
    if (window.KC) {
        window.KC.CurationPanel = CurationPanel;
    }

})(window);