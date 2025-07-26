/**
 * RefinementService.js - Orquestrador do Ciclo de Refinamento
 * 
 * Gerencia o ciclo completo de refinamento de análises:
 * - Análise inicial (confidence ~65%)
 * - Curadoria humana (categorias como contexto)
 * - Re-análise refinada (confidence ~92%)
 * - Convergência e estabilização
 * 
 * AIDEV-NOTE: refinement-orchestrator; coordena todo o ciclo de refinamento
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;
    const Logger = KC.Logger;

    class RefinementService {
        constructor() {
            this.isInitialized = false;
            this.activeRefinements = new Map(); // fileId -> refinement process
            this.refinementQueue = [];
            this.isProcessing = false;
            
            // Configurações do serviço
            this.config = {
                maxIterations: 5,                    // Máximo de iterações de refinamento
                minConfidenceGain: 0.05,            // Ganho mínimo para continuar
                convergenceThreshold: 0.90,         // Confiança para considerar convergido
                contextWeightIncrease: 0.3,         // Peso adicional por contexto manual
                autoRefinementEnabled: true,        // Re-análise automática após categorização
                refinementDelay: 2000,              // Delay antes de re-analisar (ms)
                batchSize: 3                        // Arquivos por batch de refinamento
            };

            // Métricas do serviço
            this.metrics = {
                totalRefinements: 0,
                successfulRefinements: 0,
                averageIterations: 0,
                averageConfidenceGain: 0,
                convergenceRate: 0
            };
        }

        /**
         * Inicializa o serviço
         */
        async initialize() {
            if (this.isInitialized) return;

            try {
                // Garante que analysisHistory existe no AppState
                this.ensureAnalysisHistory();
                
                // Carrega configurações salvas
                await this.loadConfiguration();
                
                // Configura listeners de eventos
                this.bindEvents();
                
                // Carrega refinamentos ativos salvos
                await this.loadActiveRefinements();
                
                this.isInitialized = true;
                Logger?.success('RefinementService', 'Serviço inicializado', {
                    config: this.config,
                    activeRefinements: this.activeRefinements.size
                });
                
            } catch (error) {
                Logger?.error('RefinementService', 'Erro ao inicializar', error);
                throw error;
            }
        }

        /**
         * Garante que analysisHistory existe no AppState
         * AIDEV-NOTE: state-extension; adiciona analysisHistory ao AppState
         */
        ensureAnalysisHistory() {
            const currentState = AppState.get('');
            if (!currentState.analysisHistory) {
                AppState.set('analysisHistory', {
                    byFile: {},          // fileId -> array de análises
                    totalAnalyses: 0,
                    lastUpdate: null
                });
                Logger?.info('RefinementService', 'analysisHistory criado no AppState');
            }
        }

        /**
         * Configura event listeners
         */
        bindEvents() {
            // Escuta quando arquivo é analisado
            if (Events.FILE_ANALYZED) {
                EventBus.on(Events.FILE_ANALYZED, (data) => {
                    this.handleFileAnalyzed(data);
                });
            }

            // Escuta quando categoria é adicionada/removida
            if (Events.CATEGORY_ASSIGNED) {
                EventBus.on(Events.CATEGORY_ASSIGNED, (data) => {
                    this.handleCategoryChange(data);
                });
            }
            
            if (Events.CATEGORY_REMOVED) {
                EventBus.on(Events.CATEGORY_REMOVED, (data) => {
                    this.handleCategoryChange(data);
                });
            }

            // Escuta solicitações manuais de refinamento
            EventBus.on('REFINEMENT_REQUESTED', (data) => {
                this.requestRefinement(data.fileId, data.options);
            });

            // AIDEV-NOTE: files-updated-listener; escuta atualizações gerais de arquivos
            if (Events.FILES_UPDATED) {
                EventBus.on(Events.FILES_UPDATED, (data) => {
                    if (data.action === 'category_added' || data.action === 'category_removed') {
                        this.handleCategoryChange(data);
                    }
                });
            }
        }

        /**
         * Manipula quando arquivo é analisado
         */
        async handleFileAnalyzed(data) {
            const { file, result } = data;
            if (!file || !result) return;

            const fileId = file.id || file.name;
            
            // Adiciona à história de análises
            this.addToAnalysisHistory(fileId, result);
            
            // Verifica se deve iniciar refinamento
            if (this.shouldStartRefinement(file, result)) {
                Logger?.info('RefinementService', 'Iniciando refinamento automático', {
                    file: file.name,
                    confidence: result.analysis?.confidence || 0
                });
                
                await this.startRefinement(fileId, {
                    reason: 'low_initial_confidence',
                    previousAnalysis: result
                });
            }
        }

        /**
         * Manipula mudanças em categorias
         */
        async handleCategoryChange(data) {
            if (!this.config.autoRefinementEnabled) return;
            
            const fileId = data.fileId;
            if (!fileId) return;

            // Busca arquivo atual
            const files = AppState.get('files') || [];
            const file = files.find(f => (f.id === fileId) || (f.name === fileId));
            
            if (!file || !file.analyzed) return;

            // AIDEV-NOTE: context-detection; detecta novo contexto valioso
            Logger?.info('RefinementService', 'Contexto manual detectado', {
                file: file.name,
                categories: file.categories?.length || 0,
                action: data.action
            });

            // Agenda refinamento após delay
            setTimeout(() => {
                this.requestRefinement(fileId, {
                    reason: 'manual_context_added',
                    contextType: 'categories',
                    immediateProcessing: true
                });
            }, this.config.refinementDelay);
        }

        /**
         * Verifica se deve iniciar refinamento
         */
        shouldStartRefinement(file, analysisResult) {
            const confidence = analysisResult.analysis?.confidence || 
                              analysisResult.metadata?.confidence || 0;
            
            // Inicia se confiança baixa e tem potencial de melhoria
            return confidence < 0.7 && this.hasPotentialForImprovement(file);
        }

        /**
         * Verifica se arquivo tem potencial de melhoria
         */
        hasPotentialForImprovement(file) {
            // Tem preview rico?
            const hasRichPreview = file.preview && file.preview.length > 100;
            
            // Tem keywords relevantes?
            const hasKeywords = file.relevanceScore > 0.3;
            
            // Tem tamanho adequado?
            const hasGoodSize = file.size > 1000 && file.size < 1000000;
            
            return hasRichPreview || hasKeywords || hasGoodSize;
        }

        /**
         * Solicita refinamento para um arquivo
         */
        async requestRefinement(fileId, options = {}) {
            if (!fileId) return;

            // Verifica se já está em refinamento
            if (this.activeRefinements.has(fileId)) {
                Logger?.warning('RefinementService', 'Arquivo já em refinamento', { fileId });
                return;
            }

            // Adiciona à fila
            this.refinementQueue.push({
                fileId,
                options,
                requestedAt: Date.now()
            });

            // Emite evento de refinamento solicitado
            EventBus.emit('REFINEMENT_QUEUED', {
                fileId,
                queueSize: this.refinementQueue.length
            });

            // Processa fila se não estiver processando
            if (!this.isProcessing) {
                this.processRefinementQueue();
            }
        }

        /**
         * Inicia processo de refinamento
         */
        async startRefinement(fileId, options = {}) {
            try {
                // Busca arquivo e histórico
                const file = this.getFileById(fileId);
                if (!file) {
                    throw new Error(`Arquivo não encontrado: ${fileId}`);
                }

                const history = this.getAnalysisHistory(fileId);
                
                // Cria processo de refinamento
                const refinementProcess = {
                    fileId,
                    fileName: file.name,
                    startedAt: Date.now(),
                    iteration: 0,
                    status: 'active',
                    reason: options.reason || 'manual',
                    history: history || [],
                    metrics: {
                        initialConfidence: this.getLatestConfidence(history),
                        currentConfidence: 0,
                        confidenceGain: 0,
                        contextFactors: []
                    }
                };

                // Registra processo ativo
                this.activeRefinements.set(fileId, refinementProcess);
                
                // Emite evento de início
                EventBus.emit('REFINEMENT_STARTED', {
                    fileId,
                    process: refinementProcess
                });

                // Executa primeira iteração de refinamento
                await this.executeRefinementIteration(refinementProcess);
                
                return refinementProcess;

            } catch (error) {
                Logger?.error('RefinementService', 'Erro ao iniciar refinamento', {
                    fileId,
                    error: error.message
                });
                
                // Remove dos ativos em caso de erro
                this.activeRefinements.delete(fileId);
                throw error;
            }
        }

        /**
         * Executa uma iteração de refinamento
         */
        async executeRefinementIteration(process) {
            try {
                process.iteration++;
                Logger?.info('RefinementService', 'Executando iteração', {
                    file: process.fileName,
                    iteration: process.iteration
                });

                // Busca arquivo atualizado
                const file = this.getFileById(process.fileId);
                if (!file) {
                    throw new Error('Arquivo não encontrado durante refinamento');
                }

                // Detecta contexto disponível
                const context = await this.detectRefinementContext(file, process);
                
                // Prepara análise refinada
                const refinedOptions = this.prepareRefinedAnalysis(file, context, process);
                
                // CRÍTICO: Usar embeddings para refinamento, NÃO LLMs
                // AIDEV-NOTE: embedding-priority; seguindo plano original do ciclo semântico
                if (KC.EmbeddingService && KC.SimilaritySearchService) {
                    // Usa refinamento com embeddings
                    const result = await this.refineWithEmbeddings(file, process);
                    
                    if (result) {
                        await this.processRefinementResult(process, result);
                    }
                } else if (KC.AnalysisManager) {
                    // Fallback para AnalysisManager se embeddings não disponíveis
                    Logger?.warn('RefinementService', 'Usando fallback AnalysisManager - embeddings preferidos não disponíveis');
                    
                    // Adiciona contexto de refinamento
                    const analysisOptions = {
                        ...refinedOptions,
                        isRefinement: true,
                        refinementIteration: process.iteration,
                        refinementContext: context,
                        previousAnalysis: process.history[process.history.length - 1]
                    };

                    // AIDEV-NOTE: analysis-request; solicita análise refinada com contexto (fallback)
                    await KC.AnalysisManager.addToQueue([file], analysisOptions);
                    
                    // Aguarda resultado (com timeout)
                    const result = await this.waitForAnalysisResult(process.fileId, 30000);
                    
                    if (result) {
                        await this.processRefinementResult(process, result);
                    }
                } else {
                    throw new Error('Nenhum serviço de refinamento disponível (EmbeddingService ou AnalysisManager)');
                }

            } catch (error) {
                Logger?.error('RefinementService', 'Erro na iteração', {
                    file: process.fileName,
                    iteration: process.iteration,
                    error: error.message
                });
                
                process.status = 'error';
                process.error = error.message;
                
                EventBus.emit('REFINEMENT_ERROR', {
                    fileId: process.fileId,
                    process,
                    error
                });
            }
        }

        /**
         * Refina análise usando embeddings e similaridade
         * CRÍTICO: Este é o método principal do ciclo de refinamento semântico
         * @param {Object} file - Arquivo a ser refinado
         * @param {Object} process - Processo de refinamento
         * @returns {Object} Resultado do refinamento com novo analysisType e Schema.org
         */
        async refineWithEmbeddings(file, process) {
            try {
                Logger?.info('RefinementService', 'Iniciando refinamento com embeddings', {
                    file: file.name,
                    iteration: process.iteration,
                    currentType: file.analysisType,
                    categories: file.categories || []
                });

                // 1. Gerar embedding do arquivo
                if (!KC.EmbeddingService) {
                    throw new Error('EmbeddingService não disponível');
                }

                const embedding = await KC.EmbeddingService.generateEmbedding(
                    file.content || file.preview || file.name
                );

                // 2. Buscar arquivos similares COM AS MESMAS CATEGORIAS
                if (!KC.SimilaritySearchService) {
                    throw new Error('SimilaritySearchService não disponível');
                }

                const similarFiles = await KC.SimilaritySearchService.multiModalSearch({
                    embedding: embedding,
                    categories: file.categories || [],
                    limit: 10,
                    minSimilarity: 0.7
                });

                // 3. Analisar tipos dos vizinhos semânticos
                const typeFrequency = {};
                let totalConfidence = 0;
                let validNeighbors = 0;

                similarFiles.forEach(similar => {
                    if (similar.analysisType && similar.confidence) {
                        typeFrequency[similar.analysisType] = 
                            (typeFrequency[similar.analysisType] || 0) + similar.confidence;
                        totalConfidence += similar.confidence;
                        validNeighbors++;
                    }
                });

                // 4. Recalibrar analysisType baseado na vizinhança
                let refinedType = file.analysisType;
                let refinedConfidence = 0.65; // Confiança base

                if (validNeighbors > 0) {
                    // Encontra o tipo mais comum ponderado pela confiança
                    const sortedTypes = Object.entries(typeFrequency)
                        .sort((a, b) => b[1] - a[1]);
                    
                    if (sortedTypes.length > 0) {
                        refinedType = sortedTypes[0][0];
                        // Confiança baseada no consenso da vizinhança
                        refinedConfidence = Math.min(0.92, 
                            0.65 + (sortedTypes[0][1] / totalConfidence) * 0.27
                        );
                    }
                }

                // 5. Boost adicional se categorias manuais presentes
                if (file.categories && file.categories.length > 0) {
                    refinedConfidence = Math.min(0.95, 
                        refinedConfidence + (file.categories.length * 0.03)
                    );
                }

                // 6. Atualizar arquivo com tipo refinado
                file.analysisType = refinedType;
                file.refinedAt = new Date().toISOString();

                // 7. Mapear para Schema.org com novo tipo
                let schemaOrgEntity = null;
                if (KC.SchemaOrgMapper) {
                    try {
                        schemaOrgEntity = await KC.SchemaOrgMapper.mapToSchema(file);
                        Logger?.info('RefinementService', 'Schema.org refinado', {
                            type: schemaOrgEntity['@type'],
                            confidence: refinedConfidence
                        });
                    } catch (error) {
                        Logger?.error('RefinementService', 'Erro ao mapear Schema.org', error);
                    }
                }

                // 8. Construir resultado do refinamento
                const result = {
                    analysis: {
                        type: refinedType,
                        confidence: refinedConfidence,
                        method: 'embedding_similarity',
                        schemaOrgEntity: schemaOrgEntity
                    },
                    metadata: {
                        timestamp: new Date().toISOString(),
                        iteration: process.iteration,
                        validNeighbors: validNeighbors,
                        consensusStrength: validNeighbors > 0 ? 
                            typeFrequency[refinedType] / totalConfidence : 0
                    },
                    context: {
                        categories: file.categories || [],
                        similarFiles: similarFiles.length,
                        previousType: process.history[process.history.length - 1]?.analysis?.type
                    }
                };

                Logger?.info('RefinementService', 'Refinamento concluído', {
                    file: file.name,
                    previousType: result.context.previousType,
                    refinedType: refinedType,
                    confidence: refinedConfidence,
                    hasSchema: !!schemaOrgEntity
                });

                return result;

            } catch (error) {
                Logger?.error('RefinementService', 'Erro no refinamento com embeddings', {
                    file: file.name,
                    error: error.message
                });
                throw error;
            }
        }

        /**
         * Detecta contexto disponível para refinamento
         */
        async detectRefinementContext(file, process) {
            const context = {
                categories: [],
                semanticContext: [],
                userContext: [],
                confidence: 0
            };

            // 1. Contexto de categorias (curadoria humana)
            if (file.categories && file.categories.length > 0) {
                context.categories = file.categories;
                context.confidence += 0.3; // Alto valor para curadoria humana
                
                Logger?.debug('RefinementService', 'Contexto de categorias detectado', {
                    categories: file.categories,
                    boost: 0.3
                });
            }

            // 2. Contexto semântico (análises anteriores)
            if (process.history.length > 0) {
                const previousAnalyses = process.history.slice(-3); // Últimas 3
                context.semanticContext = this.extractSemanticContext(previousAnalyses);
                context.confidence += 0.2;
            }

            // 3. Contexto do usuário (anotações, tags customizadas)
            if (file.userNotes || file.customTags) {
                context.userContext.push({
                    type: 'user_annotation',
                    content: file.userNotes || '',
                    tags: file.customTags || []
                });
                context.confidence += 0.2;
            }

            // 4. Detecta contexto via RefinementDetector
            if (KC.RefinementDetector) {
                const detectedContext = await KC.RefinementDetector.detectContext(file);
                if (detectedContext) {
                    context.semanticContext.push(...detectedContext.semantic || []);
                    context.confidence += detectedContext.confidence || 0;
                }
            }

            // AIDEV-NOTE: context-enrichment; contexto total para refinamento
            Logger?.info('RefinementService', 'Contexto total detectado', {
                file: file.name,
                totalConfidence: context.confidence,
                hasCategories: context.categories.length > 0,
                semanticFactors: context.semanticContext.length
            });

            return context;
        }

        /**
         * Extrai contexto semântico de análises anteriores
         */
        extractSemanticContext(analyses) {
            const context = [];
            
            analyses.forEach(analysis => {
                if (analysis.analysis) {
                    // Extrai tipos detectados
                    if (analysis.analysis.analysisType) {
                        context.push({
                            type: 'detected_type',
                            value: analysis.analysis.analysisType,
                            confidence: analysis.analysis.confidence || 0
                        });
                    }
                    
                    // Extrai categorias sugeridas
                    if (analysis.analysis.categories) {
                        context.push({
                            type: 'suggested_categories',
                            values: analysis.analysis.categories,
                            source: 'ai_analysis'
                        });
                    }
                    
                    // Extrai momentos decisivos
                    if (analysis.analysis.moments) {
                        context.push({
                            type: 'key_moments',
                            count: analysis.analysis.moments.length,
                            themes: this.extractThemes(analysis.analysis.moments)
                        });
                    }
                }
            });
            
            return context;
        }

        /**
         * Extrai temas de momentos decisivos
         */
        extractThemes(moments) {
            const themes = new Set();
            moments.forEach(moment => {
                if (moment.theme) themes.add(moment.theme);
                if (moment.category) themes.add(moment.category);
            });
            return Array.from(themes);
        }

        /**
         * Prepara opções para análise refinada
         */
        prepareRefinedAnalysis(file, context, process) {
            const options = {
                // Template mais específico baseado no contexto
                template: this.selectOptimalTemplate(file, context),
                
                // Contexto adicional para o prompt
                context: this.buildRefinementPromptContext(file, context, process),
                
                // Ajustes de modelo para refinamento
                temperature: 0.3, // Mais determinístico para convergência
                maxTokens: 3000,  // Mais tokens para análise profunda
                
                // Hint sobre o tipo esperado
                expectedType: this.predictExpectedType(file, context, process)
            };

            Logger?.debug('RefinementService', 'Opções de refinamento preparadas', {
                template: options.template,
                expectedType: options.expectedType,
                contextLength: options.context.length
            });

            return options;
        }

        /**
         * Seleciona template ideal baseado no contexto
         */
        selectOptimalTemplate(file, context) {
            // Se tem categorias técnicas, usa template técnico
            const techCategories = ['IA/ML', 'Desenvolvimento', 'Arquitetura', 'DevOps'];
            const hasTechContext = context.categories.some(cat => 
                techCategories.some(tech => cat.includes(tech))
            );
            
            if (hasTechContext) {
                return 'technicalInsights';
            }
            
            // Se tem categorias de projeto, usa análise de projeto
            const projectCategories = ['Projeto', 'MVP', 'Produto', 'Roadmap'];
            const hasProjectContext = context.categories.some(cat =>
                projectCategories.some(proj => cat.includes(proj))
            );
            
            if (hasProjectContext) {
                return 'projectAnalysis';
            }
            
            // Padrão: momentos decisivos
            return 'decisiveMoments';
        }

        /**
         * Constrói contexto para o prompt
         */
        buildRefinementPromptContext(file, context, process) {
            const parts = [];
            
            // 1. Contexto de categorias
            if (context.categories.length > 0) {
                parts.push(`Este arquivo foi categorizado manualmente como: ${context.categories.join(', ')}.`);
                parts.push(`Por favor, leve em consideração estas categorias na análise.`);
            }
            
            // 2. Contexto de iteração
            if (process.iteration > 1) {
                parts.push(`Esta é a iteração ${process.iteration} de refinamento.`);
                const lastAnalysis = process.history[process.history.length - 1];
                if (lastAnalysis?.analysis?.analysisType) {
                    parts.push(`Análise anterior detectou tipo: ${lastAnalysis.analysis.analysisType}`);
                }
            }
            
            // 3. Contexto semântico
            if (context.semanticContext.length > 0) {
                const types = context.semanticContext
                    .filter(c => c.type === 'detected_type')
                    .map(c => c.value);
                if (types.length > 0) {
                    parts.push(`Tipos detectados anteriormente: ${[...new Set(types)].join(', ')}`);
                }
            }
            
            // 4. Instrução de refinamento
            parts.push(`Por favor, forneça uma análise mais precisa e profunda considerando o contexto fornecido.`);
            
            return parts.join(' ');
        }

        /**
         * Prediz tipo esperado baseado no contexto
         */
        predictExpectedType(file, context, process) {
            // Baseado em categorias
            const categoryTypeMap = {
                'IA/ML': 'Breakthrough Técnico',
                'Decisão': 'Momento Decisivo',
                'Estratégia': 'Insight Estratégico',
                'Aprendizado': 'Evolução Conceitual'
            };
            
            for (const [key, type] of Object.entries(categoryTypeMap)) {
                if (context.categories.some(cat => cat.includes(key))) {
                    return type;
                }
            }
            
            // Baseado em análises anteriores (votação)
            if (process.history.length > 1) {
                const typeVotes = {};
                process.history.forEach(h => {
                    const type = h.analysis?.analysisType;
                    if (type) {
                        typeVotes[type] = (typeVotes[type] || 0) + 1;
                    }
                });
                
                // Retorna o mais votado
                const sortedTypes = Object.entries(typeVotes)
                    .sort((a, b) => b[1] - a[1]);
                if (sortedTypes.length > 0) {
                    return sortedTypes[0][0];
                }
            }
            
            return null;
        }

        /**
         * Aguarda resultado da análise
         */
        async waitForAnalysisResult(fileId, timeout = 30000) {
            return new Promise((resolve) => {
                const startTime = Date.now();
                
                const checkResult = () => {
                    // Verifica se análise foi concluída
                    const files = AppState.get('files') || [];
                    const file = files.find(f => (f.id === fileId) || (f.name === fileId));
                    
                    if (file && file.analysisDate) {
                        const analysisTime = new Date(file.analysisDate).getTime();
                        if (analysisTime > startTime) {
                            // Nova análise detectada
                            resolve({
                                analysis: file.analysisResult,
                                metadata: file.analysisMetadata
                            });
                            return;
                        }
                    }
                    
                    // Verifica timeout
                    if (Date.now() - startTime > timeout) {
                        Logger?.warning('RefinementService', 'Timeout aguardando análise', { fileId });
                        resolve(null);
                        return;
                    }
                    
                    // Continua verificando
                    setTimeout(checkResult, 1000);
                };
                
                checkResult();
            });
        }

        /**
         * Processa resultado do refinamento
         */
        async processRefinementResult(process, result) {
            try {
                // Adiciona ao histórico
                this.addToAnalysisHistory(process.fileId, result);
                
                // Atualiza métricas do processo
                const newConfidence = result.analysis?.confidence || 
                                    result.metadata?.confidence || 0;
                const previousConfidence = process.metrics.currentConfidence || 
                                         process.metrics.initialConfidence;
                
                process.metrics.currentConfidence = newConfidence;
                process.metrics.confidenceGain = newConfidence - process.metrics.initialConfidence;
                
                Logger?.info('RefinementService', 'Resultado do refinamento', {
                    file: process.fileName,
                    iteration: process.iteration,
                    confidence: newConfidence,
                    gain: newConfidence - previousConfidence
                });

                // Verifica convergência
                if (KC.ConvergenceCalculator) {
                    const convergence = await KC.ConvergenceCalculator.calculate(
                        process.fileId,
                        this.getAnalysisHistory(process.fileId)
                    );
                    
                    if (convergence.isConverged) {
                        await this.completeRefinement(process, convergence);
                        return;
                    }
                }

                // Verifica se deve continuar refinando
                const shouldContinue = this.shouldContinueRefinement(process, result);
                
                if (shouldContinue && process.iteration < this.config.maxIterations) {
                    // Agenda próxima iteração
                    setTimeout(() => {
                        this.executeRefinementIteration(process);
                    }, 2000);
                } else {
                    // Completa refinamento
                    await this.completeRefinement(process);
                }

            } catch (error) {
                Logger?.error('RefinementService', 'Erro ao processar resultado', {
                    file: process.fileName,
                    error: error.message
                });
                
                process.status = 'error';
                process.error = error.message;
            }
        }

        /**
         * Verifica se deve continuar refinamento
         */
        shouldContinueRefinement(process, result) {
            const currentConfidence = result.analysis?.confidence || 0;
            const previousConfidence = process.metrics.currentConfidence || 0;
            const gain = currentConfidence - previousConfidence;
            
            // Continua se:
            // 1. Ganho significativo
            if (gain >= this.config.minConfidenceGain) return true;
            
            // 2. Ainda não convergiu
            if (currentConfidence < this.config.convergenceThreshold) return true;
            
            // 3. Contexto novo foi adicionado recentemente
            const recentContext = Date.now() - process.startedAt < 10000;
            if (recentContext && process.iteration < 3) return true;
            
            return false;
        }

        /**
         * Completa processo de refinamento
         */
        async completeRefinement(process, convergence = null) {
            try {
                process.status = 'completed';
                process.completedAt = Date.now();
                process.duration = process.completedAt - process.startedAt;
                
                if (convergence) {
                    process.convergence = convergence;
                }

                // Atualiza métricas globais
                this.updateGlobalMetrics(process);
                
                // Remove dos ativos
                this.activeRefinements.delete(process.fileId);
                
                // Salva estado
                await this.saveActiveRefinements();
                
                // Emite evento de conclusão
                EventBus.emit('REFINEMENT_COMPLETED', {
                    fileId: process.fileId,
                    process,
                    success: process.metrics.confidenceGain > 0
                });

                Logger?.success('RefinementService', 'Refinamento concluído', {
                    file: process.fileName,
                    iterations: process.iteration,
                    initialConfidence: process.metrics.initialConfidence,
                    finalConfidence: process.metrics.currentConfidence,
                    gain: process.metrics.confidenceGain,
                    duration: `${(process.duration / 1000).toFixed(1)}s`
                });

            } catch (error) {
                Logger?.error('RefinementService', 'Erro ao completar refinamento', error);
            }
        }

        /**
         * Processa fila de refinamento
         */
        async processRefinementQueue() {
            if (this.isProcessing || this.refinementQueue.length === 0) return;
            
            this.isProcessing = true;
            
            try {
                while (this.refinementQueue.length > 0) {
                    // Pega próximo batch
                    const batch = this.refinementQueue.splice(0, this.config.batchSize);
                    
                    // Processa batch em paralelo
                    const promises = batch.map(item => 
                        this.startRefinement(item.fileId, item.options)
                            .catch(error => {
                                Logger?.error('RefinementService', 'Erro no batch', {
                                    fileId: item.fileId,
                                    error: error.message
                                });
                            })
                    );
                    
                    await Promise.all(promises);
                    
                    // Pequena pausa entre batches
                    if (this.refinementQueue.length > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } finally {
                this.isProcessing = false;
            }
        }

        /**
         * Adiciona análise ao histórico
         */
        addToAnalysisHistory(fileId, analysis) {
            const history = AppState.get('analysisHistory') || {};
            
            if (!history.byFile) {
                history.byFile = {};
            }
            
            if (!history.byFile[fileId]) {
                history.byFile[fileId] = [];
            }
            
            // Adiciona com timestamp
            const entry = {
                ...analysis,
                timestamp: Date.now(),
                id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            // CRÍTICO: Garantir que schemaOrgEntity está presente
            // AIDEV-NOTE: schema-org-persistence; schema.org é obrigatório no histórico
            if (!entry.analysis?.schemaOrgEntity && entry.analysis?.type) {
                Logger?.warn('RefinementService', 'Entry sem Schema.org - tentando mapear', {
                    fileId,
                    type: entry.analysis.type
                });
            }
            
            history.byFile[fileId].push(entry);
            
            // Atualiza contadores
            history.totalAnalyses = (history.totalAnalyses || 0) + 1;
            history.lastUpdate = Date.now();
            
            // Salva no AppState
            AppState.set('analysisHistory', history);
            
            // AIDEV-NOTE: history-event; emite evento para outros componentes
            EventBus.emit('ANALYSIS_HISTORY_UPDATED', {
                fileId,
                entry,
                totalForFile: history.byFile[fileId].length,
                hasSchemaOrg: !!entry.analysis?.schemaOrgEntity
            });
        }

        /**
         * Obtém histórico de análises
         */
        getAnalysisHistory(fileId) {
            const history = AppState.get('analysisHistory') || {};
            return history.byFile?.[fileId] || [];
        }

        /**
         * Obtém confiança mais recente
         */
        getLatestConfidence(history) {
            if (!history || history.length === 0) return 0;
            
            const latest = history[history.length - 1];
            return latest.analysis?.confidence || 
                   latest.metadata?.confidence || 0;
        }

        /**
         * Busca arquivo por ID
         */
        getFileById(fileId) {
            const files = AppState.get('files') || [];
            return files.find(f => (f.id === fileId) || (f.name === fileId));
        }

        /**
         * Atualiza métricas globais
         */
        updateGlobalMetrics(process) {
            this.metrics.totalRefinements++;
            
            if (process.metrics.confidenceGain > 0) {
                this.metrics.successfulRefinements++;
            }
            
            // Atualiza média de iterações
            const currentAvg = this.metrics.averageIterations;
            this.metrics.averageIterations = 
                (currentAvg * (this.metrics.totalRefinements - 1) + process.iteration) / 
                this.metrics.totalRefinements;
            
            // Atualiza média de ganho
            const currentGainAvg = this.metrics.averageConfidenceGain;
            this.metrics.averageConfidenceGain = 
                (currentGainAvg * (this.metrics.totalRefinements - 1) + process.metrics.confidenceGain) / 
                this.metrics.totalRefinements;
            
            // Taxa de convergência
            this.metrics.convergenceRate = 
                this.metrics.successfulRefinements / this.metrics.totalRefinements;
            
            // Salva métricas
            this.saveMetrics();
        }

        /**
         * Obtém status do serviço
         */
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                activeRefinements: this.activeRefinements.size,
                queueSize: this.refinementQueue.length,
                isProcessing: this.isProcessing,
                metrics: { ...this.metrics },
                config: { ...this.config }
            };
        }

        /**
         * Obtém refinamentos ativos
         */
        getActiveRefinements() {
            return Array.from(this.activeRefinements.values());
        }

        /**
         * Para refinamento específico
         */
        stopRefinement(fileId) {
            const process = this.activeRefinements.get(fileId);
            if (process) {
                process.status = 'stopped';
                process.stoppedAt = Date.now();
                this.activeRefinements.delete(fileId);
                
                EventBus.emit('REFINEMENT_STOPPED', {
                    fileId,
                    process
                });
                
                Logger?.info('RefinementService', 'Refinamento parado', {
                    file: process.fileName
                });
            }
        }

        /**
         * Para todos os refinamentos
         */
        stopAllRefinements() {
            const count = this.activeRefinements.size;
            
            this.activeRefinements.forEach((process, fileId) => {
                this.stopRefinement(fileId);
            });
            
            this.refinementQueue = [];
            
            Logger?.info('RefinementService', 'Todos refinamentos parados', {
                count
            });
        }

        /**
         * Atualiza configuração
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            this.saveConfiguration();
            
            Logger?.info('RefinementService', 'Configuração atualizada', this.config);
        }

        // === Métodos de Persistência ===

        async loadConfiguration() {
            try {
                const saved = localStorage.getItem('refinementService.config');
                if (saved) {
                    this.config = { ...this.config, ...JSON.parse(saved) };
                }
            } catch (error) {
                Logger?.warning('RefinementService', 'Erro ao carregar config', error);
            }
        }

        saveConfiguration() {
            try {
                localStorage.setItem('refinementService.config', JSON.stringify(this.config));
            } catch (error) {
                Logger?.warning('RefinementService', 'Erro ao salvar config', error);
            }
        }

        async loadActiveRefinements() {
            try {
                const saved = localStorage.getItem('refinementService.active');
                if (saved) {
                    const data = JSON.parse(saved);
                    // Reconstrói Map
                    data.forEach(([fileId, process]) => {
                        // Só recarrega se ainda ativo
                        if (process.status === 'active') {
                            this.activeRefinements.set(fileId, process);
                        }
                    });
                }
            } catch (error) {
                Logger?.warning('RefinementService', 'Erro ao carregar ativos', error);
            }
        }

        async saveActiveRefinements() {
            try {
                const data = Array.from(this.activeRefinements.entries());
                localStorage.setItem('refinementService.active', JSON.stringify(data));
            } catch (error) {
                Logger?.warning('RefinementService', 'Erro ao salvar ativos', error);
            }
        }

        saveMetrics() {
            try {
                localStorage.setItem('refinementService.metrics', JSON.stringify(this.metrics));
            } catch (error) {
                Logger?.warning('RefinementService', 'Erro ao salvar métricas', error);
            }
        }
    }

    // Registra no namespace
    KC.RefinementService = new RefinementService();

})(window);