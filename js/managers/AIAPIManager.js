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
                    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
                    defaultModel: 'gpt-4o-mini',
                    endpoints: {
                        chat: '/chat/completions',
                        models: '/models'
                    },
                    pricing: {
                        'gpt-4o': { input: 0.005, output: 0.015 },
                        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
                        'gpt-4-turbo': { input: 0.01, output: 0.03 },
                        'gpt-4': { input: 0.03, output: 0.06 },
                        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
                    },
                    maxTokens: {
                        'gpt-4o': 128000,
                        'gpt-4o-mini': 128000,
                        'gpt-4-turbo': 128000,
                        'gpt-4': 8192,
                        'gpt-3.5-turbo': 16384
                    },
                    supportsStreaming: true,
                    supportsJsonMode: true
                },
                gemini: {
                    id: 'gemini',
                    name: 'Google Gemini',
                    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                    isLocal: false,
                    requiresApiKey: true,
                    priority: 3,
                    models: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision'],
                    defaultModel: 'gemini-1.5-flash',
                    endpoints: {
                        generate: '/models/{model}:generateContent',
                        stream: '/models/{model}:streamGenerateContent',
                        models: '/models'
                    },
                    pricing: {
                        'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 },
                        'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
                        'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
                        'gemini-pro-vision': { input: 0.00025, output: 0.0005 }
                    },
                    maxTokens: {
                        'gemini-2.0-flash-exp': 1048576,
                        'gemini-1.5-flash': 1048576,
                        'gemini-1.5-pro': 2097152,
                        'gemini-pro-vision': 16384
                    },
                    supportsStreaming: true,
                    supportsMultiModal: true,
                    supportsJsonMode: true,
                    safetySettings: {
                        'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
                        'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
                        'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
                        'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE'
                    }
                },
                anthropic: {
                    id: 'anthropic',
                    name: 'Anthropic Claude',
                    baseUrl: 'https://api.anthropic.com/v1',
                    isLocal: false,
                    requiresApiKey: true,
                    priority: 4,
                    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                    defaultModel: 'claude-3-5-sonnet-20241022',
                    endpoints: {
                        messages: '/messages',
                        stream: '/messages'
                    },
                    pricing: {
                        'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
                        'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
                        'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
                        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
                        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
                    },
                    maxTokens: {
                        'claude-3-5-sonnet-20241022': 200000,
                        'claude-3-5-haiku-20241022': 200000,
                        'claude-3-opus-20240229': 200000,
                        'claude-3-sonnet-20240229': 200000,
                        'claude-3-haiku-20240307': 200000
                    },
                    supportsStreaming: true,
                    supportsJsonMode: false,
                    apiVersion: '2023-06-01',
                    constitutionalAI: true
                }
            };

            this.activeProvider = 'ollama'; // Prioridade para local (Lei 1.54)
            this.apiKeys = this._loadApiKeys();
            this.timeout = 30000; // 30 segundos
            
            // Rate limiting
            this.rateLimits = {
                ollama: { requestsPerMinute: 60, concurrent: 5 },
                openai: { requestsPerMinute: 3500, concurrent: 10 }, // Tier 1
                gemini: { requestsPerMinute: 1500, concurrent: 5 },  // Free tier
                anthropic: { requestsPerMinute: 1000, concurrent: 3 } // Tier 1
            };
            
            // Token usage tracking
            this.tokenUsage = {
                ollama: { totalTokens: 0, cost: 0 },
                openai: { inputTokens: 0, outputTokens: 0, cost: 0 },
                gemini: { inputTokens: 0, outputTokens: 0, cost: 0 },
                anthropic: { inputTokens: 0, outputTokens: 0, cost: 0 }
            };
            
            // Response cache
            this.responseCache = new Map();
            this.cacheMaxSize = 100;
            this.cacheTTL = 3600000; // 1 hora
            
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
            
            // DEBUG: Log do prompt enviado
            console.log('📤 Prompt enviado ao Ollama:', prompt);

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
         * Chama API do OpenAI com suporte a streaming e tracking de tokens
         */
        async _callOpenAI(prompt, options) {
            const provider = this.providers.openai;
            const model = options.model || provider.defaultModel;
            const apiKey = this.apiKeys.openai;

            if (!apiKey) {
                throw new Error('API key do OpenAI não configurada');
            }

            // Verifica cache
            const cacheKey = this._generateCacheKey('openai', model, prompt, options);
            const cached = this._getFromCache(cacheKey);
            if (cached && !options.noCache) {
                logger.info('AIAPIManager', 'Usando resposta do cache', { provider: 'openai' });
                return cached;
            }

            const requestBody = {
                model: model,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user }
                ],
                temperature: options.temperature || 0.7,
                max_tokens: Math.min(options.maxTokens || 2000, provider.maxTokens[model] || 4000),
                top_p: options.topP || 1,
                frequency_penalty: options.frequencyPenalty || 0,
                presence_penalty: options.presencePenalty || 0,
                stream: options.stream || false
            };

            // Adiciona JSON mode se suportado
            if (provider.supportsJsonMode && options.jsonMode !== false) {
                requestBody.response_format = { type: 'json_object' };
            }

            // Adiciona seed para reproducibilidade
            if (options.seed) {
                requestBody.seed = options.seed;
            }

            const response = await fetch(provider.baseUrl + provider.endpoints.chat, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'User-Agent': 'KnowledgeConsolidator/1.0'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: { message: errorText } };
                }
                
                throw new Error(`OpenAI API Error [${response.status}]: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            // Tracking de tokens e custo
            if (data.usage) {
                this._trackTokenUsage('openai', model, data.usage);
            }

            const content = data.choices[0].message.content;
            
            // Armazena no cache
            this._setCache(cacheKey, content);
            
            return content;
        }

        /**
         * Chama API do Gemini com suporte a multi-modal e safety settings
         */
        async _callGemini(prompt, options) {
            const provider = this.providers.gemini;
            const model = options.model || provider.defaultModel;
            const apiKey = this.apiKeys.gemini;

            if (!apiKey) {
                throw new Error('API key do Gemini não configurada');
            }

            // Verifica cache
            const cacheKey = this._generateCacheKey('gemini', model, prompt, options);
            const cached = this._getFromCache(cacheKey);
            if (cached && !options.noCache) {
                logger.info('AIAPIManager', 'Usando resposta do cache', { provider: 'gemini' });
                return cached;
            }

            // Constrói URL com modelo
            const endpoint = options.stream ? provider.endpoints.stream : provider.endpoints.generate;
            const url = provider.baseUrl + endpoint.replace('{model}', model);

            // Prepara conteúdo multi-modal
            const parts = [{ text: `${prompt.system}\n\n${prompt.user}` }];
            
            // Adiciona imagens se fornecidas
            if (options.images && Array.isArray(options.images)) {
                options.images.forEach(image => {
                    parts.push({
                        inline_data: {
                            mime_type: image.mimeType || 'image/jpeg',
                            data: image.data
                        }
                    });
                });
            }

            const requestBody = {
                contents: [{ parts }],
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    topK: options.topK || 40,
                    topP: options.topP || 0.95,
                    maxOutputTokens: Math.min(
                        options.maxTokens || 2000, 
                        provider.maxTokens[model] || 2048
                    ),
                    candidateCount: 1
                },
                safetySettings: Object.entries(provider.safetySettings).map(
                    ([category, threshold]) => ({ category, threshold })
                )
            };

            // Adiciona JSON mode se solicitado
            if (provider.supportsJsonMode && options.jsonMode !== false) {
                requestBody.generationConfig.responseMimeType = 'application/json';
            }

            const response = await fetch(`${url}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'KnowledgeConsolidator/1.0'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: { message: errorText } };
                }
                
                throw new Error(`Gemini API Error [${response.status}]: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            // Verifica se a resposta foi bloqueada por safety
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('Resposta bloqueada por filtros de segurança do Gemini');
            }

            const candidate = data.candidates[0];
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Conteúdo bloqueado por políticas de segurança do Gemini');
            }

            // Tracking de tokens
            if (data.usageMetadata) {
                this._trackTokenUsage('gemini', model, {
                    prompt_tokens: data.usageMetadata.promptTokenCount,
                    completion_tokens: data.usageMetadata.candidatesTokenCount,
                    total_tokens: data.usageMetadata.totalTokenCount
                });
            }

            const content = candidate.content.parts[0].text;
            
            // Armazena no cache
            this._setCache(cacheKey, content);
            
            return content;
        }

        /**
         * Chama API do Anthropic Claude com Constitutional AI
         */
        async _callAnthropic(prompt, options) {
            const provider = this.providers.anthropic;
            const model = options.model || provider.defaultModel;
            const apiKey = this.apiKeys.anthropic;

            if (!apiKey) {
                throw new Error('API key do Anthropic não configurada');
            }

            // Verifica cache
            const cacheKey = this._generateCacheKey('anthropic', model, prompt, options);
            const cached = this._getFromCache(cacheKey);
            if (cached && !options.noCache) {
                logger.info('AIAPIManager', 'Usando resposta do cache', { provider: 'anthropic' });
                return cached;
            }

            // Prepara mensagens
            const messages = [{ role: 'user', content: prompt.user }];
            
            // Adiciona conversação anterior se fornecida
            if (options.conversation && Array.isArray(options.conversation)) {
                messages.unshift(...options.conversation);
            }

            const requestBody = {
                model: model,
                max_tokens: Math.min(
                    options.maxTokens || 4000, 
                    provider.maxTokens[model] || 4000
                ),
                temperature: options.temperature || 0.7,
                top_p: options.topP || 1,
                top_k: options.topK || 5,
                system: prompt.system,
                messages: messages,
                stream: options.stream || false
            };

            // Adiciona stop sequences se fornecidas
            if (options.stopSequences && Array.isArray(options.stopSequences)) {
                requestBody.stop_sequences = options.stopSequences;
            }

            // Configurações específicas para Constitutional AI
            if (provider.constitutionalAI && options.constitutional !== false) {
                // Adiciona princípios constitucionais ao system prompt
                requestBody.system += `\n\nPlease follow these constitutional principles:
1. Be helpful, harmless, and honest
2. Avoid harmful, illegal, or unethical content
3. Respect human autonomy and dignity
4. Provide balanced, nuanced perspectives`;
            }

            const response = await fetch(provider.baseUrl + provider.endpoints.messages, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': provider.apiVersion,
                    'User-Agent': 'KnowledgeConsolidator/1.0'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: { message: errorText } };
                }
                
                throw new Error(`Anthropic API Error [${response.status}]: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            // Verifica se houve stop reason problemático
            if (data.stop_reason && data.stop_reason !== 'end_turn' && data.stop_reason !== 'stop_sequence') {
                logger.warn('AIAPIManager', `Claude parou por: ${data.stop_reason}`);
            }

            // Tracking de tokens
            if (data.usage) {
                this._trackTokenUsage('anthropic', model, {
                    prompt_tokens: data.usage.input_tokens,
                    completion_tokens: data.usage.output_tokens,
                    total_tokens: data.usage.input_tokens + data.usage.output_tokens
                });
            }

            const content = data.content[0].text;
            
            // Armazena no cache
            this._setCache(cacheKey, content);
            
            return content;
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
         * Tenta usar provider cloud como fallback com estratégia inteligente
         */
        async _fallbackToCloudProvider(file, options) {
            // Ordena providers por prioridade e disponibilidade
            const cloudProviders = ['openai', 'gemini', 'anthropic']
                .filter(id => this.apiKeys[id])
                .sort((a, b) => {
                    const aProvider = this.providers[a];
                    const bProvider = this.providers[b];
                    return aProvider.priority - bProvider.priority;
                });
            
            if (cloudProviders.length === 0) {
                throw new Error('Nenhum provider cloud configurado para fallback');
            }
            
            const errors = [];
            const originalProvider = this.activeProvider;
            
            for (const providerId of cloudProviders) {
                try {
                    logger.info('AIAPIManager', `Tentando fallback para ${providerId}`);
                    
                    this.activeProvider = providerId;
                    const result = await this.analyze(file, { ...options, fallback: false });
                    
                    // Adiciona informação sobre fallback no resultado
                    result.usedFallback = true;
                    result.originalProvider = originalProvider;
                    result.fallbackProvider = providerId;
                    
                    this.activeProvider = originalProvider;
                    return result;
                    
                } catch (error) {
                    errors.push({ provider: providerId, error: error.message });
                    logger.warn('AIAPIManager', `Fallback ${providerId} falhou`, error.message);
                    this.activeProvider = originalProvider;
                }
            }

            throw new Error(`Todos os providers falharam. Erros: ${JSON.stringify(errors)}`);
        }
        
        /**
         * Verifica saúde dos providers
         */
        async checkProvidersHealth() {
            const healthStatus = {};
            
            for (const [providerId, provider] of Object.entries(this.providers)) {
                healthStatus[providerId] = {
                    id: providerId,
                    name: provider.name,
                    isLocal: provider.isLocal,
                    requiresApiKey: provider.requiresApiKey,
                    hasApiKey: provider.requiresApiKey ? !!this.apiKeys[providerId] : true,
                    status: 'unknown',
                    latency: null,
                    error: null
                };
                
                try {
                    const startTime = Date.now();
                    
                    if (providerId === 'ollama') {
                        const available = await this.checkOllamaAvailability();
                        healthStatus[providerId].status = available ? 'healthy' : 'unavailable';
                    } else if (this.apiKeys[providerId]) {
                        // Para providers cloud, tenta uma requisição de teste simples
                        const testPrompt = {
                            system: 'You are a helpful assistant.',
                            user: 'Say "test" if you can read this.'
                        };
                        
                        const originalProvider = this.activeProvider;
                        this.activeProvider = providerId;
                        
                        try {
                            await this._callProvider(testPrompt, { maxTokens: 10, timeout: 5000 });
                            healthStatus[providerId].status = 'healthy';
                        } finally {
                            this.activeProvider = originalProvider;
                        }
                    } else {
                        healthStatus[providerId].status = 'no_api_key';
                    }
                    
                    healthStatus[providerId].latency = Date.now() - startTime;
                    
                } catch (error) {
                    healthStatus[providerId].status = 'error';
                    healthStatus[providerId].error = error.message;
                }
            }
            
            return healthStatus;
        }
        
        /**
         * Chama provider específico baseado no ID
         */
        async _callProvider(prompt, options) {
            const provider = this.providers[this.activeProvider];
            
            switch (provider.id) {
                case 'ollama':
                    return await this._callOllama(prompt, options);
                case 'openai':
                    return await this._callOpenAI(prompt, options);
                case 'gemini':
                    return await this._callGemini(prompt, options);
                case 'anthropic':
                    return await this._callAnthropic(prompt, options);
                default:
                    throw new Error(`Provider não implementado: ${provider.id}`);
            }
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
                    isActive: p.id === this.activeProvider,
                    supportsStreaming: p.supportsStreaming || false,
                    supportsJsonMode: p.supportsJsonMode || false,
                    supportsMultiModal: p.supportsMultiModal || false,
                    models: p.models,
                    defaultModel: p.defaultModel
                }));
        }
        
        /**
         * Gera chave de cache para requisição
         */
        _generateCacheKey(provider, model, prompt, options) {
            const keyData = {
                provider,
                model,
                systemHash: this._hashString(prompt.system),
                userHash: this._hashString(prompt.user),
                temperature: options.temperature || 0.7,
                maxTokens: options.maxTokens || 1000
            };
            return JSON.stringify(keyData);
        }
        
        /**
         * Hash simples para strings
         */
        _hashString(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Converte para 32bit
            }
            return hash.toString(36);
        }
        
        /**
         * Obtém resposta do cache
         */
        _getFromCache(key) {
            const cached = this.responseCache.get(key);
            if (!cached) return null;
            
            // Verifica TTL
            if (Date.now() - cached.timestamp > this.cacheTTL) {
                this.responseCache.delete(key);
                return null;
            }
            
            return cached.response;
        }
        
        /**
         * Armazena resposta no cache
         */
        _setCache(key, response) {
            // Limpa cache se atingir limite
            if (this.responseCache.size >= this.cacheMaxSize) {
                const oldestKey = this.responseCache.keys().next().value;
                this.responseCache.delete(oldestKey);
            }
            
            this.responseCache.set(key, {
                response,
                timestamp: Date.now()
            });
        }
        
        /**
         * Rastreia uso de tokens e calcula custos
         */
        _trackTokenUsage(provider, model, usage) {
            const providerData = this.providers[provider];
            const pricing = providerData.pricing?.[model];
            
            if (!this.tokenUsage[provider]) {
                this.tokenUsage[provider] = { inputTokens: 0, outputTokens: 0, cost: 0 };
            }
            
            const stats = this.tokenUsage[provider];
            
            // Normaliza nomes dos campos de usage
            const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
            const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
            
            stats.inputTokens += inputTokens;
            stats.outputTokens += outputTokens;
            
            // Calcula custo se pricing disponível
            if (pricing) {
                const inputCost = (inputTokens / 1000) * pricing.input;
                const outputCost = (outputTokens / 1000) * pricing.output;
                stats.cost += inputCost + outputCost;
            }
            
            logger.flow('AIAPIManager', '_trackTokenUsage', {
                provider,
                model,
                inputTokens,
                outputTokens,
                totalCost: stats.cost
            });
        }
        
        /**
         * Estima custo de uma requisição
         */
        estimateRequestCost(provider, model, promptText, expectedOutputTokens = 500) {
            const providerData = this.providers[provider];
            const pricing = providerData.pricing?.[model];
            
            if (!pricing) {
                return { estimated: false, cost: 0, breakdown: null };
            }
            
            // Estimativa simples de tokens (aproximadamente 4 chars = 1 token)
            const estimatedInputTokens = Math.ceil(promptText.length / 4);
            
            const inputCost = (estimatedInputTokens / 1000) * pricing.input;
            const outputCost = (expectedOutputTokens / 1000) * pricing.output;
            const totalCost = inputCost + outputCost;
            
            return {
                estimated: true,
                cost: totalCost,
                breakdown: {
                    inputTokens: estimatedInputTokens,
                    outputTokens: expectedOutputTokens,
                    inputCost,
                    outputCost,
                    currency: 'USD'
                }
            };
        }
        
        /**
         * Obtém estatísticas de uso
         */
        getUsageStats(provider = null) {
            if (provider) {
                return this.tokenUsage[provider] || {
                    inputTokens: 0,
                    outputTokens: 0,
                    cost: 0
                };
            }
            
            // Retorna stats de todos os providers
            const totalStats = {
                totalCost: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                byProvider: {}
            };
            
            Object.entries(this.tokenUsage).forEach(([prov, stats]) => {
                totalStats.totalCost += stats.cost || 0;
                totalStats.totalInputTokens += stats.inputTokens || 0;
                totalStats.totalOutputTokens += stats.outputTokens || 0;
                totalStats.byProvider[prov] = { ...stats };
            });
            
            return totalStats;
        }
        
        /**
         * Limpa cache de respostas
         */
        clearCache() {
            this.responseCache.clear();
            logger.info('AIAPIManager', 'Cache de respostas limpo');
        }
        
        /**
         * Reseta estatísticas de uso
         */
        resetUsageStats() {
            Object.keys(this.tokenUsage).forEach(provider => {
                this.tokenUsage[provider] = {
                    inputTokens: 0,
                    outputTokens: 0,
                    cost: 0
                };
            });
            logger.info('AIAPIManager', 'Estatísticas de uso resetadas');
        }
        
        /**
         * Análise em lote com retry e rate limiting inteligente
         */
        async analyzeBatch(files, options = {}) {
            const provider = this.providers[this.activeProvider];
            const batchSize = options.batchSize || this.rateLimits[provider.id].concurrent;
            const results = [];
            const errors = [];
            
            logger.info('AIAPIManager', `Iniciando análise em lote de ${files.length} arquivos`, {
                provider: provider.id,
                batchSize
            });
            
            // Processa em batches
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);
                const batchPromises = batch.map(async (file, index) => {
                    try {
                        const result = await this.analyze(file, options);
                        return { file, result, index: i + index };
                    } catch (error) {
                        errors.push({ file, error, index: i + index });
                        return null;
                    }
                });
                
                const batchResults = await Promise.allSettled(batchPromises);
                batchResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        results.push(result.value);
                    }
                });
                
                // Delay entre batches para respeitar rate limits
                if (i + batchSize < files.length) {
                    const delay = Math.ceil(60000 / this.rateLimits[provider.id].requestsPerMinute) * batchSize;
                    await this.delay(delay);
                }
            }
            
            logger.info('AIAPIManager', 'Análise em lote concluída', {
                total: files.length,
                successes: results.length,
                errors: errors.length
            });
            
            return {
                results,
                errors,
                stats: {
                    total: files.length,
                    successes: results.length,
                    failures: errors.length,
                    successRate: (results.length / files.length) * 100
                }
            };
        }
    }

    // Registra no namespace global
    KC.AIAPIManager = new AIAPIManager();
    logger.info('AIAPIManager', 'Componente registrado com sucesso - Enhanced Multi-Provider API Manager');
    
    // Expõe métodos de debug no console
    if (typeof window !== 'undefined') {
        window.aiDebug = {
            getProviders: () => KC.AIAPIManager.getProviders(),
            getUsageStats: () => KC.AIAPIManager.getUsageStats(),
            checkHealth: () => KC.AIAPIManager.checkProvidersHealth(),
            estimateCost: (provider, model, text, outputTokens) => 
                KC.AIAPIManager.estimateRequestCost(provider, model, text, outputTokens),
            clearCache: () => KC.AIAPIManager.clearCache(),
            resetStats: () => KC.AIAPIManager.resetUsageStats()
        };
    }

})(window);