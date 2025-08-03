/**
 * UnifiedConfidenceSystem.js - Sistema Unificado de Confiança ML
 * 
 * Calcula scores de confiança DURANTE a descoberta de arquivos
 * Implementa inicialização lazy e fallbacks robustos
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    
    class UnifiedConfidenceSystem {
        constructor() {
            this.initialized = false;
            this.ready = false;
            this.initPromise = null;
            
            // Configurações padrão
            this.config = {
                minConfidence: 0,
                maxConfidence: 100,
                defaultConfidence: 50,
                keywords: ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'],
                boostFactors: {
                    keywordMatch: 1.2,
                    recentFile: 1.1,
                    largeFile: 1.05,
                    hasCategories: 1.5
                }
            };
        }

        /**
         * Inicializa o sistema (lazy)
         */
        async initialize() {
            if (this.initialized) return;
            if (this.initPromise) return this.initPromise;
            
            this.initPromise = this._doInitialize();
            return this.initPromise;
        }

        async _doInitialize() {
            console.log('[UnifiedConfidenceSystem] Inicializando...');
            
            try {
                // Carrega configurações se disponíveis
                if (KC.ConfigManager) {
                    const keywords = KC.ConfigManager.get('preAnalysis', 'keywords');
                    if (keywords && keywords.length) {
                        this.config.keywords = keywords;
                    }
                }
                
                this.initialized = true;
                this.ready = true;
                console.log('[UnifiedConfidenceSystem] Inicializado com sucesso');
                
            } catch (error) {
                console.error('[UnifiedConfidenceSystem] Erro na inicialização:', error);
                // Sistema continua funcionando com configurações padrão
                this.initialized = true;
                this.ready = true;
            }
        }

        /**
         * Calcula confidence score durante descoberta
         */
        calculateConfidence(file) {
            // Inicialização lazy se necessário
            if (!this.ready) {
                this.initialize().catch(console.error);
                // Retorna score padrão enquanto inicializa
                return this._calculateFallbackConfidence(file);
            }
            
            try {
                let score = this.config.defaultConfidence;
                
                // Boost por palavras-chave no conteúdo
                if (file.content || file.preview) {
                    const text = (file.content || file.preview || '').toLowerCase();
                    const keywordMatches = this.config.keywords.filter(kw => 
                        text.includes(kw.toLowerCase())
                    ).length;
                    
                    if (keywordMatches > 0) {
                        score *= Math.pow(this.config.boostFactors.keywordMatch, keywordMatches);
                    }
                }
                
                // Boost por arquivo recente (últimos 30 dias)
                if (file.lastModified) {
                    const daysSinceModified = (Date.now() - file.lastModified) / (1000 * 60 * 60 * 24);
                    if (daysSinceModified < 30) {
                        score *= this.config.boostFactors.recentFile;
                    }
                }
                
                // Boost por tamanho significativo (> 1KB)
                if (file.size && file.size > 1024) {
                    score *= this.config.boostFactors.largeFile;
                }
                
                // Boost por categorias (curadoria humana)
                if (file.categories && file.categories.length > 0) {
                    score *= this.config.boostFactors.hasCategories;
                }
                
                // Limita entre min e max
                score = Math.max(this.config.minConfidence, 
                        Math.min(this.config.maxConfidence, score));
                
                return Math.round(score);
                
            } catch (error) {
                console.error('[UnifiedConfidenceSystem] Erro no cálculo:', error);
                return this._calculateFallbackConfidence(file);
            }
        }

        /**
         * Cálculo de fallback quando sistema não está pronto
         */
        _calculateFallbackConfidence(file) {
            let score = 50; // Base
            
            // Lógica simples de fallback
            if (file.relevanceScore) {
                score = file.relevanceScore;
            }
            
            if (file.categories && file.categories.length > 0) {
                score = Math.min(100, score * 1.5);
            }
            
            return Math.round(score);
        }

        /**
         * Atualiza configurações
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            console.log('[UnifiedConfidenceSystem] Configuração atualizada:', this.config);
        }

        /**
         * Calcula confidence para múltiplos arquivos
         */
        calculateBatch(files) {
            return files.map(file => ({
                ...file,
                confidenceScore: this.calculateConfidence(file)
            }));
        }

        /**
         * Obtém estatísticas do sistema
         */
        getStats() {
            return {
                initialized: this.initialized,
                ready: this.ready,
                config: this.config
            };
        }
    }

    // Registra no namespace
    KC.UnifiedConfidenceSystem = new UnifiedConfidenceSystem();

    // Expõe para debug
    window.kcconfidence = {
        calculate: (file) => KC.UnifiedConfidenceSystem.calculateConfidence(file),
        stats: () => KC.UnifiedConfidenceSystem.getStats(),
        init: () => KC.UnifiedConfidenceSystem.initialize()
    };

})(window);