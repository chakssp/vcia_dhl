/**
 * SemanticConvergenceService.js - Serviço de Convergência Semântica
 * 
 * Implementa o paradigma de convergência: Keywords ∩ Categories ∩ AnalysisType ∩ Temporal = CONVERGENCE
 * Integra com Qdrant para busca vetorial e análise de convergência
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class SemanticConvergenceService {
        constructor() {
            this.qdrantService = KC.QdrantService;
            this.embeddingService = KC.EmbeddingService;
            
            // Dimensões de convergência
            this.dimensions = {
                keywords: {
                    weight: 0.25,
                    active: true,
                    threshold: 0.3
                },
                categories: {
                    weight: 0.25,
                    active: true,
                    threshold: 0.4
                },
                analysisType: {
                    weight: 0.25,
                    active: true,
                    threshold: 0.5
                },
                temporal: {
                    weight: 0.25,
                    active: true,
                    threshold: 0.2
                }
            };

            // Cache de convergências
            this.convergenceCache = new Map();
            
            // Histórico de convergências
            this.convergenceHistory = [];
            
            // Padrões de convergência descobertos
            this.discoveredPatterns = [];

            // Configuração de busca híbrida
            this.hybridSearchConfig = {
                vectorWeight: 0.6,
                keywordWeight: 0.4,
                minScore: 0.3,
                maxResults: 100
            };

            this.initialize();
        }

        /**
         * Inicializa o serviço
         */
        async initialize() {
            try {
                // Verifica conexão com Qdrant
                const qdrantStatus = await this.qdrantService.checkConnection();
                if (!qdrantStatus.success) {
                    Logger.warn('SemanticConvergence', 'Qdrant não disponível, usando modo offline');
                }

                // Carrega padrões salvos
                this.loadSavedPatterns();

                Logger.info('SemanticConvergence', 'Serviço inicializado', {
                    dimensions: Object.keys(this.dimensions),
                    qdrantAvailable: qdrantStatus.success
                });

            } catch (error) {
                Logger.error('SemanticConvergence', 'Erro na inicialização', error);
            }
        }

        /**
         * Analisa convergência semântica de um conjunto de arquivos
         */
        async analyzeConvergence(files, options = {}) {
            const startTime = Date.now();
            
            try {
                // Prepara dados para análise
                const preparedData = await this.prepareFilesForAnalysis(files);
                
                // Calcula scores de convergência para cada dimensão
                const convergenceScores = await this.calculateConvergenceScores(preparedData);
                
                // Identifica pontos de convergência
                const convergencePoints = this.identifyConvergencePoints(convergenceScores);
                
                // Descobre novos padrões
                const newPatterns = this.discoverPatterns(convergencePoints);
                
                // Gera insights
                const insights = this.generateInsights(convergencePoints, newPatterns);
                
                // Salva no histórico
                this.saveToHistory({
                    timestamp: new Date().toISOString(),
                    filesAnalyzed: files.length,
                    convergencePoints: convergencePoints.length,
                    newPatterns: newPatterns.length,
                    insights: insights
                });

                const result = {
                    success: true,
                    analysisTime: Date.now() - startTime,
                    filesAnalyzed: files.length,
                    convergencePoints: convergencePoints,
                    patterns: newPatterns,
                    insights: insights,
                    scores: convergenceScores,
                    recommendations: this.generateRecommendations(convergencePoints)
                };

                // Cacheia resultado
                this.cacheResult(files, result);

                return result;

            } catch (error) {
                Logger.error('SemanticConvergence', 'Erro na análise', error);
                return {
                    success: false,
                    error: error.message,
                    analysisTime: Date.now() - startTime
                };
            }
        }

        /**
         * Prepara arquivos para análise
         */
        async prepareFilesForAnalysis(files) {
            const prepared = [];

            for (const file of files) {
                // Extrai features semânticas
                const features = await this.extractSemanticFeatures(file);
                
                // Gera embedding se disponível
                let embedding = null;
                if (this.embeddingService && file.content) {
                    try {
                        embedding = await this.embeddingService.generateEmbedding(
                            file.content || file.preview?.preview || ''
                        );
                    } catch (e) {
                        // Continua sem embedding
                    }
                }

                prepared.push({
                    file: file,
                    features: features,
                    embedding: embedding,
                    metadata: this.extractMetadata(file)
                });
            }

            return prepared;
        }

        /**
         * Extrai features semânticas
         */
        async extractSemanticFeatures(file) {
            const features = {
                keywords: [],
                entities: [],
                concepts: [],
                sentiment: null,
                topics: [],
                temporalMarkers: []
            };

            const content = file.content || file.preview?.preview || '';
            if (!content) return features;

            // Extrai keywords
            features.keywords = this.extractKeywords(content);
            
            // Extrai entidades nomeadas
            features.entities = this.extractEntities(content);
            
            // Extrai conceitos
            features.concepts = this.extractConcepts(content);
            
            // Analisa sentimento
            features.sentiment = this.analyzeSentiment(content);
            
            // Identifica tópicos
            features.topics = this.identifyTopics(content);
            
            // Extrai marcadores temporais
            features.temporalMarkers = this.extractTemporalMarkers(content);

            return features;
        }

        /**
         * Calcula scores de convergência
         */
        async calculateConvergenceScores(preparedData) {
            const scores = {
                keywords: await this.calculateKeywordConvergence(preparedData),
                categories: await this.calculateCategoryConvergence(preparedData),
                analysisType: await this.calculateAnalysisConvergence(preparedData),
                temporal: await this.calculateTemporalConvergence(preparedData),
                overall: 0
            };

            // Calcula score geral ponderado
            scores.overall = Object.keys(this.dimensions).reduce((sum, dim) => {
                const dimScore = scores[dim] || 0;
                const weight = this.dimensions[dim].weight;
                return sum + (dimScore * weight);
            }, 0);

            return scores;
        }

        /**
         * Calcula convergência de keywords
         */
        async calculateKeywordConvergence(data) {
            const allKeywords = data.flatMap(d => d.features.keywords);
            const keywordFreq = this.calculateFrequency(allKeywords);
            
            // Identifica keywords convergentes (aparecem em múltiplos arquivos)
            const convergentKeywords = Object.entries(keywordFreq)
                .filter(([keyword, freq]) => freq > 1)
                .sort((a, b) => b[1] - a[1]);

            // Calcula score baseado na convergência
            const maxConvergence = Math.min(data.length, 10);
            const convergenceScore = convergentKeywords.length > 0 ?
                Math.min(convergentKeywords[0][1] / maxConvergence, 1) : 0;

            return convergenceScore;
        }

        /**
         * Calcula convergência de categorias
         */
        async calculateCategoryConvergence(data) {
            const categories = data.map(d => d.file.categories || []).flat();
            const categoryFreq = this.calculateFrequency(categories);
            
            // Score baseado na concentração de categorias
            const uniqueCategories = Object.keys(categoryFreq).length;
            const totalCategories = categories.length;
            
            if (totalCategories === 0) return 0;
            
            // Quanto menor a diversidade, maior a convergência
            const convergenceScore = 1 - (uniqueCategories / totalCategories);
            
            return Math.max(0, Math.min(1, convergenceScore));
        }

        /**
         * Calcula convergência de tipo de análise
         */
        async calculateAnalysisConvergence(data) {
            const analysisTypes = data.map(d => d.file.analysisType).filter(Boolean);
            
            if (analysisTypes.length === 0) return 0;
            
            const typeFreq = this.calculateFrequency(analysisTypes);
            const dominantType = Object.entries(typeFreq)
                .sort((a, b) => b[1] - a[1])[0];
            
            // Score baseado na dominância de um tipo
            const convergenceScore = dominantType ? 
                dominantType[1] / analysisTypes.length : 0;
            
            return convergenceScore;
        }

        /**
         * Calcula convergência temporal
         */
        async calculateTemporalConvergence(data) {
            const timestamps = data.map(d => new Date(d.file.lastModified).getTime());
            
            if (timestamps.length < 2) return 0;
            
            // Calcula desvio padrão dos timestamps
            const mean = timestamps.reduce((a, b) => a + b) / timestamps.length;
            const variance = timestamps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timestamps.length;
            const stdDev = Math.sqrt(variance);
            
            // Normaliza o desvio (menor desvio = maior convergência)
            const maxDev = 365 * 24 * 60 * 60 * 1000; // 1 ano em ms
            const convergenceScore = Math.max(0, 1 - (stdDev / maxDev));
            
            return convergenceScore;
        }

        /**
         * Identifica pontos de convergência
         */
        identifyConvergencePoints(scores) {
            const points = [];
            const threshold = 0.6; // Threshold para considerar convergência significativa

            // Verifica convergência geral
            if (scores.overall >= threshold) {
                points.push({
                    type: 'general',
                    score: scores.overall,
                    dimensions: this.getActiveDimensions(scores),
                    strength: this.calculateStrength(scores.overall)
                });
            }

            // Verifica convergências específicas
            Object.entries(scores).forEach(([dimension, score]) => {
                if (dimension !== 'overall' && score >= this.dimensions[dimension]?.threshold) {
                    points.push({
                        type: 'dimensional',
                        dimension: dimension,
                        score: score,
                        strength: this.calculateStrength(score)
                    });
                }
            });

            return points;
        }

        /**
         * Descobre padrões
         */
        discoverPatterns(convergencePoints) {
            const patterns = [];

            // Analisa sequências de convergência
            if (convergencePoints.length >= 3) {
                const sequence = convergencePoints.map(p => p.type).join('-');
                
                if (!this.discoveredPatterns.some(p => p.sequence === sequence)) {
                    patterns.push({
                        id: `pattern-${Date.now()}`,
                        sequence: sequence,
                        frequency: 1,
                        firstSeen: new Date().toISOString(),
                        significance: this.calculatePatternSignificance(convergencePoints)
                    });
                }
            }

            // Analisa co-ocorrências
            const coOccurrences = this.findCoOccurrences(convergencePoints);
            coOccurrences.forEach(co => {
                patterns.push({
                    id: `co-${Date.now()}`,
                    type: 'co-occurrence',
                    dimensions: co.dimensions,
                    strength: co.strength
                });
            });

            // Adiciona aos padrões descobertos
            this.discoveredPatterns.push(...patterns);

            return patterns;
        }

        /**
         * Gera insights
         */
        generateInsights(convergencePoints, patterns) {
            const insights = [];

            // Insight sobre força da convergência
            const avgScore = convergencePoints.reduce((sum, p) => sum + p.score, 0) / convergencePoints.length;
            if (avgScore > 0.8) {
                insights.push({
                    type: 'high-convergence',
                    message: 'Forte convergência detectada - possível momento decisivo identificado',
                    confidence: avgScore,
                    actionable: true
                });
            }

            // Insight sobre padrões
            if (patterns.length > 0) {
                insights.push({
                    type: 'pattern-detected',
                    message: `${patterns.length} novo(s) padrão(ões) de convergência descoberto(s)`,
                    patterns: patterns.map(p => p.id),
                    actionable: true
                });
            }

            // Insight sobre dimensões dominantes
            const dominantDimensions = convergencePoints
                .filter(p => p.type === 'dimensional')
                .sort((a, b) => b.score - a.score);
            
            if (dominantDimensions.length > 0) {
                insights.push({
                    type: 'dominant-dimension',
                    message: `Convergência mais forte na dimensão: ${dominantDimensions[0].dimension}`,
                    dimension: dominantDimensions[0].dimension,
                    score: dominantDimensions[0].score
                });
            }

            return insights;
        }

        /**
         * Gera recomendações
         */
        generateRecommendations(convergencePoints) {
            const recommendations = [];

            convergencePoints.forEach(point => {
                if (point.score > 0.8) {
                    recommendations.push({
                        priority: 'high',
                        action: 'analyze-deeply',
                        reason: 'Alta convergência detectada',
                        confidence: point.score
                    });
                } else if (point.score > 0.6) {
                    recommendations.push({
                        priority: 'medium',
                        action: 'review',
                        reason: 'Convergência moderada',
                        confidence: point.score
                    });
                }
            });

            // Recomendações específicas por dimensão
            if (convergencePoints.some(p => p.dimension === 'temporal' && p.score > 0.7)) {
                recommendations.push({
                    priority: 'high',
                    action: 'create-timeline',
                    reason: 'Forte convergência temporal - criar linha do tempo',
                    confidence: 0.85
                });
            }

            if (convergencePoints.some(p => p.dimension === 'keywords' && p.score > 0.7)) {
                recommendations.push({
                    priority: 'medium',
                    action: 'extract-themes',
                    reason: 'Convergência de keywords - extrair temas principais',
                    confidence: 0.75
                });
            }

            return recommendations;
        }

        /**
         * Busca híbrida com convergência
         */
        async hybridSearchWithConvergence(query, options = {}) {
            try {
                // Busca vetorial
                let vectorResults = [];
                if (this.qdrantService && this.embeddingService) {
                    const embedding = await this.embeddingService.generateEmbedding(query);
                    vectorResults = await this.qdrantService.search({
                        vector: embedding,
                        limit: options.limit || 50
                    });
                }

                // Busca por keywords
                const keywordResults = await this.keywordSearch(query, options);

                // Combina resultados
                const combinedResults = this.combineSearchResults(
                    vectorResults,
                    keywordResults,
                    this.hybridSearchConfig
                );

                // Analisa convergência dos resultados
                const convergenceAnalysis = await this.analyzeConvergence(
                    combinedResults.map(r => r.file)
                );

                return {
                    success: true,
                    results: combinedResults,
                    convergence: convergenceAnalysis,
                    query: query,
                    method: 'hybrid',
                    timestamp: new Date().toISOString()
                };

            } catch (error) {
                Logger.error('SemanticConvergence', 'Erro na busca híbrida', error);
                return {
                    success: false,
                    error: error.message,
                    results: []
                };
            }
        }

        /**
         * Busca por keywords
         */
        async keywordSearch(query, options = {}) {
            const files = KC.AppState.get('files') || [];
            const queryKeywords = this.extractKeywords(query.toLowerCase());
            
            const results = files.map(file => {
                const content = (file.content || file.preview?.preview || '').toLowerCase();
                const fileKeywords = this.extractKeywords(content);
                
                // Calcula score de match
                const matchScore = this.calculateKeywordMatch(queryKeywords, fileKeywords);
                
                return {
                    file: file,
                    score: matchScore,
                    method: 'keyword'
                };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, options.limit || 50);

            return results;
        }

        /**
         * Combina resultados de busca
         */
        combineSearchResults(vectorResults, keywordResults, config) {
            const combined = new Map();

            // Adiciona resultados vetoriais
            vectorResults.forEach(result => {
                const id = result.file.id || result.file.name;
                combined.set(id, {
                    file: result.file,
                    vectorScore: result.score * config.vectorWeight,
                    keywordScore: 0,
                    totalScore: result.score * config.vectorWeight
                });
            });

            // Adiciona/combina resultados de keyword
            keywordResults.forEach(result => {
                const id = result.file.id || result.file.name;
                if (combined.has(id)) {
                    const existing = combined.get(id);
                    existing.keywordScore = result.score * config.keywordWeight;
                    existing.totalScore = existing.vectorScore + existing.keywordScore;
                } else {
                    combined.set(id, {
                        file: result.file,
                        vectorScore: 0,
                        keywordScore: result.score * config.keywordWeight,
                        totalScore: result.score * config.keywordWeight
                    });
                }
            });

            // Converte para array e ordena
            return Array.from(combined.values())
                .filter(r => r.totalScore >= config.minScore)
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, config.maxResults);
        }

        /**
         * Utilitários
         */
        
        extractKeywords(text) {
            if (!text) return [];
            
            // Keywords importantes para convergência
            const importantWords = [
                'decisão', 'projeto', 'crítico', 'importante', 'estratégia',
                'objetivo', 'meta', 'resultado', 'impacto', 'mudança',
                'transformação', 'inovação', 'solução', 'problema', 'desafio'
            ];
            
            const words = text.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 3)
                .filter(w => !this.isStopWord(w));
            
            // Prioriza palavras importantes
            return words.filter(w => importantWords.includes(w) || w.length > 5);
        }

        extractEntities(text) {
            const entities = [];
            
            // Regex patterns para entidades
            const patterns = {
                email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
                date: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
                number: /\b\d+([.,]\d+)?\b/g
            };
            
            Object.entries(patterns).forEach(([type, pattern]) => {
                const matches = text.match(pattern) || [];
                matches.forEach(match => {
                    entities.push({ type, value: match });
                });
            });
            
            return entities;
        }

        extractConcepts(text) {
            // Conceitos de alto nível
            const concepts = [];
            const conceptPatterns = [
                { pattern: /strateg/i, concept: 'estratégia' },
                { pattern: /decis/i, concept: 'decisão' },
                { pattern: /projet/i, concept: 'projeto' },
                { pattern: /process/i, concept: 'processo' },
                { pattern: /transform/i, concept: 'transformação' }
            ];
            
            conceptPatterns.forEach(({ pattern, concept }) => {
                if (pattern.test(text)) {
                    concepts.push(concept);
                }
            });
            
            return [...new Set(concepts)];
        }

        analyzeSentiment(text) {
            // Análise simples de sentimento
            const positive = ['sucesso', 'ótimo', 'excelente', 'positivo', 'ganho'];
            const negative = ['problema', 'falha', 'erro', 'negativo', 'perda'];
            
            let score = 0;
            const words = text.toLowerCase().split(/\s+/);
            
            words.forEach(word => {
                if (positive.includes(word)) score++;
                if (negative.includes(word)) score--;
            });
            
            return {
                score: score,
                sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
            };
        }

        identifyTopics(text) {
            // Identificação básica de tópicos
            const topics = [];
            const topicKeywords = {
                'tecnologia': ['software', 'sistema', 'código', 'api', 'dados'],
                'negócio': ['cliente', 'venda', 'mercado', 'receita', 'custo'],
                'gestão': ['equipe', 'projeto', 'prazo', 'meta', 'objetivo'],
                'pessoal': ['aprendizado', 'desenvolvimento', 'carreira', 'skill']
            };
            
            const words = text.toLowerCase().split(/\s+/);
            
            Object.entries(topicKeywords).forEach(([topic, keywords]) => {
                if (keywords.some(kw => words.includes(kw))) {
                    topics.push(topic);
                }
            });
            
            return topics;
        }

        extractTemporalMarkers(text) {
            const markers = [];
            const patterns = [
                { pattern: /hoje/i, marker: 'present' },
                { pattern: /ontem/i, marker: 'past-1d' },
                { pattern: /semana passada/i, marker: 'past-7d' },
                { pattern: /mês passado/i, marker: 'past-30d' },
                { pattern: /ano passado/i, marker: 'past-365d' },
                { pattern: /amanhã/i, marker: 'future-1d' },
                { pattern: /próxima semana/i, marker: 'future-7d' },
                { pattern: /próximo mês/i, marker: 'future-30d' }
            ];
            
            patterns.forEach(({ pattern, marker }) => {
                if (pattern.test(text)) {
                    markers.push(marker);
                }
            });
            
            return markers;
        }

        extractMetadata(file) {
            return {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                path: file.path,
                categories: file.categories || [],
                analysisType: file.analysisType
            };
        }

        calculateFrequency(items) {
            const freq = {};
            items.forEach(item => {
                freq[item] = (freq[item] || 0) + 1;
            });
            return freq;
        }

        calculateStrength(score) {
            if (score >= 0.9) return 'very-strong';
            if (score >= 0.7) return 'strong';
            if (score >= 0.5) return 'moderate';
            if (score >= 0.3) return 'weak';
            return 'very-weak';
        }

        getActiveDimensions(scores) {
            return Object.entries(scores)
                .filter(([dim, score]) => dim !== 'overall' && score > 0.3)
                .map(([dim]) => dim);
        }

        calculatePatternSignificance(points) {
            const avgScore = points.reduce((sum, p) => sum + p.score, 0) / points.length;
            const diversity = new Set(points.map(p => p.type)).size / points.length;
            return avgScore * diversity;
        }

        findCoOccurrences(points) {
            const coOccurrences = [];
            
            for (let i = 0; i < points.length - 1; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    if (points[i].dimension && points[j].dimension && 
                        points[i].dimension !== points[j].dimension) {
                        coOccurrences.push({
                            dimensions: [points[i].dimension, points[j].dimension],
                            strength: (points[i].score + points[j].score) / 2
                        });
                    }
                }
            }
            
            return coOccurrences;
        }

        calculateKeywordMatch(queryKeywords, fileKeywords) {
            if (queryKeywords.length === 0 || fileKeywords.length === 0) return 0;
            
            let matches = 0;
            queryKeywords.forEach(qk => {
                if (fileKeywords.includes(qk)) matches++;
            });
            
            return matches / queryKeywords.length;
        }

        isStopWord(word) {
            const stopWords = ['o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'que', 'e', 'é'];
            return stopWords.includes(word);
        }

        cacheResult(files, result) {
            const cacheKey = files.map(f => f.id || f.name).sort().join('-');
            this.convergenceCache.set(cacheKey, {
                result: result,
                timestamp: Date.now()
            });
            
            // Limpa cache antigo (> 1 hora)
            const oneHour = 60 * 60 * 1000;
            for (const [key, value] of this.convergenceCache.entries()) {
                if (Date.now() - value.timestamp > oneHour) {
                    this.convergenceCache.delete(key);
                }
            }
        }

        saveToHistory(entry) {
            this.convergenceHistory.push(entry);
            
            // Mantém apenas últimas 100 entradas
            if (this.convergenceHistory.length > 100) {
                this.convergenceHistory = this.convergenceHistory.slice(-100);
            }
            
            // Salva no localStorage
            try {
                localStorage.setItem('KC_convergence_history', 
                    JSON.stringify(this.convergenceHistory));
            } catch (e) {
                Logger.warn('SemanticConvergence', 'Não foi possível salvar histórico');
            }
        }

        loadSavedPatterns() {
            try {
                const saved = localStorage.getItem('KC_discovered_patterns');
                if (saved) {
                    this.discoveredPatterns = JSON.parse(saved);
                }
            } catch (e) {
                Logger.warn('SemanticConvergence', 'Não foi possível carregar padrões');
            }
        }

        /**
         * Obtém estatísticas do serviço
         */
        getStats() {
            return {
                cacheSize: this.convergenceCache.size,
                historySize: this.convergenceHistory.length,
                patternsDiscovered: this.discoveredPatterns.length,
                dimensions: Object.keys(this.dimensions),
                hybridSearchConfig: this.hybridSearchConfig
            };
        }
    }

    // Exporta para o namespace KC
    KC.SemanticConvergenceService = new SemanticConvergenceService();

    console.log('✅ SemanticConvergenceService inicializado');

})(window);