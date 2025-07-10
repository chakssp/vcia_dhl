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
                        filePatterns: ['*.md', '*.txt', '*.docx', '*.pdf'],
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
         * Salva estado no localStorage
         * @private
         */
        _save() {
            try {
                const stateToSave = {
                    state: this.state,
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                };
                
                localStorage.setItem(this.localStorageKey, JSON.stringify(stateToSave));
            } catch (error) {
                console.error('Erro ao salvar estado:', error);
                EventBus.emit(Events.ERROR_OCCURRED, {
                    type: 'save_state',
                    error: error.message
                });
            }
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