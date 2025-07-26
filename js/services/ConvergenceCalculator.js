/**
 * ConvergenceCalculator.js - Calculador de Convergência
 * 
 * Calcula métricas de convergência e estabilização para o ciclo de refinamento.
 * Determina quando uma análise atingiu estabilidade suficiente.
 * 
 * AIDEV-NOTE: convergence-metrics; métricas de estabilização do refinamento
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class ConvergenceCalculator {
        constructor() {
            // Configurações de convergência
            this.config = {
                minConfidence: 0.85,              // Confiança mínima para convergir
                maxVariance: 0.05,                // Variância máxima entre iterações
                minIterations: 2,                 // Mínimo de iterações antes de convergir
                stabilityWindow: 3,               // Janela de análises para verificar estabilidade
                typeConsistencyThreshold: 0.8,   // % de consistência no tipo detectado
                categoryAlignment: 0.7,           // Alinhamento mínimo com categorias manuais
                schemaConfidenceBoost: 0.1       // Boost quando Schema.org é mapeado
            };

            // Pesos para cálculo composto
            this.weights = {
                confidence: 0.3,        // Peso da confiança absoluta
                stability: 0.25,        // Peso da estabilidade entre iterações
                typeConsistency: 0.2,   // Peso da consistência do tipo
                categoryAlignment: 0.15, // Peso do alinhamento com categorias
                improvement: 0.1        // Peso da melhoria contínua
            };

            // Cache de cálculos
            this.cache = new Map();
        }

        /**
         * Calcula convergência para um arquivo
         * @param {string} fileId - ID do arquivo
         * @param {Array} analysisHistory - Histórico de análises
         * @returns {Object} Resultado da convergência
         */
        async calculate(fileId, analysisHistory) {
            try {
                // Verifica cache
                const cacheKey = this.getCacheKey(fileId, analysisHistory);
                if (this.cache.has(cacheKey)) {
                    return this.cache.get(cacheKey);
                }

                // Validações básicas
                if (!analysisHistory || analysisHistory.length < this.config.minIterations) {
                    return this.createResult(false, 'Iterações insuficientes', 0);
                }

                // Extrai métricas relevantes
                const metrics = this.extractMetrics(analysisHistory);
                
                // Calcula componentes de convergência
                const components = {
                    confidence: this.calculateConfidenceScore(metrics),
                    stability: this.calculateStabilityScore(metrics),
                    typeConsistency: this.calculateTypeConsistency(metrics),
                    categoryAlignment: await this.calculateCategoryAlignment(fileId, metrics),
                    improvement: this.calculateImprovementScore(metrics)
                };

                // Calcula score composto
                const compositeScore = this.calculateCompositeScore(components);
                
                // Determina se convergiu
                const isConverged = this.determineConvergence(components, compositeScore);
                
                // Cria resultado detalhado
                const result = {
                    isConverged,
                    score: compositeScore,
                    confidence: metrics.latestConfidence,
                    components,
                    metrics,
                    recommendation: this.generateRecommendation(components, isConverged),
                    schemaOrgReady: this.isSchemaOrgReady(components, metrics),
                    timestamp: Date.now()
                };

                // Cacheia resultado
                this.cache.set(cacheKey, result);
                
                // Log de debug
                Logger?.debug('ConvergenceCalculator', 'Convergência calculada', {
                    fileId,
                    isConverged,
                    score: compositeScore.toFixed(3),
                    iterations: analysisHistory.length
                });

                return result;

            } catch (error) {
                Logger?.error('ConvergenceCalculator', 'Erro ao calcular convergência', {
                    fileId,
                    error: error.message
                });
                return this.createResult(false, 'Erro no cálculo', 0);
            }
        }

        /**
         * Extrai métricas do histórico
         */
        extractMetrics(history) {
            const metrics = {
                iterations: history.length,
                confidences: [],
                types: [],
                categories: [],
                timestamps: [],
                improvements: []
            };

            // Ordena por timestamp
            const sortedHistory = [...history].sort((a, b) => 
                (a.timestamp || 0) - (b.timestamp || 0)
            );

            sortedHistory.forEach((analysis, index) => {
                const confidence = analysis.analysis?.confidence || 
                                 analysis.metadata?.confidence || 0;
                const type = analysis.analysis?.analysisType || 'Unknown';
                const categories = analysis.analysis?.categories || [];
                
                metrics.confidences.push(confidence);
                metrics.types.push(type);
                metrics.categories.push(categories);
                metrics.timestamps.push(analysis.timestamp || Date.now());
                
                // Calcula melhoria em relação à anterior
                if (index > 0) {
                    const improvement = confidence - metrics.confidences[index - 1];
                    metrics.improvements.push(improvement);
                }
            });

            // Métricas derivadas
            metrics.latestConfidence = metrics.confidences[metrics.confidences.length - 1];
            metrics.averageConfidence = this.average(metrics.confidences);
            metrics.confidenceVariance = this.variance(metrics.confidences);
            metrics.recentConfidences = metrics.confidences.slice(-this.config.stabilityWindow);
            metrics.recentVariance = this.variance(metrics.recentConfidences);
            
            // Tipo mais comum
            metrics.dominantType = this.mode(metrics.types);
            metrics.typeFrequency = this.frequency(metrics.types, metrics.dominantType);
            
            return metrics;
        }

        /**
         * Calcula score de confiança
         */
        calculateConfidenceScore(metrics) {
            const { latestConfidence, averageConfidence } = metrics;
            
            // Score baseado na confiança mais recente e média
            const currentScore = Math.min(latestConfidence / this.config.minConfidence, 1);
            const averageScore = Math.min(averageConfidence / this.config.minConfidence, 1);
            
            // Combina com peso maior para a mais recente
            return currentScore * 0.7 + averageScore * 0.3;
        }

        /**
         * Calcula score de estabilidade
         */
        calculateStabilityScore(metrics) {
            const { recentVariance, confidenceVariance } = metrics;
            
            // Quanto menor a variância, maior a estabilidade
            const recentStability = Math.max(0, 1 - (recentVariance / this.config.maxVariance));
            const overallStability = Math.max(0, 1 - (confidenceVariance / (this.config.maxVariance * 2)));
            
            // Verifica tendência de melhoria
            const improvementTrend = this.calculateImprovementTrend(metrics.improvements);
            
            // Combina estabilidade com tendência
            return recentStability * 0.5 + overallStability * 0.3 + improvementTrend * 0.2;
        }

        /**
         * Calcula consistência do tipo
         */
        calculateTypeConsistency(metrics) {
            const { types, dominantType, typeFrequency } = metrics;
            
            // Consistência baseada na frequência do tipo dominante
            const consistency = typeFrequency / types.length;
            
            // Bonus se o tipo se estabilizou nas últimas iterações
            const recentTypes = types.slice(-this.config.stabilityWindow);
            const recentConsistency = recentTypes.filter(t => t === dominantType).length / recentTypes.length;
            
            // Combina com peso maior para consistência recente
            return consistency * 0.4 + recentConsistency * 0.6;
        }

        /**
         * Calcula alinhamento com categorias
         */
        async calculateCategoryAlignment(fileId, metrics) {
            try {
                // Busca arquivo para obter categorias manuais
                const files = KC.AppState?.get('files') || [];
                const file = files.find(f => (f.id === fileId) || (f.name === fileId));
                
                if (!file || !file.categories || file.categories.length === 0) {
                    // Sem categorias manuais, retorna neutro
                    return 0.5;
                }

                const manualCategories = file.categories;
                
                // Verifica alinhamento das categorias sugeridas com as manuais
                let alignmentScores = [];
                
                metrics.categories.forEach(suggestedCats => {
                    if (!suggestedCats || suggestedCats.length === 0) {
                        alignmentScores.push(0);
                        return;
                    }
                    
                    // Calcula overlap
                    const overlap = suggestedCats.filter(cat => 
                        manualCategories.some(manual => 
                            this.categoriesMatch(cat, manual)
                        )
                    ).length;
                    
                    const alignmentScore = overlap / Math.max(suggestedCats.length, manualCategories.length);
                    alignmentScores.push(alignmentScore);
                });

                // Retorna média de alinhamento, com peso maior para iterações recentes
                const recentScores = alignmentScores.slice(-this.config.stabilityWindow);
                const recentAverage = this.average(recentScores);
                const overallAverage = this.average(alignmentScores);
                
                return recentAverage * 0.7 + overallAverage * 0.3;

            } catch (error) {
                Logger?.warning('ConvergenceCalculator', 'Erro ao calcular alinhamento', error);
                return 0.5; // Retorna neutro em caso de erro
            }
        }

        /**
         * Verifica se categorias correspondem
         */
        categoriesMatch(cat1, cat2) {
            // Normaliza para comparação
            const normalize = (str) => str.toLowerCase().trim();
            const n1 = normalize(cat1);
            const n2 = normalize(cat2);
            
            // Match exato
            if (n1 === n2) return true;
            
            // Match parcial (uma contém a outra)
            if (n1.includes(n2) || n2.includes(n1)) return true;
            
            // Match por similaridade (simplificado)
            const similarity = this.calculateStringSimilarity(n1, n2);
            return similarity > 0.8;
        }

        /**
         * Calcula similaridade entre strings (Levenshtein simplificado)
         */
        calculateStringSimilarity(str1, str2) {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length > str2.length ? str2 : str1;
            
            if (longer.length === 0) return 1.0;
            
            const editDistance = this.levenshteinDistance(longer, shorter);
            return (longer.length - editDistance) / longer.length;
        }

        /**
         * Distância de Levenshtein
         */
        levenshteinDistance(str1, str2) {
            const matrix = [];
            
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }
            
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[str2.length][str1.length];
        }

        /**
         * Calcula score de melhoria
         */
        calculateImprovementScore(metrics) {
            const { improvements } = metrics;
            
            if (!improvements || improvements.length === 0) {
                return 0.5; // Neutro se não há dados
            }

            // Calcula tendência de melhoria
            const trend = this.calculateImprovementTrend(improvements);
            
            // Verifica se melhorias são consistentes
            const positiveImprovements = improvements.filter(i => i > 0).length;
            const consistency = positiveImprovements / improvements.length;
            
            // Combina tendência com consistência
            return trend * 0.6 + consistency * 0.4;
        }

        /**
         * Calcula tendência de melhoria
         */
        calculateImprovementTrend(improvements) {
            if (!improvements || improvements.length < 2) return 0.5;
            
            // Regressão linear simples
            const n = improvements.length;
            const sumX = (n * (n + 1)) / 2;
            const sumY = improvements.reduce((sum, val) => sum + val, 0);
            const sumXY = improvements.reduce((sum, val, i) => sum + val * (i + 1), 0);
            const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            
            // Normaliza slope para [0, 1]
            return Math.max(0, Math.min(1, 0.5 + slope * 10));
        }

        /**
         * Calcula score composto
         */
        calculateCompositeScore(components) {
            let score = 0;
            
            Object.entries(this.weights).forEach(([key, weight]) => {
                score += (components[key] || 0) * weight;
            });
            
            return Math.max(0, Math.min(1, score));
        }

        /**
         * Determina se convergiu
         */
        determineConvergence(components, compositeScore) {
            // Critérios absolutos
            if (components.confidence < 0.7) return false; // Confiança muito baixa
            if (components.stability < 0.5) return false;  // Muito instável
            if (components.typeConsistency < 0.6) return false; // Tipo inconsistente
            
            // Score composto deve ser alto
            if (compositeScore < 0.75) return false;
            
            // Verificações adicionais para alta qualidade
            const highQuality = 
                components.confidence >= 0.85 &&
                components.stability >= 0.7 &&
                components.typeConsistency >= 0.8;
            
            return highQuality || compositeScore >= 0.85;
        }

        /**
         * Gera recomendação baseada nos componentes
         */
        generateRecommendation(components, isConverged) {
            const recommendations = [];
            
            if (isConverged) {
                recommendations.push('✅ Análise convergiu com sucesso');
                
                if (components.confidence >= 0.9) {
                    recommendations.push('🎯 Alta confiança atingida');
                }
                
                if (components.categoryAlignment >= 0.8) {
                    recommendations.push('🏷️ Excelente alinhamento com categorias manuais');
                }
                
                return recommendations.join('. ');
            }
            
            // Recomendações para melhorar convergência
            if (components.confidence < 0.8) {
                recommendations.push('📈 Adicione mais contexto ou categorias para aumentar confiança');
            }
            
            if (components.stability < 0.6) {
                recommendations.push('🔄 Aguarde estabilização entre iterações');
            }
            
            if (components.typeConsistency < 0.7) {
                recommendations.push('🎯 Tipo de análise ainda instável, refinamento em progresso');
            }
            
            if (components.categoryAlignment < 0.5) {
                recommendations.push('🏷️ Revise categorias manuais para melhor alinhamento');
            }
            
            return recommendations.join('. ') || 'Continue o refinamento';
        }

        /**
         * Verifica se está pronto para Schema.org
         */
        isSchemaOrgReady(components, metrics) {
            // Requer alta confiança e consistência
            const ready = 
                components.confidence >= 0.85 &&
                components.typeConsistency >= 0.8 &&
                metrics.iterations >= 2;
            
            // AIDEV-NOTE: schema-ready; critérios para mapeamento Schema.org
            if (ready) {
                Logger?.debug('ConvergenceCalculator', 'Pronto para Schema.org', {
                    confidence: components.confidence,
                    type: metrics.dominantType,
                    iterations: metrics.iterations
                });
            }
            
            return ready;
        }

        /**
         * Cria resultado padrão
         */
        createResult(isConverged, reason, score) {
            return {
                isConverged,
                score,
                reason,
                components: {},
                metrics: {},
                recommendation: reason,
                schemaOrgReady: false,
                timestamp: Date.now()
            };
        }

        /**
         * Gera chave de cache
         */
        getCacheKey(fileId, history) {
            const historyHash = history.length + '_' + 
                               history[history.length - 1]?.timestamp;
            return `${fileId}_${historyHash}`;
        }

        /**
         * Limpa cache
         */
        clearCache() {
            this.cache.clear();
            Logger?.debug('ConvergenceCalculator', 'Cache limpo');
        }

        // === Métodos Utilitários ===

        /**
         * Calcula média
         */
        average(arr) {
            if (!arr || arr.length === 0) return 0;
            return arr.reduce((sum, val) => sum + val, 0) / arr.length;
        }

        /**
         * Calcula variância
         */
        variance(arr) {
            if (!arr || arr.length < 2) return 0;
            const avg = this.average(arr);
            const squaredDiffs = arr.map(val => Math.pow(val - avg, 2));
            return this.average(squaredDiffs);
        }

        /**
         * Encontra moda (valor mais frequente)
         */
        mode(arr) {
            if (!arr || arr.length === 0) return null;
            
            const frequency = {};
            let maxFreq = 0;
            let mode = arr[0];
            
            arr.forEach(val => {
                frequency[val] = (frequency[val] || 0) + 1;
                if (frequency[val] > maxFreq) {
                    maxFreq = frequency[val];
                    mode = val;
                }
            });
            
            return mode;
        }

        /**
         * Calcula frequência de um valor
         */
        frequency(arr, value) {
            if (!arr || arr.length === 0) return 0;
            return arr.filter(val => val === value).length;
        }

        /**
         * Obtém estatísticas do calculador
         */
        getStats() {
            return {
                cacheSize: this.cache.size,
                config: { ...this.config },
                weights: { ...this.weights }
            };
        }

        /**
         * Atualiza configuração
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            this.clearCache(); // Limpa cache ao mudar config
            
            Logger?.info('ConvergenceCalculator', 'Configuração atualizada', this.config);
        }

        /**
         * Atualiza pesos
         */
        updateWeights(newWeights) {
            // Normaliza pesos para somar 1
            const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
            
            Object.entries(newWeights).forEach(([key, weight]) => {
                if (this.weights.hasOwnProperty(key)) {
                    this.weights[key] = weight / total;
                }
            });
            
            this.clearCache(); // Limpa cache ao mudar pesos
            
            Logger?.info('ConvergenceCalculator', 'Pesos atualizados', this.weights);
        }
    }

    // Registra no namespace
    KC.ConvergenceCalculator = new ConvergenceCalculator();

})(window);