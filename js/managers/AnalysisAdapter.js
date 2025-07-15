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
                
                // Variações para Evolução Conceitual
                'conceptual evolution': 'Evolução Conceitual',
                'evolucao conceitual': 'Evolução Conceitual',
                'novo entendimento': 'Evolução Conceitual',
                'new understanding': 'Evolução Conceitual',
                
                // Variações para Momento Decisivo
                'decisive moment': 'Momento Decisivo',
                'momento decisivo': 'Momento Decisivo',
                'decisão importante': 'Momento Decisivo',
                'important decision': 'Momento Decisivo',
                
                // Variações para Insight Estratégico
                'strategic insight': 'Insight Estratégico',
                'insight estrategico': 'Insight Estratégico',
                'descoberta estratégica': 'Insight Estratégico',
                'strategic discovery': 'Insight Estratégico',
                
                // Variações para Aprendizado Geral
                'general learning': 'Aprendizado Geral',
                'aprendizado geral': 'Aprendizado Geral',
                'conhecimento geral': 'Aprendizado Geral',
                'general knowledge': 'Aprendizado Geral'
            };

            logger.info('AnalysisAdapter', 'Inicializado com mapeamentos de tipo');
        }

        /**
         * Normaliza resposta de qualquer provider
         */
        normalize(rawResponse, providerId, templateId = 'decisiveMoments') {
            try {
                logger.flow('AnalysisAdapter', 'normalize', { 
                    providerId, 
                    templateId,
                    responseType: typeof rawResponse 
                });

                // Parseia resposta se for string
                const parsed = this._parseResponse(rawResponse);

                // Normaliza baseado no provider
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
                    default:
                        normalized = this._normalizeGeneric(parsed, templateId);
                }

                // Valida e corrige tipo de análise
                normalized.analysisType = this._normalizeAnalysisType(normalized.analysisType);

                // Adiciona metadados
                normalized.provider = providerId;
                normalized.template = templateId;
                normalized.timestamp = new Date().toISOString();
                normalized.normalized = true;

                logger.info('AnalysisAdapter', 'Resposta normalizada com sucesso', {
                    type: normalized.analysisType,
                    provider: providerId
                });

                return normalized;

            } catch (error) {
                logger.error('AnalysisAdapter', 'Erro ao normalizar resposta', error);
                return this._createFallbackResponse(providerId, templateId, error.message);
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
                    // Tenta corrigir JSON malformado comum
                    cleaned = this._fixCommonJsonIssues(cleaned);
                    return JSON.parse(cleaned);
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
         * Valida resposta normalizada
         */
        validate(normalizedResponse, templateId) {
            try {
                // Verifica campos obrigatórios
                const required = ['analysisType', 'summary', 'relevanceScore'];
                for (const field of required) {
                    if (!(field in normalizedResponse)) {
                        throw new Error(`Campo obrigatório ausente: ${field}`);
                    }
                }

                // Valida tipo de análise
                const validTypes = KC.AnalysisTypesManager.getTypeNames();
                if (!validTypes.includes(normalizedResponse.analysisType)) {
                    throw new Error(`Tipo de análise inválido: ${normalizedResponse.analysisType}`);
                }

                // Valida score
                if (normalizedResponse.relevanceScore < 0 || normalizedResponse.relevanceScore > 1) {
                    throw new Error('Score de relevância fora do range 0-1');
                }

                // Validações específicas por template
                if (templateId === 'technicalInsights' && !normalizedResponse.technicalPoints?.length) {
                    logger.warn('AnalysisAdapter', 'Template technical sem pontos técnicos');
                }

                if (templateId === 'projectAnalysis' && !normalizedResponse.nextSteps?.length) {
                    logger.warn('AnalysisAdapter', 'Template project sem próximos passos');
                }

                return true;

            } catch (error) {
                logger.error('AnalysisAdapter', 'Validação falhou', error);
                return false;
            }
        }
    }

    // Registra no namespace global
    KC.AnalysisAdapter = new AnalysisAdapter();
    logger.info('AnalysisAdapter', 'Componente registrado com sucesso');

})(window);