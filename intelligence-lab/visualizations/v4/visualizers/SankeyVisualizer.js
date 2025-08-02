/**
 * SankeyVisualizer - Visualização de Fluxo Hierárquico
 * 
 * Implementa diagrama Sankey para mostrar fluxo de dados:
 * Tipo de Análise → Categorias → Arquivos
 */

class SankeyVisualizer {
    constructor() {
        this.container = null;
        this.svg = null;
        this.data = null;
        this.sankey = null;
        this.width = 1200;
        this.height = 600;
        this.margin = { top: 20, right: 150, bottom: 20, left: 150 };
        this.nodeWidth = 20;
        this.nodePadding = 15;
        
        // Estado interno
        this.selectedNode = null;
        this.hoveredNode = null;
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Cores por tipo de análise
        this.typeColors = {
            'Breakthrough Técnico': '#FF6B6B',
            'Evolução Conceitual': '#4ECDC4',
            'Momento Decisivo': '#45B7D1',
            'Insight Estratégico': '#FECA57',
            'Aprendizado Geral': '#A29BFE',
            'General': '#95A5A6'
        };
        
        // Escalas
        this.colorScale = null;
        this.linkOpacityScale = null;
    }
    
    /**
     * Define o container para renderização
     * @param {HTMLElement} container
     */
    setContainer(container) {
        this.container = container;
        // Atualizar dimensões baseado no container
        const rect = container.getBoundingClientRect();
        this.width = rect.width || 1200;
        this.height = rect.height || 600;
    }
    
    /**
     * Renderiza o diagrama Sankey
     * @param {Object} data - Dados no formato { nodes, links }
     * @param {Object} options - Opções de renderização
     */
    async render(data, options = {}) {
        if (!this.container) {
            throw new Error('Container não definido. Use setContainer() primeiro');
        }
        
        if (!data || !data.nodes || !data.links) {
            throw new Error('Dados inválidos. Esperado formato { nodes, links }');
        }
        
        this.data = data;
        this.options = options;
        
        console.log('Renderizando Sankey:', {
            nodes: data.nodes.length,
            links: data.links.length
        });
        
        // Limpar container
        this.container.innerHTML = '';
        
        // Criar SVG
        this._createSVG();
        
        // Configurar Sankey
        this._setupSankey();
        
        // Processar dados
        this._processData();
        
        // Renderizar elementos
        this._renderLinks();
        this._renderNodes();
        this._renderLabels();
        
        // Adicionar interações
        this._setupInteractions();
        
        // Adicionar legenda
        this._renderLegend();
        
        // Adicionar controles
        this._addControls();
        
        // Emitir evento de renderização completa
        this._emit('rendered', { nodes: this.nodes, links: this.links });
    }
    
    /**
     * Cria elemento SVG
     * @private
     */
    _createSVG() {
        // Container principal com responsividade
        const svgContainer = d3.select(this.container)
            .append('div')
            .style('width', '100%')
            .style('height', '100%')
            .style('position', 'relative');
        
        // SVG responsivo
        this.svg = svgContainer
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        
        // Grupo principal com margens
        this.mainGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Adicionar defs para gradientes
        this.defs = this.svg.append('defs');
        
        // Dimensões internas
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
    }
    
    /**
     * Configura layout Sankey
     * @private
     */
    _setupSankey() {
        this.sankey = d3.sankey()
            .nodeId(d => d.id)
            .nodeWidth(this.nodeWidth)
            .nodePadding(this.nodePadding)
            .nodeAlign(d3.sankeyLeft) // Alinhamento à esquerda para hierarquia clara
            .extent([[0, 0], [this.innerWidth, this.innerHeight]]);
        
        // Configurar ordenação de nós
        this.sankey.nodeSort((a, b) => {
            // Ordenar por nível primeiro, depois por valor
            if (a.level !== b.level) return a.level - b.level;
            return b.value - a.value;
        });
    }
    
