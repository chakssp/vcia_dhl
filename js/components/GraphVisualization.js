/**
 * GraphVisualization.js - Visualização Simplificada do Grafo de Conhecimento
 * 
 * Versão refatorada para simplicidade e funcionalidade
 * Baseada no test-graph-visualization.html que funciona corretamente
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
            
            // Arrays para manter todos os dados (necessário para filtros)
            this.allNodes = [];
            this.allEdges = [];
            
            // Cores por tipo (copiado do HTML teste)
            this.nodeColors = {
                file: '#3b82f6',
                category: '#10b981',
                entity: '#f59e0b',
                concept: '#8b5cf6'
            };
            
            // Configurações do vis.js (simplificadas do HTML teste)
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
                    forceAtlas2Based: {
                        gravitationalConstant: -50,
                        centralGravity: 0.01,
                        springLength: 100,
                        springConstant: 0.08,
                        damping: 0.4,
                        avoidOverlap: 1
                    },
                    solver: 'forceAtlas2Based'
                },
                interaction: {
                    hover: true,
                    hoverConnectedEdges: true,
                    tooltipDelay: 200
                }
            };
        }

        /**
         * Renderiza o painel de visualização
         */
        async render() {
            Logger.info('[GraphVisualization] Renderizando painel simplificado...');
            
            // Busca o container
            this.container = document.getElementById('graph-container') || 
                           document.getElementById('panel-container');
            
            if (!this.container) {
                Logger.error('[GraphVisualization] Container não encontrado');
                return;
            }
            
            // HTML simplificado
            const html = `
                <div class="graph-visualization-panel">
                    <div class="graph-header">
                        <h2>🌐 Grafo de Conhecimento</h2>
                        <div class="graph-controls">
                            <button class="btn-secondary" onclick="KC.GraphVisualization.loadData()">
                                <span class="icon">🔄</span> Recarregar Dados
                            </button>
                            <button class="btn-secondary" onclick="KC.GraphVisualization.exportGraph()">
                                <span class="icon">💾</span> Exportar Grafo
                            </button>
                        </div>
                    </div>

                    <div class="graph-filters">
                        <label>
                            <input type="checkbox" id="filter-files" checked> Arquivos
                        </label>
                        <label>
                            <input type="checkbox" id="filter-categories" checked> Categorias
                        </label>
                        <label>
                            <input type="checkbox" id="filter-entities" checked> Entidades
                        </label>
                        <label style="margin-left: 20px;">
                            Relevância mínima:
                            <input type="range" id="relevance-filter" min="0" max="100" value="0" style="width: 100px;">
                            <span id="relevance-value">0%</span>
                        </label>
                    </div>

                    <div class="graph-stats" id="graph-stats">
                        <span>Nós: <strong id="node-count">0</strong></span>
                        <span>Conexões: <strong id="edge-count">0</strong></span>
                        <span>Densidade: <strong id="graph-density">0.00</strong></span>
                    </div>

                    <div id="graph-network" style="height: 500px; border: 1px solid #ddd; margin-top: 10px;"></div>
                </div>
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
                Logger.error('[GraphVisualization] Container graph-network não encontrado');
                return;
            }
            
            // Datasets para nós e arestas
            this.nodes = new vis.DataSet();
            this.edges = new vis.DataSet();
            
            // Cria a rede
            const data = {
                nodes: this.nodes,
                edges: this.edges
            };
            
            this.network = new vis.Network(container, data, this.options);
            
            // Eventos simples
            this.network.on("click", (params) => {
                if (params.nodes.length > 0) {
                    this.showNodeDetails(params.nodes[0]);
                }
            });
            
            Logger.info('[GraphVisualization] Rede inicializada');
        }

        /**
         * Configura event listeners para filtros
         */
        setupEventListeners() {
            // Filtros de tipo
            ['filter-files', 'filter-categories', 'filter-entities'].forEach(id => {
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
            
            Logger.info('[GraphVisualization] Event listeners configurados');
        }

        /**
         * Carrega dados do AppState
         */
        loadData() {
            Logger.info('[GraphVisualization] Carregando dados do AppState...');
            
            // Limpar dados anteriores
            this.nodes.clear();
            this.edges.clear();
            this.allNodes = [];
            this.allEdges = [];
            
            // Obter dados do AppState
            const files = AppState.get('files') || [];
            const categories = KC.CategoryManager?.getCategories() || [];
            
            Logger.info(`[GraphVisualization] Carregando ${files.length} arquivos e ${categories.length} categorias`);
            
            // Adicionar nós de arquivos
            files.forEach(file => {
                const node = {
                    id: `file-${file.id}`,
                    label: file.name || 'Sem nome',
                    type: 'file',
                    color: this.nodeColors.file,
                    size: 20 + (file.relevanceScore || 0) / 5,
                    title: `${file.path || ''}\nRelevância: ${file.relevanceScore || 0}%`,
                    relevance: file.relevanceScore || 0,
                    metadata: file
                };
                this.allNodes.push(node);
            });
            
            // Adicionar nós de categorias
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
            
            // Adicionar entidades extraídas (se houver preview)
            files.forEach(file => {
                if (file.preview) {
                    const entities = this.extractSimpleEntities(file.preview);
                    entities.forEach((entity, index) => {
                        const entityId = `entity-${file.id}-${index}`;
                        
                        // Adicionar nó da entidade se ainda não existe
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
                        
                        // Conectar ao arquivo
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
            
            // Aplicar todos os nós e arestas
            this.nodes.add(this.allNodes);
            this.edges.add(this.allEdges);
            
            // Atualizar estatísticas
            this.updateStats();
            
            Logger.info('[GraphVisualization] Dados carregados com sucesso');
        }

        /**
         * Extrai entidades simples do preview
         */
        extractSimpleEntities(preview) {
            const entities = [];
            let text = '';
            
            // Converter preview para string
            if (typeof preview === 'string') {
                text = preview;
            } else if (preview && preview.segments) {
                text = Object.values(preview.segments).join(' ');
            }
            
            // Extrair apenas palavras em maiúsculas (simples)
            const matches = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || [];
            
            // Limitar a 5 entidades por arquivo
            return [...new Set(matches)].slice(0, 5);
        }

        /**
         * Aplica filtros aos dados
         */
        applyFilters() {
            const showFiles = document.getElementById('filter-files')?.checked ?? true;
            const showCategories = document.getElementById('filter-categories')?.checked ?? true;
            const showEntities = document.getElementById('filter-entities')?.checked ?? true;
            const minRelevance = parseInt(document.getElementById('relevance-filter')?.value || 0);
            
            // Filtrar nós
            const filteredNodes = this.allNodes.filter(node => {
                if (node.type === 'file' && !showFiles) return false;
                if (node.type === 'category' && !showCategories) return false;
                if (node.type === 'entity' && !showEntities) return false;
                if (node.relevance !== undefined && node.relevance < minRelevance) return false;
                return true;
            });
            
            const nodeIds = filteredNodes.map(n => n.id);
            
            // Filtrar arestas
            const filteredEdges = this.allEdges.filter(edge => {
                return nodeIds.includes(edge.from) && nodeIds.includes(edge.to);
            });
            
            // Atualizar visualização
            this.nodes.clear();
            this.edges.clear();
            this.nodes.add(filteredNodes);
            this.edges.add(filteredEdges);
            
            // Atualizar estatísticas
            this.updateStats();
            
            Logger.info(`[GraphVisualization] Filtros aplicados: ${filteredNodes.length} nós, ${filteredEdges.length} arestas`);
        }

        /**
         * Mostra detalhes do nó selecionado
         */
        showNodeDetails(nodeId) {
            const node = this.nodes.get(nodeId);
            if (!node) return;
            
            EventBus.emit(Events.NOTIFICATION, {
                type: 'info',
                message: `Selecionado: ${node.label} (${node.type})`,
                duration: 3000
            });
        }

        /**
         * Atualiza estatísticas do grafo
         */
        updateStats() {
            const nodeCount = this.nodes.length;
            const edgeCount = this.edges.length;
            const density = nodeCount > 1 ? (2 * edgeCount / (nodeCount * (nodeCount - 1))).toFixed(3) : 0;
            
            document.getElementById('node-count').textContent = nodeCount;
            document.getElementById('edge-count').textContent = edgeCount;
            document.getElementById('graph-density').textContent = density;
        }

        /**
         * Exporta o grafo como JSON
         */
        exportGraph() {
            const data = {
                nodes: this.nodes.get(),
                edges: this.edges.get(),
                metadata: {
                    exportDate: new Date().toISOString(),
                    nodeCount: this.nodes.length,
                    edgeCount: this.edges.length
                }
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `knowledge-graph-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            EventBus.emit(Events.NOTIFICATION, {
                type: 'success',
                message: 'Grafo exportado com sucesso!'
            });
        }
    }

    // Registrar no namespace global
    KC.GraphVisualization = new GraphVisualization();

})(window);