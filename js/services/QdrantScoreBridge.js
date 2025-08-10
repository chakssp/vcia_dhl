/**
 * QdrantScoreBridge.js - Ponte entre Qdrant e Sistema de Scores
 * 
 * Integra scores do Qdrant com o sistema multi-dimensional de análise
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class QdrantScoreBridge {
        constructor() {
            // Configurações
            this.config = {
                // Mapeamento de scores Qdrant para dimensões
                dimensionMapping: {
                    similarity: 'content',      // Similaridade vetorial → Conteúdo
                    metadata: 'metadata',        // Metadados Qdrant → Metadata
                    payload: 'context',          // Payload adicional → Contexto
                    timestamp: 'temporal',       // Timestamp → Temporal
                    distance: 'potential'        // Distância inversa → Potencial
                },
                
                // Thresholds para categorização
                thresholds: {
                    excellent: 0.9,  // > 90% similaridade
                    good: 0.7,       // > 70% similaridade
                    moderate: 0.5,   // > 50% similaridade
                    low: 0.3         // > 30% similaridade
                },
                
                // Cache de conversões
                cacheSize: 100,
                cacheTTL: 300000 // 5 minutos
            };
            
            // Cache de conversões
            this.cache = new Map();
            this.cacheTimestamps = new Map();
            
            // Normalizer
            this.normalizer = KC.ScoreNormalizer || null;
        }

        /**
         * Inicializa o bridge
         */
        async initialize() {
            Logger.info('QdrantScoreBridge', 'Inicializando ponte Qdrant-Scores');
            
            // Verifica dependências
            if (!KC.QdrantService) {
                Logger.warn('QdrantScoreBridge', 'QdrantService não disponível');
                return false;
            }
            
            if (!KC.ScoreNormalizer) {
                Logger.warn('QdrantScoreBridge', 'ScoreNormalizer não disponível');
                this.normalizer = null;
            } else {
                this.normalizer = KC.ScoreNormalizer;
            }
            
            // Limpa cache periodicamente
            setInterval(() => this.cleanCache(), 60000); // A cada minuto
            
            return true;
        }

        /**
         * Converte resultado Qdrant para scores multi-dimensionais
         */
        convertQdrantToMultiDimensional(qdrantResult) {
            if (!qdrantResult) return this.getDefaultScores();
            
            // Verifica cache
            const cacheKey = this.getCacheKey(qdrantResult);
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (this.isCacheValid(cacheKey)) {
                    return cached;
                }
            }
            
            // Extrai informações do resultado Qdrant
            const score = qdrantResult.score || 0;
            const payload = qdrantResult.payload || {};
            
            // Converte para scores multi-dimensionais
            const multiDimensional = {
                // Score de conteúdo baseado na similaridade
                content: this.normalizeScore(score) * 100,
                
                // Score de metadata baseado na completude
                metadata: this.calculateMetadataScore(payload),
                
                // Score de contexto baseado em categorias e tags
                context: this.calculateContextScore(payload),
                
                // Score temporal baseado em timestamps
                temporal: this.calculateTemporalScore(payload),
                
                // Score de potencial baseado na distância inversa
                potential: this.calculatePotentialScore(score, payload),
                
                // Score composto
                composite: 0
            };
            
            // Calcula score composto
            multiDimensional.composite = this.calculateCompositeScore(multiDimensional);
            
            // Salva no cache
            this.cache.set(cacheKey, multiDimensional);
            this.cacheTimestamps.set(cacheKey, Date.now());
            
            return multiDimensional;
        }

        /**
         * Converte scores multi-dimensionais para formato Qdrant
         */
        convertMultiDimensionalToQdrant(multiDimensional) {
            if (!multiDimensional) return null;
            
            // Converte score composto para range Qdrant (0-1)
            const qdrantScore = this.normalizer ? 
                this.normalizer.denormalizeToQdrant(multiDimensional.composite) :
                multiDimensional.composite / 100;
            
            // Monta payload com informações multi-dimensionais
            const payload = {
                scores: {
                    content: multiDimensional.content,
                    metadata: multiDimensional.metadata,
                    context: multiDimensional.context,
                    temporal: multiDimensional.temporal,
                    potential: multiDimensional.potential,
                    composite: multiDimensional.composite
                },
                timestamp: Date.now(),
                source: 'multi-dimensional-analysis'
            };
            
            return {
                score: qdrantScore,
                payload: payload
            };
        }

        /**
         * Enriquece resultado de busca Qdrant com scores multi-dimensionais
         */
        enrichQdrantSearchResults(results) {
            if (!Array.isArray(results)) return results;
            
            return results.map(result => {
                const multiDimensional = this.convertQdrantToMultiDimensional(result);
                
                return {
                    ...result,
                    multiDimensionalScores: multiDimensional,
                    enriched: true,
                    enrichmentTimestamp: Date.now()
                };
            });
        }

        /**
         * Calcula score de metadata
         */
        calculateMetadataScore(payload) {
            let score = 0;
            let fields = 0;
            
            // Campos importantes
            const importantFields = [
                'title', 'description', 'categories', 
                'tags', 'author', 'date', 'source'
            ];
            
            importantFields.forEach(field => {
                if (payload[field]) {
                    score += 100 / importantFields.length;
                    fields++;
                }
            });
            
            // Bonus para metadados ricos
            if (fields >= 5) score = Math.min(100, score + 10);
            
            return Math.round(score);
        }

        /**
         * Calcula score de contexto
         */
        calculateContextScore(payload) {
            let score = 50; // Base score
            
            // Categorias
            if (payload.categories && payload.categories.length > 0) {
                score += Math.min(25, payload.categories.length * 5);
            }
            
            // Tags
            if (payload.tags && payload.tags.length > 0) {
                score += Math.min(15, payload.tags.length * 3);
            }
            
            // Relações
            if (payload.relations && payload.relations.length > 0) {
                score += 10;
            }
            
            return Math.min(100, score);
        }

        /**
         * Calcula score temporal
         */
        calculateTemporalScore(payload) {
            if (!payload.timestamp && !payload.date) return 30; // Score base
            
            const timestamp = payload.timestamp || new Date(payload.date).getTime();
            const now = Date.now();
            const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24);
            
            // Mais recente = score maior
            if (ageInDays < 7) return 100;        // Última semana
            if (ageInDays < 30) return 85;        // Último mês
            if (ageInDays < 90) return 70;        // Últimos 3 meses
            if (ageInDays < 180) return 55;       // Últimos 6 meses
            if (ageInDays < 365) return 40;       // Último ano
            if (ageInDays < 730) return 25;       // Últimos 2 anos
            return 10;                            // Mais antigo
        }

        /**
         * Calcula score de potencial
         */
        calculatePotentialScore(qdrantScore, payload) {
            let potential = 50; // Base
            
            // Score alto no Qdrant indica alto potencial
            if (qdrantScore > 0.9) {
                potential = 95;
            } else if (qdrantScore > 0.7) {
                potential = 80;
            } else if (qdrantScore > 0.5) {
                potential = 65;
            }
            
            // Ajusta baseado em indicadores de potencial
            if (payload.hasUnprocessedContent) potential += 15;
            if (payload.requiresExtraction) potential += 10;
            if (payload.markedForReview) potential += 5;
            
            return Math.min(100, potential);
        }

        /**
         * Calcula score composto
         */
        calculateCompositeScore(scores) {
            // Pesos para cada dimensão
            const weights = {
                content: 0.35,
                metadata: 0.15,
                context: 0.20,
                temporal: 0.10,
                potential: 0.20
            };
            
            let weightedSum = 0;
            Object.entries(weights).forEach(([dimension, weight]) => {
                weightedSum += (scores[dimension] || 0) * weight;
            });
            
            return Math.round(weightedSum);
        }

        /**
         * Normaliza score Qdrant (0-1) para percentual
         */
        normalizeScore(score) {
            if (this.normalizer) {
                return this.normalizer.normalizeQdrantScore(score) / 100;
            }
            return Math.max(0, Math.min(1, score));
        }

        /**
         * Retorna scores padrão
         */
        getDefaultScores() {
            return {
                content: 0,
                metadata: 0,
                context: 0,
                temporal: 0,
                potential: 50, // Potencial médio por padrão
                composite: 10
            };
        }

        /**
         * Gera chave de cache
         */
        getCacheKey(qdrantResult) {
            const id = qdrantResult.id || '';
            const score = qdrantResult.score || 0;
            return `${id}_${score}`;
        }

        /**
         * Verifica se cache é válido
         */
        isCacheValid(key) {
            const timestamp = this.cacheTimestamps.get(key);
            if (!timestamp) return false;
            
            return (Date.now() - timestamp) < this.config.cacheTTL;
        }

        /**
         * Limpa cache expirado
         */
        cleanCache() {
            const now = Date.now();
            const keysToDelete = [];
            
            this.cacheTimestamps.forEach((timestamp, key) => {
                if ((now - timestamp) > this.config.cacheTTL) {
                    keysToDelete.push(key);
                }
            });
            
            keysToDelete.forEach(key => {
                this.cache.delete(key);
                this.cacheTimestamps.delete(key);
            });
            
            // Limita tamanho do cache
            if (this.cache.size > this.config.cacheSize) {
                const overflow = this.cache.size - this.config.cacheSize;
                const iterator = this.cache.keys();
                
                for (let i = 0; i < overflow; i++) {
                    const key = iterator.next().value;
                    this.cache.delete(key);
                    this.cacheTimestamps.delete(key);
                }
            }
        }

        /**
         * Obtém estatísticas do bridge
         */
        getStats() {
            return {
                cacheSize: this.cache.size,
                cacheHits: this.cacheHits || 0,
                cacheMisses: this.cacheMisses || 0,
                conversions: this.totalConversions || 0
            };
        }

        /**
         * Reseta cache
         */
        resetCache() {
            this.cache.clear();
            this.cacheTimestamps.clear();
            Logger.info('QdrantScoreBridge', 'Cache resetado');
        }
    }

    // Exporta para o namespace KC
    KC.QdrantScoreBridge = new QdrantScoreBridge();
    KC.QdrantScoreBridge.initialize();

    console.log('✅ QdrantScoreBridge inicializado');

})(window);