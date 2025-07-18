/**
 * AppState.js - Gerenciamento de Estado Global
 * 
 * Store centralizado para todo o estado da aplicação
 * Mantém sincronização entre componentes e persiste dados
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;

    class AppState {
        constructor() {
            this.state = this._getInitialState();
            this.history = [];
            this.maxHistorySize = 50;
            this.localStorageKey = 'kc_app_state';
            this.autosave = true;
            this.autosaveDebounce = null;
            
            // Carrega estado salvo
            this._loadState();
        }

        /**
         * Define o estado inicial da aplicação
         * @private
         */
        _getInitialState() {
            return {
                currentStep: 1,
                configuration: {
                    discovery: {
                        // ORIGINAL - Preservado para rollback
                        // filePatterns: ['*.md', '*.txt', '*.docx', '*.pdf'],
                        // NOVO - Adiciona .gdoc
                        filePatterns: ['*.md', '*.txt', '*.docx', '*.pdf', '*.gdoc'],
                        directories: [],
                        dateMetric: 'created', // created, modified, accessed
                        timeRange: 'all', // 1m, 3m, 6m, 1y, 2y, all
                        recursive: true,
                        excludePatterns: ['temp', 'cache', 'backup']
                    },
                    preAnalysis: {
                        keywords: ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'],
                        relevanceThreshold: 50, // 30, 50, 70, 90
                        maxResults: 100,
                        sizeFilter: 'all', // all, small, medium, large
                        previewEnabled: true
                    },
                    aiAnalysis: {
                        model: 'claude-sonnet-4', // claude-sonnet-4, claude-opus-4, gpt-4
                        tokenLimit: 8000, // 4000, 8000, 16000
                        customPrompt: '',
                        batchSize: 10,
                        autoAnalyze: false
                    },
                    organization: {
                        exportPath: '/Knowledge Consolidation',
                        structure: 'category', // date, category, relevance, hybrid
                        autoCategories: true,
                        exportFormats: ['json', 'markdown'] // json, markdown, pdf, html
                    }
                },
                files: [],
                categories: [
                    { id: 'tech', name: 'Momentos Decisivos/Técnicos', color: '#3b82f6', count: 0 },
                    { id: 'strategic', name: 'Momentos Decisivos/Estratégicos', color: '#8b5cf6', count: 0 },
                    { id: 'conceptual', name: 'Momentos Decisivos/Conceituais', color: '#ec4899', count: 0 },
                    { id: 'development', name: 'Insights/Desenvolvimento', color: '#10b981', count: 0 },
                    { id: 'business', name: 'Insights/Negócios', color: '#f59e0b', count: 0 },
                    { id: 'methodological', name: 'Aprendizados/Metodológicos', color: '#14b8a6', count: 0 },
                    { id: 'breakthrough', name: 'Breakthroughs/Tecnológicos', color: '#ef4444', count: 0 },
                    { id: 'personal', name: 'Reflexões/Pessoais', color: '#6366f1', count: 0 }
                ],
                stats: {
                    totalFiles: 0,
                    discoveredFiles: 0,
                    analyzedFiles: 0,
                    pendingFiles: 0,
                    archivedFiles: 0,
                    highRelevance: 0,
                    mediumRelevance: 0,
                    lowRelevance: 0,
                    totalTokensUsed: 0,
                    averageRelevance: 0,
                    processingTime: 0,
                    lastUpdate: null
                },
                timeline: [],
                currentFilter: 'all',
                currentSort: 'relevance',
                selectedFiles: [],
                ui: {
                    modalOpen: false,
                    notificationQueue: [],
                    loading: false,
                    loadingMessage: '',
                    sidebarCollapsed: false,
                    viewMode: 'grid' // grid, list
                }
            };
        }

        /**
         * Obtém valor do estado
         * @param {string} path - Caminho pontilhado (ex: 'configuration.discovery.filePatterns')
         * @returns {*} Valor do estado
         */
        get(path) {
            if (!path) return this.state;

            return path.split('.').reduce((obj, key) => {
                return obj && obj[key] !== undefined ? obj[key] : undefined;
            }, this.state);
        }

        /**
         * Define valor no estado
         * @param {string} path - Caminho pontilhado
         * @param {*} value - Novo valor
         * @param {Object} options - Opções de configuração
         */
        set(path, value, options = {}) {
            const { silent = false, save = true } = options;
            
            // Salva estado anterior no histórico
            if (!silent) {
                this._addToHistory();
            }

            // Navega até o objeto pai
            const keys = path.split('.');
            const lastKey = keys.pop();
            const target = keys.reduce((obj, key) => {
                if (!obj[key]) obj[key] = {};
                return obj[key];
            }, this.state);

            // Define o novo valor
            const oldValue = target[lastKey];
            target[lastKey] = value;

            // Emite evento de mudança
            if (!silent) {
                EventBus.emit(Events.STATE_CHANGED, {
                    path,
                    oldValue,
                    newValue: value
                });
            }

            // Salva no localStorage
            if (save && this.autosave) {
                this._scheduleSave();
            }

            return value;
        }

        /**
         * Atualiza múltiplos valores de uma vez
         * @param {Object} updates - Objeto com caminhos e valores
         * @param {Object} options - Opções de configuração
         */
        update(updates, options = {}) {
            const { silent = false } = options;
            
            if (!silent) {
                this._addToHistory();
            }

            Object.entries(updates).forEach(([path, value]) => {
                this.set(path, value, { silent: true, save: false });
            });

            if (!silent) {
                EventBus.emit(Events.STATE_CHANGED, { 
                    type: 'batch', 
                    updates 
                });
            }

            if (this.autosave) {
                this._scheduleSave();
            }
        }

        /**
         * Adiciona item a um array no estado
         * @param {string} path - Caminho para o array
         * @param {*} item - Item a adicionar
         * @param {Object} options - Opções
         */
        push(path, item, options = {}) {
            const array = this.get(path);
            if (!Array.isArray(array)) {
                throw new Error(`Path ${path} não é um array`);
            }

            const newArray = [...array, item];
            this.set(path, newArray, options);
            return newArray;
        }

        /**
         * Remove item de um array no estado
         * @param {string} path - Caminho para o array
         * @param {Function|number} predicate - Função de teste ou índice
         * @param {Object} options - Opções
         */
        remove(path, predicate, options = {}) {
            const array = this.get(path);
            if (!Array.isArray(array)) {
                throw new Error(`Path ${path} não é um array`);
            }

            let newArray;
            if (typeof predicate === 'function') {
                newArray = array.filter((item, index) => !predicate(item, index));
            } else if (typeof predicate === 'number') {
                newArray = [...array];
                newArray.splice(predicate, 1);
            } else {
                throw new Error('Predicate deve ser uma função ou índice');
            }

            this.set(path, newArray, options);
            return newArray;
        }

        /**
         * Atualiza item em um array
         * @param {string} path - Caminho para o array
         * @param {Function} predicate - Função para encontrar o item
         * @param {Object} updates - Atualizações a aplicar
         * @param {Object} options - Opções
         */
        updateItem(path, predicate, updates, options = {}) {
            const array = this.get(path);
            if (!Array.isArray(array)) {
                throw new Error(`Path ${path} não é um array`);
            }

            const newArray = array.map(item => {
                if (predicate(item)) {
                    return { ...item, ...updates };
                }
                return item;
            });

            this.set(path, newArray, options);
            return newArray;
        }

        /**
         * Reseta o estado para o inicial
         * @param {Object} options - Opções
         */
        reset(options = {}) {
            const { silent = false } = options;
            
            this.state = this._getInitialState();
            this.history = [];
            
            if (!silent) {
                EventBus.emit(Events.STATE_RESTORED, { type: 'reset' });
            }
            
            this._save();
        }

        /**
         * Desfaz última alteração
         */
        undo() {
            if (this.history.length === 0) return false;

            const previousState = this.history.pop();
            this.state = JSON.parse(previousState);
            
            EventBus.emit(Events.STATE_RESTORED, { type: 'undo' });
            this._save();
            
            return true;
        }

        /**
         * Salva estado no localStorage com compressão
         * @private
         */
        _save() {
            try {
                // Comprime dados pesados antes de salvar
                const compressedFiles = this._compressFilesData(this.state.files || []);
                
                // Remove dados que não devem ser salvos
                const stateToSave = {
                    ...this.state,
                    files: compressedFiles,                  // Dados comprimidos
                    timeline: (this.state.timeline || []).slice(-50), // Mantém apenas 50 últimos itens
                    selectedFiles: [],                       // Limpa seleção ao salvar
                    ui: {
                        ...this.state.ui,
                        modalOpen: false,
                        notificationQueue: [],
                        loading: false,
                        loadingMessage: ''
                    }
                };

                const serializedData = JSON.stringify({
                    state: stateToSave,
                    version: '1.0.0',
                    timestamp: Date.now()
                });

                // Verifica tamanho antes de salvar
                const dataSize = serializedData.length;
                const maxSize = 4 * 1024 * 1024; // 4MB (quota típica)
                
                if (dataSize > maxSize) {
                    KC.Logger?.warning(`Dados muito grandes para localStorage: ${Math.round(dataSize/1024)}KB`);
                    
                    // Estratégia de redução: manter apenas metadados essenciais
                    const minimalState = {
                        ...stateToSave,
                        files: this._getMinimalFilesData(this.state.files || []),
                        timeline: (this.state.timeline || []).slice(-10)
                    };
                    
                    localStorage.setItem(this.localStorageKey, JSON.stringify({
                        state: minimalState,
                        version: '1.0.0',
                        timestamp: Date.now(),
                        compressed: true
                    }));
                    
                    KC.Logger?.info('Estado salvo com compressão máxima');
                } else {
                    localStorage.setItem(this.localStorageKey, serializedData);
                    KC.Logger?.debug(`Estado salvo: ${Math.round(dataSize/1024)}KB`);
                }
                
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    console.error('Quota do localStorage excedida - aplicando limpeza', error);
                    this._handleQuotaExceeded();
                } else {
                    console.error('Erro ao salvar estado:', error);
                    EventBus.emit(Events.ERROR_OCCURRED, {
                        type: 'save_state',
                        error: error.message
                    });
                }
            }
        }

        /**
         * Comprime dados dos arquivos removendo conteúdo pesado
         * @private
         */
        _compressFilesData(files) {
            return files.map(file => ({
                // Metadados essenciais
                id: file.id,
                name: file.name,
                path: file.path,
                size: file.size,
                extension: file.extension,
                lastModified: file.lastModified,
                
                // Preserva handle para re-leitura posterior
                handle: file.handle,
                
                // Análise e relevância (mantém)
                relevanceScore: file.relevanceScore,
                tokenSavings: file.tokenSavings,
                status: file.status,
                category: file.category,
                analyzed: file.analyzed,
                analysisType: file.analysisType,
                analysisDate: file.analysisDate,
                
                // Preview comprimido (apenas segmentos essenciais)
                smartPreview: file.smartPreview ? {
                    relevanceScore: file.smartPreview.relevanceScore,
                    structureAnalysis: file.smartPreview.structureAnalysis,
                    stats: file.smartPreview.stats
                    // Remove content segments pesados
                } : null,
                
                // MANTÉM preview para exibição na lista
                preview: file.preview,
                
                // Remove apenas conteúdo completo
                // content: REMOVIDO  
                
                // Timestamps
                discoveredAt: file.discoveredAt,
                analyzedAt: file.analyzedAt
            }));
        }

        /**
         * Dados mínimos para casos extremos
         * @private  
         */
        _getMinimalFilesData(files) {
            return files.slice(0, 50).map(file => ({
                id: file.id,
                name: file.name,
                relevanceScore: file.relevanceScore,
                status: file.status,
                lastModified: file.lastModified
            }));
        }

        /**
         * Trata erro de quota excedida
         * @private
         */
        _handleQuotaExceeded() {
            try {
                // Limpa dados antigos
                this._clearOldData();
                
                // Tenta salvar apenas configurações críticas
                const criticalState = {
                    currentStep: this.state.currentStep,
                    configuration: this.state.configuration,
                    stats: {
                        totalFiles: this.state.stats?.totalFiles || 0,
                        discoveredFiles: this.state.stats?.discoveredFiles || 0
                    }
                };
                
                localStorage.setItem(this.localStorageKey, JSON.stringify({
                    state: criticalState,
                    version: '1.0.0',
                    timestamp: Date.now(),
                    minimal: true
                }));
                
                console.log('Estado crítico salvo após limpeza');
                
                // Notifica o usuário
                if (window.KnowledgeConsolidator?.showNotification) {
                    window.KnowledgeConsolidator.showNotification({
                        type: 'warning',
                        message: 'Memória do navegador cheia - dados otimizados automaticamente',
                        duration: 5000
                    });
                }
                
            } catch (secondError) {
                console.error('Falha na recuperação de quota', secondError);
                
                // Último recurso: limpa tudo
                localStorage.removeItem(this.localStorageKey);
                console.log('localStorage limpo - reinicie a aplicação');
            }
        }

        /**
         * Limpa dados antigos do localStorage
         * @private
         */
        _clearOldData() {
            // Remove chaves antigas do Knowledge Consolidator
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('kc_') || key.startsWith('knowledge_'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                if (key !== this.localStorageKey) {
                    localStorage.removeItem(key);
                }
            });
            
            console.log(`Removidas ${keysToRemove.length} chaves antigas do localStorage`);
        }

        /**
         * Agenda salvamento com debounce
         * @private
         */
        _scheduleSave() {
            if (this.autosaveDebounce) {
                clearTimeout(this.autosaveDebounce);
            }

            this.autosaveDebounce = setTimeout(() => {
                this._save();
            }, 500);
        }

        /**
         * Carrega estado do localStorage
         * @private
         */
        _loadState() {
            try {
                const saved = localStorage.getItem(this.localStorageKey);
                if (saved) {
                    const { state, version } = JSON.parse(saved);
                    
                    // Verifica compatibilidade de versão
                    if (version === '1.0.0') {
                        // Merge com estado inicial para garantir novas propriedades
                        this.state = this._mergeStates(this._getInitialState(), state);
                        EventBus.emit(Events.STATE_RESTORED, { type: 'load' });
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar estado:', error);
                // Mantém estado inicial em caso de erro
            }
        }

        /**
         * Merge recursivo de estados
         * @private
         */
        _mergeStates(initial, saved) {
            const result = { ...initial };
            
            Object.keys(saved).forEach(key => {
                if (saved[key] !== null && typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
                    result[key] = this._mergeStates(initial[key] || {}, saved[key]);
                } else {
                    result[key] = saved[key];
                }
            });
            
            return result;
        }

        /**
         * Adiciona estado atual ao histórico
         * @private
         */
        _addToHistory() {
            const stateSnapshot = JSON.stringify(this.state);
            this.history.push(stateSnapshot);
            
            // Mantém histórico no tamanho máximo
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
            }
        }

        /**
         * Exporta estado atual
         * @returns {Object} Estado completo
         */
        export() {
            return {
                state: JSON.parse(JSON.stringify(this.state)),
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            };
        }

        /**
         * Importa estado
         * @param {Object} data - Dados para importar
         * @param {Object} options - Opções
         */
        import(data, options = {}) {
            const { silent = false } = options;
            
            try {
                const { state, version } = data;
                
                if (version !== '1.0.0') {
                    throw new Error('Versão incompatível');
                }
                
                this._addToHistory();
                this.state = this._mergeStates(this._getInitialState(), state);
                
                if (!silent) {
                    EventBus.emit(Events.STATE_RESTORED, { type: 'import' });
                }
                
                this._save();
                return true;
            } catch (error) {
                console.error('Erro ao importar estado:', error);
                EventBus.emit(Events.ERROR_OCCURRED, {
                    type: 'import_state',
                    error: error.message
                });
                return false;
            }
        }
    }

    // Cria instância singleton
    const appState = new AppState();

    // Registra no namespace global
    KC.AppState = appState;

})(window);