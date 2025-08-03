/**
 * ConfigManager.js - Gerenciador de Configurações
 * 
 * Gerencia todas as configurações do sistema usando AppState
 * Fornece interface para leitura/escrita de configurações
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    
    class ConfigManager {
        constructor() {
            this.initialized = false;
            this.defaults = {
                discovery: {
                    filePatterns: ['*.md', '*.txt', '*.docx', '*.pdf', '*.gdoc'],
                    directories: [],
                    dateMetric: 'created',
                    timeRange: 'all',
                    recursive: true,
                    excludePatterns: ['temp', 'cache', 'backup', '.git', 'node_modules']
                },
                preAnalysis: {
                    keywords: ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'],
                    relevanceThreshold: 50,
                    maxResults: 100,
                    sizeFilter: 'all',
                    previewEnabled: true
                },
                aiAnalysis: {
                    model: 'ollama',
                    provider: 'ollama',
                    tokenLimit: 8000,
                    customPrompt: '',
                    batchSize: 10,
                    autoAnalyze: false
                },
                organization: {
                    exportPath: '/Knowledge Consolidation',
                    structure: 'category',
                    autoCategories: true,
                    exportFormats: ['json', 'markdown']
                }
            };
        }

        /**
         * Inicializa o ConfigManager
         */
        initialize() {
            if (this.initialized) return;
            
            console.log('[ConfigManager] Inicializando...');
            
            // Verifica se há configurações salvas
            const savedConfig = KC.AppState.get('configuration');
            if (!savedConfig || Object.keys(savedConfig).length === 0) {
                // Se não há configurações, usa os defaults
                KC.AppState.set('configuration', this.defaults);
                console.log('[ConfigManager] Configurações padrão aplicadas');
            }
            
            this.initialized = true;
            console.log('[ConfigManager] Inicializado com sucesso');
        }

        /**
         * Obtém todas as configurações
         */
        getAll() {
            return KC.AppState.get('configuration') || this.defaults;
        }

        /**
         * Obtém configuração específica
         */
        get(section, key) {
            const config = this.getAll();
            
            if (!section) return config;
            if (!config[section]) return null;
            if (!key) return config[section];
            
            return config[section][key];
        }

        /**
         * Define configuração específica
         */
        set(section, key, value) {
            const config = this.getAll();
            
            if (!config[section]) {
                config[section] = {};
            }
            
            if (typeof key === 'object') {
                // Se key é um objeto, faz merge
                config[section] = { ...config[section], ...key };
            } else {
                config[section][key] = value;
            }
            
            KC.AppState.set('configuration', config);
            
            // Emite evento de mudança
            KC.EventBus.emit(KC.Events.CONFIG_CHANGED, {
                section,
                key,
                value,
                fullConfig: config
            });
            
            console.log(`[ConfigManager] Configuração atualizada: ${section}.${key}`, value);
        }

        /**
         * Reseta configurações para padrão
         */
        reset(section) {
            if (section) {
                const config = this.getAll();
                config[section] = this.defaults[section];
                KC.AppState.set('configuration', config);
            } else {
                KC.AppState.set('configuration', this.defaults);
            }
            
            KC.EventBus.emit(KC.Events.CONFIG_RESET, { section });
            console.log('[ConfigManager] Configurações resetadas', section || 'todas');
        }

        /**
         * Valida configurações
         */
        validate() {
            const config = this.getAll();
            const errors = [];
            
            // Valida discovery
            if (!config.discovery?.filePatterns?.length) {
                errors.push('Padrões de arquivo não definidos');
            }
            
            // Valida preAnalysis
            if (!config.preAnalysis?.keywords?.length) {
                errors.push('Palavras-chave não definidas');
            }
            
            if (config.preAnalysis?.relevanceThreshold < 0 || config.preAnalysis?.relevanceThreshold > 100) {
                errors.push('Threshold de relevância deve estar entre 0 e 100');
            }
            
            return {
                valid: errors.length === 0,
                errors
            };
        }

        /**
         * Exporta configurações
         */
        export() {
            const config = this.getAll();
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `kc-config-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            console.log('[ConfigManager] Configurações exportadas');
        }

        /**
         * Importa configurações
         */
        async import(file) {
            try {
                const text = await file.text();
                const config = JSON.parse(text);
                
                // Valida estrutura básica
                if (!config.discovery || !config.preAnalysis || !config.aiAnalysis || !config.organization) {
                    throw new Error('Arquivo de configuração inválido');
                }
                
                KC.AppState.set('configuration', config);
                KC.EventBus.emit(KC.Events.CONFIG_IMPORTED, { config });
                
                console.log('[ConfigManager] Configurações importadas com sucesso');
                return { success: true };
            } catch (error) {
                console.error('[ConfigManager] Erro ao importar configurações:', error);
                return { success: false, error: error.message };
            }
        }
    }

    // Registra no namespace
    KC.ConfigManager = new ConfigManager();

    // Expõe para debug
    window.kcconfig = {
        get: (section, key) => KC.ConfigManager.get(section, key),
        set: (section, key, value) => KC.ConfigManager.set(section, key, value),
        getAll: () => KC.ConfigManager.getAll(),
        reset: (section) => KC.ConfigManager.reset(section),
        export: () => KC.ConfigManager.export()
    };

})(window);