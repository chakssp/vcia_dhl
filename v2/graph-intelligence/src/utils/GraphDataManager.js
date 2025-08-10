/**
 * GraphDataManager - Gerenciador de dados para visualização de grafos
 * Permite importar, exportar e manipular dados de grafos em múltiplos formatos
 */

class GraphDataManager {
    constructor() {
        this.data = null;
        this.currentView = 'verticalClusters';
        this.nodes = new Map();
        this.edges = new Map();
        this.metadata = {
            created: new Date().toISOString(),
            modified: null,
            source: 'Knowledge Consolidator v2'
        };
    }

    /**
     * Carrega dados do modelo JSON
     */
    async loadFromJSON(jsonPath) {
        try {
            const response = await fetch(jsonPath);
            this.data = await response.json();
            this.parseDataToGraph();
            return this.data;
        } catch (error) {
            console.error('Erro ao carregar JSON:', error);
            throw error;
        }
    }

    /**
     * Carrega dados do CategoryManager do sistema
     */
    loadFromCategoryManager(categories, files) {
        const graphData = {
            nodes: [],
            edges: []
        };

        // Criar nó central
        const centralNode = {
            id: 'knowledge-center',
            label: 'Knowledge Base',
            type: 'center',
            level: 0,
            size: 50,
            color: '#6366f1',
            shape: 'hexagon'
        };
        graphData.nodes.push(centralNode);

        // Processar categorias
        categories.forEach((category, index) => {
            const categoryNode = {
                id: `cat-${category.id}`,
                label: category.name,
                type: 'category',
                level: 1,
                size: 30,
                color: category.color || '#10b981',
                shape: 'square',
                metadata: {
                    description: category.description,
                    fileCount: 0,
                    created: category.created
                }
            };
            graphData.nodes.push(categoryNode);

            // Conectar categoria ao centro
            graphData.edges.push({
                id: `edge-center-cat-${category.id}`,
                from: 'knowledge-center',
                to: `cat-${category.id}`,
                width: 3,
                color: category.color || '#10b981'
            });
        });

        // Processar arquivos
        files.forEach((file, index) => {
            const fileNode = {
                id: `file-${index}`,
                label: file.name.substring(0, 20),
                type: 'file',
                level: 2,
                size: 10 + (file.relevance || 50) / 10,
                color: file.relevance > 70 ? '#ef4444' : '#3b82f6',
                shape: 'dot',
                metadata: {
                    fullName: file.name,
                    path: file.path,
                    relevance: file.relevance,
                    size: file.size,
                    modified: file.lastModified,
                    analyzed: file.analyzed,
                    content: file.content
                }
            };
            graphData.nodes.push(fileNode);

            // Conectar arquivo às suas categorias
            if (file.categories && file.categories.length > 0) {
                file.categories.forEach(catId => {
                    graphData.edges.push({
                        id: `edge-file-${index}-cat-${catId}`,
                        from: `cat-${catId}`,
                        to: `file-${index}`,
                        width: 1,
                        color: '#64748b',
                        dashes: true
                    });
                    
                    // Atualizar contador de arquivos na categoria
                    const catNode = graphData.nodes.find(n => n.id === `cat-${catId}`);
                    if (catNode && catNode.metadata) {
                        catNode.metadata.fileCount++;
                    }
                });
            }
        });

        this.data = graphData;
        return graphData;
    }

    /**
     * Exporta dados para diferentes formatos
     */
    exportTo(format) {
        switch(format.toLowerCase()) {
            case 'json':
                return this.exportToJSON();
            case 'csv':
                return this.exportToCSV();
            case 'graphml':
                return this.exportToGraphML();
            case 'gexf':
                return this.exportToGEXF();
            case 'cytoscape':
                return this.exportToCytoscape();
            case 'd3':
                return this.exportToD3();
            default:
                throw new Error(`Formato não suportado: ${format}`);
        }
    }

