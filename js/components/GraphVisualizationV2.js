/**
 * GraphVisualizationV2.js - Visualização Entidade-Cêntrica com Clusters por TipoAnalise
 * 
 * Versão experimental para testar novo modelo:
 * - Entidades no centro
 * - Categorias no meio
 * - Arquivos na periferia
 * - Clusters por TipoAnalise
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;
    const Logger = KC.Logger;

    /**
     * GraphVisualizationV2 - Versão expandida com modelo entidade-cêntrico
     * 
     * ESTRATÉGIA DE Z-INDEX (Ordem de Sobreposição):
     * - Level 0: TipoAnalise (centro) - renderizado PRIMEIRO (fica atrás)
     * - Level 1: Categorias - renderizado segundo
     * - Level 2: Entidades - renderizado terceiro
     * - Level 3: Arquivos (periferia) - renderizado POR ÚLTIMO (fica na frente)
     * 
     * Isso evita que elementos grandes no centro cubram elementos menores na periferia.
     * A ordenação é feita pelo método sortNodesByLevel() antes de adicionar ao vis.DataSet.
     */
    class GraphVisualizationV2 {
        constructor() {
            this.container = null;
            this.network = null;
            this.nodes = null;
            this.edges = null;
            
            // Arrays para manter todos os dados
            this.allNodes = [];
            this.allEdges = [];
            
            // Mapas para entidades únicas
            this.entityMap = new Map();
            this.entityConnections = new Map();
            
            // Clusters por TipoAnalise
            this.clusters = new Map();
            
            // Modo de visualização atual
            this.viewMode = 'vertical-clusters'; // 'standard', 'clusters', 'entity-centric', 'vertical-clusters'
            
            // Cores expandidas
            this.nodeColors = {
                // Tipos de nós
                file: '#3b82f6',
                category: '#10b981',
                entity: '#f59e0b',
                concept: '#8b5cf6',
                // Cores por TipoAnalise
                'Breakthrough Técnico': '#ef4444',
                'Evolução Conceitual': '#8b5cf6',
                'Momento Decisivo': '#f59e0b',
                'Insight Estratégico': '#10b981',
                'Aprendizado Geral': '#6366f1'
            };
            
            // Layout hierárquico com níveis
            this.layoutLevels = {
                entity: 0,      // Centro
                category: 1,    // Primeiro anel
                file: 2         // Periferia
            };
            
            // Configurações do vis.js adaptadas
            this.options = {
                nodes: {
                    shape: 'dot',
                    size: 20,
                    font: {
                        size: 14,
                        color: '#333'
                    },
                    borderWidth: 2,
                    shadow: true
                },
                edges: {
                    width: 2,
                    color: { color: '#666', highlight: '#3b82f6' },
                    smooth: { type: 'continuous' },
                    arrows: { to: { enabled: true, scaleFactor: 0.5 } }
                },
                physics: {
                    enabled: true,
                    hierarchicalRepulsion: {
                        centralGravity: 0.0,
                        springLength: 150,
                        springConstant: 0.01,
                        nodeDistance: 200,
                        damping: 0.09
                    },
                    solver: 'hierarchicalRepulsion'
                },
                layout: {
                    hierarchical: {
                        enabled: false, // Vamos controlar manualmente
                        direction: 'UD',
                        sortMethod: 'directed',
                        levelSeparation: 150
                    }
                },
                interaction: {
                    hover: true,
                    hoverConnectedEdges: true,
                    tooltipDelay: 200
                }
            };
        }

        /**
         * Renderiza o painel de visualização V2
         */
        async render() {
            Logger.info('[GraphVisualizationV2] Renderizando painel entidade-cêntrico...');
            
            this.container = document.getElementById('graph-container') || 
                           document.getElementById('panel-container');
            
            if (!this.container) {
                Logger.error('[GraphVisualizationV2] Container não encontrado');
                return;
            }
            
            // HTML expandido com novos controles
            const html = `
                <div class="graph-visualization-panel-v2">
                    <div class="graph-header">
                        <h2>🌐 Grafo de Conhecimento v2.0 - Modelo Entidade-Cêntrico</h2>
                        <div class="graph-controls">
                            <button class="btn-secondary" onclick="KC.GraphVisualizationV2.loadData()">
                                <span class="icon">🔄</span> Recarregar
                            </button>
                            <button class="btn-secondary" onclick="KC.GraphVisualizationV2.toggleViewMode()">
                                <span class="icon">👁️</span> Mudar Visão
                            </button>
                            <button class="btn-secondary" onclick="KC.GraphVisualizationV2.exportGraph()">
                                <span class="icon">💾</span> Exportar
                            </button>
                        </div>
                    </div>

                    <!-- Modo de visualização -->
                    <div class="view-mode-selector">
                        <label>
                            <input type="radio" name="viewMode" value="standard" 
                                   onchange="KC.GraphVisualizationV2.setViewMode('standard')"> 
                            Visão Padrão
                        </label>
                        <label>
                            <input type="radio" name="viewMode" value="clusters" 
                                   onchange="KC.GraphVisualizationV2.setViewMode('clusters')"> 
                            Visão por Clusters
                        </label>
                        <label>
                            <input type="radio" name="viewMode" value="entity-centric" 
                                   onchange="KC.GraphVisualizationV2.setViewMode('entity-centric')"> 
                            Visão Entidade-Cêntrica
                        </label>
                        <label>
                            <input type="radio" name="viewMode" value="vertical-clusters" checked
                                   onchange="KC.GraphVisualizationV2.setViewMode('vertical-clusters')"> 
                            Verticalização por TipoAnalise
                        </label>
                    </div>

                    <!-- Filtros expandidos -->
                    <div class="graph-filters">
                        <div class="filter-row">
                            <label>
                                <input type="checkbox" id="filter-files" checked> Arquivos
                            </label>
                            <label>
                                <input type="checkbox" id="filter-categories" checked> Categorias
                            </label>
                            <label>
                                <input type="checkbox" id="filter-entities" checked> Entidades
                            </label>
                        </div>
                        
                        <!-- Filtros por TipoAnalise -->
                        <div class="analysis-type-filters">
                            <h4>Filtrar por Tipo de Análise:</h4>
                            <label>
                                <input type="checkbox" id="filter-breakthrough" checked> 
                                Breakthrough Técnico
                            </label>
                            <label>
                                <input type="checkbox" id="filter-evolucao" checked> 
                                Evolução Conceitual
                            </label>
                            <label>
                                <input type="checkbox" id="filter-decisivo" checked> 
                                Momento Decisivo
                            </label>
                            <label>
                                <input type="checkbox" id="filter-insight" checked> 
                                Insight Estratégico
                            </label>
                            <label>
                                <input type="checkbox" id="filter-aprendizado" checked> 
                                Aprendizado Geral
                            </label>
                        </div>
                        
                        <label style="margin-left: 20px;">
                            Relevância mínima:
                            <input type="range" id="relevance-filter" min="0" max="100" value="0" style="width: 100px;">
                            <span id="relevance-value">0%</span>
                        </label>
                    </div>

                    <!-- Estatísticas expandidas -->
                    <div class="graph-stats" id="graph-stats">
                        <div class="stats-row">
                            <span>Nós: <strong id="node-count">0</strong></span>
                            <span>Conexões: <strong id="edge-count">0</strong></span>
                            <span>Densidade: <strong id="graph-density">0.00</strong></span>
                            <span>Entidades: <strong id="entity-count">0</strong></span>
                        </div>
                        <div class="cluster-stats" id="cluster-stats" style="display: none;">
                            <!-- Estatísticas por cluster serão inseridas aqui -->
                        </div>
                    </div>

                    <div id="graph-network" style="height: 600px; border: 1px solid #ddd; margin-top: 10px;"></div>
                </div>

                <style>
                .graph-visualization-panel-v2 {
                    padding: 20px;
                }
                .view-mode-selector {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 4px;
                }
                .view-mode-selector label {
                    margin-right: 20px;
                }
                .filter-row {
                    margin-bottom: 10px;
                }
                .analysis-type-filters {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                .analysis-type-filters h4 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                }
                .analysis-type-filters label {
                    display: inline-block;
                    margin-right: 15px;
                    margin-bottom: 5px;
                }
                .stats-row {
                    display: flex;
                    gap: 20px;
                }
                .cluster-stats {
                    margin-top: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                </style>
            `;
            
            this.container.innerHTML = html;
            
            // Inicializa o vis.js
            this.initNetwork();
            
            // Configura event listeners
            this.setupEventListeners();
            
            // Carrega dados
            this.loadData();
        }

        /**
         * Inicializa a rede vis.js
         */
        initNetwork() {
            const container = document.getElementById('graph-network');
            if (!container) {
                Logger.error('[GraphVisualizationV2] Container graph-network não encontrado');
                return;
            }
            
            this.nodes = new vis.DataSet();
            this.edges = new vis.DataSet();
            
            const data = {
                nodes: this.nodes,
                edges: this.edges
            };
            
            this.network = new vis.Network(container, data, this.options);
            
            // Eventos
            this.network.on("click", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    // Mostrar detalhes do nó
                    this.showNodeDetails(nodeId);
                }
            });
            
            // Duplo clique para focar em entidade
            this.network.on("doubleClick", (params) => {
                if (params.nodes.length > 0) {
                    this.focusOnNode(params.nodes[0]);
                }
            });
            
            Logger.info('[GraphVisualizationV2] Rede inicializada');
        }

        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // Filtros de tipo
            ['filter-files', 'filter-categories', 'filter-entities'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', () => this.applyFilters());
                }
            });
            
            // Filtros de TipoAnalise
            ['filter-breakthrough', 'filter-evolucao', 'filter-decisivo', 
             'filter-insight', 'filter-aprendizado'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', () => this.applyFilters());
                }
            });
            
            // Filtro de relevância
            const relevanceFilter = document.getElementById('relevance-filter');
            if (relevanceFilter) {
                relevanceFilter.addEventListener('input', (e) => {
                    document.getElementById('relevance-value').textContent = e.target.value + '%';
                    this.applyFilters();
                });
            }
            
            Logger.info('[GraphVisualizationV2] Event listeners configurados');
        }

        /**
         * Carrega dados baseado no modo de visualização
         */
        loadData() {
            Logger.info(`[GraphVisualizationV2] Carregando dados no modo: ${this.viewMode}`);
            
            // Limpar dados anteriores
            this.nodes.clear();
            this.edges.clear();
            this.allNodes = [];
            this.allEdges = [];
            this.entityMap.clear();
            this.entityConnections.clear();
            this.clusters.clear();
            
            switch (this.viewMode) {
                case 'entity-centric':
                    this.loadDataEntityCentric();
                    break;
                case 'clusters':
                    this.loadDataClusters();
                    break;
                case 'vertical-clusters':
                    this.loadDataVerticalClusters();
                    break;
                default:
                    this.loadDataStandard();
            }
            
            // Atualizar estatísticas
            this.updateStats();
        }

        /**
         * Carrega dados do AppState com correlação SSO e foco em TipoAnalise
         * Implementa a LEI 11 - Correlacionamento entre componentes
         * @returns {Object} Dados consolidados, correlacionados e verticalizados
         */
        loadFromAppState() {
            Logger.info('[GraphVisualizationV2] Carregando dados do AppState com verticalização por TipoAnalise');
            
            // LEI 0.SSO - Single Source of Truth: buscar dados centralizados
            const appStateData = {
                // Etapa I - Descoberta
                files: AppState.get('files') || [],
                
                // Etapa II - Pré-Análise
                keywords: AppState.get('keywords') || [],
                
                // Etapa III - Análise IA
                analysisConfig: AppState.get('configuration')?.aiAnalysis || {},
                
                // Etapa IV - Organização
                categories: KC.CategoryManager?.getCategories() || [],
                
                // Triplas extraídas
                triples: KC.tripleStore?.getAllTriples?.() || []
            };
            
            // Validação básica
            if (appStateData.files.length === 0) {
                Logger.warn('[GraphVisualizationV2] Nenhum arquivo encontrado no AppState');
                return appStateData;
            }
            
            // LEI 11 - Correlacionar dados com foco em verticalização
            const verticalClusters = this.buildVerticalClusters(appStateData);
            
            const correlatedData = {
                ...appStateData,
                // Clusters verticalizados por TipoAnalise
                verticalClusters: verticalClusters,
                // Entidades cross-vertical (compartilhadas entre tipos)
                crossVerticalEntities: this.findCrossVerticalEntities(verticalClusters),
                // Estatísticas por vertical
                verticalStats: this.calculateVerticalStats(verticalClusters),
                // Mapa global de entidades
                globalEntityMap: this.buildGlobalEntityMap(verticalClusters)
            };
            
            Logger.success('[GraphVisualizationV2] Dados carregados e verticalizados', {
                files: appStateData.files.length,
                categories: appStateData.categories.length,
                triples: appStateData.triples.length,
                verticals: Object.keys(verticalClusters).length,
                crossVerticalEntities: correlatedData.crossVerticalEntities.size
            });
            
            return correlatedData;
        }

        /**
         * Constrói clusters verticalizados por TipoAnalise
         * @private
         */
        buildVerticalClusters(data) {
            const clusters = {};
            
            // Agrupar por TipoAnalise primeiro (verticalização)
            data.files.forEach(file => {
                const analysisType = file.analysisType || 'Não analisado';
                
                if (!clusters[analysisType]) {
                    clusters[analysisType] = {
                        type: analysisType,
                        color: this.nodeColors[analysisType] || '#999',
                        files: [],
                        entities: new Map(),
                        categories: new Set(),
                        triples: [],
                        stats: {
                            avgRelevance: 0,
                            totalEntities: 0,
                            uniqueEntities: 0,
                            sharedEntities: 0
                        }
                    };
                }
                
                const cluster = clusters[analysisType];
                cluster.files.push(file);
                
                // Coletar entidades do arquivo
                if (file.preview) {
                    const entities = this.extractSimpleEntities(file.preview);
                    entities.forEach(entity => {
                        if (!cluster.entities.has(entity)) {
                            cluster.entities.set(entity, {
                                name: entity,
                                files: new Set(),
                                categories: new Set(),
                                relevanceSum: 0,
                                count: 0
                            });
                        }
                        
                        const entityData = cluster.entities.get(entity);
                        entityData.files.add(file.id);
                        entityData.relevanceSum += (file.relevanceScore || 0);
                        entityData.count++;
                        
                        // Correlacionar com categorias
                        if (file.categories) {
                            file.categories.forEach(catId => {
                                entityData.categories.add(catId);
                                cluster.categories.add(catId);
                            });
                        }
                    });
                }
                
                // Coletar triplas relacionadas
                if (data.triples) {
                    const fileTriples = data.triples.filter(t => t.source === file.id);
                    cluster.triples.push(...fileTriples);
                }
            });
            
            // Calcular estatísticas por cluster
            Object.values(clusters).forEach(cluster => {
                const totalRelevance = cluster.files.reduce((sum, f) => sum + (f.relevanceScore || 0), 0);
                cluster.stats.avgRelevance = cluster.files.length > 0 ? 
                    (totalRelevance / cluster.files.length).toFixed(1) : 0;
                cluster.stats.totalEntities = cluster.entities.size;
                cluster.stats.uniqueEntities = cluster.entities.size;
            });
            
            return clusters;
        }

        /**
         * Encontra entidades compartilhadas entre verticais
         * @private
         */
        findCrossVerticalEntities(verticalClusters) {
            const entityVerticals = new Map();
            
            // Mapear cada entidade para suas verticais
            Object.entries(verticalClusters).forEach(([vertical, cluster]) => {
                cluster.entities.forEach((entityData, entityName) => {
                    if (!entityVerticals.has(entityName)) {
                        entityVerticals.set(entityName, new Set());
                    }
                    entityVerticals.get(entityName).add(vertical);
                });
            });
            
            // Filtrar apenas entidades que aparecem em múltiplas verticais
            const crossVertical = new Map();
            entityVerticals.forEach((verticals, entity) => {
                if (verticals.size > 1) {
                    crossVertical.set(entity, {
                        name: entity,
                        verticals: Array.from(verticals),
                        strength: verticals.size
                    });
                }
            });
            
            return crossVertical;
        }

        /**
         * Calcula estatísticas por vertical
         * @private
         */
        calculateVerticalStats(verticalClusters) {
            const stats = {};
            
            Object.entries(verticalClusters).forEach(([vertical, cluster]) => {
                stats[vertical] = {
                    fileCount: cluster.files.length,
                    entityCount: cluster.entities.size,
                    categoryCount: cluster.categories.size,
                    tripleCount: cluster.triples.length,
                    avgRelevance: cluster.stats.avgRelevance,
                    density: this.calculateClusterDensity(cluster)
                };
            });
            
            return stats;
        }

        /**
         * Constrói mapa global de entidades com contexto vertical
         * @private
         */
        buildGlobalEntityMap(verticalClusters) {
            const globalMap = new Map();
            
            Object.entries(verticalClusters).forEach(([vertical, cluster]) => {
                cluster.entities.forEach((entityData, entityName) => {
                    if (!globalMap.has(entityName)) {
                        globalMap.set(entityName, {
                            name: entityName,
                            verticals: [],
                            totalFiles: new Set(),
                            totalCategories: new Set(),
                            avgRelevance: 0,
                            verticalColors: []
                        });
                    }
                    
                    const globalEntity = globalMap.get(entityName);
                    globalEntity.verticals.push(vertical);
                    entityData.files.forEach(f => globalEntity.totalFiles.add(f));
                    entityData.categories.forEach(c => globalEntity.totalCategories.add(c));
                    globalEntity.verticalColors.push(cluster.color);
                    
                    // Calcular relevância média ponderada
                    const entityAvgRelevance = entityData.count > 0 ? 
                        entityData.relevanceSum / entityData.count : 0;
                    globalEntity.avgRelevance = Math.max(globalEntity.avgRelevance, entityAvgRelevance);
                });
            });
            
            return globalMap;
        }

        /**
         * Calcula densidade de um cluster
         * @private
         */
        calculateClusterDensity(cluster) {
            const nodeCount = cluster.files.length + cluster.entities.size + cluster.categories.size;
            const possibleConnections = nodeCount * (nodeCount - 1) / 2;
            const actualConnections = cluster.files.length * cluster.entities.size + 
                                    cluster.entities.size * cluster.categories.size;
            
            return possibleConnections > 0 ? 
                (actualConnections / possibleConnections).toFixed(3) : 0;
        }

        /**
         * Carrega dados no modo padrão (compatível com V1)
         */
        loadDataStandard() {
            // Limpar arrays para evitar duplicação
            this.allNodes = [];
            this.allEdges = [];
            
            const files = AppState.get('files') || [];
            const categories = KC.CategoryManager?.getCategories() || [];
            
            // Adicionar arquivos
            files.forEach(file => {
                const node = {
                    id: `file-${file.id}`,
                    label: file.name || 'Sem nome',
                    type: 'file',
                    color: this.nodeColors.file,
                    size: 20 + (file.relevanceScore || 0) / 5,
                    title: `${file.path || ''}\nRelevância: ${file.relevanceScore || 0}%\nTipo: ${file.analysisType || 'Não analisado'}`,
                    relevance: file.relevanceScore || 0,
                    analysisType: file.analysisType,
                    metadata: file
                };
                this.allNodes.push(node);
            });
            
            // Adicionar categorias
            categories.forEach(cat => {
                const node = {
                    id: `category-${cat.id || cat.name}`,
                    label: cat.name,
                    type: 'category',
                    color: cat.color || this.nodeColors.category,
                    size: 25,
                    shape: 'square',
                    title: `Categoria: ${cat.name}`
                };
                this.allNodes.push(node);
            });
            
            // Conectar arquivos às categorias
            files.forEach(file => {
                if (file.categories && file.categories.length > 0) {
                    file.categories.forEach(catId => {
                        const edge = {
                            id: `edge-${file.id}-${catId}`,
                            from: `file-${file.id}`,
                            to: `category-${catId}`,
                            label: 'pertence a',
                            color: { color: '#ccc' }
                        };
                        this.allEdges.push(edge);
                    });
                }
            });
            
            // Adicionar entidades
            files.forEach(file => {
                if (file.preview) {
                    const entities = this.extractSimpleEntities(file.preview);
                    entities.forEach((entity, index) => {
                        const entityId = `entity-${file.id}-${index}`;
                        
                        if (!this.allNodes.find(n => n.label === entity)) {
                            const node = {
                                id: entityId,
                                label: entity,
                                type: 'entity',
                                color: this.nodeColors.entity,
                                size: 15,
                                shape: 'diamond',
                                title: `Entidade: ${entity}`
                            };
                            this.allNodes.push(node);
                        }
                        
                        const edge = {
                            id: `edge-entity-${file.id}-${index}`,
                            from: entityId,
                            to: `file-${file.id}`,
                            label: 'mencionado em',
                            color: { color: '#fbbf24' },
                            dashes: true
                        };
                        this.allEdges.push(edge);
                    });
                }
            });
            
            // Ordenar nós por nível para z-index correto
            const sortedNodes = this.sortNodesByLevel(this.allNodes);
            this.addNodesSafely(sortedNodes);
            this.addEdgesSafely(this.allEdges);
        }

        /**
         * Carrega dados no modo entidade-cêntrico
         */
        loadDataEntityCentric() {
            // Limpar arrays para evitar duplicação
            this.allNodes = [];
            this.allEdges = [];
            
            const files = AppState.get('files') || [];
            const categories = KC.CategoryManager?.getCategories() || [];
            
            // FASE 1: Coletar todas as entidades únicas
            files.forEach(file => {
                if (file.preview) {
                    const entities = this.extractSimpleEntities(file.preview);
                    entities.forEach(entity => {
                        if (!this.entityMap.has(entity)) {
                            // Normalizar ID para evitar duplicação
                            const normalizedId = entity
                                .replace(/\s+/g, '-')  // Espaços para hífen
                                .replace(/[^\w\-]/g, '') // Remove caracteres especiais
                                .toLowerCase()
                                .trim();
                            
                            this.entityMap.set(entity, {
                                id: `entity-${normalizedId}`,
                                name: entity,
                                files: new Set(),
                                categories: new Set(),
                                analysisTypes: new Set()
                            });
                        }
                        
                        const entityData = this.entityMap.get(entity);
                        entityData.files.add(file.id);
                        
                        if (file.categories) {
                            file.categories.forEach(cat => entityData.categories.add(cat));
                        }
                        
                        if (file.analysisType) {
                            entityData.analysisTypes.add(file.analysisType);
                        }
                    });
                }
            });
            
            // FASE 2: Criar nós de entidades (CENTRO)
            this.entityMap.forEach((entityData, entityName) => {
                const mainAnalysisType = Array.from(entityData.analysisTypes)[0];
                
                this.allNodes.push({
                    id: entityData.id,
                    label: entityName,
                    type: 'entity',
                    level: 0, // Centro
                    color: mainAnalysisType ? this.nodeColors[mainAnalysisType] : this.nodeColors.entity,
                    size: Math.min(25 + (entityData.files.size * 2), 40), // Limitar tamanho para evitar sobreposição
                    shape: 'star',
                    title: `Entidade: ${entityName}\nMencionada em ${entityData.files.size} arquivos\nTipos: ${Array.from(entityData.analysisTypes).join(', ')}`,
                    analysisTypes: Array.from(entityData.analysisTypes),
                    cluster: mainAnalysisType,
                    font: { size: 16, face: 'arial', bold: true }
                });
            });
            
            // FASE 3: Adicionar categorias (MEIO)
            categories.forEach(cat => {
                // Contar quantas entidades estão nesta categoria
                let entityCount = 0;
                this.entityMap.forEach(entityData => {
                    if (entityData.categories.has(cat.id || cat.name)) {
                        entityCount++;
                    }
                });
                
                this.allNodes.push({
                    id: `category-${cat.id || cat.name}`,
                    label: cat.name,
                    type: 'category',
                    level: 1, // Meio
                    color: cat.color || this.nodeColors.category,
                    size: Math.min(15 + (entityCount * 1), 25), // Limitar tamanho máximo para evitar sobreposição
                    shape: 'square',
                    title: `Categoria: ${cat.name}\n${entityCount} entidades`,
                    font: { size: 12 } // Reduzir tamanho da fonte
                });
            });
            
            // FASE 4: Adicionar arquivos (PERIFERIA)
            files.forEach(file => {
                this.allNodes.push({
                    id: `file-${file.id}`,
                    label: file.name || 'Sem nome',
                    type: 'file',
                    level: 2, // Periferia
                    color: file.analysisType ? this.nodeColors[file.analysisType] : this.nodeColors.file,
                    size: 10, // Reduzir tamanho dos arquivos para melhor visualização
                    shape: 'dot',
                    title: `${file.path || ''}\nRelevância: ${file.relevanceScore || 0}%\nTipo: ${file.analysisType || 'Não analisado'}`,
                    relevance: file.relevanceScore || 0,
                    analysisType: file.analysisType,
                    font: { size: 8 } // Reduzir fonte também
                });
            });
            
            // FASE 5: Criar conexões INVERTIDAS
            // Entidade -> Categoria
            this.entityMap.forEach((entityData, entityName) => {
                entityData.categories.forEach(catId => {
                    // AIDEV-NOTE: edge-fix; corrigir ID duplicado removendo prefixo redundante
                    // entityData.id já contém "entity-", não precisa duplicar
                    const cleanEntityId = entityData.id.replace('entity-', '');
                    const edgeId = `edge-entity-cat-${cleanEntityId}-${catId}`;
                    
                    // Verificar se edge já existe para evitar duplicatas
                    if (!this.allEdges.find(e => e.id === edgeId)) {
                        this.allEdges.push({
                            id: edgeId,
                            from: entityData.id,
                            to: `category-${catId}`,
                            label: 'classificada em',
                            color: { color: '#10b981' },
                            width: 3,
                            arrows: { to: { enabled: true, scaleFactor: 0.8 } }
                        });
                    }
                });
            });
            
            // Categoria -> Arquivo
            files.forEach(file => {
                if (file.categories && file.categories.length > 0) {
                    file.categories.forEach(catId => {
                        this.allEdges.push({
                            id: `edge-cat-file-${catId}-${file.id}`,
                            from: `category-${catId}`,
                            to: `file-${file.id}`,
                            label: 'contém',
                            color: { color: '#ccc' },
                            width: 1,
                            dashes: true
                        });
                    });
                }
            });
            
            // Aplicar layout radial
            this.applyRadialLayout();
            
            // Ordenar nós por nível e adicionar evitando duplicatas
            const sortedNodes = this.sortNodesByLevel(this.allNodes);
            sortedNodes.forEach(node => {
                try {
                    if (!this.nodes.get(node.id)) {
                        this.nodes.add(node);
                    }
                } catch (e) {
                    Logger.warning('[GraphVisualizationV2] Erro ao adicionar nó:', e);
                }
            });
            
            // Adicionar arestas
            this.addEdgesSafely(this.allEdges);
        }

        /**
         * Carrega dados no modo clusters por TipoAnalise
         */
        loadDataClusters() {
            // Limpar arrays para evitar duplicação
            this.allNodes = [];
            this.allEdges = [];
            
            const files = AppState.get('files') || [];
            
            // Agrupar arquivos por TipoAnalise
            const filesByType = new Map();
            files.forEach(file => {
                const type = file.analysisType || 'Não analisado';
                if (!filesByType.has(type)) {
                    filesByType.set(type, []);
                }
                filesByType.get(type).push(file);
            });
            
            // Criar clusters
            let clusterIndex = 0;
            const clusterCount = filesByType.size;
            const radius = 400;
            
            filesByType.forEach((clusterFiles, analysisType) => {
                const angle = (2 * Math.PI * clusterIndex) / clusterCount;
                const centerX = radius * Math.cos(angle);
                const centerY = radius * Math.sin(angle);
                
                // Nó central do cluster
                const clusterId = `cluster-${analysisType.replace(/\s/g, '-')}`;
                this.allNodes.push({
                    id: clusterId,
                    label: analysisType,
                    type: 'cluster',
                    x: centerX,
                    y: centerY,
                    fixed: true,
                    color: this.nodeColors[analysisType] || '#999',
                    size: 40,
                    shape: 'hexagon',
                    font: { size: 18, face: 'arial', bold: true },
                    title: `Cluster: ${analysisType}\n${clusterFiles.length} arquivos`
                });
                
                // Adicionar arquivos do cluster
                clusterFiles.forEach((file, i) => {
                    const fileAngle = (2 * Math.PI * i) / clusterFiles.length;
                    const fileRadius = 150;
                    
                    this.allNodes.push({
                        id: `file-${file.id}`,
                        label: file.name || 'Sem nome',
                        type: 'file',
                        cluster: analysisType,
                        x: centerX + fileRadius * Math.cos(fileAngle),
                        y: centerY + fileRadius * Math.sin(fileAngle),
                        color: this.nodeColors[analysisType] || this.nodeColors.file,
                        size: 15 + (file.relevanceScore || 0) / 10,
                        title: `${file.path || ''}\nRelevância: ${file.relevanceScore || 0}%`,
                        relevance: file.relevanceScore || 0
                    });
                    
                    // Conectar ao centro do cluster
                    this.allEdges.push({
                        id: `edge-cluster-${file.id}`,
                        from: clusterId,
                        to: `file-${file.id}`,
                        color: { color: this.nodeColors[analysisType] || '#999', opacity: 0.3 },
                        width: 1
                    });
                });
                
                // Adicionar entidades do cluster
                clusterFiles.forEach(file => {
                    if (file.preview) {
                        const entities = this.extractSimpleEntities(file.preview);
                        entities.forEach((entity, index) => {
                            const entityId = `entity-cluster-${analysisType}-${entity.replace(/\s/g, '-')}`;
                            
                            if (!this.allNodes.find(n => n.id === entityId)) {
                                this.allNodes.push({
                                    id: entityId,
                                    label: entity,
                                    type: 'entity',
                                    cluster: analysisType,
                                    color: this.nodeColors[analysisType] || this.nodeColors.entity,
                                    size: 12,
                                    shape: 'diamond'
                                });
                            }
                        });
                    }
                });
                
                clusterIndex++;
            });
            
            // Adicionar conexões cross-cluster para entidades compartilhadas
            this.addCrossClusterConnections();
            
            // Ordenar nós por nível para z-index correto
            const sortedNodes = this.sortNodesByLevel(this.allNodes);
            this.addNodesSafely(sortedNodes);
            this.addEdgesSafely(this.allEdges);
        }

        /**
         * Aplica layout radial para modo entidade-cêntrico
         */
        applyRadialLayout() {
            // Separar nós por nível
            const levels = {
                0: [], // Entidades (centro)
                1: [], // Categorias (meio)
                2: []  // Arquivos (periferia)
            };
            
            this.allNodes.forEach(node => {
                if (node.level !== undefined) {
                    levels[node.level].push(node);
                }
            });
            
            // Posicionar entidades no centro
            const entityCount = levels[0].length;
            const entityRadius = entityCount > 1 ? 100 : 0;
            levels[0].forEach((node, i) => {
                const angle = (2 * Math.PI * i) / entityCount;
                node.x = entityRadius * Math.cos(angle);
                node.y = entityRadius * Math.sin(angle);
            });
            
            // Posicionar categorias no meio
            const categoryRadius = 300;
            levels[1].forEach((node, i) => {
                const angle = (2 * Math.PI * i) / levels[1].length;
                node.x = categoryRadius * Math.cos(angle);
                node.y = categoryRadius * Math.sin(angle);
            });
            
            // Posicionar arquivos na periferia
            const fileRadius = 500;
            levels[2].forEach((node, i) => {
                const angle = (2 * Math.PI * i) / levels[2].length;
                node.x = fileRadius * Math.cos(angle);
                node.y = fileRadius * Math.sin(angle);
            });
        }

        /**
         * Adiciona conexões entre clusters
         */
        addCrossClusterConnections() {
            const entityClusters = new Map();
            
            // Mapear entidades para seus clusters
            this.allNodes.forEach(node => {
                if (node.type === 'entity' && node.cluster) {
                    const key = node.label;
                    if (!entityClusters.has(key)) {
                        entityClusters.set(key, new Set());
                    }
                    entityClusters.get(key).add(node.cluster);
                }
            });
            
            // Criar conexões entre clusters que compartilham entidades
            entityClusters.forEach((clusters, entity) => {
                if (clusters.size > 1) {
                    const clusterArray = Array.from(clusters);
                    for (let i = 0; i < clusterArray.length - 1; i++) {
                        for (let j = i + 1; j < clusterArray.length; j++) {
                            const edgeId = `cross-cluster-${clusterArray[i]}-${clusterArray[j]}-${entity}`;
                            if (!this.allEdges.find(e => e.id === edgeId)) {
                                this.allEdges.push({
                                    id: edgeId,
                                    from: `cluster-${clusterArray[i].replace(/\s/g, '-')}`,
                                    to: `cluster-${clusterArray[j].replace(/\s/g, '-')}`,
                                    label: entity,
                                    color: { color: '#8b5cf6', opacity: 0.5 },
                                    width: 3,
                                    dashes: true,
                                    title: `Entidade compartilhada: ${entity}`
                                });
                            }
                        }
                    }
                }
            });
        }

        /**
         * Extrai entidades simples do preview
         */
        extractSimpleEntities(preview) {
            const entities = [];
            let text = '';
            
            if (typeof preview === 'string') {
                text = preview;
            } else if (preview && preview.segments) {
                text = Object.values(preview.segments).join(' ');
            }
            
            const matches = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || [];
            
            return [...new Set(matches)].slice(0, 5);
        }

        /**
         * Carrega dados no modo vertical-clusters (entidade-cêntrico com verticalização)
         */
        loadDataVerticalClusters() {
            Logger.info('[GraphVisualizationV2] Carregando visualização com ordem correta: TipoAnalise→Categoria→Entidade→Arquivo');
            
            // Limpar dados anteriores
            this.nodes.clear();
            this.edges.clear();
            this.allNodes = [];
            this.allEdges = [];
            
            // Obter dados correlacionados
            const data = this.loadFromAppState();
            const files = data.files || [];
            
            // Agrupar por TipoAnalise (centro do grafo)
            const tiposAnalise = new Map();
            
            files.forEach(file => {
                const tipo = file.analysisType || 'Não Analisado';
                if (!tiposAnalise.has(tipo)) {
                    tiposAnalise.set(tipo, {
                        categorias: new Map(),
                        entidades: new Map(),
                        arquivos: []
                    });
                }
                
                const cluster = tiposAnalise.get(tipo);
                cluster.arquivos.push(file);
                
                // Mapear categorias
                if (file.categories) {
                    file.categories.forEach(catId => {
                        const categoria = data.categories.find(c => c.id === catId || c.name === catId);
                        if (categoria) {
                            if (!cluster.categorias.has(categoria.name)) {
                                cluster.categorias.set(categoria.name, {
                                    info: categoria,
                                    entidades: new Set(),
                                    arquivos: []
                                });
                            }
                            cluster.categorias.get(categoria.name).arquivos.push(file);
                        }
                    });
                }
                
                // Extrair entidades mencionadas
                if (file.preview) {
                    const entidades = this.extractSimpleEntities(file.preview);
                    entidades.forEach(entidade => {
                        if (!cluster.entidades.has(entidade)) {
                            cluster.entidades.set(entidade, {
                                categorias: new Set(),
                                arquivos: []
                            });
                        }
                        cluster.entidades.get(entidade).arquivos.push(file);
                        
                        // Relacionar entidade com categorias do arquivo
                        if (file.categories) {
                            file.categories.forEach(catId => {
                                const cat = data.categories.find(c => c.id === catId || c.name === catId);
                                if (cat) {
                                    cluster.entidades.get(entidade).categorias.add(cat.name);
                                    if (cluster.categorias.has(cat.name)) {
                                        cluster.categorias.get(cat.name).entidades.add(entidade);
                                    }
                                }
                            });
                        }
                    });
                }
            });
            
            // Calcular posições dos clusters
            const clusterPositions = this.calculateClusterPositions(tiposAnalise.size);
            let clusterIndex = 0;
            
            // 1. CENTRO: Criar nós de TipoAnalise
            tiposAnalise.forEach((cluster, tipoAnalise) => {
                const basePos = clusterPositions[clusterIndex];
                const tipoId = `tipo-${tipoAnalise.replace(/\s+/g, '-')}`;
                const tipoColor = this.nodeColors[tipoAnalise] || '#6366f1';
                
                // Nó central: TipoAnalise
                // MOVIMENTO PESADO: mass: 5 para movimento lento e estável
                this.allNodes.push({
                    id: tipoId,
                    label: tipoAnalise,
                    type: 'tipoAnalise',
                    level: 0, // Centro absoluto (renderizado primeiro = fica atrás)
                    x: basePos.x,
                    y: basePos.y,
                    size: 40, // Reduzido de 50 para melhor visualização
                    color: {
                        background: tipoColor,
                        border: tipoColor,
                        highlight: {
                            background: tipoColor,
                            border: '#fff'
                        }
                    },
                    shape: 'hexagon',
                    font: { size: 18, color: '#fff', bold: true }, // Fonte levemente menor
                    borderWidth: 3, // Reduzido de 4
                    borderColor: '#fff',
                    opacity: 0.9, // Leve transparência para não bloquear visão
                    title: `Tipo de Análise: ${tipoAnalise}\n${cluster.arquivos.length} arquivos\n${cluster.categorias.size} categorias\n${cluster.entidades.size} entidades`,
                    // PHYSICS: Movimento pesado mas não fixo
                    fixed: false,
                    mass: 5, // Mais pesado = movimento mais lento
                    damping: 0.8 // Alta resistência ao movimento
                });
                
                // 2. PRIMEIRO ANEL: Categorias (compartilhaCategoriaCom)
                // AUMENTADO: Raio de 120 para 150 para melhor espaçamento
                const catPositions = this.calculateRingPositions(basePos, cluster.categorias.size, 150);
                let catIndex = 0;
                
                cluster.categorias.forEach((catData, catNome) => {
                    const catPos = catPositions[catIndex];
                    const catId = `cat-${tipoAnalise}-${catNome.replace(/\s+/g, '-')}`;
                    
                    this.allNodes.push({
                        id: catId,
                        label: catNome,
                        type: 'categoria',
                        level: 1, // Segundo nível de renderização
                        x: catPos.x,
                        y: catPos.y,
                        size: 25, // Reduzido de 30 para 25
                        color: catData.info.color || this.nodeColors.category,
                        shape: 'square',
                        font: { size: 13, color: '#fff' }, // Fonte ajustada
                        borderWidth: 2,
                        borderColor: tipoColor,
                        opacity: 0.95, // Quase opaco
                        title: `Categoria: ${catNome}\n${catData.entidades.size} entidades\n${catData.arquivos.length} arquivos`,
                        // PHYSICS: Movimento moderado
                        fixed: false,
                        mass: 3, // Peso médio
                        damping: 0.6 // Resistência moderada
                    });
                    
                    // Conectar categoria ao tipo (compartilhaCategoriaCom)
                    this.allEdges.push({
                        id: `edge-tipo-cat-${tipoId}-${catId}`,
                        from: tipoId,
                        to: catId,
                        label: 'compartilhaCategoriaCom',
                        color: { color: tipoColor, opacity: 0.8 },
                        width: 4,
                        smooth: { type: 'curvedCW', roundness: 0.1 }
                    });
                    
                    catIndex++;
                });
                
                // 3. SEGUNDO ANEL: Entidades por categoria
                cluster.categorias.forEach((catData, catNome) => {
                    const catId = `cat-${tipoAnalise}-${catNome.replace(/\s+/g, '-')}`;
                    
                    // Posicionar entidades ao redor da categoria
                    const catNode = this.allNodes.find(n => n.id === catId);
                    if (!catNode) return;
                    
                    const entidadeArray = Array.from(catData.entidades);
                    const entPositions = this.calculateRingPositions(
                        { x: catNode.x, y: catNode.y }, 
                        entidadeArray.length, 
                        80
                    );
                    
                    entidadeArray.forEach((entidade, entIndex) => {
                        const entPos = entPositions[entIndex];
                        // Normalizar IDs para evitar duplicação
                        const normalizedTipo = tipoAnalise.replace(/\s+/g, '-');
                        const normalizedCat = catNome.replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
                        const normalizedEnt = entidade.replace(/\s+/g, '-').replace(/[^\w\-]/g, '').toLowerCase();
                        const entId = `ent-${normalizedTipo}-${normalizedCat}-${normalizedEnt}`;
                        
                        // Verificar se o nó já existe antes de adicionar
                        if (!this.allNodes.find(n => n.id === entId)) {
                            this.allNodes.push({
                                id: entId,
                                label: entidade,
                                type: 'entidade',
                                level: 2,
                                x: entPos.x,
                                y: entPos.y,
                                size: 20,
                                color: this.nodeColors.entity,
                                shape: 'diamond',
                                font: { size: 12 },
                                borderWidth: 2,
                                borderColor: catData.info.color || tipoColor,
                                title: `Entidade: ${entidade}\nCategoria: ${catNome}\nTipo: ${tipoAnalise}`,
                                // PHYSICS: Movimento médio
                                fixed: false,
                                mass: 2, // Peso leve
                                damping: 0.4 // Resistência baixa
                            });
                            
                            // Conectar entidade à categoria (mencionaEntidade)
                            this.allEdges.push({
                                id: `edge-ent-cat-${entId}-${catId}`,
                                from: catId,
                                to: entId,
                                label: 'mencionaEntidade',
                                color: { color: catData.info.color || tipoColor, opacity: 0.6 },
                                width: 2,
                                smooth: { type: 'continuous' }
                            });
                        }
                    });
                });
                
                // 4. ANEL EXTERNO: Arquivos
                const allFilesForTipo = [];
                cluster.categorias.forEach((catData, catNome) => {
                    catData.arquivos.forEach(file => {
                        if (!allFilesForTipo.find(f => f.id === file.id)) {
                            allFilesForTipo.push(file);
                        }
                    });
                });
                
                // AUMENTADO: Raio de 250 para 300 para arquivos ficarem na periferia
                const filePositions = this.calculateRingPositions(basePos, allFilesForTipo.length, 300);
                allFilesForTipo.forEach((file, fileIndex) => {
                    const filePos = filePositions[fileIndex];
                    const fileId = `file-${file.id}`;
                    const relevance = file.relevanceScore || 0;
                    
                    this.allNodes.push({
                        id: fileId,
                        label: file.name,
                        type: 'arquivo',
                        level: 3,
                        x: filePos.x,
                        y: filePos.y,
                        size: 8 + relevance / 20,
                        color: relevance > 55 ? '#ef4444' : this.nodeColors.file,
                        shape: 'dot',
                        font: { size: 10 },
                        borderWidth: relevance > 55 ? 3 : 1,
                        borderColor: relevance > 55 ? '#dc2626' : '#ccc',
                        title: `Arquivo: ${file.name}\nRelevância: ${relevance}%\nTipo: ${tipoAnalise}`,
                        relevance: relevance,
                        // PHYSICS: Movimento dinâmico
                        fixed: false,
                        mass: 1, // Mais leve = movimento rápido
                        damping: 0.2 // Baixa resistência
                    });
                    
                    // Conectar arquivo às suas categorias (segueTemporalmente)
                    if (file.categories) {
                        file.categories.forEach(catId => {
                            const catName = data.categories.find(c => c.id === catId || c.name === catId)?.name;
                            if (catName && cluster.categorias.has(catName)) {
                                const catNodeId = `cat-${tipoAnalise}-${catName.replace(/\s+/g, '-')}`;
                                
                                this.allEdges.push({
                                    id: `edge-file-cat-${fileId}-${catNodeId}`,
                                    from: catNodeId,
                                    to: fileId,
                                    label: 'segueTemporalmente',
                                    color: { color: '#94a3b8', opacity: 0.4 },
                                    width: 1,
                                    dashes: true,
                                    smooth: { type: 'discrete' }
                                });
                                
                                // 5. Se relevância > 55%, criar conexão inversa para o centro
                                if (relevance > 55) {
                                    this.allEdges.push({
                                        id: `edge-high-rel-${fileId}-${tipoId}`,
                                        from: fileId,
                                        to: tipoId,
                                        label: 'possuiInsight',
                                        color: { color: '#dc2626', opacity: 0.6 },
                                        width: 3,
                                        arrows: { to: { enabled: true, scaleFactor: 1.2 } },
                                        smooth: { type: 'curvedCCW', roundness: 0.3 },
                                        title: `Alta relevância (${relevance}%) sugere insight importante`
                                    });
                                }
                            }
                        });
                    }
                });
                
                clusterIndex++;
            });
            
            // IMPORTANTE: Ordenar nós por nível para controlar z-index
            // Arquivos (level 3) serão renderizados por último (ficam na frente)
            // TipoAnalise (level 0) será renderizado primeiro (fica atrás)
            // Isso evita que os hexágonos grandes cubram os elementos menores
            const sortedNodes = this.sortNodesByLevel(this.allNodes);
            
            // Aplicar nós ordenados e arestas
            this.addNodesSafely(sortedNodes);
            this.addEdgesSafely(this.allEdges);
            
            // Forçar layout com physics ajustado para sistema de mass
            // PHYSICS PROPORCIONAL: Configurado para movimento baseado em peso
            this.network.setOptions({
                physics: {
                    enabled: true,
                    solver: 'forceAtlas2Based',
                    forceAtlas2Based: {
                        gravitationalConstant: -50, // Atração para manter coesão
                        centralGravity: 0.01, // Leve atração central
                        springLength: 150, // Distância ideal entre nós conectados
                        springConstant: 0.08, // Força das conexões
                        damping: 0.4, // Resistência geral ao movimento
                        avoidOverlap: 0.5 // Evitar sobreposição
                    },
                    stabilization: {
                        enabled: true,
                        iterations: 150, // Menos iterações para permitir movimento
                        updateInterval: 50,
                        onlyDynamicEdges: false,
                        fit: true
                    },
                    timestep: 0.5, // Controla velocidade da simulação
                    adaptiveTimestep: true
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 300
                },
                layout: {
                    improvedLayout: true,
                    hierarchical: false // Não usar layout hierárquico automático
                }
            });

            // Estabilizar a visualização
            this.network.stabilize(150);
        }

        /**
         * Calcula posições dos clusters verticais
         * @private
         */
        calculateVerticalPositions(verticalClusters) {
            const positions = {};
            const clusterCount = Object.keys(verticalClusters).length;
            const radius = 600;
            
            Object.keys(verticalClusters).forEach((vertical, index) => {
                const angle = (2 * Math.PI * index) / clusterCount;
                positions[vertical] = {
                    centerX: radius * Math.cos(angle),
                    centerY: radius * Math.sin(angle),
                    angle: angle
                };
            });
            
            return positions;
        }

        /**
         * Aplica filtros aos dados
         */
        applyFilters() {
            const showFiles = document.getElementById('filter-files')?.checked ?? true;
            const showCategories = document.getElementById('filter-categories')?.checked ?? true;
            const showEntities = document.getElementById('filter-entities')?.checked ?? true;
            const minRelevance = parseInt(document.getElementById('relevance-filter')?.value || 0);
            
            // Filtros por TipoAnalise
            const analysisFilters = {
                'Breakthrough Técnico': document.getElementById('filter-breakthrough')?.checked ?? true,
                'Evolução Conceitual': document.getElementById('filter-evolucao')?.checked ?? true,
                'Momento Decisivo': document.getElementById('filter-decisivo')?.checked ?? true,
                'Insight Estratégico': document.getElementById('filter-insight')?.checked ?? true,
                'Aprendizado Geral': document.getElementById('filter-aprendizado')?.checked ?? true
            };
            
            // Filtrar nós
            const filteredNodes = this.allNodes.filter(node => {
                // Filtro por tipo
                if (node.type === 'file' && !showFiles) return false;
                if (node.type === 'category' && !showCategories) return false;
                if (node.type === 'entity' && !showEntities) return false;
                
                // Filtro por relevância
                if (node.relevance !== undefined && node.relevance < minRelevance) return false;
                
                // Filtro por TipoAnalise
                if (node.analysisType && !analysisFilters[node.analysisType]) return false;
                if (node.analysisTypes) {
                    const hasVisibleType = node.analysisTypes.some(type => analysisFilters[type]);
                    if (!hasVisibleType) return false;
                }
                
                return true;
            });
            
            const nodeIds = filteredNodes.map(n => n.id);
            
            // Filtrar arestas
            const filteredEdges = this.allEdges.filter(edge => {
                return nodeIds.includes(edge.from) && nodeIds.includes(edge.to);
            });
            
            // Atualizar visualização usando métodos seguros
            this.nodes.clear();
            this.edges.clear();
            this.addNodesSafely(filteredNodes);
            this.addEdgesSafely(filteredEdges);
            
            // Atualizar estatísticas
            this.updateStats();
            
            Logger.info(`[GraphVisualizationV2] Filtros aplicados: ${filteredNodes.length} nós, ${filteredEdges.length} arestas`);
        }

        /**
         * Atualiza estatísticas incluindo densidade por cluster
         */
        updateStats() {
            const nodeCount = this.nodes.length;
            const edgeCount = this.edges.length;
            const density = nodeCount > 1 ? (2 * edgeCount / (nodeCount * (nodeCount - 1))).toFixed(3) : 0;
            
            // Estatísticas básicas
            document.getElementById('node-count').textContent = nodeCount;
            document.getElementById('edge-count').textContent = edgeCount;
            document.getElementById('graph-density').textContent = density;
            
            // Contar entidades únicas
            const entityCount = this.nodes.get().filter(n => n.type === 'entity').length;
            document.getElementById('entity-count').textContent = entityCount;
            
            // Se estiver no modo clusters ou vertical-clusters, calcular densidade por cluster
            if (this.viewMode === 'clusters' || this.viewMode === 'vertical-clusters') {
                this.updateClusterStats();
            }
            
            // Se estiver no modo vertical-clusters, mostrar métricas adicionais
            if (this.viewMode === 'vertical-clusters') {
                this.updateVerticalMetrics();
            }
        }

        /**
         * Atualiza métricas específicas do modo vertical-clusters
         */
        updateVerticalMetrics() {
            const nodes = this.nodes.get();
            const edges = this.edges.get();
            
            // Contar entidades compartilhadas
            const sharedEntities = nodes.filter(n => n.type === 'entity' && n.isShared).length;
            const totalEntities = nodes.filter(n => n.type === 'entity').length;
            
            // Contar verticais ativas
            const verticals = new Set();
            nodes.forEach(n => {
                if (n.vertical) verticals.add(n.vertical);
                if (n.verticals) n.verticals.forEach(v => verticals.add(v));
            });
            
            // Adicionar estatísticas verticais ao painel
            const statsDiv = document.getElementById('cluster-stats');
            if (statsDiv) {
                let html = '<h4>Métricas Verticais:</h4>';
                html += `<div><strong>Verticais Ativas:</strong> ${verticals.size}</div>`;
                html += `<div><strong>Entidades Totais:</strong> ${totalEntities}</div>`;
                html += `<div><strong>Entidades Compartilhadas:</strong> ${sharedEntities} (${totalEntities > 0 ? (sharedEntities/totalEntities*100).toFixed(1) : 0}%)</div>`;
                
                // Densidade cross-vertical
                const crossVerticalConnections = edges.filter(e => {
                    const fromNode = nodes.find(n => n.id === e.from);
                    const toNode = nodes.find(n => n.id === e.to);
                    return fromNode?.vertical !== toNode?.vertical;
                }).length;
                
                html += `<div><strong>Conexões Cross-Vertical:</strong> ${crossVerticalConnections}</div>`;
                
                statsDiv.innerHTML = html;
                statsDiv.style.display = 'block';
            }
        }

        /**
         * Calcula e exibe estatísticas por cluster
         */
        updateClusterStats() {
            const clusterStatsDiv = document.getElementById('cluster-stats');
            const clusters = new Map();
            
            // Verificar se nodes e edges existem
            if (!this.nodes || !this.edges) {
                Logger.warn('[GraphVisualizationV2] nodes ou edges não inicializados');
                return;
            }
            
            // Agrupar nós por cluster
            this.nodes.forEach(node => {
                if (node.cluster) {
                    if (!clusters.has(node.cluster)) {
                        clusters.set(node.cluster, {
                            nodes: [],
                            edges: 0
                        });
                    }
                    clusters.get(node.cluster).nodes.push(node.id);
                }
            });
            
            // Contar arestas por cluster
            this.edges.forEach(edge => {
                const fromNode = this.nodes.get(edge.from);
                const toNode = this.nodes.get(edge.to);
                
                if (fromNode && toNode && fromNode.cluster === toNode.cluster && clusters.has(fromNode.cluster)) {
                    clusters.get(fromNode.cluster).edges++;
                }
            });
            
            // Gerar HTML das estatísticas
            let html = '<h4>Densidade por Cluster:</h4>';
            clusters.forEach((data, clusterName) => {
                const clusterNodeCount = data.nodes.length;
                const clusterEdgeCount = data.edges;
                const clusterDensity = clusterNodeCount > 1 ? 
                    (2 * clusterEdgeCount / (clusterNodeCount * (clusterNodeCount - 1))).toFixed(3) : 0;
                
                html += `
                    <div style="color: ${this.nodeColors[clusterName] || '#999'}">
                        <strong>${clusterName}:</strong> 
                        ${clusterNodeCount} nós, ${clusterEdgeCount} conexões, 
                        densidade: ${clusterDensity}
                    </div>
                `;
            });
            
            clusterStatsDiv.innerHTML = html;
            clusterStatsDiv.style.display = 'block';
        }

        /**
         * Muda o modo de visualização
         */
        setViewMode(mode) {
            this.viewMode = mode;
            Logger.info(`[GraphVisualizationV2] Mudando para modo: ${mode}`);
            
            // Mostrar/esconder estatísticas de cluster
            const clusterStats = document.getElementById('cluster-stats');
            if (clusterStats) {
                clusterStats.style.display = mode === 'clusters' ? 'block' : 'none';
            }
            
            // Recarregar dados com novo layout
            this.loadData();
        }

        /**
         * Alterna entre modos de visualização
         */
        toggleViewMode() {
            const modes = ['standard', 'clusters', 'entity-centric', 'vertical-clusters'];
            const currentIndex = modes.indexOf(this.viewMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            
            this.setViewMode(modes[nextIndex]);
            
            // Atualizar radio button
            const radio = document.querySelector(`input[name="viewMode"][value="${modes[nextIndex]}"]`);
            if (radio) radio.checked = true;
        }

        /**
         * Foca em um nó específico
         */
        focusOnNode(nodeId) {
            this.network.focus(nodeId, {
                scale: 1.5,
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuad'
                }
            });
            
            // Destacar conexões do nó
            this.highlightNodeConnections(nodeId);
        }

        /**
         * Destaca conexões de um nó
         */
        highlightNodeConnections(nodeId) {
            const connectedNodes = this.network.getConnectedNodes(nodeId);
            const connectedEdges = this.network.getConnectedEdges(nodeId);
            
            // Reduzir opacidade de todos os nós
            const updateNodes = this.nodes.get().map(node => {
                if (node.id === nodeId || connectedNodes.includes(node.id)) {
                    return { ...node, opacity: 1 };
                } else {
                    return { ...node, opacity: 0.2 };
                }
            });
            
            this.nodes.update(updateNodes);
            
            // Resetar após 3 segundos
            setTimeout(() => {
                const resetNodes = this.nodes.get().map(node => ({ ...node, opacity: 1 }));
                this.nodes.update(resetNodes);
            }, 3000);
        }

        /**
         * Mostra detalhes do nó selecionado
         */
        showNodeDetails(nodeId) {
            const node = this.nodes.get(nodeId);
            if (!node) return;
            
            let details = `${node.label} (${node.type})`;
            
            if (node.analysisTypes) {
                details += `\nTipos: ${node.analysisTypes.join(', ')}`;
            }
            
            if (this.viewMode === 'entity-centric' && node.type === 'entity') {
                const entityData = this.entityMap.get(node.label);
                if (entityData) {
                    details += `\nArquivos: ${entityData.files.size}`;
                    details += `\nCategorias: ${entityData.categories.size}`;
                }
            }
            
            EventBus.emit(Events.NOTIFICATION, {
                type: 'info',
                message: details,
                duration: 5000
            });
        }

        /**
         * Exporta o grafo com metadados estendidos
         */
        exportGraph() {
            const densityStats = this.calculateDensityStats();
            
            const data = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    viewMode: this.viewMode,
                    nodeCount: this.nodes.length,
                    edgeCount: this.edges.length,
                    entityCount: this.entityMap.size,
                    densityStats: densityStats
                },
                nodes: this.nodes.get(),
                edges: this.edges.get(),
                entities: Array.from(this.entityMap.entries()).map(([name, data]) => ({
                    name,
                    fileCount: data.files.size,
                    categories: Array.from(data.categories),
                    analysisTypes: Array.from(data.analysisTypes)
                }))
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `knowledge-graph-v2-${this.viewMode}-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            EventBus.emit(Events.NOTIFICATION, {
                type: 'success',
                message: `Grafo exportado (modo ${this.viewMode})!`
            });
        }

        /**
         * Calcula estatísticas de densidade detalhadas
         */
        calculateDensityStats() {
            const stats = {
                overall: {
                    nodes: this.nodes.length,
                    edges: this.edges.length,
                    density: 0
                },
                byType: {},
                byAnalysisType: {},
                crossConnections: 0
            };
            
            // Densidade geral
            const n = stats.overall.nodes;
            stats.overall.density = n > 1 ? (2 * stats.overall.edges / (n * (n - 1))) : 0;
            
            // Densidade por tipo de nó
            const types = ['file', 'category', 'entity'];
            types.forEach(type => {
                const typeNodes = this.nodes.get().filter(n => n.type === type);
                const typeEdges = this.edges.get().filter(e => {
                    const from = this.nodes.get(e.from);
                    const to = this.nodes.get(e.to);
                    return from?.type === type || to?.type === type;
                });
                
                stats.byType[type] = {
                    nodes: typeNodes.length,
                    edges: typeEdges.length,
                    avgConnections: typeNodes.length > 0 ? typeEdges.length / typeNodes.length : 0
                };
            });
            
            // Densidade por TipoAnalise
            const analysisTypes = ['Breakthrough Técnico', 'Evolução Conceitual', 
                                  'Momento Decisivo', 'Insight Estratégico', 'Aprendizado Geral'];
            
            analysisTypes.forEach(aType => {
                const typeNodes = this.nodes.get().filter(n => 
                    n.analysisType === aType || (n.analysisTypes && n.analysisTypes.includes(aType))
                );
                
                stats.byAnalysisType[aType] = {
                    nodes: typeNodes.length,
                    percentage: n > 0 ? (typeNodes.length / n * 100).toFixed(1) : 0
                };
            });
            
            return stats;
        }

        /**
         * Destaca o caminho de um nó até o centro (TipoAnalise)
         * @param {string} nodeId - ID do nó clicado
         */
        highlightPathToCenter(nodeId) {
            const node = this.nodes.get(nodeId);
            if (!node) return;
            
            // Evitar múltiplos destaques simultâneos
            if (this.isHighlighting) {
                this.resetHighlight();
                return;
            }
            this.isHighlighting = true;
            
            Logger.info(`[GraphVisualizationV2] Destacando caminho de ${nodeId} até o centro`);
            
            // Encontrar o caminho até o TipoAnalise
            const path = this.tracePathToCenter(nodeId);
            if (!path || path.length === 0) {
                this.isHighlighting = false;
                return;
            }
            
            // Coletar todos os nós e arestas no caminho
            const pathNodes = new Set(path);
            const pathEdges = new Set();
            
            // Encontrar arestas que conectam os nós do caminho
            for (let i = 0; i < path.length - 1; i++) {
                this.edges.forEach(edge => {
                    if ((edge.from === path[i] && edge.to === path[i + 1]) ||
                        (edge.to === path[i] && edge.from === path[i + 1])) {
                        pathEdges.add(edge.id);
                    }
                });
            }
            
            // Salvar tamanhos originais para evitar crescimento exponencial
            if (!this.originalSizes) {
                this.originalSizes = new Map();
                this.nodes.forEach(node => {
                    this.originalSizes.set(node.id, {
                        size: node.size,
                        borderWidth: node.borderWidth || 2
                    });
                });
            }
            
            // Atualizar visual dos nós
            const nodeUpdates = [];
            this.nodes.forEach(node => {
                const original = this.originalSizes.get(node.id);
                if (!original) {
                    // Se não temos o tamanho original, salvar agora
                    this.originalSizes.set(node.id, {
                        size: node.size || 20,
                        borderWidth: node.borderWidth || 2
                    });
                    return; // Pular este nó por enquanto
                }
                
                if (pathNodes.has(node.id)) {
                    // Nós no caminho: destacar
                    nodeUpdates.push({
                        id: node.id,
                        opacity: 1,
                        size: original.size * 1.3, // Usar tamanho original
                        borderWidth: original.borderWidth * 2
                    });
                } else {
                    // Outros nós: reduzir opacidade
                    nodeUpdates.push({
                        id: node.id,
                        opacity: 0.2,
                        size: original.size,
                        borderWidth: original.borderWidth
                    });
                }
            });
            
            // Atualizar visual das arestas
            const edgeUpdates = [];
            this.edges.forEach(edge => {
                if (pathEdges.has(edge.id)) {
                    // Arestas no caminho: destacar
                    edgeUpdates.push({
                        id: edge.id,
                        width: 6, // Largura fixa para destaque
                        color: '#fbbf24' // Amarelo dourado (string simples)
                    });
                } else {
                    // Outras arestas: reduzir opacidade  
                    const originalColor = typeof edge.color === 'object' ? edge.color.color : edge.color;
                    edgeUpdates.push({
                        id: edge.id,
                        width: edge.width || 2,
                        color: {
                            color: originalColor || '#999',
                            opacity: 0.1
                        }
                    });
                }
            });
            
            // Aplicar atualizações
            this.nodes.update(nodeUpdates);
            this.edges.update(edgeUpdates);
            
            // Resetar após 4 segundos
            if (this.highlightTimeout) {
                clearTimeout(this.highlightTimeout);
            }
            this.highlightTimeout = setTimeout(() => {
                this.resetHighlight();
            }, 4000);
        }

        /**
         * Traça o caminho de um nó até o TipoAnalise central
         * @param {string} nodeId - ID do nó inicial
         * @returns {Array} Array com IDs dos nós no caminho
         */
        tracePathToCenter(nodeId) {
            const node = this.nodes.get(nodeId);
            if (!node) return [];
            
            const path = [nodeId];
            let currentNode = node;
            
            // Navegar pela hierarquia até encontrar TipoAnalise
            while (currentNode && currentNode.type !== 'tipoAnalise') {
                // Encontrar conexões do nó atual
                const connectedEdges = this.network.getConnectedEdges(currentNode.id);
                let nextNodeId = null;
                
                // Procurar por nó de nível inferior (em direção ao centro)
                for (const edgeId of connectedEdges) {
                    const edge = this.edges.get(edgeId);
                    if (!edge) continue;
                    
                    const otherNodeId = edge.from === currentNode.id ? edge.to : edge.from;
                    const otherNode = this.nodes.get(otherNodeId);
                    
                    if (otherNode && otherNode.level < currentNode.level) {
                        nextNodeId = otherNodeId;
                        break;
                    }
                }
                
                if (!nextNodeId) break;
                
                path.push(nextNodeId);
                currentNode = this.nodes.get(nextNodeId);
            }
            
            return path;
        }

        /**
         * Reseta o destaque visual
         */
        resetHighlight() {
            Logger.info('[GraphVisualizationV2] Resetando destaque visual');
            
            // Resetar flag
            this.isHighlighting = false;
            
            // Limpar timeout se existir
            if (this.highlightTimeout) {
                clearTimeout(this.highlightTimeout);
                this.highlightTimeout = null;
            }
            
            // Resetar nós para estado original
            const nodeUpdates = [];
            if (this.originalSizes) {
                this.nodes.forEach(node => {
                    const original = this.originalSizes.get(node.id);
                    if (original) {
                        nodeUpdates.push({
                            id: node.id,
                            opacity: 1,
                            size: original.size,
                            borderWidth: original.borderWidth
                        });
                    } else {
                        // Se não temos o original, resetar para valores padrão
                        nodeUpdates.push({
                            id: node.id,
                            opacity: 1,
                            size: node.size || 20,
                            borderWidth: node.borderWidth || 2
                        });
                    }
                });
            }
            
            // Resetar arestas para estado original
            const edgeUpdates = [];
            this.allEdges.forEach(originalEdge => {
                const color = typeof originalEdge.color === 'object' ? originalEdge.color : { color: originalEdge.color };
                edgeUpdates.push({
                    id: originalEdge.id,
                    width: originalEdge.width || 2,
                    color: color
                });
            });
            
            // Aplicar atualizações
            if (nodeUpdates.length > 0) {
                this.nodes.update(nodeUpdates);
            }
            if (edgeUpdates.length > 0) {
                this.edges.update(edgeUpdates);
            }
        }

        /**
         * Ordena nós por nível para controlar z-index (renderização)
         * Níveis maiores (arquivos) primeiro = renderizados por último = na frente
         * @param {Array} nodes - Array de nós para ordenar
         * @returns {Array} Nós ordenados
         */
        sortNodesByLevel(nodes) {
            return nodes.sort((a, b) => {
                // Ordenar por level descendente (3, 2, 1, 0)
                // Assim arquivos (level 3) são adicionados primeiro e ficam na frente
                return (b.level || 0) - (a.level || 0);
            });
        }

        /**
         * Adiciona edges ao DataSet com verificação de duplicatas
         * @param {Array} edgesToAdd - Array de edges para adicionar
         */
        addEdgesSafely(edgesToAdd) {
            if (!edgesToAdd || edgesToAdd.length === 0) return;
            
            // AIDEV-NOTE: safe-edge-add; evitar erro de IDs duplicados no vis.js
            const uniqueEdges = new Map();
            
            // Primeiro, adicionar edges existentes ao mapa
            this.edges.forEach(edge => {
                uniqueEdges.set(edge.id, edge);
            });
            
            // Depois, adicionar novas edges, evitando duplicatas
            edgesToAdd.forEach(edge => {
                if (!uniqueEdges.has(edge.id)) {
                    uniqueEdges.set(edge.id, edge);
                } else {
                    Logger.warning(`[GraphVisualizationV2] Edge duplicada ignorada: ${edge.id}`);
                }
            });
            
            // Limpar e adicionar todas as edges únicas
            this.edges.clear();
            this.edges.add(Array.from(uniqueEdges.values()));
        }

        /**
         * Adiciona nós ao DataSet com verificação de duplicatas
         * @param {Array} nodesToAdd - Array de nós para adicionar
         */
        addNodesSafely(nodesToAdd) {
            if (!nodesToAdd || nodesToAdd.length === 0) return;
            
            // AIDEV-NOTE: safe-node-add; evitar erro de IDs duplicados no vis.js
            const uniqueNodes = new Map();
            
            // Primeiro, adicionar nós existentes ao mapa
            this.nodes.forEach(node => {
                uniqueNodes.set(node.id, node);
            });
            
            // Depois, adicionar novos nós, evitando duplicatas
            nodesToAdd.forEach(node => {
                if (!uniqueNodes.has(node.id)) {
                    uniqueNodes.set(node.id, node);
                } else {
                    Logger.warning(`[GraphVisualizationV2] Nó duplicado ignorado: ${node.id}`);
                }
            });
            
            // Limpar e adicionar todos os nós únicos
            this.nodes.clear();
            this.nodes.add(Array.from(uniqueNodes.values()));
        }

        /**
         * Calcula posições para clusters em círculo
         * @param {number} count - Número de clusters
         * @returns {Array} Array de posições {x, y}
         */
        calculateClusterPositions(count) {
            const positions = [];
            const radius = count <= 3 ? 300 : count <= 5 ? 400 : 500;
            
            for (let i = 0; i < count; i++) {
                const angle = (2 * Math.PI * i) / count - Math.PI / 2; // Começar do topo
                positions.push({
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle)
                });
            }
            
            return positions;
        }

        /**
         * Calcula posições em anel ao redor de um ponto central
         * @param {Object} center - Ponto central {x, y}
         * @param {number} count - Número de elementos
         * @param {number} radius - Raio do anel
         * @returns {Array} Array de posições {x, y}
         */
        calculateRingPositions(center, count, radius) {
            const positions = [];
            
            if (count === 0) return positions;
            
            for (let i = 0; i < count; i++) {
                const angle = (2 * Math.PI * i) / count;
                positions.push({
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle)
                });
            }
            
            return positions;
        }
    }

    // Registrar no namespace global
    KC.GraphVisualizationV2 = new GraphVisualizationV2();
    KC.Logger?.info('GraphVisualizationV2', 'Componente registrado com sucesso');

})(window);