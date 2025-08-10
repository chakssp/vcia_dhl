/**
 * ScoreNormalizer.js - Normalizador de Scores
 * 
 * Normaliza e padroniza scores entre diferentes componentes do sistema
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class ScoreNormalizer {
        constructor() {
            // Configurações de normalização
            this.config = {
                // Ranges padrão
                ranges: {
                    relevance: { min: 0, max: 100 },
                    confidence: { min: 0, max: 100 },
                    similarity: { min: -1, max: 1 }, // Cosine similarity
                    qdrant: { min: 0, max: 1 },
                    percentage: { min: 0, max: 100 }
                },
                
                // Thresholds
                thresholds: {
                    low: 30,
                    medium: 50,
                    high: 70,
                    veryHigh: 90
                },
                
                // Pesos para score composto
                weights: {
                    relevance: 0.3,
                    confidence: 0.25,
                    similarity: 0.25,
                    metadata: 0.1,
                    temporal: 0.1
                }
            };
            
            // Cache de normalizações
            this.cache = new Map();
        }

        /**
         * Inicializa o normalizador
         */
        initialize() {
            Logger.info('ScoreNormalizer', 'Inicializado com configuração', this.config);
        }

        /**
         * Normaliza um score para range 0-100
         */
        normalize(value, fromRange = { min: 0, max: 100 }, toRange = { min: 0, max: 100 }) {
            if (value === null || value === undefined) return 0;
            
            // Clamp ao range de origem
            const clampedValue = Math.max(fromRange.min, Math.min(fromRange.max, value));
            
            // Normaliza
            const normalized = ((clampedValue - fromRange.min) / (fromRange.max - fromRange.min)) * 
                             (toRange.max - toRange.min) + toRange.min;
            
            return Math.round(normalized * 100) / 100; // 2 casas decimais
        }

        /**
         * Normaliza score de similaridade (-1 a 1) para percentual (0-100)
         */
        normalizeSimilarity(similarity) {
            return this.normalize(similarity, this.config.ranges.similarity, this.config.ranges.percentage);
        }

        /**
         * Normaliza score do Qdrant (0-1) para percentual (0-100)
         */
        normalizeQdrantScore(score) {
            return this.normalize(score, this.config.ranges.qdrant, this.config.ranges.percentage);
        }

        /**
         * Desnormaliza percentual (0-100) para Qdrant (0-1)
         */
        denormalizeToQdrant(percentage) {
            return this.normalize(percentage, this.config.ranges.percentage, this.config.ranges.qdrant);
        }

        /**
         * Calcula score composto multi-dimensional
         */
        calculateCompositeScore(scores, customWeights = null) {
            const weights = customWeights || this.config.weights;
            let totalWeight = 0;
            let weightedSum = 0;
            
            Object.entries(scores).forEach(([key, value]) => {
                if (weights[key] !== undefined && value !== null && value !== undefined) {
                    const normalizedValue = this.ensurePercentage(value);
                    weightedSum += normalizedValue * weights[key];
                    totalWeight += weights[key];
                }
            });
            
            if (totalWeight === 0) return 0;
            
            return Math.round(weightedSum / totalWeight);
        }

        /**
         * Garante que valor está em percentual (0-100)
         */
        ensurePercentage(value) {
            if (value >= -1 && value <= 1) {
                // Provavelmente similaridade ou score Qdrant
                return value < 0 ? this.normalizeSimilarity(value) : this.normalizeQdrantScore(value);
            }
            
            // Já está em percentual ou precisa ser clampado
            return Math.max(0, Math.min(100, value));
        }

        /**
         * Classifica score em categoria
         */
        categorizeScore(score) {
            const normalizedScore = this.ensurePercentage(score);
            const { thresholds } = this.config;
            
            if (normalizedScore >= thresholds.veryHigh) return 'very-high';
            if (normalizedScore >= thresholds.high) return 'high';
            if (normalizedScore >= thresholds.medium) return 'medium';
            if (normalizedScore >= thresholds.low) return 'low';
            return 'very-low';
        }

        /**
         * Obtém cor baseada no score
         */
        getScoreColor(score) {
            const category = this.categorizeScore(score);
            
            const colors = {
                'very-high': '#22c55e', // Verde brilhante
                'high': '#4ade80',      // Verde
                'medium': '#fbbf24',    // Amarelo
                'low': '#fb923c',       // Laranja
                'very-low': '#ef4444'   // Vermelho
            };
            
            return colors[category] || '#6b7280'; // Cinza como fallback
        }

        /**
         * Obtém emoji baseado no score
         */
        getScoreEmoji(score) {
            const category = this.categorizeScore(score);
            
            const emojis = {
                'very-high': '🔥',
                'high': '⭐',
                'medium': '📊',
                'low': '📉',
                'very-low': '⚠️'
            };
            
            return emojis[category] || '❓';
        }

        /**
         * Normaliza batch de scores
         */
        normalizeBatch(scores, fromRange, toRange) {
            return scores.map(score => this.normalize(score, fromRange, toRange));
        }

        /**
         * Calcula estatísticas de scores
         */
        calculateStats(scores) {
            if (!scores || scores.length === 0) {
                return {
                    min: 0,
                    max: 0,
                    mean: 0,
                    median: 0,
                    stdDev: 0
                };
            }
            
            const normalized = scores.map(s => this.ensurePercentage(s));
            const sorted = [...normalized].sort((a, b) => a - b);
            
            const min = sorted[0];
            const max = sorted[sorted.length - 1];
            const mean = normalized.reduce((a, b) => a + b, 0) / normalized.length;
            
            const median = sorted.length % 2 === 0 ?
                (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 :
                sorted[Math.floor(sorted.length / 2)];
            
            const variance = normalized.reduce((sum, score) => 
                sum + Math.pow(score - mean, 2), 0) / normalized.length;
            const stdDev = Math.sqrt(variance);
            
            return {
                min: Math.round(min),
                max: Math.round(max),
                mean: Math.round(mean),
                median: Math.round(median),
                stdDev: Math.round(stdDev * 100) / 100
            };
        }

        /**
         * Ajusta scores baseado em distribuição
         */
        adjustDistribution(scores, targetMean = 50, targetStdDev = 20) {
            const stats = this.calculateStats(scores);
            
            if (stats.stdDev === 0) return scores; // Todos iguais
            
            return scores.map(score => {
                const normalized = this.ensurePercentage(score);
                const zScore = (normalized - stats.mean) / stats.stdDev;
                const adjusted = targetMean + (zScore * targetStdDev);
                return Math.max(0, Math.min(100, Math.round(adjusted)));
            });
        }

        /**
         * Interpola entre dois scores
         */
        interpolate(score1, score2, factor = 0.5) {
            const norm1 = this.ensurePercentage(score1);
            const norm2 = this.ensurePercentage(score2);
            return norm1 + (norm2 - norm1) * factor;
        }

        /**
         * Suaviza variações de score ao longo do tempo
         */
        smoothScores(scores, windowSize = 3) {
            if (scores.length <= windowSize) return scores;
            
            const smoothed = [];
            
            for (let i = 0; i < scores.length; i++) {
                const start = Math.max(0, i - Math.floor(windowSize / 2));
                const end = Math.min(scores.length, i + Math.floor(windowSize / 2) + 1);
                const window = scores.slice(start, end);
                const avg = window.reduce((a, b) => a + this.ensurePercentage(b), 0) / window.length;
                smoothed.push(Math.round(avg));
            }
            
            return smoothed;
        }

        /**
         * Combina múltiplos scores com diferentes estratégias
         */
        combineScores(scores, strategy = 'weighted') {
            const normalizedScores = scores.map(s => this.ensurePercentage(s));
            
            switch (strategy) {
                case 'max':
                    return Math.max(...normalizedScores);
                    
                case 'min':
                    return Math.min(...normalizedScores);
                    
                case 'mean':
                    return normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;
                    
                case 'weighted':
                    // Usa pesos decrescentes
                    let weightedSum = 0;
                    let totalWeight = 0;
                    normalizedScores.forEach((score, index) => {
                        const weight = 1 / (index + 1);
                        weightedSum += score * weight;
                        totalWeight += weight;
                    });
                    return Math.round(weightedSum / totalWeight);
                    
                case 'harmonic':
                    const reciprocals = normalizedScores.map(s => s > 0 ? 1 / s : 0);
                    const sumReciprocals = reciprocals.reduce((a, b) => a + b, 0);
                    return sumReciprocals > 0 ? normalizedScores.length / sumReciprocals : 0;
                    
                default:
                    return this.calculateCompositeScore({ score: normalizedScores[0] });
            }
        }

        /**
         * Obtém configuração
         */
        getConfig() {
            return { ...this.config };
        }

        /**
         * Atualiza configuração
         */
        updateConfig(newConfig) {
            Object.assign(this.config, newConfig);
            this.cache.clear(); // Limpa cache ao mudar config
            Logger.info('ScoreNormalizer', 'Configuração atualizada', newConfig);
        }
    }

    // Exporta para o namespace KC
    KC.ScoreNormalizer = new ScoreNormalizer();
    KC.ScoreNormalizer.initialize();

    console.log('✅ ScoreNormalizer inicializado');

})(window);