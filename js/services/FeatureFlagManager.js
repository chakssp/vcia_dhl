/**
 * FeatureFlagManager.js - Gerenciador de Feature Flags
 * 
 * Controla ativação/desativação de funcionalidades do sistema
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class FeatureFlagManager {
        constructor() {
            // Flags padrão
            this.flags = {
                // Funcionalidades Core
                multiDimensionalAnalysis: true,
                evolutionQueue: true,
                semanticConvergence: true,
                hybridSearch: true,
                
                // Extractors
                pdfExtraction: false, // Aguardando implementação
                docxExtraction: false, // Aguardando implementação
                pstExtraction: false, // Aguardando implementação
                
                // Visualizações
                queueProgressDashboard: true,
                convergenceDashboard: true,
                multiDimensionalScoresUI: true,
                
                // Integrações
                qdrantIntegration: true,
                ollamaIntegration: true,
                
                // Experimental
                autoCategorization: false,
                mlPipeline: false,
                advancedPatternDetection: false,
                
                // Performance
                lazyLoading: true,
                caching: true,
                compression: true,
                
                // Debug
                debugMode: false,
                verboseLogging: false
            };
            
            // Carrega flags salvas
            this.loadSavedFlags();
            
            // Callbacks de mudança
            this.changeCallbacks = new Map();
        }

        /**
         * Inicializa o manager
         */
        initialize() {
            Logger.info('FeatureFlagManager', 'Inicializado com flags', this.flags);
            
            // Expõe para debug
            if (this.flags.debugMode) {
                window.featureFlags = this.flags;
            }
        }

        /**
         * Verifica se uma feature está habilitada
         */
        isEnabled(flagName) {
            return this.flags[flagName] === true;
        }

        /**
         * Habilita uma feature
         */
        enable(flagName) {
            if (!(flagName in this.flags)) {
                Logger.warn('FeatureFlagManager', `Flag desconhecida: ${flagName}`);
                return false;
            }
            
            const wasEnabled = this.flags[flagName];
            this.flags[flagName] = true;
            
            if (!wasEnabled) {
                this.notifyChange(flagName, true);
                this.saveFlags();
                Logger.info('FeatureFlagManager', `Feature habilitada: ${flagName}`);
            }
            
            return true;
        }

        /**
         * Desabilita uma feature
         */
        disable(flagName) {
            if (!(flagName in this.flags)) {
                Logger.warn('FeatureFlagManager', `Flag desconhecida: ${flagName}`);
                return false;
            }
            
            const wasEnabled = this.flags[flagName];
            this.flags[flagName] = false;
            
            if (wasEnabled) {
                this.notifyChange(flagName, false);
                this.saveFlags();
                Logger.info('FeatureFlagManager', `Feature desabilitada: ${flagName}`);
            }
            
            return true;
        }

        /**
         * Alterna uma feature
         */
        toggle(flagName) {
            if (this.isEnabled(flagName)) {
                return this.disable(flagName);
            } else {
                return this.enable(flagName);
            }
        }

        /**
         * Define múltiplas flags
         */
        setFlags(flags) {
            Object.entries(flags).forEach(([key, value]) => {
                if (key in this.flags) {
                    this.flags[key] = value;
                    this.notifyChange(key, value);
                }
            });
            
            this.saveFlags();
            Logger.info('FeatureFlagManager', 'Flags atualizadas', flags);
        }

        /**
         * Obtém todas as flags
         */
        getAllFlags() {
            return { ...this.flags };
        }

        /**
         * Obtém flags por categoria
         */
        getFlagsByCategory(category) {
            const categories = {
                core: ['multiDimensionalAnalysis', 'evolutionQueue', 'semanticConvergence', 'hybridSearch'],
                extractors: ['pdfExtraction', 'docxExtraction', 'pstExtraction'],
                visualizations: ['queueProgressDashboard', 'convergenceDashboard', 'multiDimensionalScoresUI'],
                integrations: ['qdrantIntegration', 'ollamaIntegration'],
                experimental: ['autoCategorization', 'mlPipeline', 'advancedPatternDetection'],
                performance: ['lazyLoading', 'caching', 'compression'],
                debug: ['debugMode', 'verboseLogging']
            };
            
            const categoryFlags = categories[category] || [];
            const result = {};
            
            categoryFlags.forEach(flag => {
                result[flag] = this.flags[flag];
            });
            
            return result;
        }

        /**
         * Registra callback para mudança de flag
         */
        onChange(flagName, callback) {
            if (!this.changeCallbacks.has(flagName)) {
                this.changeCallbacks.set(flagName, []);
            }
            
            this.changeCallbacks.get(flagName).push(callback);
            
            return () => {
                const callbacks = this.changeCallbacks.get(flagName);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            };
        }

        /**
         * Notifica mudança de flag
         */
        notifyChange(flagName, value) {
            const callbacks = this.changeCallbacks.get(flagName) || [];
            callbacks.forEach(callback => {
                try {
                    callback(value, flagName);
                } catch (error) {
                    Logger.error('FeatureFlagManager', 'Erro em callback', error);
                }
            });
        }

        /**
         * Salva flags no localStorage
         */
        saveFlags() {
            try {
                localStorage.setItem('KC_feature_flags', JSON.stringify(this.flags));
            } catch (error) {
                Logger.warn('FeatureFlagManager', 'Erro ao salvar flags', error);
            }
        }

        /**
         * Carrega flags salvas
         */
        loadSavedFlags() {
            try {
                const saved = localStorage.getItem('KC_feature_flags');
                if (saved) {
                    const savedFlags = JSON.parse(saved);
                    Object.assign(this.flags, savedFlags);
                    Logger.info('FeatureFlagManager', 'Flags carregadas do localStorage');
                }
            } catch (error) {
                Logger.warn('FeatureFlagManager', 'Erro ao carregar flags', error);
            }
        }

        /**
         * Reseta para padrão
         */
        resetToDefaults() {
            this.flags = {
                multiDimensionalAnalysis: true,
                evolutionQueue: true,
                semanticConvergence: true,
                hybridSearch: true,
                pdfExtraction: false,
                docxExtraction: false,
                pstExtraction: false,
                queueProgressDashboard: true,
                convergenceDashboard: true,
                multiDimensionalScoresUI: true,
                qdrantIntegration: true,
                ollamaIntegration: true,
                autoCategorization: false,
                mlPipeline: false,
                advancedPatternDetection: false,
                lazyLoading: true,
                caching: true,
                compression: true,
                debugMode: false,
                verboseLogging: false
            };
            
            this.saveFlags();
            Logger.info('FeatureFlagManager', 'Flags resetadas para padrão');
        }

        /**
         * Exporta configuração
         */
        exportConfig() {
            return {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                flags: this.flags
            };
        }

        /**
         * Importa configuração
         */
        importConfig(config) {
            if (!config || !config.flags) {
                Logger.error('FeatureFlagManager', 'Configuração inválida');
                return false;
            }
            
            this.setFlags(config.flags);
            return true;
        }
    }

    // Exporta para o namespace KC
    KC.FeatureFlagManager = new FeatureFlagManager();
    KC.FeatureFlagManager.initialize();

    console.log('✅ FeatureFlagManager inicializado');

})(window); 