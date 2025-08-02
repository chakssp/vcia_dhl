/**
 * CategoryNormalizer.js - Utilitário Centralizado para Normalização de Categorias
 * 
 * PROBLEMA RESOLVIDO:
 * - Categorias estavam sendo perdidas devido a inconsistências de formato
 * - IDs string vs objetos completos causavam falhas em múltiplos pontos
 * - Falta de validação causava perdas silenciosas
 * 
 * SOLUÇÃO:
 * - Ponto único de normalização para todo o sistema
 * - Conversão robusta entre formatos
 * - Validação defensiva com logs detalhados
 * - Preservação da curadoria humana valiosa
 * 
 * @version 1.0.0
 * @date 30/01/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class CategoryNormalizer {
        constructor() {
            this.warnings = [];
            this.normalizedCount = 0;
            this.errorCount = 0;
        }

        /**
         * Normaliza categorias para formato consistente de objetos completos
         * @param {Array|*} categories - Categorias em qualquer formato
         * @param {string} sourceContext - Contexto para logging (ex: 'RAGExportManager.line380')
         * @returns {Array<Object>} Array de objetos de categoria normalizados
         */
        normalize(categories, sourceContext = 'unknown') {
            // Validação inicial
            if (!categories) {
                this._logTrace(sourceContext, 'null/undefined', [], 'empty_input');
                return [];
            }

            if (!Array.isArray(categories)) {
                this._logWarning(sourceContext, 'not_array', categories);
                return [];
            }

            if (categories.length === 0) {
                this._logTrace(sourceContext, 'empty_array', [], 'empty_input');
                return [];
            }

            // Normalizar cada categoria
            const normalized = categories.map((cat, index) => {
                try {
                    return this._normalizeCategory(cat, `${sourceContext}[${index}]`);
                } catch (error) {
                    this._logError(sourceContext, index, cat, error);
                    return null;
                }
            }).filter(Boolean); // Remove nulls

            // Log resultado
            this._logTrace(sourceContext, 'success', normalized, 'normalized', {
                inputCount: categories.length,
                outputCount: normalized.length,
                dropped: categories.length - normalized.length
            });

            this.normalizedCount++;
            return normalized;
        }

        /**
         * Normaliza uma única categoria
         * @private
         */
        _normalizeCategory(category, context) {
            // Caso 1: String ID
            if (typeof category === 'string') {
                return this._normalizeFromId(category, context);
            }

            // Caso 2: Objeto completo válido
            if (typeof category === 'object' && category !== null) {
                return this._normalizeFromObject(category, context);
            }

            // Caso 3: Tipo inválido
            this._logWarning(context, 'invalid_type', category);
            return null;
        }

        /**
         * Normaliza a partir de um ID string
         * @private
         */
        _normalizeFromId(categoryId, context) {
            if (!categoryId || categoryId.trim() === '') {
                this._logWarning(context, 'empty_id', categoryId);
                return null;
            }

            // Buscar no CategoryManager
            const categoryObj = KC.CategoryManager?.getCategoryById(categoryId);
            
            if (categoryObj) {
                return {
                    id: categoryId,
                    name: categoryObj.name || categoryId,
                    color: categoryObj.color || '#808080',
                    icon: categoryObj.icon || '📁',
                    source: 'CategoryManager'
                };
            }

            // Fallback: criar objeto mínimo
            this._logWarning(context, 'id_not_found', categoryId);
            return {
                id: categoryId,
                name: categoryId,
                color: '#808080',
                icon: '📁',
                source: 'fallback'
            };
        }

        /**
         * Normaliza a partir de um objeto
         * @private
         */
        _normalizeFromObject(categoryObj, context) {
            // Validar estrutura mínima
            if (!categoryObj.id && !categoryObj.name) {
                this._logWarning(context, 'invalid_object', categoryObj);
                return null;
            }

            // Se tem ID, tentar enriquecer com CategoryManager
            if (categoryObj.id) {
                const fullCategory = KC.CategoryManager?.getCategoryById(categoryObj.id);
                if (fullCategory) {
                    return {
                        id: categoryObj.id,
                        name: fullCategory.name || categoryObj.name || categoryObj.id,
                        color: fullCategory.color || categoryObj.color || '#808080',
                        icon: fullCategory.icon || categoryObj.icon || '📁',
                        source: 'CategoryManager_enriched'
                    };
                }
            }

            // Usar dados do próprio objeto
            return {
                id: categoryObj.id || categoryObj.name,
                name: categoryObj.name || categoryObj.id || 'Sem nome',
                color: categoryObj.color || '#808080',
                icon: categoryObj.icon || '📁',
                source: 'object_data'
            };
        }

        /**
         * Valida integridade de categorias em um arquivo
         * @param {Object} file - Arquivo para validar
         * @param {string} operation - Nome da operação para logging
         * @returns {Object} Resultado da validação
         */
        validateIntegrity(file, operation) {
            const issues = [];
            const context = `${operation}:${file.id || 'unknown'}`;

            if (!file) {
                issues.push('Arquivo é null/undefined');
                return { valid: false, issues };
            }

            // Verificar se tem categorias
            if (!file.categories) {
                this._logTrace(context, 'no_categories_field', null, 'missing');
                return { valid: true, issues: [], warning: 'Arquivo sem campo categories' };
            }

            // Validar formato
            if (!Array.isArray(file.categories)) {
                issues.push(`categories deve ser array, encontrado: ${typeof file.categories}`);
                return { valid: false, issues };
            }

            // Validar cada categoria
            file.categories.forEach((cat, index) => {
                if (!cat) {
                    issues.push(`Categoria vazia no índice ${index}`);
                } else if (typeof cat === 'string') {
                    if (!cat.trim()) {
                        issues.push(`ID de categoria vazio no índice ${index}`);
                    } else if (!KC.CategoryManager?.getCategoryById(cat)) {
                        issues.push(`ID '${cat}' não encontrado no CategoryManager (índice ${index})`);
                    }
                } else if (typeof cat === 'object') {
                    if (!cat.id && !cat.name) {
                        issues.push(`Objeto de categoria sem id/name no índice ${index}`);
                    }
                } else {
                    issues.push(`Tipo inválido no índice ${index}: ${typeof cat}`);
                }
            });

            if (issues.length > 0) {
                this._logError(context, 'validation', file.categories, { issues });
                return { valid: false, issues };
            }

            return { valid: true, issues: [] };
        }

        /**
         * Extrai apenas os nomes das categorias (para payload final)
         * @param {Array} normalizedCategories - Categorias já normalizadas
         * @returns {Array<string>} Array de nomes
         */
        extractNames(normalizedCategories) {
            if (!Array.isArray(normalizedCategories)) {
                return [];
            }

            return normalizedCategories
                .filter(cat => cat && cat.name)
                .map(cat => cat.name);
        }

        /**
         * Extrai apenas os IDs das categorias
         * @param {Array} normalizedCategories - Categorias já normalizadas
         * @returns {Array<string>} Array de IDs
         */
        extractIds(normalizedCategories) {
            if (!Array.isArray(normalizedCategories)) {
                return [];
            }

            return normalizedCategories
                .filter(cat => cat && cat.id)
                .map(cat => cat.id);
        }

        /**
         * Log de rastreamento detalhado
         * @private
         */
        _logTrace(context, status, data, result, extra = {}) {
            KC.Logger?.info('[CATEGORY-TRACE]', {
                context,
                status,
                result,
                dataType: Array.isArray(data) ? 'array' : typeof data,
                count: Array.isArray(data) ? data.length : undefined,
                sample: Array.isArray(data) ? data.slice(0, 2) : data,
                ...extra
            });
        }

        /**
         * Log de aviso
         * @private
         */
        _logWarning(context, type, data) {
            const warning = {
                context,
                type,
                data: JSON.stringify(data).substring(0, 100)
            };
            
            this.warnings.push(warning);
            KC.Logger?.warning('[CATEGORY-NORMALIZER]', warning);
        }

        /**
         * Log de erro
         * @private
         */
        _logError(context, operation, data, error) {
            this.errorCount++;
            KC.Logger?.error('[CATEGORY-NORMALIZER]', {
                context,
                operation,
                data: JSON.stringify(data).substring(0, 100),
                error: error.message || error.toString()
            });
        }

        /**
         * Retorna estatísticas de uso
         */
        getStats() {
            return {
                normalizedCount: this.normalizedCount,
                errorCount: this.errorCount,
                warningCount: this.warnings.length,
                recentWarnings: this.warnings.slice(-10)
            };
        }

        /**
         * Limpa estatísticas
         */
        clearStats() {
            this.warnings = [];
            this.normalizedCount = 0;
            this.errorCount = 0;
        }
    }

    // Registrar no KC
    KC.CategoryNormalizer = new CategoryNormalizer();
    
    // Log de inicialização
    KC.Logger?.info('[CategoryNormalizer]', 'Sistema de normalização de categorias inicializado');

})(window);