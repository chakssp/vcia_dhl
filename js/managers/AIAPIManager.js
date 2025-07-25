/**
 * AIAPIManager.js - Gerenciador de APIs de LLMs
 * 
 * Responsável por integrar com diferentes provedores de IA (Ollama, OpenAI, Gemini)
 * Prioridade: Ollama (local) > Cloud providers
 * 
 * @requires AnalysisTypesManager
 * @requires Logger
 * @requires EventBus
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const logger = KC.Logger;

    class AIAPIManager {
        constructor() {
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
                    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                    isLocal: false,
                    requiresApiKey: true,
                    priority: 3,
                    models: ['gemini-pro'],
                    defaultModel: 'gemini-pro',
                    endpoints: {
                        generate: '/models/{model}:generateContent'
                    }
                },
                anthropic: {
                    id: 'anthropic',
                    name: 'Anthropic Claude',
                    baseUrl: 'https://api.anthropic.com/v1',
                    isLocal: false,
                    requiresApiKey: true,
                    priority: 4,
                    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                    defaultModel: 'claude-3-sonnet-20240229',
                    endpoints: {
                        messages: '/messages'
                    }
                }
            };

            this.activeProvider = 'ollama'; // Prioridade para local (Lei 1.54)
            this.apiKeys = this._loadApiKeys();
            this.timeout = 30000; // 30 segundos
            
            // Rate limiting
            this.rateLimits = {
                ollama: { requestsPerMinute: 60, concurrent: 5 },
                openai: { requestsPerMinute: 20, concurrent: 3 },
                gemini: { requestsPerMinute: 15, concurrent: 3 },
                anthropic: { requestsPerMinute: 10, concurrent: 2 }
            };
            
            this.requestQueues = {};
            this.requestTimestamps = {};
            
            // Inicializa estruturas de rate limiting para cada provider
            Object.keys(this.providers).forEach(providerId => {
                this.requestQueues[providerId] = [];
                this.requestTimestamps[providerId] = [];
            });
            
            logger.info('AIAPIManager', 'Inicializado com provider padrão: Ollama');
        }

        /**
         * Carrega API keys do localStorage
         */
        _loadApiKeys() {
            try {
                const keys = localStorage.getItem('kc_api_keys');
                return keys ? JSON.parse(keys) : {};
            } catch (error) {
                logger.error('AIAPIManager', 'Erro ao carregar API keys', error);
                return {};
            }
        }

        /**
         * Salva API keys no localStorage
         */
        _saveApiKeys() {
            try {
                localStorage.setItem('kc_api_keys', JSON.stringify(this.apiKeys));
            } catch (error) {
                logger.error('AIAPIManager', 'Erro ao salvar API keys', error);
            }
        }

        /**
         * Define API key para um provider
         */
        setApiKey(provider, apiKey) {
            if (!this.providers[provider]) {
                throw new Error(`Provider desconhecido: ${provider}`);
            }

            this.apiKeys[provider] = apiKey;
            this._saveApiKeys();
            logger.info('AIAPIManager', `API key definida para ${provider}`);
        }

        /**
         * Define o provider ativo
         */
        setActiveProvider(provider) {
            if (!this.providers[provider]) {
                throw new Error(`Provider desconhecido: ${provider}`);
            }

            this.activeProvider = provider;
            logger.info('AIAPIManager', `Provider ativo alterado para: ${provider}`);
        }

        /**
         * Verifica se o Ollama está disponível localmente
         */
        async checkOllamaAvailability() {
            try {
                const response = await fetch(this.providers.ollama.baseUrl + this.providers.ollama.endpoints.models, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000) // 5 segundos para verificação
                });

                if (response.ok) {
                    const data = await response.json();
                    logger.info('AIAPIManager', 'Ollama disponível com modelos:', data.models?.map(m => m.name));
                    return true;
                }
                return false;
            } catch (error) {
                logger.info('AIAPIManager', 'Ollama não disponível localmente:', error.message);
                return false;
            }
        }

        /**
         * Analisa um arquivo usando o provider ativo
         * @param {Object} file - Arquivo a ser analisado
         * @param {Object} options - Opções de análise
         * @returns {Promise<Object>} Resultado da análise
         */
        async analyze(file, options = {}) {
            const provider = this.providers[this.activeProvider];
            
            // Verifica se precisa de API key
            if (provider.requiresApiKey && !this.apiKeys[provider.id]) {
                throw new Error(`API key necessária para ${provider.name}`);
            }

            // Prepara o prompt usando os tipos definidos
            const prompt = this._preparePrompt(file, options);

            try {
                // Verifica rate limit antes de fazer a requisição
                await this._checkRateLimit(provider.id);
                
                logger.flow('AIAPIManager', 'analyze', {
                    provider: provider.id,
                    model: options.model || provider.defaultModel,
                    fileId: file.id
                });

                // Cria promise para a chamada da API
                const apiCallPromise = (async () => {
                    // Chama o provider apropriado
                    let rawResponse;
                switch (provider.id) {
                    case 'ollama':
                        rawResponse = await this._callOllama(prompt, options);
                        break;
                    case 'openai':
                        rawResponse = await this._callOpenAI(prompt, options);
                        break;
                    case 'gemini':
                        rawResponse = await this._callGemini(prompt, options);
                        break;
                    case 'anthropic':
                        rawResponse = await this._callAnthropic(prompt, options);
                        break;
                    default:
                        throw new Error(`Provider não implementado: ${provider.id}`);
                }
                    
                    return rawResponse;
                })();
                
                // Registra a requisição para controle de concorrência
                this._trackRequest(provider.id, apiCallPromise);
                
                // Aguarda a resposta
                const rawResponse = await apiCallPromise;

                // Normaliza a resposta
                const analysis = this._normalizeResponse(rawResponse, provider.id);

                // Enriquece com detecção de tipo existente
                analysis.type = KC.AnalysisTypesManager.detectType(file);
                analysis.relevanceBoost = KC.AnalysisTypesManager.getRelevanceBoost(analysis.type);

                logger.info('AIAPIManager', 'Análise concluída', {
                    fileId: file.id,
                    type: analysis.type,
                    boost: analysis.relevanceBoost
                });

                return analysis;

            } catch (error) {
                logger.error('AIAPIManager', `Erro na análise com ${provider.id}`, error);
                
                // Se Ollama falhar, tenta próximo provider disponível
                if (provider.id === 'ollama' && options.fallback !== false) {
                    logger.info('AIAPIManager', 'Tentando fallback para provider cloud');
                    return this._fallbackToCloudProvider(file, options);
                }

                throw error;
            }
        }

        /**
         * Verifica se pode fazer requisição respeitando rate limits
         */
        async _checkRateLimit(providerId) {
            const limits = this.rateLimits[providerId];
            const now = Date.now();
            
            // Remove timestamps antigos (mais de 1 minuto)
            this.requestTimestamps[providerId] = this.requestTimestamps[providerId]
                .filter(timestamp => now - timestamp < 60000);
            
            // Verifica limite de requisições por minuto
            if (this.requestTimestamps[providerId].length >= limits.requestsPerMinute) {
                const oldestTimestamp = this.requestTimestamps[providerId][0];
                const waitTime = 60000 - (now - oldestTimestamp);
                
                logger.warn('AIAPIManager', `Rate limit atingido para ${providerId}. Aguardando ${waitTime}ms`);
                await this.delay(waitTime);
                
                // Remove o timestamp mais antigo após esperar
                this.requestTimestamps[providerId].shift();
            }
            
            // Verifica limite de requisições concorrentes
            const activeRequests = this.requestQueues[providerId].length;
            if (activeRequests >= limits.concurrent) {
                logger.warn('AIAPIManager', `Limite de requisições concorrentes atingido para ${providerId}`);
                
                // Aguarda alguma requisição terminar
                await Promise.race(this.requestQueues[providerId]);
            }
            
            // Registra nova requisição
            this.requestTimestamps[providerId].push(now);
        }
        
        /**
         * Registra requisição ativa
         */
        _trackRequest(providerId, promise) {
            this.requestQueues[providerId].push(promise);
            
            // Remove da fila quando completar
            promise.finally(() => {
                const index = this.requestQueues[providerId].indexOf(promise);
                if (index > -1) {
                    this.requestQueues[providerId].splice(index, 1);
                }
            });
        }
        
        /**
         * Delay assíncrono
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Prepara o prompt para análise
         */
        _preparePrompt(file, options) {
            const template = options.template || 'decisiveMoments';
            
            // Usa PromptManager para obter o prompt base
            const basePrompt = KC.PromptManager?.getPrompt(template, file, {
                additionalContext: options.context || ''
            }) || this._getFallbackPrompt(file);

            // Adapta prompt para Ollama se necessário
            if (this.activeProvider === 'ollama' && KC.PromptManager) {
                const adaptedPrompt = KC.PromptManager.adaptPromptForTextResponse(
                    basePrompt,
                    this.activeProvider
                );
                return adaptedPrompt;
            }

            return basePrompt;
        }

        /**
         * Prompt de fallback caso PromptManager não esteja disponível
         */
        _getFallbackPrompt(file) {
            const typesDescription = KC.AnalysisTypesManager?.getPromptDescription() || '';
            
            const systemPrompt = `Você é um analista especializado em identificar momentos decisivos e insights em bases de conhecimento pessoal.

Analise o conteúdo fornecido e identifique:

1. TIPO DE ANÁLISE (escolha apenas UM dos seguintes):
${typesDescription}

2. MOMENTOS DECISIVOS: Identifique 2-3 momentos chave no conteúdo

3. CATEGORIAS SUGERIDAS: Sugira 1-3 categorias relevantes

4. RESUMO: Um parágrafo conciso sobre o valor do conteúdo

Responda SEMPRE em formato JSON estruturado.`;

            const userPrompt = `Analise o seguinte conteúdo:

Arquivo: ${file.name}
Preview: ${file.preview || file.content?.substring(0, 500)}

Forneça sua análise em formato JSON com a estrutura:
{
    "analysisType": "Nome do tipo (use exatamente um dos 5 tipos listados)",
    "moments": ["momento 1", "momento 2"],
    "categories": ["categoria1", "categoria2"],
    "summary": "resumo do conteúdo",
    "relevanceScore": 0.7
}`;

            return {
                system: systemPrompt,
                user: userPrompt
            };
        }

        /**
         * Chama API do Ollama
         */
        async _callOllama(prompt, options) {
            const provider = this.providers.ollama;
            const model = options.model || provider.defaultModel;

            // ORIGINAL - Preservado para rollback
            // const response = await fetch(provider.baseUrl + provider.endpoints.generate, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({
            //         model: model,
            //         prompt: `${prompt.system}\n\n${prompt.user}`,
            //         stream: false,
            //         format: 'json',  // ⚠️ Causava resposta vazia
            //         options: {
            //             temperature: options.temperature || 0.7,
            //             top_p: 0.9,
            //             num_predict: 1000
            //         }
            //     }),
            //     signal: AbortSignal.timeout(this.timeout)
            // });

            // CORREÇÃO BUG #6: Remover format: 'json' e adicionar parâmetros adequados
            const response = await fetch(provider.baseUrl + provider.endpoints.generate, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    prompt: `${prompt.system}\n\n${prompt.user}`,
                    stream: false,
                    // format: 'json' removido - causava resposta vazia
                    options: {
                        temperature: options.temperature || 0.7,
                        num_predict: 1000,     // Forçar geração mínima
                        num_ctx: 4096,         // Contexto adequado
                        top_k: 40,
                        top_p: 0.9,
                        repeat_penalty: 1.1,
                        stop: ["</analysis>", "\n\n\n"]  // Stop sequences
                    }
                }),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                throw new Error(`Ollama erro: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Validar resposta
            if (!data.response || data.response.trim() === '{}' || data.response.trim() === '') {
                KC.Logger?.warning('AIAPIManager - Resposta vazia do Ollama', {
                    model: model,
                    eval_count: data.eval_count,
                    total_duration: data.total_duration
                });
                throw new Error('Resposta vazia do Ollama - verificar modelo e parâmetros');
            }
            
            return data.response;
        }

        /**
         * Chama API do OpenAI
         */
        async _callOpenAI(prompt, options) {
            const provider = this.providers.openai;
            const model = options.model || provider.defaultModel;
            const apiKey = this.apiKeys.openai;

            if (!apiKey) {
                throw new Error('API key do OpenAI não configurada');
            }

            const response = await fetch(provider.baseUrl + provider.endpoints.chat, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: prompt.system },
                        { role: 'user', content: prompt.user }
                    ],
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 1000,
                    response_format: { type: 'json_object' }
                }),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI erro ${response.status}: ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        }

        /**
         * Chama API do Gemini
         */
        async _callGemini(prompt, options) {
            const provider = this.providers.gemini;
            const model = options.model || provider.defaultModel;
            const apiKey = this.apiKeys.gemini;

            if (!apiKey) {
                throw new Error('API key do Gemini não configurada');
            }

            // Constrói URL com modelo
            const url = provider.baseUrl + provider.endpoints.generate.replace('{model}', model);

            const response = await fetch(`${url}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${prompt.system}\n\n${prompt.user}`
                        }]
                    }],
                    generationConfig: {
                        temperature: options.temperature || 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: options.maxTokens || 1000,
                        responseMimeType: 'application/json'
                    }
                }),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini erro ${response.status}: ${error}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }

        /**
         * Chama API do Anthropic Claude
         */
        async _callAnthropic(prompt, options) {
            const provider = this.providers.anthropic;
            const model = options.model || provider.defaultModel;
            const apiKey = this.apiKeys.anthropic;

            if (!apiKey) {
                throw new Error('API key do Anthropic não configurada');
            }

            const response = await fetch(provider.baseUrl + provider.endpoints.messages, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: options.maxTokens || 1000,
                    temperature: options.temperature || 0.7,
                    system: prompt.system,
                    messages: [
                        { role: 'user', content: prompt.user }
                    ]
                }),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Anthropic erro ${response.status}: ${error}`);
            }

            const data = await response.json();
            return data.content[0].text;
        }

        /**
         * Normaliza resposta do provider para formato padrão
         */
        _normalizeResponse(rawResponse, providerId) {
            try {
                // Tenta parsear JSON da resposta
                let parsed;
                if (typeof rawResponse === 'string') {
                    // Remove possíveis caracteres extras e tenta parsear
                    const cleaned = rawResponse.trim()
                        .replace(/^```json\s*/, '')
                        .replace(/\s*```$/, '');
                    parsed = JSON.parse(cleaned);
                } else {
                    parsed = rawResponse;
                }

                // Valida e normaliza campos
                const validTypes = KC.AnalysisTypesManager.getTypeNames();
                const analysisType = validTypes.includes(parsed.analysisType) 
                    ? parsed.analysisType 
                    : 'Aprendizado Geral';

                return {
                    analysisType: analysisType,
                    moments: Array.isArray(parsed.moments) ? parsed.moments : [],
                    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
                    summary: parsed.summary || 'Análise não disponível',
                    relevanceScore: typeof parsed.relevanceScore === 'number' 
                        ? Math.min(1, Math.max(0, parsed.relevanceScore)) 
                        : 0.5,
                    provider: providerId,
                    timestamp: new Date().toISOString()
                };

            } catch (error) {
                logger.error('AIAPIManager', 'Erro ao normalizar resposta', error);
                
                // Retorna análise padrão em caso de erro
                return {
                    analysisType: 'Aprendizado Geral',
                    moments: [],
                    categories: [],
                    summary: 'Erro ao processar análise',
                    relevanceScore: 0.5,
                    provider: providerId,
                    timestamp: new Date().toISOString(),
                    error: error.message
                };
            }
        }

        /**
         * Tenta usar provider cloud como fallback
         */
        async _fallbackToCloudProvider(file, options) {
            // Tenta OpenAI primeiro, depois Gemini, depois Anthropic
            const cloudProviders = ['openai', 'gemini', 'anthropic'];
            
            for (const providerId of cloudProviders) {
                if (this.apiKeys[providerId]) {
                    const originalProvider = this.activeProvider;
                    try {
                        this.activeProvider = providerId;
                        const result = await this.analyze(file, { ...options, fallback: false });
                        this.activeProvider = originalProvider; // Restaura provider original
                        return result;
                    } catch (error) {
                        logger.warn('AIAPIManager', `Fallback ${providerId} falhou`, error.message);
                        this.activeProvider = originalProvider;
                    }
                }
            }

            throw new Error('Nenhum provider disponível para análise');
        }

        /**
         * Obtém lista de modelos disponíveis para o provider ativo
         */
        async getAvailableModels() {
            const provider = this.providers[this.activeProvider];
            
            if (provider.id === 'ollama') {
                try {
                    const response = await fetch(provider.baseUrl + provider.endpoints.models);
                    if (response.ok) {
                        const data = await response.json();
                        return data.models?.map(m => m.name) || provider.models;
                    }
                } catch (error) {
                    logger.warn('AIAPIManager', 'Erro ao buscar modelos do Ollama', error);
                }
            }

            return provider.models;
        }

        /**
         * Obtém informações do provider ativo
         */
        getActiveProviderInfo() {
            const provider = this.providers[this.activeProvider];
            return {
                id: provider.id,
                name: provider.name,
                isLocal: provider.isLocal,
                requiresApiKey: provider.requiresApiKey,
                hasApiKey: provider.requiresApiKey ? !!this.apiKeys[provider.id] : true,
                models: provider.models,
                defaultModel: provider.defaultModel
            };
        }

        /**
         * Lista todos os providers disponíveis
         */
        getProviders() {
            return Object.values(this.providers)
                .sort((a, b) => a.priority - b.priority)
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    isLocal: p.isLocal,
                    requiresApiKey: p.requiresApiKey,
                    hasApiKey: p.requiresApiKey ? !!this.apiKeys[p.id] : true,
                    isActive: p.id === this.activeProvider
                }));
        }
    }

    // Registra no namespace global
    KC.AIAPIManager = new AIAPIManager();
    logger.info('AIAPIManager', 'Componente registrado com sucesso');

})(window);