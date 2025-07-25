/**
 * StatsManager.js - Gerenciador de Estatísticas em Tempo Real
 * 
 * Responsável por calcular e manter estatísticas atualizadas
 * sobre arquivos descobertos, analisados e categorizados.
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class StatsManager {
        constructor() {
            this.stats = {
                arquivosEncontrados: 0,
                candidatosRelevantes: 0,
                jaAnalisados: 0,
                momentosDescobertos: 0,
                categorizados: 0,
                arquivados: 0,
                relevanciaMedia: 0,
                // Novos campos para validação
                pendenteAnalise: 0,
                altaRelevancia: 0,
                mediaRelevancia: 0,
                baixaRelevancia: 0
            };
            
            this.isInitialized = false;
        }

        /**
         * Inicializa o StatsManager
         */
        initialize() {
            if (this.isInitialized) return;
            
            this.setupEventListeners();
            this.calculateInitialStats();
            this.isInitialized = true;
            
            KC.Logger?.success('StatsManager inicializado com dados reais');
        }

        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // Escuta mudanças nos arquivos
            if (Events && Events.STATE_CHANGED) {
                EventBus.on(Events.STATE_CHANGED, (data) => {
                    if (data.path === 'files') {
                        this.calculateStats(data.newValue);
                    }
                });
            }

            // Escuta descoberta de arquivos
            if (Events && Events.FILES_DISCOVERED) {
                EventBus.on(Events.FILES_DISCOVERED, (data) => {
                    this.calculateStats(data.files);
                });
            }
        }

        /**
         * Calcula estatísticas iniciais
         */
        calculateInitialStats() {
            const files = AppState.get('files') || [];
            this.calculateStats(files);
        }

        /**
         * Calcula todas as estatísticas baseadas nos arquivos
         */
        calculateStats(files) {
            if (!files || !Array.isArray(files)) return;

            // Reseta contadores
            const newStats = {
                arquivosEncontrados: files.length,
                candidatosRelevantes: 0,
                jaAnalisados: 0,
                momentosDescobertos: 0,
                categorizados: 0,
                arquivados: 0,
                pendenteAnalise: 0,
                altaRelevancia: 0,
                mediaRelevancia: 0,
                baixaRelevancia: 0,
                // SPRINT 1.3.1: Adiciona contadores de período
                periodos: {
                    hoje: 0,
                    semana: 0,
                    mes: 0,
                    tresMeses: 0,
                    seisMeses: 0,
                    ano: 0,
                    todos: files.length
                }
            };

            let totalRelevance = 0;
            let relevanceCount = 0;

            // Calcula estatísticas iterando pelos arquivos
            files.forEach(file => {
                // Relevância
                const relevance = this.calculateFileRelevance(file);
                if (relevance >= 70) {
                    newStats.altaRelevancia++;
                    newStats.candidatosRelevantes++;
                } else if (relevance >= 50) {
                    newStats.mediaRelevancia++;
                    newStats.candidatosRelevantes++;
                } else if (relevance >= 30) {
                    newStats.baixaRelevancia++;
                }

                if (relevance > 0) {
                    totalRelevance += relevance;
                    relevanceCount++;
                }

                // Status de análise
                if (file.analyzed) {
                    newStats.jaAnalisados++;
                    if (file.analysisType) {
                        newStats.momentosDescobertos++;
                    }
                } else {
                    newStats.pendenteAnalise++;
                }

                // Categorização
                if (file.categories && file.categories.length > 0) {
                    newStats.categorizados++;
                }

                // Arquivamento
                if (file.archived) {
                    newStats.arquivados++;
                }
                
                // SPRINT 1.3.1: Calcula períodos com validação de data
                const now = new Date();
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
                
                // Se nenhuma data válida, usa data atual como fallback
                if (!fileDate) {
                    fileDate = now;
                    KC.Logger?.warning(`StatsManager: Arquivo sem data válida, usando data atual: ${file.name}`);
                }
                
                const daysDiff = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
                
                // Contabiliza em TODOS os períodos aplicáveis (cumulativo)
                if (daysDiff <= 1) newStats.periodos.hoje++;
                if (daysDiff <= 7) newStats.periodos.semana++;
                if (daysDiff <= 30) newStats.periodos.mes++;
                if (daysDiff <= 90) newStats.periodos.tresMeses++;
                if (daysDiff <= 180) newStats.periodos.seisMeses++;
                if (daysDiff <= 365) newStats.periodos.ano++;
            });

            // Calcula relevância média
            newStats.relevanciaMedia = relevanceCount > 0 
                ? Math.round(totalRelevance / relevanceCount)
                : 0;

            // Atualiza stats internos
            this.stats = { ...newStats };

            // Emite evento de atualização
            this.emitStatsUpdate();
        }

        /**
         * Calcula relevância de um arquivo
         */
        calculateFileRelevance(file) {
            // Prioridade 1: relevância já calculada
            if (file.relevanceScore !== undefined && file.relevanceScore !== null) {
                const score = file.relevanceScore > 1 ? file.relevanceScore : file.relevanceScore * 100;
                return Math.round(score);
            }
            
            // Prioridade 2: preview com score
            if (file.preview && file.preview.relevanceScore !== undefined) {
                return Math.round(file.preview.relevanceScore);
            }
            
            // Prioridade 3: cálculo básico
            const searchText = (file.content || file.name || '').toLowerCase();
            let score = 25;
            
            const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
            const userKeywords = AppState.get('configuration.preAnalysis.keywords') || [];
            const allKeywords = [...new Set([...keywords, ...userKeywords])];
            
            let keywordMatches = 0;
            allKeywords.forEach(keyword => {
                if (keyword && searchText.includes(keyword.toLowerCase())) {
                    keywordMatches++;
                    score += 10;
                }
            });
            
            if (keywordMatches > 3) score += 15;
            if (keywordMatches > 5) score += 10;
            
            return Math.min(Math.max(Math.round(score), 0), 100);
        }

        /**
         * Emite evento de atualização de estatísticas
         */
        emitStatsUpdate() {
            if (Events && Events.STATS_UPDATED) {
                EventBus.emit(Events.STATS_UPDATED, {
                    stats: this.stats,
                    timestamp: Date.now()
                });
            }
        }

        /**
         * Obtém status de validação para avançar etapas
         */
        getValidationStatus() {
            const stats = this.getStats();
            
            return {
                totalFiles: stats.arquivosEncontrados,
                analyzedFiles: stats.jaAnalisados,
                pendingFiles: stats.pendenteAnalise,
                isComplete: stats.pendenteAnalise === 0 && stats.arquivosEncontrados > 0,
                canProceed: this.validateRequirements(stats),
                completionPercentage: stats.arquivosEncontrados > 0 
                    ? Math.round((stats.jaAnalisados / stats.arquivosEncontrados) * 100)
                    : 0,
                requirements: {
                    hasFiles: stats.arquivosEncontrados > 0,
                    hasRelevantFiles: stats.candidatosRelevantes > 0,
                    hasAnalysis: stats.jaAnalisados > 0,
                    allAnalyzed: stats.pendenteAnalise === 0
                }
            };
        }

        /**
         * Valida requisitos para prosseguir
         */
        validateRequirements(stats) {
            // Requisitos mínimos:
            // 1. Ter arquivos descobertos
            // 2. Ter pelo menos 1 arquivo relevante
            // 3. Ter pelo menos 1 arquivo analisado
            return stats.arquivosEncontrados > 0 &&
                   stats.candidatosRelevantes > 0 &&
                   stats.jaAnalisados > 0;
        }

        /**
         * Obtém estatísticas atuais
         */
        getStats() {
            return { ...this.stats };
        }
        
        /**
         * SPRINT 1.3.1: Obtém estatísticas de período
         * Centraliza cálculo para evitar inconsistências
         */
        getPeriodStats() {
            return this.stats.periodos || {
                hoje: 0,
                semana: 0,
                mes: 0,
                tresMeses: 0,
                seisMeses: 0,
                ano: 0,
                todos: this.stats.arquivosEncontrados
            };
        }

        /**
         * Atualiza uma estatística específica
         */
        updateStat(key, value) {
            if (this.stats.hasOwnProperty(key)) {
                this.stats[key] = value;
                this.emitStatsUpdate();
            }
        }

        /**
         * Incrementa uma estatística
         */
        incrementStat(key, amount = 1) {
            if (this.stats.hasOwnProperty(key)) {
                this.stats[key] += amount;
                this.emitStatsUpdate();
            }
        }

        /**
         * Reseta todas as estatísticas
         */
        reset() {
            this.stats = {
                arquivosEncontrados: 0,
                candidatosRelevantes: 0,
                jaAnalisados: 0,
                momentosDescobertos: 0,
                categorizados: 0,
                arquivados: 0,
                relevanciaMedia: 0,
                pendenteAnalise: 0,
                altaRelevancia: 0,
                mediaRelevancia: 0,
                baixaRelevancia: 0,
                // SPRINT 1.3.1: Inclui períodos no reset
                periodos: {
                    hoje: 0,
                    semana: 0,
                    mes: 0,
                    tresMeses: 0,
                    seisMeses: 0,
                    ano: 0,
                    todos: 0
                }
            };
            
            this.emitStatsUpdate();
            KC.Logger?.info('StatsManager resetado');
        }

        /**
         * Exporta estatísticas em formato JSON
         */
        exportStats() {
            return {
                stats: this.getStats(),
                validation: this.getValidationStatus(),
                timestamp: new Date().toISOString(),
                version: '1.3.0'
            };
        }
    }

    KC.StatsManager = new StatsManager();

})(window);
