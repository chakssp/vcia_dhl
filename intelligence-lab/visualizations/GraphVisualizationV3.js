/**
 * GraphVisualizationV3 - Visualização de Grafo para Intelligence Lab
 * 
 * Adaptação da V2 para trabalhar com dados agregados do DataAggregator.
 * Visualiza relacionamentos entre arquivos, categorias e entidades.
 */

class GraphVisualizationV3 {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.data = null;
        
        // Configurações de cores por tipo de análise
        this.analysisColors = {
            'Breakthrough Técnico': '#FF6B6B',
            'Evolução Conceitual': '#4ECDC4',
            'Momento Decisivo': '#45B7D1',
            'Insight Estratégico': '#FECA57',
            'Aprendizado Geral': '#A29BFE',
            'General': '#95A5A6',
            'Unknown': '#7F8C8D'
        };
        
        // Configurações de cores para categorias
        this.categoryColors = [
            '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
            '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#27AE60'
        ];
        
        this.initializeVisualization();
    }
    
    /**
     * Inicializa a visualização vis.js
     */
    initializeVisualization() {
        // Opções de configuração do grafo
        this.options = {
            nodes: {
                shape: 'box',
                font: {
                    size: 14,
                    color: '#FFFFFF',
                    face: 'Arial'
                },
                borderWidth: 2,
                shadow: true,
                scaling: {
                    min: 20,
                    max: 60
                }
            },
            edges: {
                color: {
                    color: '#848484',
                    highlight: '#FFFFFF',
                    opacity: 0.6
                },
                width: 2,
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'none'
                },
                arrows: {
                    to: {
                        enabled: false
                    }
                }
            },
            physics: {
                enabled: true,
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 200,
                    springConstant: 0.08,
                    damping: 0.4,
                    avoidOverlap: 0.5
                },
                solver: 'forceAtlas2Based',
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 50
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true
            },
            layout: {
                improvedLayout: true,
                clusterThreshold: 150
            }
        };
    }
    
    /**
     * Carrega dados agregados do DataAggregator
     * @param {Object} aggregatedData - Dados do DataAggregator
     */
    async loadFromAggregatedData(aggregatedData) {
        if (!aggregatedData) {
            console.error('Dados agregados não fornecidos');
            return;
        }
        
        this.data = aggregatedData;
        console.log('Carregando dados agregados:', {
            files: aggregatedData.files.length,
            categories: aggregatedData.categories.length,
            entities: aggregatedData.entities.length
        });
        
        try {
            // Construir grafo
            this._buildGraph();
            
            // Renderizar
            this._render();
            
            // Adicionar controles
            this._addControls();
            
        } catch (error) {
            console.error('Erro ao carregar visualização:', error);
            this._showError(error.message);
        }
    }
    
    /**
     * Constrói o grafo a partir dos dados agregados
     * @private
     */
    _buildGraph() {
        const nodes = [];
        const edges = [];
        let nodeId = 0;
        
        // Maps para rastrear IDs
        const fileNodeMap = new Map();
        const categoryNodeMap = new Map();
        const entityNodeMap = new Map();
        
        // 1. Criar nós para arquivos
        this.data.files.forEach(file => {
            const fileNodeId = `file_${nodeId++}`;
            fileNodeMap.set(file.id, fileNodeId);
            
            nodes.push({
                id: fileNodeId,
                label: this._truncateLabel(file.name),
                title: this._createFileTooltip(file),
                group: 'file',
                level: 0,
                color: {
                    background: this.analysisColors[file.analysisType] || this.analysisColors['General'],
                    border: '#2C3E50'
                },
                value: file.relevanceScore, // Tamanho baseado na relevância
                shape: 'box',
                font: {
                    color: '#FFFFFF'
                }
            });
        });
        
        // 2. Criar nós para categorias
        this.data.categories.forEach((category, index) => {
            const categoryNodeId = `category_${nodeId++}`;
            categoryNodeMap.set(category.name, categoryNodeId);
            
            nodes.push({
                id: categoryNodeId,
                label: category.name,
                title: `Categoria: ${category.name}\nArquivos: ${category.files.size}`,
                group: 'category',
                level: 1,
                color: {
                    background: this.categoryColors[index % this.categoryColors.length],
                    border: '#2C3E50'
                },
                value: category.files.size * 10, // Tamanho baseado no número de arquivos
                shape: 'ellipse',
                font: {
                    color: '#FFFFFF',
                    size: 16,
                    bold: true
                }
            });
        });
        
        // 3. Criar nós para top entidades (limitado para não poluir o grafo)
        const topEntities = this.data.entities
            .sort((a, b) => b.occurrences - a.occurrences)
            .slice(0, 20); // Top 20 entidades
            
        topEntities.forEach(entity => {
            const entityNodeId = `entity_${nodeId++}`;
            entityNodeMap.set(entity.name, entityNodeId);
            
            nodes.push({
                id: entityNodeId,
                label: entity.name,
                title: this._createEntityTooltip(entity),
                group: 'entity',
                level: 2,
                color: {
                    background: '#95A5A6',
                    border: '#7F8C8D'
                },
                value: entity.occurrences * 5, // Tamanho baseado nas ocorrências
                shape: 'dot',
                font: {
                    color: '#2C3E50',
                    size: 12
                }
            });
        });
        
        // 4. Criar arestas arquivo-categoria
        this.data.files.forEach(file => {
            const fileNodeId = fileNodeMap.get(file.id);
            
            Array.from(file.categories).forEach(categoryName => {
                const categoryNodeId = categoryNodeMap.get(categoryName);
                if (categoryNodeId) {
                    edges.push({
                        id: `edge_${edges.length}`,
                        from: fileNodeId,
                        to: categoryNodeId,
                        color: {
                            color: '#95A5A6',
                            opacity: 0.5
                        },
                        width: 2
                    });
                }
            });
        });
        
        // 5. Criar arestas arquivo-entidade (para entidades top)
        this.data.files.forEach(file => {
            const fileNodeId = fileNodeMap.get(file.id);
            
            Array.from(file.entities).forEach(entityName => {
                const entityNodeId = entityNodeMap.get(entityName);
                if (entityNodeId) {
                    edges.push({
                        id: `edge_${edges.length}`,
                        from: fileNodeId,
                        to: entityNodeId,
                        color: {
                            color: '#BDC3C7',
                            opacity: 0.3
                        },
                        width: 1,
                        dashes: true
                    });
                }
            });
        });
        
        // 6. Criar arestas categoria-entidade
        topEntities.forEach(entity => {
            const entityNodeId = entityNodeMap.get(entity.name);
            
            Array.from(entity.categories).forEach(categoryName => {
                const categoryNodeId = categoryNodeMap.get(categoryName);
                if (categoryNodeId && entityNodeId) {
                    edges.push({
                        id: `edge_${edges.length}`,
                        from: categoryNodeId,
                        to: entityNodeId,
                        color: {
                            color: '#E8E8E8',
                            opacity: 0.4
                        },
                        width: 1,
                        smooth: {
                            type: 'curvedCW',
                            roundness: 0.2
                        }
                    });
                }
            });
        });
        
        // Armazenar dados do grafo
        this.nodes = new vis.DataSet(nodes);
        this.edges = new vis.DataSet(edges);
        
        console.log(`Grafo construído: ${nodes.length} nós, ${edges.length} arestas`);
    }
    
    /**
     * Renderiza o grafo
     * @private
     */
    _render() {
        // Limpar container
        this.container.innerHTML = '';
        
        // Criar dados do grafo
        const data = {
            nodes: this.nodes,
            edges: this.edges
        };
        
        // Criar rede
        this.network = new vis.Network(this.container, data, this.options);
        
        // Eventos
        this.network.on('stabilizationProgress', (params) => {
            const progress = params.iterations / params.total * 100;
            this._updateProgress(progress);
        });
        
        this.network.once('stabilizationIterationsDone', () => {
            this._hideProgress();
            console.log('Estabilização do grafo concluída');
        });
        
        // Eventos de interação
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                this._handleNodeClick(params.nodes[0]);
            }
        });
        
        this.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0) {
                this._focusOnNode(params.nodes[0]);
            }
        });
    }
    
    /**
     * Adiciona controles de visualização
     * @private
     */
    _addControls() {
        const controls = document.createElement('div');
        controls.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(26, 26, 46, 0.9);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #2a2a3e;
            color: #e0e0e0;
            font-size: 14px;
        `;
        
        controls.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #4fc3f7;">Controles</div>
            <div style="margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="checkbox" id="togglePhysics" checked>
                    <span>Física ativa</span>
                </label>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="checkbox" id="toggleEntities" checked>
                    <span>Mostrar entidades</span>
                </label>
            </div>
            <div style="margin-bottom: 10px;">
                <button id="btnFitNetwork" style="
                    padding: 5px 10px;
                    background: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    width: 100%;
                ">Ajustar visualização</button>
            </div>
            <div>
                <button id="btnResetZoom" style="
                    padding: 5px 10px;
                    background: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    width: 100%;
                ">Reset zoom</button>
            </div>
        `;
        
        this.container.style.position = 'relative';
        this.container.appendChild(controls);
        
        // Event listeners
        document.getElementById('togglePhysics').addEventListener('change', (e) => {
            this.network.setOptions({ physics: { enabled: e.target.checked } });
        });
        
        document.getElementById('toggleEntities').addEventListener('change', (e) => {
            this._toggleEntityNodes(e.target.checked);
        });
        
        document.getElementById('btnFitNetwork').addEventListener('click', () => {
            this.network.fit({ animation: true });
        });
        
        document.getElementById('btnResetZoom').addEventListener('click', () => {
            this.network.moveTo({ scale: 1, offset: { x: 0, y: 0 }, animation: true });
        });
    }
    
    /**
     * Alterna visibilidade dos nós de entidades
     * @private
     */
    _toggleEntityNodes(show) {
        const updates = [];
        this.nodes.forEach(node => {
            if (node.group === 'entity') {
                updates.push({
                    id: node.id,
                    hidden: !show
                });
            }
        });
        this.nodes.update(updates);
        
        // Também ocultar/mostrar arestas relacionadas
        const edgeUpdates = [];
        this.edges.forEach(edge => {
            const fromNode = this.nodes.get(edge.from);
            const toNode = this.nodes.get(edge.to);
            
            if ((fromNode && fromNode.group === 'entity') || 
                (toNode && toNode.group === 'entity')) {
                edgeUpdates.push({
                    id: edge.id,
                    hidden: !show
                });
            }
        });
        this.edges.update(edgeUpdates);
    }
    
    /**
     * Manipula clique em nó
     * @private
     */
    _handleNodeClick(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        console.log('Nó clicado:', node);
        
        // Destacar nós conectados
        const connectedNodes = this.network.getConnectedNodes(nodeId);
        const connectedEdges = this.network.getConnectedEdges(nodeId);
        
        // Resetar todas as opacidades
        const allNodes = this.nodes.get();
        const allEdges = this.edges.get();
        
        const nodeUpdates = allNodes.map(n => ({
            id: n.id,
            opacity: connectedNodes.includes(n.id) || n.id === nodeId ? 1 : 0.3
        }));
        
        const edgeUpdates = allEdges.map(e => ({
            id: e.id,
            color: {
                opacity: connectedEdges.includes(e.id) ? 0.8 : 0.1
            }
        }));
        
        this.nodes.update(nodeUpdates);
        this.edges.update(edgeUpdates);
        
        // Resetar após 3 segundos
        setTimeout(() => {
            this.nodes.update(allNodes.map(n => ({ id: n.id, opacity: 1 })));
            this.edges.update(allEdges.map(e => ({ 
                id: e.id, 
                color: { opacity: e.color?.opacity || 0.6 } 
            })));
        }, 3000);
    }
    
    /**
     * Foca em um nó específico
     * @private
     */
    _focusOnNode(nodeId) {
        this.network.focus(nodeId, {
            scale: 1.5,
            animation: {
                duration: 1000,
                easingFunction: 'easeInOutQuad'
            }
        });
    }
    
    /**
     * Cria tooltip para arquivo
     * @private
     */
    _createFileTooltip(file) {
        const categories = Array.from(file.categories).join(', ');
        const entityCount = file.entities.size;
        
        return `
            <strong>${file.name}</strong><br>
            <hr style="margin: 5px 0;">
            Chunks: ${file.chunks.length}<br>
            Relevância: ${file.relevanceScore.toFixed(1)}%<br>
            Tipo: ${file.analysisType}<br>
            Categorias: ${categories || 'Nenhuma'}<br>
            Entidades: ${entityCount}
        `.trim();
    }
    
    /**
     * Cria tooltip para entidade
     * @private
     */
    _createEntityTooltip(entity) {
        const categories = Array.from(entity.categories).slice(0, 5).join(', ');
        const fileCount = entity.files.size;
        
        return `
            <strong>${entity.name}</strong><br>
            <hr style="margin: 5px 0;">
            Tipo: ${entity.type}<br>
            Ocorrências: ${entity.occurrences}<br>
            Arquivos: ${fileCount}<br>
            Categorias: ${categories}${entity.categories.size > 5 ? '...' : ''}
        `.trim();
    }
    
    /**
     * Trunca label longo
     * @private
     */
    _truncateLabel(label, maxLength = 30) {
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Atualiza progresso de estabilização
     * @private
     */
    _updateProgress(percent) {
        let progressBar = document.getElementById('graphProgress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'graphProgress';
            progressBar.style.cssText = `
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(26, 26, 46, 0.9);
                padding: 10px 20px;
                border-radius: 20px;
                color: #4fc3f7;
                font-size: 14px;
            `;
            this.container.appendChild(progressBar);
        }
        progressBar.textContent = `Organizando grafo: ${Math.round(percent)}%`;
    }
    
    /**
     * Oculta barra de progresso
     * @private
     */
    _hideProgress() {
        const progressBar = document.getElementById('graphProgress');
        if (progressBar) {
            progressBar.remove();
        }
    }
    
    /**
     * Mostra erro
     * @private
     */
    _showError(message) {
        this.container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #f44336;
                font-size: 16px;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div>Erro ao criar visualização</div>
                    <div style="font-size: 14px; margin-top: 10px; color: #999;">
                        ${message}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Limpa a visualização
     */
    clear() {
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }
        this.nodes = null;
        this.edges = null;
        this.data = null;
        this.container.innerHTML = '';
    }
}

// Exportar como módulo ES6
export default GraphVisualizationV3;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.GraphVisualizationV3 = GraphVisualizationV3;
}