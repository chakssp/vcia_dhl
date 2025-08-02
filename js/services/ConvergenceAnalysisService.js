/**
 * ConvergenceAnalysisService.js - Serviço de Análise de Convergência Semântica
 * 
 * Implementa análise real de convergência entre documentos:
 * - Detecção de temas emergentes
 * - Identificação de cadeias de conhecimento
 * - Análise de evolução temporal
 * - Clustering semântico inteligente
 * 
 * @version 1.0.0
 * @date 30/01/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ConvergenceAnalysisService {
        constructor() {
            this.initialized = false;
            this.embeddingService = null;
            this.similarityThreshold = 0.7; // Threshold para considerar convergência
            this.minChainLength = 3; // Mínimo de documentos para formar uma cadeia
            
            // Cache de análises
            this.convergenceCache = new Map();
            this.themeCache = new Map();
            
            // Estatísticas
            this.stats = {
                documentsAnalyzed: 0,
                chainsDetected: 0,
                themesIdentified: 0,
                insightsGenerated: 0,
                cacheHits: 0,
                cacheMisses: 0
            };
        }

        /**
         * Inicializa o serviço
         */
        async initialize() {
            if (this.initialized) return true;

            try {
                // Verificar dependências
                if (!KC.EmbeddingService) {
                    throw new Error('EmbeddingService não encontrado');
                }

                this.embeddingService = KC.EmbeddingService;
                
                // Verificar se EmbeddingService está inicializado
                if (!await this.embeddingService.checkOllamaAvailability()) {
                    throw new Error('Ollama não está disponível para embeddings');
                }

                this.initialized = true;
                KC.Logger.success('ConvergenceAnalysisService', 'Serviço inicializado com sucesso');
                return true;

            } catch (error) {
                KC.Logger.error('ConvergenceAnalysisService', 'Erro ao inicializar', error);
                return false;
            }
        }

        /**
         * Analisa convergência em um conjunto de documentos
         * @param {Array} documents - Array de documentos para análise
         * @returns {Object} Resultado da análise com cadeias, temas e insights
         */
        async analyzeConvergence(documents) {
            if (!this.initialized) {
                await this.initialize();
            }

            KC.Logger.info('ConvergenceAnalysisService', `Analisando convergência de ${documents.length} documentos`);

            try {
                // 1. Gerar embeddings para todos os documentos
                const documentsWithEmbeddings = await this._generateDocumentEmbeddings(documents);
                
                // 2. Calcular matriz de similaridade
                const similarityMatrix = this._cosineSimilarityMatrix(documentsWithEmbeddings);
                
                // 3. Detectar cadeias de convergência
                const convergenceChains = this._detectConvergenceChains(documentsWithEmbeddings, similarityMatrix);
                
                // 4. Identificar temas emergentes
                const emergentThemes = await this._identifyEmergentThemes(documentsWithEmbeddings, convergenceChains);
                
                // 5. Gerar insights baseados em padrões
                const insights = this._generateInsights(convergenceChains, emergentThemes, documentsWithEmbeddings);
                
                // 6. Calcular scores de convergência para cada documento
                const enrichedDocuments = this._enrichDocumentsWithConvergence(
                    documentsWithEmbeddings, 
                    convergenceChains, 
                    emergentThemes,
                    insights
                );

                // Atualizar estatísticas
                this.stats.documentsAnalyzed += documents.length;
                this.stats.chainsDetected += convergenceChains.length;
                this.stats.themesIdentified += emergentThemes.length;
                this.stats.insightsGenerated += insights.length;

                const result = {
                    documents: enrichedDocuments,
                    convergenceChains,
                    emergentThemes,
                    insights,
                    stats: {
                        totalDocuments: documents.length,
                        chainsFound: convergenceChains.length,
                        themesIdentified: emergentThemes.length,
                        insightsGenerated: insights.length,
                        averageConvergenceScore: this._calculateAverageScore(enrichedDocuments)
                    }
                };

                KC.Logger.success('ConvergenceAnalysisService', 'Análise de convergência concluída', result.stats);
                return result;

            } catch (error) {
                KC.Logger.error('ConvergenceAnalysisService', 'Erro na análise de convergência', error);
                throw error;
            }
        }

        /**
         * Gera embeddings para documentos
         */
        async _generateDocumentEmbeddings(documents) {
            const documentsWithEmbeddings = [];
            
            for (const doc of documents) {
                try {
                    // Criar texto representativo do documento
                    const representativeText = this._createRepresentativeText(doc);
                    
                    // Verificar cache
                    const cacheKey = `doc_${doc.id || doc.name}`;
                    let embedding;
                    
                    if (this.convergenceCache.has(cacheKey)) {
                        embedding = this.convergenceCache.get(cacheKey);
                        this.stats.cacheHits++;
                    } else {
                        embedding = await this.embeddingService.generateEmbedding(representativeText);
                        this.convergenceCache.set(cacheKey, embedding);
                        this.stats.cacheMisses++;
                    }
                    
                    documentsWithEmbeddings.push({
                        ...doc,
                        embedding,
                        representativeText
                    });
                    
                } catch (error) {
                    KC.Logger.warn('ConvergenceAnalysisService', `Erro ao gerar embedding para ${doc.name}`, error);
                    // Continuar com outros documentos
                }
            }
            
            return documentsWithEmbeddings;
        }

        /**
         * Cria texto representativo do documento para embedding
         */
        _createRepresentativeText(doc) {
            const parts = [];
            
            // Nome e tipo de análise
            parts.push(`Arquivo: ${doc.name}`);
            if (doc.analysisType) parts.push(`Tipo: ${doc.analysisType}`);
            
            // Categorias
            if (doc.categories?.length > 0) {
                parts.push(`Categorias: ${doc.categories.join(', ')}`);
            }
            
            // Preview ou conteúdo inicial
            if (doc.smartPreview) {
                parts.push(doc.smartPreview);
            } else if (doc.preview) {
                parts.push(doc.preview);
            } else if (doc.content) {
                parts.push(doc.content.substring(0, 500));
            }
            
            // Análise IA se existir
            if (doc.aiAnalysis?.summary) {
                parts.push(`Análise: ${doc.aiAnalysis.summary}`);
            }
            
            return parts.join('\n');
        }

        /**
         * Calcula matriz de similaridade entre documentos
         */
        _cosineSimilarityMatrix(documents) {
            const n = documents.length;
            const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
            
            for (let i = 0; i < n; i++) {
                for (let j = i; j < n; j++) {
                    if (i === j) {
                        matrix[i][j] = 1.0;
                    } else {
                        const similarity = this.embeddingService.cosineSimilarity(
                            documents[i].embedding,
                            documents[j].embedding
                        );
                        matrix[i][j] = similarity;
                        matrix[j][i] = similarity;
                    }
                }
            }
            
            return matrix;
        }

        /**
         * Detecta cadeias de convergência baseadas em similaridade
         */
        _detectConvergenceChains(documents, similarityMatrix) {
            const chains = [];
            const visited = new Set();
            
            // Para cada documento não visitado
            for (let i = 0; i < documents.length; i++) {
                if (visited.has(i)) continue;
                
                // Encontrar documentos similares (DFS)
                const chain = this._findSimilarDocuments(i, documents, similarityMatrix, visited);
                
                // Se a cadeia tem tamanho mínimo, é uma cadeia de convergência
                if (chain.length >= this.minChainLength) {
                    const chainId = `chain_${Date.now()}_${chains.length}`;
                    
                    // Calcular tema da cadeia
                    const theme = this._extractChainTheme(chain.map(idx => documents[idx]));
                    
                    // Calcular força da convergência
                    const strength = this._calculateChainStrength(chain, similarityMatrix);
                    
                    chains.push({
                        chainId,
                        theme,
                        strength,
                        participants: chain.map(idx => documents[idx].name),
                        participantIndices: chain,
                        centerDocument: this._findCenterDocument(chain, similarityMatrix),
                        temporalSpan: this._calculateTemporalSpan(chain.map(idx => documents[idx]))
                    });
                }
            }
            
            return chains;
        }

        /**
         * Busca em profundidade para encontrar documentos similares
         */
        _findSimilarDocuments(startIdx, documents, similarityMatrix, visited) {
            const chain = [startIdx];
            visited.add(startIdx);
            
            const queue = [startIdx];
            
            while (queue.length > 0) {
                const current = queue.shift();
                
                // Buscar vizinhos similares
                for (let i = 0; i < documents.length; i++) {
                    if (!visited.has(i) && similarityMatrix[current][i] >= this.similarityThreshold) {
                        visited.add(i);
                        chain.push(i);
                        queue.push(i);
                    }
                }
            }
            
            return chain;
        }

        /**
         * Extrai tema principal de uma cadeia
         */
        _extractChainTheme(documents) {
            // Contar categorias mais comuns
            const categoryCount = new Map();
            documents.forEach(doc => {
                // CORREÇÃO: Extrair nomes das categorias ao invés de usar objetos
                const categoryNames = (doc.categories || []).map(cat => {
                    // Se for objeto, pegar o nome; se for string, usar diretamente
                    return typeof cat === 'object' ? (cat.name || cat.id || 'Sem nome') : cat;
                });
                categoryNames.forEach(catName => {
                    categoryCount.set(catName, (categoryCount.get(catName) || 0) + 1);
                });
            });
            
            // Contar tipos de análise
            const analysisTypeCount = new Map();
            documents.forEach(doc => {
                if (doc.analysisType) {
                    analysisTypeCount.set(doc.analysisType, (analysisTypeCount.get(doc.analysisType) || 0) + 1);
                }
            });
            
            // Determinar tema baseado em frequências
            let theme = '';
            
            if (categoryCount.size > 0) {
                const topCategory = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0];
                theme = topCategory[0];
                
                // DEBUG: Log para verificar o valor
                KC.Logger?.debug('ConvergenceAnalysisService', 'Top category encontrada', {
                    categoryName: topCategory[0],
                    count: topCategory[1],
                    type: typeof topCategory[0]
                });
            }
            
            if (analysisTypeCount.size > 0) {
                const topType = [...analysisTypeCount.entries()].sort((a, b) => b[1] - a[1])[0];
                if (theme) {
                    theme += ` - ${topType[0]}`;
                } else {
                    theme = topType[0];
                }
            }
            
            return theme || 'Tema Emergente';
        }

        /**
         * Calcula força de uma cadeia de convergência
         */
        _calculateChainStrength(chain, similarityMatrix) {
            if (chain.length < 2) return 0;
            
            let totalSimilarity = 0;
            let count = 0;
            
            for (let i = 0; i < chain.length; i++) {
                for (let j = i + 1; j < chain.length; j++) {
                    totalSimilarity += similarityMatrix[chain[i]][chain[j]];
                    count++;
                }
            }
            
            return count > 0 ? totalSimilarity / count : 0;
        }

        /**
         * Encontra documento central de uma cadeia
         */
        _findCenterDocument(chain, similarityMatrix) {
            let maxAvgSimilarity = -1;
            let centerIdx = 0;
            
            for (const idx of chain) {
                let totalSim = 0;
                for (const otherIdx of chain) {
                    if (idx !== otherIdx) {
                        totalSim += similarityMatrix[idx][otherIdx];
                    }
                }
                const avgSim = totalSim / (chain.length - 1);
                
                if (avgSim > maxAvgSimilarity) {
                    maxAvgSimilarity = avgSim;
                    centerIdx = idx;
                }
            }
            
            return centerIdx;
        }

        /**
         * Calcula span temporal de documentos
         */
        _calculateTemporalSpan(documents) {
            const dates = documents
                .map(doc => doc.lastModified || doc.createdAt)
                .filter(date => date)
                .map(date => new Date(date).getTime());
            
            if (dates.length === 0) return null;
            
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            const spanDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
            
            return {
                start: minDate.toISOString(),
                end: maxDate.toISOString(),
                spanDays
            };
        }

        /**
         * Identifica temas emergentes através de clustering
         */
        async _identifyEmergentThemes(documents, chains) {
            const themes = [];
            
            // Agrupar documentos não incluídos em cadeias
            const inChain = new Set();
            chains.forEach(chain => {
                chain.participantIndices.forEach(idx => inChain.add(idx));
            });
            
            const unchainedDocs = documents.filter((_, idx) => !inChain.has(idx));
            
            // Identificar micro-clusters em documentos não encadeados
            if (unchainedDocs.length > 0) {
                const microClusters = this._findMicroClusters(unchainedDocs);
                
                microClusters.forEach((cluster, idx) => {
                    if (cluster.length >= 2) { // Pelo menos 2 documentos
                        themes.push({
                            themeId: `theme_${Date.now()}_${idx}`,
                            name: this._extractChainTheme(cluster),
                            type: 'emergent',
                            strength: this._calculateClusterCoherence(cluster),
                            documents: cluster.map(doc => doc.name),
                            keywords: this._extractKeywords(cluster)
                        });
                    }
                });
            }
            
            // Analisar temas cross-chain
            if (chains.length > 1) {
                const crossThemes = this._findCrossChainThemes(chains, documents);
                themes.push(...crossThemes);
            }
            
            return themes;
        }

        /**
         * Encontra micro-clusters usando similaridade
         */
        _findMicroClusters(documents) {
            const clusters = [];
            const assigned = new Set();
            
            for (let i = 0; i < documents.length; i++) {
                if (assigned.has(i)) continue;
                
                const cluster = [documents[i]];
                assigned.add(i);
                
                // Encontrar documentos similares
                for (let j = i + 1; j < documents.length; j++) {
                    if (!assigned.has(j)) {
                        const similarity = this.embeddingService.cosineSimilarity(
                            documents[i].embedding,
                            documents[j].embedding
                        );
                        
                        if (similarity >= this.similarityThreshold * 0.8) { // Threshold mais baixo para micro-clusters
                            cluster.push(documents[j]);
                            assigned.add(j);
                        }
                    }
                }
                
                clusters.push(cluster);
            }
            
            return clusters;
        }

        /**
         * Calcula coerência de um cluster
         */
        _calculateClusterCoherence(cluster) {
            if (cluster.length < 2) return 0;
            
            let totalSim = 0;
            let count = 0;
            
            for (let i = 0; i < cluster.length; i++) {
                for (let j = i + 1; j < cluster.length; j++) {
                    totalSim += this.embeddingService.cosineSimilarity(
                        cluster[i].embedding,
                        cluster[j].embedding
                    );
                    count++;
                }
            }
            
            return count > 0 ? totalSim / count : 0;
        }

        /**
         * Extrai palavras-chave de um cluster
         */
        _extractKeywords(documents) {
            const wordFreq = new Map();
            
            documents.forEach(doc => {
                const text = doc.representativeText || doc.content || '';
                const words = text.toLowerCase().split(/\s+/)
                    .filter(word => word.length > 4) // Palavras com mais de 4 caracteres
                    .filter(word => !this._isStopWord(word));
                
                words.forEach(word => {
                    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
                });
            });
            
            // Retornar top 5 palavras
            return [...wordFreq.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([word]) => word);
        }

        /**
         * Verifica se é stopword
         */
        _isStopWord(word) {
            const stopWords = new Set([
                'para', 'com', 'sem', 'sobre', 'após', 'antes', 'durante',
                'através', 'entre', 'dentro', 'fora', 'acima', 'abaixo',
                'este', 'esse', 'aquele', 'esta', 'essa', 'aquela'
            ]);
            return stopWords.has(word);
        }

        /**
         * Encontra temas que cruzam múltiplas cadeias
         */
        _findCrossChainThemes(chains, documents) {
            const themes = [];
            
            // Analisar similaridade entre centros de cadeias
            for (let i = 0; i < chains.length; i++) {
                for (let j = i + 1; j < chains.length; j++) {
                    const chain1Center = documents[chains[i].centerDocument];
                    const chain2Center = documents[chains[j].centerDocument];
                    
                    const similarity = this.embeddingService.cosineSimilarity(
                        chain1Center.embedding,
                        chain2Center.embedding
                    );
                    
                    if (similarity >= this.similarityThreshold * 0.7) {
                        themes.push({
                            themeId: `cross_theme_${i}_${j}`,
                            name: `Convergência: ${chains[i].theme} ↔ ${chains[j].theme}`,
                            type: 'cross-chain',
                            strength: similarity,
                            involvedChains: [chains[i].chainId, chains[j].chainId],
                            bridgeDocuments: this._findBridgeDocuments(chains[i], chains[j], documents)
                        });
                    }
                }
            }
            
            return themes;
        }

        /**
         * Encontra documentos ponte entre cadeias
         */
        _findBridgeDocuments(chain1, chain2, documents) {
            const bridges = [];
            
            for (const idx1 of chain1.participantIndices) {
                for (const idx2 of chain2.participantIndices) {
                    const similarity = this.embeddingService.cosineSimilarity(
                        documents[idx1].embedding,
                        documents[idx2].embedding
                    );
                    
                    if (similarity >= this.similarityThreshold * 0.8) {
                        bridges.push({
                            doc1: documents[idx1].name,
                            doc2: documents[idx2].name,
                            similarity
                        });
                    }
                }
            }
            
            return bridges;
        }

        /**
         * Gera insights baseados em padrões detectados
         */
        _generateInsights(chains, themes, documents) {
            const insights = [];
            
            // Insight 1: Cadeias de convergência fortes
            chains.filter(chain => chain.strength > 0.85).forEach(chain => {
                insights.push({
                    type: 'strong_convergence',
                    content: `Forte convergência detectada em "${chain.theme}" com ${chain.participants.length} documentos relacionados`,
                    confidence: chain.strength,
                    relatedFiles: chain.participants,
                    metadata: {
                        chainId: chain.chainId,
                        temporalSpan: chain.temporalSpan
                    }
                });
            });
            
            // Insight 2: Evolução temporal
            const temporalChains = chains.filter(chain => chain.temporalSpan && chain.temporalSpan.spanDays > 30);
            temporalChains.forEach(chain => {
                insights.push({
                    type: 'temporal_evolution',
                    content: `Evolução de "${chain.theme}" ao longo de ${chain.temporalSpan.spanDays} dias`,
                    confidence: 0.8,
                    relatedFiles: chain.participants,
                    metadata: {
                        startDate: chain.temporalSpan.start,
                        endDate: chain.temporalSpan.end
                    }
                });
            });
            
            // Insight 3: Temas emergentes
            themes.filter(theme => theme.type === 'emergent').forEach(theme => {
                insights.push({
                    type: 'emergent_theme',
                    content: `Tema emergente identificado: "${theme.name}" com palavras-chave: ${theme.keywords.join(', ')}`,
                    confidence: theme.strength,
                    relatedFiles: theme.documents
                });
            });
            
            // Insight 4: Convergência cross-chain
            themes.filter(theme => theme.type === 'cross-chain').forEach(theme => {
                insights.push({
                    type: 'cross_domain_convergence',
                    content: `Convergência entre domínios detectada: ${theme.name}`,
                    confidence: theme.strength,
                    relatedFiles: theme.bridgeDocuments.map(b => b.doc1).concat(
                        theme.bridgeDocuments.map(b => b.doc2)
                    ),
                    metadata: {
                        involvedChains: theme.involvedChains
                    }
                });
            });
            
            // Insight 5: Documentos centrais (hubs)
            const hubDocuments = this._identifyHubDocuments(documents, chains);
            hubDocuments.forEach(hub => {
                insights.push({
                    type: 'knowledge_hub',
                    content: `"${hub.name}" é um hub de conhecimento conectando ${hub.connections} conceitos`,
                    confidence: 0.9,
                    relatedFiles: [hub.name],
                    metadata: {
                        centrality: hub.centrality
                    }
                });
            });
            
            return insights;
        }

        /**
         * Identifica documentos hub (alta conectividade)
         */
        _identifyHubDocuments(documents, chains) {
            const connectionCount = new Map();
            
            // Contar conexões de cada documento
            chains.forEach(chain => {
                chain.participantIndices.forEach(idx => {
                    const doc = documents[idx];
                    connectionCount.set(doc.name, (connectionCount.get(doc.name) || 0) + chain.participants.length - 1);
                });
            });
            
            // Filtrar hubs (documentos com muitas conexões)
            const hubs = [];
            const avgConnections = Array.from(connectionCount.values()).reduce((a, b) => a + b, 0) / connectionCount.size;
            
            connectionCount.forEach((connections, docName) => {
                if (connections > avgConnections * 2) { // 2x a média
                    const doc = documents.find(d => d.name === docName);
                    if (doc) {
                        hubs.push({
                            name: docName,
                            connections,
                            centrality: connections / documents.length
                        });
                    }
                }
            });
            
            return hubs.sort((a, b) => b.connections - a.connections).slice(0, 5);
        }

        /**
         * Enriquece documentos com dados de convergência
         */
        _enrichDocumentsWithConvergence(documents, chains, themes, insights) {
            return documents.map((doc, idx) => {
                // Encontrar cadeias que incluem este documento
                const docChains = chains.filter(chain => 
                    chain.participantIndices.includes(idx)
                );
                
                // Calcular score de convergência
                let convergenceScore = doc.relevanceScore || 0;
                
                // Adicionar pontos por participação em cadeias
                convergenceScore += docChains.length * 10;
                
                // Adicionar pontos por força das cadeias
                docChains.forEach(chain => {
                    convergenceScore += chain.strength * 15;
                });
                
                // Adicionar pontos se é documento central
                const isCentral = chains.some(chain => chain.centerDocument === idx);
                if (isCentral) convergenceScore += 20;
                
                // Limitar a 100
                convergenceScore = Math.min(convergenceScore, 100);
                
                // Encontrar insights relacionados
                const relatedInsights = insights.filter(insight => 
                    insight.relatedFiles.includes(doc.name)
                );
                
                return {
                    ...doc,
                    convergenceScore,
                    convergenceChains: docChains.map(chain => ({
                        chainId: chain.chainId,
                        theme: chain.theme,
                        strength: chain.strength,
                        participants: chain.participants
                    })),
                    insights: relatedInsights,
                    convergenceMetadata: {
                        isHub: isCentral,
                        chainCount: docChains.length,
                        strongestChain: docChains.sort((a, b) => b.strength - a.strength)[0]?.theme || null,
                        relatedThemes: themes.filter(theme => 
                            theme.documents?.includes(doc.name)
                        ).map(t => t.name)
                    }
                };
            });
        }

        /**
         * Calcula score médio de convergência
         */
        _calculateAverageScore(documents) {
            const scores = documents.map(doc => doc.convergenceScore || 0);
            return scores.reduce((a, b) => a + b, 0) / scores.length;
        }

        /**
         * Limpa cache de análises
         */
        clearCache() {
            this.convergenceCache.clear();
            this.themeCache.clear();
            KC.Logger.info('ConvergenceAnalysisService', 'Cache limpo');
        }

        /**
         * Retorna estatísticas do serviço
         */
        getStats() {
            return {
                ...this.stats,
                cacheSize: this.convergenceCache.size,
                initialized: this.initialized
            };
        }
    }

    // Registrar no KC
    KC.ConvergenceAnalysisService = new ConvergenceAnalysisService();
    
    // Expor globalmente para debug
    window.ConvergenceAnalysisService = ConvergenceAnalysisService;

})(window);