    /**
     * Processa dados para o layout Sankey
     * @private
     */
    _processData() {
        // Criar cópias dos dados para não modificar originais
        const nodes = this.data.nodes.map(d => ({ ...d }));
        const links = this.data.links.map(d => ({ ...d }));
        
        // Aplicar layout Sankey
        const graph = this.sankey({
            nodes: nodes,
            links: links
        });
        
        this.nodes = graph.nodes;
        this.links = graph.links;
        
        // Configurar escalas
        this._setupScales();
        
        // Criar gradientes para links
        this._createLinkGradients();
    }
    
    /**
     * Configura escalas de cor e opacidade
     * @private
     */
    _setupScales() {
        // Escala de opacidade para links baseada no valor
        const linkValues = this.links.map(d => d.value);
        this.linkOpacityScale = d3.scaleLinear()
            .domain([d3.min(linkValues), d3.max(linkValues)])
            .range([0.3, 0.8]);
        
        // Função de cor para nós
        this.nodeColor = (node) => {
            // Nova estrutura: Categoria → Tipo → Clusters
            if (node.type === 'category' && node.level === 0) {
                // Categorias usam uma paleta de cores distintas
                const categoryColors = [
                    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FECA57', '#A29BFE',
                    '#FA8231', '#6C5CE7', '#0984E3', '#00B894', '#FDCB6E'
                ];
                const index = parseInt(node.id.split('_')[1]) % categoryColors.length;
                return categoryColors[index];
            } else if (node.type === 'analysisType' && node.level === 1) {
                // Tipos de análise usam cores definidas
                return this.typeColors[node.name] || this.typeColors['General'];
            } else if (node.type === 'relevanceBucket' && node.level === 2) {
                // Clusters de relevância em gradiente
                if (node.name.includes('>80%')) return '#4CAF50';
                if (node.name.includes('60-80%')) return '#FFC107';
                if (node.name.includes('40-60%')) return '#FF9800';
                return '#F44336';
            }
            return '#95A5A6'; // Cor padrão
        };
    }
    
    /**
     * Cria gradientes para links
     * @private
     */
    _createLinkGradients() {
        const gradients = this.defs.selectAll('linearGradient')
            .data(this.links)
            .enter().append('linearGradient')
            .attr('id', d => `gradient-${d.index}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', d => d.source.x1)
            .attr('y1', d => d.source.y0)
            .attr('x2', d => d.target.x0)
            .attr('y2', d => d.target.y0);
        
        gradients.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', d => this.nodeColor(d.source))
            .attr('stop-opacity', d => this.linkOpacityScale(d.value));
        
        gradients.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', d => this.nodeColor(d.target))
            .attr('stop-opacity', d => this.linkOpacityScale(d.value) * 0.8);
    }
    
    /**
     * Renderiza links
     * @private
     */
    _renderLinks() {
        const linkGroup = this.mainGroup.append('g')
            .attr('class', 'links')
            .attr('fill', 'none');
        
        this.linkElements = linkGroup.selectAll('path')
            .data(this.links)
            .enter().append('path')
            .attr('class', 'sankey-link')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', d => `url(#gradient-${d.index})`)
            .attr('stroke-width', d => Math.max(1, d.width))
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this._handleLinkHover(event, d, true))
            .on('mouseout', (event, d) => this._handleLinkHover(event, d, false))
            .on('click', (event, d) => this._handleLinkClick(event, d));
        
        // Adicionar tooltips aos links
        this.linkElements.append('title')
            .text(d => `${d.source.name} → ${d.target.name}\nValor: ${d.value}`);
    }
    
    /**
     * Renderiza nós
     * @private
     */
    _renderNodes() {
        const nodeGroup = this.mainGroup.append('g')
            .attr('class', 'nodes');
        
        const node = nodeGroup.selectAll('.node')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', 'sankey-node')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);
        
        // Retângulos dos nós
        this.nodeElements = node.append('rect')
            .attr('height', d => d.y1 - d.y0)
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', d => this.nodeColor(d))
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this._handleNodeHover(event, d, true))
            .on('mouseout', (event, d) => this._handleNodeHover(event, d, false))
            .on('click', (event, d) => this._handleNodeClick(event, d));
        
        // Armazenar referência do nó no elemento
        node.each(function(d) {
            d.element = this;
        });
    }
    
