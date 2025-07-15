/**
 * AnalysisManager.js - Orquestrador de Análise com IA
 * 
 * Gerencia a análise de arquivos com modelos de IA (Claude, GPT-4, Gemini)
 * incluindo fila de processamento, rate limiting e gestão de resultados.
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class AnalysisManager {
        constructor() {
            this.state = {
                queue: [],
                processing: false,
                results: new Map(),
                stats: {
                    processed: 0,
                    errors: 0,
                    totalCost: 0,
                    avgProcessingTime: 0
                }
            };
            
            this.config = {
                model: 'claude-3-sonnet',
                template: 'decisiveMoments',
                batchSize: 5,
                temperature: 0.7,
                maxTokens: 2000,
                retryAttempts: 3,
                timeoutMs: 30000
            };
            
            this.isInitialized = false;
        }

        /**
         * Inicializa o AnalysisManager
         */
        async initialize() {
            if (this.isInitialized) return;
            
            try {
                // Carrega configurações salvas
                await this.loadSavedConfiguration();
                
                // Carrega resultados salvos
                await this.loadSavedResults();
                
                // Configura event listeners
                this.bindEvents();
                
                // Configura auto-save
                this.setupAutoSave();
                
                this.isInitialized = true;
                KC.Logger?.success('AnalysisManager inicializado');
                
            } catch (error) {
                KC.Logger?.error('Erro ao inicializar AnalysisManager:', error);
                throw error;
            }
        }

        /**
         * Configura event listeners
         */
        bindEvents() {
            // Escuta solicitações de análise
            if (Events && Events.ANALYSIS_REQUESTED) {
                EventBus.on(Events.ANALYSIS_REQUESTED, (data) => {
                    this.addToQueue(data.files, data.options);
                });
            }

            // Escuta mudanças de configuração
            if (Events && Events.ANALYSIS_CONFIG_CHANGED) {
                EventBus.on(Events.ANALYSIS_CONFIG_CHANGED, (data) => {
                    this.updateConfig(data.config);
                });
            }
        }

        /**
         * Adiciona arquivos à fila de análise
         */
        async addToQueue(files, options = {}) {
            if (!files || !Array.isArray(files) || files.length === 0) {
                KC.Logger?.warning('Nenhum arquivo fornecido para análise');
                return;
            }

            const queueItems = files.map(file => ({
                id: this.generateId(),
                file,
                config: { ...this.config, ...options },
                status: 'pending',
                createdAt: Date.now(),
                attempts: 0
            }));
            
            this.state.queue.push(...queueItems);
            
            // Emite evento de atualização da fila
            this.emitQueueUpdate();
            
            // Inicia processamento se não estiver em andamento
            if (!this.state.processing) {
                this.processQueue();
            }
            
            KC.Logger?.info(`${files.length} arquivo(s) adicionado(s) à fila de análise`);
        }

        /**
         * Processa a fila de análise
         */
        async processQueue() {
            if (this.state.processing || this.state.queue.length === 0) return;
            
            this.state.processing = true;
            
            EventBus.emit(Events.ANALYSIS_STARTED, { 
                queueSize: this.state.queue.length 
            });
            
            try {
                while (this.state.queue.length > 0) {
                    // Pega próximo batch
                    const batch = this.state.queue
                        .filter(item => item.status === 'pending')
                        .slice(0, this.config.batchSize);
                    
                    if (batch.length === 0) break;
                    
                    // Processa batch
                    await this.processBatch(batch);
                    
                    // Pequena pausa entre batches
                    await this.delay(1000);
                }
            } catch (error) {
                KC.Logger?.error('Erro no processamento da fila:', error);
            } finally {
                this.state.processing = false;
                
                EventBus.emit(Events.ANALYSIS_COMPLETED, {
                    stats: this.state.stats
                });
            }
        }

        /**
         * Processa um batch de arquivos
         */
        async processBatch(batch) {
            KC.Logger?.info(`Processando batch de ${batch.length} arquivo(s)`);
            
            // Por enquanto, simula análise
            // TODO: Integrar com APIs reais
            for (const item of batch) {
                try {
                    item.status = 'processing';
                    this.emitItemUpdate(item);
                    
                    // Simula processamento
                    await this.delay(2000);
                    
                    // Simula resultado
                    const result = {
                        analysis: {
                            momentos_decisivos: [
                                {
                                    tipo: "insight",
                                    titulo: "Insight Simulado",
                                    descricao: "Este é um resultado simulado da análise",
                                    contexto: "Contexto do arquivo analisado",
                                    impacto: "Alto",
                                    categoria: "Desenvolvimento"
                                }
                            ],
                            temas_principais: ["simulação", "teste"],
                            palavras_chave: ["análise", "ia", "teste"],
                            nivel_relevancia: 8,
                            potencial_projeto: {
                                tem_potencial: true,
                                area: "Automação",
                                descricao: "Potencial para automação de processos"
                            }
                        },
                        metadata: {
                            processingTime: 2000,
                            model: item.config.model,
                            template: item.config.template,
                            tokensUsed: 1500,
                            cost: 0.003
                        }
                    };
                    
                    this.handleSuccess(item, result);
                    
                } catch (error) {
                    this.handleError(item, error);
                }
            }
        }

        /**
         * Manipula sucesso no processamento
         */
        handleSuccess(item, result) {
            // Atualiza item
            item.status = 'completed';
            item.completedAt = Date.now();
            item.result = result;
            
            // Salva resultado
            this.state.results.set(item.file.id || item.file.name, result);
            
            // Atualiza estatísticas
            this.state.stats.processed++;
            this.state.stats.totalCost += result.metadata.cost || 0;
            
            // Atualiza arquivo no AppState
            this.updateFileWithAnalysis(item.file, result);
            
            // Emite eventos
            this.emitItemUpdate(item);
            EventBus.emit(Events.ANALYSIS_ITEM_COMPLETED, {
                file: item.file,
                result: result
            });
            
            KC.Logger?.success(`Análise concluída: ${item.file.name}`);
        }

        /**
         * Manipula erro no processamento
         */
        handleError(item, error) {
            item.attempts++;
            
            if (item.attempts < this.config.retryAttempts) {
                // Tenta novamente
                item.status = 'pending';
                KC.Logger?.warning(`Tentativa ${item.attempts} falhou, tentando novamente...`);
            } else {
                // Marca como erro
                item.status = 'error';
                item.error = error.message || error;
                this.state.stats.errors++;
                
                EventBus.emit(Events.ANALYSIS_ITEM_ERROR, {
                    file: item.file,
                    error: error
                });
                
                KC.Logger?.error(`Erro na análise de ${item.file.name}:`, error);
            }
            
            this.emitItemUpdate(item);
        }

        /**
         * Atualiza arquivo com resultado da análise
         */
        updateFileWithAnalysis(file, result) {
            const files = AppState.get('files') || [];
            const fileIndex = files.findIndex(f => 
                (f.id && f.id === file.id) || (f.name === file.name)
            );
            
            if (fileIndex !== -1) {
                files[fileIndex] = {
                    ...files[fileIndex],
                    analyzed: true,
                    analysisDate: new Date().toISOString(),
                    analysisResult: result.analysis,
                    analysisMetadata: result.metadata
                };
                
                AppState.set('files', files);
            }
        }

        /**
         * Atualiza configuração
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            this.saveConfiguration();
            
            KC.Logger?.info('Configuração de análise atualizada:', this.config);
        }

        /**
         * Obtém status da fila
         */
        getQueueStatus() {
            return {
                total: this.state.queue.length,
                pending: this.state.queue.filter(i => i.status === 'pending').length,
                processing: this.state.queue.filter(i => i.status === 'processing').length,
                completed: this.state.queue.filter(i => i.status === 'completed').length,
                errors: this.state.queue.filter(i => i.status === 'error').length,
                isProcessing: this.state.processing
            };
        }

        /**
         * Obtém estatísticas
         */
        getStats() {
            return { ...this.state.stats };
        }

        /**
         * Limpa a fila
         */
        clearQueue() {
            this.state.queue = [];
            this.emitQueueUpdate();
            KC.Logger?.info('Fila de análise limpa');
        }

        /**
         * Para o processamento
         */
        stopProcessing() {
            this.state.processing = false;
            KC.Logger?.info('Processamento de análise parado');
        }

        // === MÉTODOS AUXILIARES ===

        /**
         * Gera ID único
         */
        generateId() {
            return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Delay assíncrono
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Emite atualização da fila
         */
        emitQueueUpdate() {
            EventBus.emit(Events.ANALYSIS_QUEUE_UPDATED, {
                status: this.getQueueStatus(),
                timestamp: Date.now()
            });
        }

        /**
         * Emite atualização de item
         */
        emitItemUpdate(item) {
            EventBus.emit(Events.ANALYSIS_ITEM_UPDATED, {
                item: item,
                timestamp: Date.now()
            });
        }

        /**
         * Carrega configuração salva
         */
        async loadSavedConfiguration() {
            try {
                const saved = localStorage.getItem('analysisManager.config');
                if (saved) {
                    this.config = { ...this.config, ...JSON.parse(saved) };
                }
            } catch (error) {
                KC.Logger?.warning('Erro ao carregar configuração:', error);
            }
        }

        /**
         * Salva configuração
         */
        saveConfiguration() {
            try {
                localStorage.setItem('analysisManager.config', JSON.stringify(this.config));
            } catch (error) {
                KC.Logger?.warning('Erro ao salvar configuração:', error);
            }
        }

        /**
         * Carrega resultados salvos
         */
        async loadSavedResults() {
            try {
                const saved = localStorage.getItem('analysisManager.results');
                if (saved) {
                    const results = JSON.parse(saved);
                    this.state.results = new Map(Object.entries(results));
                }
            } catch (error) {
                KC.Logger?.warning('Erro ao carregar resultados:', error);
            }
        }

        /**
         * Configura auto-save
         */
        setupAutoSave() {
            setInterval(() => {
                this.saveResults();
            }, 30000); // Salva a cada 30 segundos
        }

        /**
         * Salva resultados
         */
        saveResults() {
            try {
                const results = Object.fromEntries(this.state.results);
                localStorage.setItem('analysisManager.results', JSON.stringify(results));
            } catch (error) {
                KC.Logger?.warning('Erro ao salvar resultados:', error);
            }
        }
    }

    // Registra no namespace
    KC.AnalysisManager = new AnalysisManager();

})(window);