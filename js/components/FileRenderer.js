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
            
            if (existingFiles.length > 0) {
                console.log(`FileRenderer: Carregando ${existingFiles.length} arquivos existentes`);
                
                // NOVO: Preserva originais e aplica exclusões apenas para exibição
                this.originalFiles = existingFiles;
                this.files = this.applySmartExclusions([...existingFiles]);
                
                console.log(`FileRenderer: ${this.originalFiles.length} arquivos originais`);
                console.log(`FileRenderer: ${this.files.length} arquivos após exclusões para exibição`);
                
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
                        <div class="relevance-badge">Relevância: ${relevance}%</div>
                        <div class="file-date">${this.formatDate(file.lastModified)}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                        ${file.duplicateConfidence ? `<div class="duplicate-confidence">Confiança: ${Math.round(file.duplicateConfidence * 100)}%</div>` : ''}
                    </div>
                    <div class="file-actions">
                        <button class="action-btn primary" data-action="analyze">🔍 Analisar com IA</button>
                        <button class="action-btn secondary" data-action="view">👁️ Ver Conteúdo</button>
                        <button class="action-btn secondary" data-action="categorize">📂 Categorizar</button>
                        <button class="action-btn secondary" data-action="archive">📦 Arquivar</button>
                    </div>
                </div>
                <div class="file-categories">
                    ${file.analysisType ? `
                        <span class="analysis-type-tag" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 500; margin-right: 8px;">
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
                
                // Atualiza estatísticas
                if (KC.StatsPanel) {
                    KC.StatsPanel.updateStats();
                }
                
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
                    if (KC.StatsPanel) {
                        KC.StatsPanel.updateStats();
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
            if (KC.StatsPanel) {
                KC.StatsPanel.updateStats();
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
            this.container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <h3>Nenhum arquivo encontrado</h3>
                    <p>Configure a descoberta de arquivos para começar a análise.</p>
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
            let score = this.calculateRelevance(file) / 100; // Converte para 0-1
            
            // Ajustes baseados no tipo de análise
            switch (file.analysisType) {
                case 'Evolução Conceitual':
                    score = Math.min(score + 0.25, 1.0);
                    break;
                case 'Momento Decisivo':
                case 'Breakthrough Técnico':
                    score = Math.min(score + 0.20, 1.0);
                    break;
                case 'Insight Estratégico':
                    score = Math.min(score + 0.15, 1.0);
                    break;
                default:
                    score = Math.min(score + 0.05, 1.0);
            }
            
            return score;
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
                    return `<span class="file-category-tag" style="background-color: #6b7280">
                        ${categoryId}
                    </span>`;
                }
                
                return `<span class="file-category-tag" style="background-color: ${category.color}" title="${category.name}">
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
            
            // Atualiza arquivo
            const allFiles = AppState.get('files') || [];
            const fileIndex = allFiles.findIndex(f => f.id === fileId || f.name === fileId);
            
            if (fileIndex !== -1) {
                allFiles[fileIndex].categories = selectedCategories;
                allFiles[fileIndex].categorizedDate = new Date().toISOString();
                AppState.set('files', allFiles);
                
                KC.showNotification({
                    type: 'success',
                    message: `Categorias salvas para ${allFiles[fileIndex].name}`,
                    details: `${selectedCategories.length} categoria(s) aplicada(s)`
                });
                
                // CORREÇÃO: Remove chamada duplicada - STATE_CHANGED já cuida da renderização
                // this.renderFileList(); // Removido para evitar dupla renderização
                
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
            
            // Se não há seleção, não mostra a barra
            if (count === 0) {
                return;
            }
            
            // Cria nova barra
            const bar = document.createElement('div');
            bar.className = 'bulk-actions-bar';
            bar.innerHTML = `
                <div class="bulk-actions-container">
                    <span class="selection-count">${count} arquivo(s) selecionado(s)</span>
                    <div class="bulk-actions">
                        <button class="bulk-action-btn" onclick="KC.FileRenderer.bulkCategorize()">
                            📂 Categorizar Selecionados
                        </button>
                        <button class="bulk-action-btn" onclick="KC.FileRenderer.bulkAnalyze()">
                            🔍 Analisar Selecionados
                        </button>
                        <button class="bulk-action-btn" onclick="KC.FileRenderer.bulkArchive()">
                            📦 Arquivar Selecionados
                        </button>
                        <button class="bulk-action-btn secondary" onclick="KC.FileRenderer.clearSelection()">
                            ❌ Limpar Seleção
                        </button>
                    </div>
                </div>
            `;
            
            // Insere após o header da seção de arquivos
            const filesHeader = document.querySelector('.files-header');
            if (filesHeader) {
                filesHeader.after(bar);
            }
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
        }
        
        /**
         * NOVO: Análise em lote
         */
        bulkAnalyze() {
            alert(`Análise em lote de ${this.selectedFiles.size} arquivo(s) será implementada na SPRINT 1.3`);
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
    KC.FileRenderer.bulkAnalyze = KC.FileRenderer.bulkAnalyze.bind(KC.FileRenderer);
    KC.FileRenderer.bulkArchive = KC.FileRenderer.bulkArchive.bind(KC.FileRenderer);
    KC.FileRenderer.clearSelection = KC.FileRenderer.clearSelection.bind(KC.FileRenderer);
    KC.FileRenderer.applyBulkCategories = KC.FileRenderer.applyBulkCategories.bind(KC.FileRenderer);

})(window);