    /**
     * Renderiza labels
     * @private
     */
    _renderLabels() {
        const labelGroup = this.mainGroup.append('g')
            .attr('class', 'labels');
        
        this.labels = labelGroup.selectAll('.label')
            .data(this.nodes)
            .enter().append('text')
            .attr('class', 'sankey-label')
            .attr('x', d => d.x0 < this.innerWidth / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < this.innerWidth / 2 ? 'start' : 'end')
            .text(d => d.name)
            .style('font-size', d => {
                // Tamanho de fonte baseado no nível
                if (d.level === 0) return '14px';
                if (d.level === 1) return '12px';
                return '10px';
            })
            .style('fill', '#ffffff')
            .style('font-weight', d => d.level === 0 ? 'bold' : 'normal')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)');
        
        // Adicionar valor para nós de nível 0 e 1
        this.labels.filter(d => d.level < 2)
            .append('tspan')
            .attr('x', d => d.x0 < this.innerWidth / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('dy', '1.2em')
            .style('font-size', '10px')
            .style('fill', '#e0e0e0')
            .text(d => `(${d.value})`);
    }
    
    /**
     * Configura interações
     * @private
     */
    _setupInteractions() {
        // Zoom e pan
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                this.mainGroup.attr('transform', event.transform);
                this._emit('zoom', { level: event.transform.k });
            });
        
        this.svg.call(zoom);
        
        // Botão de reset zoom
        this.svg.on('dblclick.zoom', () => {
            this.svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });
    }
    
    /**
     * Renderiza legenda
     * @private
     */
    _renderLegend() {
        const legendData = Object.entries(this.typeColors).slice(0, 5);
        const legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 140}, 20)`);
        
        const legendItem = legendGroup.selectAll('.legend-item')
            .data(legendData)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);
        
        legendItem.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', d => d[1])
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 1);
        
        legendItem.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .style('fill', '#e0e0e0')
            .text(d => d[0]);
    }
    
    /**
     * Adiciona controles
     * @private
     */
    _addControls() {
        const controls = d3.select(this.container)
            .append('div')
            .attr('class', 'sankey-controls')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '10px')
            .style('background', 'rgba(26, 26, 46, 0.9)')
            .style('padding', '15px')
            .style('border-radius', '8px')
            .style('font-size', '12px')
            .style('color', '#e0e0e0')
            .style('box-shadow', '0 2px 10px rgba(0,0,0,0.3)');
        
        // Seletor de visão
        const viewSelector = controls.append('div')
            .style('margin-bottom', '15px');
        
        viewSelector.append('div')
            .style('font-weight', 'bold')
            .style('margin-bottom', '8px')
            .style('color', '#4fc3f7')
            .text('Alternar Visão:');
        
        const views = [
            { id: 'categoryFirst', name: '📁 Categoria → Tipo → Relevância', desc: 'Volume por categoria' },
            { id: 'typeFirst', name: '🏷️ Tipo → Categoria → Relevância', desc: 'Distribuição por tipo' },
            { id: 'entityFocus', name: '🔗 Entidade → Categoria → Tipo', desc: 'Conexões de entidades' },
            { id: 'timeBased', name: '📅 Timeline → Categoria → Tipo', desc: 'Evolução temporal' },
            { id: 'relevanceFirst', name: '⭐ Relevância → Tipo → Arquivos', desc: 'Foco em qualidade' }
        ];
        
        const viewButtons = viewSelector.selectAll('.view-button')
            .data(views)
            .enter()
            .append('div')
            .style('margin-bottom', '5px')
            .style('padding', '8px')
            .style('background', d => d.id === 'categoryFirst' ? '#4fc3f7' : 'rgba(79, 195, 247, 0.1)')
            .style('border', '1px solid #4fc3f7')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s')
            .on('mouseover', function(event, d) {
                if (d.id !== this.currentView) {
                    d3.select(event.currentTarget).style('background', 'rgba(79, 195, 247, 0.3)');
                }
            }.bind(this))
            .on('mouseout', function(event, d) {
                if (d.id !== this.currentView) {
                    d3.select(event.currentTarget).style('background', 'rgba(79, 195, 247, 0.1)');
                }
            }.bind(this))
            .on('click', (event, d) => this._switchView(d.id, viewButtons));
        
        viewButtons.append('div')
            .style('font-weight', 'bold')
            .text(d => d.name);
        
        viewButtons.append('div')
            .style('font-size', '10px')
            .style('color', '#9ca3af')
            .style('margin-top', '2px')
            .text(d => d.desc);
        
        // Instruções
        controls.append('div')
            .style('margin-top', '15px')
            .style('padding-top', '15px')
            .style('border-top', '1px solid #2a2a3e')
            .html(`
                <div style="margin-bottom: 5px; font-weight: bold; color: #4fc3f7;">Interações:</div>
                <div>• Clique nos nós para filtrar</div>
                <div>• Hover para detalhes</div>
                <div>• Scroll para zoom</div>
                <div>• Duplo clique para resetar</div>
            `);
        
        // Armazenar referência aos botões
        this.viewButtons = viewButtons;
        this.currentView = 'categoryFirst';
    }
    
    /**
     * Alterna entre visões
     * @private
     */
    _switchView(viewId, buttons) {
        console.log(`Alternando para visão: ${viewId}`);
        
        // Atualizar visual dos botões
        buttons.style('background', d => d.id === viewId ? '#4fc3f7' : 'rgba(79, 195, 247, 0.1)');
        
        this.currentView = viewId;
        
        // Obter dados da visão selecionada
        let viewData;
        if (viewId === 'categoryFirst') {
            // Visão padrão já carregada
            viewData = this.data;
        } else if (this.data.alternative && this.data.alternative[viewId]) {
            viewData = this.data.alternative[viewId];
        } else {
            console.error(`Visão ${viewId} não disponível`);
            return;
        }
        
        // Re-renderizar com novos dados
        this._rerender(viewData);
    }
    
    /**
     * Re-renderiza o diagrama com novos dados
     * @private
     */
    _rerender(newData) {
        // Salvar estado atual
        const currentTransform = d3.zoomTransform(this.svg.node());
        
        // Limpar elementos existentes
        this.mainGroup.selectAll('*').remove();
        
        // Atualizar dados
        this.data = newData;
        
        // Re-processar e renderizar
        this._processData();
        this._renderLinks();
        this._renderNodes();
        this._renderLabels();
        
        // Restaurar zoom
        this.svg.call(d3.zoom().transform, currentTransform);
        
        // Emitir evento
        this._emit('viewChanged', { view: this.currentView, data: newData });
    }
    
    /**
     * Manipula hover em nós
     * @private
     */
    _handleNodeHover(event, node, isOver) {
        if (isOver) {
            // Destacar nó
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr('stroke-width', 3)
                .attr('stroke', '#fff');
            
            // Destacar links conectados
            this.linkElements
                .transition()
                .duration(200)
                .style('opacity', d => {
                    return d.source === node || d.target === node ? 1 : 0.2;
                });
            
            // Mostrar tooltip detalhado
            const tooltip = this._createTooltip(node);
            this._showTooltip(event, tooltip);
            
            this.hoveredNode = node;
            this._emit('nodeHover', { node, isOver: true });
            
        } else {
            // Restaurar aparência
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr('stroke-width', 1)
                .attr('stroke', '#2c3e50');
            
            this.linkElements
                .transition()
                .duration(200)
                .style('opacity', d => this.linkOpacityScale(d.value));
            
            this._hideTooltip();
            
            this.hoveredNode = null;
            this._emit('nodeHover', { node, isOver: false });
        }
    }
    
    /**
     * Manipula clique em nós
     * @private
     */
    _handleNodeClick(event, node) {
        event.stopPropagation();
        
        // Toggle seleção
        if (this.selectedNode === node) {
            this.selectedNode = null;
        } else {
            this.selectedNode = node;
        }
        
        // Atualizar visualização
        this._updateSelection();
        
        // Construir breadcrumb
        const breadcrumb = this._buildBreadcrumb(node);
        
        this._emit('nodeClick', { node, breadcrumb });
    }
    
    /**
     * Manipula hover em links
     * @private
     */
    _handleLinkHover(event, link, isOver) {
        if (isOver) {
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr('stroke-width', d => Math.max(3, d.width * 1.5));
            
            const tooltip = `${link.source.name} → ${link.target.name}\nValor: ${link.value}`;
            this._showTooltip(event, tooltip);
            
        } else {
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr('stroke-width', d => Math.max(1, d.width));
            
            this._hideTooltip();
        }
    }
    
    /**
     * Manipula clique em links
     * @private
     */
    _handleLinkClick(event, link) {
        event.stopPropagation();
        this._emit('linkClick', { link });
    }
    
    /**
     * Atualiza seleção visual
     * @private
     */
    _updateSelection() {
        if (!this.selectedNode) {
            // Restaurar todos os elementos
            this.nodeElements.style('opacity', 1);
            this.linkElements.style('opacity', d => this.linkOpacityScale(d.value));
            this.labels.style('opacity', 1);
            return;
        }
        
        // Encontrar nós e links relacionados
        const connectedNodes = new Set([this.selectedNode]);
        const connectedLinks = new Set();
        
        this.links.forEach(link => {
            if (link.source === this.selectedNode) {
                connectedNodes.add(link.target);
                connectedLinks.add(link);
            } else if (link.target === this.selectedNode) {
                connectedNodes.add(link.source);
                connectedLinks.add(link);
            }
        });
        
        // Aplicar opacidade
        this.nodeElements.style('opacity', d => connectedNodes.has(d) ? 1 : 0.2);
        this.linkElements.style('opacity', d => connectedLinks.has(d) ? 
            this.linkOpacityScale(d.value) : 0.1);
        this.labels.style('opacity', d => connectedNodes.has(d) ? 1 : 0.2);
    }
    
    /**
     * Constrói breadcrumb para navegação
     * @private
     */
    _buildBreadcrumb(node) {
        const breadcrumb = [];
        
        if (node.level === 2) {
            // Arquivo - encontrar categoria e tipo
            const categoryLink = this.links.find(l => l.target === node);
            if (categoryLink) {
                const category = categoryLink.source;
                const typeLink = this.links.find(l => l.target === category);
                if (typeLink) {
                    breadcrumb.push(typeLink.source.name);
                }
                breadcrumb.push(category.name);
            }
        } else if (node.level === 1) {
            // Categoria - encontrar tipo
            const typeLink = this.links.find(l => l.target === node);
            if (typeLink) {
                breadcrumb.push(typeLink.source.name);
            }
        }
        
        breadcrumb.push(node.name);
        return breadcrumb;
    }
    
    /**
     * Cria tooltip detalhado
     * @private
     */
    _createTooltip(node) {
        let content = `<strong>${node.name}</strong><br/>`;
        
        // Tooltips baseados no tipo de nó
        switch (node.type) {
            case 'category':
                content += `Categoria<br/>`;
                content += `Arquivos: ${node.value}<br/>`;
                if (node.avgRelevance) {
                    content += `Relevância média: ${node.avgRelevance.toFixed(1)}%`;
                }
                break;
                
            case 'analysisType':
                content += `Tipo de Análise<br/>`;
                content += `Arquivos: ${node.value}<br/>`;
                if (node.avgRelevance) {
                    content += `Relevância média: ${node.avgRelevance.toFixed(1)}%`;
                }
                break;
                
            case 'relevanceBucket':
            case 'relevanceCluster':
                content += `Cluster de Relevância<br/>`;
                content += `Arquivos: ${node.fileCount || node.value}<br/>`;
                if (node.files && node.files.length > 0) {
                    content += `<br/><small>Exemplos:</small><br/>`;
                    node.files.slice(0, 3).forEach(f => {
                        content += `<small>• ${f.name} (${f.relevance.toFixed(1)}%)</small><br/>`;
                    });
                    if (node.files.length > 3) {
                        content += `<small>... e mais ${node.files.length - 3}</small>`;
                    }
                }
                break;
                
            case 'entity':
                content += `Entidade<br/>`;
                content += `Ocorrências: ${node.value}<br/>`;
                break;
                
            case 'timePeriod':
                content += `Período<br/>`;
                content += `Arquivos: ${node.value}<br/>`;
                break;
                
            case 'relevanceGroup':
                content += `Faixa de Relevância<br/>`;
                content += `Arquivos: ${node.value}<br/>`;
                break;
                
            case 'file':
                content += `Arquivo<br/>`;
                if (node.fullName) {
                    content += `Nome: ${node.fullName}<br/>`;
                }
                content += `Relevância: ${node.value}%<br/>`;
                if (node.chunks) {
                    content += `Chunks: ${node.chunks}<br/>`;
                }
                if (node.categories && node.categories.length > 0) {
                    content += `Categorias: ${node.categories.join(', ')}`;
                }
                break;
                
            default:
                // Tooltip genérico
                content += `${node.type || 'Nó'}<br/>`;
                content += `Valor: ${node.value}`;
        }
        
        return content;
    }
    
    /**
     * Sistema de tooltip
     * @private
     */
    _tooltipElement = null;
    
    _showTooltip(event, content) {
        if (!this._tooltipElement) {
            this._tooltipElement = d3.select('body')
                .append('div')
                .attr('class', 'sankey-tooltip')
                .style('position', 'absolute')
                .style('padding', '10px')
                .style('background', 'rgba(0, 0, 0, 0.9)')
                .style('border', '1px solid #4fc3f7')
                .style('border-radius', '5px')
                .style('color', '#e0e0e0')
                .style('font-size', '12px')
                .style('pointer-events', 'none')
                .style('opacity', 0)
                .style('z-index', 1000);
        }
        
        this._tooltipElement
            .html(content)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .transition()
            .duration(200)
            .style('opacity', 1);
    }
    
    _hideTooltip() {
        if (this._tooltipElement) {
            this._tooltipElement
                .transition()
                .duration(200)
                .style('opacity', 0);
        }
    }
    
    /**
     * Aplica filtros
     * @param {Object} filters
     */
    applyFilters(filters) {
        // TODO: Implementar filtragem de nós/links
        console.log('Aplicando filtros:', filters);
    }
    
    /**
     * Foca em um nó específico
     * @param {string} nodeId
     */
    focusNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        this.selectedNode = node;
        this._updateSelection();
        
        // Centralizar no nó
        const x = (node.x0 + node.x1) / 2;
        const y = (node.y0 + node.y1) / 2;
        
        const scale = 1.5;
        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(scale)
            .translate(-x, -y);
        
        this.svg.transition()
            .duration(750)
            .call(d3.zoom().transform, transform);
    }
    
    /**
     * Reseta visualização
     */
    reset() {
        this.selectedNode = null;
        this._updateSelection();
        
        this.svg.transition()
            .duration(750)
            .call(d3.zoom().transform, d3.zoomIdentity);
    }
    
    /**
     * Sistema de eventos
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    _emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        
        this.eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erro no listener de ${event}:`, error);
            }
        });
    }
    
    /**
     * Utilitários
     * @private
     */
    _adjustBrightness(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const adjust = (c) => Math.min(255, Math.floor(c * factor));
        
        return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Limpa visualização
     */
    cleanup() {
        if (this._tooltipElement) {
            this._tooltipElement.remove();
            this._tooltipElement = null;
        }
        
        if (this.svg) {
            this.svg.remove();
        }
        
        this.container = null;
        this.svg = null;
        this.data = null;
        this.nodes = null;
        this.links = null;
        this.selectedNode = null;
        this.hoveredNode = null;
        this.eventListeners.clear();
    }
}

// Exportar como módulo ES6
export default SankeyVisualizer;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.SankeyVisualizer = SankeyVisualizer;
}