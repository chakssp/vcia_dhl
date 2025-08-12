/**
 * AIAPIManagerSecure.js - Versão segura do AIAPIManager
 * 
 * Implementa armazenamento criptografado de API keys
 * Usa SecureStorageManager para proteger dados sensíveis
 */

import SecureStorageManager from './SecureStorageManager.js';

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const logger = KC.Logger;

    class AIAPIManagerSecure {
        constructor() {
            // Copia a configuração original do AIAPIManager
            this.providers = {
                ollama: {
                    id: 'ollama',
                    name: 'Ollama (Local)',
                    baseUrl: 'http://127.0.0.1:11434',
                    isLocal: true,
                    requiresApiKey: false,
                    priority: 1,
                    models: ['nomic-embed-text', 'mistral', 'mixtral', 'phi', 'neural-chat'],
                    defaultModel: 'nomic-embed-text',
                    endpoints: {
                        generate: '/api/generate',
                        chat: '/api/chat',
                        models: '/api/tags'
                    }
                },
                openai: {
                    id: 'openai',
                    name: 'OpenAI GPT',
                    baseUrl: 'https://api.openai.com/v1',
                    isLocal: false,
                    requiresApiKey: true,
                    priority: 2,
                    models: ['gpt-4', 'gpt-3.5-turbo'],
                    defaultModel: 'gpt-3.5-turbo',
                    endpoints: {
                        chat: '/chat/completions'
                    }
                },
                gemini: {
                    id: 'gemini',
                    name: 'Google Gemini',
                    baseUrl: 'https://generativelanguage.googleapis.com/v1',
                    isLocal: false,
                    requiresApiKey: true,
                    priority: 3,
                    models: ['gemini-pro'],
                    defaultModel: 'gemini-pro',
                    endpoints: {
                        generate: '/models/gemini-pro:generateContent'
                    }
                }
            };

            this.activeProvider = 'ollama';
            this.apiKeys = {};
            this.secureStorageInitialized = false;
            this.queue = [];
            this.processing = false;
            this.rateLimits = {};
            
            this.init();
        }

        /**
         * Inicializa o manager com senha mestra
         * @param {string} masterPassword - Senha mestra para criptografia
         * @returns {Promise<boolean>} True se inicializado com sucesso
         */
        async initializeSecureStorage(masterPassword) {
            try {
                const initialized = await SecureStorageManager.initialize(masterPassword);
                if (initialized) {
                    this.secureStorageInitialized = true;
                    await this._loadSecureApiKeys();
                    logger.info('AIAPIManagerSecure', 'Armazenamento seguro inicializado');
                }
                return initialized;
            } catch (error) {
                logger.error('AIAPIManagerSecure', 'Erro ao inicializar armazenamento seguro', error);
                return false;
            }
        }

        /**
         * Verifica se o armazenamento seguro está ativo
         * @returns {boolean} True se ativo
         */
        isSecureStorageActive() {
            return this.secureStorageInitialized;
        }

        /**
         * Carrega API keys do armazenamento seguro
         */
        async _loadSecureApiKeys() {
            if (!this.secureStorageInitialized) {
                logger.warn('AIAPIManagerSecure', 'Tentativa de carregar keys sem inicialização');
                return;
            }

            try {
                const keys = await SecureStorageManager.getSecureItem('api_keys');
                this.apiKeys = keys || {};
                logger.info('AIAPIManagerSecure', 'API keys carregadas com segurança');
            } catch (error) {
                logger.error('AIAPIManagerSecure', 'Erro ao carregar API keys seguras', error);
                this.apiKeys = {};
            }
        }

        /**
         * Salva API keys no armazenamento seguro
         */
        async _saveSecureApiKeys() {
            if (!this.secureStorageInitialized) {
                logger.warn('AIAPIManagerSecure', 'Tentativa de salvar keys sem inicialização');
                return;
            }

            try {
                await SecureStorageManager.setSecureItem('api_keys', this.apiKeys);
                logger.info('AIAPIManagerSecure', 'API keys salvas com segurança');
            } catch (error) {
                logger.error('AIAPIManagerSecure', 'Erro ao salvar API keys seguras', error);
            }
        }

        /**
         * Define API key para um provider (versão segura)
         * @param {string} provider - ID do provider
         * @param {string} apiKey - API key
         * @returns {Promise<boolean>} True se salvo com sucesso
         */
        async setApiKey(provider, apiKey) {
            if (!this.providers[provider]) {
                throw new Error(`Provider desconhecido: ${provider}`);
            }

            if (!this.secureStorageInitialized) {
                logger.warn('AIAPIManagerSecure', 'Armazenamento seguro não inicializado. Use initializeSecureStorage primeiro.');
                return false;
            }

            this.apiKeys[provider] = apiKey;
            await this._saveSecureApiKeys();
            logger.info('AIAPIManagerSecure', `API key definida com segurança para ${provider}`);
            return true;
        }

        /**
         * Remove API key de um provider
         * @param {string} provider - ID do provider
         * @returns {Promise<boolean>} True se removido com sucesso
         */
        async removeApiKey(provider) {
            if (!this.providers[provider]) {
                throw new Error(`Provider desconhecido: ${provider}`);
            }

            delete this.apiKeys[provider];
            await this._saveSecureApiKeys();
            logger.info('AIAPIManagerSecure', `API key removida para ${provider}`);
            return true;
        }

        /**
         * Exporta configurações (sem API keys)
         * @returns {Object} Configurações exportadas
         */
        exportConfig() {
            return {
                activeProvider: this.activeProvider,
                providers: Object.keys(this.providers).reduce((acc, key) => {
                    acc[key] = {
                        ...this.providers[key],
                        hasApiKey: !!this.apiKeys[key]
                    };
                    return acc;
                }, {}),
                exportDate: new Date().toISOString()
            };
        }

        /**
         * Inicialização básica (mantém compatibilidade)
         */
        init() {
            logger.info('AIAPIManagerSecure', 'Inicializando versão segura do AIAPIManager');
            
            // Detecta Ollama automaticamente
            this.checkOllamaAvailability().then(available => {
                if (available) {
                    logger.info('AIAPIManagerSecure', 'Ollama detectado localmente');
                }
            });
        }

        /**
         * Verifica disponibilidade do Ollama
         */
        async checkOllamaAvailability() {
            try {
                const response = await fetch(`${this.providers.ollama.baseUrl}/api/tags`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.providers.ollama.models = data.models?.map(m => m.name) || [];
                    return true;
                }
                return false;
            } catch (error) {
                logger.warn('AIAPIManagerSecure', 'Ollama não disponível:', error.message);
                return false;
            }
        }

        // Métodos mantidos para compatibilidade...
        getProviders() {
            return Object.values(this.providers).map(p => ({
                ...p,
                hasApiKey: !!this.apiKeys[p.id]
            }));
        }

        setActiveProvider(provider) {
            if (!this.providers[provider]) {
                throw new Error(`Provider desconhecido: ${provider}`);
            }
            this.activeProvider = provider;
            logger.info('AIAPIManagerSecure', `Provider ativo alterado para: ${provider}`);
        }

        getActiveProvider() {
            return this.providers[this.activeProvider];
        }
    }

    // Registra no namespace global
    KC.AIAPIManagerSecure = new AIAPIManagerSecure();

})(window);