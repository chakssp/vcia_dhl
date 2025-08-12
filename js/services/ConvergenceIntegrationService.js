/**
 * 🧭 ConvergenceIntegrationService.js
 * 
 * Serviço de integração entre Knowledge Consolidator e Convergence Navigator
 * Implementa o paradigma de navegação por convergência multi-dimensional
 * 
 * @paradigm CONVERGENCE-BREAKTHROUGH
 * @formula Keywords + Categorias + TipoAnálise + Temporal = CONVERGÊNCIA
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator || {};
    const { Logger, EventBus, Events, AppState } = KC;

    class ConvergenceIntegrationService {
        constructor() {
            this.initialized = false;
            this.navigatorWindow = null;
            this.dataCache = {
                files: [],
                categories: [],
                embeddings: new Map(),
                lastUpdate: null
            };
        }

        /**
         * Inicializa o serviço de integração
         */
        async initialize() {
            if (this.initialized) return;

            Logger?.info('ConvergenceIntegration', 'Inicializando serviço de integração');
            
            // Registrar eventos
            this.registerEventListeners();
            
            // Carregar dados iniciais
            await this.loadInitialData();
            
            this.initialized = true;
            Logger?.info('ConvergenceIntegration', 'Serviço inicializado com sucesso');
        }

        /**
         * Registra listeners de eventos
         */
        registerEventListeners() {
            // Escutar mudanças nos arquivos
            EventBus?.on(Events.FILES_UPDATED, () => {
                this.updateCache();
            });

            // Escutar mudanças nas categorias
            EventBus?.on(Events.CATEGORIES_UPDATED, () => {
                this.updateCache();
            });

            // Escutar processamento do Qdrant
            EventBus?.on('qdrant:processed', (data) => {
                this.updateEmbeddings(data);
            });
        }

        /**
         * Carrega dados iniciais do sistema
         */
        async loadInitialData() {
            try {
                // Buscar arquivos do AppState
                const files = AppState?.get('files') || [];
                this.dataCache.files = files;

                // Buscar categorias
                const categories = KC.CategoryManager?.getAll() || [];
                this.dataCache.categories = categories;

                // Buscar dados do Qdrant se disponível
                if (KC.QdrantService?.checkConnection) {
                    await this.loadQdrantData();
                }

                this.dataCache.lastUpdate = new Date();
                
                Logger?.info('ConvergenceIntegration', `Dados carregados: ${files.length} arquivos, ${categories.length} categorias`);
                
            } catch (error) {
                Logger?.error('ConvergenceIntegration', 'Erro ao carregar dados iniciais', error);
            }
        }

        /**
         * Carrega dados do Qdrant
         */
        async loadQdrantData() {
            try {
                if (!KC.QdrantService) {
                    Logger?.warn('ConvergenceIntegration', 'QdrantService não disponível');
                    return;
                }

                // Verificar conexão
                const isConnected = await KC.QdrantService.checkConnection();
                if (!isConnected) {
                    Logger?.warn('ConvergenceIntegration', 'Qdrant não conectado');
                    return;
                }

                // Buscar pontos da collection
                const stats = await KC.QdrantService.getCollectionStats();
                Logger?.info('ConvergenceIntegration', `Qdrant: ${stats?.vectors_count || 0} vetores disponíveis`);

                // TODO: Implementar scroll para buscar todos os pontos
                // Por enquanto, buscar amostra
                const searchResult = await KC.QdrantService.search({
                    vector: new Array(768).fill(0), // Vector neutro
                    limit: 100,
                    with_payload: true
                });

                if (searchResult?.result) {
                    searchResult.result.forEach(point => {
                        const fileName = point.payload?.fileName;
                        if (fileName) {
                            this.dataCache.embeddings.set(fileName, {
                                vector: point.vector,
                                payload: point.payload,
                                score: point.score
                            });
                        }
                    });
                }

                Logger?.info('ConvergenceIntegration', `${this.dataCache.embeddings.size} embeddings carregados`);

            } catch (error) {
                Logger?.error('ConvergenceIntegration', 'Erro ao carregar dados do Qdrant', error);
            }
        }

        /**
         * Atualiza cache de dados
         */
        async updateCache() {
            await this.loadInitialData();
        }

        /**
         * Atualiza embeddings com novos dados
         */
        updateEmbeddings(data) {
            if (data?.fileName && data?.vector) {
                this.dataCache.embeddings.set(data.fileName, {
                    vector: data.vector,
                    payload: data.payload || {},
                    timestamp: new Date()
                });
                Logger?.debug('ConvergenceIntegration', `Embedding atualizado: ${data.fileName}`);
            }
        }

        /**
         * Obtém dados para o Convergence Navigator
         */
        getNavigatorData() {
            const data = {
                files: this.dataCache.files.map(file => ({
                    id: file.id || file.handle?.name,
                    name: file.name,
                    path: file.path,
                    content: file.content || file.preview,
                    categories: file.categories || [],
                    relevance: file.relevance || 0,
                    analyzed: file.analyzed || false,
                    createdAt: file.createdAt,
                    modifiedAt: file.lastModified,
                    size: file.size,
                    type: file.type,
                    // Metadados adicionais para convergência
                    keywords: this.extractKeywords(file),
                    temporalDimension: this.getTemporalDimension(file),
                    hasEmbedding: this.dataCache.embeddings.has(file.name)
                })),
                categories: this.dataCache.categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    color: cat.color,
                    segment: cat.segment,
                    description: cat.description,
                    count: this.countFilesInCategory(cat.id)
                })),
                embeddings: Array.from(this.dataCache.embeddings.entries()).map(([fileName, data]) => ({
                    fileName,
                    vector: data.vector,
                    ...data.payload
                })),
                stats: {
                    totalFiles: this.dataCache.files.length,
                    analyzedFiles: this.dataCache.files.filter(f => f.analyzed).length,
                    totalCategories: this.dataCache.categories.length,
                    totalEmbeddings: this.dataCache.embeddings.size,
                    lastUpdate: this.dataCache.lastUpdate
                }
            };

            return data;
        }

        /**
         * Extrai keywords de um arquivo
         */
        extractKeywords(file) {
            const keywords = [];
            
            // Keywords do título
            if (file.name) {
                const nameKeywords = file.name
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length > 3);
                keywords.push(...nameKeywords);
            }

            // Keywords do conteúdo (se disponível)
            if (file.preview || file.content) {
                const content = (file.preview || file.content).substring(0, 500);
                const contentKeywords = content
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length > 4)
                    .slice(0, 10); // Primeiras 10 palavras relevantes
                keywords.push(...contentKeywords);
            }

            // Remover duplicatas
            return [...new Set(keywords)];
        }

        /**
         * Obtém dimensão temporal de um arquivo
         */
        getTemporalDimension(file) {
            const now = new Date();
            const fileDate = new Date(file.lastModified || file.createdAt);
            const daysDiff = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 7) return 'última_semana';
            if (daysDiff <= 30) return 'último_mês';
            if (daysDiff <= 90) return 'últimos_3_meses';
            if (daysDiff <= 180) return 'últimos_6_meses';
            if (daysDiff <= 365) return 'último_ano';
            return 'mais_de_1_ano';
        }

        /**
         * Conta arquivos em uma categoria
         */
        countFilesInCategory(categoryId) {
            return this.dataCache.files.filter(file => 
                file.categories?.some(cat => cat.id === categoryId)
            ).length;
        }

        /**
         * Abre o Convergence Navigator com dados
         */
        async openNavigator() {
            // Preparar dados
            const data = this.getNavigatorData();
            
            // Abrir navigator
            const navigatorUrl = '/convergence-navigator/index.html';
            this.navigatorWindow = window.open(navigatorUrl, 'convergence-navigator');
            
            // Aguardar carregamento e enviar dados
            setTimeout(() => {
                if (this.navigatorWindow && !this.navigatorWindow.closed) {
                    this.navigatorWindow.postMessage({
                        type: 'KC_DATA_SYNC',
                        data: data,
                        timestamp: new Date().toISOString()
                    }, '*');
                    
                    Logger?.info('ConvergenceIntegration', 'Dados enviados para Navigator');
                }
            }, 2000); // Aguardar 2s para garantir carregamento
        }

        /**
         * Processa uma intenção de navegação
         */
        async processIntention(intention) {
            Logger?.info('ConvergenceIntegration', `Processando intenção: ${intention}`);
            
            // Decomposição dimensional
            const dimensions = {
                temporal: this.extractTemporalDimension(intention),
                semantic: this.extractSemanticConcepts(intention),
                categorical: this.inferCategories(intention),
                analytical: this.identifyAnalysisType(intention)
            };

            // Calcular convergências
            const convergences = await this.calculateConvergences(dimensions);
            
            // Retornar caminhos navegáveis
            return {
                intention,
                dimensions,
                convergences,
                navigationPaths: this.buildNavigationPaths(convergences)
            };
        }

        /**
         * Extrai dimensão temporal da intenção
         */
        extractTemporalDimension(intention) {
            const patterns = {
                'hoje': 'hoje',
                'ontem': 'ontem',
                'semana': 'última_semana',
                'mês': 'último_mês',
                '3 meses': 'últimos_3_meses',
                '6 meses': 'últimos_6_meses',
                'ano': 'último_ano'
            };

            for (const [pattern, dimension] of Object.entries(patterns)) {
                if (intention.toLowerCase().includes(pattern)) {
                    return dimension;
                }
            }

            return 'todos';
        }

        /**
         * Extrai conceitos semânticos
         */
        extractSemanticConcepts(intention) {
            // Palavras-chave importantes
            const keywords = intention
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);

            // Expandir com sinônimos básicos
            const expansions = {
                'ia': ['inteligência', 'artificial', 'ai', 'machine', 'learning'],
                'desenvolvimento': ['dev', 'código', 'programação', 'software'],
                'projeto': ['iniciativa', 'trabalho', 'sistema'],
                'descoberta': ['insight', 'achado', 'breakthrough', 'avanço']
            };

            const expanded = [...keywords];
            keywords.forEach(keyword => {
                if (expansions[keyword]) {
                    expanded.push(...expansions[keyword]);
                }
            });

            return [...new Set(expanded)];
        }

        /**
         * Infere categorias da intenção
         */
        inferCategories(intention) {
            const categoryKeywords = {
                'technical': ['código', 'bug', 'desenvolvimento', 'api', 'sistema'],
                'innovation': ['ideia', 'novo', 'inovação', 'descoberta', 'breakthrough'],
                'strategic': ['estratégia', 'plano', 'objetivo', 'meta', 'visão'],
                'learning': ['aprendizado', 'estudo', 'conhecimento', 'tutorial']
            };

            const inferred = [];
            const intentionLower = intention.toLowerCase();

            for (const [category, keywords] of Object.entries(categoryKeywords)) {
                if (keywords.some(kw => intentionLower.includes(kw))) {
                    inferred.push(category);
                }
            }

            return inferred.length > 0 ? inferred : ['general'];
        }

        /**
         * Identifica tipo de análise
         */
        identifyAnalysisType(intention) {
            if (intention.includes('descoberta') || intention.includes('breakthrough')) {
                return 'breakthrough_técnico';
            }
            if (intention.includes('problema') || intention.includes('bug')) {
                return 'resolução_problema';
            }
            if (intention.includes('ideia') || intention.includes('inovação')) {
                return 'ideação_criativa';
            }
            return 'análise_exploratória';
        }

        /**
         * Calcula convergências multi-dimensionais
         */
        async calculateConvergences(dimensions) {
            const convergences = [];
            
            // Para cada arquivo, calcular score de convergência
            for (const file of this.dataCache.files) {
                let score = 0;
                let matches = [];

                // Verificar dimensão temporal
                if (dimensions.temporal === 'todos' || 
                    this.getTemporalDimension(file) === dimensions.temporal) {
                    score += 0.25;
                    matches.push('temporal');
                }

                // Verificar dimensão semântica
                const fileKeywords = this.extractKeywords(file);
                const semanticOverlap = dimensions.semantic.filter(concept => 
                    fileKeywords.some(kw => kw.includes(concept) || concept.includes(kw))
                );
                if (semanticOverlap.length > 0) {
                    score += 0.35 * (semanticOverlap.length / dimensions.semantic.length);
                    matches.push('semantic');
                }

                // Verificar dimensão categorial
                if (file.categories?.some(cat => 
                    dimensions.categorical.includes(cat.segment) || 
                    dimensions.categorical.includes(cat.name?.toLowerCase())
                )) {
                    score += 0.25;
                    matches.push('categorical');
                }

                // Verificar tipo de análise
                if (file.analysisType === dimensions.analytical || !file.analysisType) {
                    score += 0.15;
                    matches.push('analytical');
                }

                // Adicionar à lista se score significativo
                if (score > 0.5) {
                    convergences.push({
                        file,
                        score,
                        matches,
                        density: score,
                        explanation: `Convergência ${Math.round(score * 100)}% em ${matches.join(', ')}`
                    });
                }
            }

            // Ordenar por score
            convergences.sort((a, b) => b.score - a.score);
            
            // Retornar top 10
            return convergences.slice(0, 10);
        }

        /**
         * Constrói caminhos de navegação
         */
        buildNavigationPaths(convergences) {
            if (convergences.length === 0) {
                return [{
                    type: 'empty',
                    message: 'Nenhuma convergência encontrada',
                    suggestion: 'Tente uma busca mais ampla'
                }];
            }

            // Agrupar por densidade de convergência
            const highDensity = convergences.filter(c => c.score > 0.8);
            const mediumDensity = convergences.filter(c => c.score > 0.6 && c.score <= 0.8);
            const lowDensity = convergences.filter(c => c.score <= 0.6);

            const paths = [];

            if (highDensity.length > 0) {
                paths.push({
                    type: 'primary',
                    label: 'Caminho Principal',
                    density: 'alta',
                    files: highDensity.map(c => c.file),
                    explanation: `${highDensity.length} evidências com alta convergência`,
                    confidence: 0.9
                });
            }

            if (mediumDensity.length > 0) {
                paths.push({
                    type: 'alternative',
                    label: 'Caminho Alternativo',
                    density: 'média',
                    files: mediumDensity.map(c => c.file),
                    explanation: `${mediumDensity.length} evidências relacionadas`,
                    confidence: 0.7
                });
            }

            if (lowDensity.length > 0 && paths.length === 0) {
                paths.push({
                    type: 'exploratory',
                    label: 'Caminho Exploratório',
                    density: 'baixa',
                    files: lowDensity.map(c => c.file),
                    explanation: `${lowDensity.length} possíveis conexões`,
                    confidence: 0.5
                });
            }

            return paths;
        }
    }

    // Criar e registrar serviço
    const convergenceService = new ConvergenceIntegrationService();
    
    // Registrar no KC
    KC.ConvergenceIntegrationService = convergenceService;

    // Auto-inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => convergenceService.initialize());
    } else {
        convergenceService.initialize();
    }

    Logger?.info('ConvergenceIntegrationService', 'Serviço registrado e pronto para uso');

})(window);