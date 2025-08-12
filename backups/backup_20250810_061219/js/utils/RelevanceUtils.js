/**
 * RelevanceUtils.js - Utilitários para cálculo de relevância
 * 
 * Centraliza a lógica de cálculo de boost de relevância
 * Usa fórmula logarítmica para evitar saturação rápida
 * 
 * AIDEV-NOTE: relevance-boost; fórmula logarítmica para boost mais equilibrado
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class RelevanceUtils {
        /**
         * Calcula boost de relevância baseado em categorias
         * Usa escala logarítmica para crescimento mais suave
         * 
         * @param {number} numCategories - Número de categorias
         * @param {number} baseRelevance - Relevância base (0-1 ou 0-100)
         * @returns {number} Relevância com boost aplicado
         */
        static calculateCategoryBoost(numCategories, baseRelevance) {
            if (!numCategories || numCategories <= 0) {
                return baseRelevance;
            }

            // Detecta se relevância está em escala 0-1 ou 0-100
            const isPercentage = baseRelevance > 1;
            const normalizedBase = isPercentage ? baseRelevance / 100 : baseRelevance;

            // Boost logarítmico: cresce mais devagar
            // 1 categoria: ~5% boost
            // 2 categorias: ~8% boost  
            // 3 categorias: ~10% boost
            // 5 categorias: ~13% boost
            // 10 categorias: ~17% boost
            const boost = 1 + (Math.log(numCategories + 1) * 0.05);
            
            // Aplica boost
            const boostedRelevance = normalizedBase * boost;
            
            // Limita a 95% para manter diferenciação
            const finalRelevance = Math.min(0.95, boostedRelevance);
            
            // Retorna na mesma escala da entrada
            return isPercentage ? finalRelevance * 100 : finalRelevance;
        }

        /**
         * Calcula o percentual de boost aplicado
         * @param {number} numCategories - Número de categorias
         * @returns {number} Percentual de boost (ex: 5 para 5%)
         */
        static getBoostPercentage(numCategories) {
            if (!numCategories || numCategories <= 0) {
                return 0;
            }
            
            const boost = 1 + (Math.log(numCategories + 1) * 0.05);
            return Math.round((boost - 1) * 100);
        }

        /**
         * Formata descrição do boost para UI
         * @param {number} numCategories - Número de categorias
         * @returns {string} Descrição formatada
         */
        static getBoostDescription(numCategories) {
            const percentage = this.getBoostPercentage(numCategories);
            if (percentage === 0) {
                return 'Sem boost';
            }
            return `+${percentage}% por ${numCategories} categoria${numCategories > 1 ? 's' : ''}`;
        }

        /**
         * Valida e normaliza score de relevância
         * @param {number} score - Score a validar
         * @returns {number} Score normalizado (0-100)
         */
        static normalizeScore(score) {
            if (typeof score !== 'number' || isNaN(score)) {
                return 0;
            }
            
            // Se está em escala 0-1, converte para 0-100
            if (score <= 1) {
                score = score * 100;
            }
            
            // Limita entre 0 e 100
            return Math.max(0, Math.min(100, score));
        }

        /**
         * Calcula relevância composta considerando múltiplos fatores
         * @param {Object} factors - Fatores de relevância
         * @returns {number} Relevância composta (0-100)
         */
        static calculateCompositeRelevance(factors) {
            const {
                keywordScore = 0,
                analysisTypeScore = 0,
                categoriesCount = 0,
                manualBoost = 0,
                temporalRelevance = 1
            } = factors;

            // Pondera os diferentes fatores
            const weights = {
                keyword: 0.4,
                analysisType: 0.3,
                manual: 0.2,
                temporal: 0.1
            };

            // Calcula score base ponderado
            const baseScore = (
                keywordScore * weights.keyword +
                analysisTypeScore * weights.analysisType +
                manualBoost * weights.manual
            ) * temporalRelevance;

            // Aplica boost de categorias
            const finalScore = this.calculateCategoryBoost(categoriesCount, baseScore);

            return this.normalizeScore(finalScore);
        }
    }

    // Registrar no namespace global
    KC.RelevanceUtils = RelevanceUtils;

    // Exportar para uso em módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RelevanceUtils;
    }

})(window);