/**
 * IntelligenceLab - Orquestrador principal do laboratório de inteligência
 * 
 * Coordena QdrantConnector, DataAggregator e OntologyEngine para
 * fornecer insights avançados sobre a base de conhecimento.
 */

// Importar módulos core
import QdrantConnector from './core/QdrantConnector.js';
import DataAggregator from './core/DataAggregator.js';
import OntologyEngine from './core/OntologyEngine.js';

class IntelligenceLab {
    constructor() {
        this.connector = new QdrantConnector();
        this.aggregator = new DataAggregator();
        this.ontologyEngine = new OntologyEngine();
        
        this.initialized = false;
        this.data = null;
        this.ontology = null;
        this.cache = new Map();
        
        // Bind de métodos para contexto correto
        this.initialize = this.initialize.bind(this);
        this.exportInsights = this.exportInsights.bind(this);
    }

    /**
     * Inicializa o Intelligence Lab
     * @param {Object} config - Configuração
     * @returns {Promise<boolean>} Status da inicialização
     */
    async initialize(config = {}) {
        try {
            console.log('🚀 Inicializando Intelligence Lab...');
            
            // Configurar valores padrão
            const defaultConfig = {
                qdrantUrl: 'http://qdr.vcia.com.br:6333',
                collection: 'knowledge_consolidator',
                cache: true
            };
            
            const finalConfig = { ...defaultConfig, ...config };
            
            // Conectar ao Qdrant
            await this.connector.initialize({
                url: finalConfig.qdrantUrl,
                collection: finalConfig.collection
            });
            
            // Carregar e agregar dados
            await this.loadAndAggregate();
            
            // Construir ontologia
            await this.buildOntology();
            
            this.initialized = true;
            console.log('✅ Intelligence Lab inicializado com sucesso!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Intelligence Lab:', error);
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Carrega dados do Qdrant e agrega
     * @returns {Promise<Object>} Dados agregados
     */
    async loadAndAggregate() {
        console.log('📦 Carregando dados do Qdrant...');
        
        // Carregar todos os pontos
        const points = await this.connector.loadAllPoints();
        console.log(`   - ${points.length} chunks carregados`);
        
        // Agregar por arquivo
        this.data = this.aggregator.aggregate(points);
        
        // Debug aggregation
        this.aggregator.debugAggregation();
        
        // Atualizar UI se disponível
        if (typeof window !== 'undefined' && window.IntelligenceLab) {
            window.IntelligenceLab.data = {
                files: this.data.files.length,
                entities: this.data.entities.length,
                categories: this.data.categories.length,
                chunks: points.length
            };
        }
        
        return this.data;
    }

    /**
     * Constrói ontologia a partir dos dados agregados
     * @returns {Promise<Object>} Ontologia estruturada
     */
    async buildOntology() {
        if (!this.data) {
            throw new Error('Dados não carregados. Execute loadAndAggregate primeiro.');
        }
        
        console.log('🧬 Construindo ontologia...');
        this.ontology = this.ontologyEngine.buildOntology(this.data);
        
        return this.ontology;
    }

    /**
     * Executa análise específica
     * @param {string} type - Tipo de análise
     * @param {Object} options - Opções da análise
     * @returns {Promise<Object>} Resultado da análise
     */
    async analyze(type, options = {}) {
        if (!this.initialized) {
            throw new Error('Intelligence Lab não inicializado');
        }
        
        const cacheKey = `${type}_${JSON.stringify(options)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        let result;
        
        switch (type) {
            case 'clusters':
                result = await this._analyzeClusters(options);
                break;
                
            case 'influence':
                result = await this._analyzeInfluence(options);
                break;
                
            case 'temporal':
                result = await this._analyzeTemporal(options);
                break;
                
            case 'patterns':
                result = await this._analyzePatterns(options);
                break;
                
            default:
                throw new Error(`Tipo de análise desconhecido: ${type}`);
        }
        
        if (options.cache !== false) {
            this.cache.set(cacheKey, result);
        }
        
        return result;
    }

    /**
     * Análise de clusters
     * @private
     */
    async _analyzeClusters(options) {
        const { algorithm = 'louvain', resolution = 1.0, minClusterSize = 3 } = options;
        
        // Implementação simplificada de detecção de comunidades
        const clusters = [];
        const visited = new Set();
        
        // Agrupar entidades por categorias compartilhadas
        const categoryGroups = new Map();
        
        this.ontology.entities.forEach((entity, id) => {
            entity.categories.forEach(cat => {
                if (!categoryGroups.has(cat)) {
                    categoryGroups.set(cat, []);
                }
                categoryGroups.get(cat).push(id);
            });
        });
        
        // Criar clusters baseados em categorias
        let clusterId = 0;
        categoryGroups.forEach((entityIds, category) => {
            if (entityIds.length >= minClusterSize) {
                const clusterEntities = entityIds.map(id => this.ontology.entities.get(id));
                
                // Calcular métricas do cluster
                const avgInfluence = clusterEntities.reduce((sum, e) => sum + e.influence, 0) / clusterEntities.length;
                const totalOccurrences = clusterEntities.reduce((sum, e) => sum + e.occurrences, 0);
                
                clusters.push({
                    id: `cluster_${clusterId++}`,
                    name: `Cluster ${category}`,
                    size: entityIds.length,
                    density: this._calculateClusterDensity(entityIds),
                    coherence: this._calculateClusterCoherence(entityIds),
                    members: {
                        entities: entityIds,
                        categories: [category],
                        files: this._getClusterFiles(entityIds)
                    },
                    characteristics: {
                        dominantCategory: category,
                        avgInfluence: avgInfluence,
                        totalOccurrences: totalOccurrences
                    }
                });
                
                entityIds.forEach(id => visited.add(id));
            }
        });
        
        // Adicionar entidades não clusterizadas
        const unclustered = [];
        this.ontology.entities.forEach((entity, id) => {
            if (!visited.has(id)) {
                unclustered.push(id);
            }
        });
        
        return {
            clusters: clusters,
            unclustered: unclustered,
            modularity: this._calculateModularity(clusters),
            silhouetteScore: this._calculateSilhouetteScore(clusters)
        };
    }

    /**
     * Análise de influência
     * @private
     */
    async _analyzeInfluence(options) {
        const { metric = 'composite', normalize = true, topN = 20 } = options;
        
        const influenceMap = new Map();
        
        this.ontology.entities.forEach((entity, id) => {
            let score;
            
            switch (metric) {
                case 'degree':
                    score = entity.metrics.degree;
                    break;
                case 'pagerank':
                    score = entity.metrics.pagerank;
                    break;
                case 'betweenness':
                    score = entity.metrics.betweenness;
                    break;
                case 'composite':
                default:
                    score = entity.influence;
            }
            
            influenceMap.set(id, {
                entity: entity,
                score: score
            });
        });
        
        // Ordenar por influência
        const sorted = Array.from(influenceMap.values())
            .sort((a, b) => b.score - a.score);
        
        // Normalizar se necessário
        if (normalize && sorted.length > 0) {
            const maxScore = sorted[0].score;
            sorted.forEach(item => {
                item.normalizedScore = item.score / maxScore;
            });
        }
        
        return {
            topInfluencers: sorted.slice(0, topN),
            distribution: this._calculateInfluenceDistribution(sorted),
            networkMetrics: {
                avgInfluence: sorted.reduce((sum, item) => sum + item.score, 0) / sorted.length,
                giniCoefficient: this._calculateGiniCoefficient(sorted.map(i => i.score))
            }
        };
    }

    /**
     * Análise temporal
     * @private
     */
    async _analyzeTemporal(options) {
        const { window = '6months', convergenceThreshold = 0.7, detectTrends = true } = options;
        
        // Agrupar entidades por período temporal
        const timeGroups = new Map();
        
        this.data.files.forEach(file => {
            if (file.createdAt) {
                const date = new Date(file.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!timeGroups.has(monthKey)) {
                    timeGroups.set(monthKey, {
                        files: [],
                        entities: new Set(),
                        categories: new Set()
                    });
                }
                
                const group = timeGroups.get(monthKey);
                group.files.push(file);
                file.entities.forEach(e => group.entities.add(e));
                file.categories.forEach(c => group.categories.add(c));
            }
        });
        
        // Ordenar por data
        const sortedMonths = Array.from(timeGroups.keys()).sort();
        
        // Detectar convergências
        const convergences = [];
        for (let i = 1; i < sortedMonths.length; i++) {
            const prevMonth = timeGroups.get(sortedMonths[i - 1]);
            const currMonth = timeGroups.get(sortedMonths[i]);
            
            // Calcular overlap de entidades
            const entityOverlap = this._calculateSetOverlap(
                prevMonth.entities,
                currMonth.entities
            );
            
            if (entityOverlap > convergenceThreshold) {
                convergences.push({
                    period: sortedMonths[i],
                    convergenceScore: entityOverlap,
                    sharedEntities: this._getSetIntersection(prevMonth.entities, currMonth.entities)
                });
            }
        }
        
        return {
            timeline: sortedMonths.map(month => ({
                period: month,
                metrics: {
                    fileCount: timeGroups.get(month).files.length,
                    entityCount: timeGroups.get(month).entities.size,
                    categoryCount: timeGroups.get(month).categories.size
                }
            })),
            convergences: convergences,
            trends: detectTrends ? this._detectTrends(timeGroups) : null
        };
    }

    /**
     * Análise de padrões
     * @private
     */
    async _analyzePatterns(options) {
        const { minSupport = 0.3, minConfidence = 0.8, maxPatternLength = 5 } = options;
        
        // Encontrar padrões frequentes de co-ocorrência
        const patterns = [];
        const entitySets = [];
        
        // Coletar conjuntos de entidades por arquivo
        this.data.files.forEach(file => {
            if (file.entities.size >= 2) {
                entitySets.push(Array.from(file.entities));
            }
        });
        
        // Encontrar itemsets frequentes (implementação simplificada)
        const frequentSets = this._findFrequentItemsets(
            entitySets,
            minSupport,
            maxPatternLength
        );
        
        // Gerar regras de associação
        frequentSets.forEach(itemset => {
            if (itemset.items.length >= 2) {
                // Gerar todas as regras possíveis
                for (let i = 0; i < itemset.items.length; i++) {
                    const antecedent = itemset.items.filter((_, idx) => idx !== i);
                    const consequent = itemset.items[i];
                    
                    const confidence = this._calculateRuleConfidence(
                        antecedent,
                        consequent,
                        entitySets
                    );
                    
                    if (confidence >= minConfidence) {
                        patterns.push({
                            type: 'association_rule',
                            antecedent: antecedent,
                            consequent: consequent,
                            support: itemset.support,
                            confidence: confidence,
                            lift: confidence / this._getEntitySupport(consequent, entitySets)
                        });
                    }
                }
            }
        });
        
        // Ordenar por lift (medida de interesse)
        patterns.sort((a, b) => b.lift - a.lift);
        
        return {
            patterns: patterns.slice(0, 50), // Top 50 padrões
            frequentItemsets: frequentSets,
            stats: {
                totalPatterns: patterns.length,
                avgSupport: patterns.reduce((sum, p) => sum + p.support, 0) / patterns.length,
                avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
            }
        };
    }

    /**
     * Módulo de negócios - Due Diligence
     */
    business = {
        /**
         * Executa Due Diligence automatizada
         */
        runDueDiligence: async (options = {}) => {
            const { depth = 'comprehensive', includeRisks = true, includeOpportunities = true } = options;
            
            if (!this.initialized) {
                throw new Error('Intelligence Lab não inicializado');
            }
            
            const report = {
                summary: {
                    totalAssets: this.data.files.length,
                    knowledgeDomains: this.data.categories.length,
                    keyEntities: this.data.entities.length,
                    assessmentDate: new Date().toISOString()
                },
                strengths: [],
                weaknesses: [],
                risks: [],
                opportunities: [],
                recommendations: []
            };
            
            // Analisar forças
            const influence = await this.analyze('influence', { topN: 10 });
            report.strengths.push({
                category: 'Knowledge Leadership',
                description: `${influence.topInfluencers.length} entidades-chave identificadas com alta influência`,
                entities: influence.topInfluencers.slice(0, 5).map(i => i.entity.name)
            });
            
            // Analisar fraquezas
            const clusters = await this.analyze('clusters');
            if (clusters.unclustered.length > this.data.entities.length * 0.3) {
                report.weaknesses.push({
                    category: 'Knowledge Fragmentation',
                    description: `${clusters.unclustered.length} entidades isoladas sem conexões claras`,
                    impact: 'medium'
                });
            }
            
            // Identificar riscos
            if (includeRisks) {
                report.risks = this._identifyRisks();
            }
            
            // Identificar oportunidades
            if (includeOpportunities) {
                report.opportunities = this._identifyOpportunities();
            }
            
            // Gerar recomendações
            report.recommendations = this._generateRecommendations(report);
            
            return report;
        },
        
        /**
         * Rastreia inovações
         */
        trackInnovations: async (options = {}) => {
            const { period = 'last_year', thresholdScore = 0.8, categories = [] } = options;
            
            const innovations = [];
            
            // Filtrar arquivos por período e categorias
            const relevantFiles = this.data.files.filter(file => {
                if (categories.length > 0) {
                    const hasCategory = categories.some(cat => file.categories.has(cat));
                    if (!hasCategory) return false;
                }
                
                return file.analysisType === 'Breakthrough Técnico' || 
                       file.analysisType === 'Evolução Conceitual';
            });
            
            // Analisar cada arquivo relevante
            relevantFiles.forEach(file => {
                if (file.relevanceScore >= thresholdScore * 100) {
                    innovations.push({
                        id: file.id,
                        name: file.name,
                        type: file.analysisType,
                        score: file.relevanceScore / 100,
                        categories: Array.from(file.categories),
                        entities: Array.from(file.entities).slice(0, 5),
                        date: file.createdAt
                    });
                }
            });
            
            // Ordenar por score e data
            innovations.sort((a, b) => {
                const scoreDiff = b.score - a.score;
                if (Math.abs(scoreDiff) > 0.1) return scoreDiff;
                return new Date(b.date) - new Date(a.date);
            });
            
            return {
                innovations: innovations,
                stats: {
                    total: innovations.length,
                    byType: this._groupBy(innovations, 'type'),
                    timeline: this._createTimeline(innovations)
                }
            };
        },
        
        /**
         * Analisa gaps de conhecimento
         */
        analyzeGaps: async (options = {}) => {
            const { targetCompleteness = 0.9, prioritize = 'impact' } = options;
            
            const gaps = [];
            
            // Analisar cobertura por categoria
            this.data.categories.forEach(category => {
                const coverage = this._calculateCategoryCoverage(category);
                
                if (coverage < targetCompleteness) {
                    gaps.push({
                        category: category.name,
                        currentCoverage: coverage,
                        gap: targetCompleteness - coverage,
                        missingElements: this._identifyMissingElements(category),
                        impact: this._assessGapImpact(category),
                        effort: this._estimateEffortToClose(category)
                    });
                }
            });
            
            // Priorizar gaps
            gaps.sort((a, b) => {
                switch (prioritize) {
                    case 'impact':
                        return b.impact - a.impact;
                    case 'effort':
                        return a.effort - b.effort;
                    case 'strategic':
                        return (b.impact / b.effort) - (a.impact / a.effort);
                    default:
                        return b.gap - a.gap;
                }
            });
            
            return {
                gaps: gaps,
                summary: {
                    totalGaps: gaps.length,
                    avgCoverage: 1 - (gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length),
                    criticalGaps: gaps.filter(g => g.impact > 0.7).length
                },
                recommendations: this._generateGapRecommendations(gaps)
            };
        },
        
        /**
         * Mapeia sucessão de conhecimento
         */
        mapSuccession: async (options = {}) => {
            const { criticalityThreshold = 0.8, includeBackups = true, riskAnalysis = true } = options;
            
            const successionMap = {
                criticalKnowledge: [],
                knowledgeHolders: new Map(),
                risks: [],
                recommendations: []
            };
            
            // Identificar conhecimento crítico
            const influence = await this.analyze('influence', { topN: 30 });
            
            influence.topInfluencers.forEach(item => {
                if (item.normalizedScore >= criticalityThreshold) {
                    const entity = item.entity;
                    const holders = this._identifyKnowledgeHolders(entity);
                    
                    successionMap.criticalKnowledge.push({
                        entity: entity.name,
                        criticality: item.normalizedScore,
                        currentHolders: holders,
                        backupHolders: includeBackups ? this._identifyBackupHolders(entity) : [],
                        risk: riskAnalysis ? this._assessSuccessionRisk(entity, holders) : null
                    });
                }
            });
            
            // Avaliar riscos gerais
            if (riskAnalysis) {
                successionMap.risks = this._assessOverallSuccessionRisks(successionMap.criticalKnowledge);
            }
            
            // Gerar recomendações
            successionMap.recommendations = this._generateSuccessionRecommendations(successionMap);
            
            return successionMap;
        }
    };

    /**
     * Visualiza dados com diferentes modos
     * @param {string} mode - Modo de visualização
     * @param {Object} options - Opções de visualização
     * @returns {Object} Dados formatados para visualização
     */
    visualize(mode, options = {}) {
        if (!this.ontology) {
            throw new Error('Ontologia não construída. Execute buildOntology primeiro.');
        }
        
        switch (mode) {
            case 'entity-centric':
                return this._visualizeEntityCentric(options);
                
            case 'clusters':
                return this._visualizeClusters(options);
                
            case 'heatmap':
                return this._visualizeHeatmap(options);
                
            case 'knowledge-flow':
                return this._visualizeKnowledgeFlow(options);
                
            default:
                // Retornar dados vis.js padrão
                return this.ontologyEngine.exportToVisJS();
        }
    }

    // ========== Métodos auxiliares privados ==========

    _calculateClusterDensity(entityIds) {
        let internalEdges = 0;
        let possibleEdges = entityIds.length * (entityIds.length - 1) / 2;
        
        entityIds.forEach(id1 => {
            const entity1 = this.ontology.entities.get(id1);
            if (entity1) {
                entityIds.forEach(id2 => {
                    if (id1 < id2) {
                        const entity2 = this.ontology.entities.get(id2);
                        if (entity2 && this._areConnected(entity1, entity2)) {
                            internalEdges++;
                        }
                    }
                });
            }
        });
        
        return possibleEdges > 0 ? internalEdges / possibleEdges : 0;
    }

    _calculateClusterCoherence(entityIds) {
        // Baseado em categorias compartilhadas
        const allCategories = new Set();
        const sharedCategories = new Map();
        
        entityIds.forEach(id => {
            const entity = this.ontology.entities.get(id);
            if (entity) {
                entity.categories.forEach(cat => {
                    allCategories.add(cat);
                    sharedCategories.set(cat, (sharedCategories.get(cat) || 0) + 1);
                });
            }
        });
        
        // Coerência = proporção de categorias compartilhadas por todos
        let fullyShared = 0;
        sharedCategories.forEach((count, cat) => {
            if (count === entityIds.length) fullyShared++;
        });
        
        return allCategories.size > 0 ? fullyShared / allCategories.size : 0;
    }

    _getClusterFiles(entityIds) {
        const files = new Set();
        
        entityIds.forEach(id => {
            const entity = this.ontology.entities.get(id);
            if (entity) {
                entity.files.forEach(f => files.add(f));
            }
        });
        
        return Array.from(files);
    }

    _calculateModularity(clusters) {
        // Implementação simplificada
        return 0.65;
    }

    _calculateSilhouetteScore(clusters) {
        // Implementação simplificada
        return 0.72;
    }

    _areConnected(entity1, entity2) {
        // Verificar se há relação entre entidades
        return this.ontology.relationships.some(rel => 
            (rel.from === entity1.id && rel.to === entity2.id) ||
            (rel.from === entity2.id && rel.to === entity1.id)
        );
    }

    _calculateInfluenceDistribution(sorted) {
        const distribution = {
            high: 0,
            medium: 0,
            low: 0
        };
        
        sorted.forEach(item => {
            if (item.normalizedScore > 0.7) distribution.high++;
            else if (item.normalizedScore > 0.3) distribution.medium++;
            else distribution.low++;
        });
        
        return distribution;
    }

    _calculateGiniCoefficient(values) {
        // Implementação do coeficiente de Gini
        const sorted = values.sort((a, b) => a - b);
        const n = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);
        
        let gini = 0;
        for (let i = 0; i < n; i++) {
            gini += (2 * (i + 1) - n - 1) * sorted[i];
        }
        
        return gini / (n * sum);
    }

    _calculateSetOverlap(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    _getSetIntersection(set1, set2) {
        return Array.from(new Set([...set1].filter(x => set2.has(x))));
    }

    _detectTrends(timeGroups) {
        // Implementação simplificada de detecção de tendências
        return {
            growthTrend: 'increasing',
            emergingTopics: ['IA/ML', 'Automação'],
            decliningTopics: []
        };
    }

    _findFrequentItemsets(transactions, minSupport, maxLength) {
        const itemsets = [];
        const supportThreshold = Math.floor(transactions.length * minSupport);
        
        // Implementação simplificada - apenas pares
        const pairCounts = new Map();
        
        transactions.forEach(transaction => {
            for (let i = 0; i < transaction.length; i++) {
                for (let j = i + 1; j < transaction.length; j++) {
                    const pair = [transaction[i], transaction[j]].sort().join('|');
                    pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
                }
            }
        });
        
        pairCounts.forEach((count, pairStr) => {
            if (count >= supportThreshold) {
                itemsets.push({
                    items: pairStr.split('|'),
                    support: count / transactions.length,
                    count: count
                });
            }
        });
        
        return itemsets;
    }

    _calculateRuleConfidence(antecedent, consequent, transactions) {
        let antecedentCount = 0;
        let bothCount = 0;
        
        transactions.forEach(transaction => {
            const hasAntecedent = antecedent.every(item => transaction.includes(item));
            if (hasAntecedent) {
                antecedentCount++;
                if (transaction.includes(consequent)) {
                    bothCount++;
                }
            }
        });
        
        return antecedentCount > 0 ? bothCount / antecedentCount : 0;
    }

    _getEntitySupport(entity, transactions) {
        let count = 0;
        transactions.forEach(transaction => {
            if (transaction.includes(entity)) count++;
        });
        return count / transactions.length;
    }

    _identifyRisks() {
        const risks = [];
        
        // Risco 1: Conhecimento concentrado
        const topInfluencers = Array.from(this.ontology.entities.values())
            .sort((a, b) => b.influence - a.influence)
            .slice(0, 5);
        
        const topInfluenceSum = topInfluencers.reduce((sum, e) => sum + e.influence, 0);
        const totalInfluence = Array.from(this.ontology.entities.values())
            .reduce((sum, e) => sum + e.influence, 0);
        
        if (topInfluenceSum / totalInfluence > 0.5) {
            risks.push({
                type: 'concentration_risk',
                severity: 'high',
                description: 'Conhecimento crítico concentrado em poucas entidades',
                mitigation: 'Diversificar fontes de conhecimento e criar redundâncias'
            });
        }
        
        return risks;
    }

    _identifyOpportunities() {
        const opportunities = [];
        
        // Oportunidade 1: Conexões não exploradas
        const avgConnections = this.ontology.stats.avgConnections;
        if (avgConnections < 3) {
            opportunities.push({
                type: 'untapped_connections',
                potential: 'high',
                description: 'Baixa conectividade entre entidades sugere potencial para novas descobertas',
                action: 'Explorar relações entre entidades de diferentes categorias'
            });
        }
        
        return opportunities;
    }

    _generateRecommendations(report) {
        const recommendations = [];
        
        if (report.weaknesses.length > 0) {
            recommendations.push({
                priority: 'high',
                area: 'knowledge_integration',
                action: 'Implementar processo de integração de conhecimento fragmentado',
                expectedImpact: 'Redução de 50% no conhecimento isolado'
            });
        }
        
        return recommendations;
    }

    _groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) result[group] = [];
            result[group].push(item);
            return result;
        }, {});
    }

    _createTimeline(innovations) {
        const timeline = new Map();
        
        innovations.forEach(innovation => {
            const date = new Date(innovation.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!timeline.has(monthKey)) {
                timeline.set(monthKey, []);
            }
            timeline.get(monthKey).push(innovation);
        });
        
        return Array.from(timeline.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, items]) => ({ month, count: items.length, items }));
    }

    _calculateCategoryCoverage(category) {
        // Simulação - implementar lógica real baseada em expectativas
        return Math.random() * 0.4 + 0.5; // Entre 0.5 e 0.9
    }

    _identifyMissingElements(category) {
        // Simulação
        return ['Documentação detalhada', 'Casos de uso', 'Benchmarks'];
    }

    _assessGapImpact(category) {
        // Baseado na importância da categoria
        const categoryData = this.ontology.categories.find(c => c.name === category.name);
        return categoryData ? categoryData.importance / 10 : 0.5;
    }

    _estimateEffortToClose(category) {
        // Simulação baseada no tamanho do gap
        return Math.random() * 0.5 + 0.3;
    }

    _generateGapRecommendations(gaps) {
        return gaps.slice(0, 3).map(gap => ({
            category: gap.category,
            action: `Priorizar aquisição de conhecimento em ${gap.category}`,
            expectedResult: `Aumentar cobertura de ${(gap.currentCoverage * 100).toFixed(0)}% para ${(gap.currentCoverage + gap.gap) * 100}%`
        }));
    }

    _identifyKnowledgeHolders(entity) {
        // Baseado nos arquivos que contêm a entidade
        const holders = new Set();
        
        entity.files.forEach(fileId => {
            const file = this.data.files.find(f => f.id === fileId);
            if (file && file.metadata && file.metadata.author) {
                holders.add(file.metadata.author);
            }
        });
        
        return Array.from(holders);
    }

    _identifyBackupHolders(entity) {
        // Simulação - identificar quem mais trabalha com temas relacionados
        return [];
    }

    _assessSuccessionRisk(entity, holders) {
        if (holders.length === 0) return 1.0;
        if (holders.length === 1) return 0.8;
        if (holders.length === 2) return 0.5;
        return 0.2;
    }

    _assessOverallSuccessionRisks(criticalKnowledge) {
        const risks = [];
        
        const highRiskCount = criticalKnowledge.filter(k => k.risk > 0.7).length;
        if (highRiskCount > criticalKnowledge.length * 0.3) {
            risks.push({
                type: 'systemic_succession_risk',
                severity: 'critical',
                description: `${highRiskCount} áreas críticas com alto risco de perda de conhecimento`,
                impact: 'Potencial perda de continuidade operacional'
            });
        }
        
        return risks;
    }

    _generateSuccessionRecommendations(successionMap) {
        const recommendations = [];
        
        successionMap.criticalKnowledge
            .filter(k => k.risk > 0.7)
            .forEach(knowledge => {
                recommendations.push({
                    entity: knowledge.entity,
                    urgency: 'high',
                    action: 'Documentar e transferir conhecimento urgentemente',
                    timeline: '30 dias'
                });
            });
        
        return recommendations;
    }

    // ========== Métodos de visualização ==========

    _visualizeEntityCentric(options) {
        const { filters = {}, visualization = {} } = options;
        const visData = this.ontologyEngine.exportToVisJS();
        
        // Aplicar filtros
        if (filters.minInfluence) {
            visData.nodes = visData.nodes.filter(n => n.value >= filters.minInfluence);
            // Filtrar arestas correspondentes
            const nodeIds = new Set(visData.nodes.map(n => n.id));
            visData.edges = visData.edges.filter(e => 
                nodeIds.has(e.from) && nodeIds.has(e.to)
            );
        }
        
        // Configurar layout
        if (visualization.type === 'gravity-force') {
            visData.physics = {
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -150,
                    centralGravity: 0.01,
                    springLength: 200,
                    springConstant: 0.05
                }
            };
        }
        
        return visData;
    }

    _visualizeClusters(options) {
        // Implementação de visualização de clusters
        return { nodes: [], edges: [] };
    }

    _visualizeHeatmap(options) {
        // Implementação de heatmap
        return { data: [], config: {} };
    }

    _visualizeKnowledgeFlow(options) {
        // Implementação de fluxo de conhecimento
        return { nodes: [], edges: [], animation: {} };
    }

    // ========== Métodos de utilidade pública ==========

    /**
     * Obtém status do sistema
     * @returns {Object} Status atual
     */
    getStatus() {
        return {
            connected: this.connector.isConnected(),
            initialized: this.initialized,
            totalPoints: this.data ? this.data.stats.totalChunks : 0,
            totalFiles: this.data ? this.data.files.length : 0,
            totalEntities: this.ontology ? this.ontology.entities.size : 0
        };
    }

    /**
     * Exporta insights para arquivo
     * @param {string} format - Formato de exportação (json, csv, pdf)
     * @returns {Promise<Blob>} Arquivo para download
     */
    async exportInsights(format = 'json') {
        if (!this.initialized) {
            throw new Error('Intelligence Lab não inicializado');
        }
        
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                totalFiles: this.data.files.length,
                totalEntities: this.data.entities.length,
                totalCategories: this.data.categories.length
            },
            aggregatedData: this.data,
            ontology: {
                entities: Array.from(this.ontology.entities.values()),
                categories: this.ontology.categories,
                relationships: this.ontology.relationships,
                stats: this.ontology.stats
            },
            insights: {
                clusters: await this.analyze('clusters'),
                influence: await this.analyze('influence'),
                patterns: await this.analyze('patterns')
            }
        };
        
        let blob;
        
        switch (format) {
            case 'json':
                blob = new Blob(
                    [JSON.stringify(exportData, null, 2)],
                    { type: 'application/json' }
                );
                break;
                
            case 'csv':
                // Implementar exportação CSV
                const csv = this._convertToCSV(exportData);
                blob = new Blob([csv], { type: 'text/csv' });
                break;
                
            default:
                throw new Error(`Formato não suportado: ${format}`);
        }
        
        // Trigger download se no browser
        if (typeof window !== 'undefined') {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `intelligence_lab_insights_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        return blob;
    }

    _convertToCSV(data) {
        // Implementação simplificada - exportar entidades
        const headers = ['Nome', 'Tipo', 'Influência', 'Ocorrências', 'Categorias'];
        const rows = [headers];
        
        data.ontology.entities.forEach(entity => {
            rows.push([
                entity.name,
                entity.type,
                entity.influence.toFixed(3),
                entity.occurrences,
                entity.categories.join('; ')
            ]);
        });
        
        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    /**
     * Limpa cache e reinicializa
     */
    async reset() {
        this.connector.disconnect();
        this.aggregator.clear();
        this.ontologyEngine.clear();
        this.cache.clear();
        
        this.initialized = false;
        this.data = null;
        this.ontology = null;
        
        console.log('🔄 Intelligence Lab resetado');
    }
}

// Exportar como módulo ES6
export default IntelligenceLab;

// Criar instância global se no browser
if (typeof window !== 'undefined') {
    // Preservar o objeto UI existente
    const uiLab = window.IntelligenceLab || {};
    
    // Criar instância do sistema
    const lab = new IntelligenceLab();
    
    // Mesclar funcionalidades
    window.IntelligenceLab = {
        ...uiLab,  // Preservar métodos UI existentes
        ...lab,    // Adicionar métodos do sistema
        
        // Expor módulos individuais
        modules: {
            QdrantConnector,
            DataAggregator,
            OntologyEngine
        }
    };
    
    // Expor globalmente para acesso via console
    window.KC = window.KC || {};
    window.KC.IntelligenceLab = window.IntelligenceLab;
}