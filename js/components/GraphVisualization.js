/**
 * GraphVisualization.js - Visualização Interativa do Grafo de Conhecimento
 * 
 * Integra com MCP Memory e Qdrant para renderizar um grafo interativo
 * estilo Obsidian usando vis.js
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;
    const Logger = KC.Logger;

    class GraphVisualization {
        constructor() {
            this.container = null;
            this.network = null;
            this.nodes = null;
            this.edges = null;
            this.selectedNode = null;
            this.graphData = null;
            this.qdrantPoints = null;
            this.isLoading = false;
            
            // Configurações do vis.js
            this.options = {
                nodes: {
                    shape: 'dot',
                    size: 20,
                    font: {
                        size: 14,
                        color: '#fff',
                        strokeWidth: 2,
                        strokeColor: '#000'
                    },
                    borderWidth: 2,
                    shadow: true
                },
                edges: {
                    width: 2,
                    color: { 
                        color: '#666',
                        highlight: '#3b82f6'
                    },
                    smooth: {
                        type: 'continuous'
                    },
                    arrows: {
                        to: { 
                            enabled: true, 
                            scaleFactor: 0.5 
                        }
                    },
                    font: {
                        size: 12,
                        color: '#666',
                        strokeWidth: 3,
                        strokeColor: '#fff'
                    }
                },
                physics: {
                    enabled: true,
                    forceAtlas2Based: {
                        gravitationalConstant: -50,
                        centralGravity: 0.01,
                        springLength: 100,
                        springConstant: 0.08,
                        damping: 0.4,
                        avoidOverlap: 1
                    },
                    maxVelocity: 50,
                    solver: 'forceAtlas2Based',
                    timestep: 0.35,
                    stabilization: {
                        enabled: true,
                        iterations: 1000,
                        updateInterval: 50
                    }
                },
                interaction: {
                    hover: true,
                    hoverConnectedEdges: true,
                    tooltipDelay: 200,
                    hideEdgesOnDrag: true,
                    navigationButtons: true,
                    keyboard: true
                },
                layout: {
                    improvedLayout: true,
                    hierarchical: false
                }
            };

            this._setupEventListeners();
        }

        /**
         * Renderiza o painel de visualização
         */
        async render() {
            Logger.info('[GraphVisualization] Renderizando painel...');
            
            const html = `
                <div class="graph-visualization-panel">
                    <div class="graph-header">
                        <h2>🌐 Grafo de Conhecimento</h2>
                        <div class="graph-controls">
                            <button class="btn-secondary" onclick="KC.GraphVisualization.loadMCPData()">
                                <span class="icon">🧠</span> Carregar MCP Memory
                            </button>
                            <button class="btn-secondary" onclick="KC.GraphVisualization.loadQdrantData()">
                                <span class="icon">🔍</span> Carregar Qdrant
                            </button>
                            <button class="btn-secondary" onclick="KC.GraphVisualization.combineDataSources()">
                                <span class="icon">🔗</span> Combinar Fontes
                            </button>
                            <button class="btn-secondary" onclick="KC.GraphVisualization.exportGraph()">
                                <span class="icon">💾</span> Exportar Grafo
                            </button>
                        </div>
                    </div>

                    <div class="graph-stats" id="graph-stats">
                        <span class="stat-item">
                            <span class="stat-label">Nós:</span>
                            <span class="stat-value" id="node-count">0</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-label">Conexões:</span>
                            <span class="stat-value" id="edge-count">0</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-label">Clusters:</span>
                            <span class="stat-value" id="cluster-count">0</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-label">Densidade:</span>
                            <span class="stat-value" id="graph-density">0%</span>
                        </span>
                    </div>

                    <div class="graph-container" id="graph-container">
                        <div class="graph-loading" id="graph-loading" style="display: none;">
                            <div class="spinner"></div>
                            <p>Carregando grafo...</p>
                        </div>
                        <div id="graph-network"></div>
                    </div>

                    <div class="graph-sidebar" id="graph-sidebar">
                        <div class="sidebar-header">
                            <h3>Detalhes do Nó</h3>
                            <button class="btn-close" onclick="KC.GraphVisualization.closeSidebar()">×</button>
                        </div>
                        <div class="sidebar-content" id="sidebar-content">
                            <p>Selecione um nó para ver detalhes</p>
                        </div>
                    </div>

                    <div class="graph-filters">
                        <h3>Filtros</h3>
                        <div class="filter-group">
                            <label>
                                <input type="checkbox" id="filter-files" checked> Arquivos
                            </label>
                            <label>
                                <input type="checkbox" id="filter-categories" checked> Categorias
                            </label>
                            <label>
                                <input type="checkbox" id="filter-entities" checked> Entidades
                            </label>
                            <label>
                                <input type="checkbox" id="filter-concepts" checked> Conceitos
                            </label>
                        </div>
                        <div class="filter-group">
                            <label>Relevância mínima:</label>
                            <input type="range" id="relevance-filter" min="0" max="100" value="0">
                            <span id="relevance-value">0%</span>
                        </div>
                    </div>
                </div>
            `;

            const container = document.getElementById('panel-container');
            container.innerHTML = html;

            // Inicializa o vis.js
            await this._initializeNetwork();

            // Carrega dados iniciais se disponíveis
            await this.loadInitialData();
        }

        /**
         * Inicializa a rede vis.js
         */
        async _initializeNetwork() {
            this.container = document.getElementById('graph-network');
            
            // Datasets para nós e arestas
            this.nodes = new vis.DataSet();
            this.edges = new vis.DataSet();

            // Cria a rede
            const data = {
                nodes: this.nodes,
                edges: this.edges
            };

            this.network = new vis.Network(this.container, data, this.options);

            // Event handlers
            this.network.on('click', (params) => this._onNodeClick(params));
            this.network.on('doubleClick', (params) => this._onNodeDoubleClick(params));
            this.network.on('hoverNode', (params) => this._onNodeHover(params));
            this.network.on('blurNode', (params) => this._onNodeBlur(params));
            this.network.on('stabilizationProgress', (params) => this._onStabilizationProgress(params));
            this.network.on('stabilizationIterationsDone', () => this._onStabilizationComplete());

            Logger.info('[GraphVisualization] Rede inicializada');
        }

        /**
         * Carrega dados iniciais
         */
        async loadInitialData() {
            // Verifica se há dados no AppState
            const files = AppState.get('files') || [];
            if (files.length > 0) {
                this._buildGraphFromFiles(files);
            }
        }

        /**
         * Carrega dados do MCP Memory
         */
        async loadMCPData() {
            this._showLoading(true);
            
            try {
                // Chama o MCP para ler o grafo
                const graphData = await this._readMCPGraph();
                
                if (graphData) {
                    this._buildGraphFromMCP(graphData);
                    EventBus.emit(Events.NOTIFICATION, {
                        type: 'success',
                        message: 'Grafo MCP carregado com sucesso!'
                    });
                }
            } catch (error) {
                Logger.error('[GraphVisualization] Erro ao carregar MCP:', error);
                EventBus.emit(Events.NOTIFICATION, {
                    type: 'error',
                    message: 'Erro ao carregar dados do MCP'
                });
            } finally {
                this._showLoading(false);
            }
        }

        /**
         * Carrega dados do Qdrant
         */
        async loadQdrantData() {
            this._showLoading(true);
            
            try {
                if (KC.QdrantService) {
                    const stats = await KC.QdrantService.getCollectionStats();
                    const searchResults = await KC.QdrantService.searchByText('', 100); // Busca todos
                    
                    if (searchResults && searchResults.length > 0) {
                        this._buildGraphFromQdrant(searchResults);
                        EventBus.emit(Events.NOTIFICATION, {
                            type: 'success',
                            message: `${searchResults.length} pontos Qdrant carregados!`
                        });
                    }
                }
            } catch (error) {
                Logger.error('[GraphVisualization] Erro ao carregar Qdrant:', error);
                EventBus.emit(Events.NOTIFICATION, {
                    type: 'error',
                    message: 'Erro ao carregar dados do Qdrant'
                });
            } finally {
                this._showLoading(false);
            }
        }

        /**
         * Combina dados de múltiplas fontes
         */
        async combineDataSources() {
            this._showLoading(true);
            
            try {
                // Limpa o grafo atual
                this.nodes.clear();
                this.edges.clear();

                // Carrega de todas as fontes
                const promises = [];
                
                // MCP Memory
                promises.push(this._readMCPGraph());
                
                // Qdrant
                if (KC.QdrantService) {
                    promises.push(KC.QdrantService.searchByText('', 100));
                }
                
                // Arquivos locais
                const files = AppState.get('files') || [];
                if (files.length > 0) {
                    promises.push(Promise.resolve(files));
                }

                const results = await Promise.allSettled(promises);
                
                // Processa cada resultado
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        switch(index) {
                            case 0: // MCP
                                this._buildGraphFromMCP(result.value);
                                break;
                            case 1: // Qdrant
                                this._buildGraphFromQdrant(result.value);
                                break;
                            case 2: // Files
                                this._buildGraphFromFiles(result.value);
                                break;
                        }
                    }
                });

                // Detecta comunidades
                this._detectCommunities();
                
                EventBus.emit(Events.NOTIFICATION, {
                    type: 'success',
                    message: 'Fontes de dados combinadas com sucesso!'
                });
            } catch (error) {
                Logger.error('[GraphVisualization] Erro ao combinar fontes:', error);
                EventBus.emit(Events.NOTIFICATION, {
                    type: 'error',
                    message: 'Erro ao combinar fontes de dados'
                });
            } finally {
                this._showLoading(false);
            }
        }

        /**
         * Constrói grafo a partir de arquivos
         */
        _buildGraphFromFiles(files) {
            const nodeMap = new Map();
            const edgeSet = new Set();

            files.forEach(file => {
                // Nó do arquivo
                const fileNode = {
                    id: `file-${file.id}`,
                    label: file.name,
                    title: `${file.path}\nRelevância: ${file.relevanceScore || 0}%`,
                    group: 'file',
                    value: file.relevanceScore || 10,
                    color: this._getColorByRelevance(file.relevanceScore),
                    metadata: file
                };
                nodeMap.set(fileNode.id, fileNode);

                // Nós de categorias
                if (file.categories && file.categories.length > 0) {
                    file.categories.forEach(cat => {
                        const catId = `category-${cat}`;
                        if (!nodeMap.has(catId)) {
                            nodeMap.set(catId, {
                                id: catId,
                                label: cat,
                                title: `Categoria: ${cat}`,
                                group: 'category',
                                color: '#10b981',
                                value: 15
                            });
                        }

                        // Aresta arquivo -> categoria
                        edgeSet.add(JSON.stringify({
                            from: fileNode.id,
                            to: catId,
                            label: 'categorizado como',
                            color: '#10b981'
                        }));
                    });
                }

                // Extrai entidades do conteúdo
                if (file.preview) {
                    const entities = this._extractEntities(file.preview);
                    entities.forEach(entity => {
                        const entityId = `entity-${entity.toLowerCase().replace(/\s+/g, '-')}`;
                        if (!nodeMap.has(entityId)) {
                            nodeMap.set(entityId, {
                                id: entityId,
                                label: entity,
                                title: `Entidade: ${entity}`,
                                group: 'entity',
                                color: '#f59e0b',
                                value: 10
                            });
                        }

                        // Aresta arquivo -> entidade
                        edgeSet.add(JSON.stringify({
                            from: fileNode.id,
                            to: entityId,
                            label: 'menciona',
                            color: '#f59e0b'
                        }));
                    });
                }
            });

            // Adiciona nós e arestas ao grafo
            this.nodes.add(Array.from(nodeMap.values()));
            this.edges.add(Array.from(edgeSet).map(e => JSON.parse(e)));

            this._updateStats();
        }

        /**
         * Constrói grafo a partir do MCP
         */
        _buildGraphFromMCP(graphData) {
            if (!graphData || !graphData.entities) return;

            const nodeMap = new Map();
            const edgeSet = new Set();

            // Processa entidades
            graphData.entities.forEach(entity => {
                const node = {
                    id: `mcp-${entity.name.toLowerCase().replace(/\s+/g, '-')}`,
                    label: entity.name,
                    title: `${entity.entityType}: ${entity.name}\n${entity.observations.length} observações`,
                    group: entity.entityType,
                    value: entity.observations.length * 5 + 10,
                    color: this._getColorByType(entity.entityType),
                    metadata: entity
                };
                nodeMap.set(node.id, node);
            });

            // Processa relações
            if (graphData.relations) {
                graphData.relations.forEach(relation => {
                    const fromId = `mcp-${relation.from.toLowerCase().replace(/\s+/g, '-')}`;
                    const toId = `mcp-${relation.to.toLowerCase().replace(/\s+/g, '-')}`;
                    
                    if (nodeMap.has(fromId) && nodeMap.has(toId)) {
                        edgeSet.add(JSON.stringify({
                            from: fromId,
                            to: toId,
                            label: relation.relationType,
                            color: '#6b7280'
                        }));
                    }
                });
            }

            // Adiciona ao grafo
            this.nodes.add(Array.from(nodeMap.values()));
            this.edges.add(Array.from(edgeSet).map(e => JSON.parse(e)));

            this._updateStats();
        }

        /**
         * Constrói grafo a partir do Qdrant
         */
        _buildGraphFromQdrant(points) {
            const nodeMap = new Map();
            const edgeSet = new Set();

            points.forEach(point => {
                const payload = point.payload || {};
                const node = {
                    id: `qdrant-${point.id}`,
                    label: payload.title || payload.chunk || `Ponto ${point.id}`,
                    title: `Score: ${point.score}\n${payload.metadata?.path || ''}`,
                    group: 'qdrant',
                    value: Math.round(point.score * 50),
                    color: '#8b5cf6',
                    metadata: payload
                };
                nodeMap.set(node.id, node);

                // Conecta pontos similares (score > 0.7)
                this.nodes.forEach(existingNode => {
                    if (existingNode.group === 'qdrant' && existingNode.id !== node.id) {
                        // Simula similaridade baseada em categorias compartilhadas
                        const sharedCategories = this._getSharedCategories(
                            payload.metadata?.categories || [],
                            existingNode.metadata?.metadata?.categories || []
                        );
                        
                        if (sharedCategories.length > 0) {
                            edgeSet.add(JSON.stringify({
                                from: node.id,
                                to: existingNode.id,
                                label: `similar (${sharedCategories.join(', ')})`,
                                color: '#e0e7ff',
                                dashes: true
                            }));
                        }
                    }
                });
            });

            // Adiciona ao grafo
            this.nodes.add(Array.from(nodeMap.values()));
            this.edges.add(Array.from(edgeSet).map(e => JSON.parse(e)));

            this._updateStats();
        }

        /**
         * Extrai entidades de um texto
         */
        _extractEntities(text) {
            const entities = [];
            
            // Padrões simples de extração
            const patterns = [
                /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Nomes próprios
                /\b(?:Sr\.|Sra\.|Dr\.|Dra\.) [A-Z][a-z]+/g, // Títulos
                /\b[A-Z]{2,}\b/g, // Siglas
                /\b\d{4}\b/g, // Anos
                /@\w+/g, // Menções
                /#\w+/g // Hashtags
            ];

            patterns.forEach(pattern => {
                const matches = text.match(pattern) || [];
                entities.push(...matches);
            });

            // Remove duplicatas e retorna
            return [...new Set(entities)].slice(0, 10); // Limita a 10 entidades
        }

        /**
         * Detecta comunidades no grafo
         */
        _detectCommunities() {
            // Implementação simplificada de detecção de comunidades
            // Em produção, usar algoritmos como Louvain
            
            const nodes = this.nodes.get();
            const edges = this.edges.get();
            
            // Agrupa por tipo/grupo
            const communities = {};
            nodes.forEach(node => {
                if (!communities[node.group]) {
                    communities[node.group] = [];
                }
                communities[node.group].push(node.id);
            });

            // Atualiza contagem de clusters
            const clusterCount = Object.keys(communities).length;
            document.getElementById('cluster-count').textContent = clusterCount;

            return communities;
        }

        /**
         * Atualiza estatísticas do grafo
         */
        _updateStats() {
            const nodeCount = this.nodes.length;
            const edgeCount = this.edges.length;
            
            document.getElementById('node-count').textContent = nodeCount;
            document.getElementById('edge-count').textContent = edgeCount;
            
            // Calcula densidade
            const maxEdges = nodeCount * (nodeCount - 1) / 2;
            const density = maxEdges > 0 ? Math.round((edgeCount / maxEdges) * 100) : 0;
            document.getElementById('graph-density').textContent = `${density}%`;
        }

        /**
         * Handler de clique em nó
         */
        _onNodeClick(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = this.nodes.get(nodeId);
                this._showNodeDetails(node);
            }
        }

        /**
         * Mostra detalhes do nó na sidebar
         */
        _showNodeDetails(node) {
            const sidebar = document.getElementById('graph-sidebar');
            const content = document.getElementById('sidebar-content');
            
            let html = `
                <h4>${node.label}</h4>
                <p><strong>Tipo:</strong> ${node.group}</p>
                <p><strong>ID:</strong> ${node.id}</p>
            `;

            // Adiciona metadados específicos
            if (node.metadata) {
                if (node.group === 'file') {
                    html += `
                        <p><strong>Caminho:</strong> ${node.metadata.path || 'N/A'}</p>
                        <p><strong>Relevância:</strong> ${node.metadata.relevanceScore || 0}%</p>
                        <p><strong>Categorias:</strong> ${node.metadata.categories?.join(', ') || 'Nenhuma'}</p>
                        <p><strong>Análise:</strong> ${node.metadata.analysisType || 'Pendente'}</p>
                    `;
                } else if (node.group === 'mcp' && node.metadata.observations) {
                    html += `
                        <p><strong>Observações:</strong></p>
                        <ul>
                            ${node.metadata.observations.map(obs => `<li>${obs}</li>`).join('')}
                        </ul>
                    `;
                }
            }

            // Conexões
            const connectedEdges = this.network.getConnectedEdges(node.id);
            const connectedNodes = this.network.getConnectedNodes(node.id);
            
            html += `
                <p><strong>Conexões:</strong> ${connectedEdges.length}</p>
                <p><strong>Nós conectados:</strong> ${connectedNodes.length}</p>
            `;

            // Ações
            html += `
                <div class="node-actions">
                    <button class="btn-primary" onclick="KC.GraphVisualization.focusNode('${node.id}')">
                        Focar Nó
                    </button>
                    <button class="btn-secondary" onclick="KC.GraphVisualization.expandNode('${node.id}')">
                        Expandir Conexões
                    </button>
                </div>
            `;

            content.innerHTML = html;
            sidebar.classList.add('active');
        }

        /**
         * Fecha a sidebar
         */
        closeSidebar() {
            document.getElementById('graph-sidebar').classList.remove('active');
        }

        /**
         * Foca em um nó específico
         */
        focusNode(nodeId) {
            this.network.focus(nodeId, {
                scale: 1.5,
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuad'
                }
            });
            
            // Destaca o nó
            this.network.selectNodes([nodeId]);
        }

        /**
         * Expande conexões de um nó
         */
        expandNode(nodeId) {
            // Obtém todos os nós conectados
            const connectedNodes = this.network.getConnectedNodes(nodeId);
            
            // Seleciona o nó e suas conexões
            this.network.selectNodes([nodeId, ...connectedNodes]);
            
            // Ajusta a visualização para mostrar todos
            this.network.fit({
                nodes: [nodeId, ...connectedNodes],
                animation: true
            });
        }

        /**
         * Exporta o grafo
         */
        async exportGraph() {
            const graphData = {
                nodes: this.nodes.get(),
                edges: this.edges.get(),
                metadata: {
                    exportDate: new Date().toISOString(),
                    nodeCount: this.nodes.length,
                    edgeCount: this.edges.length,
                    sources: ['files', 'mcp', 'qdrant']
                }
            };

            const blob = new Blob([JSON.stringify(graphData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `knowledge-graph-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            EventBus.emit(Events.NOTIFICATION, {
                type: 'success',
                message: 'Grafo exportado com sucesso!'
            });
        }

        /**
         * Lê dados do MCP Memory
         */
        async _readMCPGraph() {
            // Simula chamada MCP - em produção, usar a ferramenta real
            try {
                // TODO: Integrar com mcp__memory__read_graph quando disponível
                return {
                    entities: [
                        {
                            name: "Projeto IA",
                            entityType: "projeto",
                            observations: ["Implementação de análise semântica", "Integração com Qdrant"]
                        },
                        {
                            name: "Qdrant",
                            entityType: "tecnologia",
                            observations: ["Vector database", "Busca por similaridade"]
                        }
                    ],
                    relations: [
                        {
                            from: "Projeto IA",
                            to: "Qdrant",
                            relationType: "usa"
                        }
                    ]
                };
            } catch (error) {
                Logger.error('[GraphVisualization] Erro ao ler MCP:', error);
                return null;
            }
        }

        /**
         * Retorna cor baseada na relevância
         */
        _getColorByRelevance(score) {
            if (score >= 90) return '#ef4444'; // Vermelho
            if (score >= 70) return '#f59e0b'; // Laranja
            if (score >= 50) return '#3b82f6'; // Azul
            return '#6b7280'; // Cinza
        }

        /**
         * Retorna cor baseada no tipo
         */
        _getColorByType(type) {
            const colors = {
                'projeto': '#3b82f6',
                'tecnologia': '#10b981',
                'pessoa': '#f59e0b',
                'conceito': '#8b5cf6',
                'arquivo': '#6b7280',
                'categoria': '#10b981',
                'entity': '#f59e0b',
                'qdrant': '#8b5cf6'
            };
            return colors[type.toLowerCase()] || '#6b7280';
        }

        /**
         * Retorna categorias compartilhadas
         */
        _getSharedCategories(cats1, cats2) {
            return cats1.filter(cat => cats2.includes(cat));
        }

        /**
         * Mostra/esconde loading
         */
        _showLoading(show) {
            const loading = document.getElementById('graph-loading');
            if (loading) {
                loading.style.display = show ? 'flex' : 'none';
            }
            this.isLoading = show;
        }

        /**
         * Progresso de estabilização
         */
        _onStabilizationProgress(params) {
            const percent = Math.round(params.iterations / params.total * 100);
            if (percent % 10 === 0) {
                Logger.debug(`[GraphVisualization] Estabilização: ${percent}%`);
            }
        }

        /**
         * Estabilização completa
         */
        _onStabilizationComplete() {
            Logger.info('[GraphVisualization] Estabilização completa');
            this._showLoading(false);
        }

        /**
         * Handler de hover em nó
         */
        _onNodeHover(params) {
            document.body.style.cursor = 'pointer';
        }

        /**
         * Handler de blur em nó
         */
        _onNodeBlur(params) {
            document.body.style.cursor = 'default';
        }

        /**
         * Handler de duplo clique
         */
        _onNodeDoubleClick(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = this.nodes.get(nodeId);
                
                // Se for arquivo, abre o conteúdo
                if (node.group === 'file' && node.metadata) {
                    EventBus.emit(Events.OPEN_FILE_CONTENT, {
                        file: node.metadata
                    });
                }
            }
        }

        /**
         * Configura event listeners
         */
        _setupEventListeners() {
            // Filtros
            document.addEventListener('change', (e) => {
                if (e.target.matches('#filter-files, #filter-categories, #filter-entities, #filter-concepts')) {
                    this._applyFilters();
                }
            });

            document.addEventListener('input', (e) => {
                if (e.target.matches('#relevance-filter')) {
                    document.getElementById('relevance-value').textContent = `${e.target.value}%`;
                    this._applyFilters();
                }
            });

            // Eventos do sistema
            EventBus.on(Events.FILES_UPDATED, () => {
                if (this.network) {
                    this.loadInitialData();
                }
            });
        }

        /**
         * Aplica filtros ao grafo
         */
        _applyFilters() {
            const showFiles = document.getElementById('filter-files')?.checked ?? true;
            const showCategories = document.getElementById('filter-categories')?.checked ?? true;
            const showEntities = document.getElementById('filter-entities')?.checked ?? true;
            const showConcepts = document.getElementById('filter-concepts')?.checked ?? true;
            const minRelevance = parseInt(document.getElementById('relevance-filter')?.value || 0);

            const nodes = this.nodes.get();
            const updatedNodes = nodes.map(node => {
                let hidden = false;

                // Filtro por tipo
                if (node.group === 'file' && !showFiles) hidden = true;
                if (node.group === 'category' && !showCategories) hidden = true;
                if (node.group === 'entity' && !showEntities) hidden = true;
                if (['projeto', 'tecnologia', 'conceito'].includes(node.group) && !showConcepts) hidden = true;

                // Filtro por relevância (apenas para arquivos)
                if (node.group === 'file' && node.metadata?.relevanceScore < minRelevance) {
                    hidden = true;
                }

                return {
                    ...node,
                    hidden
                };
            });

            this.nodes.update(updatedNodes);
            this._updateStats();
        }
    }

    // Registra no namespace
    KC.GraphVisualization = new GraphVisualization();

    // Registra no window para comandos de debug
    window.KC = KC;

})(window);