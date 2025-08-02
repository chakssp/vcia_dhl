/**
 * IntelligenceEnrichmentPipeline.js - Pipeline de Enriquecimento com Inteligência
 * 
 * Orquestra o enriquecimento de dados com:
 * - Análise de convergência semântica
 * - Detecção de padrões e insights
 * - Clustering inteligente
 * - Evolução temporal
 * 
 * @version 1.0.0
 * @date 30/01/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class IntelligenceEnrichmentPipeline {
        constructor() {
            this.initialized = false;
            this.convergenceService = null;
            this.qdrantSchema = null;
            
            // Configurações
            this.config = {
                batchSize: 50, // Processar em lotes
                enableCache: true,
                minConvergenceScore: 30, // Score mínimo para considerar convergência
                autoDetectBreakthroughs: true
            };
            
            // Estatísticas
            this.stats = {
                totalProcessed: 0,
                enrichmentTime: 0,
                convergenceChainsFound: 0,
                insightsGenerated: 0,
                breakthroughsDetected: 0
            };
        }

        /**
         * Inicializa o pipeline
         */
        async initialize() {
            if (this.initialized) return true;

            try {
                // Verificar dependências
                if (!KC.ConvergenceAnalysisService) {
                    throw new Error('ConvergenceAnalysisService não encontrado');
                }
                
                if (!KC.QdrantUnifiedSchema) {
                    throw new Error('QdrantUnifiedSchema não encontrado');
                }

                this.convergenceService = KC.ConvergenceAnalysisService;
                this.qdrantSchema = KC.QdrantUnifiedSchema;
                
                // Inicializar serviço de convergência
                await this.convergenceService.initialize();

                this.initialized = true;
                KC.Logger.success('IntelligenceEnrichmentPipeline', 'Pipeline inicializado');
                return true;

            } catch (error) {
                KC.Logger.error('IntelligenceEnrichmentPipeline', 'Erro ao inicializar', error);
                return false;
            }
        }

        /**
         * Enriquece documentos com inteligência antes de enviar ao Qdrant
         * @param {Array} documents - Documentos aprovados para processamento
         * @returns {Object} Documentos enriquecidos e metadados
         */
        async enrichDocuments(documents) {
            if (!this.initialized) {
                await this.initialize();
            }

            KC.Logger.info('IntelligenceEnrichmentPipeline', `Iniciando enriquecimento de ${documents.length} documentos`);
            const startTime = Date.now();

            try {
                // 1. Pré-processar documentos (normalizar estrutura)
                const preprocessedDocs = this._preprocessDocuments(documents);
                
                // 2. Analisar convergência semântica
                const convergenceAnalysis = await this.convergenceService.analyzeConvergence(preprocessedDocs);
                
                // 3. Detectar breakthroughs e momentos decisivos
                const breakthroughs = this._detectBreakthroughs(convergenceAnalysis);
                
                // 4. Enriquecer com metadados de inteligência
                const enrichedDocs = this._enrichWithIntelligence(
                    convergenceAnalysis.documents,
                    convergenceAnalysis,
                    breakthroughs
                );
                
                // 5. Gerar metadados globais do conhecimento
                const knowledgeMetadata = this._generateKnowledgeMetadata(
                    enrichedDocs,
                    convergenceAnalysis,
                    breakthroughs
                );

                // Atualizar estatísticas
                const enrichmentTime = Date.now() - startTime;
                this.stats.totalProcessed += documents.length;
                this.stats.enrichmentTime += enrichmentTime;
                this.stats.convergenceChainsFound += convergenceAnalysis.convergenceChains.length;
                this.stats.insightsGenerated += convergenceAnalysis.insights.length;
                this.stats.breakthroughsDetected += breakthroughs.length;

                const result = {
                    documents: enrichedDocs,
                    metadata: knowledgeMetadata,
                    analysis: {
                        convergenceChains: convergenceAnalysis.convergenceChains,
                        emergentThemes: convergenceAnalysis.emergentThemes,
                        insights: convergenceAnalysis.insights,
                        breakthroughs
                    },
                    stats: {
                        processed: documents.length,
                        enrichmentTime: enrichmentTime / 1000, // segundos
                        chainsFound: convergenceAnalysis.convergenceChains.length,
                        themesIdentified: convergenceAnalysis.emergentThemes.length,
                        insightsGenerated: convergenceAnalysis.insights.length,
                        breakthroughsDetected: breakthroughs.length
                    }
                };

                KC.Logger.success('IntelligenceEnrichmentPipeline', 'Enriquecimento concluído', result.stats);
                return result;

            } catch (error) {
                KC.Logger.error('IntelligenceEnrichmentPipeline', 'Erro no enriquecimento', error);
                throw error;
            }
        }

        /**
         * Pré-processa documentos para análise
         */
        _preprocessDocuments(documents) {
            return documents.map(doc => {
                // Garantir estrutura consistente
                // Normalizar preview para string
                let normalizedPreview = '';
                if (typeof doc.preview === 'string') {
                    normalizedPreview = doc.preview;
                } else if (doc.preview && typeof doc.preview === 'object') {
                    // Se for objeto com segment1, extrair
                    normalizedPreview = doc.preview.segment1 || Object.values(doc.preview).join(' ... ');
                } else if (doc.smartPreview) {
                    normalizedPreview = doc.smartPreview;
                }
                
                return {
                    id: doc.id || `doc_${Date.now()}_${Math.random()}`,
                    name: doc.name,
                    path: doc.path,
                    content: doc.content || '',
                    preview: normalizedPreview,
                    smartPreview: doc.smartPreview || this._generateSmartPreview(doc),
                    
                    // Metadados de análise
                    analysisType: doc.analysisType || 'Aprendizado Geral',
                    categories: KC.CategoryNormalizer.normalize(doc.categories || [], 'IntelligenceEnrichmentPipeline._preprocessDocuments'),
                    relevanceScore: doc.relevanceScore || 0,
                    
                    // Metadados temporais
                    createdAt: doc.createdAt || doc.lastModified,
                    lastModified: doc.lastModified || new Date().toISOString(),
                    
                    // Análise IA se existir
                    aiAnalysis: doc.aiAnalysis || null,
                    
                    // Flags
                    approved: doc.approved || false,
                    analyzed: doc.analyzed || false
                };
            });
        }

        /**
         * Gera smart preview se não existir
         */
        _generateSmartPreview(doc) {
            if (!doc.content) return '';
            
            const lines = doc.content.split('\n').filter(l => l.trim());
            const preview = [];
            
            // Primeira linha significativa
            if (lines.length > 0) preview.push(lines[0]);
            
            // Linha com palavras-chave importantes
            const importantWords = ['decisão', 'insight', 'breakthrough', 'transformação', 'problema', 'solução'];
            const importantLine = lines.find(line => 
                importantWords.some(word => line.toLowerCase().includes(word))
            );
            if (importantLine && !preview.includes(importantLine)) {
                preview.push(importantLine);
            }
            
            // Última linha significativa
            if (lines.length > 1 && !preview.includes(lines[lines.length - 1])) {
                preview.push(lines[lines.length - 1]);
            }
            
            return preview.join(' ... ').substring(0, 300);
        }

        /**
         * Detecta breakthroughs baseado em padrões
         */
        _detectBreakthroughs(convergenceAnalysis) {
            const breakthroughs = [];
            
            // 1. Documentos com alta centralidade em cadeias fortes
            convergenceAnalysis.convergenceChains
                .filter(chain => chain.strength > 0.85)
                .forEach(chain => {
                    const centerDoc = convergenceAnalysis.documents[chain.centerDocument];
                    if (centerDoc) {
                        breakthroughs.push({
                            type: 'convergence_center',
                            document: centerDoc.name,
                            description: `Centro de convergência forte em "${chain.theme}"`,
                            impact: chain.strength,
                            relatedDocuments: chain.participants
                        });
                    }
                });
            
            // 2. Documentos que conectam múltiplos temas
            const themeConnectors = this._findThemeConnectors(
                convergenceAnalysis.documents,
                convergenceAnalysis.emergentThemes
            );
            
            themeConnectors.forEach(connector => {
                breakthroughs.push({
                    type: 'theme_bridge',
                    document: connector.document,
                    description: `Conecta ${connector.themes.length} temas diferentes`,
                    impact: connector.connectionStrength,
                    connectedThemes: connector.themes
                });
            });
            
            // 3. Documentos com insights múltiplos
            convergenceAnalysis.documents.forEach(doc => {
                const docInsights = convergenceAnalysis.insights.filter(
                    insight => insight.relatedFiles.includes(doc.name)
                );
                
                if (docInsights.length >= 3) {
                    breakthroughs.push({
                        type: 'insight_hub',
                        document: doc.name,
                        description: `Hub de ${docInsights.length} insights importantes`,
                        impact: 0.8,
                        insights: docInsights.map(i => i.content)
                    });
                }
            });
            
            // 4. Análise temporal - documentos que marcam mudanças
            const temporalBreakthroughs = this._detectTemporalBreakthroughs(
                convergenceAnalysis.documents,
                convergenceAnalysis.convergenceChains
            );
            breakthroughs.push(...temporalBreakthroughs);
            
            return breakthroughs;
        }

        /**
         * Encontra documentos que conectam múltiplos temas
         */
        _findThemeConnectors(documents, themes) {
            const connectors = [];
            
            documents.forEach(doc => {
                const connectedThemes = themes.filter(theme => 
                    theme.documents?.includes(doc.name)
                );
                
                if (connectedThemes.length >= 2) {
                    connectors.push({
                        document: doc.name,
                        themes: connectedThemes.map(t => t.name),
                        connectionStrength: connectedThemes.reduce((sum, t) => sum + t.strength, 0) / connectedThemes.length
                    });
                }
            });
            
            return connectors.sort((a, b) => b.connectionStrength - a.connectionStrength);
        }

        /**
         * Detecta breakthroughs temporais
         */
        _detectTemporalBreakthroughs(documents, chains) {
            const breakthroughs = [];
            
            // Ordenar documentos por data
            const sortedDocs = [...documents]
                .filter(doc => doc.lastModified || doc.createdAt)
                .sort((a, b) => {
                    const dateA = new Date(a.lastModified || a.createdAt);
                    const dateB = new Date(b.lastModified || b.createdAt);
                    return dateA - dateB;
                });
            
            // Detectar mudanças significativas em padrões
            for (let i = 1; i < sortedDocs.length - 1; i++) {
                const prevDoc = sortedDocs[i - 1];
                const currentDoc = sortedDocs[i];
                const nextDoc = sortedDocs[i + 1];
                
                // Mudança significativa no tipo de análise
                if (prevDoc.analysisType !== currentDoc.analysisType && 
                    currentDoc.analysisType === nextDoc.analysisType &&
                    currentDoc.analysisType !== 'Aprendizado Geral') {
                    
                    breakthroughs.push({
                        type: 'paradigm_shift',
                        document: currentDoc.name,
                        description: `Mudança de paradigma para "${currentDoc.analysisType}"`,
                        impact: 0.9,
                        date: currentDoc.lastModified || currentDoc.createdAt,
                        fromType: prevDoc.analysisType,
                        toType: currentDoc.analysisType
                    });
                }
                
                // Início de nova cadeia de convergência
                const newChain = chains.find(chain => 
                    chain.participants[0] === currentDoc.name &&
                    chain.strength > 0.8
                );
                
                if (newChain) {
                    breakthroughs.push({
                        type: 'convergence_start',
                        document: currentDoc.name,
                        description: `Início da convergência "${newChain.theme}"`,
                        impact: newChain.strength,
                        date: currentDoc.lastModified || currentDoc.createdAt,
                        chainId: newChain.chainId
                    });
                }
            }
            
            return breakthroughs;
        }

        /**
         * Enriquece documentos com inteligência completa
         */
        _enrichWithIntelligence(documents, convergenceAnalysis, breakthroughs) {
            return documents.map(doc => {
                // Encontrar breakthrough relacionado
                const docBreakthroughs = breakthroughs.filter(b => b.document === doc.name);
                
                // Calcular score de impacto
                let impactScore = doc.convergenceScore || 0;
                docBreakthroughs.forEach(b => {
                    impactScore += b.impact * 20;
                });
                impactScore = Math.min(impactScore, 100);
                
                // Determinar tipo de inteligência
                const intelligenceType = this._determineIntelligenceType(doc, docBreakthroughs);
                
                // Adicionar predicados semânticos
                const semanticPredicates = this._generateSemanticPredicates(doc, convergenceAnalysis);
                
                return {
                    ...doc,
                    // Scores de inteligência
                    convergenceScore: doc.convergenceScore || 0,
                    impactScore,
                    intelligenceScore: (doc.convergenceScore + impactScore) / 2,
                    
                    // Classificação de inteligência
                    intelligenceType,
                    breakthroughs: docBreakthroughs,
                    
                    // Enriquecimento de predicados
                    predicates: {
                        ...doc.predicates,
                        ...semanticPredicates
                    },
                    
                    // Metadados de processamento
                    enrichmentMetadata: {
                        processedAt: new Date().toISOString(),
                        pipelineVersion: '1.0.0',
                        hasBreakthrough: docBreakthroughs.length > 0,
                        chainParticipation: doc.convergenceChains?.length || 0,
                        insightCount: doc.insights?.length || 0
                    }
                };
            });
        }

        /**
         * Determina tipo de inteligência do documento
         */
        _determineIntelligenceType(doc, breakthroughs) {
            // Casos especiais de breakthroughs primeiro
            if (breakthroughs.some(b => b.type === 'paradigm_shift')) {
                return 'paradigm_shifter';
            }
            
            if (breakthroughs.some(b => b.type === 'convergence_center')) {
                return 'knowledge_hub';
            }
            
            if (breakthroughs.some(b => b.type === 'theme_bridge')) {
                return 'connector';
            }
            
            if (breakthroughs.some(b => b.type === 'insight_hub')) {
                return 'insight_generator';
            }
            
            if (doc.convergenceScore > 80) {
                return 'convergence_point';
            }
            
            // REFATORADO: Usar AnalysisTypesManager como fonte única de verdade
            if (doc.analysisType && KC.AnalysisTypesManager) {
                const intelligenceType = KC.AnalysisTypesManager.getIntelligenceType(doc.analysisType);
                
                // Log para rastreabilidade
                KC.Logger?.info('IntelligenceEnrichmentPipeline', 
                    `Mapeando analysisType "${doc.analysisType}" → intelligenceType "${intelligenceType}" para documento "${doc.name}"`);
                
                return intelligenceType;
            }
            
            // DEBUG: Log quando não há analysisType
            KC.Logger?.debug('IntelligenceEnrichmentPipeline', 'Documento sem analysisType', {
                docName: doc.name,
                docKeys: Object.keys(doc),
                hasAnalysisType: 'analysisType' in doc,
                analysisTypeValue: doc.analysisType
            });
            
            // Fallback se não houver analysisType
            KC.Logger?.warning('IntelligenceEnrichmentPipeline', 
                `Documento "${doc.name}" sem analysisType, usando fallback 'knowledge_piece'`);
            
            return 'knowledge_piece';
        }

        /**
         * Gera predicados semânticos baseados em análise
         */
        _generateSemanticPredicates(doc, convergenceAnalysis) {
            const predicates = {
                convergesWith: [],
                influences: [],
                evolvesFrom: [],
                enablesBreakthrough: [],
                connectsThemes: []
            };
            
            // Convergências
            doc.convergenceChains?.forEach(chain => {
                predicates.convergesWith.push(chain.theme);
            });
            
            // Influências (baseado em insights)
            doc.insights?.forEach(insight => {
                if (insight.type === 'strong_convergence') {
                    predicates.influences.push(...insight.relatedFiles.filter(f => f !== doc.name));
                }
            });
            
            // Evolução (baseado em análise temporal)
            const temporalInsights = doc.insights?.filter(i => i.type === 'temporal_evolution');
            temporalInsights?.forEach(insight => {
                predicates.evolvesFrom.push(insight.metadata?.startDate || 'período anterior');
            });
            
            // Breakthroughs habilitados
            const breakthroughInsights = convergenceAnalysis.insights.filter(
                i => i.type === 'knowledge_hub' && i.relatedFiles.includes(doc.name)
            );
            breakthroughInsights.forEach(insight => {
                predicates.enablesBreakthrough.push(insight.content);
            });
            
            // Conexão de temas
            const themes = convergenceAnalysis.emergentThemes.filter(
                t => t.documents?.includes(doc.name)
            );
            themes.forEach(theme => {
                predicates.connectsThemes.push(theme.name);
            });
            
            return predicates;
        }

        /**
         * Gera metadados globais do conhecimento
         */
        _generateKnowledgeMetadata(documents, convergenceAnalysis, breakthroughs) {
            const metadata = {
                // Resumo estatístico
                summary: {
                    totalDocuments: documents.length,
                    averageConvergenceScore: this._calculateAverage(documents, 'convergenceScore'),
                    averageImpactScore: this._calculateAverage(documents, 'impactScore'),
                    averageIntelligenceScore: this._calculateAverage(documents, 'intelligenceScore'),
                    documentsWithBreakthroughs: documents.filter(d => d.breakthroughs?.length > 0).length
                },
                
                // Distribuição de tipos
                distribution: {
                    byAnalysisType: this._groupBy(documents, 'analysisType'),
                    byIntelligenceType: this._groupBy(documents, 'intelligenceType'),
                    byCategories: this._countCategories(documents)
                },
                
                // Principais descobertas
                keyFindings: {
                    topConvergenceChains: convergenceAnalysis.convergenceChains
                        .sort((a, b) => b.strength - a.strength)
                        .slice(0, 5)
                        .map(c => ({ theme: c.theme, strength: c.strength, size: c.participants.length })),
                    
                    majorThemes: convergenceAnalysis.emergentThemes
                        .sort((a, b) => b.strength - a.strength)
                        .slice(0, 5)
                        .map(t => ({ name: t.name, type: t.type, strength: t.strength })),
                    
                    criticalBreakthroughs: breakthroughs
                        .sort((a, b) => b.impact - a.impact)
                        .slice(0, 5)
                        .map(b => ({ 
                            type: b.type, 
                            document: b.document, 
                            impact: b.impact,
                            description: b.description 
                        }))
                },
                
                // Grafo de conhecimento
                knowledgeGraph: {
                    nodes: documents.length,
                    edges: this._countEdges(convergenceAnalysis),
                    density: this._calculateGraphDensity(documents.length, convergenceAnalysis),
                    clusters: convergenceAnalysis.convergenceChains.length,
                    averageClusterSize: convergenceAnalysis.convergenceChains.length > 0 ?
                        convergenceAnalysis.convergenceChains.reduce((sum, c) => sum + c.participants.length, 0) / 
                        convergenceAnalysis.convergenceChains.length : 0
                },
                
                // Evolução temporal
                temporalAnalysis: {
                    timeSpan: this._calculateTimeSpan(documents),
                    evolutionPhases: this._identifyEvolutionPhases(documents, convergenceAnalysis),
                    knowledgeVelocity: this._calculateKnowledgeVelocity(documents)
                },
                
                // Recomendações
                recommendations: this._generateRecommendations(documents, convergenceAnalysis, breakthroughs)
            };
            
            return metadata;
        }

        /**
         * Calcula média de uma propriedade
         */
        _calculateAverage(documents, property) {
            const values = documents.map(d => d[property] || 0);
            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        }

        /**
         * Agrupa documentos por propriedade
         */
        _groupBy(documents, property) {
            const groups = {};
            documents.forEach(doc => {
                const value = doc[property] || 'Não classificado';
                groups[value] = (groups[value] || 0) + 1;
            });
            return groups;
        }

        /**
         * Conta categorias únicas
         */
        _countCategories(documents) {
            const categories = {};
            documents.forEach(doc => {
                (doc.categories || []).forEach(cat => {
                    categories[cat] = (categories[cat] || 0) + 1;
                });
            });
            return categories;
        }

        /**
         * Conta arestas no grafo de conhecimento
         */
        _countEdges(convergenceAnalysis) {
            let edges = 0;
            convergenceAnalysis.convergenceChains.forEach(chain => {
                // Cada cadeia forma um subgrafo conectado
                const n = chain.participants.length;
                edges += (n * (n - 1)) / 2; // Grafo completo
            });
            return edges;
        }

        /**
         * Calcula densidade do grafo
         */
        _calculateGraphDensity(nodes, convergenceAnalysis) {
            const possibleEdges = (nodes * (nodes - 1)) / 2;
            const actualEdges = this._countEdges(convergenceAnalysis);
            return possibleEdges > 0 ? actualEdges / possibleEdges : 0;
        }

        /**
         * Calcula span temporal
         */
        _calculateTimeSpan(documents) {
            const dates = documents
                .map(d => d.lastModified || d.createdAt)
                .filter(d => d)
                .map(d => new Date(d).getTime());
            
            if (dates.length === 0) return null;
            
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            const spanDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
            
            return {
                start: minDate.toISOString(),
                end: maxDate.toISOString(),
                spanDays,
                spanMonths: Math.ceil(spanDays / 30)
            };
        }

        /**
         * Identifica fases de evolução
         */
        _identifyEvolutionPhases(documents, convergenceAnalysis) {
            const phases = [];
            
            // Ordenar documentos por data
            const sortedDocs = [...documents]
                .filter(d => d.lastModified || d.createdAt)
                .sort((a, b) => {
                    const dateA = new Date(a.lastModified || a.createdAt);
                    const dateB = new Date(b.lastModified || b.createdAt);
                    return dateA - dateB;
                });
            
            if (sortedDocs.length < 3) return phases;
            
            // Dividir em terços temporais
            const third = Math.floor(sortedDocs.length / 3);
            
            // Fase inicial
            const earlyDocs = sortedDocs.slice(0, third);
            phases.push({
                phase: 'initial',
                period: {
                    start: earlyDocs[0].lastModified || earlyDocs[0].createdAt,
                    end: earlyDocs[earlyDocs.length - 1].lastModified || earlyDocs[earlyDocs.length - 1].createdAt
                },
                dominantType: this._findDominantType(earlyDocs),
                documentCount: earlyDocs.length
            });
            
            // Fase intermediária
            const midDocs = sortedDocs.slice(third, third * 2);
            phases.push({
                phase: 'development',
                period: {
                    start: midDocs[0].lastModified || midDocs[0].createdAt,
                    end: midDocs[midDocs.length - 1].lastModified || midDocs[midDocs.length - 1].createdAt
                },
                dominantType: this._findDominantType(midDocs),
                documentCount: midDocs.length
            });
            
            // Fase recente
            const recentDocs = sortedDocs.slice(third * 2);
            phases.push({
                phase: 'mature',
                period: {
                    start: recentDocs[0].lastModified || recentDocs[0].createdAt,
                    end: recentDocs[recentDocs.length - 1].lastModified || recentDocs[recentDocs.length - 1].createdAt
                },
                dominantType: this._findDominantType(recentDocs),
                documentCount: recentDocs.length
            });
            
            return phases;
        }

        /**
         * Encontra tipo dominante em conjunto de docs
         */
        _findDominantType(docs) {
            const types = {};
            docs.forEach(doc => {
                const type = doc.analysisType || 'Não classificado';
                types[type] = (types[type] || 0) + 1;
            });
            
            return Object.entries(types)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Não classificado';
        }

        /**
         * Calcula velocidade de geração de conhecimento
         */
        _calculateKnowledgeVelocity(documents) {
            const timeSpan = this._calculateTimeSpan(documents);
            if (!timeSpan || timeSpan.spanDays === 0) return 0;
            
            return {
                documentsPerDay: documents.length / timeSpan.spanDays,
                documentsPerMonth: documents.length / (timeSpan.spanDays / 30),
                trend: this._calculateTrend(documents)
            };
        }

        /**
         * Calcula tendência de produção
         */
        _calculateTrend(documents) {
            // Simplificado: comparar primeira e segunda metade
            const sorted = [...documents]
                .filter(d => d.lastModified || d.createdAt)
                .sort((a, b) => {
                    const dateA = new Date(a.lastModified || a.createdAt);
                    const dateB = new Date(b.lastModified || b.createdAt);
                    return dateA - dateB;
                });
            
            if (sorted.length < 4) return 'insufficient_data';
            
            const half = Math.floor(sorted.length / 2);
            const firstHalf = sorted.slice(0, half);
            const secondHalf = sorted.slice(half);
            
            const firstHalfSpan = this._calculateTimeSpan(firstHalf);
            const secondHalfSpan = this._calculateTimeSpan(secondHalf);
            
            if (!firstHalfSpan || !secondHalfSpan) return 'unknown';
            
            const firstRate = firstHalf.length / firstHalfSpan.spanDays;
            const secondRate = secondHalf.length / secondHalfSpan.spanDays;
            
            if (secondRate > firstRate * 1.2) return 'accelerating';
            if (secondRate < firstRate * 0.8) return 'decelerating';
            return 'stable';
        }

        /**
         * Gera recomendações baseadas na análise
         */
        _generateRecommendations(documents, convergenceAnalysis, breakthroughs) {
            const recommendations = [];
            
            // 1. Documentos para revisar (hubs de conhecimento)
            const knowledgeHubs = documents
                .filter(d => d.intelligenceType === 'knowledge_hub')
                .sort((a, b) => b.intelligenceScore - a.intelligenceScore)
                .slice(0, 3);
            
            if (knowledgeHubs.length > 0) {
                recommendations.push({
                    type: 'review_hubs',
                    priority: 'high',
                    description: 'Revisar hubs de conhecimento para insights profundos',
                    documents: knowledgeHubs.map(d => d.name)
                });
            }
            
            // 2. Cadeias de convergência para explorar
            const strongChains = convergenceAnalysis.convergenceChains
                .filter(c => c.strength > 0.9)
                .slice(0, 3);
            
            strongChains.forEach(chain => {
                recommendations.push({
                    type: 'explore_convergence',
                    priority: 'high',
                    description: `Explorar convergência forte em "${chain.theme}"`,
                    documents: chain.participants
                });
            });
            
            // 3. Gaps de conhecimento (temas com poucos documentos)
            const thinThemes = convergenceAnalysis.emergentThemes
                .filter(t => t.documents && t.documents.length < 3)
                .slice(0, 3);
            
            thinThemes.forEach(theme => {
                recommendations.push({
                    type: 'fill_gap',
                    priority: 'medium',
                    description: `Expandir conhecimento em "${theme.name}"`,
                    currentDocuments: theme.documents
                });
            });
            
            // 4. Padrões temporais
            const velocity = this._calculateKnowledgeVelocity(documents);
            if (velocity.trend === 'decelerating') {
                recommendations.push({
                    type: 'increase_activity',
                    priority: 'medium',
                    description: 'Produção de conhecimento está desacelerando - considerar novas fontes'
                });
            }
            
            // 5. Breakthroughs para documentar
            const undocumentedBreakthroughs = breakthroughs
                .filter(b => !documents.find(d => d.name === b.document && d.categories?.includes('Breakthrough')))
                .slice(0, 3);
            
            undocumentedBreakthroughs.forEach(breakthrough => {
                recommendations.push({
                    type: 'document_breakthrough',
                    priority: 'high',
                    description: `Documentar breakthrough: ${breakthrough.description}`,
                    document: breakthrough.document
                });
            });
            
            return recommendations;
        }

        /**
         * Processa documentos em lotes para performance
         */
        async processBatch(documents, options = {}) {
            const batchSize = options.batchSize || this.config.batchSize;
            const results = [];
            
            for (let i = 0; i < documents.length; i += batchSize) {
                const batch = documents.slice(i, i + batchSize);
                KC.Logger.info('IntelligenceEnrichmentPipeline', 
                    `Processando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(documents.length / batchSize)}`
                );
                
                const batchResult = await this.enrichDocuments(batch);
                results.push(batchResult);
                
                // Callback de progresso
                if (options.onProgress) {
                    options.onProgress({
                        processed: i + batch.length,
                        total: documents.length,
                        percentage: ((i + batch.length) / documents.length) * 100
                    });
                }
            }
            
            // Consolidar resultados
            return this._consolidateBatchResults(results);
        }

        /**
         * Consolida resultados de múltiplos lotes
         */
        _consolidateBatchResults(batchResults) {
            const consolidated = {
                documents: [],
                metadata: null,
                analysis: {
                    convergenceChains: [],
                    emergentThemes: [],
                    insights: [],
                    breakthroughs: []
                },
                stats: {
                    processed: 0,
                    enrichmentTime: 0,
                    chainsFound: 0,
                    themesIdentified: 0,
                    insightsGenerated: 0,
                    breakthroughsDetected: 0
                }
            };
            
            batchResults.forEach(result => {
                consolidated.documents.push(...result.documents);
                consolidated.analysis.convergenceChains.push(...result.analysis.convergenceChains);
                consolidated.analysis.emergentThemes.push(...result.analysis.emergentThemes);
                consolidated.analysis.insights.push(...result.analysis.insights);
                consolidated.analysis.breakthroughs.push(...result.analysis.breakthroughs);
                
                // Somar estatísticas
                Object.keys(result.stats).forEach(key => {
                    consolidated.stats[key] = (consolidated.stats[key] || 0) + result.stats[key];
                });
            });
            
            // Recalcular metadados globais
            consolidated.metadata = this._generateKnowledgeMetadata(
                consolidated.documents,
                consolidated.analysis,
                consolidated.analysis.breakthroughs
            );
            
            return consolidated;
        }

        /**
         * Retorna estatísticas do pipeline
         */
        getStats() {
            return {
                ...this.stats,
                initialized: this.initialized,
                convergenceServiceStats: this.convergenceService?.getStats()
            };
        }

        /**
         * Limpa caches
         */
        clearCache() {
            if (this.convergenceService) {
                this.convergenceService.clearCache();
            }
            KC.Logger.info('IntelligenceEnrichmentPipeline', 'Cache limpo');
        }
    }

    // Registrar no KC
    KC.IntelligenceEnrichmentPipeline = new IntelligenceEnrichmentPipeline();
    
    // Expor globalmente para debug
    window.IntelligenceEnrichmentPipeline = IntelligenceEnrichmentPipeline;

})(window);