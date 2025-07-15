/**
 * EventBus.js - Sistema de Eventos
 * 
 * Sistema pub/sub para comunicação desacoplada entre componentes
 * Permite que componentes se comuniquem sem dependências diretas
 */

(function(window) {
    'use strict';

    class EventBus {
        constructor() {
            this.events = new Map();
            this.debugMode = false;
            this.eventHistory = [];
            this.maxHistorySize = 100;
        }

        /**
         * Registra um listener para um evento
         * @param {string} eventName - Nome do evento
         * @param {Function} callback - Função a ser executada
         * @param {Object} options - Opções do listener
         * @returns {Function} Função para remover o listener
         */
        on(eventName, callback, options = {}) {
            if (!eventName || typeof callback !== 'function') {
                throw new Error('EventBus: Nome do evento e callback são obrigatórios');
            }

            if (!this.events.has(eventName)) {
                this.events.set(eventName, []);
            }

            const listener = {
                callback,
                priority: options.priority || 0,
                once: options.once || false,
                id: this._generateId()
            };

            // Adiciona listener ordenado por prioridade
            const listeners = this.events.get(eventName);
            const insertIndex = listeners.findIndex(l => l.priority < listener.priority);
            
            if (insertIndex === -1) {
                listeners.push(listener);
            } else {
                listeners.splice(insertIndex, 0, listener);
            }

            this._debug('Listener registrado', { eventName, listenerId: listener.id });

            // Retorna função para remover o listener
            return () => this.off(eventName, listener.id);
        }

        /**
         * Registra um listener que será executado apenas uma vez
         * @param {string} eventName - Nome do evento
         * @param {Function} callback - Função a ser executada
         * @param {Object} options - Opções do listener
         * @returns {Function} Função para remover o listener
         */
        once(eventName, callback, options = {}) {
            return this.on(eventName, callback, { ...options, once: true });
        }

        /**
         * Remove um listener específico
         * @param {string} eventName - Nome do evento
         * @param {string} listenerId - ID do listener
         */
        off(eventName, listenerId) {
            if (!this.events.has(eventName)) return;

            const listeners = this.events.get(eventName);
            const index = listeners.findIndex(l => l.id === listenerId);
            
            if (index !== -1) {
                listeners.splice(index, 1);
                this._debug('Listener removido', { eventName, listenerId });
            }

            // Remove o evento se não houver mais listeners
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }
        }

        /**
         * Remove todos os listeners de um evento
         * @param {string} eventName - Nome do evento
         */
        offAll(eventName) {
            if (eventName) {
                this.events.delete(eventName);
                this._debug('Todos os listeners removidos', { eventName });
            } else {
                this.events.clear();
                this._debug('Todos os eventos foram limpos');
            }
        }

        /**
         * Emite um evento
         * @param {string} eventName - Nome do evento
         * @param {*} data - Dados a serem passados aos listeners
         * @returns {Promise} Promise que resolve quando todos os listeners foram executados
         */
        async emit(eventName, data = null) {
            if (!this.events.has(eventName)) {
                this._debug('Evento emitido sem listeners', { eventName });
                return;
            }

            const listeners = [...this.events.get(eventName)];
            const results = [];

            this._addToHistory(eventName, data);
            this._debug('Evento emitido', { eventName, data, listenerCount: listeners.length });

            for (const listener of listeners) {
                try {
                    const result = await Promise.resolve(listener.callback(data));
                    results.push(result);

                    if (listener.once) {
                        this.off(eventName, listener.id);
                    }
                } catch (error) {
                    console.error(`Erro no listener do evento ${eventName}:`, error);
                    this._debug('Erro no listener', { eventName, error: error.message });
                }
            }

            return results;
        }

        /**
         * Emite um evento de forma síncrona
         * @param {string} eventName - Nome do evento
         * @param {*} data - Dados a serem passados aos listeners
         */
        emitSync(eventName, data = null) {
            if (!this.events.has(eventName)) {
                this._debug('Evento emitido sem listeners', { eventName });
                return;
            }

            const listeners = [...this.events.get(eventName)];
            this._addToHistory(eventName, data);
            this._debug('Evento emitido (sync)', { eventName, data, listenerCount: listeners.length });

            for (const listener of listeners) {
                try {
                    listener.callback(data);
                    
                    if (listener.once) {
                        this.off(eventName, listener.id);
                    }
                } catch (error) {
                    console.error(`Erro no listener do evento ${eventName}:`, error);
                    this._debug('Erro no listener', { eventName, error: error.message });
                }
            }
        }

        /**
         * Verifica se há listeners para um evento
         * @param {string} eventName - Nome do evento
         * @returns {boolean} True se há listeners
         */
        hasListeners(eventName) {
            return this.events.has(eventName) && this.events.get(eventName).length > 0;
        }

        /**
         * Retorna a quantidade de listeners para um evento
         * @param {string} eventName - Nome do evento
         * @returns {number} Quantidade de listeners
         */
        getListenerCount(eventName) {
            return this.events.has(eventName) ? this.events.get(eventName).length : 0;
        }

        /**
         * Aguarda um evento ser emitido
         * @param {string} eventName - Nome do evento
         * @param {number} timeout - Timeout em ms (opcional)
         * @returns {Promise} Promise que resolve com os dados do evento
         */
        waitFor(eventName, timeout = 0) {
            return new Promise((resolve, reject) => {
                const removeListener = this.once(eventName, (data) => {
                    if (timeoutId) clearTimeout(timeoutId);
                    resolve(data);
                });

                let timeoutId;
                if (timeout > 0) {
                    timeoutId = setTimeout(() => {
                        removeListener();
                        reject(new Error(`Timeout aguardando evento: ${eventName}`));
                    }, timeout);
                }
            });
        }

        /**
         * Ativa/desativa modo debug
         * @param {boolean} enabled - Estado do debug
         */
        setDebugMode(enabled) {
            this.debugMode = enabled;
            this._debug('Modo debug', { enabled });
        }

        /**
         * Obtém o histórico de eventos
         * @param {string} eventName - Filtrar por nome do evento (opcional)
         * @returns {Array} Histórico de eventos
         */
        getHistory(eventName = null) {
            if (eventName) {
                return this.eventHistory.filter(entry => entry.eventName === eventName);
            }
            return [...this.eventHistory];
        }

        /**
         * Limpa o histórico de eventos
         */
        clearHistory() {
            this.eventHistory = [];
            this._debug('Histórico limpo');
        }

        /**
         * Adiciona evento ao histórico
         * @private
         */
        _addToHistory(eventName, data) {
            this.eventHistory.push({
                eventName,
                data,
                timestamp: new Date().toISOString()
            });

            // Mantém o histórico no tamanho máximo
            if (this.eventHistory.length > this.maxHistorySize) {
                this.eventHistory.shift();
            }
        }

        /**
         * Gera ID único para listener
         * @private
         */
        _generateId() {
            return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Log de debug
         * @private
         */
        _debug(message, data = {}) {
            if (this.debugMode) {
                console.log(`[EventBus] ${message}`, data);
            }
        }
    }

    // Cria instância singleton
    const eventBus = new EventBus();

    // Registra no namespace global
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KnowledgeConsolidator.EventBus = eventBus;

    // Eventos do sistema
    window.KnowledgeConsolidator.Events = {
        // Estado
        STATE_CHANGED: 'state:changed',
        STATE_RESTORED: 'state:restored',
        
        // Navegação
        STEP_CHANGED: 'navigation:step:changed',
        PANEL_CHANGED: 'navigation:panel:changed',
        
        // Arquivos
        FILES_DISCOVERED: 'files:discovered',
        FILES_UPDATED: 'files:updated',
        FILE_SELECTED: 'file:selected',
        FILE_ANALYZED: 'file:analyzed',
        FILE_CATEGORIZED: 'file:categorized',
        
        // Discovery
        DISCOVERY_STARTED: 'discovery:started',
        DISCOVERY_PROGRESS: 'discovery:progress',
        DISCOVERY_COMPLETED: 'discovery:completed',
        
        // Filtros
        FILTER_CHANGED: 'filter:changed',
        SORT_CHANGED: 'sort:changed',
        FILES_FILTERED: 'files:filtered',
        
        // Estatísticas
        STATS_UPDATED: 'stats:updated',
        
        // Análise IA
        ANALYSIS_REQUESTED: 'analysis:requested',
        ANALYSIS_STARTED: 'analysis:started',
        ANALYSIS_COMPLETED: 'analysis:completed',
        ANALYSIS_QUEUE_UPDATED: 'analysis:queue:updated',
        ANALYSIS_ITEM_STARTED: 'analysis:item:started',
        ANALYSIS_ITEM_UPDATED: 'analysis:item:updated',
        ANALYSIS_ITEM_COMPLETED: 'analysis:item:completed',
        ANALYSIS_ITEM_ERROR: 'analysis:item:error',
        ANALYSIS_CONFIG_CHANGED: 'analysis:config:changed',
        
        // UI
        MODAL_OPEN: 'ui:modal:open',
        MODAL_CLOSE: 'ui:modal:close',
        NOTIFICATION_SHOW: 'ui:notification:show',
        
        // Progresso
        PROGRESS_START: 'progress:start',
        PROGRESS_UPDATE: 'progress:update',
        PROGRESS_END: 'progress:end',
        
        // Sistema
        EXECUTE_SYSTEM_REQUESTED: 'system:execute:requested',
        RESET_CONFIGURATION_REQUESTED: 'system:reset:requested',
        
        // Erros
        ERROR_OCCURRED: 'error:occurred'
    };

})(window);