    /**
     * Exporta para JSON (formato nativo)
     */
    exportToJSON() {
        return JSON.stringify({
            metadata: this.metadata,
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values())
        }, null, 2);
    }

    /**
     * Exporta para CSV (tabular)
     */
    exportToCSV() {
        const nodes = Array.from(this.nodes.values());
        const edges = Array.from(this.edges.values());
        
        // CSV de nós
        let nodesCSV = 'id,label,type,level,size,color,shape,metadata\n';
        nodes.forEach(node => {
            nodesCSV += `"${node.id}","${node.label}","${node.type || ''}","${node.level || ''}","${node.size || ''}","${node.color || ''}","${node.shape || ''}","${JSON.stringify(node.metadata || {}).replace(/"/g, '""')}"\n`;
        });

        // CSV de arestas
        let edgesCSV = 'id,from,to,width,color,label\n';
        edges.forEach(edge => {
            edgesCSV += `"${edge.id}","${edge.from}","${edge.to}","${edge.width || 1}","${edge.color || ''}","${edge.label || ''}"\n`;
        });

        return {
            nodes: nodesCSV,
            edges: edgesCSV
        };
    }

    /**
     * Exporta para GraphML (XML padrão para grafos)
     */
    exportToGraphML() {
        let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
        
        // Definir atributos
        graphml += '  <key id="label" for="node" attr.name="label" attr.type="string"/>\n';
        graphml += '  <key id="type" for="node" attr.name="type" attr.type="string"/>\n';
        graphml += '  <key id="color" for="node" attr.name="color" attr.type="string"/>\n';
        graphml += '  <key id="size" for="node" attr.name="size" attr.type="double"/>\n';
        graphml += '  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>\n';
        
        graphml += '  <graph id="G" edgedefault="directed">\n';
        
        // Adicionar nós
        this.nodes.forEach(node => {
            graphml += `    <node id="${node.id}">\n`;
            graphml += `      <data key="label">${node.label}</data>\n`;
            if (node.type) graphml += `      <data key="type">${node.type}</data>\n`;
            if (node.color) graphml += `      <data key="color">${node.color}</data>\n`;
            if (node.size) graphml += `      <data key="size">${node.size}</data>\n`;
            graphml += '    </node>\n';
        });
        
        // Adicionar arestas
        this.edges.forEach(edge => {
            graphml += `    <edge source="${edge.from}" target="${edge.to}">\n`;
            if (edge.width) graphml += `      <data key="weight">${edge.width}</data>\n`;
            graphml += '    </edge>\n';
        });
        
        graphml += '  </graph>\n';
        graphml += '</graphml>';
        
        return graphml;
    }

    /**
     * Exporta para formato GEXF (Gephi)
     */
    exportToGEXF() {
        let gexf = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gexf += '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">\n';
        gexf += '  <meta lastmodifieddate="' + new Date().toISOString() + '">\n';
        gexf += '    <creator>Knowledge Consolidator v2</creator>\n';
        gexf += '  </meta>\n';
        gexf += '  <graph mode="static" defaultedgetype="directed">\n';
        
        // Atributos
        gexf += '    <attributes class="node">\n';
        gexf += '      <attribute id="0" title="type" type="string"/>\n';
        gexf += '      <attribute id="1" title="relevance" type="float"/>\n';
        gexf += '    </attributes>\n';
        
        // Nós
        gexf += '    <nodes>\n';
        this.nodes.forEach(node => {
            gexf += `      <node id="${node.id}" label="${node.label}">\n`;
            if (node.metadata) {
                gexf += '        <attvalues>\n';
                gexf += `          <attvalue for="0" value="${node.type || 'default'}"/>\n`;
                if (node.metadata.relevance) {
                    gexf += `          <attvalue for="1" value="${node.metadata.relevance}"/>\n`;
                }
                gexf += '        </attvalues>\n';
            }
            if (node.color) {
                const rgb = this.hexToRgb(node.color);
                gexf += `        <viz:color r="${rgb.r}" g="${rgb.g}" b="${rgb.b}"/>\n`;
            }
            if (node.size) {
                gexf += `        <viz:size value="${node.size}"/>\n`;
            }
            gexf += '      </node>\n';
        });
        gexf += '    </nodes>\n';
        
        // Arestas
        gexf += '    <edges>\n';
        let edgeId = 0;
        this.edges.forEach(edge => {
            gexf += `      <edge id="${edgeId++}" source="${edge.from}" target="${edge.to}"`;
            if (edge.width) gexf += ` weight="${edge.width}"`;
            gexf += '/>\n';
        });
        gexf += '    </edges>\n';
        
        gexf += '  </graph>\n';
        gexf += '</gexf>';
        
        return gexf;
    }

    /**
     * Exporta para formato Cytoscape
     */
    exportToCytoscape() {
        const elements = [];
        
        // Adicionar nós
        this.nodes.forEach(node => {
            elements.push({
                data: {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    ...node.metadata
                },
                position: {
                    x: node.x || Math.random() * 500,
                    y: node.y || Math.random() * 500
                },
                style: {
                    'background-color': node.color,
                    'width': node.size * 2,
                    'height': node.size * 2,
                    'label': node.label
                }
            });
        });
        
        // Adicionar arestas
        this.edges.forEach(edge => {
            elements.push({
                data: {
                    id: edge.id,
                    source: edge.from,
                    target: edge.to,
                    label: edge.label
                },
                style: {
                    'line-color': edge.color || '#999',
                    'width': edge.width || 1
                }
            });
        });
        
        return {
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle'
                    }
                }
            ]
        };
    }

    /**
     * Exporta para formato D3.js
     */
    exportToD3() {
        return {
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.id,
                name: node.label,
                group: node.type || 'default',
                value: node.size || 10,
                color: node.color,
                ...node.metadata
            })),
            links: Array.from(this.edges.values()).map(edge => ({
                source: edge.from,
                target: edge.to,
                value: edge.width || 1,
                type: edge.label || 'default'
            }))
        };
    }

    /**
     * Converte dados do modelo para estrutura de grafo
     */
    parseDataToGraph() {
        if (!this.data) return;

        this.nodes.clear();
        this.edges.clear();

        // Processar diferentes formatos de entrada
        if (this.data.nodes && Array.isArray(this.data.nodes)) {
            this.data.nodes.forEach(node => {
                this.nodes.set(node.id, node);
            });
        }

        if (this.data.edges && Array.isArray(this.data.edges)) {
            this.data.edges.forEach(edge => {
                this.edges.set(edge.id || `${edge.from}-${edge.to}`, edge);
            });
        }

        // Processar formato específico do modelo
        if (this.data.views) {
            this.processViewsFormat();
        }
    }

    /**
     * Processa formato de views do modelo
     */
    processViewsFormat() {
        const view = this.data.views[this.currentView];
        if (!view) return;

        // Processar tipos (verticalClusters)
        if (view.nodes && view.nodes.types) {
            view.nodes.types.forEach(type => {
                // Nó principal do tipo
                this.nodes.set(type.id, {
                    id: type.id,
                    label: type.label,
                    color: type.color,
                    shape: 'hexagon',
                    size: 40,
                    level: 0,
                    type: 'analysis-type'
                });

                // Processar categorias
                if (type.categories) {
                    type.categories.forEach(category => {
                        const catId = `${type.id}-${category.id}`;
                        this.nodes.set(catId, {
                            id: catId,
                            label: category.label,
                            color: '#10b981',
                            shape: 'square',
                            size: 25,
                            level: 1,
                            type: 'category'
                        });

                        // Conectar categoria ao tipo
                        this.edges.set(`edge-${type.id}-${catId}`, {
                            from: type.id,
                            to: catId,
                            width: 3,
                            color: type.color
                        });

                        // Processar entidades
                        if (category.entities) {
                            category.entities.forEach((entity, idx) => {
                                const entityId = `${catId}-entity-${idx}`;
                                this.nodes.set(entityId, {
                                    id: entityId,
                                    label: entity,
                                    color: '#fbbf24',
                                    shape: 'diamond',
                                    size: 20,
                                    level: 2,
                                    type: 'entity'
                                });

                                // Conectar entidade à categoria
                                this.edges.set(`edge-${catId}-${entityId}`, {
                                    from: catId,
                                    to: entityId,
                                    width: 2,
                                    color: '#10b981'
                                });
                            });
                        }

                        // Processar arquivos
                        if (category.files) {
                            category.files.forEach((file, idx) => {
                                const fileId = `${catId}-file-${idx}`;
                                this.nodes.set(fileId, {
                                    id: fileId,
                                    label: file.substring(0, 15),
                                    color: '#3b82f6',
                                    shape: 'dot',
                                    size: 10,
                                    level: 3,
                                    type: 'file',
                                    metadata: {
                                        fullName: file
                                    }
                                });

                                // Conectar arquivo à categoria
                                this.edges.set(`edge-${catId}-${fileId}`, {
                                    from: catId,
                                    to: fileId,
                                    width: 1,
                                    color: '#64748b',
                                    dashes: true
                                });
                            });
                        }
                    });
                }
            });
        }
    }

    /**
     * Adiciona um novo nó
     */
    addNode(node) {
        if (!node.id) {
            node.id = 'node-' + Date.now();
        }
        this.nodes.set(node.id, node);
        this.metadata.modified = new Date().toISOString();
        return node.id;
    }

    /**
     * Adiciona uma nova aresta
     */
    addEdge(edge) {
        if (!edge.id) {
            edge.id = `edge-${edge.from}-${edge.to}`;
        }
        this.edges.set(edge.id, edge);
        this.metadata.modified = new Date().toISOString();
        return edge.id;
    }

    /**
     * Remove um nó e suas conexões
     */
    removeNode(nodeId) {
        this.nodes.delete(nodeId);
        
        // Remover arestas conectadas
        this.edges.forEach((edge, id) => {
            if (edge.from === nodeId || edge.to === nodeId) {
                this.edges.delete(id);
            }
        });
        
        this.metadata.modified = new Date().toISOString();
    }

    /**
     * Atualiza propriedades de um nó
     */
    updateNode(nodeId, properties) {
        const node = this.nodes.get(nodeId);
        if (node) {
            Object.assign(node, properties);
            this.metadata.modified = new Date().toISOString();
        }
        return node;
    }

    /**
     * Busca nós por tipo
     */
    getNodesByType(type) {
        return Array.from(this.nodes.values()).filter(node => node.type === type);
    }

    /**
     * Busca nós conectados
     */
    getConnectedNodes(nodeId) {
        const connected = new Set();
        
        this.edges.forEach(edge => {
            if (edge.from === nodeId) {
                connected.add(edge.to);
            } else if (edge.to === nodeId) {
                connected.add(edge.from);
            }
        });
        
        return Array.from(connected).map(id => this.nodes.get(id)).filter(Boolean);
    }

    /**
     * Calcula estatísticas do grafo
     */
    getStatistics() {
        const stats = {
            totalNodes: this.nodes.size,
            totalEdges: this.edges.size,
            nodesByType: {},
            avgConnections: 0,
            density: 0
        };

        // Contar nós por tipo
        this.nodes.forEach(node => {
            const type = node.type || 'default';
            stats.nodesByType[type] = (stats.nodesByType[type] || 0) + 1;
        });

        // Calcular média de conexões
        const connectionCounts = new Map();
        this.edges.forEach(edge => {
            connectionCounts.set(edge.from, (connectionCounts.get(edge.from) || 0) + 1);
            connectionCounts.set(edge.to, (connectionCounts.get(edge.to) || 0) + 1);
        });

        if (connectionCounts.size > 0) {
            const totalConnections = Array.from(connectionCounts.values()).reduce((a, b) => a + b, 0);
            stats.avgConnections = (totalConnections / connectionCounts.size).toFixed(2);
        }

        // Calcular densidade (edges / possíveis edges)
        if (this.nodes.size > 1) {
            const possibleEdges = this.nodes.size * (this.nodes.size - 1) / 2;
            stats.density = (this.edges.size / possibleEdges).toFixed(3);
        }

        return stats;
    }

    /**
     * Converte cor hex para RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * Salva dados no localStorage
     */
    saveToLocalStorage(key = 'graphData') {
        try {
            const data = {
                metadata: this.metadata,
                nodes: Array.from(this.nodes.entries()),
                edges: Array.from(this.edges.entries()),
                currentView: this.currentView
            };
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            return false;
        }
    }

    /**
     * Carrega dados do localStorage
     */
    loadFromLocalStorage(key = 'graphData') {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const data = JSON.parse(stored);
                this.metadata = data.metadata;
                this.nodes = new Map(data.nodes);
                this.edges = new Map(data.edges);
                this.currentView = data.currentView || 'verticalClusters';
                return true;
            }
        } catch (error) {
            console.error('Erro ao carregar do localStorage:', error);
        }
        return false;
    }
}

// Exportar para uso global
window.GraphDataManager = GraphDataManager;