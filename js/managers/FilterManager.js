/**
 * FilterManager.js - Sistema de Filtros Avançados
 * 
 * Gerencia filtros dinâmicos com contadores em tempo real
 * conforme especificações do PRD e insights-1.2.png
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class FilterManager {
        constructor() {
            this.filters = {
                // Filtros de relevância
                relevance: {
                    all: { active: true, threshold: 0, count: 0 },
                    alta: { active: false, threshold: 70, count: 0 },
                    media: { active: false, threshold: 50, count: 0 },
                    baixa: { active: false, threshold: 30, count: 0 }
                },
                
                // Filtros de status
                status: {
                    todos: { active: true, count: 0 },
                    pendente: { active: false, count: 0 },
                    analisados: { active: false, count: 0 },
                    arquivados: { active: false, count: 0 }
                },
                
                // Filtros temporais (conforme PRD)
                timeRange: {
                    all: { active: true, months: null, count: 0 },
                    '1m': { active: false, months: 1, count: 0 },
                    '3m': { active: false, months: 3, count: 0 },
                    '6m': { active: false, months: 6, count: 0 },
                    '1y': { active: false, months: 12, count: 0 },
                    '2y': { active: false, months: 24, count: 0 }
                },
                
                // Filtros de tamanho
                size: {
                    all: { active: true, min: 0, max: Infinity, count: 0 },
                    small: { active: false, min: 0, max: 51200, count: 0 }, // <50KB
                    medium: { active: false, min: 51200, max: 512000, count: 0 }, // 50-500KB
                    large: { active: false, min: 512000, max: Infinity, count: 0 } // >500KB
                },
                
                // Filtros de tipo de arquivo
                fileType: {
                    all: { active: true, extensions: [], count: 0 },
                    md: { active: false, extensions: ['.md'], count: 0 },
                    txt: { active: false, extensions: ['.txt'], count: 0 },
                    docx: { active: false, extensions: ['.docx'], count: 0 },
                    pdf: { active: false, extensions: ['.pdf'], count: 0 }
                }
            };
            
            // Configurações de algoritmo
            this.algorithm = 'linear'; // linear, exponential, logarithmic
            this.semanticKeywords = [];
            this.semanticConfig = null;
            
            // Cache para performance
            this.cache = new Map();
            this.lastCalculation = null;
        }

        /**
         * Inicializa o FilterManager
         */
        initialize() {
            console.log('FilterManager inicializado');
            this.setupEventListeners();
            this.renderFilterControls();
            this.loadSavedFilters();
        }

        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // Escuta mudanças nos arquivos
            EventBus.on(Events.FILES_DISCOVERED, (data) => {
                this.updateAllCounts(data.files || []);
            });

            // Escuta mudanças no estado dos arquivos
            EventBus.on(Events.STATE_CHANGED, (data) => {
                if (data.path === 'files') {
                    this.updateAllCounts(data.newValue || []);
                }
            });
        }

        /**
         * Renderiza controles de filtro na interface
         */
        renderFilterControls() {
            // Usa a estrutura existente do HTML com filter-section
            const filterSection = document.getElementById('filter-section');
            if (!filterSection) {
                console.warn('FilterManager: Seção de filtros não encontrada');
                return;
            }
            
            // Integra com os filtros já existentes no HTML
            this.setupExistingFilters();
            
            // Adiciona filtros avançados ao filter-bar
            const filterBar = document.getElementById('filter-bar');
            if (!filterBar) {
                console.warn('FilterManager: filter-bar não encontrado');
                return;
            }

            // Adiciona filtros avançados ao filter-bar existente
            filterBar.innerHTML = `
                <div class="advanced-filters">
                    <div class="filter-group">
                        <label>Período:</label>
                        <select id="time-filter" class="filter-select">
                            <option value="all">Todos</option>
                            <option value="1m">1 mês</option>
                            <option value="3m">3 meses</option>
                            <option value="6m">6 meses</option>
                            <option value="1y">1 ano</option>
                            <option value="2y">2 anos</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Tamanho:</label>
                        <select id="size-filter" class="filter-select">
                            <option value="all">Todos</option>
                            <option value="small">&lt; 50KB</option>
                            <option value="medium">50-500KB</option>
                            <option value="large">&gt; 500KB</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Tipo:</label>
                        <select id="type-filter" class="filter-select">
                            <option value="all">Todos</option>
                            <option value="md">.md</option>
                            <option value="txt">.txt</option>
                            <option value="docx">.docx</option>
                            <option value="pdf">.pdf</option>
                        </select>
                    </div>
                </div>
            `;

            this.attachFilterEvents();
        }

        /**
         * Configura filtros existentes no HTML
         */
        setupExistingFilters() {
            // Configura os filtros de abas existentes
            const filterTabs = document.querySelectorAll('.filter-tab');
            filterTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filter = tab.dataset.filter;
                    this.activateFilter(filter);
                    this.updateTabStates(tab);
                });
            });

            // Configura o seletor de classificação
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.changeSortOrder(e.target.value);
                });
            }
        }

        /**
         * Ativa um filtro específico
         */
        activateFilter(filterType) {
            // Lógica para ativar filtro
            console.log('Filtro ativado:', filterType);
            
            // CORREÇÃO COMPLETA: Quando clica em "all" ou filtros de status, reseta relevância
            if (['all', 'pending', 'analyzed'].includes(filterType)) {
                // Filtros de STATUS
                Object.keys(this.filters.status).forEach(key => {
                    this.filters.status[key].active = false;
                });
                
                // IMPORTANTE: Quando seleciona filtro de status, volta relevância para "all"
                Object.keys(this.filters.relevance).forEach(key => {
                    this.filters.relevance[key].active = false;
                });
                this.filters.relevance.all.active = true;
                
                if (filterType === 'all') {
                    this.filters.status.todos.active = true;
                } else if (filterType === 'pending') {
                    this.filters.status.pendente.active = true;
                } else if (filterType === 'analyzed') {
                    this.filters.status.analisados.active = true;
                }
            } else if (['high', 'medium', 'low'].includes(filterType)) {
                // Filtros de RELEVÂNCIA
                Object.keys(this.filters.relevance).forEach(key => {
                    this.filters.relevance[key].active = false;
                });
                
                // Garante que sempre tem um filtro de status ativo
                if (!Object.values(this.filters.status).some(f => f.active)) {
                    this.filters.status.todos.active = true;
                }
                
                if (filterType === 'high') {
                    this.filters.relevance.alta.active = true;
                } else if (filterType === 'medium') {
                    this.filters.relevance.media.active = true;
                } else if (filterType === 'low') {
                    this.filters.relevance.baixa.active = true;
                }
            }

            // Aplica o filtro
            this.applyCurrentFilters();
        }

        /**
         * Atualiza estados visuais das abas
         */
        updateTabStates(activeTab) {
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            activeTab.classList.add('active');
        }

        /**
         * Muda ordem de classificação
         */
        changeSortOrder(sortType) {
            console.log('Classificação alterada para:', sortType);
            // Implementar lógica de ordenação
            EventBus.emit(Events.SORT_CHANGED, { sortType });
        }

        /**
         * Anexa eventos aos filtros avançados
         */
        attachFilterEvents() {
            // Eventos para filtros avançados
            const timeFilter = document.getElementById('time-filter');
            const sizeFilter = document.getElementById('size-filter');
            const typeFilter = document.getElementById('type-filter');

            if (timeFilter) {
                timeFilter.addEventListener('change', (e) => {
                    this.setTimeFilter(e.target.value);
                });
            }

            if (sizeFilter) {
                sizeFilter.addEventListener('change', (e) => {
                    this.setSizeFilter(e.target.value);
                });
            }

            if (typeFilter) {
                typeFilter.addEventListener('change', (e) => {
                    this.setTypeFilter(e.target.value);
                });
            }
        }

        /**
         * Define filtro temporal
         */
        setTimeFilter(value) {
            Object.keys(this.filters.timeRange).forEach(key => {
                this.filters.timeRange[key].active = (key === value);
            });
            this.applyCurrentFilters();
        }

        /**
         * Define filtro de tamanho
         */
        setSizeFilter(value) {
            Object.keys(this.filters.size).forEach(key => {
                this.filters.size[key].active = (key === value);
            });
            this.applyCurrentFilters();
        }

        /**
         * Define filtro de tipo
         */
        setTypeFilter(value) {
            Object.keys(this.filters.fileType).forEach(key => {
                this.filters.fileType[key].active = (key === value);
            });
            this.applyCurrentFilters();
        }

        /**
         * Aplica filtros atuais
         */
        applyCurrentFilters() {
            const files = AppState.get('files') || [];
            
            // Inicia progresso se houver muitos arquivos
            if (files.length > 100) {
                EventBus.emit(Events.PROGRESS_START, {
                    type: 'filter',
                    title: 'Aplicando filtros...',
                    details: `Processando ${files.length} arquivos`,
                    indeterminate: true
                });
            }
            
            const filteredFiles = this.filterFiles(files);
            
            console.log(`Aplicando filtros: ${files.length} arquivos → ${filteredFiles.length} filtrados`);
            
            // Finaliza progresso
            if (files.length > 100) {
                EventBus.emit(Events.PROGRESS_END, {
                    type: 'filter',
                    title: 'Filtros aplicados!',
                    details: `${filteredFiles.length} arquivos encontrados`
                });
            }
            
            // Emite evento com arquivos filtrados
            EventBus.emit(Events.FILES_FILTERED, {
                originalFiles: files,
                filteredFiles: filteredFiles,
                filters: this.getActiveFilters()
            });
        }

        /**
         * Renderiza filtros de relevância
         */
        renderRelevanceFilters() {
            return Object.entries(this.filters.relevance).map(([key, filter]) => {
                const labels = {
                    all: 'Todos',
                    alta: 'Alta Relevância (≥70%)',
                    media: 'Média Relevância (50-69%)',
                    baixa: 'Baixa Relevância (<30%)'
                };
                
                return `
                    <button class="filter-btn ${filter.active ? 'active' : ''}" 
                            data-filter="relevance" data-value="${key}">
                        ${labels[key]}
                        <span class="filter-count">${filter.count}</span>
                    </button>
                `;
            }).join('');
        }

        /**
         * Renderiza filtros de status
         */
        renderStatusFilters() {
            return Object.entries(this.filters.status).map(([key, filter]) => {
                const labels = {
                    todos: 'Todos',
                    pendente: 'Pendente Análise',
                    analisados: 'Já Analisados',
                    arquivados: 'Arquivados'
                };
                
                return `
                    <button class="filter-btn ${filter.active ? 'active' : ''}"
                            data-filter="status" data-value="${key}">
                        ${labels[key]}
                        <span class="filter-count">${filter.count}</span>
                    </button>
                `;
            }).join('');
        }

        /**
         * Renderiza filtros temporais
         */
        renderTimeFilters() {
            return Object.entries(this.filters.timeRange).map(([key, filter]) => {
                const labels = {
                    all: 'Todos os Períodos',
                    '1m': 'Último Mês',
                    '3m': 'Últimos 3 Meses',
                    '6m': 'Últimos 6 Meses',
                    '1y': 'Último Ano',
                    '2y': 'Últimos 2 Anos'
                };
                
                return `
                    <button class="filter-btn ${filter.active ? 'active' : ''}"
                            data-filter="timeRange" data-value="${key}">
                        ${labels[key]}
                        <span class="filter-count">${filter.count}</span>
                    </button>
                `;
            }).join('');
        }

        /**
         * Renderiza filtros de tamanho
         */
        renderSizeFilters() {
            return Object.entries(this.filters.size).map(([key, filter]) => {
                const labels = {
                    all: 'Todos os Tamanhos',
                    small: 'Pequenos (<50KB)',
                    medium: 'Médios (50-500KB)',
                    large: 'Grandes (>500KB)'
                };
                
                return `
                    <button class="filter-btn ${filter.active ? 'active' : ''}"
                            data-filter="size" data-value="${key}">
                        ${labels[key]}
                        <span class="filter-count">${filter.count}</span>
                    </button>
                `;
            }).join('');
        }

        /**
         * Renderiza filtros de tipo
         */
        renderTypeFilters() {
            return Object.entries(this.filters.fileType).map(([key, filter]) => {
                const labels = {
                    all: 'Todos os Tipos',
                    md: 'Markdown (.md)',
                    txt: 'Texto (.txt)',
                    docx: 'Word (.docx)',
                    pdf: 'PDF (.pdf)'
                };
                
                return `
                    <button class="filter-btn ${filter.active ? 'active' : ''}"
                            data-filter="fileType" data-value="${key}">
                        ${labels[key]}
                        <span class="filter-count">${filter.count}</span>
                    </button>
                `;
            }).join('');
        }


        /**
         * Ativa/desativa um filtro específico
         */
        toggleFilter(filterType, filterValue) {
            if (!this.filters[filterType] || !this.filters[filterType][filterValue]) {
                console.warn(`FilterManager: Filtro inválido ${filterType}.${filterValue}`);
                return;
            }

            // Desativa outros filtros do mesmo tipo (exclusive)
            Object.keys(this.filters[filterType]).forEach(key => {
                this.filters[filterType][key].active = (key === filterValue);
            });

            // Atualiza interface
            this.updateFilterButtons(filterType);
            
            // Aplica filtros automaticamente
            this.applyFilters();
            
            // Salva estado
            this.saveFiltersState();

            console.log(`FilterManager: Filtro ${filterType}.${filterValue} ativado`);
        }

        /**
         * Atualiza aparência dos botões de filtro
         */
        updateFilterButtons(filterType) {
            const container = document.querySelector(`.${filterType}-filters`);
            if (!container) return;

            container.querySelectorAll('.filter-btn').forEach((btn, index) => {
                const filterValue = btn.dataset.value;
                const isActive = this.filters[filterType][filterValue].active;
                
                btn.classList.toggle('active', isActive);
            });
        }

        /**
         * Aplica todos os filtros ativos
         */
        applyFilters() {
            const allFiles = AppState.get('files') || [];
            if (allFiles.length === 0) {
                console.log('FilterManager: Nenhum arquivo para filtrar');
                return [];
            }

            let filteredFiles = [...allFiles];

            // Aplica filtro de relevância
            filteredFiles = this.applyRelevanceFilter(filteredFiles);
            
            // Aplica filtro de status
            filteredFiles = this.applyStatusFilter(filteredFiles);
            
            // Aplica filtro temporal
            filteredFiles = this.applyTimeFilter(filteredFiles);
            
            // Aplica filtro de tamanho
            filteredFiles = this.applySizeFilter(filteredFiles);
            
            // Aplica filtro de tipo
            filteredFiles = this.applyTypeFilter(filteredFiles);

            // REFATORADO: Emite apenas FILES_FILTERED (Single Source of Truth)
            EventBus.emit(Events.FILES_FILTERED, {
                originalFiles: allFiles,
                filteredFiles: filteredFiles,
                filters: this.getActiveFilters()
            });

            console.log(`FilterManager: ${filteredFiles.length} arquivos após filtros`);
            return filteredFiles;
        }

        /**
         * Aplica filtro de relevância
         */
        applyRelevanceFilter(files) {
            const activeFilter = Object.entries(this.filters.relevance)
                .find(([key, filter]) => filter.active);

            if (!activeFilter || activeFilter[0] === 'all') {
                return files;
            }

            const threshold = activeFilter[1].threshold;
            return files.filter(file => {
                const relevance = this.calculateRelevance(file);
                
                switch (activeFilter[0]) {
                    case 'alta':
                        return relevance >= 70;
                    case 'media':
                        return relevance >= 50 && relevance < 70;
                    case 'baixa':
                        return relevance < 50; // CORRIGIDO: Inclui TODOS abaixo de 50%
                    default:
                        return true;
                }
            });
        }

        /**
         * Aplica filtro de status
         */
        applyStatusFilter(files) {
            const activeFilter = Object.entries(this.filters.status)
                .find(([key, filter]) => filter.active);

            if (!activeFilter || activeFilter[0] === 'todos') {
                return files;
            }

            return files.filter(file => {
                switch (activeFilter[0]) {
                    case 'pendente':
                        return !file.analyzed && !file.archived;
                    case 'analisados':
                        return file.analyzed && !file.archived;
                    case 'arquivados':
                        return file.archived;
                    default:
                        return true;
                }
            });
        }

        /**
         * Aplica filtro temporal
         */
        applyTimeFilter(files) {
            const activeFilter = Object.entries(this.filters.timeRange)
                .find(([key, filter]) => filter.active);

            if (!activeFilter || activeFilter[0] === 'all') {
                return files;
            }

            const months = activeFilter[1].months;
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - months);

            return files.filter(file => {
                const fileDate = new Date(file.lastModified || file.dateCreated || 0);
                return fileDate >= cutoffDate;
            });
        }

        /**
         * Aplica filtro de tamanho
         */
        applySizeFilter(files) {
            const activeFilter = Object.entries(this.filters.size)
                .find(([key, filter]) => filter.active);

            if (!activeFilter || activeFilter[0] === 'all') {
                return files;
            }

            const { min, max } = activeFilter[1];
            return files.filter(file => {
                const size = file.size || 0;
                return size >= min && size < max;
            });
        }

        /**
         * Aplica filtro de tipo
         */
        applyTypeFilter(files) {
            const activeFilter = Object.entries(this.filters.fileType)
                .find(([key, filter]) => filter.active);

            if (!activeFilter || activeFilter[0] === 'all') {
                return files;
            }

            const extensions = activeFilter[1].extensions;
            return files.filter(file => {
                const fileName = file.name || '';
                return extensions.some(ext => fileName.toLowerCase().endsWith(ext));
            });
        }

        /**
         * Calcula relevância de um arquivo
         */
        calculateRelevance(file) {
            // Se já tem score calculado, usa
            if (file.relevanceScore !== undefined) {
                return Math.round(file.relevanceScore * 100);
            }

            // Cálculo básico baseado no nome e palavras-chave
            let score = 30; // Base
            
            const fileName = (file.name || '').toLowerCase();
            const content = (file.content || '').toLowerCase();
            
            // Keywords do PRD
            const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
            const userKeywords = this.semanticKeywords || [];
            const allKeywords = [...keywords, ...userKeywords];
            
            // Pontuação por keywords no nome
            allKeywords.forEach(keyword => {
                if (fileName.includes(keyword.toLowerCase())) {
                    score += 15;
                }
            });
            
            // Pontuação por keywords no conteúdo (preview)
            allKeywords.forEach(keyword => {
                if (content.includes(keyword.toLowerCase())) {
                    score += 10;
                }
            });
            
            // Pontuação por tamanho (arquivos maiores podem ter mais conteúdo)
            if (file.size > 5120) score += 5; // >5KB
            if (file.size > 51200) score += 10; // >50KB
            
            return Math.min(Math.max(score, 0), 100);
        }

        /**
         * Atualiza contadores de todos os filtros
         */
        updateAllCounts(files) {
            if (!files || files.length === 0) {
                this.clearAllCounts();
                return;
            }

            // Atualiza contadores de relevância - INCLUINDO < 30%
            this.filters.relevance.all.count = files.length;
            this.filters.relevance.alta.count = files.filter(f => this.calculateRelevance(f) >= 70).length;
            this.filters.relevance.media.count = files.filter(f => {
                const rel = this.calculateRelevance(f);
                return rel >= 50 && rel < 70;
            }).length;
            this.filters.relevance.baixa.count = files.filter(f => {
                const rel = this.calculateRelevance(f);
                return rel < 50; // CORRIGIDO: Inclui TODOS abaixo de 50%, inclusive < 30%
            }).length;

            // Atualiza contadores de status
            this.filters.status.todos.count = files.length;
            this.filters.status.pendente.count = files.filter(f => !f.analyzed && !f.archived).length;
            this.filters.status.analisados.count = files.filter(f => f.analyzed && !f.archived).length;
            this.filters.status.arquivados.count = files.filter(f => f.archived).length;

            // Atualiza contadores temporais
            this.updateTimeCounts(files);
            
            // Atualiza contadores de tamanho
            this.updateSizeCounts(files);
            
            // Atualiza contadores de tipo
            this.updateTypeCounts(files);

            // Atualiza interface
            this.updateCountDisplay();
        }

        /**
         * Atualiza contadores temporais
         */
        updateTimeCounts(files) {
            Object.entries(this.filters.timeRange).forEach(([key, filter]) => {
                if (key === 'all') {
                    filter.count = files.length;
                    return;
                }

                const months = filter.months;
                const cutoffDate = new Date();
                cutoffDate.setMonth(cutoffDate.getMonth() - months);

                filter.count = files.filter(file => {
                    const fileDate = new Date(file.lastModified || file.dateCreated || 0);
                    return fileDate >= cutoffDate;
                }).length;
            });
        }

        /**
         * Atualiza contadores de tamanho
         */
        updateSizeCounts(files) {
            Object.entries(this.filters.size).forEach(([key, filter]) => {
                if (key === 'all') {
                    filter.count = files.length;
                    return;
                }

                const { min, max } = filter;
                filter.count = files.filter(file => {
                    const size = file.size || 0;
                    return size >= min && size < max;
                }).length;
            });
        }

        /**
         * Atualiza contadores de tipo
         */
        updateTypeCounts(files) {
            Object.entries(this.filters.fileType).forEach(([key, filter]) => {
                if (key === 'all') {
                    filter.count = files.length;
                    return;
                }

                const extensions = filter.extensions;
                filter.count = files.filter(file => {
                    const fileName = file.name || '';
                    return extensions.some(ext => fileName.toLowerCase().endsWith(ext));
                }).length;
            });
        }

        /**
         * Atualiza exibição dos contadores na interface
         */
        updateCountDisplay() {
            document.querySelectorAll('.filter-count').forEach(countElement => {
                const btn = countElement.closest('.filter-btn');
                if (!btn) return;

                const filterType = btn.dataset.filter;
                const filterValue = btn.dataset.value;

                if (this.filters[filterType] && this.filters[filterType][filterValue]) {
                    countElement.textContent = this.filters[filterType][filterValue].count;
                }
            });
            
            // Atualiza contadores da barra de filtros rápidos também
            if (KC.updateQuickFilterCounters) {
                KC.updateQuickFilterCounters();
            }
        }

        /**
         * Limpa contadores
         */
        clearAllCounts() {
            Object.values(this.filters).forEach(filterGroup => {
                Object.values(filterGroup).forEach(filter => {
                    filter.count = 0;
                });
            });
            this.updateCountDisplay();
        }

        /**
         * Limpa todos os filtros
         */
        clearAllFilters() {
            Object.values(this.filters).forEach(filterGroup => {
                Object.entries(filterGroup).forEach(([key, filter]) => {
                    filter.active = (key === 'all' || key === 'todos');
                });
            });

            this.renderFilterControls();
            this.applyFilters();
            this.saveFiltersState();
        }

        /**
         * Obtém filtros ativos
         */
        getActiveFilters() {
            const active = {};
            
            Object.entries(this.filters).forEach(([groupName, group]) => {
                const activeFilter = Object.entries(group).find(([key, filter]) => filter.active);
                if (activeFilter) {
                    active[groupName] = activeFilter[0];
                }
            });
            
            return active;
        }

        /**
         * Obtém configuração completa dos filtros (para exportação)
         */
        getConfig() {
            return {
                filters: this.filters,
                activeFilters: this.getActiveFilters(),
                currentSort: this.currentSort,
                keywords: this.keywords || []
            };
        }

        /**
         * Define configuração semântica
         */
        setSemanticConfig(config) {
            this.semanticConfig = config;
            this.semanticKeywords = config.keywords || [];
            this.algorithm = config.algorithm || 'linear';
            
            // Recalcula relevância de todos os arquivos
            const files = AppState.get('files') || [];
            if (files.length > 0) {
                this.updateAllCounts(files);
                this.applyFilters();
            }
        }

        /**
         * Salva estado dos filtros
         */
        saveFiltersState() {
            AppState.set('filters', {
                active: this.getActiveFilters(),
                semantic: this.semanticConfig
            });
        }

        /**
         * Carrega filtros salvos
         */
        loadSavedFilters() {
            // AIDEV-NOTE: load-filters-optional; only load if explicitly saved
            const saved = AppState.get('filters');
            if (!saved || !saved.active) return;

            // Restaura filtros ativos
            Object.entries(saved.active).forEach(([filterType, filterValue]) => {
                if (this.filters[filterType] && this.filters[filterType][filterValue]) {
                    Object.keys(this.filters[filterType]).forEach(key => {
                        this.filters[filterType][key].active = (key === filterValue);
                    });
                }
            });

            // Restaura configuração semântica
            if (saved.semantic) {
                this.setSemanticConfig(saved.semantic);
            }
        }

        /**
         * Aplica filtros a um conjunto específico de arquivos
         */
        applyFiltersToFiles(files) {
            if (!files || files.length === 0) {
                console.log('FilterManager: Nenhum arquivo para filtrar');
                return [];
            }

            let filteredFiles = [...files];

            // Aplica filtro de relevância
            filteredFiles = this.applyRelevanceFilter(filteredFiles);
            
            // Aplica filtro de status
            filteredFiles = this.applyStatusFilter(filteredFiles);
            
            // Aplica filtro temporal
            filteredFiles = this.applyTimeFilter(filteredFiles);
            
            // Aplica filtro de tamanho
            filteredFiles = this.applySizeFilter(filteredFiles);
            
            // Aplica filtro de tipo
            filteredFiles = this.applyTypeFilter(filteredFiles);

            console.log(`FilterManager: ${files.length} → ${filteredFiles.length} arquivos após filtros`);
            return filteredFiles;
        }

        /**
         * NOVO: Método central para refinar dados (Single Source of Truth)
         */
        refineData() {
            console.log('🔍 FilterManager: Refinando dados...');
            
            // Obtém configuração semântica atual
            const semanticConfig = AppState.get('configuration.preAnalysis') || {};
            
            // Emite evento de início para feedback visual
            EventBus.emit(Events.PROGRESS_START, {
                type: 'refine',
                title: 'Refinando dados...',
                details: 'Aplicando filtros semânticos e quantitativos'
            });
            
            // Aplica todos os filtros configurados
            this.applyCurrentFilters();
            
            // Emite evento de conclusão
            setTimeout(() => {
                EventBus.emit(Events.PROGRESS_END, {
                    type: 'refine',
                    title: 'Dados refinados!',
                    details: `${this.filteredFiles?.length || 0} arquivos selecionados`
                });
                
                // Atualiza estatísticas
                this.updateAllCounts(AppState.get('files') || []);
                this.updateCountDisplay();
            }, 500);
            
            console.log('✅ Refinamento concluído');
        }

        /**
         * Métodos auxiliares que podem estar faltando
         */
        filterFiles(files) {
            // CORREÇÃO: Passa os arquivos para o método applyFilters
            return this.applyFiltersToFiles(files);
        }


        updateCountDisplay() {
            // Atualiza badges das abas
            const allBadge = document.getElementById('badge-all');
            const highBadge = document.getElementById('badge-high');
            const mediumBadge = document.getElementById('badge-medium');
            const pendingBadge = document.getElementById('badge-pending');
            const analyzedBadge = document.getElementById('badge-analyzed');

            if (allBadge) allBadge.textContent = this.filters.status.todos.count;
            if (highBadge) highBadge.textContent = this.filters.relevance.alta.count;
            if (mediumBadge) mediumBadge.textContent = this.filters.relevance.media.count;
            if (pendingBadge) pendingBadge.textContent = this.filters.status.pendente.count;
            if (analyzedBadge) analyzedBadge.textContent = this.filters.status.analisados.count;
            
            // Atualiza contadores da barra de filtros rápidos também
            if (KC.updateQuickFilterCounters) {
                KC.updateQuickFilterCounters();
            }
        }

        clearAllCounts() {
            Object.values(this.filters).forEach(filterGroup => {
                Object.values(filterGroup).forEach(filter => {
                    filter.count = 0;
                });
            });
            this.updateCountDisplay();
        }

        updateTimeCounts(files) {
            const now = new Date();
            Object.entries(this.filters.timeRange).forEach(([key, filter]) => {
                if (key === 'all') {
                    filter.count = files.length;
                } else if (filter.months) {
                    const cutoff = new Date(now.getTime() - (filter.months * 30 * 24 * 60 * 60 * 1000));
                    filter.count = files.filter(f => new Date(f.dateModified || f.dateCreated) > cutoff).length;
                }
            });
        }

        updateSizeCounts(files) {
            Object.entries(this.filters.size).forEach(([key, filter]) => {
                if (key === 'all') {
                    filter.count = files.length;
                } else {
                    filter.count = files.filter(f => {
                        const size = f.size || 0;
                        return size >= filter.min && size < filter.max;
                    }).length;
                }
            });
        }

        updateTypeCounts(files) {
            Object.entries(this.filters.fileType).forEach(([key, filter]) => {
                if (key === 'all') {
                    filter.count = files.length;
                } else {
                    filter.count = files.filter(f => {
                        const fileName = f.name || '';
                        return filter.extensions.some(ext => fileName.toLowerCase().endsWith(ext));
                    }).length;
                }
            });
        }

        saveFiltersState() {
            AppState.set('filters', {
                active: this.getActiveFilters(),
                semantic: {
                    keywords: this.semanticKeywords,
                    algorithm: this.algorithm,
                    config: this.semanticConfig
                }
            });
        }

        setSemanticConfig(config) {
            this.semanticConfig = config;
            this.semanticKeywords = config.keywords || [];
            this.algorithm = config.algorithm || 'linear';
        }

        clearAllFilters() {
            // Reset all filters to default
            Object.values(this.filters).forEach(filterGroup => {
                Object.entries(filterGroup).forEach(([key, filter]) => {
                    filter.active = (key === 'all' || key === 'todos');
                });
            });
            this.applyCurrentFilters();
            this.updateCountDisplay();
        }

        /**
         * Obtém estatísticas dos filtros
         */
        getStats() {
            return {
                filters: this.filters,
                active: this.getActiveFilters(),
                semantic: {
                    keywords: this.semanticKeywords,
                    algorithm: this.algorithm,
                    config: this.semanticConfig
                },
                performance: {
                    lastCalculation: this.lastCalculation,
                    cacheSize: this.cache.size
                }
            };
        }
    }

    // Registra no namespace global
    KC.FilterManager = new FilterManager();

    // Expõe métodos públicos
    KC.FilterManager.clearAllFilters = KC.FilterManager.clearAllFilters.bind(KC.FilterManager);
    KC.FilterManager.applyFilters = KC.FilterManager.applyFilters.bind(KC.FilterManager);

})(window);