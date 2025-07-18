/**
 * SimilaritySearchService.js
 * 
 * Serviço de busca por similaridade semântica
 * Integra EmbeddingService e QdrantService para buscar documentos similares
 * 
 * Arquitetura:
 * - Usa embeddings para encontrar conteúdo semanticamente relacionado
 * - Integra com categorias manuais como ground truth
 * - Suporta múltiplos tipos de busca (texto, categoria, híbrida)
 * - Cache inteligente de resultados
 */

class SimilaritySearchService {
    constructor() {
        this.config = {
            // Configurações de busca
            defaultLimit: 10,
            scoreThreshold: 0.7,
            includeMetadata: true,
            includeContent: true,
            
            // Pesos para busca híbrida
            weights: {
                semantic: 0.7,      // Peso da similaridade semântica
                category: 0.2,      // Peso da correspondência de categoria
                relevance: 0.1      // Peso do score de relevância original
            },
            
            // Cache
            cacheEnabled: true,
            cacheTimeout: 10 * 60 * 1000, // 10 minutos
            maxCacheSize: 100
        };

        // Cache de buscas recentes
        this.searchCache = new Map();
        
        // Estatísticas
        this.stats = {
            searches: 0,
            cacheHits: 0,
            avgResponseTime: 0
        };

        // Categorias como ground truth
        this.groundTruthCategories = null;
    }

    /**
     * Inicializa o serviço
     */
    async initialize() {
        KC.Logger?.info('SimilaritySearchService', 'Inicializando serviço de busca por similaridade');
        
        // Verifica dependências
        if (!KC.EmbeddingService) {
            throw new Error('EmbeddingService não disponível');
        }
        
        if (!KC.QdrantService) {
            throw new Error('QdrantService não disponível');
        }

        // Carrega categorias como ground truth
        this.loadGroundTruthCategories();
        
        // Verifica conectividade
        const embeddingAvailable = await KC.EmbeddingService.checkOllamaAvailability();
        const qdrantAvailable = await KC.QdrantService.checkConnection();
        
        if (!embeddingAvailable) {
            KC.Logger?.warn('SimilaritySearchService', 'Ollama não disponível - busca semântica limitada');
        }
        
        if (!qdrantAvailable) {
            KC.Logger?.warn('SimilaritySearchService', 'Qdrant não disponível - busca desabilitada');
            return false;
        }

        KC.Logger?.success('SimilaritySearchService', 'Serviço inicializado com sucesso');
        return true;
    }

    /**
     * Busca por similaridade usando texto
     * @param {string} query - Texto de busca
     * @param {Object} options - Opções de busca
     * @returns {Promise<Array>} Resultados ordenados por relevância
     */
    async searchByText(query, options = {}) {
        const startTime = Date.now();
        this.stats.searches++;
        
        // Verifica cache
        const cacheKey = this.generateCacheKey('text', query, options);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }

        try {
            KC.Logger?.flow('SimilaritySearchService', 'Busca por texto', { query, options });
            
            // Gera embedding do texto de busca
            const queryEmbedding = await KC.EmbeddingService.generateEmbedding(query, {
                type: 'query',
                searchContext: options.context
            });

            if (!queryEmbedding) {
                throw new Error('Falha ao gerar embedding da query');
            }

            // Busca no Qdrant
            const searchResults = await KC.QdrantService.search(queryEmbedding, {
                limit: options.limit || this.config.defaultLimit,
                scoreThreshold: options.scoreThreshold || this.config.scoreThreshold,
                filter: this.buildQdrantFilter(options)
            });

            // Enriquece resultados
            const enrichedResults = await this.enrichResults(searchResults, query, options);
            
            // Aplica ranking híbrido se configurado
            const rankedResults = options.hybridRanking ? 
                this.applyHybridRanking(enrichedResults, query, options) : 
                enrichedResults;

            // Salva no cache
            this.saveToCache(cacheKey, rankedResults);
            
            // Atualiza estatísticas
            const responseTime = Date.now() - startTime;
            this.updateStats(responseTime);
            
            KC.Logger?.success('SimilaritySearchService', 'Busca concluída', {
                results: rankedResults.length,
                responseTime
            });

            return rankedResults;

        } catch (error) {
            KC.Logger?.error('SimilaritySearchService', 'Erro na busca por texto', error);
            throw error;
        }
    }

    /**
     * Busca por similaridade usando categoria
     * @param {string} categoryName - Nome da categoria
     * @param {Object} options - Opções de busca
     * @returns {Promise<Array>} Resultados da categoria
     */
    async searchByCategory(categoryName, options = {}) {
        const startTime = Date.now();
        
        // Verifica cache
        const cacheKey = this.generateCacheKey('category', categoryName, options);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }

        try {
            KC.Logger?.flow('SimilaritySearchService', 'Busca por categoria', { categoryName, options });
            
            // Busca usando filtro de categoria
            const filter = {
                must: [
                    {
                        key: 'metadata.categories',
                        match: { any: [categoryName] }
                    }
                ]
            };

            // Se tiver query de exemplo, usa busca híbrida
            if (options.exampleQuery) {
                const queryEmbedding = await KC.EmbeddingService.generateEmbedding(options.exampleQuery, {
                    type: 'category_example',
                    category: categoryName
                });

                const searchResults = await KC.QdrantService.search(queryEmbedding, {
                    limit: options.limit || this.config.defaultLimit * 2,
                    filter: filter
                });

                const enrichedResults = await this.enrichResults(searchResults, categoryName, options);
                this.saveToCache(cacheKey, enrichedResults);
                return enrichedResults;
            }
            
            // Busca todos da categoria usando scroll
            const scrollResults = await KC.QdrantService.scrollPoints({
                filter: filter,
                limit: options.limit || 100,
                withPayload: true
            });

            const enrichedResults = this.formatScrollResults(scrollResults.points);
            this.saveToCache(cacheKey, enrichedResults);
            
            const responseTime = Date.now() - startTime;
            this.updateStats(responseTime);
            
            return enrichedResults;

        } catch (error) {
            KC.Logger?.error('SimilaritySearchService', 'Erro na busca por categoria', error);
            throw error;
        }
    }

    /**
     * Busca documentos similares a um documento existente
     * @param {string} documentId - ID do documento de referência
     * @param {Object} options - Opções de busca
     * @returns {Promise<Array>} Documentos similares
     */
    async findSimilarDocuments(documentId, options = {}) {
        try {
            KC.Logger?.flow('SimilaritySearchService', 'Busca documentos similares', { documentId, options });
            
            // Busca o documento no Qdrant
            const points = await KC.QdrantService.getPoints([documentId]);
            if (!points || points.length === 0) {
                throw new Error(`Documento ${documentId} não encontrado`);
            }

            const referenceDoc = points[0];
            
            // Usa o vetor do documento para buscar similares
            const searchResults = await KC.QdrantService.search(referenceDoc.vector, {
                limit: (options.limit || this.config.defaultLimit) + 1, // +1 para excluir o próprio
                scoreThreshold: options.scoreThreshold || 0.8,
                filter: this.buildQdrantFilter(options)
            });

            // Remove o próprio documento dos resultados
            const filteredResults = searchResults.filter(r => r.id !== documentId);
            
            // Enriquece resultados
            const enrichedResults = await this.enrichResults(
                filteredResults, 
                referenceDoc.payload?.content || '', 
                options
            );

            return enrichedResults;

        } catch (error) {
            KC.Logger?.error('SimilaritySearchService', 'Erro ao buscar documentos similares', error);
            throw error;
        }
    }

    /**
     * Busca multi-modal combinando texto e filtros
     * @param {Object} criteria - Critérios de busca
     * @returns {Promise<Array>} Resultados combinados
     */
    async multiModalSearch(criteria) {
        try {
            KC.Logger?.flow('SimilaritySearchService', 'Busca multi-modal', criteria);
            
            const results = [];
            const weights = criteria.weights || this.config.weights;
            
            // Busca por texto se fornecido
            if (criteria.text) {
                const textResults = await this.searchByText(criteria.text, {
                    limit: criteria.limit * 2,
                    ...criteria.options
                });
                
                results.push({
                    type: 'text',
                    weight: weights.semantic,
                    results: textResults
                });
            }
            
            // Busca por categorias se fornecidas
            if (criteria.categories && criteria.categories.length > 0) {
                for (const category of criteria.categories) {
                    const categoryResults = await this.searchByCategory(category, {
                        limit: criteria.limit,
                        ...criteria.options
                    });
                    
                    results.push({
                        type: 'category',
                        weight: weights.category,
                        results: categoryResults
                    });
                }
            }
            
            // Combina e rankeia resultados
            const combinedResults = this.combineMultiModalResults(results, criteria.limit);
            
            return combinedResults;

        } catch (error) {
            KC.Logger?.error('SimilaritySearchService', 'Erro na busca multi-modal', error);
            throw error;
        }
    }

    /**
     * Valida busca contra ground truth (categorias manuais)
     * @param {Array} searchResults - Resultados da busca
     * @param {string} expectedCategory - Categoria esperada
     * @returns {Object} Métricas de validação
     */
    validateAgainstGroundTruth(searchResults, expectedCategory) {
        if (!this.groundTruthCategories) {
            this.loadGroundTruthCategories();
        }

        const metrics = {
            precision: 0,
            recall: 0,
            f1Score: 0,
            correctCategories: 0,
            totalResults: searchResults.length
        };

        // Calcula quantos resultados têm a categoria correta
        const correctResults = searchResults.filter(result => {
            const categories = result.metadata?.categories || [];
            return categories.includes(expectedCategory);
        });

        metrics.correctCategories = correctResults.length;
        metrics.precision = metrics.totalResults > 0 ? 
            metrics.correctCategories / metrics.totalResults : 0;

        // Para recall, precisaríamos saber o total de documentos na categoria
        // Por ora, usamos uma estimativa baseada no ground truth
        const categoryDocs = this.groundTruthCategories[expectedCategory] || [];
        if (categoryDocs.length > 0) {
            metrics.recall = metrics.correctCategories / categoryDocs.length;
        }

        // F1 Score
        if (metrics.precision + metrics.recall > 0) {
            metrics.f1Score = 2 * (metrics.precision * metrics.recall) / 
                             (metrics.precision + metrics.recall);
        }

        KC.Logger?.info('SimilaritySearchService', 'Validação contra ground truth', metrics);
        
        return metrics;
    }

    /**
     * Carrega categorias manuais como ground truth
     * @private
     */
    loadGroundTruthCategories() {
        const categories = KC.CategoryManager?.getCategories() || [];
        const files = KC.AppState?.get('files') || [];
        
        this.groundTruthCategories = {};
        
        // Agrupa arquivos por categoria
        categories.forEach(category => {
            this.groundTruthCategories[category.name] = files.filter(file => 
                file.categories?.includes(category.name)
            );
        });

        KC.Logger?.info('SimilaritySearchService', 'Ground truth carregado', {
            categories: Object.keys(this.groundTruthCategories).length,
            totalFiles: files.length
        });
    }

    /**
     * Enriquece resultados com informações adicionais
     * @private
     */
    async enrichResults(searchResults, query, options) {
        return searchResults.map((result, index) => {
            const enriched = {
                id: result.id,
                score: result.score,
                rank: index + 1,
                
                // Dados do documento
                documentId: result.payload?.documentId,
                fileName: result.payload?.fileName,
                content: options.includeContent !== false ? result.payload?.content : null,
                
                // Metadados
                metadata: result.payload?.metadata || {},
                
                // Análise
                analysisType: result.payload?.metadata?.analysisType,
                categories: result.payload?.metadata?.categories || [],
                relevanceScore: result.payload?.metadata?.relevanceScore,
                
                // Contexto da busca
                searchContext: {
                    query: query,
                    matchType: this.determineMatchType(result, query),
                    confidence: this.calculateConfidence(result.score)
                }
            };

            // Adiciona highlights se solicitado
            if (options.includeHighlights && enriched.content) {
                enriched.highlights = this.generateHighlights(enriched.content, query);
            }

            return enriched;
        });
    }

    /**
     * Aplica ranking híbrido combinando múltiplos fatores
     * @private
     */
    applyHybridRanking(results, query, options) {
        const weights = options.weights || this.config.weights;
        
        return results.map(result => {
            let hybridScore = 0;
            
            // Peso semântico (score original do Qdrant)
            hybridScore += result.score * weights.semantic;
            
            // Peso de categoria (bonus se categoria corresponde ao contexto)
            if (options.preferredCategories) {
                const hasPreferredCategory = result.categories.some(cat => 
                    options.preferredCategories.includes(cat)
                );
                if (hasPreferredCategory) {
                    hybridScore += weights.category;
                }
            }
            
            // Peso de relevância original
            const relevance = result.relevanceScore || 0;
            hybridScore += (relevance / 100) * weights.relevance;
            
            return {
                ...result,
                originalScore: result.score,
                score: hybridScore
            };
        }).sort((a, b) => b.score - a.score);
    }

    /**
     * Constrói filtro para o Qdrant
     * @private
     */
    buildQdrantFilter(options) {
        const filter = { must: [] };
        
        // Filtro por categorias
        if (options.categories && options.categories.length > 0) {
            filter.must.push({
                key: 'metadata.categories',
                match: { any: options.categories }
            });
        }
        
        // Filtro por tipo de análise
        if (options.analysisTypes && options.analysisTypes.length > 0) {
            filter.must.push({
                key: 'metadata.analysisType',
                match: { any: options.analysisTypes }
            });
        }
        
        // Filtro por relevância mínima
        if (options.minRelevance) {
            filter.must.push({
                key: 'metadata.relevanceScore',
                range: { gte: options.minRelevance }
            });
        }
        
        // Filtro por data
        if (options.dateRange) {
            filter.must.push({
                key: 'metadata.lastModified',
                range: {
                    gte: options.dateRange.from,
                    lte: options.dateRange.to
                }
            });
        }
        
        return filter.must.length > 0 ? filter : null;
    }

    /**
     * Combina resultados de busca multi-modal
     * @private
     */
    combineMultiModalResults(resultSets, limit) {
        const scoreMap = new Map();
        
        // Combina scores de diferentes fontes
        resultSets.forEach(({ type, weight, results }) => {
            results.forEach(result => {
                const key = result.id || result.documentId;
                if (!scoreMap.has(key)) {
                    scoreMap.set(key, {
                        ...result,
                        sources: [],
                        combinedScore: 0
                    });
                }
                
                const entry = scoreMap.get(key);
                entry.sources.push({ type, score: result.score });
                entry.combinedScore += result.score * weight;
            });
        });
        
        // Converte para array e ordena
        const combined = Array.from(scoreMap.values())
            .sort((a, b) => b.combinedScore - a.combinedScore)
            .slice(0, limit);
        
        return combined;
    }

    /**
     * Formata resultados de scroll
     * @private
     */
    formatScrollResults(points) {
        return points.map((point, index) => ({
            id: point.id,
            score: 1.0, // Scroll não tem score
            rank: index + 1,
            documentId: point.payload?.documentId,
            fileName: point.payload?.fileName,
            content: point.payload?.content,
            metadata: point.payload?.metadata || {},
            analysisType: point.payload?.metadata?.analysisType,
            categories: point.payload?.metadata?.categories || [],
            relevanceScore: point.payload?.metadata?.relevanceScore
        }));
    }

    /**
     * Determina tipo de correspondência
     * @private
     */
    determineMatchType(result, query) {
        const content = (result.payload?.content || '').toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (content.includes(queryLower)) {
            return 'exact';
        } else if (result.score > 0.9) {
            return 'semantic_high';
        } else if (result.score > 0.8) {
            return 'semantic_medium';
        } else {
            return 'semantic_low';
        }
    }

    /**
     * Calcula nível de confiança
     * @private
     */
    calculateConfidence(score) {
        if (score > 0.95) return 'very_high';
        if (score > 0.85) return 'high';
        if (score > 0.75) return 'medium';
        if (score > 0.65) return 'low';
        return 'very_low';
    }

    /**
     * Gera highlights do texto
     * @private
     */
    generateHighlights(content, query) {
        const words = query.toLowerCase().split(' ');
        const sentences = content.split(/[.!?]+/);
        const highlights = [];
        
        sentences.forEach(sentence => {
            const sentenceLower = sentence.toLowerCase();
            const matchCount = words.filter(word => 
                word.length > 2 && sentenceLower.includes(word)
            ).length;
            
            if (matchCount > 0) {
                highlights.push({
                    text: sentence.trim(),
                    matchCount: matchCount,
                    relevance: matchCount / words.length
                });
            }
        });
        
        return highlights
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 3);
    }

    /**
     * Gera chave de cache
     * @private
     */
    generateCacheKey(type, query, options) {
        const optionsStr = JSON.stringify(options, Object.keys(options).sort());
        return `${type}_${query}_${this.simpleHash(optionsStr)}`;
    }

    /**
     * Hash simples para cache
     * @private
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Busca no cache
     * @private
     */
    getFromCache(key) {
        if (!this.config.cacheEnabled) return null;
        
        const cached = this.searchCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
            return cached.data;
        }
        
        this.searchCache.delete(key);
        return null;
    }

    /**
     * Salva no cache
     * @private
     */
    saveToCache(key, data) {
        if (!this.config.cacheEnabled) return;
        
        // Limita tamanho do cache
        if (this.searchCache.size >= this.config.maxCacheSize) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        
        this.searchCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Atualiza estatísticas
     * @private
     */
    updateStats(responseTime) {
        const totalSearches = this.stats.searches;
        const currentAvg = this.stats.avgResponseTime;
        
        // Calcula nova média móvel
        this.stats.avgResponseTime = (currentAvg * (totalSearches - 1) + responseTime) / totalSearches;
    }

    /**
     * Atraso útil
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Limpa cache
     */
    clearCache() {
        this.searchCache.clear();
        KC.Logger?.info('SimilaritySearchService', 'Cache limpo');
    }

    /**
     * Retorna estatísticas do serviço
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.searchCache.size,
            cacheHitRate: this.stats.searches > 0 ? 
                (this.stats.cacheHits / this.stats.searches * 100).toFixed(2) + '%' : '0%',
            groundTruthCategories: Object.keys(this.groundTruthCategories || {}).length
        };
    }

    /**
     * Configurar pesos de busca
     */
    setSearchWeights(weights) {
        this.config.weights = { ...this.config.weights, ...weights };
        KC.Logger?.info('SimilaritySearchService', 'Pesos atualizados', this.config.weights);
    }
}

// Registrar no namespace KC
if (typeof window !== 'undefined') {
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KC = window.KnowledgeConsolidator;
    
    // Criar e registrar instância
    KC.SimilaritySearchService = new SimilaritySearchService();
    
    console.log('SimilaritySearchService registrado em KC.SimilaritySearchService');
}