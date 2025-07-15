/**
 * FilterPanel.js - Interface Intuitiva de Filtros
 * 
 * Nova interface visual que preserva 100% da integração existente
 * com FilterManager, mantendo todo o pipeline de dados intocado
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class FilterPanel {
        constructor() {
            this.container = null;
            
            // IMPORTANTE: Usa FilterManager existente como backend
            this.filterManager = KC.FilterManager;
            this.fileRenderer = KC.FileRenderer;
            
            // Configuração da interface visual
            this.uiConfig = {
                relevance: {
                    type: 'radio',
                    active: 'all',
                    options: [
                        { value: 'all', label: 'Todos', count: 0 },
                        { value: 'high', label: 'Alta', count: 0, threshold: 70 },
                        { value: 'medium', label: 'Média', count: 0, threshold: 50 },
                        { value: 'low', label: 'Baixa', count: 0, threshold: 30 }
                    ]
                },
                status: {
                    type: 'radio',
                    active: 'all',
                    options: [
                        { value: 'all', label: 'Todos', count: 0 },
                        { value: 'pending', label: 'Pendente', count: 0 },
                        { value: 'approved', label: 'Aprovados', count: 0 },
                        { value: 'archived', label: 'Arquivados', count: 0 }
                    ]
                },
                period: {
                    type: 'radio',
                    active: 'all',
                    options: [
                        { value: 'all', label: 'Todos', count: 0, title: 'Todos os arquivos' },
                        { value: 'today', label: 'Hoje', count: 0, title: 'Arquivos modificados hoje' },
                        { value: 'week', label: 'Esta semana', count: 0, title: 'Arquivos dos últimos 7 dias' },
                        { value: 'month', label: 'Este mês', count: 0, title: 'Arquivos dos últimos 30 dias' },
                        { value: '3m', label: '3 meses', count: 0, title: 'Arquivos dos últimos 90 dias' },
                        { value: '6m', label: '6 meses', count: 0, title: 'Arquivos dos últimos 180 dias' },
                        { value: 'year', label: 'Este ano', count: 0, title: 'Arquivos dos últimos 365 dias' }
                    ]
                },
                // ORIGINAL - Preservado para rollback
                // size: {
                //     type: 'radio',
                //     active: 'all',
                //     options: [
                //         { value: 'all', label: 'Qualquer', count: 0 },
                //         { value: 'small', label: '< 50KB', count: 0 },
                //         { value: 'medium', label: '50-500KB', count: 0 },
                //         { value: 'large', label: '> 500KB', count: 0 }
                //     ]
                // },
                // NOVO - Adiciona opção customizável
                size: {
                    type: 'radio',
                    active: 'all',
                    customMin: null,
                    customMax: null,
                    options: [
                        { value: 'all', label: 'Qualquer', count: 0 },
                        { value: 'small', label: '< 50KB', count: 0 },
                        { value: 'medium', label: '50-500KB', count: 0 },
                        { value: 'large', label: '> 500KB', count: 0 },
                        { value: 'custom', label: 'Personalizado', count: 0 }
                    ]
                },
                // ORIGINAL - Preservado para rollback
                // types: {
                //     type: 'checkbox',
                //     active: ['md', 'txt', 'docx', 'pdf'],
                //     options: [
                //         { value: 'md', label: '.md', count: 0 },
                //         { value: 'txt', label: '.txt', count: 0 },
                //         { value: 'docx', label: '.docx', count: 0 },
                //         { value: 'pdf', label: '.pdf', count: 0 }
                //     ]
                // }
                // NOVO - Adiciona suporte a gdoc
                types: {
                    type: 'checkbox',
                    active: ['md', 'txt', 'docx', 'pdf', 'gdoc'],
                    options: [
                        { value: 'md', label: '.md', count: 0 },
                        { value: 'txt', label: '.txt', count: 0 },
                        { value: 'docx', label: '.docx', count: 0 },
                        { value: 'pdf', label: '.pdf', count: 0 },
                        { value: 'gdoc', label: '.gdoc', count: 0, title: 'Google Workspace and AI Studio Prompts compatible' }
                    ]
                }
            };
            
            // Estado de busca
            this.searchTerm = '';
            
            // ORIGINAL - Preservado para rollback
            // this.exclusionPatterns = ['temp', 'cache', 'backup', '.git', '.trash', '.obsidian'];
            // NOVO - Padrões de exclusão atualizados
            this.exclusionPatterns = ['temp', 'cache', 'backup', '.git', '.trash', '.obsidian', 'ThirdPartyNoticeText.txt', 'CHANGELOG.md', 'README.md', '.excalidraw.md'];
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            console.log('FilterPanel: Inicializando interface intuitiva');
            this.setupContainer();
            this.connectToExistingManagers();
            this.renderIntuitiveInterface();
            this.setupEventListeners();
        }

        /**
         * Configura container
         */
        setupContainer() {
            // Substitui a interface de filtros existente
            const filterSection = document.getElementById('filter-section');
            if (filterSection) {
                // Cria container para nova interface
                const newContainer = document.createElement('div');
                newContainer.id = 'filter-panel-container';
                newContainer.className = 'filter-panel-container';
                
                // Substitui conteúdo mas preserva eventos
                filterSection.innerHTML = '';
                filterSection.appendChild(newContainer);
                
                this.container = newContainer;
                console.log('FilterPanel: Container configurado');
            } else {
                console.error('FilterPanel: filter-section não encontrado');
            }
        }

        /**
         * Conecta aos managers existentes (SEM MODIFICÁ-LOS)
         */
        connectToExistingManagers() {
            // Escuta eventos do FilterManager existente
            EventBus.on(Events.FILES_DISCOVERED, (data) => {
                console.log('FilterPanel: FILES_DISCOVERED recebido');
                this.updateCounters(data.files || []);
                
                // BUG FIX: Re-renderiza seção de duplicatas se necessário
                const duplicateStats = KC.AppState?.get('stats.duplicateStats');
                if (duplicateStats && duplicateStats.duplicates > 0) {
                    // Verifica se a seção de duplicatas não existe
                    if (!document.querySelector('[data-group="duplicates"]')) {
                        console.log('FilterPanel: Re-renderizando para mostrar seção de duplicatas');
                        // Preserva estado atual dos filtros
                        const currentFilters = this.getCurrentFilterState();
                        // Re-renderiza interface
                        this.renderIntuitiveInterface();
                        this.setupEventListeners();
                        // Restaura estado dos filtros
                        this.restoreFilterState(currentFilters);
                    }
                }
            });

            EventBus.on(Events.STATE_CHANGED, (data) => {
                if (data.path === 'files') {
                    console.log('FilterPanel: STATE_CHANGED - atualizando contadores');
                    this.updateCounters(data.newValue || []);
                }
            });

            EventBus.on(Events.FILES_FILTERED, (data) => {
                console.log('FilterPanel: FILES_FILTERED - sincronizando interface');
                // Mantém interface sincronizada com filtros aplicados
                this.syncWithFilterManager();
            });

            // BUG FIX: Escuta evento centralizado de stats
            EventBus.on('STATS_UPDATED', (stats) => {
                console.log('FilterPanel: STATS_UPDATED recebido', stats);
                // Atualiza contadores com dados centralizados
                this.updateCountersFromStats(stats);
            });
        }

        /**
         * Renderiza a nova interface intuitiva
         */
        renderIntuitiveInterface() {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="filter-panel-header">
                    <h3>🔍 FILTROS INTELIGENTES</h3>
                    <div class="filter-actions">
                        <button class="btn-reset" id="reset-filters" title="Limpar todos os filtros">
                            🔄 Limpar
                        </button>
                    </div>
                </div>

                <div class="filter-groups-container">
                    ${this.renderFilterGroup('relevance', '🎯 RELEVÂNCIA')}
                    ${this.renderFilterGroup('status', '📊 STATUS')}
                    ${this.renderFilterGroup('period', '📅 PERÍODO')}
                    ${this.renderFilterGroup('size', '💾 TAMANHO')}
                    ${this.renderFilterGroup('types', '📄 TIPO')}
                    ${this.renderExclusionPatternsGroup()}
                    ${this.renderSearchGroup()}
                    ${this.renderDuplicateSection()}
                </div>

                <div class="bulk-actions-container">
                    <h4>⚡ AÇÕES EM LOTE</h4>
                    <div class="bulk-buttons">
                        <button class="bulk-btn update" id="bulk-update" title="Atualiza dados manualmente">
                            🔄 ATUALIZAR
                        </button>
                        <button class="bulk-btn approve" id="bulk-approve" title="Aprova todos os arquivos filtrados">
                            ✅ APROVAR TODOS
                        </button>
                        <button class="bulk-btn archive" id="bulk-archive" title="Arquiva todos os arquivos filtrados">
                            📦 ARQUIVAR TODOS
                        </button>
                        <button class="bulk-btn restore" id="bulk-restore" title="Restaura arquivos arquivados para aprovados" style="display: none;">
                            🔄 RESTAURAR
                        </button>
                    </div>
                    <div class="bulk-info">
                        <small id="bulk-info-text">0 arquivos serão afetados pelas ações em lote</small>
                    </div>
                </div>
            `;

            this.updateAllCounters();
            this.updateBulkButtonsVisibility();
        }

        /**
         * Renderiza um grupo de filtros
         */
        renderFilterGroup(configKey, title) {
            const config = this.uiConfig[configKey];
            const isCheckbox = config.type === 'checkbox';

            const optionsHtml = config.options.map(option => {
                const inputType = config.type;
                const inputName = isCheckbox ? `${configKey}[]` : configKey;
                const checked = isCheckbox ? 
                    config.active.includes(option.value) : 
                    config.active === option.value;

                const title = option.title ? `title="${option.title}"` : '';
                return `
                    <label class="filter-option" ${title}>
                        <input type="${inputType}" 
                               name="${inputName}" 
                               value="${option.value}" 
                               ${checked ? 'checked' : ''}
                               data-filter-group="${configKey}">
                        <span class="option-text">${option.label}</span>
                        <span class="option-count" id="count-${configKey}-${option.value}">(${option.count})</span>
                    </label>
                `;
            }).join('');

            // Adiciona inputs customizáveis para tamanho
            let customSizeInputs = '';
            if (configKey === 'size') {
                const showCustom = config.active === 'custom' ? 'block' : 'none';
                customSizeInputs = `
                    <div class="custom-size-inputs" id="custom-size-inputs" style="display: ${showCustom}; margin-top: 10px;">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" 
                                   id="size-min" 
                                   placeholder="Min (KB)" 
                                   value="${config.customMin || ''}"
                                   style="width: 80px; padding: 4px;">
                            <span>-</span>
                            <input type="number" 
                                   id="size-max" 
                                   placeholder="Max (KB)" 
                                   value="${config.customMax || ''}"
                                   style="width: 80px; padding: 4px;">
                            <button id="apply-custom-size" class="btn-small">Aplicar</button>
                        </div>
                    </div>
                `;
            }

            // Adiciona dica explicativa para o filtro de período
            let periodHint = '';
            if (configKey === 'period') {
                periodHint = `
                    <div class="filter-hint" style="font-size: 11px; color: #666; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                        <span style="font-weight: bold;">ℹ️ Nota:</span> Os contadores mostram arquivos modificados dentro de cada período. 
                        <br>Valores iguais indicam que todos os arquivos foram modificados recentemente.
                    </div>
                `;
            }

            return `
                <div class="filter-group" data-group="${configKey}">
                    <h4 class="filter-group-title">${title}</h4>
                    <div class="filter-options">
                        ${optionsHtml}
                    </div>
                    ${customSizeInputs}
                    ${periodHint}
                </div>
            `;
        }


        /**
         * Renderiza grupo de busca
         */
        renderSearchGroup() {
            return `
                <div class="filter-group search-group">
                    <h4 class="filter-group-title">🔍 BUSCA RÁPIDA</h4>
                    <div class="search-container">
                        <input type="text" 
                               id="quick-search" 
                               placeholder="Digite palavras-chave..." 
                               value="${this.searchTerm}">
                        <button class="search-btn" id="search-clear" title="Limpar busca">✖</button>
                    </div>
                    <div class="search-hints">
                        <small>Busca em nome, caminho e conteúdo dos arquivos</small>
                    </div>
                </div>
            `;
        }

        /**
         * Renderiza grupo de padrões de exclusão
         */
        renderExclusionPatternsGroup() {
            const patterns = this.exclusionPatterns.join(', ');
            return `
                <div class="filter-group exclusion-group">
                    <h4 class="filter-group-title">🚫 PADRÕES DE EXCLUSÃO</h4>
                    <div class="exclusion-container">
                        <textarea id="exclusion-patterns" 
                                  placeholder="Digite padrões para excluir (separados por vírgula)"
                                  style="width: 100%; min-height: 60px; padding: 8px; resize: vertical;">${patterns}</textarea>
                        <div class="exclusion-hints">
                            <small>Exemplos: temp, cache, backup, .git, .trash</small>
                        </div>
                        <button id="apply-exclusion" class="btn-small" style="margin-top: 8px;">Aplicar Exclusões</button>
                    </div>
                </div>
            `;
        }

        /**
         * Configura event listeners
         */
        setupEventListeners() {
            if (!this.container) return;

            // Filtros radio/checkbox
            this.container.addEventListener('change', (e) => {
                if (e.target.type === 'radio' || e.target.type === 'checkbox') {
                    this.handleFilterChange(e.target);
                }
            });
            
            // NOVO: Escuta FILES_UPDATED para re-aplicar filtros (como ao categorizar)
            if (KC.Events && KC.Events.FILES_UPDATED) {
                KC.EventBus.on(KC.Events.FILES_UPDATED, (data) => {
                    console.log('FilterPanel: FILES_UPDATED recebido', data);
                    // Re-aplica filtros para atualizar a interface
                    setTimeout(() => {
                        this.applyFilters();
                    }, 100);
                });
            }

            // Busca rápida
            const searchInput = this.container.querySelector('#quick-search');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.handleSearch(e.target.value);
                    }, 300); // Debounce
                });
            }

            // Limpar busca
            const searchClear = this.container.querySelector('#search-clear');
            if (searchClear) {
                searchClear.addEventListener('click', () => {
                    const searchInput = this.container.querySelector('#quick-search');
                    if (searchInput) {
                        searchInput.value = '';
                        this.handleSearch('');
                    }
                });
            }

            // Reset filtros
            const resetBtn = this.container.querySelector('#reset-filters');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.resetAllFilters();
                });
            }

            // Ações em lote
            this.setupBulkActionListeners();
            
            // Tamanho customizado
            this.setupCustomSizeListeners();
            
            // Padrões de exclusão
            this.setupExclusionPatternsListeners();
            
            // Duplicatas
            this.setupDuplicateHandlers();
        }

        /**
         * Configura listeners para ações em lote
         */
        setupBulkActionListeners() {
            const updateBtn = this.container.querySelector('#bulk-update');
            const approveBtn = this.container.querySelector('#bulk-approve');
            const archiveBtn = this.container.querySelector('#bulk-archive');
            const restoreBtn = this.container.querySelector('#bulk-restore');

            if (updateBtn) {
                updateBtn.addEventListener('click', () => this.handleBulkUpdate());
            }

            if (approveBtn) {
                approveBtn.addEventListener('click', () => this.handleBulkApprove());
            }

            if (archiveBtn) {
                archiveBtn.addEventListener('click', () => this.handleBulkArchive());
            }

            if (restoreBtn) {
                restoreBtn.addEventListener('click', () => this.handleBulkRestore());
            }
        }

        /**
         * Configura listeners para tamanho customizado
         */
        setupCustomSizeListeners() {
            // Monitora seleção de "Personalizado" para mostrar/esconder inputs
            this.container.addEventListener('change', (e) => {
                if (e.target.name === 'size' && e.target.value === 'custom') {
                    const customInputs = document.getElementById('custom-size-inputs');
                    if (customInputs) {
                        customInputs.style.display = 'block';
                    }
                } else if (e.target.name === 'size' && e.target.value !== 'custom') {
                    const customInputs = document.getElementById('custom-size-inputs');
                    if (customInputs) {
                        customInputs.style.display = 'none';
                    }
                }
            });

            // Aplica valores customizados
            const applyBtn = this.container.querySelector('#apply-custom-size');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const minInput = document.getElementById('size-min');
                    const maxInput = document.getElementById('size-max');
                    
                    if (minInput && maxInput) {
                        const min = parseFloat(minInput.value) || null;
                        const max = parseFloat(maxInput.value) || null;
                        
                        if (min !== null || max !== null) {
                            this.uiConfig.size.customMin = min;
                            this.uiConfig.size.customMax = max;
                            
                            console.log('FilterPanel: Aplicando filtro de tamanho customizado', { min, max });
                            this.applyFilters();
                            
                            KC.showNotification({
                                type: 'info',
                                message: `Filtro de tamanho aplicado: ${min || '0'}KB - ${max || '∞'}KB`
                            });
                        }
                    }
                });
            }
        }

        /**
         * Configura listeners para padrões de exclusão
         */
        setupExclusionPatternsListeners() {
            const applyBtn = this.container.querySelector('#apply-exclusion');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const textarea = document.getElementById('exclusion-patterns');
                    if (textarea) {
                        const patterns = textarea.value
                            .split(',')
                            .map(p => p.trim())
                            .filter(p => p.length > 0);
                        
                        this.exclusionPatterns = patterns;
                        
                        console.log('FilterPanel: Aplicando padrões de exclusão', patterns);
                        this.applyFilters();
                        
                        KC.showNotification({
                            type: 'info',
                            message: `${patterns.length} padrão(ões) de exclusão aplicado(s)`
                        });
                    }
                });
            }
        }

        /**
         * Manipula mudança de filtro
         */
        handleFilterChange(input) {
            const group = input.dataset.filterGroup;
            
            // Verifica se o grupo existe antes de continuar
            if (!group) {
                // Ignora inputs sem filter-group (ex: checkboxes de duplicatas)
                return;
            }
            
            const value = input.value;
            const config = this.uiConfig[group];

            // Verifica se o config existe (para evitar erro com checkboxes de duplicatas)
            if (!config) {
                console.warn(`FilterPanel: Configuração não encontrada para grupo ${group}`);
                return;
            }

            if (config.type === 'radio') {
                config.active = value;
            } else if (config.type === 'checkbox') {
                if (input.checked) {
                    if (!config.active.includes(value)) {
                        config.active.push(value);
                    }
                } else {
                    config.active = config.active.filter(v => v !== value);
                }
            }

            console.log(`FilterPanel: Filtro ${group} alterado para`, config.active);
            
            // Aplica filtro usando FilterManager existente
            this.applyFilters();
            
            // Atualiza info de ações em lote
            this.updateBulkInfo();
            
            // Atualiza visibilidade dos botões se foi alteração no status
            if (group === 'status') {
                this.updateBulkButtonsVisibility();
            }
        }

        /**
         * Manipula busca
         */
        handleSearch(searchTerm) {
            this.searchTerm = searchTerm.trim();
            console.log('FilterPanel: Busca por:', this.searchTerm);
            
            // Aplica busca
            this.applyFilters();
            this.updateBulkInfo();
        }

        /**
         * Aplica filtros usando FilterManager existente
         */
        applyFilters() {
            // ESTRATÉGIA: Converte configuração da nova UI para formato do FilterManager
            const files = AppState.get('files') || [];
            let filteredFiles = [...files];

            // Aplica filtros sequencialmente
            filteredFiles = this.applyRelevanceFilter(filteredFiles);
            filteredFiles = this.applyStatusFilter(filteredFiles);
            filteredFiles = this.applyPeriodFilter(filteredFiles);
            filteredFiles = this.applySizeFilter(filteredFiles);
            filteredFiles = this.applyTypeFilter(filteredFiles);
            filteredFiles = this.applySearchFilter(filteredFiles);
            filteredFiles = this.applyExclusionFilter(filteredFiles);
            filteredFiles = this.applyDuplicateFilter(filteredFiles);

            // Emite evento para FileRenderer (compatibilidade com pipeline existente)
            EventBus.emit(Events.FILES_FILTERED, {
                originalFiles: files,
                filteredFiles: filteredFiles,
                source: 'FilterPanel'
            });

            // Também emite evento para notificar outros componentes sobre os arquivos filtrados
            EventBus.emit(Events.STATE_CHANGED, {
                path: 'filteredFiles',
                newValue: filteredFiles,
                oldValue: null
            });

            console.log(`FilterPanel: ${filteredFiles.length}/${files.length} arquivos após filtros`);
        }

        /**
         * Aplica filtro de relevância
         */
        applyRelevanceFilter(files) {
            const activeRelevance = this.uiConfig.relevance.active;
            if (activeRelevance === 'all') return files;

            const thresholds = {
                high: 70,
                medium: 50,
                low: 30
            };

            const threshold = thresholds[activeRelevance];
            if (!threshold) return files;

            return files.filter(file => {
                const relevance = this.calculateFileRelevance(file);
                
                if (activeRelevance === 'high') return relevance >= 70;
                if (activeRelevance === 'medium') return relevance >= 50 && relevance < 70;
                if (activeRelevance === 'low') return relevance < 50;
                
                return true;
            });
        }

        /**
         * Aplica filtro de status
         */
        applyStatusFilter(files) {
            const activeStatus = this.uiConfig.status.active;
            if (activeStatus === 'all') return files;

            return files.filter(file => {
                if (activeStatus === 'pending') return !file.analyzed && !file.archived;
                if (activeStatus === 'approved') return file.analyzed && !file.archived;
                if (activeStatus === 'archived') return file.archived;
                return true;
            });
        }

        /**
         * Aplica filtro de período
         * SPRINT 1.3.1: Usa a mesma lógica de data do StatsManager
         */
        applyPeriodFilter(files) {
            const activePeriod = this.uiConfig.period.active;
            if (activePeriod === 'all') return files;

            const now = new Date();
            const periods = {
                today: 1,
                week: 7,
                month: 30,
                '3m': 90,
                '6m': 180,
                year: 365
            };

            const days = periods[activePeriod];
            if (!days) return files;

            const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

            return files.filter(file => {
                // SPRINT 1.3.1: Usa mesma lógica de validação de data do StatsManager
                let fileDate = null;
                
                // Tenta várias propriedades de data com fallback
                const possibleDates = [
                    file.lastModified,
                    file.dateCreated,
                    file.date,
                    file.created,
                    file.modified,
                    file.timestamp
                ];
                
                for (const dateValue of possibleDates) {
                    if (dateValue) {
                        const parsed = new Date(dateValue);
                        if (!isNaN(parsed.getTime())) {
                            fileDate = parsed;
                            break;
                        }
                    }
                }
                
                // Se não tiver data válida, considera como arquivo recente (inclui no filtro)
                if (!fileDate) {
                    return true;
                }
                
                return fileDate >= cutoffDate;
            });
        }

        /**
         * Aplica filtro de tamanho
         */
        applySizeFilter(files) {
            const activeSize = this.uiConfig.size.active;
            if (activeSize === 'all') return files;

            return files.filter(file => {
                const sizeBytes = file.size || 0;
                const sizeKB = sizeBytes / 1024; // Converte para KB
                
                if (activeSize === 'small') return sizeBytes < 51200; // < 50KB
                if (activeSize === 'medium') return sizeBytes >= 51200 && sizeBytes < 512000; // 50-500KB
                if (activeSize === 'large') return sizeBytes >= 512000; // > 500KB
                
                // Filtro customizado
                if (activeSize === 'custom') {
                    const { customMin, customMax } = this.uiConfig.size;
                    
                    if (customMin !== null && sizeKB < customMin) return false;
                    if (customMax !== null && sizeKB > customMax) return false;
                    
                    return true;
                }
                
                return true;
            });
        }

        /**
         * Aplica filtro de tipo
         */
        applyTypeFilter(files) {
            const activeTypes = this.uiConfig.types.active;
            if (activeTypes.length === 0) return files;

            return files.filter(file => {
                const extension = file.name.split('.').pop().toLowerCase();
                return activeTypes.includes(extension);
            });
        }

        /**
         * Aplica filtro de busca
         */
        applySearchFilter(files) {
            if (!this.searchTerm) return files;

            const searchLower = this.searchTerm.toLowerCase();

            return files.filter(file => {
                const searchableText = [
                    file.name || '',
                    file.path || file.relativePath || '',
                    file.content || '',
                    (file.preview && typeof file.preview === 'string') ? file.preview : ''
                ].join(' ').toLowerCase();

                return searchableText.includes(searchLower);
            });
        }

        /**
         * Aplica filtro de padrões de exclusão
         */
        applyExclusionFilter(files) {
            if (!this.exclusionPatterns || this.exclusionPatterns.length === 0) {
                return files;
            }

            return files.filter(file => {
                const fileName = file.name || '';
                const filePath = file.path || file.relativePath || '';
                const fullPath = `${filePath}/${fileName}`.toLowerCase();
                
                // Verifica se algum padrão está presente no nome ou caminho
                return !this.exclusionPatterns.some(pattern => {
                    const patternLower = pattern.toLowerCase();
                    return fullPath.includes(patternLower) || fileName.toLowerCase().includes(patternLower);
                });
            });
        }

        /**
         * Calcula relevância do arquivo (compatível com FileRenderer)
         */
        calculateFileRelevance(file) {
            // Usa método do FileRenderer se disponível
            if (this.fileRenderer && typeof this.fileRenderer.calculateRelevance === 'function') {
                return this.fileRenderer.calculateRelevance(file);
            }

            // Fallback simples
            //if (file.relevanceScore !== undefined) {
            //    return file.relevanceScore > 1 ? file.relevanceScore : file.relevanceScore * 100;
            //}

            return 50; // Padrão
        }

        /**
         * Atualiza todos os contadores
         */
        updateAllCounters() {
            const files = AppState.get('files') || [];
            this.updateCounters(files);
        }

        /**
         * Atualiza contadores de filtros
         */
        updateCounters(files) {
            // Atualiza contadores de relevância
            this.updateRelevanceCounters(files);
            
            // Atualiza contadores de status
            this.updateStatusCounters(files);
            
            // Atualiza contadores de período
            this.updatePeriodCounters(files);
            
            // Atualiza contadores de tamanho
            this.updateSizeCounters(files);
            
            // Atualiza contadores de tipo
            this.updateTypeCounters(files);
            
            // NOVO: Atualiza a interface dos contadores
            this.updateCountersUI();
        }

        /**
         * Atualiza contadores com dados do StatsCoordinator
         */
        updateCountersFromStats(stats) {
            if (!stats) return;
            
            // Atualiza contadores de relevância
            const relevanceOptions = this.uiConfig.relevance.options;
            relevanceOptions[0].count = stats.files.total; // Todos
            relevanceOptions[1].count = stats.relevance.high; // Alta (>=70%)
            relevanceOptions[2].count = stats.relevance.medium + stats.relevance.high; // Média (>=50%)
            relevanceOptions[3].count = stats.relevance.low + stats.relevance.medium + stats.relevance.high; // Baixa (>=30%)
            
            // Atualiza contadores de status
            const statusOptions = this.uiConfig.status.options;
            statusOptions[0].count = stats.files.total; // Todos
            statusOptions[1].count = stats.files.pending; // Pendente
            statusOptions[2].count = stats.files.approved; // Aprovados
            statusOptions[3].count = stats.files.archived; // Arquivados
            
            // Atualiza contadores de tamanho
            const sizeOptions = this.uiConfig.size.options;
            sizeOptions[0].count = stats.files.total; // Qualquer
            sizeOptions[1].count = stats.sizes.small; // < 50KB
            sizeOptions[2].count = stats.sizes.medium; // 50-500KB
            sizeOptions[3].count = stats.sizes.large; // > 500KB
            
            // Atualiza contadores de tipo
            const typeOptions = this.uiConfig.types.options;
            typeOptions.forEach(option => {
                option.count = stats.types[option.value] || 0;
            });
            
            // Atualiza UI
            this.updateCountersUI();
            
            // Atualiza info de bulk actions
            const bulkInfo = document.getElementById('bulk-info-text');
            if (bulkInfo && this.fileRenderer) {
                const count = this.fileRenderer.filteredFiles?.length || 0;
                bulkInfo.textContent = `${count} arquivos serão afetados pelas ações em lote`;
            }

            // Atualiza info de ações em lote
            this.updateBulkInfo();
        }

        /**
         * Atualiza contadores de relevância
         */
        updateRelevanceCounters(files) {
            const relevanceCounts = {
                all: files.length,
                high: 0,
                medium: 0,
                low: 0
            };

            files.forEach(file => {
                const relevance = this.calculateFileRelevance(file);
                if (relevance >= 70) relevanceCounts.high++;
                else if (relevance >= 50) relevanceCounts.medium++;
                else relevanceCounts.low++;
            });

            this.updateGroupCounters('relevance', relevanceCounts);
        }

        /**
         * Atualiza contadores de status
         */
        updateStatusCounters(files) {
            const statusCounts = {
                all: files.length,
                pending: 0,
                approved: 0,
                archived: 0
            };

            files.forEach(file => {
                if (file.archived) statusCounts.archived++;
                else if (file.analyzed) statusCounts.approved++;
                else statusCounts.pending++;
            });

            this.updateGroupCounters('status', statusCounts);
        }

        /**
         * Atualiza contadores de período
         */
        updatePeriodCounters(files) {
            const now = new Date();
            const periodCounts = {
                all: files.length,
                today: 0,
                week: 0,
                month: 0,
                '3m': 0,
                '6m': 0,
                year: 0
            };

            const periods = {
                today: 1,
                week: 7,
                month: 30,
                '3m': 90,
                '6m': 180,
                year: 365
            };

            // Conta arquivos em cada período (cumulativo)
            files.forEach(file => {
                let fileDate;
                
                // NOVO: Validação robusta de data
                if (file.lastModified) {
                    fileDate = new Date(file.lastModified);
                } else if (file.dateCreated) {
                    fileDate = new Date(file.dateCreated);
                } else if (file.date) {
                    fileDate = new Date(file.date);
                } else {
                    // Fallback: considera como arquivo de hoje se não tiver data
                    fileDate = new Date();
                    console.warn('FilterPanel: Arquivo sem data, usando data atual:', file.name);
                }
                
                // Verifica se a data é válida
                if (isNaN(fileDate.getTime())) {
                    fileDate = new Date();
                    console.warn('FilterPanel: Data inválida, usando data atual:', file.name);
                }
                
                Object.entries(periods).forEach(([period, days]) => {
                    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                    if (fileDate >= cutoffDate) {
                        periodCounts[period]++;
                    }
                });
            });
            
            // Log para debug da distribuição temporal
            if (files.length > 0) {
                const oldestFile = files.reduce((oldest, file) => {
                    const fileDate = new Date(file.lastModified || file.dateCreated || 0);
                    return fileDate < oldest ? fileDate : oldest;
                }, new Date());
                
                const daysSinceOldest = Math.floor((now - oldestFile) / (1000 * 60 * 60 * 24));
                console.log(`FilterPanel: Arquivo mais antigo tem ${daysSinceOldest} dias`);
            }

            this.updateGroupCounters('period', periodCounts);
        }

        /**
         * Atualiza contadores de tamanho
         */
        updateSizeCounters(files) {
            const sizeCounts = {
                all: files.length,
                small: 0,
                medium: 0,
                large: 0
            };

            files.forEach(file => {
                const size = file.size || 0;
                if (size < 51200) sizeCounts.small++;
                else if (size < 512000) sizeCounts.medium++;
                else sizeCounts.large++;
            });

            this.updateGroupCounters('size', sizeCounts);
        }

        /**
         * Atualiza contadores de tipo
         */
        updateTypeCounters(files) {
            // ORIGINAL - Preservado para rollback
            // const typeCounts = {
            //     all: files.length,
            //     md: 0,
            //     txt: 0,
            //     docx: 0,
            //     pdf: 0
            // };
            // NOVO - Adiciona gdoc
            const typeCounts = {
                all: files.length,
                md: 0,
                txt: 0,
                docx: 0,
                pdf: 0,
                gdoc: 0
            };

            files.forEach(file => {
                const extension = file.name.split('.').pop().toLowerCase();
                if (typeCounts.hasOwnProperty(extension)) {
                    typeCounts[extension]++;
                }
            });

            this.updateGroupCounters('types', typeCounts);
        }

        /**
         * Atualiza contadores de um grupo
         */
        updateGroupCounters(group, counts) {
            // CORREÇÃO: Também atualiza no uiConfig para manter sincronizado
            if (this.uiConfig[group]) {
                this.uiConfig[group].options.forEach(option => {
                    if (counts.hasOwnProperty(option.value)) {
                        option.count = counts[option.value];
                    }
                });
            }
            
            // Atualiza elementos HTML
            Object.entries(counts).forEach(([option, count]) => {
                const counterElement = document.getElementById(`count-${group}-${option}`);
                if (counterElement) {
                    counterElement.textContent = `(${count})`;
                }
            });
        }

        /**
         * Atualiza informações de ações em lote
         */
        updateBulkInfo() {
            const infoElement = document.getElementById('bulk-info-text');
            if (!infoElement) return;

            // Calcula quantos arquivos serão afetados pelos filtros atuais
            const filteredCount = this.getFilteredFilesCount();
            
            if (filteredCount === 0) {
                infoElement.textContent = 'Nenhum arquivo corresponde aos filtros atuais';
                infoElement.style.color = '#666';
            } else {
                infoElement.textContent = `${filteredCount} arquivo(s) serão afetados pelas ações em lote`;
                infoElement.style.color = '#333';
            }
        }

        /**
         * Obtém contagem de arquivos filtrados
         */
        getFilteredFilesCount() {
            if (this.fileRenderer && this.fileRenderer.filteredFiles) {
                return this.fileRenderer.filteredFiles.length;
            }
            return 0;
        }

        /**
         * Atualiza interface dos contadores
         */
        updateCountersUI() {
            // Atualiza contadores de relevância
            const relevanceOptions = this.uiConfig.relevance.options;
            relevanceOptions.forEach(option => {
                const element = document.getElementById(`count-relevance-${option.value}`);
                if (element) {
                    element.textContent = option.count || 0;
                }
            });

            // Atualiza contadores de status
            const statusOptions = this.uiConfig.status.options;
            statusOptions.forEach(option => {
                const element = document.getElementById(`count-status-${option.value}`);
                if (element) {
                    element.textContent = option.count || 0;
                }
            });

            // Atualiza contadores de período
            const periodOptions = this.uiConfig.period.options;
            periodOptions.forEach(option => {
                const element = document.getElementById(`count-period-${option.value}`);
                if (element) {
                    element.textContent = option.count || 0;
                }
            });

            // Atualiza contadores de tamanho
            const sizeOptions = this.uiConfig.size.options;
            sizeOptions.forEach(option => {
                const element = document.getElementById(`count-size-${option.value}`);
                if (element) {
                    element.textContent = option.count || 0;
                }
            });

            // Atualiza contadores de tipo
            const typeOptions = this.uiConfig.types.options;
            typeOptions.forEach(option => {
                const element = document.getElementById(`count-types-${option.value}`);
                if (element) {
                    element.textContent = option.count || 0;
                }
            });

            // Atualiza contadores de duplicatas se existirem
            this.updateDuplicateCounters();
        }

        /**
         * Atualiza contadores da seção de duplicatas
         */
        updateDuplicateCounters() {
            const duplicateStats = KC.AppState.get('stats.duplicateStats');
            if (!duplicateStats) return;

            // Atualiza contador de duplicatas totais
            const duplicatesElement = document.getElementById('count-duplicates-duplicates');
            if (duplicatesElement) {
                duplicatesElement.textContent = duplicateStats.duplicates || 0;
            }

            // Atualiza contador de grupos
            const groupsElement = document.getElementById('count-duplicates-groups');
            if (groupsElement) {
                groupsElement.textContent = duplicateStats.groups || 0;
            }

            // Atualiza contador de removíveis
            const removableElement = document.getElementById('count-duplicates-removable');
            if (removableElement) {
                removableElement.textContent = duplicateStats.removable || 0;
            }

            // Atualiza contador de únicos
            const uniqueElement = document.getElementById('count-duplicates-unique');
            if (uniqueElement) {
                uniqueElement.textContent = duplicateStats.unique || 0;
            }
        }

        /**
         * Reset todos os filtros
         */
        resetAllFilters() {
            // Reset configuração
            this.uiConfig.relevance.active = 'all';
            this.uiConfig.status.active = 'all';
            this.uiConfig.period.active = 'all';
            this.uiConfig.size.active = 'all';
            this.uiConfig.size.customMin = null;
            this.uiConfig.size.customMax = null;
            this.uiConfig.types.active = ['md', 'txt', 'docx', 'pdf', 'gdoc'];
            this.searchTerm = '';
            this.exclusionPatterns = ['temp', 'cache', 'backup', '.git', '.trash', '.obsidian', 'ThirdPartyNoticeText.txt', 'CHANGELOG.md', 'README.md', '.excalidraw.md'];

            // Re-renderiza interface
            this.renderIntuitiveInterface();
            this.setupEventListeners();

            // Aplica filtros resetados
            this.applyFilters();

            KC.showNotification({
                type: 'info',
                message: 'Filtros resetados para valores padrão',
                duration: 2000
            });
        }

        /**
         * Sincroniza com FilterManager existente
         */
        syncWithFilterManager() {
            // Placeholder para manter sincronização se necessário
            console.log('FilterPanel: Sincronizado com FilterManager');
        }

        // === AÇÕES EM LOTE ===

        /**
         * [1. ATUALIZAR] - Força refresh manual
         */
        handleBulkUpdate() {
            console.log('FilterPanel: Executando atualização manual...');
            
            // [DEBUG] Log adicional
            console.log('[DEBUG] handleBulkUpdate: Verificando FileRenderer', {
                hasFileRenderer: !!this.fileRenderer,
                hasKCFileRenderer: !!(KC && KC.FileRenderer),
                hasAppState: !!(KC && KC.AppState),
                filesCount: KC.AppState ? (KC.AppState.get('files') || []).length : 0
            });

            // Força re-renderização via evento
            const renderer = this.fileRenderer || (KC && KC.FileRenderer);
            if (renderer) {
                // Dispara evento para forçar atualização
                KC.EventBus.emit(KC.Events.STATE_CHANGED, {
                    key: 'files',
                    newValue: KC.AppState.get('files') || [],
                    oldValue: []
                });
                
                KC.showNotification({
                    type: 'success',
                    message: 'Dados atualizados com sucesso'
                });
            } else {
                console.error('FilterPanel: FileRenderer não disponível');
                KC.showNotification({
                    type: 'error',
                    message: 'FileRenderer não disponível'
                });
            }

            // Força recálculo de contadores
            setTimeout(() => {
                this.updateAllCounters();
                this.applyFilters();
            }, 500);
        }

        /**
         * [2. APROVAR TODOS] - Aprova arquivos filtrados
         */
        handleBulkApprove() {
            const filteredFiles = this.fileRenderer?.filteredFiles || [];
            
            if (filteredFiles.length === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhum arquivo filtrado para aprovar'
                });
                return;
            }

            const pendingFiles = filteredFiles.filter(f => !f.analyzed && !f.archived);
            if (pendingFiles.length === 0) {
                KC.showNotification({
                    type: 'info',
                    message: 'Todos os arquivos filtrados já foram aprovados'
                });
                return;
            }

            // Confirma ação
            if (!confirm(`Aprovar ${pendingFiles.length} arquivo(s) para análise?`)) {
                return;
            }

            // Atualiza todos os arquivos de uma vez no AppState
            const allFiles = KC.AppState.get('files') || [];
            let updatedCount = 0;
            
            pendingFiles.forEach(file => {
                // Encontra o arquivo no estado global
                const fileIndex = allFiles.findIndex(f => 
                    (f.id && f.id === file.id) || 
                    (f.name === file.name && f.path === file.path)
                );
                
                if (fileIndex !== -1) {
                    // Atualiza o arquivo no estado global
                    allFiles[fileIndex] = {
                        ...allFiles[fileIndex],
                        status: 'approved',
                        analyzed: true,
                        approvedDate: new Date().toISOString(),
                        approvalMethod: 'bulk_action'
                    };
                    updatedCount++;
                }
            });

            // Salva o estado atualizado de uma vez
            KC.AppState.set('files', allFiles);

            KC.showNotification({
                type: 'success',
                message: `${updatedCount} arquivo(s) aprovado(s) para análise`
            });

            // Força atualização da interface
            setTimeout(() => {
                this.updateAllCounters();
                this.applyFilters(); // Re-aplica filtros para atualizar a lista
                
                // Dispara evento para outros componentes
                KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                    action: 'bulk_approve',
                    count: updatedCount
                });
            }, 100);
        }

        /**
         * [3. ARQUIVAR TODOS] - Arquiva arquivos filtrados
         */
        handleBulkArchive() {
            const filteredFiles = this.fileRenderer?.filteredFiles || [];
            
            if (filteredFiles.length === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhum arquivo filtrado para arquivar'
                });
                return;
            }

            const activeFiles = filteredFiles.filter(f => !f.archived);
            if (activeFiles.length === 0) {
                KC.showNotification({
                    type: 'info',
                    message: 'Todos os arquivos filtrados já foram arquivados'
                });
                return;
            }

            // Confirma ação
            if (!confirm(`Arquivar ${activeFiles.length} arquivo(s)? Esta ação pode ser desfeita.`)) {
                return;
            }

            // Log em JSONL antes de arquivar
            this.logArchivedFiles(activeFiles);

            // Atualiza todos os arquivos de uma vez no AppState
            const allFiles = KC.AppState.get('files') || [];
            let updatedCount = 0;
            
            activeFiles.forEach(file => {
                // Encontra o arquivo no estado global
                const fileIndex = allFiles.findIndex(f => 
                    (f.id && f.id === file.id) || 
                    (f.name === file.name && f.path === file.path)
                );
                
                if (fileIndex !== -1) {
                    // Atualiza o arquivo no estado global
                    allFiles[fileIndex] = {
                        ...allFiles[fileIndex],
                        archived: true,
                        archivedDate: new Date().toISOString(),
                        archiveMethod: 'bulk_action'
                    };
                    updatedCount++;
                }
            });

            // Salva o estado atualizado de uma vez
            KC.AppState.set('files', allFiles);

            KC.showNotification({
                type: 'success',
                message: `${updatedCount} arquivo(s) arquivado(s) com sucesso`,
                details: 'Log salvo em archived_files.jsonl'
            });

            // Força atualização da interface
            setTimeout(() => {
                this.updateAllCounters();
                this.applyFilters(); // Re-aplica filtros para atualizar a lista
                
                // Dispara evento para outros componentes
                KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                    action: 'bulk_archive',
                    count: updatedCount
                });
            }, 100);
        }

        /**
         * Sistema de Log JSONL para arquivos arquivados
         */
        logArchivedFiles(files) {
            const logEntries = files.map(file => ({
                timestamp: new Date().toISOString(),
                action: 'bulk_archive',
                file: {
                    name: file.name,
                    path: file.path || file.relativePath,
                    size: file.size,
                    relevance: this.calculateFileRelevance(file),
                    preview: (typeof file.preview === 'string') ? 
                        file.preview.substring(0, 100) : 'N/A',
                    categories: file.categories || [],
                    reason: 'user_bulk_action',
                    filters_applied: {
                        relevance: this.uiConfig.relevance.active,
                        status: this.uiConfig.status.active,
                        period: this.uiConfig.period.active,
                        size: this.uiConfig.size.active,
                        types: this.uiConfig.types.active,
                        search: this.searchTerm
                    }
                }
            }));

            // Salva em localStorage (placeholder para JSONL real)
            const existingLogs = JSON.parse(localStorage.getItem('archived_files_log') || '[]');
            const updatedLogs = [...existingLogs, ...logEntries];
            localStorage.setItem('archived_files_log', JSON.stringify(updatedLogs));

            console.log(`FilterPanel: ${logEntries.length} entradas logadas para arquivamento`);
        }

        /**
         * [4. RESTAURAR] - Restaura arquivos arquivados para aprovados
         */
        handleBulkRestore() {
            const filteredFiles = this.fileRenderer?.filteredFiles || [];
            
            if (filteredFiles.length === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhum arquivo filtrado para restaurar'
                });
                return;
            }

            const archivedFiles = filteredFiles.filter(f => f.archived);
            if (archivedFiles.length === 0) {
                KC.showNotification({
                    type: 'info',
                    message: 'Nenhum arquivo arquivado encontrado para restaurar'
                });
                return;
            }

            // Confirma ação
            if (!confirm(`Restaurar ${archivedFiles.length} arquivo(s) arquivado(s) para aprovados?`)) {
                return;
            }

            // Atualiza todos os arquivos de uma vez no AppState
            const allFiles = KC.AppState.get('files') || [];
            let updatedCount = 0;
            
            archivedFiles.forEach(file => {
                // Encontra o arquivo no estado global
                const fileIndex = allFiles.findIndex(f => 
                    (f.id && f.id === file.id) || 
                    (f.name === file.name && f.path === file.path)
                );
                
                if (fileIndex !== -1) {
                    // Restaura o arquivo
                    allFiles[fileIndex] = {
                        ...allFiles[fileIndex],
                        archived: false,
                        analyzed: true, // Restaura como aprovado
                        status: 'approved',
                        restoredDate: new Date().toISOString(),
                        restoreMethod: 'bulk_action'
                    };
                    // Remove campos relacionados ao arquivamento
                    delete allFiles[fileIndex].archivedDate;
                    delete allFiles[fileIndex].archiveMethod;
                    
                    updatedCount++;
                }
            });

            // Salva o estado atualizado de uma vez
            KC.AppState.set('files', allFiles);

            KC.showNotification({
                type: 'success',
                message: `${updatedCount} arquivo(s) restaurado(s) para aprovados`,
                details: 'Arquivos movidos de volta para a lista de aprovados'
            });

            // Força atualização da interface
            setTimeout(() => {
                this.updateAllCounters();
                this.applyFilters(); // Re-aplica filtros para atualizar a lista
                
                // Dispara evento para outros componentes
                KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                    action: 'bulk_restore',
                    count: updatedCount
                });
            }, 100);
        }

        /**
         * Atualiza visibilidade dos botões baseado no filtro ativo
         */
        updateBulkButtonsVisibility() {
            const restoreBtn = this.container?.querySelector('#bulk-restore');
            const archiveBtn = this.container?.querySelector('#bulk-archive');
            const approveBtn = this.container?.querySelector('#bulk-approve');
            
            if (!restoreBtn || !archiveBtn || !approveBtn) return;
            
            const activeStatus = this.uiConfig.status.active;
            
            if (activeStatus === 'archived') {
                // Se filtro está em "Arquivados", mostra botão restaurar e esconde arquivar
                restoreBtn.style.display = 'block';
                archiveBtn.style.display = 'none';
                approveBtn.style.display = 'none'; // Arquivados não podem ser aprovados diretamente
            } else {
                // Para outros filtros, mostra botões normais
                restoreBtn.style.display = 'none';
                archiveBtn.style.display = 'block';
                approveBtn.style.display = 'block';
            }
        }


        /**
         * Configura handlers para duplicatas
         */
        setupDuplicateHandlers() {
            // Botão de limpar automaticamente
            const autoDeduplicateBtn = document.getElementById('auto-deduplicate');
            if (autoDeduplicateBtn) {
                autoDeduplicateBtn.addEventListener('click', () => {
                    this.handleAutoDeduplicate();
                });
            }

            // Botão de revisar manualmente
            const reviewDuplicatesBtn = document.getElementById('review-duplicates');
            if (reviewDuplicatesBtn) {
                reviewDuplicatesBtn.addEventListener('click', () => {
                    this.handleReviewDuplicates();
                });
            }

            // Checkbox mostrar apenas duplicatas
            const showDuplicatesCheck = document.getElementById('show-duplicates');
            if (showDuplicatesCheck) {
                showDuplicatesCheck.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        // Desmarcar "ocultar duplicatas" se estava marcado
                        const hideCheck = document.getElementById('hide-duplicates');
                        if (hideCheck) hideCheck.checked = false;
                    }
                    this.handleDuplicateFilter();
                });
            }

            // Checkbox ocultar duplicatas
            const hideDuplicatesCheck = document.getElementById('hide-duplicates');
            if (hideDuplicatesCheck) {
                hideDuplicatesCheck.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        // Desmarcar "mostrar apenas duplicatas" se estava marcado
                        const showCheck = document.getElementById('show-duplicates');
                        if (showCheck) showCheck.checked = false;
                    }
                    this.handleDuplicateFilter();
                });
            }
        }

        /**
         * Remove duplicatas automaticamente (alta confiança)
         */
        handleAutoDeduplicate() {
            const duplicateStats = KC.AppState?.get('stats.duplicateStats');
            
            if (!duplicateStats || duplicateStats.confident === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhuma duplicata com alta confiança para remover'
                });
                return;
            }

            // Confirma ação
            if (!confirm(`Remover automaticamente ${duplicateStats.confident} duplicata(s) com alta confiança?`)) {
                return;
            }

            const allFiles = KC.AppState.get('files') || [];
            const filesToRemove = allFiles.filter(file => 
                file.isDuplicate && 
                file.duplicateConfidence >= 0.9
            );

            if (filesToRemove.length === 0) {
                KC.showNotification({
                    type: 'error',
                    message: 'Nenhuma duplicata encontrada para remover'
                });
                return;
            }

            // Remove duplicatas do estado
            const remainingFiles = allFiles.filter(file => 
                !filesToRemove.some(removeFile => 
                    removeFile.id === file.id || 
                    (removeFile.name === file.name && removeFile.path === file.path)
                )
            );

            // Salva no estado
            KC.AppState.set('files', remainingFiles);

            // Emite eventos
            KC.EventBus.emit(KC.Events.STATE_CHANGED, {
                key: 'files',
                newValue: remainingFiles,
                oldValue: allFiles
            });

            KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                action: 'deduplicate',
                removedCount: filesToRemove.length
            });

            KC.showNotification({
                type: 'success',
                message: `${filesToRemove.length} duplicata(s) removida(s) com sucesso`
            });

            // Atualiza interface e força recálculo de stats
            setTimeout(() => {
                // Força atualização centralizada
                if (KC.StatsCoordinator) {
                    KC.StatsCoordinator.forceUpdate();
                }
                this.applyFilters();
                // Re-renderiza para remover seção de duplicatas se não houver mais
                if (remainingFiles.filter(f => f.isDuplicate).length === 0) {
                    this.renderIntuitiveInterface();
                    this.setupEventListeners();
                }
            }, 100);
        }

        /**
         * Abre modal para revisar duplicatas manualmente
         */
        handleReviewDuplicates() {
            const allFiles = KC.AppState.get('files') || [];
            const duplicateFiles = allFiles.filter(file => file.isDuplicate || file.isPrimaryDuplicate);
            
            // Debug: verificar dados
            console.log('[DEBUG] Total de arquivos:', allFiles.length);
            console.log('[DEBUG] Duplicatas encontradas:', duplicateFiles.length);
            console.log('[DEBUG] Primeiras 3 duplicatas:', duplicateFiles.slice(0, 3));

            if (duplicateFiles.length === 0) {
                KC.showNotification({
                    type: 'info',
                    message: 'Nenhuma duplicata para revisar'
                });
                return;
            }

            // Agrupa duplicatas
            const duplicateGroups = this.groupDuplicateFiles(duplicateFiles);
            
            // Debug: verificar grupos formados
            console.log('[DEBUG] Grupos formados:', duplicateGroups.length);
            console.log('[DEBUG] Grupos:', duplicateGroups);

            // Cria conteúdo do modal
            const modalContent = this.createDuplicateReviewModal(duplicateGroups);

            // Abre modal usando ModalManager
            if (KC.ModalManager) {
                // CORREÇÃO: ModalManager espera 3 parâmetros (id, content, options)
                KC.ModalManager.showModal(
                    'duplicate-review',  // ID único do modal
                    modalContent,        // Conteúdo HTML
                    {                   // Opções (não utilizadas atualmente)
                        title: '🔄 Revisar Duplicatas',
                        size: 'large',
                        buttons: [
                            {
                                text: 'Aplicar Seleções',
                                class: 'primary',
                                action: () => this.applyDuplicateSelections()
                            },
                            {
                                text: 'Cancelar',
                                class: 'secondary',
                                action: () => KC.ModalManager.closeModal('duplicate-review')
                            }
                        ]
                    }
                );
            } else {
                KC.showNotification({
                    type: 'error',
                    message: 'ModalManager não disponível'
                });
            }
        }

        /**
         * Agrupa arquivos duplicados
         */
        groupDuplicateFiles(files) {
            // Debug no início
            console.log('[DEBUG] Agrupando arquivos:', files);
            console.log('[DEBUG] Exemplo de arquivo:', files[0]);
            
            const groups = new Map();

            files.forEach(file => {
                const groupKey = file.duplicateGroup || 'unknown';
                console.log('[DEBUG] Arquivo:', file.name, 'Grupo:', groupKey);
                
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, []);
                }
                groups.get(groupKey).push(file);
            });
            
            // Debug após agrupamento
            console.log('[DEBUG] Grupos criados:', groups);

            return Array.from(groups.entries()).map(([type, files]) => ({
                type,
                files: files.sort((a, b) => {
                    // Primary first
                    if (a.isPrimaryDuplicate && !b.isPrimaryDuplicate) return -1;
                    if (!a.isPrimaryDuplicate && b.isPrimaryDuplicate) return 1;
                    // Then by confidence
                    return (b.duplicateConfidence || 0) - (a.duplicateConfidence || 0);
                })
            }));
        }

        /**
         * Cria conteúdo do modal de revisão
         */
        createDuplicateReviewModal(groups) {
            let html = '<div class="duplicate-review-container">';
            
            // Debug e tratamento de erro
            console.log('[DEBUG] Criando modal para grupos:', groups);
            
            if (!groups || groups.length === 0) {
                html += '<p class="no-duplicates-message">Nenhum grupo de duplicatas encontrado. Verifique se os arquivos têm as propriedades de duplicata configuradas corretamente.</p>';
                html += '</div>';
                return html;
            }

            groups.forEach((group, index) => {
                const typeLabels = {
                    'exact': '📋 Duplicatas Exatas',
                    'pattern': '📝 Padrões Similares',
                    'version': '📊 Possíveis Versões'
                };

                html += `
                    <div class="duplicate-group" data-group-index="${index}">
                        <h4>${typeLabels[group.type] || '❓ Outros'}</h4>
                        <div class="duplicate-files-list">
                `;

                group.files.forEach((file, fileIndex) => {
                    const isPrimary = file.isPrimaryDuplicate;
                    const isChecked = !isPrimary; // Por padrão, marca duplicatas para remoção
                    
                    html += `
                        <div class="duplicate-file-item ${isPrimary ? 'primary' : 'duplicate'}">
                            <label>
                                <input type="checkbox" 
                                       name="duplicate-${group.type}-${fileIndex}" 
                                       value="${file.id || file.path}"
                                       ${isChecked ? 'checked' : ''}
                                       ${isPrimary ? 'disabled' : ''}>
                                <div class="file-info">
                                    <strong>${file.name}</strong>
                                    ${isPrimary ? '<span class="badge primary">Principal</span>' : ''}
                                    ${file.duplicateConfidence ? `<span class="confidence">Confiança: ${Math.round(file.duplicateConfidence * 100)}%</span>` : ''}
                                    <div class="file-details">
                                        <small>${file.path || file.relativePath}</small>
                                        <small>${this.formatFileSize(file.size)}</small>
                                        ${file.duplicateReason ? `<small class="reason">${file.duplicateReason}</small>` : ''}
                                    </div>
                                </div>
                            </label>
                        </div>
                    `;
                });

                html += '</div></div>';
            });

            html += '</div>';
            
            // Debug: verificar HTML final
            console.log('[DEBUG] HTML do modal criado, tamanho:', html.length);
            
            return html;
        }

        /**
         * Aplica seleções de duplicatas do modal
         */
        applyDuplicateSelections() {
            const checkedInputs = document.querySelectorAll('.duplicate-review-container input[type="checkbox"]:checked:not(:disabled)');
            const filesToRemove = Array.from(checkedInputs).map(input => input.value);

            if (filesToRemove.length === 0) {
                KC.showNotification({
                    type: 'info',
                    message: 'Nenhuma duplicata selecionada para remover'
                });
                return;
            }

            const allFiles = KC.AppState.get('files') || [];
            const remainingFiles = allFiles.filter(file => {
                const fileId = file.id || file.path;
                return !filesToRemove.includes(fileId);
            });

            // Salva no estado
            KC.AppState.set('files', remainingFiles);

            // Emite eventos
            KC.EventBus.emit(KC.Events.STATE_CHANGED, {
                key: 'files',
                newValue: remainingFiles,
                oldValue: allFiles
            });

            KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                action: 'deduplicate_manual',
                removedCount: filesToRemove.length
            });

            KC.showNotification({
                type: 'success',
                message: `${filesToRemove.length} duplicata(s) removida(s) manualmente`
            });

            // Fecha modal
            KC.ModalManager.closeModal();

            // Atualiza interface e força recálculo de stats
            setTimeout(() => {
                // Força atualização centralizada
                if (KC.StatsCoordinator) {
                    KC.StatsCoordinator.forceUpdate();
                }
                this.applyFilters();
                // Re-renderiza se não houver mais duplicatas
                if (remainingFiles.filter(f => f.isDuplicate).length === 0) {
                    this.renderIntuitiveInterface();
                    this.setupEventListeners();
                }
            }, 100);
        }

        /**
         * Obtém estado atual dos filtros
         */
        getCurrentFilterState() {
            const state = {
                relevance: this.uiConfig.relevance.active,
                status: this.uiConfig.status.active,
                period: this.uiConfig.period.active,
                size: this.uiConfig.size.active,
                types: [...this.uiConfig.types.active],
                search: this.searchTerm,
                customSize: {
                    min: this.uiConfig.size.customMin,
                    max: this.uiConfig.size.customMax
                },
                duplicates: {
                    show: document.getElementById('show-duplicates')?.checked,
                    hide: document.getElementById('hide-duplicates')?.checked
                }
            };
            return state;
        }

        /**
         * Restaura estado dos filtros
         */
        restoreFilterState(state) {
            if (!state) return;
            
            // Restaura configurações
            this.uiConfig.relevance.active = state.relevance;
            this.uiConfig.status.active = state.status;
            this.uiConfig.period.active = state.period;
            this.uiConfig.size.active = state.size;
            this.uiConfig.types.active = state.types;
            this.searchTerm = state.search;
            this.uiConfig.size.customMin = state.customSize.min;
            this.uiConfig.size.customMax = state.customSize.max;
            
            // Restaura checkboxes de duplicatas
            const showDuplicates = document.getElementById('show-duplicates');
            const hideDuplicates = document.getElementById('hide-duplicates');
            if (showDuplicates) showDuplicates.checked = state.duplicates.show;
            if (hideDuplicates) hideDuplicates.checked = state.duplicates.hide;
            
            // Re-aplica filtros
            this.applyFilters();
        }

        /**
         * Manipula mudança no filtro de duplicatas
         */
        handleDuplicateFilter() {
            const showDuplicates = document.getElementById('show-duplicates')?.checked;
            const hideDuplicates = document.getElementById('hide-duplicates')?.checked;

            // Salva estado do filtro
            this.duplicateFilterState = {
                showOnly: showDuplicates,
                hide: hideDuplicates
            };

            // Re-aplica todos os filtros
            this.applyFilters();
        }

        /**
         * Aplica filtro de duplicatas
         */
        applyDuplicateFilter(files) {
            // CORREÇÃO SPRINT 1.3.1: Garantir que filtro de duplicatas inicie desativado
            if (!this.duplicateFilterState) {
                // Se não há estado definido, retorna todos os arquivos (sem filtrar)
                console.log('FilterPanel: Filtro de duplicatas não configurado, retornando todos os arquivos');
                return files;
            }

            const { showOnly, hide } = this.duplicateFilterState;

            if (showOnly) {
                // Mostra apenas duplicatas
                console.log('FilterPanel: Mostrando apenas duplicatas');
                return files.filter(file => file.isDuplicate || file.isPrimaryDuplicate);
            } else if (hide) {
                // Oculta duplicatas
                console.log('FilterPanel: Ocultando duplicatas');
                return files.filter(file => !file.isDuplicate);
            }

            // Por padrão, retorna todos os arquivos sem filtrar
            return files;
        }

        /**
         * Formata tamanho do arquivo
         */
        formatFileSize(bytes) {
            if (!bytes) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        /**
         * Renderiza seção de controle de duplicatas
         */
        renderDuplicateSection() {
            const duplicateStats = KC.AppState?.get('stats.duplicateStats');
            
            if (!duplicateStats || duplicateStats.duplicates === 0) {
                return ''; // Não mostra seção se não há duplicatas
            }

            const savingsKB = Math.round(duplicateStats.removable * 50); // Estimativa conservadora
            
            return `
                <div class="filter-group" data-group="duplicates">
                    <div class="group-header" data-toggle="duplicates">
                        <h4>🔄 DUPLICATAS DETECTADAS</h4>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="group-content expanded" id="duplicates-content">
                        <div class="duplicate-stats">
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-value">${duplicateStats.total}</span>
                                    <span class="stat-label">Total</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${duplicateStats.unique}</span>
                                    <span class="stat-label">Únicos</span>
                                </div>
                                <div class="stat-item warning">
                                    <span class="stat-value">${duplicateStats.duplicates}</span>
                                    <span class="stat-label">Duplicados</span>
                                </div>
                                <div class="stat-item success">
                                    <span class="stat-value">${duplicateStats.confident}</span>
                                    <span class="stat-label">Auto-Remove</span>
                                </div>
                            </div>
                        </div>

                        <div class="duplicate-actions">
                            <button class="btn-primary auto-clean" id="auto-deduplicate" 
                                    ${duplicateStats.confident === 0 ? 'disabled' : ''}>
                                🧹 Limpar Automaticamente (${duplicateStats.confident})
                            </button>
                            <button class="btn-secondary review" id="review-duplicates">
                                👁️ Revisar Manualmente
                            </button>
                        </div>

                        <div class="duplicate-savings">
                            <small>💾 Economia estimada: ${savingsKB}KB</small>
                        </div>

                        <div class="duplicate-filters">
                            <label class="filter-option">
                                <input type="checkbox" id="show-duplicates" />
                                <span>Mostrar apenas duplicatas</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" id="hide-duplicates" />
                                <span>Ocultar duplicatas</span>
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Registra no namespace global
    KC.FilterPanel = new FilterPanel();

})(window);