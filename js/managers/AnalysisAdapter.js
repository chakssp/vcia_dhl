/**
 * AnalysisAdapter.js - Adaptador de Respostas de APIs
 * 
 * Normaliza respostas de diferentes providers (Ollama, OpenAI, Gemini)
 * para formato padrão do sistema
 * 
 * @requires AnalysisTypesManager
 * @requires Logger
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const logger = KC.Logger;

    class AnalysisAdapter {
        constructor() {
            // Mapeamento de tipos comuns retornados pelas APIs
            this.typeMapping = {
                // Variações para Breakthrough Técnico
                'technical breakthrough': 'Breakthrough Técnico',
                'breakthrough tecnico': 'Breakthrough Técnico',
                'solução técnica': 'Breakthrough Técnico',
                'technical solution': 'Breakthrough Técnico',
                'innovation': 'Breakthrough Técnico',
                'inovacao': 'Breakthrough Técnico',
                
                // Variações para Evolução Conceitual
                'conceptual evolution': 'Evolução Conceitual',
                'evolucao conceitual': 'Evolução Conceitual',
                'novo entendimento': 'Evolução Conceitual',
                'new understanding': 'Evolução Conceitual',
                'paradigm shift': 'Evolução Conceitual',
                'mudanca de paradigma': 'Evolução Conceitual',
                
                // Variações para Momento Decisivo
                'decisive moment': 'Momento Decisivo',
                'momento decisivo': 'Momento Decisivo',
                'decisão importante': 'Momento Decisivo',
                'important decision': 'Momento Decisivo',
                'turning point': 'Momento Decisivo',
                'ponto de virada': 'Momento Decisivo',
                
                // Variações para Insight Estratégico
                'strategic insight': 'Insight Estratégico',
                'insight estrategico': 'Insight Estratégico',
                'descoberta estratégica': 'Insight Estratégico',
                'strategic discovery': 'Insight Estratégico',
                'business insight': 'Insight Estratégico',
                'insight de negocio': 'Insight Estratégico',
                
                // Variações para Aprendizado Geral
                'general learning': 'Aprendizado Geral',
                'aprendizado geral': 'Aprendizado Geral',
                'conhecimento geral': 'Aprendizado Geral',
                'general knowledge': 'Aprendizado Geral',
                'learning': 'Aprendizado Geral',
                'conhecimento': 'Aprendizado Geral'
            };
            
            // Cache de normalização para respostas similares
            this.normalizationCache = new Map();
            this.cacheMaxSize = 50;
            
            // Configurações específicas por provider
            this.providerConfigs = {
                ollama: {
                    commonIssues: ['json_parsing', 'incomplete_response', 'mixed_format'],
                    retryStrategies: ['fix_json', 'extract_structured', 'fallback_text'],
                    timeout: 30000
                },
                openai: {
                    commonIssues: ['rate_limit', 'content_filter', 'token_limit'],
                    retryStrategies: ['exponential_backoff', 'reduce_tokens', 'alternative_prompt'],
                    timeout: 20000
                },
                gemini: {
                    commonIssues: ['safety_filter', 'quota_exceeded', 'format_issues'],
                    retryStrategies: ['adjust_safety', 'reduce_content', 'alternative_format'],
                    timeout: 25000
                },
                anthropic: {
                    commonIssues: ['content_policy', 'token_limit', 'rate_limit'],
                    retryStrategies: ['constitutional_prompt', 'chunk_content', 'wait_retry'],
                    timeout: 30000
                }
            };

            logger.info('AnalysisAdapter', 'Inicializado com mapeamentos avançados e cache');
        }

        /**
         * Normaliza resposta de qualquer provider com cache e recovery
         */
        normalize(rawResponse, providerId, templateId = 'decisiveMoments', options = {}) {
            try {
                logger.flow('AnalysisAdapter', 'normalize', { 
                    providerId, 
                    templateId,
                    responseType: typeof rawResponse,
                    useCache: !options.noCache
                });

                // Verifica cache se habilitado
                const cacheKey = this._generateCacheKey(rawResponse, providerId, templateId);
                if (!options.noCache) {
                    const cached = this.normalizationCache.get(cacheKey);
                    if (cached) {
                        logger.info('AnalysisAdapter', 'Usando resposta normalizada do cache');
                        return { ...cached, fromCache: true };
                    }
                }

                // Parseia resposta com estratégias avançadas
                const parsed = this._parseResponseAdvanced(rawResponse, providerId);

                // Normaliza baseado no provider com otimizações específicas
                let normalized;
                switch (providerId) {
                    case 'ollama':
                        normalized = this._normalizeOllama(parsed, templateId);
                        break;
                    case 'openai':
                        normalized = this._normalizeOpenAI(parsed, templateId);
                        break;
                    case 'gemini':
                        normalized = this._normalizeGemini(parsed, templateId);
                        break;
                    case 'anthropic':
                        normalized = this._normalizeAnthropic(parsed, templateId);
                        break;
                    default:
                        normalized = this._normalizeGeneric(parsed, templateId);
                }

                // Aplica otimizações específicas do provider
                normalized = this._applyProviderOptimizations(normalized, providerId);

                // Valida e corrige tipo de análise
                normalized.analysisType = this._normalizeAnalysisType(normalized.analysisType);

                // Adiciona metadados avançados
                normalized.provider = providerId;
                normalized.template = templateId;
                normalized.timestamp = new Date().toISOString();
                normalized.normalized = true;
                normalized.confidence = this._calculateConfidence(normalized, rawResponse);
                normalized.quality = this._assessQuality(normalized);

                // Armazena no cache
                this._cacheNormalizedResponse(cacheKey, normalized);

                logger.info('AnalysisAdapter', 'Resposta normalizada com sucesso', {
                    type: normalized.analysisType,
                    provider: providerId,
                    confidence: normalized.confidence,
                    quality: normalized.quality
                });

                return normalized;

            } catch (error) {
                logger.error('AnalysisAdapter', 'Erro ao normalizar resposta', error);
                return this._createAdvancedFallbackResponse(providerId, templateId, error, rawResponse);
            }
        }

        /**
         * Parseia resposta string para objeto
         */
        _parseResponse(response) {
            if (typeof response === 'object' && response !== null) {
                return response;
            }

            if (typeof response === 'string') {
                // Remove formatação markdown se houver
                let cleaned = response.trim();
                
                // Remove blocos de código markdown
                cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
                cleaned = cleaned.replace(/\s*```$/i, '');
                
                // Tenta extrair JSON de texto misto
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleaned = jsonMatch[0];
                }

                try {
                    return JSON.parse(cleaned);
                } catch (parseError) {
                    // Se não for JSON, tenta parsear como texto estruturado
                    const textParsed = this._parseTextResponse(response);
                    if (textParsed) {
                        return textParsed;
                    }
                    
                    // Última tentativa: corrigir JSON malformado
                    try {
                        cleaned = this._fixCommonJsonIssues(cleaned);
                        return JSON.parse(cleaned);
                    } catch (fixError) {
                        // Se tudo falhar, retorna estrutura baseada no texto
                        return this._extractFromPlainText(response);
                    }
                }
            }

            throw new Error('Resposta em formato inválido');
        }

        /**
         * Corrige problemas comuns em JSON
         */
        _fixCommonJsonIssues(jsonString) {
            let fixed = jsonString;
            
            // Corrige aspas simples
            fixed = fixed.replace(/'/g, '"');
            
            // Corrige vírgulas extras
            fixed = fixed.replace(/,\s*}/g, '}');
            fixed = fixed.replace(/,\s*]/g, ']');
            
            // Adiciona aspas em chaves não quotadas
            fixed = fixed.replace(/(\w+):/g, '"$1":');
            
            // Remove comentários
            fixed = fixed.replace(/\/\/.*$/gm, '');
            fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

            return fixed;
        }

        /**
         * Normaliza resposta do Ollama
         */
        _normalizeOllama(parsed, templateId) {
            const base = this._getBaseStructure(templateId);

            // DEBUG: Log para ver o que Ollama está retornando
            console.log('🔍 Resposta do Ollama:', parsed);
            console.log('🔍 analysisType:', parsed.analysisType);
            console.log('🔍 type:', parsed.type);

            return {
                ...base,
                analysisType: parsed.analysisType || parsed.type || 'Aprendizado Geral',
                moments: this._normalizeArray(parsed.moments || parsed.decisiveMoments || []),
                categories: this._normalizeArray(parsed.categories || parsed.tags || []),
                summary: parsed.summary || parsed.resumo || parsed.description || '',
                relevanceScore: this._normalizeScore(parsed.relevanceScore || parsed.relevance || 0.5),
                
                // Campos específicos por template
                ...(templateId === 'technicalInsights' && {
                    technicalPoints: this._normalizeArray(parsed.technicalPoints || parsed.insights || []),
                    implementation: parsed.implementation || parsed.implementacao || '',
                    complexity: this._normalizeComplexity(parsed.complexity)
                }),
                
                ...(templateId === 'projectAnalysis' && {
                    projectPotential: parsed.projectPotential || parsed.potential || '',
                    requiredResources: this._normalizeArray(parsed.requiredResources || parsed.resources || []),
                    nextSteps: this._normalizeArray(parsed.nextSteps || parsed.steps || []),
                    feasibility: this._normalizeScore(parsed.feasibility || 0.5)
                })
            };
        }

        /**
         * Normaliza resposta do OpenAI
         */
        _normalizeOpenAI(parsed, templateId) {
            // OpenAI geralmente retorna em formato mais padronizado
            const base = this._getBaseStructure(templateId);

            // Extrai conteúdo da resposta OpenAI
            const content = parsed.choices?.[0]?.message?.content || parsed;
            const data = typeof content === 'string' ? this._parseResponse(content) : content;

            return {
                ...base,
                analysisType: data.analysisType || 'Aprendizado Geral',
                moments: this._normalizeArray(data.moments || []),
                categories: this._normalizeArray(data.categories || []),
                summary: data.summary || '',
                relevanceScore: this._normalizeScore(data.relevanceScore || 0.5),
                
                // Adiciona usage info se disponível
                usage: parsed.usage || null
            };
        }

        /**
         * Normaliza resposta do Gemini
         */
        _normalizeGemini(parsed, templateId) {
            const base = this._getBaseStructure(templateId);

            // Gemini retorna em estrutura específica
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || parsed;
            const data = typeof content === 'string' ? this._parseResponse(content) : content;

            return {
                ...base,
                analysisType: data.analysisType || 'Aprendizado Geral',
                moments: this._normalizeArray(data.moments || []),
                categories: this._normalizeArray(data.categories || []),
                summary: data.summary || '',
                relevanceScore: this._normalizeScore(data.relevanceScore || 0.5)
            };
        }

        /**
         * Normalização genérica
         */
        _normalizeGeneric(parsed, templateId) {
            const base = this._getBaseStructure(templateId);

            return {
                ...base,
                analysisType: parsed.analysisType || 'Aprendizado Geral',
                moments: this._normalizeArray(parsed.moments || []),
                categories: this._normalizeArray(parsed.categories || []),
                summary: parsed.summary || '',
                relevanceScore: this._normalizeScore(parsed.relevanceScore || 0.5)
            };
        }

        /**
         * Obtém estrutura base por template
         */
        _getBaseStructure(templateId) {
            const structures = {
                decisiveMoments: {
                    analysisType: '',
                    moments: [],
                    categories: [],
                    summary: '',
                    relevanceScore: 0.5
                },
                technicalInsights: {
                    analysisType: '',
                    technicalPoints: [],
                    implementation: '',
                    categories: [],
                    complexity: 'medium',
                    relevanceScore: 0.5
                },
                projectAnalysis: {
                    analysisType: '',
                    projectPotential: '',
                    requiredResources: [],
                    nextSteps: [],
                    categories: [],
                    feasibility: 0.5,
                    relevanceScore: 0.5
                }
            };

            return structures[templateId] || structures.decisiveMoments;
        }

        /**
         * Normaliza tipo de análise para valores válidos
         */
        _normalizeAnalysisType(type) {
            if (!type) return 'Aprendizado Geral';

            // Verifica se já é um tipo válido
            const validTypes = KC.AnalysisTypesManager.getTypeNames();
            if (validTypes.includes(type)) {
                return type;
            }

            // Tenta mapear variações conhecidas
            const normalized = type.toLowerCase().trim();
            for (const [variation, validType] of Object.entries(this.typeMapping)) {
                if (normalized.includes(variation.toLowerCase())) {
                    return validType;
                }
            }

            // Tenta detectar pelo conteúdo das palavras-chave
            const typeObj = KC.AnalysisTypesManager.getAllAsArray().find(t => 
                t.keywords.some(keyword => 
                    normalized.includes(keyword.toLowerCase())
                )
            );

            return typeObj ? typeObj.name : 'Aprendizado Geral';
        }

        /**
         * Normaliza array garantindo que seja array válido
         */
        _normalizeArray(value) {
            if (Array.isArray(value)) {
                return value.filter(item => 
                    item && (typeof item === 'string' || typeof item === 'number')
                ).map(item => String(item).trim());
            }
            
            if (typeof value === 'string' && value) {
                // Tenta dividir string em array
                return value.split(/[,;]/).map(item => item.trim()).filter(Boolean);
            }

            return [];
        }

        /**
         * Normaliza score para range 0-1
         */
        _normalizeScore(score) {
            const num = parseFloat(score);
            if (isNaN(num)) return 0.5;
            
            // Se estiver em porcentagem
            if (num > 1 && num <= 100) {
                return num / 100;
            }
            
            return Math.max(0, Math.min(1, num));
        }

        /**
         * Normaliza complexidade
         */
        _normalizeComplexity(complexity) {
            const valid = ['low', 'medium', 'high'];
            const normalized = String(complexity).toLowerCase().trim();
            
            if (valid.includes(normalized)) {
                return normalized;
            }

            // Mapeamentos alternativos
            const mapping = {
                'baixa': 'low',
                'média': 'medium',
                'alta': 'high',
                'simple': 'low',
                'complex': 'high',
                'moderate': 'medium'
            };

            return mapping[normalized] || 'medium';
        }

        /**
         * Cria resposta fallback em caso de erro
         */
        _createFallbackResponse(providerId, templateId, errorMessage) {
            logger.warn('AnalysisAdapter', 'Criando resposta fallback', { 
                providerId, 
                error: errorMessage 
            });

            const base = this._getBaseStructure(templateId);
            
            return {
                ...base,
                analysisType: 'Aprendizado Geral',
                summary: 'Análise não disponível devido a erro no processamento',
                error: errorMessage,
                provider: providerId,
                template: templateId,
                timestamp: new Date().toISOString(),
                normalized: true,
                isFallback: true
            };
        }

        /**
         * Parseia resposta em texto estruturado
         */
        _parseTextResponse(text) {
            // Procura por padrões de texto estruturado
            const patterns = {
                summary: /(?:summary|resumo|síntese)[:\s]+(.+?)(?=\n\n|\n[A-Z]|$)/is,
                insights: /(?:insights?|pontos?|observações)[:\s]+(.+?)(?=\n\n|\n[A-Z]|$)/is,
                relevance: /(?:relevance|relevância)[:\s]+(\d+)/i,
                categories: /(?:categor(?:y|ies|ia)|tags?)[:\s]+(.+?)(?=\n\n|\n[A-Z]|$)/is,
                type: /(?:type|tipo)[:\s]+(.+?)(?=\n|$)/i
            };

            const result = {};
            
            for (const [key, pattern] of Object.entries(patterns)) {
                const match = text.match(pattern);
                if (match) {
                    result[key] = match[1].trim();
                }
            }

            // Se encontrou estrutura suficiente, retorna
            if (Object.keys(result).length >= 2) {
                return this._structureTextData(result);
            }

            return null;
        }

        /**
         * Extrai informações de texto plano
         */
        _extractFromPlainText(text) {
            const lines = text.split('\n').filter(line => line.trim());
            const firstParagraph = lines.slice(0, 3).join(' ');
            
            return {
                summary: firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : ''),
                analysisType: this._detectAnalysisType(text),
                relevanceScore: 0.5, // Score padrão quando não detectado
                categories: this._extractKeywords(text),
                moments: [],
                insights: lines.filter(line => 
                    line.match(/^[-*•]\s/) || // Itens de lista
                    line.match(/^\d+[\.)]\s/) // Listas numeradas
                ).map(line => line.replace(/^[-*•\d\.)]\s*/, '').trim()),
                rawText: text,
                parseMethod: 'plainText'
            };
        }

        /**
         * Estrutura dados extraídos do texto
         */
        _structureTextData(extracted) {
            return {
                summary: extracted.summary || '',
                analysisType: extracted.type || this._detectAnalysisType(extracted.summary || ''),
                relevanceScore: extracted.relevance ? 
                    this._normalizeScore(extracted.relevance) : 0.5,
                categories: extracted.categories ? 
                    this._normalizeArray(extracted.categories) : [],
                insights: extracted.insights ? 
                    this._normalizeArray(extracted.insights) : [],
                moments: [],
                parseMethod: 'textStructured'
            };
        }

        /**
         * Extrai keywords do texto
         */
        _extractKeywords(text) {
            // Remove stopwords comuns
            const stopwords = ['o', 'a', 'os', 'as', 'de', 'da', 'do', 'em', 'no', 'na', 
                'para', 'com', 'por', 'que', 'é', 'um', 'uma', 'aos', 'das', 'dos'];
            
            // Extrai palavras únicas significativas
            const words = text.toLowerCase()
                .replace(/[^\w\sáàâãéèêíïóôõöúüçñ]/g, ' ')
                .split(/\s+/)
                .filter(word => 
                    word.length > 4 && 
                    !stopwords.includes(word)
                );
            
            // Conta frequência
            const freq = {};
            words.forEach(word => {
                freq[word] = (freq[word] || 0) + 1;
            });
            
            // Retorna top 5 palavras mais frequentes
            return Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([word]) => word);
        }
        
        /**
         * Parseia resposta com estratégias avançadas específicas por provider
         */
        _parseResponseAdvanced(response, providerId) {
            const config = this.providerConfigs[providerId];
            
            try {
                // Tenta parsing normal primeiro
                return this._parseResponse(response);
            } catch (error) {
                logger.warn('AnalysisAdapter', `Parsing normal falhou para ${providerId}, tentando estratégias específicas`, error.message);
                
                // Aplica estratégias específicas do provider
                for (const strategy of config.retryStrategies) {
                    try {
                        const result = this._applyParsingStrategy(response, strategy, providerId);
                        if (result) {
                            logger.info('AnalysisAdapter', `Estratégia ${strategy} funcionou para ${providerId}`);
                            return result;
                        }
                    } catch (strategyError) {
                        logger.warn('AnalysisAdapter', `Estratégia ${strategy} falhou`, strategyError.message);
                    }
                }
                
                // Se todas as estratégias falharam, usa extração de texto plano
                return this._extractFromPlainText(response);
            }
        }
        
        /**
         * Aplica estratégia específica de parsing
         */
        _applyParsingStrategy(response, strategy, providerId) {
            switch (strategy) {
                case 'fix_json':
                    return this._fixJsonResponse(response);
                    
                case 'extract_structured':
                    return this._extractStructuredContent(response);
                    
                case 'reduce_tokens':
                    return this._reduceTokensAndRetry(response);
                    
                case 'adjust_safety':
                    return this._adjustSafetyAndRetry(response);
                    
                case 'constitutional_prompt':
                    return this._applyConstitutionalFix(response);
                    
                default:
                    return null;
            }
        }
        
        /**
         * Corrige JSON malformado com heurísticas avançadas
         */
        _fixJsonResponse(response) {
            let text = String(response).trim();
            
            // Remove possível texto antes/depois do JSON
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                text = text.substring(jsonStart, jsonEnd + 1);
            }
            
            // Corrige problemas comuns
            text = text
                .replace(/'/g, '"')  // Aspas simples
                .replace(/,\s*}/g, '}')  // Vírgulas extras
                .replace(/,\s*]/g, ']')  // Vírgulas extras em arrays
                .replace(/(\w+):/g, '"$1":')  // Chaves sem aspas
                .replace(/:\s*([^",\{\[\]]+)(?=[,\}])/g, ': "$1"')  // Valores sem aspas
                .replace(/\n/g, '\\n')  // Quebras de linha
                .replace(/\t/g, '\\t');  // Tabs
            
            return JSON.parse(text);
        }
        
        /**
         * Extrai conteúdo estruturado de resposta mista
         */
        _extractStructuredContent(response) {
            const text = String(response);
            
            // Procura por blocos JSON
            const jsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (jsonMatches) {
                for (const match of jsonMatches) {
                    try {
                        return JSON.parse(match);
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            // Extrai usando patterns de estrutura
            return this._parseTextResponse(text);
        }
        
        /**
         * Normaliza resposta específica do Anthropic
         */
        _normalizeAnthropic(parsed, templateId) {
            const base = this._getBaseStructure(templateId);
            
            // Anthropic geralmente retorna texto bem estruturado
            return {
                ...base,
                analysisType: parsed.analysisType || parsed.type || 'Aprendizado Geral',
                moments: this._normalizeArray(parsed.moments || parsed.key_moments || []),
                categories: this._normalizeArray(parsed.categories || parsed.tags || []),
                summary: parsed.summary || parsed.analysis || parsed.conclusion || '',
                relevanceScore: this._normalizeScore(parsed.relevanceScore || parsed.significance || 0.5),
                
                // Campos específicos do Claude
                reasoning: parsed.reasoning || parsed.thinking || '',
                confidence: parsed.confidence || 0.8,
                constitutional_notes: parsed.constitutional_notes || null
            };
        }
        
        /**
         * Aplica otimizações específicas do provider
         */
        _applyProviderOptimizations(normalized, providerId) {
            switch (providerId) {
                case 'ollama':
                    // Ollama às vezes retorna respostas incompletas
                    if (!normalized.summary && normalized.moments?.length > 0) {
                        normalized.summary = normalized.moments[0].substring(0, 100) + '...';
                    }
                    break;
                    
                case 'gemini':
                    // Gemini pode ser verboso, condensar se necessário
                    if (normalized.summary && normalized.summary.length > 500) {
                        normalized.summary = normalized.summary.substring(0, 497) + '...';
                    }
                    break;
                    
                case 'anthropic':
                    // Claude geralmente fornece bom contexto, preservar
                    if (normalized.reasoning && !normalized.summary.includes(normalized.reasoning.substring(0, 50))) {
                        normalized.summary += ' ' + normalized.reasoning.substring(0, 100);
                    }
                    break;
            }
            
            return normalized;
        }
        
        /**
         * Calcula confiança na normalização
         */
        _calculateConfidence(normalized, rawResponse) {
            let confidence = 0.5;
            
            // Pontos por completude
            if (normalized.analysisType !== 'Aprendizado Geral') confidence += 0.2;
            if (normalized.summary && normalized.summary.length > 50) confidence += 0.1;
            if (normalized.moments && normalized.moments.length > 0) confidence += 0.1;
            if (normalized.categories && normalized.categories.length > 0) confidence += 0.1;
            
            // Penalidades
            if (normalized.isFallback) confidence -= 0.3;
            if (String(rawResponse).length < 50) confidence -= 0.2;
            
            return Math.max(0, Math.min(1, confidence));
        }
        
        /**
         * Avalia qualidade da resposta normalizada
         */
        _assessQuality(normalized) {
            const checks = {
                hasType: !!normalized.analysisType,
                hasGoodSummary: normalized.summary && normalized.summary.length > 20,
                hasMoments: normalized.moments && normalized.moments.length > 0,
                hasCategories: normalized.categories && normalized.categories.length > 0,
                validScore: normalized.relevanceScore >= 0 && normalized.relevanceScore <= 1,
                notFallback: !normalized.isFallback
            };
            
            const passedChecks = Object.values(checks).filter(Boolean).length;
            const totalChecks = Object.keys(checks).length;
            const score = passedChecks / totalChecks;
            
            let quality = 'poor';
            if (score >= 0.8) quality = 'excellent';
            else if (score >= 0.6) quality = 'good';
            else if (score >= 0.4) quality = 'fair';
            
            return { quality, score, checks };
        }
        
        /**
         * Gera chave de cache para normalização
         */
        _generateCacheKey(response, providerId, templateId) {
            const content = String(response).substring(0, 200);
            const hash = this._simpleHash(content + providerId + templateId);
            return `norm_${hash}`;
        }
        
        /**
         * Hash simples para strings
         */
        _simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36);
        }
        
        /**
         * Armazena resposta normalizada no cache
         */
        _cacheNormalizedResponse(key, normalized) {
            if (this.normalizationCache.size >= this.cacheMaxSize) {
                const firstKey = this.normalizationCache.keys().next().value;
                this.normalizationCache.delete(firstKey);
            }
            
            this.normalizationCache.set(key, {
                ...normalized,
                cachedAt: Date.now()
            });
        }
        
        /**
         * Cria resposta fallback avançada
         */
        _createAdvancedFallbackResponse(providerId, templateId, error, rawResponse) {
            logger.warn('AnalysisAdapter', 'Criando resposta fallback avançada', { 
                providerId, 
                error: error.message,
                responseLength: String(rawResponse).length
            });

            const base = this._getBaseStructure(templateId);
            
            // Tenta extrair algo útil mesmo com erro
            let extractedContent = null;
            try {
                extractedContent = this._extractFromPlainText(String(rawResponse));
            } catch (e) {
                // Se até extração de texto falhar, usa defaults
            }
            
            return {
                ...base,
                analysisType: extractedContent?.analysisType || 'Aprendizado Geral',
                summary: extractedContent?.summary || 'Análise não disponível devido a erro no processamento',
                moments: extractedContent?.moments || [],
                categories: extractedContent?.categories || [],
                relevanceScore: extractedContent?.relevanceScore || 0.3,
                error: error.message,
                provider: providerId,
                template: templateId,
                timestamp: new Date().toISOString(),
                normalized: true,
                isFallback: true,
                confidence: 0.2,
                quality: { quality: 'poor', score: 0.2, checks: {} },
                rawResponseLength: String(rawResponse).length
            };
        }

        /**
         * Valida resposta normalizada com métricas avançadas
         */
        validate(normalizedResponse, templateId, options = {}) {
            try {
                const validationResult = {
                    isValid: false,
                    score: 0,
                    issues: [],
                    warnings: [],
                    suggestions: []
                };

                // Verifica campos obrigatórios
                const required = ['analysisType', 'summary', 'relevanceScore'];
                const missingFields = required.filter(field => !(field in normalizedResponse));
                
                if (missingFields.length > 0) {
                    validationResult.issues.push(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
                    return validationResult;
                }

                // Valida tipo de análise
                const validTypes = KC.AnalysisTypesManager.getTypeNames();
                if (!validTypes.includes(normalizedResponse.analysisType)) {
                    validationResult.issues.push(`Tipo de análise inválido: ${normalizedResponse.analysisType}`);
                }

                // Valida score com tolerância
                if (normalizedResponse.relevanceScore < -0.1 || normalizedResponse.relevanceScore > 1.1) {
                    validationResult.issues.push('Score de relevância fora do range válido');
                } else if (normalizedResponse.relevanceScore < 0 || normalizedResponse.relevanceScore > 1) {
                    validationResult.warnings.push('Score de relevância ligeiramente fora do range ideal');
                }

                // Validações de qualidade de conteúdo
                if (!normalizedResponse.summary || normalizedResponse.summary.length < 10) {
                    validationResult.warnings.push('Resumo muito curto ou ausente');
                }

                if (normalizedResponse.categories && normalizedResponse.categories.length === 0) {
                    validationResult.suggestions.push('Consider adding categories for better organization');
                }

                // Validações específicas por template
                this._validateByTemplate(normalizedResponse, templateId, validationResult);

                // Calcula score de validação
                const totalChecks = 10;
                let passedChecks = totalChecks - validationResult.issues.length - (validationResult.warnings.length * 0.5);
                validationResult.score = Math.max(0, passedChecks / totalChecks);
                validationResult.isValid = validationResult.issues.length === 0 && validationResult.score >= 0.7;

                if (!validationResult.isValid) {
                    logger.warn('AnalysisAdapter', 'Validação falhou', validationResult);
                } else {
                    logger.info('AnalysisAdapter', 'Validação passou', { score: validationResult.score });
                }

                return validationResult;

            } catch (error) {
                logger.error('AnalysisAdapter', 'Erro na validação', error);
                return {
                    isValid: false,
                    score: 0,
                    issues: [`Erro de validação: ${error.message}`],
                    warnings: [],
                    suggestions: []
                };
            }
        }
        
        /**
         * Validações específicas por template
         */
        _validateByTemplate(response, templateId, validationResult) {
            switch (templateId) {
                case 'technicalInsights':
                    if (!response.technicalPoints?.length) {
                        validationResult.warnings.push('Template técnico sem pontos técnicos');
                    }
                    if (!response.implementation) {
                        validationResult.suggestions.push('Consider adding implementation details');
                    }
                    break;
                    
                case 'projectAnalysis':
                    if (!response.nextSteps?.length) {
                        validationResult.warnings.push('Template projeto sem próximos passos');
                    }
                    if (!response.feasibility) {
                        validationResult.suggestions.push('Consider adding feasibility assessment');
                    }
                    break;
                    
                case 'decisiveMoments':
                    if (!response.moments?.length) {
                        validationResult.warnings.push('Nenhum momento decisivo identificado');
                    }
                    break;
            }
        }
    }

    // Registra no namespace global
    KC.AnalysisAdapter = new AnalysisAdapter();
    logger.info('AnalysisAdapter', 'Componente registrado com sucesso - Enhanced Analysis Adapter');
    
    // Expõe métodos de debug no console
    if (typeof window !== 'undefined') {
        window.adapterDebug = {
            getCacheSize: () => KC.AnalysisAdapter.normalizationCache.size,
            clearCache: () => KC.AnalysisAdapter.normalizationCache.clear(),
            getProviderConfigs: () => KC.AnalysisAdapter.providerConfigs,
            testNormalization: (response, provider, template) => 
                KC.AnalysisAdapter.normalize(response, provider, template, { noCache: true }),
            validateResponse: (response, template) => 
                KC.AnalysisAdapter.validate(response, template)
        };
    }

})(window);