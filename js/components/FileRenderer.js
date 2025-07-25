/**
 * FileRenderer.js - Renderizador de Lista de Arquivos
 * 
 * Componente responsável por exibir a lista de arquivos descobertos
 * conforme o layout do insights-1.2.png
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class FileRenderer {
        constructor() {
            this.container = null;
            this.originalFiles = [];    // NOVO: Arquivos originais sem filtros
            this.files = [];            // Arquivos para exibição (com exclusões)
            this.filteredFiles = [];
            this.currentFilter = 'all';
            this.currentSort = 'relevance';
            
            // Sistema de Paginação
            this.pagination = {
                currentPage: 1,
                itemsPerPage: 100, // Padrão conforme PRD
                totalPages: 0,
                totalItems: 0
            };
            
            // Opções de itens por página
            this.pageOptions = [50, 100, 500, 1000];
            
            // NOVO: Sistema de seleção múltipla para bulk actions
            this.selectedFiles = new Set();
            this.bulkActionsVisible = false;
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            console.log('FileRenderer inicializado');
            this.setupEventListeners();
            this.setupContainer();
        }

        /**
         * Getter para arquivos originais (sem exclusões)
         */
        getOriginalFiles() {
            return this.originalFiles;
        }


        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // NOVO: Atalhos de teclado para ações em lote
            document.addEventListener('keydown', (e) => {
                // Verifica se está na etapa correta (files-section visível)
                const filesSection = document.getElementById('files-section');
                if (!filesSection || filesSection.style.display === 'none') {
                    return;
                }
                
                // Ignora se está digitando em input/textarea
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                
                // Ctrl+A - Selecionar Todos
                if (e.ctrlKey && e.key === 'a') {
                    e.preventDefault();
                    this.selectAllVisible();
                }
                // Ctrl+K - Categorizar
                else if (e.ctrlKey && e.key === 'k') {
                    e.preventDefault();
                    if (this.selectedFiles.size > 0) {
                        this.bulkCategorize();
                    }
                }
                // Ctrl+I - Analisar com IA
                else if (e.ctrlKey && e.key === 'i') {
                    e.preventDefault();
                    if (this.selectedFiles.size > 0) {
                        this.bulkAnalyze();
                    }
                }
                // Ctrl+D - Aprovar
                else if (e.ctrlKey && e.key === 'd') {
                    e.preventDefault();
                    if (this.selectedFiles.size > 0) {
                        this.bulkApprove();
                    }
                }
                // Esc - Limpar Seleção
                else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (this.selectedFiles.size > 0) {
                        this.clearSelection();
                    }
                }
            });
            
            // Escuta mudanças nos arquivos descobertos
            if (Events && Events.FILES_DISCOVERED) {
                EventBus.on(Events.FILES_DISCOVERED, (data) => {
                    console.log('FileRenderer: Evento FILES_DISCOVERED recebido', data);
                    
                    // NOVO: Preserva arquivos originais
                    this.originalFiles = data.files || [];
                    console.log(`FileRenderer: ${this.originalFiles.length} arquivos originais descobertos`);
                    
                    // SPRINT 1.3.1: NÃO aplica mais exclusões automáticas
                    if (this.originalFiles.length > 0) {
                        // this.files = this.applySmartExclusions([...this.originalFiles]);
                        this.files = [...this.originalFiles]; // Mantém TODOS os arquivos
                        console.log(`FileRenderer: ${this.files.length} arquivos SEM exclusões`);
                    } else {
                        this.files = [];
                    }
                    
                    this.renderFileList();
                    this.showFilesSection();
                });
            }

            // Escuta mudanças no estado dos arquivos
            if (Events && Events.STATE_CHANGED) {
                EventBus.on(Events.STATE_CHANGED, (data) => {
                    if (data.path === 'files') {
                        console.log('FileRenderer: STATE_CHANGED recebido - atualizando arquivos');
                        
                        // Preserva estado atual antes da atualização
                        const currentState = {
                            currentPage: this.pagination.currentPage,
                            currentFilter: this.currentFilter,
                            currentSort: this.currentSort,
                            itemsPerPage: this.pagination.itemsPerPage
                        };
                        
                        // SPRINT 1.3.1: Preserva arquivos originais SEM exclusões
                        this.originalFiles = data.newValue || [];
                        // this.files = this.applySmartExclusions([...this.originalFiles]);
                        this.files = [...this.originalFiles]; // Mantém TODOS os arquivos
                        
                        console.log(`FileRenderer: STATE_CHANGED - ${this.originalFiles.length} originais = ${this.files.length} para exibição (SEM EXCLUSÕES)`);
                        
                        // Re-renderiza preservando estado
                        this.renderFileList();
                        
                        // Tenta restaurar página atual se ainda válida
                        if (currentState.currentPage <= this.pagination.totalPages) {
                            this.pagination.currentPage = currentState.currentPage;
                        }
                        
                        console.log(`FileRenderer: ${this.files.length} arquivos carregados, página ${this.pagination.currentPage}`);
                    }
                });
            }
            
            // [DEBUG] Logs adicionados para diagnóstico - REMOVER APÓS RESOLVER
            console.log('[DEBUG] FileRenderer: Listeners configurados', {
                hasFilesDiscoveredEvent: !!Events.FILES_DISCOVERED,
                hasStateChangedEvent: !!Events.STATE_CHANGED,
                hasFilesFilteredEvent: !!Events.FILES_FILTERED,
                eventsRegistered: Object.keys(Events || {}).length
            });

            // Escuta mudanças nos filtros
            if (Events && Events.FILTER_CHANGED) {
                EventBus.on(Events.FILTER_CHANGED, (data) => {
                    this.currentFilter = data.filter;
                    this.applyFilters();
                });
            }

            // Escuta mudanças na ordenação
            if (Events && Events.SORT_CHANGED) {
                EventBus.on(Events.SORT_CHANGED, (data) => {
                    this.currentSort = data.sort;
                    this.applySorting();
                });
            }

            // Listener para garantir carregamento inicial quando app estiver pronta
            if (Events && Events.APP_READY) {
                EventBus.on(Events.APP_READY, () => {
                    const files = AppState.get('files') || [];
                    if (files.length > 0 && this.files.length === 0) {
                        console.log('FileRenderer: APP_READY - carregando arquivos existentes');
                        this.files = files;
                        this.renderFileList();
                    }
                });
            }

            // CORREÇÃO: Escuta evento FILES_FILTERED do FilterManager
            if (Events && Events.FILES_FILTERED) {
                EventBus.on(Events.FILES_FILTERED, (data) => {
                    console.log('FileRenderer: Evento FILES_FILTERED recebido', data);
                    
                    // Atualiza arquivos originais e filtrados
                    this.files = data.originalFiles || [];
                    this.filteredFiles = data.filteredFiles || [];
                    
                    // Preserva ordenação e paginação atual
                    const currentPage = this.pagination.currentPage;
                    
                    // Re-renderiza a lista com arquivos filtrados (skipFilters = true)
                    this.renderFileList(true);
                    
                    // Tenta manter a página atual se possível
                    if (currentPage <= this.pagination.totalPages) {
                        this.pagination.currentPage = currentPage;
                    } else {
                        this.pagination.currentPage = 1;
                    }
                    
                    // Atualiza contadores visuais se o FilterManager estiver disponível
                    if (KC.FilterManager && typeof KC.FilterManager.updateCounters === 'function') {
                        KC.FilterManager.updateCounters();
                    }
                    
                    // Mostra seção de arquivos se estiver oculta
                    this.showFilesSection();
                });
            }

            // NOVO: Escuta evento CATEGORIES_CHANGED do CategoryManager
            if (Events && Events.CATEGORIES_CHANGED) {
                EventBus.on(Events.CATEGORIES_CHANGED, (data) => {
                    console.log('FileRenderer: Evento CATEGORIES_CHANGED recebido', data);
                    
                    // Atualiza lista de categorias em modais abertos
                    this.updateCategoryList();
                    
                    // Se a ação foi delete, re-renderiza arquivos para remover tags órfãs
                    if (data.action === 'deleted') {
                        this.renderFileList();
                    }
                });
            }
            
            // FASE 1.3 FIX: Escuta FILES_UPDATED para atualizar relevância com boost
            // AIDEV-NOTE: category-boost-render; re-renderiza quando categoria é aplicada
            if (Events && Events.FILES_UPDATED) {
                EventBus.on(Events.FILES_UPDATED, (data) => {
                    // Re-renderiza quando categoria é atribuída/removida
                    if (data.action === 'category_assigned' || 
                        data.action === 'category_removed' ||
                        data.action === 'bulk_categorization') {
                        console.log('FileRenderer: Re-renderizando após mudança de categoria', data);
                        
                        // Força re-leitura dos arquivos do AppState
                        const updatedFiles = AppState.get('files') || [];
                        this.files = [...updatedFiles];
                        this.originalFiles = [...updatedFiles];
                        
                        // Re-renderiza mantendo filtros e ordenação
                        this.renderFileList();
                    }
                    
                    // Atualiza informação de filtros
                    this.updateFilterInfo();
                });
            }
            
            // Escuta mudanças de filtros
            if (Events && Events.FILTERS_CHANGED) {
                EventBus.on(Events.FILTERS_CHANGED, () => {
                    this.updateFilterInfo();
                    this.updateButtonsVisibility();
                });
            }
            
            // Escuta mudanças no filtro de status
            if (Events && Events.FILTER_CHANGED) {
                EventBus.on(Events.FILTER_CHANGED, (data) => {
                    if (data.filter === 'status') {
                        this.updateButtonsVisibility();
                    }
                });
            }
        }

        /**
         * Configura o container padrão
         */
        setupContainer() {
            this.setContainer('files-container');
            // Carrega arquivos existentes do AppState
            this.loadExistingFiles();
        }

        /**
         * Carrega arquivos já descobertos do AppState
         */
        loadExistingFiles() {
            if (!AppState || typeof AppState.get !== 'function') {
                console.warn('FileRenderer: AppState não disponível ainda');
                return;
            }

            const existingFiles = AppState.get('files') || [];
            console.log(`FileRenderer: ${existingFiles.length} arquivos encontrados no AppState`);
            
            // AIDEV-NOTE: debug-file-categories; verificar categorias nos arquivos
            const filesWithCategories = existingFiles.filter(f => f.categories && f.categories.length > 0);
            console.log(`[FileRenderer] Arquivos com categorias: ${filesWithCategories.length}/${existingFiles.length}`);
            if (filesWithCategories.length > 0) {
                console.log('[FileRenderer] Exemplo de arquivo com categoria:', {
                    nome: filesWithCategories[0].name,
                    categorias: filesWithCategories[0].categories
                });
            }
            
            if (existingFiles.length > 0) {
                console.log(`FileRenderer: Carregando ${existingFiles.length} arquivos existentes`);
                
                // NOVO: Preserva originais e aplica exclusões apenas para exibição
                this.originalFiles = existingFiles;
                // SPRINT 1.3.1: Mantém TODOS os arquivos sem exclusões
                this.files = [...existingFiles];
                
                console.log(`FileRenderer: ${this.originalFiles.length} arquivos originais`);
                console.log(`FileRenderer: ${this.files.length} arquivos carregados`);
                
                this.renderFileList();
                this.showFilesSection();
            }
        }

        // REMOVIDO: método applySmartExclusions() - redundante com filtros da ETAPA 1

        /**
         * Define o container onde renderizar a lista
         */
        setContainer(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) {
                console.error(`FileRenderer: Container ${containerId} não encontrado`);
                return false;
            }
            return true;
        }

        /**
         * Renderiza a lista completa de arquivos com paginação
         */
        renderFileList(skipFilters = false) {
            // [DEBUG] Log para diagnóstico de renderização
            console.log('[DEBUG] FileRenderer.renderFileList:', {
                skipFilters,
                filesCount: this.files ? this.files.length : 0,
                filteredFilesCount: this.filteredFiles ? this.filteredFiles.length : 0,
                containerExists: !!this.container,
                containerVisible: this.container ? this.container.style.display : 'n/a'
            });
            
            if (!this.container) {
                console.warn('FileRenderer: Container não definido');
                // [DEBUG] Tenta encontrar e definir container automaticamente
                const container = document.getElementById('files-container');
                if (container) {
                    console.log('[DEBUG] FileRenderer: Container encontrado e definido automaticamente');
                    this.container = container;
                } else {
                    console.error('[DEBUG] FileRenderer: files-container não existe no DOM');
                    return;
                }
            }

            // REFATORADO: Sempre usa dados do FilterManager quando skipFilters=true
            if (!skipFilters) {
                // Compatibilidade: ainda chama applyFilters mas está desativado
                this.applyFilters();
            } else {
                console.log('FileRenderer: Usando dados filtrados do FilterManager');
            }
            
            // Sempre aplica ordenação
            this.applySorting();
            
            // Atualiza paginação
            this.updatePagination();

            // AIDEV-NOTE: filter-transparency; show filter info to user
            this.renderFilterInfo();

            // Limpa container
            this.container.innerHTML = '';
            
            // Renderiza controles de paginação no topo
            this.renderPaginationControls('top');

            // Verifica se há arquivos
            if (!this.filteredFiles || this.filteredFiles.length === 0) {
                this.renderEmptyState();
                return;
            }

            // Calcula arquivos da página atual
            const paginatedFiles = this.getPaginatedFiles();
            
            // Renderiza arquivos da página atual
            const filesList = document.createElement('div');
            filesList.className = 'files-list';
            
            paginatedFiles.forEach(file => {
                const fileElement = this.createFileElement(file);
                filesList.appendChild(fileElement);
            });
            
            this.container.appendChild(filesList);
            
            // Renderiza controles de paginação no final
            this.renderPaginationControls('bottom');
            
            // Atualiza barra de ações em lote
            this.updateBulkActionsBar();

            console.log(`FileRenderer: ${paginatedFiles.length} arquivos renderizados (página ${this.pagination.currentPage} de ${this.pagination.totalPages})`);
        }

        /**
         * Cria elemento HTML para um arquivo individual
         */
        createFileElement(file) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-entry';
            fileDiv.setAttribute('data-file-id', file.id || file.name);

            // Calcula relevância (placeholder por enquanto)
            const relevance = this.calculateRelevance(file);
            
            // Gera preview básico
            const preview = this.generatePreview(file);

            // ORIGINAL - Preservado para rollback
            /* fileDiv.innerHTML = `
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-path">${this.escapeHtml(file.relativePath || file.path || '')}</div>
                    <div class="file-preview">${this.escapeHtml(preview)}</div>
                </div>
                <div class="file-meta">
                    <div class="relevance-badge">Relevância: ${relevance}%</div>
                    <div class="file-date">${this.formatDate(file.lastModified)}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="file-actions">
                    <button class="action-btn primary" data-action="analyze">🔍 Analisar com IA</button>
                    <button class="action-btn secondary" data-action="view">👁️ Ver Conteúdo</button>
                    <button class="action-btn secondary" data-action="categorize">📂 Categorizar</button>
                    <button class="action-btn secondary" data-action="archive">📦 Arquivar</button>
                </div>
                <div class="file-categories">
                    ${this.renderFileCategories(file)}
                </div>
            `; */
            
            // NOVO - Estrutura com checkbox para seleção múltipla
            const fileId = file.id || file.name;
            const isSelected = this.selectedFiles.has(fileId);
            
            // Adiciona classe duplicata se necessário
            if (file.isDuplicate) {
                fileDiv.classList.add('duplicate-file');
            }
            if (file.isPrimaryDuplicate) {
                fileDiv.classList.add('primary-duplicate');
            }

            fileDiv.innerHTML = `
                <div class="file-main-content">
                    <input type="checkbox" 
                           class="file-select-checkbox" 
                           data-file-id="${fileId}"
                           ${isSelected ? 'checked' : ''}>
                    <div class="file-icon">📄</div>
                    <div class="file-info">
                        <div class="file-name">
                            ${this.escapeHtml(file.name)}
                            ${file.isDuplicate ? '<span class="duplicate-badge" title="Duplicata detectada">🔄</span>' : ''}
                            ${file.isPrimaryDuplicate ? '<span class="primary-badge" title="Arquivo principal">✓</span>' : ''}
                        </div>
                        <div class="file-path">${this.escapeHtml(file.relativePath || file.path || '')}</div>
                        <div class="file-preview">${this.escapeHtml(preview)}</div>
                        ${file.duplicateReason ? `<div class="duplicate-reason">${file.duplicateReason}</div>` : ''}
                    </div>
                    <div class="file-meta">
                        <div class="relevance-badge">
                            Relevância: ${relevance}%
                            ${file.categories && file.categories.length > 0 ? `
                                <span class="boost-indicator" style="color: #7c3aed; font-weight: bold; margin-left: 8px; font-size: 0.75rem;" 
                                      title="Boost aplicado: ${Math.round((1.5 + file.categories.length * 0.1 - 1) * 100)}% por ${file.categories.length} categoria(s)">
                                    🚀
                                </span>
                            ` : ''}
                        </div>
                        <div class="file-date">${this.formatDate(file.lastModified)}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                        ${file.duplicateConfidence ? `<div class="duplicate-confidence">Confiança: ${Math.round(file.duplicateConfidence * 100)}%</div>` : ''}
                    </div>
                    <div class="file-actions">
                        ${!file.archived ? `
                            <button class="action-btn primary" data-action="analyze">🔍 Analisar com IA</button>
                            <button class="action-btn secondary" data-action="view">👁️ Ver Conteúdo</button>
                            <button class="action-btn secondary" data-action="categorize">📂 Categorizar</button>
                            ${file.approved ? 
                                `<button class="action-btn danger" data-action="reject">❌ Rejeitar</button>` :
                                `<button class="action-btn success" data-action="approve">✅ Aprovar</button>`
                            }
                            <button class="action-btn secondary" data-action="archive">📦 Arquivar</button>
                        ` : `
                            <button class="action-btn secondary" data-action="view">👁️ Ver Conteúdo</button>
                            <span class="archived-badge">📦 Arquivado</span>
                        `}
                    </div>
                </div>
                <div class="file-categories">
                    ${file.analysisType ? `
                        <span class="analysis-type-tag" style="background: var(--primary-color); color: var(--text-inverse); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 500; margin-right: 8px;">
                            🏷️ ${file.analysisType}
                        </span>
                    ` : ''}
                    ${this.renderFileCategories(file)}
                </div>
            `;

            // Adiciona event listeners para os botões
            this.setupFileActions(fileDiv, file);
            
            // NOVO: Event listener para checkbox
            const checkbox = fileDiv.querySelector('.file-select-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.handleFileSelection(fileId, e.target.checked);
                });
            }

            // NOVO: Event listener para clique na linha inteira
            fileDiv.addEventListener('click', (e) => {
                // Verifica se o clique foi em um botão de ação ou no próprio checkbox
                const isActionButton = e.target.closest('.file-actions') || 
                                     e.target.closest('.action-btn') ||
                                     e.target.classList.contains('file-select-checkbox') ||
                                     e.target.closest('a'); // Links também não devem ativar
                
                if (!isActionButton && checkbox) {
                    // Toggle do checkbox
                    checkbox.checked = !checkbox.checked;
                    this.handleFileSelection(fileId, checkbox.checked);
                }
            });

            // Adiciona cursor pointer para indicar que a linha é clicável
            fileDiv.style.cursor = 'pointer';

            return fileDiv;
        }

        /**
         * Configura event listeners para ações do arquivo
         */
        setupFileActions(fileElement, file) {
            const buttons = fileElement.querySelectorAll('.action-btn');
            
            buttons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = button.getAttribute('data-action');
                    this.handleFileAction(action, file, button);
                });
            });
        }

        /**
         * Manipula ações dos botões de arquivo
         */
        handleFileAction(action, file, buttonElement) {
            console.log(`FileRenderer: Ação ${action} para arquivo ${file.name}`);

            switch (action) {
                case 'analyze':
                    this.analyzeFile(file, buttonElement);
                    break;
                case 'view':
                    this.viewFile(file, buttonElement);
                    break;
                case 'categorize':
                    this.categorizeFile(file, buttonElement);
                    break;
                case 'archive':
                    this.archiveFile(file, buttonElement);
                    break;
                case 'approve':
                    this.approveFile(file, buttonElement);
                    break;
                case 'reject':
                    this.rejectFile(file, buttonElement);
                    break;
                default:
                    console.warn(`FileRenderer: Ação desconhecida: ${action}`);
            }
        }

        /**
         * Inicia análise de arquivo com IA
         */
        // CLASSIFICAÇÃO DINÂMICA RESTAURADA - Sem IA real (IA apenas na Etapa 4)
        analyzeFile(file, buttonElement) {
            console.log(`FileRenderer: Iniciando análise IA para ${file.name}`);
            
            // Inicia progresso da análise
            EventBus.emit(Events.PROGRESS_START, {
                type: 'analysis',
                title: `Analisando ${file.name}...`,
                details: 'Processando conteúdo com IA',
                indeterminate: true
            });
            
            // Atualiza visual do botão
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.innerHTML = '⏳ Analisando...';
            }
            
            // Simula análise IA (será substituído por integração real)
            setTimeout(() => {
                // AIDEV-NOTE: separate-analyzed-approved; analyzed != approved
                // Marca arquivo como analisado mas NÃO como aprovado
                file.analyzed = true;
                file.analysisDate = new Date().toISOString();
                file.analysisType = this.detectAnalysisType(file);
                
                // FASE 1.3 FIX: Preservar boost de categorias ao analisar
                // AIDEV-NOTE: preserve-category-boost; análise IA não deve sobrescrever boost de categorias
                const hasCategories = file.categories && file.categories.length > 0;
                const currentScore = file.relevanceScore || 0;
                
                // Calcula novo score base (sem considerar categorias)
                const enhancedScore = this.calculateEnhancedRelevance(file);
                
                // Se tem categorias, re-aplica o boost sobre o novo score base
                if (hasCategories) {
                    const categoryBoost = 1.5 + (file.categories.length * 0.1);
                    file.relevanceScore = Math.min(100, enhancedScore * categoryBoost);
                    
                    KC.Logger?.info('FileRenderer', 'Boost de categorias preservado após análise', {
                        file: file.name,
                        categories: file.categories.length,
                        enhancedScore: Math.round(enhancedScore),
                        boostedScore: Math.round(file.relevanceScore),
                        boost: `${Math.round((categoryBoost - 1) * 100)}%`
                    });
                } else {
                    file.relevanceScore = enhancedScore;
                }
                // file.approved mantém seu estado atual (não altera)
                
                // Atualiza AppState
                const allFiles = AppState.get('files') || [];
                const fileIndex = allFiles.findIndex(f => f.id === file.id || f.name === file.name);
                if (fileIndex !== -1) {
                    allFiles[fileIndex] = { ...allFiles[fileIndex], ...file };
                    AppState.set('files', allFiles);
                }
                
                // Finaliza progresso da análise
                EventBus.emit(Events.PROGRESS_END, {
                    type: 'analysis',
                    title: 'Análise concluída!',
                    details: `${file.analysisType} - Relevância: ${Math.round(file.relevanceScore)}%`
                });
                
                // Notifica sucesso
                KC.showNotification({
                    type: 'success',
                    message: `✅ Análise concluída: ${file.name}`,
                    details: `Tipo: ${file.analysisType}, Relevância: ${Math.round(file.relevanceScore)}%${hasCategories ? ` (com boost de ${Math.round((1.5 + file.categories.length * 0.1 - 1) * 100)}%)` : ''}`
                });
                
                // Restaura botão
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = '✅ Analisado';
                    buttonElement.classList.add('analyzed');
                }
                
                // Atualiza estatísticas
                if (KC.StatsPanel && KC.StatsManager) {
                    KC.StatsPanel.updateStats(KC.StatsManager.getStats());
                }
                
                // AIDEV-NOTE: update-counters-after-analysis; sync filter counters
                // Força atualização dos contadores nos filtros
                if (KC.FilterPanel) {
                    KC.FilterPanel.updateAllCounters(allFiles);
                }
                
                // AIDEV-NOTE: emit-events-for-sync; ensure all components update
                EventBus.emit(Events.STATE_CHANGED, {
                    key: 'files',
                    newValue: allFiles,
                    oldValue: allFiles
                });
                EventBus.emit(Events.FILES_UPDATED, {
                    action: 'analyze',
                    fileId: file.id
                });
                
            }, 2000); // Simula 2s de processamento
        }
        
        /* VERSÃO COM IA REAL - DESATIVADA (usar apenas na Etapa 4)
        analyzeFile_withRealAI(file, buttonElement) {
            console.log(`FileRenderer: Iniciando análise IA para ${file.name}`);
            
            // Verifica se AnalysisManager está disponível
            if (KC.AnalysisManager) {
                // Usa AnalysisManager real
                KC.AnalysisManager.addToQueue([file]);
                
                // Atualiza visual do botão
                if (buttonElement) {
                    buttonElement.disabled = true;
                    buttonElement.innerHTML = '⏳ Na fila...';
                }
                
                // Escuta conclusão da análise para este arquivo
                const handler = (data) => {
                    if (data.file.id === file.id || data.file.name === file.name) {
                        // Remove listener
                        EventBus.off(Events.ANALYSIS_ITEM_COMPLETED, handler);
                        
                        // Atualiza botão
                        if (buttonElement) {
                            buttonElement.disabled = false;
                            buttonElement.innerHTML = '✅ Analisado';
                            buttonElement.classList.add('analyzed');
                        }
                        
                        // Atualiza estatísticas
                        if (KC.StatsManager) {
                            KC.StatsManager.calculateInitialStats();
                        }
                    }
                };
                
                EventBus.on(Events.ANALYSIS_ITEM_COMPLETED, handler);
                
            } else {
                // Fallback: Simula análise IA
                // Inicia progresso da análise
                EventBus.emit(Events.PROGRESS_START, {
                    type: 'analysis',
                    title: `Analisando ${file.name}...`,
                    details: 'Processando conteúdo com IA',
                    indeterminate: true
                });
                
                // Atualiza visual do botão
                if (buttonElement) {
                    buttonElement.disabled = true;
                    buttonElement.innerHTML = '⏳ Analisando...';
                }
                
                // Simula análise IA (será substituído por integração real)
                setTimeout(async () => {
                    // Re-lê conteúdo do arquivo se necessário para análise
                    if (!file.content && file.handle) {
                        try {
                            const fileData = await file.handle.getFile();
                            file.content = await fileData.text();
                        } catch (error) {
                            console.warn('Erro ao ler conteúdo para análise:', error);
                            file.content = '';
                        }
                    }
                    
                    // Marca arquivo como analisado
                    file.analyzed = true;
                    file.analysisDate = new Date().toISOString();
                    file.analysisType = this.detectAnalysisType(file);
                    file.relevanceScore = this.calculateEnhancedRelevance(file);
                    
                    // Atualiza AppState
                    const allFiles = AppState.get('files') || [];
                    const fileIndex = allFiles.findIndex(f => f.id === file.id || f.name === file.name);
                    if (fileIndex !== -1) {
                        allFiles[fileIndex] = { ...allFiles[fileIndex], ...file };
                        AppState.set('files', allFiles);
                    }
                    
                    // Finaliza progresso da análise
                    EventBus.emit(Events.PROGRESS_END, {
                        type: 'analysis',
                        title: 'Análise concluída!',
                        details: `${file.analysisType} - Relevância: ${Math.round(file.relevanceScore * 100)}%`
                    });
                    
                    // Notifica sucesso
                    KC.showNotification({
                        type: 'success',
                        message: `✅ Análise concluída: ${file.name}`,
                        details: `Tipo: ${file.analysisType}, Relevância: ${Math.round(file.relevanceScore * 100)}%`
                    });
                    
                    // Restaura botão
                    if (buttonElement) {
                        buttonElement.disabled = false;
                        buttonElement.innerHTML = '✅ Analisado';
                        buttonElement.classList.add('analyzed');
                    }
                    
                    // CORREÇÃO: Remove chamada duplicada - STATE_CHANGED já cuida da renderização
                    // this.renderFileList(); // Removido para evitar dupla renderização
                    
                    // Atualiza estatísticas
                    if (KC.StatsPanel && KC.StatsManager) {
                        KC.StatsPanel.updateStats(KC.StatsManager.getStats());
                    }
                    
                }, 2000); // Simula 2s de processamento
            }
        }
        */

        /**
         * Exibe conteúdo do arquivo em modal
         */
        viewFile(file, buttonElement) {
            console.log(`FileRenderer: Abrindo visualização de ${file.name}`);
            
            // Cria modal de visualização
            const modal = this.createViewModal(file);
            document.body.appendChild(modal);
            
            // Mostra modal
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Registra visualização
            file.lastViewed = new Date().toISOString();
            if (!file.viewCount) file.viewCount = 0;
            file.viewCount++;
        }

        /**
         * Abre modal de categorização do arquivo
         */
        categorizeFile(file, buttonElement) {
            console.log(`FileRenderer: Abrindo categorização de ${file.name}`);
            
            // Cria modal de categorização
            const modal = this.createCategoryModal(file);
            document.body.appendChild(modal);
            
            // Mostra modal
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }

        /**
         * Arquiva arquivo
         */
        archiveFile(file, buttonElement) {
            console.log(`FileRenderer: Arquivando ${file.name}`);
            
            // Cria modal de confirmação mais sofisticado
            const modal = this.createArchiveModal(file);
            document.body.appendChild(modal);
            
            // Mostra modal
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
        
        /**
         * Executa o arquivamento do arquivo
         */
        executeArchive(file) {
            // Marca como arquivado
            file.archived = true;
            file.archivedDate = new Date().toISOString();
            
            // Atualiza AppState
            const allFiles = AppState.get('files') || [];
            const fileIndex = allFiles.findIndex(f => f.id === file.id || f.name === file.name);
            if (fileIndex !== -1) {
                allFiles[fileIndex] = { ...allFiles[fileIndex], ...file };
                AppState.set('files', allFiles);
            }
            
            // Notifica sucesso
            KC.showNotification({
                type: 'info',
                message: `📦 Arquivo arquivado: ${file.name}`,
                details: 'Use o filtro "Arquivados" para visualizar arquivos arquivados'
            });
            
            // CORREÇÃO: Remove chamada duplicada - STATE_CHANGED já cuida da renderização
            // this.renderFileList(); // Removido para evitar dupla renderização
            
            // Atualiza estatísticas
            if (KC.StatsPanel && KC.StatsManager) {
                KC.StatsPanel.updateStats(KC.StatsManager.getStats());
            }
        }

        /**
         * Aprova um arquivo para processamento
         */
        approveFile(file, buttonElement) {
            console.log(`FileRenderer: Aprovando ${file.name}`);
            
            // Marca como aprovado
            file.approved = true;
            file.approvedDate = new Date().toISOString();
            
            // Atualiza AppState
            const allFiles = AppState.get('files') || [];
            const fileIndex = allFiles.findIndex(f => f.id === file.id || f.name === file.name);
            if (fileIndex !== -1) {
                allFiles[fileIndex] = { ...allFiles[fileIndex], ...file };
                AppState.set('files', allFiles);
            }
            
            // Notifica sucesso
            KC.showNotification({
                type: 'success',
                message: `✅ Arquivo aprovado: ${file.name}`,
                details: 'O arquivo será incluído no processamento RAG'
            });
            
            // Emite eventos
            EventBus.emit(Events.STATE_CHANGED, {
                key: 'files',
                newValue: allFiles,
                oldValue: allFiles
            });
            EventBus.emit(Events.FILES_UPDATED, {
                action: 'approve',
                fileId: file.id
            });
            
            // Atualiza estatísticas
            if (KC.StatsPanel && KC.StatsManager) {
                KC.StatsPanel.updateStats(KC.StatsManager.getStats());
            }
            
            // AIDEV-NOTE: force-filter-update; ensure counters update
            // Força atualização dos contadores nos filtros
            if (KC.FilterPanel) {
                KC.FilterPanel.updateAllCounters(allFiles);
            }
        }

        /**
         * Rejeita um arquivo, removendo-o do processamento
         */
        rejectFile(file, buttonElement) {
            console.log(`FileRenderer: Rejeitando ${file.name}`);
            
            // Marca como rejeitado
            file.approved = false;
            file.rejectedDate = new Date().toISOString();
            
            // Atualiza AppState
            const allFiles = AppState.get('files') || [];
            const fileIndex = allFiles.findIndex(f => f.id === file.id || f.name === file.name);
            if (fileIndex !== -1) {
                allFiles[fileIndex] = { ...allFiles[fileIndex], ...file };
                AppState.set('files', allFiles);
            }
            
            // Notifica sucesso
            KC.showNotification({
                type: 'warning',
                message: `❌ Arquivo rejeitado: ${file.name}`,
                details: 'O arquivo não será incluído no processamento'
            });
            
            // Emite eventos
            EventBus.emit(Events.STATE_CHANGED, {
                key: 'files',
                newValue: allFiles,
                oldValue: allFiles
            });
            EventBus.emit(Events.FILES_UPDATED, {
                action: 'reject',
                fileId: file.id
            });
            
            // Atualiza estatísticas
            if (KC.StatsPanel && KC.StatsManager) {
                KC.StatsPanel.updateStats(KC.StatsManager.getStats());
            }
        }

        /**
         * Calcula relevância do arquivo integrando com PreviewUtils
         */
        calculateRelevance(file) {
            // 1. Prioridade: relevância já calculada pelo DiscoveryManager/PreviewUtils
            if (file.relevanceScore !== undefined && file.relevanceScore !== null) {
                // relevanceScore pode vir como decimal (0-1) ou porcentagem
                const score = file.relevanceScore > 1 ? file.relevanceScore : file.relevanceScore * 100;
                return Math.round(score);
            }
            
            // 2. Se tem preview com score de relevância
            if (file.preview && file.preview.relevanceScore !== undefined) {
                return Math.round(file.preview.relevanceScore);
            }
            
            // 3. Tenta calcular usando PreviewUtils se disponível
            if (KC.PreviewUtils && file.content) {
                try {
                    const keywords = AppState.get('configuration.preAnalysis.keywords') || [];
                    const preview = KC.PreviewUtils.extractSmartPreview(file.content, {
                        keywords: keywords
                    });
                    if (preview && preview.relevanceScore) {
                        return Math.round(preview.relevanceScore);
                    }
                } catch (error) {
                    console.warn('Erro ao calcular relevância com PreviewUtils:', error);
                }
            }
            
            // 4. Fallback: Cálculo básico baseado em keywords do PRD
            const searchText = (file.content || file.name || '').toLowerCase();
            let score = 25; // Base moderada
            
            // Keywords do PRD e configuradas
            const defaultKeywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
            const userKeywords = AppState.get('configuration.preAnalysis.keywords') || [];
            const allKeywords = [...new Set([...defaultKeywords, ...userKeywords])];
            
            // Conta ocorrências de keywords
            let keywordMatches = 0;
            allKeywords.forEach(keyword => {
                if (keyword && searchText.includes(keyword.toLowerCase())) {
                    keywordMatches++;
                    score += 10; // +10% por keyword encontrada
                }
            });
            
            // Bonus por múltiplas keywords
            if (keywordMatches > 3) score += 15;
            if (keywordMatches > 5) score += 10;
            
            // Ajuste por tipo de arquivo
            const extension = file.name.split('.').pop().toLowerCase();
            if (['md', 'txt', 'doc', 'docx'].includes(extension)) score += 5;
            
            // Garante range 0-100
            return Math.min(Math.max(Math.round(score), 0), 100);
        }

        /**
         * Gera preview do arquivo usando dados extraídos
         */
        generatePreview(file) {
            // NOVO: Se tem preview extraído pelo PreviewUtils, usa ele
            if (file.preview && typeof file.preview === 'string' && file.preview.length > 0) {
                // Preview já vem formatado do DiscoveryManager
                return file.preview.substring(0, 200) + (file.preview.length > 200 ? '...' : '');
            }
            
            // Se tem smartPreview estruturado (caso antigo)
            if (file.smartPreview && KC.PreviewUtils) {
                const preview = KC.PreviewUtils.getTextPreview(file.smartPreview);
                return preview.substring(0, 200) + (preview.length > 200 ? '...' : '');
            }
            
            // Se tem conteúdo bruto, gera preview básico
            if (file.content) {
                const content = file.content.substring(0, 150);
                return content.replace(/\n/g, ' ').trim() + '...';
            }
            
            // Preview padrão mais informativo baseado no tipo de arquivo
            const ext = file.name.split('.').pop().toLowerCase();
            const typeMessages = {
                'md': 'Documento Markdown - Clique para visualizar',
                'txt': 'Arquivo de texto - Clique para visualizar',
                'js': 'Código JavaScript - Clique para visualizar',
                'json': 'Dados JSON - Clique para visualizar',
                'html': 'Página HTML - Clique para visualizar',
                'css': 'Estilos CSS - Clique para visualizar'
            };
            
            return typeMessages[ext] || `Arquivo ${ext.toUpperCase()} - Clique para visualizar`;
        }

        /**
         * REFATORADO: Filtros movidos para FilterManager (Single Source of Truth)
         * FileRenderer agora apenas renderiza dados já filtrados
         */
        applyFilters() {
            // DESATIVADO: Não aplica filtros locais para evitar conflito
            // this.filteredFiles vem do FilterManager via evento FILES_FILTERED
            console.log('FileRenderer: applyFilters() desativado - usando dados do FilterManager');
            
            // Se não recebeu dados filtrados ainda, usa todos os arquivos
            if (!this.filteredFiles || this.filteredFiles.length === 0) {
                this.filteredFiles = this.files || [];
            }
        }

        /**
         * Renderiza informações sobre filtros ativos
         * @private
         */
        renderFilterInfo() {
            // AIDEV-NOTE: filter-info-display; transparency about active filters
            const filterSection = document.querySelector('.filter-section');
            if (!filterSection) return;

            // Remove info anterior se existir
            const existingInfo = filterSection.querySelector('.filter-info');
            if (existingInfo) {
                existingInfo.remove();
            }

            const totalFiles = this.files?.length || 0;
            const filteredFiles = this.filteredFiles?.length || 0;
            
            // Conta filtros ativos
            let activeFilters = 0;
            const filterManager = KC.FilterManager;
            
            if (filterManager) {
                const filters = filterManager.filters;
                
                // Verifica relevância
                Object.values(filters.relevance || {}).forEach(f => {
                    if (f.active && f.threshold > 0) activeFilters++;
                });
                
                // Verifica tempo
                Object.values(filters.time || {}).forEach(f => {
                    if (f.active && f.range !== 'all') activeFilters++;
                });
                
                // Verifica tamanho
                Object.values(filters.size || {}).forEach(f => {
                    if (f.active && f !== filters.size.all) activeFilters++;
                });
                
                // Verifica tipo
                Object.values(filters.fileType || {}).forEach(f => {
                    if (f.active && f !== filters.fileType.all) activeFilters++;
                });
            }

            // Cria elemento de info
            const infoDiv = document.createElement('div');
            infoDiv.className = 'filter-info';
            infoDiv.innerHTML = `
                <div class="filter-info-content">
                    <span class="filter-info-text">
                        Exibindo <strong>${filteredFiles}</strong> de <strong>${totalFiles}</strong> arquivos
                        ${activeFilters > 0 ? `<span class="filter-info-active">(${activeFilters} filtros ativos)</span>` : ''}
                    </span>
                    ${filteredFiles < totalFiles ? `
                        <button class="filter-info-clear" onclick="KC.FilterManager.clearAllFilters()">
                            ✕ Limpar filtros
                        </button>
                    ` : ''}
                </div>
            `;

            // Adiciona após os controles de filtro
            const filterControls = filterSection.querySelector('.filter-controls');
            if (filterControls) {
                filterControls.appendChild(infoDiv);
            }
        }

        /**
         * Aplica ordenação aos arquivos filtrados
         */
        applySorting() {
            if (!this.filteredFiles) return;

            this.filteredFiles.sort((a, b) => {
                switch (this.currentSort) {
                    case 'relevance':
                        return this.calculateRelevance(b) - this.calculateRelevance(a);
                    case 'date':
                        return new Date(b.lastModified) - new Date(a.lastModified);
                    case 'size':
                        return (b.size || 0) - (a.size || 0);
                    case 'name':
                        return a.name.localeCompare(b.name);
                    default:
                        return 0;
                }
            });
        }

        /**
         * Renderiza estado vazio
         */
        renderEmptyState() {
            const filterManager = KC.FilterManager;
            const activeFilters = filterManager?.getActiveFilters() || {};
            const originalCount = this.originalFiles?.length || 0;
            
            let icon = '📁';
            let message = 'Nenhum arquivo encontrado';
            let suggestion = 'Configure a descoberta de arquivos para começar a análise.';
            
            // Mensagens específicas baseadas nos filtros ativos
            if (originalCount > 0) {
                // Tem arquivos, mas foram filtrados
                if (activeFilters.status === 'approved') {
                    icon = '✅';
                    message = 'Nenhum arquivo aprovado';
                    suggestion = 'Você precisa aprovar alguns arquivos na Etapa 3 antes de filtrar por aprovados.';
                } else if (activeFilters.status === 'archived') {
                    icon = '📦';
                    message = 'Nenhum arquivo arquivado';
                    suggestion = 'Você ainda não arquivou nenhum arquivo. Use o botão "Arquivar" nos arquivos que deseja guardar.';
                } else if (activeFilters.relevance) {
                    icon = '📊';
                    message = 'Nenhum arquivo com a relevância selecionada';
                    suggestion = `Tente reduzir o filtro de relevância (atualmente ${activeFilters.relevance}%) ou analise mais arquivos.`;
                } else if (activeFilters.type && activeFilters.type.length > 0) {
                    icon = '📄';
                    message = 'Nenhum arquivo do tipo selecionado';
                    suggestion = `Não há arquivos ${activeFilters.type.join(', ')} na sua seleção atual.`;
                } else if (activeFilters.time) {
                    icon = '📅';
                    message = 'Nenhum arquivo no período selecionado';
                    suggestion = 'Tente expandir o período de tempo ou verificar as datas dos arquivos.';
                } else {
                    icon = '🔍';
                    message = 'Nenhum arquivo corresponde aos filtros';
                    suggestion = 'Tente ajustar ou remover alguns filtros para ver mais resultados.';
                }
                
                // Adiciona contagem original
                suggestion += ` (${originalCount} arquivo${originalCount > 1 ? 's' : ''} no total)`;
            }
            
            this.container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${icon}</div>
                    <h3>${message}</h3>
                    <p>${suggestion}</p>
                    ${originalCount > 0 ? `
                        <button class="btn btn-secondary" onclick="KC.FilterPanel?.resetAllFilters()">
                            🔄 Limpar Todos os Filtros
                        </button>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Formata data para exibição
         */
        formatDate(timestamp) {
            if (!timestamp) return 'Data desconhecida';
            
            const date = new Date(timestamp);
            return date.toLocaleDateString('pt-BR');
        }

        /**
         * Formata tamanho do arquivo
         */
        formatFileSize(bytes) {
            if (!bytes) return 'Tamanho desconhecido';
            
            if (bytes < 1024) return bytes + 'B';
            if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
            return Math.round(bytes / (1024 * 1024)) + 'MB';
        }

        /**
         * Escapa HTML para evitar XSS
         */
        escapeHtml(text) {
            if (!text) return '';
            
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /**
         * Mostra seção de arquivos quando há descobertas
         */
        showFilesSection() {
            const filesSection = document.getElementById('files-section');
            const filterSection = document.getElementById('filter-section');
            
            // [DEBUG] Log do estado da seção
            console.log('[DEBUG] FileRenderer.showFilesSection:', {
                filesSectionExists: !!filesSection,
                currentDisplay: filesSection ? filesSection.style.display : 'n/a',
                containerExists: !!this.container
            });
            
            if (filesSection) {
                filesSection.style.display = 'block';
                console.log('FileRenderer: Seção de arquivos exibida');
            }
            
            // NOVO: Também mostra a seção de filtros quando há arquivos
            if (filterSection && this.files.length > 0) {
                filterSection.style.display = 'block';
                console.log('FileRenderer: Seção de filtros exibida');
            }
        }


        /**
         * Atualiza dados de paginação
         */
        updatePagination() {
            this.pagination.totalItems = this.filteredFiles.length;
            this.pagination.totalPages = Math.ceil(this.pagination.totalItems / this.pagination.itemsPerPage);
            
            // Ajusta página atual se necessário
            if (this.pagination.currentPage > this.pagination.totalPages) {
                this.pagination.currentPage = Math.max(1, this.pagination.totalPages);
            }
        }
        
        /**
         * Obtém arquivos da página atual
         */
        getPaginatedFiles() {
            const startIndex = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
            const endIndex = startIndex + this.pagination.itemsPerPage;
            return this.filteredFiles.slice(startIndex, endIndex);
        }
        
        /**
         * Renderiza controles de paginação
         */
        renderPaginationControls(position) {
            const paginationDiv = document.createElement('div');
            paginationDiv.className = `pagination-controls pagination-${position}`;
            
            // Seletor de itens por página
            const itemsPerPageDiv = document.createElement('div');
            itemsPerPageDiv.className = 'items-per-page';
            itemsPerPageDiv.innerHTML = `
                <label>Registros por página:</label>
                <select id="items-per-page-${position}" onchange="KC.FileRenderer.changeItemsPerPage(this.value)">
                    ${this.pageOptions.map(option => 
                        `<option value="${option}" ${option === this.pagination.itemsPerPage ? 'selected' : ''}>${option}</option>`
                    ).join('')}
                </select>
            `;
            
            // Informações de paginação
            const infoDiv = document.createElement('div');
            infoDiv.className = 'pagination-info';
            const startItem = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage + 1;
            const endItem = Math.min(startItem + this.pagination.itemsPerPage - 1, this.pagination.totalItems);
            infoDiv.textContent = `Mostrando ${startItem}-${endItem} de ${this.pagination.totalItems} registros`;
            
            // Controles de navegação
            const navDiv = document.createElement('div');
            navDiv.className = 'pagination-nav';
            
            // Botão primeira página
            const firstBtn = document.createElement('button');
            firstBtn.textContent = '<<';
            firstBtn.disabled = this.pagination.currentPage === 1;
            firstBtn.onclick = () => this.goToPage(1);
            
            // Botão página anterior
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '<';
            prevBtn.disabled = this.pagination.currentPage === 1;
            prevBtn.onclick = () => this.goToPage(this.pagination.currentPage - 1);
            
            // Números das páginas
            const pageNumbers = this.getPageNumbers();
            const pageNumbersSpan = document.createElement('span');
            pageNumbersSpan.className = 'page-numbers';
            
            pageNumbers.forEach(page => {
                if (page === '...') {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.className = 'ellipsis';
                    pageNumbersSpan.appendChild(ellipsis);
                } else {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = page;
                    pageBtn.className = page === this.pagination.currentPage ? 'current' : '';
                    pageBtn.onclick = () => this.goToPage(page);
                    pageNumbersSpan.appendChild(pageBtn);
                }
            });
            
            // Botão próxima página
            const nextBtn = document.createElement('button');
            nextBtn.textContent = '>';
            nextBtn.disabled = this.pagination.currentPage === this.pagination.totalPages;
            nextBtn.onclick = () => this.goToPage(this.pagination.currentPage + 1);
            
            // Botão última página
            const lastBtn = document.createElement('button');
            lastBtn.textContent = '>>';
            lastBtn.disabled = this.pagination.currentPage === this.pagination.totalPages;
            lastBtn.onclick = () => this.goToPage(this.pagination.totalPages);
            
            // Monta navegação
            navDiv.appendChild(firstBtn);
            navDiv.appendChild(prevBtn);
            navDiv.appendChild(pageNumbersSpan);
            navDiv.appendChild(nextBtn);
            navDiv.appendChild(lastBtn);
            
            // Monta controle completo
            paginationDiv.appendChild(itemsPerPageDiv);
            paginationDiv.appendChild(infoDiv);
            paginationDiv.appendChild(navDiv);
            
            this.container.appendChild(paginationDiv);
        }
        
        /**
         * Gera números de páginas para exibição
         */
        getPageNumbers() {
            const current = this.pagination.currentPage;
            const total = this.pagination.totalPages;
            const numbers = [];
            
            if (total <= 7) {
                // Mostra todas as páginas se forem poucas
                for (let i = 1; i <= total; i++) {
                    numbers.push(i);
                }
            } else {
                // Lógica para muitas páginas
                numbers.push(1);
                
                if (current > 4) {
                    numbers.push('...');
                }
                
                const start = Math.max(2, current - 1);
                const end = Math.min(total - 1, current + 1);
                
                for (let i = start; i <= end; i++) {
                    if (i !== 1 && i !== total) {
                        numbers.push(i);
                    }
                }
                
                if (current < total - 3) {
                    numbers.push('...');
                }
                
                if (total > 1) {
                    numbers.push(total);
                }
            }
            
            return numbers;
        }
        
        /**
         * Navega para uma página específica
         */
        goToPage(page) {
            if (page >= 1 && page <= this.pagination.totalPages) {
                this.pagination.currentPage = page;
                this.renderFileList();
            }
        }
        
        /**
         * Altera quantidade de itens por página
         */
        changeItemsPerPage(newValue) {
            this.pagination.itemsPerPage = parseInt(newValue);
            this.pagination.currentPage = 1; // Volta para primeira página
            this.renderFileList();
        }
        
        /**
         * Detecta tipo de análise do arquivo (conforme PRD)
         */
        // CLASSIFICAÇÃO DINÂMICA RESTAURADA - Baseada em keywords
        detectAnalysisType(file) {
            const fileName = (file.name || '').toLowerCase();
            const content = (file.content || '').toLowerCase();
            const combined = fileName + ' ' + content;
            
            // Tipos conforme PRD (vcia_dhl.txt)
            if (combined.includes('solução') || combined.includes('configuração') || combined.includes('arquitetura')) {
                return 'Breakthrough Técnico';
            }
            
            if (combined.includes('entendimento') || combined.includes('perspectiva') || combined.includes('visão')) {
                return 'Evolução Conceitual';
            }
            
            if (combined.includes('decisão') || combined.includes('escolha') || combined.includes('direção')) {
                return 'Momento Decisivo';
            }
            
            if (combined.includes('insight') || combined.includes('transformação') || combined.includes('breakthrough')) {
                return 'Insight Estratégico';
            }
            
            return 'Aprendizado Geral';
        }
        
        /* VERSÃO COM FONTE ÚNICA - DESATIVADA (mantendo classificação local)
        detectAnalysisType_withManager(file) {
            // Delega para o AnalysisTypesManager (Single Source of Truth)
            if (KC.AnalysisTypesManager && KC.AnalysisTypesManager.detectType) {
                return KC.AnalysisTypesManager.detectType(file);
            }
            
            // Fallback se o manager não estiver disponível
            console.warn('AnalysisTypesManager não disponível, usando detecção local');
            return 'Aprendizado Geral';
        }
        */

        /**
         * Calcula relevância aprimorada pós-análise
         */
        // CLASSIFICAÇÃO DINÂMICA RESTAURADA
        calculateEnhancedRelevance(file) {
            // FASE 1.3 FIX: Usa score base sem boost de categorias
            // AIDEV-NOTE: base-score-only; retorna apenas score base para análise IA
            let baseScore = 0;
            
            // Se já tem relevanceScore, remove o boost de categorias para obter base
            if (file.relevanceScore !== undefined && file.relevanceScore !== null) {
                if (file.categories && file.categories.length > 0) {
                    // Remove boost reverso: score_base = score_atual / boost
                    const categoryBoost = 1.5 + (file.categories.length * 0.1);
                    baseScore = file.relevanceScore / categoryBoost;
                } else {
                    baseScore = file.relevanceScore;
                }
            } else {
                // Calcula do zero se não tem score
                baseScore = this.calculateRelevance(file);
            }
            
            // Normaliza para 0-1 se necessário
            if (baseScore > 1) {
                baseScore = baseScore / 100;
            }
            
            // Ajustes baseados no tipo de análise
            switch (file.analysisType) {
                case 'Evolução Conceitual':
                    baseScore = Math.min(baseScore + 0.25, 1.0);
                    break;
                case 'Momento Decisivo':
                case 'Breakthrough Técnico':
                    baseScore = Math.min(baseScore + 0.20, 1.0);
                    break;
                case 'Insight Estratégico':
                    baseScore = Math.min(baseScore + 0.15, 1.0);
                    break;
                default:
                    baseScore = Math.min(baseScore + 0.05, 1.0);
            }
            
            // Retorna como percentual (0-100)
            return baseScore * 100;
        }
        
        /* VERSÃO COM FONTE ÚNICA - DESATIVADA
        calculateEnhancedRelevance_withManager(file) {
            let score = this.calculateRelevance(file) / 100; // Converte para 0-1
            
            // Usa AnalysisTypesManager para obter boost correto
            if (KC.AnalysisTypesManager && KC.AnalysisTypesManager.getRelevanceBoost) {
                const boost = KC.AnalysisTypesManager.getRelevanceBoost(file.analysisType);
                score = Math.min(score + boost, 1.0);
            } else {
                // Fallback: boost padrão
                console.warn('AnalysisTypesManager não disponível para boost de relevância');
                score = Math.min(score + 0.05, 1.0);
            }
            
            return score;
        }
        */

        /**
         * Cria modal de visualização de conteúdo
         */
        createViewModal(file) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content view-modal">
                    <div class="modal-header">
                        <h3>📄 ${this.escapeHtml(file.name)}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="file-metadata">
                            <div class="metadata-row">
                                <span class="label">Caminho:</span>
                                <span class="value">${this.escapeHtml(file.path || file.relativePath || 'N/A')}</span>
                            </div>
                            <div class="metadata-row">
                                <span class="label">Tamanho:</span>
                                <span class="value">${this.formatFileSize(file.size)}</span>
                            </div>
                            <div class="metadata-row">
                                <span class="label">Modificado:</span>
                                <span class="value">${this.formatDate(file.lastModified)}</span>
                            </div>
                            <div class="metadata-row">
                                <span class="label">Relevância:</span>
                                <span class="value">${this.calculateRelevance(file)}%</span>
                            </div>
                            ${file.analysisType ? `
                                <div class="metadata-row">
                                    <span class="label">Tipo de Análise:</span>
                                    <span class="value analysis-type">${file.analysisType}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="file-content">
                            <h4>Conteúdo (Preview):</h4>
                            <div class="content-preview">
                                ${this.generateExpandedPreview(file)}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
                        ${!file.analyzed ? `
                            <button class="btn btn-primary" onclick="KC.FileRenderer.analyzeFromModal('${file.id || file.name}', this)">
                                🔍 Analisar com IA
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Evento para fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            return modal;
        }

        /**
         * Cria modal de categorização
         */
        createCategoryModal(file) {
            const categories = this.getAvailableCategories();
            const currentCategories = file.categories || [];
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content category-modal">
                    <div class="modal-header">
                        <h3>📂 Categorizar: ${this.escapeHtml(file.name)}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="category-section">
                            <h4>Categorias Disponíveis:</h4>
                            <div class="category-list">
                                ${categories.map(cat => `
                                    <label class="category-option">
                                        <input type="checkbox" 
                                               value="${cat.id}" 
                                               ${currentCategories.includes(cat.id) ? 'checked' : ''}>
                                        <span class="category-badge" style="background-color: ${cat.color}">
                                            ${cat.name}
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="new-category-section">
                            <h4>Nova Categoria:</h4>
                            <div class="new-category-form">
                                <input type="text" 
                                       id="new-category-name" 
                                       placeholder="Nome da categoria"
                                       maxlength="30">
                                <select id="new-category-color">
                                    <option value="#4f46e5">Azul</option>
                                    <option value="#059669">Verde</option>
                                    <option value="#dc2626">Vermelho</option>
                                    <option value="#d97706">Laranja</option>
                                    <option value="#7c3aed">Roxo</option>
                                    <option value="#be185d">Rosa</option>
                                </select>
                                <button class="btn btn-secondary" onclick="KC.FileRenderer.addNewCategory()">
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                        <button class="btn btn-primary" onclick="KC.FileRenderer.saveCategories('${file.id || file.name}', this)">
                            Salvar Categorias
                        </button>
                    </div>
                </div>
            `;
            
            // Evento para fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            return modal;
        }

        /**
         * Gera preview expandido para modal
         */
        generateExpandedPreview(file) {
            if (file.content) {
                // Limita a 2000 caracteres para performance
                const content = file.content.substring(0, 2000);
                return content.replace(/\n/g, '<br>');
            }
            
            // Se o conteúdo foi removido para economizar espaço (localStorage compression),
            // tenta usar smartPreview ou preview disponível
            if (file.smartPreview && file.smartPreview.segments) {
                const segments = file.smartPreview.segments;
                let reconstructedContent = '';
                
                if (segments.opening) reconstructedContent += segments.opening + '\n\n';
                if (segments.secondParagraph) reconstructedContent += segments.secondParagraph + '\n\n';
                if (segments.beforeColon) reconstructedContent += segments.beforeColon + '\n';
                if (segments.colonPhrase) reconstructedContent += segments.colonPhrase + '\n';
                if (segments.afterColon) reconstructedContent += segments.afterColon + '\n\n';
                
                if (reconstructedContent.trim()) {
                    return reconstructedContent.replace(/\n/g, '<br>');
                }
            }
            
            // Se tem preview básico salvo, usa ele
            if (file.preview) {
                return file.preview.replace(/\n/g, '<br>');
            }
            
            // Último fallback: mensagem informativa 
            return `<div style="color: #666; font-style: italic; text-align: center; padding: 20px;">
                📄 Conteúdo não disponível em cache<br>
                <small>O conteúdo foi removido para economizar memória. Use "🔍 Analisar com IA" para reprocessar o arquivo.</small>
            </div>`;
        }

        /**
         * Renderiza categorias do arquivo como tags coloridas
         * @param {Object} file - Arquivo com categorias
         * @returns {string} HTML das categorias coloridas
         */
        renderFileCategories(file) {
            // Verifica se o arquivo tem categorias
            if (!file.categories || file.categories.length === 0) {
                return '<div class="no-categories">Sem categorias</div>';
            }
            
            // Obtém categorias disponíveis para mapear cores
            const availableCategories = this.getAvailableCategories();
            
            // Renderiza cada categoria como tag colorida
            return file.categories.map(categoryId => {
                const category = availableCategories.find(c => c.id === categoryId);
                if (!category) {
                    // Fallback para categoria não encontrada
                    return `<span class="file-category-tag" style="background-color: var(--gray-600); color: var(--text-inverse);">
                        ${categoryId}
                    </span>`;
                }
                
                return `<span class="file-category-tag" style="background-color: ${category.color}; color: var(--text-inverse);" title="${category.name}">
                    ${category.name}
                </span>`;
            }).join('');
        }

        /**
         * Obtém categorias disponíveis
         */
        getAvailableCategories() {
            // AGORA USA O CategoryManager REAL ao invés de implementação própria
            return KC.CategoryManager.getCategories();
        }

        /**
         * Análise a partir do modal
         */
        analyzeFromModal(fileId, buttonElement) {
            const allFiles = AppState.get('files') || [];
            const file = allFiles.find(f => f.id === fileId || f.name === fileId);
            
            if (file) {
                this.analyzeFile(file, buttonElement);
                // Fecha modal após análise
                setTimeout(() => {
                    buttonElement.closest('.modal-overlay').remove();
                }, 2500);
            }
        }

        /**
         * Adiciona nova categoria
         */
        addNewCategory() {
            const nameInput = document.getElementById('new-category-name');
            const colorSelect = document.getElementById('new-category-color');
            
            const name = nameInput.value.trim();
            const color = colorSelect.value;
            
            if (!name) {
                alert('Digite um nome para a categoria');
                return;
            }
            
            // CORREÇÃO: Usar CategoryManager em vez de criar diretamente
            /* CÓDIGO ORIGINAL PRESERVADO PARA ROLLBACK:
            // Verifica se categoria já existe
            const existingCategories = this.getAvailableCategories();
            const categoryId = name.toLowerCase().replace(/\s+/g, '-');
            
            if (existingCategories.find(cat => cat.id === categoryId)) {
                alert('Já existe uma categoria com este nome');
                nameInput.focus();
                return;
            }
            
            const newCategory = {
                id: categoryId,
                name: name,
                color: color
            };
            
            // Salva categoria
            const categories = AppState.get('categories') || [];
            categories.push(newCategory);
            AppState.set('categories', categories);
            */
            
            // NOVO: Usa CategoryManager para criar categoria
            const newCategory = KC.CategoryManager.createCategory({
                name: name,
                color: color,
                icon: '🏷️' // ícone padrão para categorias customizadas
            });
            
            if (!newCategory) {
                // CategoryManager já loga o erro, então apenas retornamos
                nameInput.focus();
                return;
            }
            
            // ✅ CORREÇÃO: Atualização incremental em vez de recriar modal
            // NOTA: updateCategoryList será chamado automaticamente via evento CATEGORIES_CHANGED
            // this.updateCategoryList(newCategory.id);
            
            // Limpa form após atualização bem-sucedida
            nameInput.value = '';
            colorSelect.selectedIndex = 0;
            nameInput.focus();
            
            KC.showNotification({
                type: 'success',
                message: `Categoria '${name}' criada com sucesso`
            });
        }

        /**
         * Atualiza lista de categorias no modal sem recriar o modal inteiro
         * @param {string} selectedCategoryId - ID da categoria a ser marcada como selecionada
         */
        updateCategoryList(selectedCategoryId = null) {
            const categoryList = document.querySelector('.category-list');
            if (!categoryList) {
                console.error('FileRenderer: .category-list não encontrada');
                return;
            }
            
            const categories = this.getAvailableCategories();
            
            // Recria apenas a lista de categorias
            categoryList.innerHTML = categories.map(cat => `
                <label class="category-option">
                    <input type="checkbox" 
                           value="${cat.id}" 
                           ${selectedCategoryId === cat.id ? 'checked' : ''}>
                    <span class="category-badge" style="background-color: ${cat.color}">
                        ${cat.name}
                    </span>
                </label>
            `).join('');
            
            console.log(`FileRenderer: Lista de categorias atualizada. ${categories.length} categorias disponíveis.`);
        }

        /**
         * Cria modal de confirmação para arquivamento
         */
        createArchiveModal(file) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content archive-modal">
                    <div class="modal-header">
                        <h3>📦 Arquivar Arquivo</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="archive-info">
                            <div class="file-info">
                                <strong>Arquivo:</strong> ${file.name}<br>
                                <strong>Tamanho:</strong> ${this.formatFileSize(file.size)}<br>
                                <strong>Relevância:</strong> ${this.calculateRelevance(file)}%
                            </div>
                            <div class="archive-warning">
                                <p>⚠️ <strong>Importante:</strong></p>
                                <ul>
                                    <li>O arquivo será removido da lista principal</li>
                                    <li>Poderá ser recuperado através do filtro "Arquivados"</li>
                                    <li>Não será excluído permanentemente</li>
                                    <li>Categorias e análises serão mantidas</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancelar
                        </button>
                        <button class="btn btn-primary" onclick="KC.FileRenderer.confirmArchive('${file.id || file.name}', this)">
                            📦 Arquivar
                        </button>
                    </div>
                </div>
            `;
            
            return modal;
        }
        
        /**
         * Confirma e executa o arquivamento
         */
        confirmArchive(fileId, buttonElement) {
            const modal = buttonElement.closest('.modal-overlay');
            const allFiles = AppState.get('files') || [];
            const fileIndex = allFiles.findIndex(f => f.id === fileId || f.name === fileId);
            
            if (fileIndex !== -1) {
                const file = allFiles[fileIndex];
                this.executeArchive(file);
                modal.remove();
            }
        }

        /**
         * Salva categorias do arquivo
         */
        saveCategories(fileId, buttonElement) {
            const modal = buttonElement.closest('.modal-overlay');
            const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
            const selectedCategories = Array.from(checkboxes).map(cb => cb.value);
            
            // FASE 1.3 FIX: Usar CategoryManager para aplicar boost
            // AIDEV-NOTE: use-category-manager; sempre usar CategoryManager para aplicar categorias
            const allFiles = AppState.get('files') || [];
            const file = allFiles.find(f => f.id === fileId || f.name === fileId);
            
            if (file) {
                // Primeiro, limpa categorias existentes
                if (file.categories && file.categories.length > 0) {
                    const currentCategories = [...file.categories];
                    currentCategories.forEach(catId => {
                        KC.CategoryManager.removeCategoryFromFile(fileId, catId);
                    });
                }
                
                // Depois, aplica as novas categorias usando CategoryManager (que aplica o boost)
                selectedCategories.forEach(categoryId => {
                    KC.CategoryManager.assignCategoryToFile(fileId, categoryId);
                });
                
                // Notificação será emitida pelo CategoryManager
                
                // Fecha modal
                modal.remove();
            }
        }

        /**
         * Obtém estatísticas dos arquivos renderizados
         */
        getStats() {
            return {
                total: this.files.length,
                filtered: this.filteredFiles.length,
                paginated: this.getPaginatedFiles().length,
                currentPage: this.pagination.currentPage,
                totalPages: this.pagination.totalPages,
                itemsPerPage: this.pagination.itemsPerPage,
                altaRelevancia: this.files.filter(f => this.calculateRelevance(f) >= 70).length,
                mediaRelevancia: this.files.filter(f => {
                    const rel = this.calculateRelevance(f);
                    return rel >= 50 && rel < 70;
                }).length,
                pendenteAnalise: this.files.filter(f => !f.analyzed).length,
                jaAnalisados: this.files.filter(f => f.analyzed).length
            };
        }
        
        /**
         * NOVO: Gerencia seleção de arquivos
         */
        handleFileSelection(fileId, isSelected) {
            if (isSelected) {
                this.selectedFiles.add(fileId);
            } else {
                this.selectedFiles.delete(fileId);
            }
            
            // Atualiza visibilidade da barra de ações em lote
            this.updateBulkActionsBar();
        }
        
        /**
         * NOVO: Atualiza barra de ações em lote
         */
        updateBulkActionsBar() {
            const count = this.selectedFiles.size;
            
            // Remove barra existente
            const existingBar = document.querySelector('.bulk-actions-bar');
            if (existingBar) {
                existingBar.remove();
            }
            
            // Verifica se há checkboxes na página (arquivos visíveis)
            const hasVisibleFiles = document.querySelectorAll('.file-select-checkbox').length > 0;
            
            // Se não há arquivos visíveis, não mostra a barra
            if (!hasVisibleFiles) {
                return;
            }
            
            // Cria nova barra
            const bar = document.createElement('div');
            bar.className = 'bulk-actions-bar';
            
            // Se não há seleção, mostra apenas o botão de selecionar todos
            if (count === 0) {
                bar.innerHTML = `
                    <div class="bulk-actions-header">
                        <h3 class="bulk-actions-title">Arquivos Descobertos</h3>
                        <div class="bulk-counts">
                            <span class="selection-count">Nenhum arquivo selecionado</span>
                            <span class="filter-count" id="bulk-filter-info"></span>
                        </div>
                    </div>
                    <div class="bulk-actions">
                        <button class="bulk-action-btn primary" 
                                onclick="KC.FileRenderer.selectAllVisible()"
                                title="Selecionar todos os arquivos visíveis (Ctrl+A)">
                            ☑️ Selecionar Todos
                        </button>
                        <button class="bulk-action-btn update" 
                                onclick="KC.FilterPanel && KC.FilterPanel.handleBulkUpdate()"
                                title="Atualiza dados manualmente">
                            🔄 Atualizar
                        </button>
                    </div>
                `;
            } else {
                bar.innerHTML = `
                    <div class="bulk-actions-header">
                        <h3 class="bulk-actions-title">Arquivos Descobertos</h3>
                        <div class="bulk-counts">
                            <span class="selection-count">${count} arquivo(s) selecionado(s)</span>
                            <span class="filter-count" id="bulk-filter-info"></span>
                        </div>
                    </div>
                    <div class="bulk-actions">
                        <button class="bulk-action-btn primary" 
                                onclick="KC.FileRenderer.selectAllVisible()"
                                title="Selecionar todos os arquivos visíveis (Ctrl+A)">
                            ☑️ Selecionar Todos
                        </button>
                        <button class="bulk-action-btn" 
                                onclick="KC.FileRenderer.bulkCategorize()"
                                title="Categorizar arquivos selecionados (Ctrl+K)">
                            📂 Categorizar
                        </button>
                        <button class="bulk-action-btn" 
                                onclick="KC.FileRenderer.bulkAnalyze()"
                                title="Analisar arquivos com IA (Ctrl+I)">
                            🔍 Analisar com IA
                        </button>
                        <button class="bulk-action-btn success" 
                                onclick="KC.FileRenderer.bulkApprove()"
                                title="Aprovar arquivos selecionados (Ctrl+D)">
                            ✅ Aprovar
                        </button>
                        <button class="bulk-action-btn warning" 
                                onclick="KC.FileRenderer.bulkArchive()"
                                title="Arquivar arquivos selecionados"
                                id="bulk-archive-selected">
                            📦 Arquivar
                        </button>
                        <button class="bulk-action-btn info" 
                                onclick="KC.FileRenderer.bulkRestore()"
                                title="Restaurar arquivos selecionados"
                                id="bulk-restore-selected"
                                style="display: none;">
                            🔄 Restaurar
                        </button>
                        <button class="bulk-action-btn secondary" 
                                onclick="KC.FileRenderer.clearSelection()"
                                title="Limpar seleção (Esc)">
                            ❌ Limpar
                        </button>
                        <button class="bulk-action-btn update" 
                                onclick="KC.FilterPanel && KC.FilterPanel.handleBulkUpdate()"
                                title="Atualiza dados manualmente">
                            🔄 Atualizar
                        </button>
                    </div>
                `;
            }
            
            // Insere no início do container de arquivos
            const filesContainer = document.querySelector('.files-container');
            if (filesContainer && filesContainer.parentNode) {
                filesContainer.parentNode.insertBefore(bar, filesContainer);
            }
            
            // Atualiza informação de filtros
            this.updateFilterInfo();
            
            // Atualiza visibilidade dos botões baseado no filtro ativo
            this.updateButtonsVisibility();
        }
        
        /**
         * NOVO: Categorização em lote
         */
        bulkCategorize() {
            console.log('bulkCategorize chamado, arquivos selecionados:', this.selectedFiles.size);
            
            if (this.selectedFiles.size === 0) {
                alert('Nenhum arquivo selecionado');
                return;
            }
            
            // Cria modal de categorização em lote
            const selectedArray = Array.from(this.selectedFiles);
            const categories = this.getAvailableCategories();
            
            console.log('Categorias disponíveis:', categories);
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content category-modal">
                    <div class="modal-header">
                        <h3>📂 Categorizar ${selectedArray.length} arquivo(s)</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="category-section">
                            <h4>Selecione as categorias:</h4>
                            <div class="category-list">
                                ${categories.map(cat => `
                                    <label class="category-option">
                                        <input type="checkbox" value="${cat.id}">
                                        <span class="category-badge" style="background-color: ${cat.color}">
                                            ${cat.icon || ''} ${cat.name}
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="KC.FileRenderer.applyBulkCategories()">
                                ✅ Aplicar Categorias
                            </button>
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Mostra modal com animação
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
        
        /**
         * NOVO: Aplica categorias em lote
         */
        applyBulkCategories() {
            const modal = document.querySelector('.modal-overlay');
            const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
            const selectedCategories = Array.from(checkboxes).map(cb => cb.value);
            
            if (selectedCategories.length === 0) {
                alert('Selecione pelo menos uma categoria');
                return;
            }
            
            // Converte Set para Array para o CategoryManager
            const fileIds = Array.from(this.selectedFiles);
            
            // Aplica categorias usando o CategoryManager
            selectedCategories.forEach(categoryId => {
                const result = KC.CategoryManager.assignCategoryToFiles(fileIds, categoryId);
                console.log(`Categoria ${categoryId} aplicada a ${result.updatedCount} arquivos`);
            });
            
            // Limpa seleção
            this.clearSelection();
            
            // Fecha modal
            modal.remove();
            
            // Mostra notificação (usando alert por enquanto, até implementar sistema de notificações)
            alert(`✅ Categorias aplicadas com sucesso a ${fileIds.length} arquivo(s)!`);
            
            // AIDEV-NOTE: sync-after-categorize; force counter updates and emit event
            // Força atualização dos contadores após categorização
            setTimeout(() => {
                if (KC.FilterPanel) {
                    const allFiles = KC.AppState.get('files') || [];
                    KC.FilterPanel.updateAllCounters(allFiles);
                }
                
                // Emite evento para sincronizar outros componentes
                KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                    action: 'bulk_categorize',
                    fileIds: fileIds,
                    categories: selectedCategories
                });
                
                // Re-renderiza a lista para refletir mudanças
                // AIDEV-NOTE: fix-method-name; correct method is showFilesSection
                this.showFilesSection();
            }, 100);
        }
        
        /**
         * NOVO: Análise em lote
         */
        bulkAnalyze() {
            console.log('bulkAnalyze: Iniciando análise em lote de', this.selectedFiles.size, 'arquivos');
            
            if (this.selectedFiles.size === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhum arquivo selecionado',
                    details: 'Selecione pelo menos um arquivo para analisar'
                });
                return;
            }
            
            // Converte Set para Array
            const fileIds = Array.from(this.selectedFiles);
            const files = KC.AppState.get('files') || [];
            
            // Inicia progresso geral
            KC.EventBus.emit(KC.Events.PROGRESS_START || 'progress:start', {
                type: 'bulk-analysis',
                title: `Analisando ${fileIds.length} arquivo(s)...`,
                details: 'Processamento em lote com IA',
                indeterminate: false,
                current: 0,
                total: fileIds.length
            });
            
            // Processa cada arquivo sequencialmente
            let processedCount = 0;
            
            const processNextFile = () => {
                if (processedCount >= fileIds.length) {
                    // Finaliza processamento
                    KC.EventBus.emit(KC.Events.PROGRESS_END || 'progress:end', {
                        type: 'bulk-analysis',
                        title: 'Análise em lote concluída!',
                        details: `${processedCount} arquivo(s) analisado(s) com sucesso`
                    });
                    
                    KC.showNotification({
                        type: 'success',
                        message: `✅ Análise concluída: ${processedCount} arquivo(s)`,
                        details: 'Todos os arquivos foram processados com IA',
                        duration: 5000
                    });
                    
                    // Limpa seleção
                    this.clearSelection();
                    
                    // Atualiza estatísticas
                    if (KC.StatsPanel && KC.StatsManager) {
                        KC.StatsPanel.updateStats(KC.StatsManager.getStats());
                    }
                    
                    return;
                }
                
                // Processa próximo arquivo
                const fileId = fileIds[processedCount];
                const file = files.find(f => (f.id && f.id === fileId) || (f.name === fileId));
                
                if (file && !file.analyzed) {
                    // Atualiza progresso
                    KC.EventBus.emit(KC.Events.PROGRESS_UPDATE || 'progress:update', {
                        type: 'bulk-analysis',
                        current: processedCount + 1,
                        total: fileIds.length,
                        details: `Analisando: ${file.name}`
                    });
                    
                    // Simula análise (mesmo código do analyzeFile)
                    file.analyzed = true;
                    file.analysisDate = new Date().toISOString();
                    file.analysisType = this.detectAnalysisType(file);
                    
                    // Preserva boost de categorias
                    const hasCategories = file.categories && file.categories.length > 0;
                    const enhancedScore = this.calculateEnhancedRelevance(file);
                    
                    if (hasCategories) {
                        const categoryBoost = 1.5 + (file.categories.length * 0.1);
                        file.relevanceScore = Math.min(100, enhancedScore * categoryBoost);
                    } else {
                        file.relevanceScore = enhancedScore;
                    }
                    
                    // Atualiza no AppState
                    const allFiles = KC.AppState.get('files') || [];
                    const fileIndex = allFiles.findIndex(f => f.id === file.id || f.name === file.name);
                    if (fileIndex !== -1) {
                        allFiles[fileIndex] = { ...allFiles[fileIndex], ...file };
                        KC.AppState.set('files', allFiles);
                    }
                }
                
                processedCount++;
                
                // Processa próximo após delay (simula processamento)
                setTimeout(processNextFile, 1000);
            };
            
            // Inicia processamento
            processNextFile();
        }
        
        /**
         * NOVO: Arquivamento em lote
         */
        bulkArchive() {
            if (!confirm(`Arquivar ${this.selectedFiles.size} arquivo(s)?`)) {
                return;
            }
            
            const fileIds = Array.from(this.selectedFiles);
            const files = AppState.get('files') || [];
            let archivedCount = 0;
            
            fileIds.forEach(fileId => {
                const fileIndex = files.findIndex(f => 
                    (f.id && f.id === fileId) || (f.name === fileId)
                );
                
                if (fileIndex !== -1) {
                    files[fileIndex].archived = true;
                    files[fileIndex].archivedDate = new Date().toISOString();
                    archivedCount++;
                }
            });
            
            if (archivedCount > 0) {
                AppState.set('files', files);
                this.clearSelection();
                
                // Mostra notificação (usando alert por enquanto)
                alert(`✅ ${archivedCount} arquivo(s) arquivado(s) com sucesso!`);
            }
        }
        
        /**
         * NOVO: Aprovação em lote
         */
        bulkApprove() {
            if (this.selectedFiles.size === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhum arquivo selecionado',
                    details: 'Selecione pelo menos um arquivo para aprovar'
                });
                return;
            }
            
            const fileIds = Array.from(this.selectedFiles);
            const files = KC.AppState.get('files') || [];
            let approvedCount = 0;
            
            fileIds.forEach(fileId => {
                const fileIndex = files.findIndex(f => 
                    (f.id && f.id === fileId) || (f.name === fileId)
                );
                
                if (fileIndex !== -1 && !files[fileIndex].archived) {
                    files[fileIndex].approved = true;
                    files[fileIndex].approvedDate = new Date().toISOString();
                    approvedCount++;
                }
            });
            
            if (approvedCount > 0) {
                KC.AppState.set('files', files);
                
                // Emite evento para atualizar interface
                KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                    action: 'bulk_approve',
                    fileIds: fileIds,
                    count: approvedCount
                });
                
                this.clearSelection();
                
                KC.showNotification({
                    type: 'success',
                    message: `✅ ${approvedCount} arquivo(s) aprovado(s)`,
                    details: 'Arquivos prontos para processamento RAG',
                    duration: 3000
                });
                
                // Atualiza estatísticas
                if (KC.StatsPanel && KC.StatsManager) {
                    KC.StatsPanel.updateStats(KC.StatsManager.getStats());
                }
            }
        }
        
        /**
         * NOVO: Restaurar arquivos selecionados
         */
        bulkRestore() {
            console.log('bulkRestore chamado, arquivos selecionados:', this.selectedFiles.size);
            
            if (this.selectedFiles.size === 0) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Nenhum arquivo selecionado',
                    details: 'Selecione arquivos arquivados para restaurar'
                });
                return;
            }
            
            if (!confirm(`Restaurar ${this.selectedFiles.size} arquivo(s)?`)) {
                return;
            }
            
            const fileIds = Array.from(this.selectedFiles);
            const files = KC.AppState.get('files') || [];
            let restoredCount = 0;
            
            fileIds.forEach(fileId => {
                const fileIndex = files.findIndex(f => 
                    (f.id && f.id === fileId) || (f.name === fileId)
                );
                
                if (fileIndex !== -1 && files[fileIndex].archived) {
                    files[fileIndex].archived = false;
                    files[fileIndex].approved = true;
                    files[fileIndex].restoredDate = new Date().toISOString();
                    restoredCount++;
                }
            });
            
            if (restoredCount > 0) {
                KC.AppState.set('files', files);
                
                // Emite evento para atualizar interface
                KC.EventBus.emit(KC.Events.FILES_UPDATED, {
                    action: 'bulk_restore',
                    fileIds: fileIds,
                    count: restoredCount
                });
                
                this.clearSelection();
                
                KC.showNotification({
                    type: 'success',
                    message: `🔄 ${restoredCount} arquivo(s) restaurado(s)`,
                    details: 'Arquivos movidos para aprovados',
                    duration: 3000
                });
                
                // Re-renderiza para atualizar visualização
                this.renderFileList();
            }
        }
        
        /**
         * NOVO: Limpa seleção
         */
        clearSelection() {
            this.selectedFiles.clear();
            
            // Desmarca todos os checkboxes
            const checkboxes = document.querySelectorAll('.file-select-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            
            // Remove barra de ações
            this.updateBulkActionsBar();
        }
        
        /**
         * Atualiza informação de filtros na barra
         */
        updateFilterInfo() {
            const filterInfo = document.getElementById('bulk-filter-info');
            if (!filterInfo) return;
            
            // Obtém informação do FilterPanel se disponível
            if (KC.FilterPanel && KC.FilterPanel.getFilteredFilesCount) {
                const filteredCount = KC.FilterPanel.getFilteredFilesCount();
                const totalFiles = (KC.AppState.get('files') || []).length;
                
                if (filteredCount < totalFiles) {
                    filterInfo.textContent = `• ${filteredCount} de ${totalFiles} arquivos (filtros ativos)`;
                    filterInfo.style.color = '#f59e0b'; // Warning color
                } else {
                    filterInfo.textContent = `• ${totalFiles} arquivos totais`;
                    filterInfo.style.color = '#666';
                }
            } else if (this.filteredFiles) {
                // Fallback: usa dados do próprio FileRenderer
                const filteredCount = this.filteredFiles.length;
                const totalFiles = (this.originalFiles || []).length;
                
                if (filteredCount < totalFiles) {
                    filterInfo.textContent = `• ${filteredCount} de ${totalFiles} arquivos visíveis`;
                    filterInfo.style.color = '#f59e0b';
                } else {
                    filterInfo.textContent = `• ${totalFiles} arquivos`;
                    filterInfo.style.color = '#666';
                }
            }
        }
        
        /**
         * Atualiza visibilidade dos botões baseado no filtro ativo
         */
        updateButtonsVisibility() {
            const archiveBtn = document.getElementById('bulk-archive-selected');
            const restoreBtn = document.getElementById('bulk-restore-selected');
            
            if (!archiveBtn || !restoreBtn) return;
            
            // Verifica o filtro de status ativo
            const statusFilter = document.querySelector('input[name="status"]:checked');
            const isArchiveFilter = statusFilter && statusFilter.value === 'archived';
            
            if (isArchiveFilter) {
                // Se filtro de arquivados está ativo, mostra restaurar e esconde arquivar
                archiveBtn.style.display = 'none';
                restoreBtn.style.display = 'block';
            } else {
                // Caso contrário, mostra arquivar e esconde restaurar
                archiveBtn.style.display = 'block';
                restoreBtn.style.display = 'none';
            }
        }
        
        /**
         * NOVO: Seleciona todos os arquivos visíveis na página atual
         */
        selectAllVisible() {
            console.log('FileRenderer: Selecionando todos os arquivos visíveis');
            
            // Obtém todos os checkboxes visíveis
            const checkboxes = document.querySelectorAll('.file-select-checkbox');
            
            // Marca todos e adiciona ao Set
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                const fileId = checkbox.dataset.fileId;
                if (fileId) {
                    this.selectedFiles.add(fileId);
                }
            });
            
            console.log(`FileRenderer: ${this.selectedFiles.size} arquivos selecionados`);
            
            // Atualiza a barra de ações
            this.updateBulkActionsBar();
        }
    }

    // Registra no namespace global
    KC.FileRenderer = new FileRenderer();
    
    // Expõe métodos públicos necessários para onclick handlers
    KC.FileRenderer.analyzeFromModal = KC.FileRenderer.analyzeFromModal.bind(KC.FileRenderer);
    KC.FileRenderer.addNewCategory = KC.FileRenderer.addNewCategory.bind(KC.FileRenderer);
    KC.FileRenderer.saveCategories = KC.FileRenderer.saveCategories.bind(KC.FileRenderer);
    KC.FileRenderer.changeItemsPerPage = KC.FileRenderer.changeItemsPerPage.bind(KC.FileRenderer);
    
    // NOVO: Expõe métodos de bulk actions
    KC.FileRenderer.bulkCategorize = KC.FileRenderer.bulkCategorize.bind(KC.FileRenderer);
    KC.FileRenderer.selectAllVisible = KC.FileRenderer.selectAllVisible.bind(KC.FileRenderer);
    KC.FileRenderer.bulkAnalyze = KC.FileRenderer.bulkAnalyze.bind(KC.FileRenderer);
    KC.FileRenderer.bulkArchive = KC.FileRenderer.bulkArchive.bind(KC.FileRenderer);
    KC.FileRenderer.bulkRestore = KC.FileRenderer.bulkRestore.bind(KC.FileRenderer);
    KC.FileRenderer.bulkApprove = KC.FileRenderer.bulkApprove.bind(KC.FileRenderer);
    KC.FileRenderer.clearSelection = KC.FileRenderer.clearSelection.bind(KC.FileRenderer);
    KC.FileRenderer.applyBulkCategories = KC.FileRenderer.applyBulkCategories.bind(KC.FileRenderer);

})(window);
