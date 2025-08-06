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
            
            // Modo de visualização (cards ou list)
            this.viewMode = localStorage.getItem('fileViewMode') || 'cards';
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
            
            // NOVO: Escuta evento CATEGORIES_SELECTED do CategoryQuickSelector
            if (Events && Events.CATEGORIES_SELECTED) {
                EventBus.on(Events.CATEGORIES_SELECTED, (data) => {
                    console.log('FileRenderer: Evento CATEGORIES_SELECTED recebido', data);
                    
                    // Remove todas as categorias antigas
                    const file = this.files.find(f => f.id === data.fileId);
                    if (file && file.categories) {
                        file.categories.forEach(catId => {
                            KC.CategoryManager.removeCategoryFromFiles([data.fileId], catId);
                        });
                    }
                    
                    // Aplica novas categorias usando CategoryManager
                    data.categories.forEach(categoryId => {
                        KC.CategoryManager.assignCategoryToFiles([data.fileId], categoryId);
                    });
                    
                    // Emite evento para sincronizar componentes
                    EventBus.emit(Events.FILES_UPDATED, {
                        action: 'category_assigned',
                        fileId: data.fileId,
                        categories: data.categories
                    });
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
            // Adiciona classe compact-view se estiver em modo lista
            if (this.viewMode === 'list') {
                this.container.classList.add('compact-view');
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
                // Quando skipFilters=true, usa os dados já filtrados
                if (this.filteredFiles && this.filteredFiles.length >= 0) {
                    console.log(`FileRenderer: Usando ${this.filteredFiles.length} arquivos filtrados`);
                }
            }
            
            // Sempre aplica ordenação
            this.applySorting();
            
            // Atualiza paginação
            this.updatePagination();

            // AIDEV-NOTE: filter-transparency; show filter info to user
            this.renderFilterInfo();

            // Limpa container ANTES de adicionar classes (preserve as classes)
            this.container.innerHTML = '';
            
            // Garante que container mantém a classe files-container
            if (!this.container.classList.contains('files-container')) {
                this.container.classList.add('files-container');
            }
            
            // Atualiza classe compact-view baseado no modo de visualização
            if (this.viewMode === 'list') {
                this.container.classList.add('compact-view');
            } else {
                this.container.classList.remove('compact-view');
            }
            
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
         * Cria elemento compacto para visão lista
         */
        createCompactFileElement(file) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-entry compact';
            fileDiv.setAttribute('data-file-id', file.id || file.name);
            
            const fileId = file.id || file.name;
            const isSelected = this.selectedFiles.has(fileId);
            
            // Extrai o caminho da pasta do arquivo
            const fullPath = file.path || file.relativePath || file.name;
            const lastSlash = fullPath.lastIndexOf('/');
            const folderPath = lastSlash > 0 ? fullPath.substring(0, lastSlash) : '/';
            const fileName = lastSlash > 0 ? fullPath.substring(lastSlash + 1) : fullPath;
            
            // Calcula relevância
            const relevance = this.calculateRelevance(file);
            
            fileDiv.innerHTML = `
                <div class="file-main-content compact-layout">
                    <input type="checkbox" 
                           class="file-select-checkbox" 
                           data-file-id="${fileId}"
                           ${isSelected ? 'checked' : ''}>
                    <div class="file-name-compact">
                        ${this.escapeHtml(fileName)}
                    </div>
                    <div class="file-path-compact">
                        ${this.escapeHtml(folderPath)}
                    </div>
                    <div class="relevance-compact">
                        ${relevance}%
                    </div>
                    <div class="file-date-compact">
                        ${this.formatDate(file.lastModified)}
                    </div>
                </div>
            `;
            
            // Adiciona listener para checkbox
            const checkbox = fileDiv.querySelector('.file-select-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.handleFileSelection(file.id || file.name, e.target.checked);
                });
            }
            
            // Adiciona listener para clique em toda a linha (exceto no checkbox)
            fileDiv.addEventListener('click', (e) => {
                // Evita duplo toggle se clicar no checkbox
                if (e.target.type !== 'checkbox' && checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.handleFileSelection(file.id || file.name, checkbox.checked);
                }
            });
            
            return fileDiv;
        }
        
        /**
         * Cria elemento HTML para um arquivo individual - ENHANCED (Task #FE-002)
         */
        createFileElement(file) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-entry';
            fileDiv.setAttribute('data-file-id', file.id || file.name);
            
            // Se está em modo lista, usa layout compacto
            if (this.viewMode === 'list') {
                return this.createCompactFileElement(file);
            }
            
            // AIDEV-NOTE: content-storage-dom; armazena conteúdo para acesso posterior
            // Armazena conteúdo no DOM para ContentAccessUtils
            if (file.content || file.preview) {
                const contentToStore = file.content || file.preview || '';
                // Limita a 100KB para não sobrecarregar o DOM
                fileDiv.setAttribute('data-full-content', contentToStore.substring(0, 100000));
            }

            // Calcula relevância (placeholder por enquanto)
            const relevance = this.calculateRelevance(file);
            
            // Gera preview básico
            const preview = this.generatePreview(file);

            // ENHANCED: Rich analysis data preparation
            this.prepareAnalysisDisplayData(file);

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
                                      title="Boost aplicado: ${KC.RelevanceUtils ? KC.RelevanceUtils.getBoostPercentage(file.categories.length) : Math.round(Math.log(file.categories.length + 1) * 5)}% por ${file.categories.length} categoria(s)">
                                    🚀
                                </span>
                            ` : ''}
                        </div>
                        ${this.renderConfidenceScore(file)}
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
        // ATIVANDO IA REAL COM REFINAMENTO
        async analyzeFile(file, buttonElement) {
            console.log(`FileRenderer: Iniciando análise IA para ${file.name}`);
            
            // NOVO: Detectar se é refinamento
            // AIDEV-NOTE: refinement-integration; detecta contexto de refinamento
            let isRefinement = false;
            let refinementContext = null;
            
            if (KC.RefinementDetector) {
                // Detecta se é refinamento baseado no histórico
                isRefinement = file.analyzed && file.categories && file.categories.length > 0;
                
                if (isRefinement) {
                    // Obtém contexto para refinamento
                    refinementContext = await KC.RefinementDetector.detectContext(file);
                }
                
                if (isRefinement && refinementContext) {
                    console.log('FileRenderer: Análise de REFINAMENTO detectada', {
                        arquivo: file.name,
                        categorias: file.categories,
                        analysisCount: refinementContext.analysisCount
                    });
                }
            }
            
            // SEMPRE usa análise local com embeddings (sem LLMs)
            // Inicia progresso
                EventBus.emit(Events.PROGRESS_START, {
                    type: 'analysis',
                    title: `${isRefinement ? 'Refinando' : 'Analisando'} ${file.name}...`,
                    details: isRefinement ? 'Refinamento com contexto de categorias' : 'Processando conteúdo',
                    indeterminate: true
                });
                
                // Atualiza botão
                if (buttonElement) {
                    buttonElement.disabled = true;
                    buttonElement.innerHTML = isRefinement ? '⏳ Refinando...' : '⏳ Analisando...';
                }
                
                // Mantém comportamento atual com setTimeout
                setTimeout(async () => {
                    // AIDEV-NOTE: separate-analyzed-approved; analyzed != approved
                    // Marca arquivo como analisado mas NÃO como aprovado
                    file.analyzed = true;
                    file.analysisDate = new Date().toISOString();
                    
                    // USAR EMBEDDINGS E QDRANT PARA ANÁLISE SEMÂNTICA
                    let previousType = file.analysisType;
                    let confidence = 0.65; // Confiança padrão
                    
                    try {
                        // PRIMEIRO: Verifica se tem categorias (curadoria humana)
                        if (file.categories && file.categories.length > 0) {
                            console.log('🏷️ Usando categorias para determinar tipo:', file.categories);
                            
                            // Mapeia categorias para tipos de análise
                            const categoryLower = file.categories.map(c => c.toLowerCase());
                            
                            if (categoryLower.some(cat => 
                                ['tecnico', 'codigo', 'arquitetura', 'api', 'stack', 'devops', 'frontend', 
                                 'backend', 'infra', 'docker', 'cloud', 'aws', 'llm', 'ai', 'ml'].includes(cat)
                            )) {
                                file.analysisType = 'Breakthrough Técnico';
                                confidence = 0.85;
                            } else if (categoryLower.some(cat => 
                                ['estrategia', 'decisao', 'roadmap', 'plano', 'business', 'insight', 
                                 'strategic', 'planning', 'goal', 'objective'].includes(cat)
                            )) {
                                file.analysisType = 'Insight Estratégico';
                                confidence = 0.85;
                            } else if (categoryLower.some(cat => 
                                ['conceito', 'teoria', 'visao', 'perspectiva', 'entendimento', 
                                 'evolucao', 'transformacao'].includes(cat)
                            )) {
                                file.analysisType = 'Evolução Conceitual';
                                confidence = 0.85;
                            } else if (categoryLower.some(cat => 
                                ['decisao', 'escolha', 'definicao', 'momento', 'marco'].includes(cat)
                            )) {
                                file.analysisType = 'Momento Decisivo';
                                confidence = 0.85;
                            } else {
                                // Se tem categorias mas não se encaixam, ainda é mais relevante
                                file.analysisType = 'Insight Estratégico';
                                confidence = 0.75;
                            }
                            
                            console.log(`✅ Tipo determinado por categorias: ${file.analysisType} (${(confidence * 100).toFixed(0)}%)`);
                            
                        } else {
                            // SEM CATEGORIAS: Tenta embeddings
                            // 1. Gerar embedding do arquivo
                            if (KC.EmbeddingService) {
                                console.log('📊 Gerando embedding para:', file.name);
                                const embedding = await KC.EmbeddingService.generateEmbedding(
                                    file.content || file.preview || file.name
                                );
                                
                                // 2. Buscar arquivos similares no Qdrant
                                if (KC.QdrantService && embedding) {
                                    console.log('🔍 Buscando similares no Qdrant...');
                                    const similarResults = await KC.QdrantService.search(embedding, {
                                        limit: 10,
                                        scoreThreshold: 0.45  // Threshold mais permissivo para encontrar mais similares
                                    });
                                
                                    // 3. Determinar tipo baseado nos vizinhos
                                    if (similarResults && similarResults.length > 0) {
                                        console.log(`✅ Encontrados ${similarResults.length} arquivos similares`);
                                        
                                        // Conta tipos dos vizinhos (dados estão em metadata)
                                        const typeCounts = {};
                                        similarResults.forEach(result => {
                                            const type = result.payload?.metadata?.analysisType || 'Aprendizado Geral';
                                            typeCounts[type] = (typeCounts[type] || 0) + result.score;
                                        });
                                        
                                        // Escolhe o tipo mais comum ponderado pela similaridade
                                        let bestType = 'Aprendizado Geral';
                                        let bestScore = 0;
                                        for (const [type, score] of Object.entries(typeCounts)) {
                                            if (score > bestScore) {
                                                bestScore = score;
                                                bestType = type;
                                            }
                                        }
                                        
                                        file.analysisType = bestType;
                                        confidence = Math.min(0.95, 0.65 + (bestScore / similarResults.length));
                                        console.log(`📊 Tipo determinado: ${bestType} (confiança: ${(confidence * 100).toFixed(1)}%)`);
                                    } else {
                                        console.log('⚠️ Nenhum arquivo similar encontrado, usando detecção local');
                                        file.analysisType = this.detectAnalysisType(file);
                                    }
                                } else {
                                    console.log('⚠️ QdrantService não disponível, usando detecção local');
                                    file.analysisType = this.detectAnalysisType(file);
                                }
                            } else {
                                console.log('⚠️ EmbeddingService não disponível, usando detecção local');
                                file.analysisType = this.detectAnalysisType(file);
                            }
                        }
                    } catch (error) {
                        console.error('❌ Erro na análise semântica:', error);
                        // Fallback para detecção local
                        file.analysisType = this.detectAnalysisType(file);
                    }
                    
                    // Refinamento adicional pode ser feito aqui se necessário
                    
                    // NOVO: Criar/atualizar analysisHistory
                    if (!file.analysisHistory) {
                        file.analysisHistory = [];
                    }
                    
                    // CRÍTICO: Mapear para Schema.org SEMPRE (inicial e refinamento)
                    // AIDEV-NOTE: schema-org-mapping; integração obrigatória conforme plano
                    let schemaOrgEntity = null;
                    if (KC.SchemaOrgMapper && file.analysisType) {
                        try {
                            // TEMPORÁRIO: Removido await até corrigir SchemaOrgMapper
                            // schemaOrgEntity = await KC.SchemaOrgMapper.mapToSchema(file);
                            schemaOrgEntity = KC.SchemaOrgMapper.mapToSchema(file);
                            console.log('FileRenderer: Schema.org mapeado', { 
                                type: schemaOrgEntity['@type'],
                                confidence: confidence,
                                version: file.analysisHistory.length + 1
                            });
                        } catch (error) {
                            console.error('FileRenderer: Erro ao mapear Schema.org', error);
                        }
                    }
                    
                    file.analysisHistory.push({
                        version: file.analysisHistory.length + 1,
                        timestamp: new Date().toISOString(),
                        analysisType: file.analysisType,
                        confidence: confidence,
                        schemaOrgEntity: schemaOrgEntity, // CRÍTICO: Schema.org desde v1
                        context: {
                            categories: file.categories || [],
                            isRefinement: isRefinement,
                            source: 'local_analysis'
                        }
                    });
                    
                    // Log mudança se houve
                    if (isRefinement && previousType !== file.analysisType) {
                        console.log('AnalysisType REFINADO:', {
                            arquivo: file.name,
                            antes: previousType,
                            depois: file.analysisType,
                            confidence: confidence
                        });
                        
                        if (KC.showNotification) {
                            KC.showNotification({
                                type: 'success',
                                message: '✨ Análise refinada com sucesso!',
                                details: `${file.name}: ${previousType} → ${file.analysisType} (${Math.round(confidence * 100)}% confiança)`,
                                duration: 4000
                            });
                        }
                    }
                
                // FASE 1.3 FIX: Preservar boost de categorias ao analisar
                // AIDEV-NOTE: preserve-category-boost; análise IA não deve sobrescrever boost de categorias
                const hasCategories = file.categories && file.categories.length > 0;
                const currentScore = file.relevanceScore || 0;
                
                // Calcula novo score base (sem considerar categorias)
                const enhancedScore = this.calculateEnhancedRelevance(file);
                
                // Se tem categorias, re-aplica o boost sobre o novo score base
                if (hasCategories) {
                    // Usa a nova fórmula logarítmica do RelevanceUtils
                    file.relevanceScore = KC.RelevanceUtils ? 
                        KC.RelevanceUtils.calculateCategoryBoost(file.categories.length, enhancedScore) :
                        Math.min(100, enhancedScore * (1 + (Math.log(file.categories.length + 1) * 0.05)));
                    
                    const boostPercentage = KC.RelevanceUtils ? 
                        KC.RelevanceUtils.getBoostPercentage(file.categories.length) :
                        Math.round(Math.log(file.categories.length + 1) * 5);
                    
                    KC.Logger?.info('FileRenderer', 'Boost de categorias preservado após análise', {
                        file: file.name,
                        categories: file.categories.length,
                        enhancedScore: Math.round(enhancedScore),
                        boostedScore: Math.round(file.relevanceScore),
                        boost: `${boostPercentage}%`
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
                
                // NOVO: Determina detalhes de refinamento
                const analysisVersion = (file.analysisHistory && file.analysisHistory.length > 0) 
                    ? file.analysisHistory.length 
                    : 1;
                const analysisConfidence = (file.analysisHistory && file.analysisHistory.length > 0 && 
                    file.analysisHistory[file.analysisHistory.length - 1].confidence)
                    ? Math.round(file.analysisHistory[file.analysisHistory.length - 1].confidence * 100)
                    : 65; // Confiança padrão
                const titleText = isRefinement 
                    ? `Refinamento v${analysisVersion} concluído!` 
                    : 'Análise concluída!';
                
                // Finaliza progresso da análise
                EventBus.emit(Events.PROGRESS_END, {
                    type: 'analysis',
                    title: titleText,
                    details: `${file.analysisType} - Relevância: ${Math.round(file.relevanceScore)}% - Confiança: ${analysisConfidence}%`
                });
                
                // Notifica sucesso
                KC.showNotification({
                    type: 'success',
                    message: `✅ ${isRefinement ? 'Refinamento' : 'Análise'} concluída: ${file.name}`,
                    details: `Tipo: ${file.analysisType}, Relevância: ${Math.round(file.relevanceScore)}%, Confiança: ${analysisConfidence}%${hasCategories ? ` (com boost de ${Math.round((1 + file.categories.length * 0.25 - 1) * 100)}%)` : ''}${isRefinement ? ` - v${analysisVersion}` : ''}`
                });
                
                // Restaura botão
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = isRefinement 
                        ? `✅ Analisado v${analysisVersion}` 
                        : '✅ Analisado';
                    buttonElement.classList.add('analyzed');
                    // NOVO: Adiciona classe para indicar refinamento
                    if (isRefinement) {
                        buttonElement.classList.add('refined');
                    }
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
            
            // Usa o novo CategoryQuickSelector
            if (KC.CategoryQuickSelector) {
                KC.CategoryQuickSelector.open(file.id, file.categories || []);
            } else {
                // Fallback para o modal antigo se o novo não estiver disponível
                const modal = this.createCategoryModal(file);
                document.body.appendChild(modal);
                
                // Mostra modal
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }
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
                    case 'location':
                        const pathA = a.path || a.relativePath || a.name;
                        const pathB = b.path || b.relativePath || b.name;
                        const folderA = pathA.substring(0, pathA.lastIndexOf('/')) || '';
                        const folderB = pathB.substring(0, pathB.lastIndexOf('/')) || '';
                        if (folderA !== folderB) {
                            return folderA.localeCompare(folderB);
                        }
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
            // AIDEV-NOTE: improved-detection; melhor detecção com múltiplas keywords e scores
            const fileName = (file.name || '').toLowerCase();
            const content = (file.content || file.preview || '').toLowerCase();
            const combined = fileName + ' ' + content;
            
            // Score para cada tipo baseado em múltiplas keywords
            const scores = {
                'Breakthrough Técnico': 0,
                'Evolução Conceitual': 0,
                'Momento Decisivo': 0,
                'Insight Estratégico': 0,
                'Aprendizado Geral': 0
            };
            
            // Keywords mais específicas e com pesos
            const keywords = {
                'Breakthrough Técnico': [
                    ['implementação', 3], ['código', 3], ['algoritmo', 3], ['performance', 3],
                    ['solução', 2], ['configuração', 2], ['arquitetura', 2], ['técnica', 2],
                    ['api', 2], ['framework', 2], ['otimização', 2], ['bug', 2], ['debug', 2]
                ],
                'Evolução Conceitual': [
                    ['conceito', 3], ['teoria', 3], ['modelo', 3], ['paradigma', 3],
                    ['entendimento', 2], ['perspectiva', 2], ['visão', 2], ['abordagem', 2],
                    ['metodologia', 2], ['princípio', 2], ['filosofia', 2], ['padrão', 2]
                ],
                'Momento Decisivo': [
                    ['decisão', 3], ['escolha', 3], ['definição', 3], ['aprovação', 3],
                    ['milestone', 2], ['deadline', 2], ['prioridade', 2], ['estratégia', 2],
                    ['planejamento', 2], ['roadmap', 2], ['objetivo', 2], ['meta', 2]
                ],
                'Insight Estratégico': [
                    ['insight', 3], ['descoberta', 3], ['realização', 3], ['eureka', 3],
                    ['transformação', 2], ['breakthrough', 2], ['inovação', 2], ['revolução', 2],
                    ['mudança', 2], ['pivot', 2], ['oportunidade', 2], ['tendência', 2]
                ]
            };
            
            // Calcular scores
            for (const [type, typeKeywords] of Object.entries(keywords)) {
                for (const [keyword, weight] of typeKeywords) {
                    if (combined.includes(keyword)) {
                        scores[type] += weight;
                    }
                }
            }
            
            // Se tem categorias, dar peso a elas também
            if (file.categories && file.categories.length > 0) {
                file.categories.forEach(cat => {
                    const catName = (typeof cat === 'string' ? cat : cat.name || '').toLowerCase();
                    if (catName.includes('técnic') || catName.includes('tech') || catName.includes('dev')) {
                        scores['Breakthrough Técnico'] += 5;
                    } else if (catName.includes('conceito') || catName.includes('teor') || catName.includes('model')) {
                        scores['Evolução Conceitual'] += 5;
                    } else if (catName.includes('decis') || catName.includes('estratég') || catName.includes('plan')) {
                        scores['Momento Decisivo'] += 5;
                    } else if (catName.includes('insight') || catName.includes('descob') || catName.includes('inov')) {
                        scores['Insight Estratégico'] += 5;
                    }
                });
            }
            
            // Encontrar tipo com maior score
            let bestType = 'Aprendizado Geral';
            let bestScore = scores['Aprendizado Geral'];
            
            for (const [type, score] of Object.entries(scores)) {
                if (score > bestScore) {
                    bestScore = score;
                    bestType = type;
                }
            }
            
            // Se nenhum score significativo, manter como Aprendizado Geral
            if (bestScore < 3) {
                bestType = 'Aprendizado Geral';
            }
            
            KC.Logger?.debug('FileRenderer.detectAnalysisType', {
                file: file.name,
                type: bestType,
                score: bestScore,
                scores: scores
            });
            
            return bestType;
        }
        
        /**
         * Calcula relevância aprimorada pós-análise
         */
        // CLASSIFICAÇÃO DINÂMICA RESTAURADA
        calculateEnhancedRelevance(file) {
            // AIDEV-NOTE: no-type-boost; retorna score base SEM boost de tipo para evitar acumulação
            // CORREÇÃO BUG #12: Relevância não deve acumular boost a cada análise
            let baseScore = 0;
            
            // Se já tem relevanceScore, usa ele como está
            if (file.relevanceScore !== undefined && file.relevanceScore !== null) {
                baseScore = file.relevanceScore;
            } else {
                // Calcula do zero se não tem score
                baseScore = this.calculateRelevance(file);
            }
            
            // Normaliza para 0-100
            if (baseScore > 100) baseScore = 100;
            if (baseScore < 0) baseScore = 0;
            
            // NÃO aplicar boost baseado em analysisType aqui!
            // O boost de categorias já é aplicado no método analyzeFile
            
            KC.Logger?.debug('FileRenderer.calculateEnhancedRelevance', {
                file: file.name,
                baseScore: Math.round(baseScore),
                analysisType: file.analysisType,
                note: 'Sem boost de tipo'
            });
            
            return baseScore;
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
         * Render confidence score for a file
         * Integrates with UnifiedConfidenceSystem to display semantic confidence
         */
        renderConfidenceScore(file) {
            // Check if confidence system is enabled
            if (!KC.FeatureFlagManagerInstance?.isEnabled('unified_confidence_system')) {
                return '';
            }

            // Get confidence score from the unified system
            let confidenceData = null;
            try {
                if (file.confidence !== undefined) {
                    // Use cached confidence from file
                    confidenceData = {
                        confidence: file.confidence,
                        source: file.confidenceSource || 'cached',
                        metadata: file.confidenceMetadata || {}
                    };
                } else if (KC.UnifiedConfidenceControllerInstance) {
                    // Get real-time confidence
                    confidenceData = KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id || file.name);
                }
            } catch (error) {
                console.warn('Failed to get confidence score for file:', file.name, error);
            }

            if (!confidenceData || confidenceData.confidence === 0) {
                return '';
            }

            const confidence = confidenceData.confidence;
            const source = confidenceData.source;
            
            // Determine confidence level and color
            let confidenceLevel = 'low';
            let confidenceColor = '#6b7280';  // gray
            let confidenceIcon = '🔍';
            
            if (confidence >= 80) {
                confidenceLevel = 'high';
                confidenceColor = '#16a34a';  // green
                confidenceIcon = '🎯';
            } else if (confidence >= 60) {
                confidenceLevel = 'medium';
                confidenceColor = '#ea580c';  // orange
                confidenceIcon = '📊';
            } else if (confidence >= 30) {
                confidenceLevel = 'low';
                confidenceColor = '#dc2626';  // red
                confidenceIcon = '📉';
            }

            // Build tooltip with detailed information
            let tooltip = `Confiança Semântica: ${confidence}%\\nFonte: ${source}`;
            if (confidenceData.metadata?.qdrantScore) {
                tooltip += `\\nScore Qdrant: ${confidenceData.metadata.qdrantScore}`;
            }
            if (confidenceData.metadata?.normalizationMethod) {
                tooltip += `\\nMétodo: ${confidenceData.metadata.normalizationMethod}`;
            }

            // Show color coding if enabled
            const colorCodingEnabled = KC.FeatureFlagManagerInstance?.isEnabled('confidence_color_coding');
            const colorStyle = colorCodingEnabled ? 
                `style="color: ${confidenceColor}; border-left: 3px solid ${confidenceColor}; padding-left: 8px;"` : 
                `style="color: ${confidenceColor};"`;

            return `
                <div class="confidence-score" 
                     ${colorStyle}
                     title="${tooltip}"
                     data-confidence="${confidence}"
                     data-level="${confidenceLevel}">
                    <span class="confidence-icon">${confidenceIcon}</span>
                    <span class="confidence-text">Confiança: ${confidence}%</span>
                    ${source === 'qdrant' ? '<span class="confidence-source-badge">AI</span>' : ''}
                </div>
            `;
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
            // AIDEV-NOTE: check-modal-exists; verificar se existe modal aberto antes de atualizar
            const modal = document.querySelector('.modal-overlay');
            if (!modal) {
                // Modal não está aberto, não precisa atualizar
                return;
            }
            
            const categoryList = modal.querySelector('.category-list');
            if (!categoryList) {
                // Modal existe mas não é de categorias
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
         * Alterna entre visão Cards e Lista
         */
        toggleView() {
            this.viewMode = this.viewMode === 'cards' ? 'list' : 'cards';
            localStorage.setItem('fileViewMode', this.viewMode);
            
            // Atualiza classes do container
            const container = document.querySelector('.files-container');
            if (container) {
                container.classList.toggle('compact-view', this.viewMode === 'list');
            }
            
            // Re-renderiza a lista
            this.renderFileList();
            
            // Atualiza barra para refletir o novo botão
            this.updateBulkActionsBar();
            
            console.log(`FileRenderer: Mudou para visão ${this.viewMode}`);
        }
        
        /**
         * NOVO: Atualiza barra de ações em lote
         */
        updateBulkActionsBar() {
            const count = this.selectedFiles.size;
            
            // Busca barra existente ou cria nova
            let bar = document.querySelector('.bulk-actions-bar');
            
            if (!bar) {
                // Cria barra apenas se não existir
                bar = document.createElement('div');
                bar.className = 'bulk-actions-bar';
                
                // Insere no início do container de arquivos
                const filesSection = document.getElementById('files-section');
                if (filesSection) {
                    filesSection.insertBefore(bar, filesSection.firstChild);
                }
            }
            
            // Atualiza conteúdo da barra baseado na seleção
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
                        <button class="bulk-action-btn" 
                                onclick="KC.FileRenderer.toggleView()"
                                title="Alternar entre visão Cards e Lista">
                            ${this.viewMode === 'list' ? '🃏 Cards' : '📋 Lista'}
                        </button>
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
                        <button class="bulk-action-btn" 
                                onclick="KC.FileRenderer.toggleView()"
                                title="Alternar entre visão Cards e Lista">
                            ${this.viewMode === 'list' ? '🃏 Cards' : '📋 Lista'}
                        </button>
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
            
            // Usa o CategoryQuickSelector para categorização em lote
            if (KC.CategoryQuickSelector && this.selectedFiles.size === 1) {
                // Se apenas um arquivo selecionado, usa o seletor rápido
                const fileId = this.selectedFiles.values().next().value;
                const file = this.getCurrentFiles().find(f => f.id === fileId);
                if (file) {
                    KC.CategoryQuickSelector.open(file.id, file.categories || []);
                    return;
                }
            }
            
            // Para múltiplos arquivos, ainda usa o modal tradicional
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
         * Aplica filtros aos arquivos
         * NOTA: Este método existe apenas para compatibilidade
         * Os filtros reais são aplicados pelo FilterPanel
         */
        applyFilters() {
            console.log('FileRenderer: applyFilters() desativado - usando dados do FilterManager');
            
            // Se não temos filteredFiles, usa todos os files
            if (!this.filteredFiles) {
                this.filteredFiles = this.files || [];
            }
        }

        /**
         * Aplica ordenação aos arquivos filtrados
         */
        applySorting() {
            if (!this.filteredFiles || this.filteredFiles.length === 0) return;
            
            const sortBy = this.currentSort || 'relevance';
            
            this.filteredFiles.sort((a, b) => {
                switch (sortBy) {
                    case 'relevance':
                        const relevanceA = this.calculateRelevance(a);
                        const relevanceB = this.calculateRelevance(b);
                        return relevanceB - relevanceA; // Maior relevância primeiro
                        
                    case 'date':
                        return (b.lastModified || 0) - (a.lastModified || 0); // Mais recente primeiro
                        
                    case 'size':
                        return (b.size || 0) - (a.size || 0); // Maior primeiro
                        
                    case 'name':
                        return (a.name || '').localeCompare(b.name || '');
                        
                    case 'location':
                        // Ordena por pasta e depois por nome
                        const pathA = a.path || a.relativePath || a.name;
                        const pathB = b.path || b.relativePath || b.name;
                        
                        // Extrai pasta
                        const folderA = pathA.substring(0, pathA.lastIndexOf('/')) || '';
                        const folderB = pathB.substring(0, pathB.lastIndexOf('/')) || '';
                        
                        // Compara pastas primeiro
                        if (folderA !== folderB) {
                            return folderA.localeCompare(folderB);
                        }
                        
                        // Se mesma pasta, ordena por nome
                        return (a.name || '').localeCompare(b.name || '');
                        
                    default:
                        return 0;
                }
            });
            
            console.log(`FileRenderer: Arquivos ordenados por ${sortBy}`);
        }

        /**
         * Atualiza informações de paginação
         */
        updatePagination() {
            const totalFiles = this.filteredFiles ? this.filteredFiles.length : 0;
            this.pagination.totalItems = totalFiles;
            this.pagination.totalPages = Math.ceil(totalFiles / this.pagination.itemsPerPage);
            
            // Ajusta página atual se necessário
            if (this.pagination.currentPage > this.pagination.totalPages) {
                this.pagination.currentPage = Math.max(1, this.pagination.totalPages);
            }
            
            console.log(`FileRenderer: Paginação atualizada - ${totalFiles} itens, página ${this.pagination.currentPage}/${this.pagination.totalPages}`);
        }

        /**
         * Renderiza informações sobre os filtros aplicados
         */
        renderFilterInfo() {
            // Cria ou encontra elemento de info de filtros
            let filterInfo = document.getElementById('file-filter-info');
            if (!filterInfo) {
                filterInfo = document.createElement('div');
                filterInfo.id = 'file-filter-info';
                filterInfo.className = 'filter-info-bar';
                
                // Insere antes do container de arquivos
                if (this.container && this.container.parentNode) {
                    this.container.parentNode.insertBefore(filterInfo, this.container);
                }
            }
            
            if (!filterInfo) return;
            
            // Conta arquivos excluídos
            const totalFiles = this.files ? this.files.length : 0;
            const filteredFiles = this.filteredFiles ? this.filteredFiles.length : 0;
            const excludedCount = totalFiles - filteredFiles;
            
            if (excludedCount > 0) {
                filterInfo.innerHTML = `
                    <div class="filter-info-content">
                        <span class="filter-info-icon">🔍</span>
                        <span class="filter-info-text">
                            Mostrando <strong>${filteredFiles}</strong> de <strong>${totalFiles}</strong> arquivos
                            (${excludedCount} arquivo${excludedCount > 1 ? 's' : ''} excluído${excludedCount > 1 ? 's' : ''})
                        </span>
                    </div>
                `;
                filterInfo.style.display = 'block';
            } else {
                filterInfo.style.display = 'none';
            }
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
                        // Usa a nova fórmula logarítmica
                        file.relevanceScore = KC.RelevanceUtils ? 
                            KC.RelevanceUtils.calculateCategoryBoost(file.categories.length, enhancedScore) :
                            Math.min(100, enhancedScore * (1 + (Math.log(file.categories.length + 1) * 0.05)));
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

        // ====================================================================
        // ENHANCED FEATURES - Task #FE-002: Rich Analysis Results Display
        // ====================================================================

        /**
         * Prepara dados de análise enriquecidos para exibição
         */
        prepareAnalysisDisplayData(file) {
            // Estrutura de dados de análise enriquecida
            file.analysisDisplay = {
                confidenceScore: this.calculateConfidenceScore(file),
                typeDistribution: this.getTypeDistribution(file),
                keywords: this.extractKeywords(file),
                relatedFiles: this.findRelatedFiles(file),
                timeline: this.getAnalysisTimeline(file),
                exportFormats: ['JSON', 'PDF', 'MD', 'HTML']
            };

            return file.analysisDisplay;
        }

        /**
         * Calcula score de confiança baseado em múltiplos fatores
         */
        calculateConfidenceScore(file) {
            let confidence = 0;
            let factors = [];

            // Fator 1: Presença de análise IA
            if (file.analyzed && file.analysisType) {
                confidence += 30;
                factors.push({ name: 'Análise IA', score: 30, color: '#10b981' });
            }

            // Fator 2: Categorização manual
            if (file.categories && file.categories.length > 0) {
                const categoryScore = Math.min(file.categories.length * 15, 25);
                confidence += categoryScore;
                factors.push({ name: 'Categorias', score: categoryScore, color: '#3b82f6' });
            }

            // Fator 3: Relevância calculada
            if (file.relevanceScore) {
                const relevanceScore = Math.floor(file.relevanceScore * 20);
                confidence += relevanceScore;
                factors.push({ name: 'Relevância', score: relevanceScore, color: '#8b5cf6' });
            }

            // Fator 4: Tamanho do conteúdo (mais conteúdo = mais confiança)
            if (file.size) {
                const sizeScore = Math.min(Math.log(file.size / 1000) * 5, 15);
                confidence += sizeScore;
                factors.push({ name: 'Conteúdo', score: Math.floor(sizeScore), color: '#f59e0b' });
            }

            // Fator 5: Recência do arquivo
            if (file.lastModified) {
                const daysSince = (Date.now() - new Date(file.lastModified)) / (1000 * 60 * 60 * 24);
                const recencyScore = Math.max(10 - daysSince / 30, 0);
                confidence += recencyScore;
                factors.push({ name: 'Recência', score: Math.floor(recencyScore), color: '#ef4444' });
            }

            return {
                total: Math.min(Math.floor(confidence), 100),
                factors: factors,
                level: this.getConfidenceLevel(confidence)
            };
        }

        /**
         * Determina nível de confiança baseado na pontuação
         */
        getConfidenceLevel(score) {
            if (score >= 80) return { name: 'Muito Alta', color: '#10b981', icon: '🟢' };
            if (score >= 60) return { name: 'Alta', color: '#3b82f6', icon: '🔵' };
            if (score >= 40) return { name: 'Média', color: '#f59e0b', icon: '🟡' };
            if (score >= 20) return { name: 'Baixa', color: '#ef4444', icon: '🔴' };
            return { name: 'Muito Baixa', color: '#6b7280', icon: '⚪' };
        }

        /**
         * Gera distribuição de tipos de análise para gráficos
         */
        getTypeDistribution(file) {
            const types = [];
            
            if (file.analysisType) {
                types.push({
                    type: file.analysisType,
                    confidence: 85,
                    color: this.getAnalysisTypeColor(file.analysisType)
                });
            }

            // Adiciona tipos secundários baseados em categorias
            if (file.categories) {
                file.categories.forEach(category => {
                    const inferredType = this.inferTypeFromCategory(category);
                    if (inferredType && !types.find(t => t.type === inferredType.type)) {
                        types.push(inferredType);
                    }
                });
            }

            return types;
        }

        /**
         * Extrai palavras-chave do conteúdo
         */
        extractKeywords(file) {
            const content = file.content || file.preview || '';
            const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
            
            // Conta frequência
            const frequency = {};
            words.forEach(word => {
                if (!this.isStopWord(word)) {
                    frequency[word] = (frequency[word] || 0) + 1;
                }
            });

            // Retorna top 10 palavras-chave
            return Object.entries(frequency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([word, count]) => ({ word, count, relevance: count / words.length }));
        }

        /**
         * Encontra arquivos relacionados
         */
        findRelatedFiles(targetFile) {
            if (!this.files || this.files.length === 0) return [];

            const related = [];
            const targetKeywords = this.extractKeywords(targetFile).map(k => k.word);

            this.files.forEach(file => {
                if (file.id === targetFile.id) return;

                let similarity = 0;
                
                // Similaridade por categorias
                if (file.categories && targetFile.categories) {
                    const commonCategories = file.categories.filter(c => 
                        targetFile.categories.includes(c)
                    );
                    similarity += commonCategories.length * 0.3;
                }

                // Similaridade por tipo de análise
                if (file.analysisType && file.analysisType === targetFile.analysisType) {
                    similarity += 0.4;
                }

                // Similaridade por palavras-chave
                const fileKeywords = this.extractKeywords(file).map(k => k.word);
                const commonKeywords = fileKeywords.filter(k => targetKeywords.includes(k));
                similarity += commonKeywords.length * 0.1;

                if (similarity > 0.3) {
                    related.push({
                        file: file,
                        similarity: Math.min(similarity, 1),
                        reasons: this.getSimilarityReasons(file, targetFile, similarity)
                    });
                }
            });

            return related.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
        }

        /**
         * Timeline de análise do arquivo
         */
        getAnalysisTimeline(file) {
            const timeline = [];

            if (file.lastModified) {
                timeline.push({
                    date: new Date(file.lastModified),
                    event: 'Arquivo criado/modificado',
                    type: 'creation',
                    icon: '📄'
                });
            }

            if (file.analyzed) {
                timeline.push({
                    date: new Date(),
                    event: `Análise IA: ${file.analysisType}`,
                    type: 'analysis',
                    icon: '🤖'
                });
            }

            if (file.categories && file.categories.length > 0) {
                timeline.push({
                    date: new Date(),
                    event: `Categorizado: ${file.categories.join(', ')}`,
                    type: 'categorization',
                    icon: '🏷️'
                });
            }

            return timeline.sort((a, b) => a.date - b.date);
        }

        /**
         * Renderiza display expandível de análise
         */
        renderExpandableAnalysisDisplay(file) {
            if (!file.analysisDisplay) return '';

            const display = file.analysisDisplay;
            const confidence = display.confidenceScore;

            return `
                <div class="analysis-display-container" style="margin-top: 12px;">
                    <!-- Cabeçalho com confiança -->
                    <div class="analysis-header">
                        <div class="confidence-indicator">
                            <span class="confidence-icon">${confidence.level.icon}</span>
                            <span class="confidence-text">Confiança: ${confidence.total}% (${confidence.level.name})</span>
                            <button class="expand-analysis-btn" data-action="expand-analysis">
                                <i class="icon-chevron-down"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Conteúdo expandível -->
                    <div class="analysis-details" style="display: none;">
                        <!-- Fatores de confiança -->
                        <div class="confidence-breakdown">
                            <h5>Fatores de Confiança</h5>
                            <div class="confidence-bars">
                                ${confidence.factors.map(factor => `
                                    <div class="factor-bar">
                                        <span class="factor-name">${factor.name}</span>
                                        <div class="factor-progress">
                                            <div class="factor-fill" style="width: ${factor.score}%; background-color: ${factor.color};"></div>
                                        </div>
                                        <span class="factor-score">${factor.score}%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Distribuição de tipos -->
                        ${display.typeDistribution.length > 0 ? `
                            <div class="type-distribution">
                                <h5>Tipos de Análise</h5>
                                <div class="type-chart">
                                    ${display.typeDistribution.map(type => `
                                        <div class="type-item">
                                            <span class="type-indicator" style="background-color: ${type.color};"></span>
                                            <span class="type-name">${type.type}</span>
                                            <span class="type-confidence">${type.confidence}%</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Palavras-chave -->
                        ${display.keywords.length > 0 ? `
                            <div class="keywords-section">
                                <h5>Palavras-chave Principais</h5>
                                <div class="keywords-cloud">
                                    ${display.keywords.map(keyword => `
                                        <span class="keyword-tag" style="font-size: ${0.8 + keyword.relevance * 0.6}rem;">
                                            ${keyword.word} (${keyword.count})
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Arquivos relacionados -->
                        ${display.relatedFiles.length > 0 ? `
                            <div class="related-files">
                                <h5>Arquivos Relacionados</h5>
                                <div class="related-list">
                                    ${display.relatedFiles.map(related => `
                                        <div class="related-item">
                                            <span class="related-name">${related.file.name}</span>
                                            <span class="similarity-score">${Math.round(related.similarity * 100)}%</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Timeline -->
                        <div class="analysis-timeline">
                            <h5>Timeline de Análise</h5>
                            <div class="timeline-items">
                                ${display.timeline.map(item => `
                                    <div class="timeline-item">
                                        <span class="timeline-icon">${item.icon}</span>
                                        <span class="timeline-event">${item.event}</span>
                                        <span class="timeline-date">${item.date.toLocaleDateString()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Ações de exportação -->
                        <div class="export-actions">
                            <h5>Exportar Análise</h5>
                            <div class="export-buttons">
                                ${display.exportFormats.map(format => `
                                    <button class="export-btn" data-action="export" data-format="${format}">
                                        ${format}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Configura event listeners para análise expandível
         */
        setupExpandableAnalysisEvents(fileDiv, file) {
            const expandBtn = fileDiv.querySelector('.expand-analysis-btn');
            const detailsDiv = fileDiv.querySelector('.analysis-details');

            if (expandBtn && detailsDiv) {
                expandBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isExpanded = detailsDiv.style.display !== 'none';
                    
                    detailsDiv.style.display = isExpanded ? 'none' : 'block';
                    expandBtn.querySelector('i').className = isExpanded ? 'icon-chevron-down' : 'icon-chevron-up';
                });
            }

            // Event listeners para exportação
            fileDiv.querySelectorAll('.export-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const format = e.target.dataset.format;
                    this.exportAnalysisResult(file, format);
                });
            });
        }

        /**
         * Exporta resultado da análise em formato específico
         */
        exportAnalysisResult(file, format) {
            const analysisData = {
                fileName: file.name,
                filePath: file.path,
                analysisType: file.analysisType,
                categories: file.categories,
                confidenceScore: file.analysisDisplay?.confidenceScore,
                keywords: file.analysisDisplay?.keywords,
                relatedFiles: file.analysisDisplay?.relatedFiles?.map(r => r.file.name),
                timeline: file.analysisDisplay?.timeline,
                exportedAt: new Date().toISOString()
            };

            switch (format.toLowerCase()) {
                case 'json':
                    this.exportAsJSON(analysisData, file.name);
                    break;
                case 'pdf':
                    this.exportAsPDF(analysisData, file.name);
                    break;
                case 'md':
                    this.exportAsMarkdown(analysisData, file.name);
                    break;
                case 'html':
                    this.exportAsHTML(analysisData, file.name);
                    break;
            }
        }

        /**
         * Exporta como JSON
         */
        exportAsJSON(data, fileName) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            this.downloadBlob(blob, `${fileName}_analysis.json`);
        }

        /**
         * Exporta como Markdown
         */
        exportAsMarkdown(data, fileName) {
            const md = `# Análise: ${data.fileName}

## Informações Básicas
- **Arquivo**: ${data.fileName}
- **Caminho**: ${data.filePath}
- **Tipo de Análise**: ${data.analysisType || 'N/A'}
- **Categorias**: ${data.categories?.join(', ') || 'Nenhuma'}
- **Exportado em**: ${new Date(data.exportedAt).toLocaleString()}

## Confiança da Análise
- **Score Total**: ${data.confidenceScore?.total || 0}%
- **Nível**: ${data.confidenceScore?.level?.name || 'N/A'}

### Fatores de Confiança
${data.confidenceScore?.factors?.map(factor => 
    `- **${factor.name}**: ${factor.score}%`
).join('\n') || 'Nenhum fator identificado'}

## Palavras-chave Principais
${data.keywords?.map(keyword => 
    `- **${keyword.word}** (${keyword.count} ocorrências)`
).join('\n') || 'Nenhuma palavra-chave identificada'}

## Arquivos Relacionados
${data.relatedFiles?.map(name => `- ${name}`).join('\n') || 'Nenhum arquivo relacionado'}

## Timeline
${data.timeline?.map(item => 
    `- **${item.date}**: ${item.event}`
).join('\n') || 'Nenhum evento registrado'}
`;

            const blob = new Blob([md], { type: 'text/markdown' });
            this.downloadBlob(blob, `${fileName}_analysis.md`);
        }

        /**
         * Utilitário para download de blob
         */
        downloadBlob(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }

        /**
         * Utilitários auxiliares
         */
        getAnalysisTypeColor(type) {
            const colors = {
                'Breakthrough Técnico': '#10b981',
                'Evolução Conceitual': '#3b82f6',
                'Momento Decisivo': '#f59e0b',
                'Insight Estratégico': '#8b5cf6',
                'Aprendizado Geral': '#6b7280'
            };
            return colors[type] || '#6b7280';
        }

        inferTypeFromCategory(category) {
            const mappings = {
                'IA/ML': { type: 'Breakthrough Técnico', confidence: 70, color: '#10b981' },
                'Decisão': { type: 'Momento Decisivo', confidence: 75, color: '#f59e0b' },
                'Estratégia': { type: 'Insight Estratégico', confidence: 80, color: '#8b5cf6' },
                'Aprendizado': { type: 'Aprendizado Geral', confidence: 65, color: '#6b7280' }
            };
            return mappings[category] || null;
        }

        isStopWord(word) {
            const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'que', 'de', 'para', 'com', 'em', 'do', 'da', 'dos', 'das'];
            return stopWords.includes(word.toLowerCase());
        }

        getSimilarityReasons(file1, file2, similarity) {
            const reasons = [];
            
            if (file1.analysisType === file2.analysisType) {
                reasons.push('Mesmo tipo de análise');
            }
            
            if (file1.categories && file2.categories) {
                const common = file1.categories.filter(c => file2.categories.includes(c));
                if (common.length > 0) {
                    reasons.push(`Categorias em comum: ${common.join(', ')}`);
                }
            }
            
            return reasons;
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
