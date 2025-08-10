/**
 * DataValidationManager.js - Gerenciador de Validação de Dados
 * 
 * Valida integridade e consistência de dados no sistema
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class DataValidationManager {
        constructor() {
            // Regras de validação
            this.validationRules = {
                file: {
                    required: ['name', 'path', 'type'],
                    optional: ['content', 'size', 'lastModified', 'categories', 'relevance']
                },
                analysis: {
                    required: ['fileId', 'timestamp', 'analysisType'],
                    optional: ['result', 'insights', 'confidence', 'error']
                },
                category: {
                    required: ['id', 'name'],
                    optional: ['color', 'description', 'parent', 'children']
                },
                embedding: {
                    required: ['id', 'vector'],
                    optional: ['metadata', 'model', 'dimensions']
                }
            };
            
            // Estatísticas de validação
            this.stats = {
                totalValidations: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                lastValidation: null
            };
            
            // Cache de validações
            this.validationCache = new Map();
        }

        /**
         * Inicializa o manager
         */
        initialize() {
            Logger.info('DataValidationManager', 'Inicializado');
            this.validateSystemIntegrity();
        }

        /**
         * Valida um objeto genérico
         */
        validate(data, type) {
            this.stats.totalValidations++;
            
            const result = {
                valid: true,
                errors: [],
                warnings: [],
                timestamp: Date.now()
            };
            
            // Verifica se tipo existe
            if (!this.validationRules[type]) {
                result.valid = false;
                result.errors.push(`Tipo de validação desconhecido: ${type}`);
                this.stats.failed++;
                return result;
            }
            
            const rules = this.validationRules[type];
            
            // Valida campos obrigatórios
            rules.required.forEach(field => {
                if (!data[field] && data[field] !== 0 && data[field] !== false) {
                    result.valid = false;
                    result.errors.push(`Campo obrigatório ausente: ${field}`);
                }
            });
            
            // Valida tipos de dados
            this.validateDataTypes(data, type, result);
            
            // Valida ranges e formatos
            this.validateRangesAndFormats(data, type, result);
            
            // Atualiza estatísticas
            if (result.valid) {
                this.stats.passed++;
            } else {
                this.stats.failed++;
            }
            
            if (result.warnings.length > 0) {
                this.stats.warnings += result.warnings.length;
            }
            
            this.stats.lastValidation = result;
            
            return result;
        }

        /**
         * Valida tipos de dados
         */
        validateDataTypes(data, type, result) {
            // Validações específicas por tipo
            switch (type) {
                case 'file':
                    if (data.size && typeof data.size !== 'number') {
                        result.errors.push('Tamanho do arquivo deve ser numérico');
                        result.valid = false;
                    }
                    if (data.relevance && (data.relevance < 0 || data.relevance > 100)) {
                        result.warnings.push('Relevância fora do range esperado (0-100)');
                    }
                    break;
                    
                case 'analysis':
                    if (data.confidence && (data.confidence < 0 || data.confidence > 100)) {
                        result.errors.push('Confiança deve estar entre 0 e 100');
                        result.valid = false;
                    }
                    break;
                    
                case 'embedding':
                    if (data.vector && !Array.isArray(data.vector)) {
                        result.errors.push('Vector deve ser um array');
                        result.valid = false;
                    }
                    if (data.dimensions && data.vector && data.vector.length !== data.dimensions) {
                        result.errors.push(`Dimensões incorretas: esperado ${data.dimensions}, recebido ${data.vector.length}`);
                        result.valid = false;
                    }
                    break;
            }
        }

        /**
         * Valida ranges e formatos
         */
        validateRangesAndFormats(data, type, result) {
            // Validações de formato
            if (data.email && !this.isValidEmail(data.email)) {
                result.errors.push('Email inválido');
                result.valid = false;
            }
            
            if (data.url && !this.isValidUrl(data.url)) {
                result.warnings.push('URL pode estar malformada');
            }
            
            if (data.timestamp) {
                const ts = parseInt(data.timestamp);
                if (isNaN(ts) || ts < 0 || ts > Date.now() + 86400000) {
                    result.warnings.push('Timestamp suspeito');
                }
            }
        }

        /**
         * Valida email
         */
        isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        /**
         * Valida URL
         */
        isValidUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }

        /**
         * Valida integridade do sistema
         */
        async validateSystemIntegrity() {
            const report = {
                timestamp: Date.now(),
                components: {},
                overall: 'healthy',
                issues: []
            };
            
            // Valida AppState
            if (KC.AppState) {
                const files = KC.AppState.get('files') || [];
                report.components.appState = {
                    status: 'ok',
                    filesCount: files.length
                };
            } else {
                report.components.appState = {
                    status: 'missing'
                };
                report.overall = 'degraded';
                report.issues.push('AppState não disponível');
            }
            
            // Valida serviços críticos
            const criticalServices = [
                'DiscoveryManager',
                'FilterManager',
                'CategoryManager',
                'FileRenderer'
            ];
            
            criticalServices.forEach(service => {
                if (KC[service]) {
                    report.components[service] = { status: 'ok' };
                } else {
                    report.components[service] = { status: 'missing' };
                    report.overall = 'degraded';
                    report.issues.push(`${service} não disponível`);
                }
            });
            
            // Valida serviços opcionais
            const optionalServices = [
                'QdrantService',
                'EmbeddingService',
                'ContentAnalysisOrchestrator',
                'SemanticConvergenceService'
            ];
            
            optionalServices.forEach(service => {
                if (KC[service]) {
                    report.components[service] = { status: 'ok' };
                } else {
                    report.components[service] = { status: 'optional-missing' };
                    report.issues.push(`${service} não disponível (opcional)`);
                }
            });
            
            Logger.info('DataValidationManager', 'Integridade do sistema validada', report);
            
            return report;
        }

        /**
         * Valida batch de dados
         */
        validateBatch(dataArray, type) {
            const results = {
                total: dataArray.length,
                valid: 0,
                invalid: 0,
                errors: [],
                warnings: [],
                details: []
            };
            
            dataArray.forEach((data, index) => {
                const validation = this.validate(data, type);
                results.details.push({
                    index,
                    ...validation
                });
                
                if (validation.valid) {
                    results.valid++;
                } else {
                    results.invalid++;
                    results.errors.push(...validation.errors.map(e => `[${index}] ${e}`));
                }
                
                if (validation.warnings.length > 0) {
                    results.warnings.push(...validation.warnings.map(w => `[${index}] ${w}`));
                }
            });
            
            return results;
        }

        /**
         * Sanitiza dados
         */
        sanitize(data, type) {
            const sanitized = { ...data };
            const rules = this.validationRules[type];
            
            if (!rules) return sanitized;
            
            // Remove campos não permitidos
            const allowedFields = [...rules.required, ...rules.optional];
            Object.keys(sanitized).forEach(key => {
                if (!allowedFields.includes(key)) {
                    delete sanitized[key];
                }
            });
            
            // Sanitiza strings
            Object.keys(sanitized).forEach(key => {
                if (typeof sanitized[key] === 'string') {
                    sanitized[key] = this.sanitizeString(sanitized[key]);
                }
            });
            
            return sanitized;
        }

        /**
         * Sanitiza string
         */
        sanitizeString(str) {
            // Remove caracteres de controle
            return str.replace(/[\x00-\x1F\x7F]/g, '');
        }

        /**
         * Obtém estatísticas
         */
        getStats() {
            return {
                ...this.stats,
                successRate: this.stats.totalValidations > 0 ? 
                    Math.round((this.stats.passed / this.stats.totalValidations) * 100) : 0
            };
        }

        /**
         * Reseta estatísticas
         */
        resetStats() {
            this.stats = {
                totalValidations: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                lastValidation: null
            };
            
            Logger.info('DataValidationManager', 'Estatísticas resetadas');
        }

        /**
         * Adiciona regra customizada
         */
        addCustomRule(type, field, validator) {
            if (!this.customValidators) {
                this.customValidators = {};
            }
            
            if (!this.customValidators[type]) {
                this.customValidators[type] = {};
            }
            
            this.customValidators[type][field] = validator;
            
            Logger.info('DataValidationManager', `Regra customizada adicionada: ${type}.${field}`);
        }
    }

    // Exporta para o namespace KC
    KC.DataValidationManager = new DataValidationManager();
    KC.DataValidationManager.initialize();

    console.log('✅ DataValidationManager inicializado');

})(window);