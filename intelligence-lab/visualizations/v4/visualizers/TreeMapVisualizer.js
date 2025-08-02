/**
 * TreeMapVisualizer - Visualização de Mapa de Árvore
 * 
 * Implementa TreeMap D3.js para mostrar hierarquias e proporções:
 * - Retângulos aninhados representam hierarquia
 * - Tamanho = quantidade/relevância
 * - Cor = tipo de análise ou categoria
 * - Drill-down interativo
 */

class TreeMapVisualizer {
    constructor() {
        this.container = null;
        this.svg = null;
        this.data = null;
        this.width = 1200;
        this.height = 600;
        this.margin = { top: 40, right: 10, bottom: 10, left: 10 };
        
        // Estado
        this.currentRoot = null;
        this.breadcrumb = [];
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Cores por tipo
        this.typeColors = {
            'Breakthrough Técnico': '#E74C3C',
            'Evolução Conceitual': '#3498DB',
            'Momento Decisivo': '#2ECC71',
            'Insight Estratégico': '#F39C12',
            'Aprendizado Geral': '#9B59B6',
            'General': '#95A5A6'
        };
        
        // Escalas
        this.colorScale = null;
        this.opacityScale = null;
    }
    
    /**
     * Define o container para renderização
     * @param {HTMLElement} container
     */
    setContainer(container) {
        this.container = container;
        const rect = container.getBoundingClientRect();
        this.width = rect.width || 1200;
        this.height = rect.height || 600;
    }
    
    /**
     * Renderiza o TreeMap
     * @param {Object} data - Dados hierárquicos
     * @param {Object} options - Opções de renderização
     */
    async render(data, options = {}) {
        console.log('🎨 TreeMapVisualizer.render() iniciado', {
            hasContainer: !!this.container,
            hasData: !!data,
            dataType: data?.hierarchy ? 'hierarchy' : data?.treemap ? 'treemap' : 'unknown'
        });
        
        if (!this.container) {
            console.error('❌ Container não definido');
            throw new Error('Container não definido. Use setContainer() primeiro');
        }
        
        // Validar e preparar dados
        try {
            this.data = this._prepareData(data);
            if (!this.data || (!this.data.children && this.data.value === 0)) {
                console.warn('⚠️ Nenhum dado válido para visualizar');
                this._showEmptyState();
                return;
            }
        } catch (error) {
            console.error('❌ Erro ao preparar dados:', error);
            this._showErrorState(error.message);
            return;
        }
        
        this.options = options;
        
        console.log('📊 Renderizando TreeMap:', {
            root: this.data.name,
            children: this.data.children?.length || 0,
            totalValue: this.data.value
        });
        
        // Limpar container
        this.container.innerHTML = '';
        
        // Criar estrutura
        this._createStructure();
        
        // Configurar TreeMap
        this._setupTreeMap();
        
        // Renderizar
        this._render();
        
        // Adicionar controles
        this._addControls();
        
        // Emitir evento
        this._emit('rendered', { data: this.data });
    }
    
    /**
     * Prepara dados para TreeMap
     * @private
     */
    _prepareData(data) {
        console.log('🔄 Preparando dados para TreeMap', data);
        
        // Se receber estrutura completa do DataTransformerV4
        if (data?.treemap) {
            return data.treemap;
        }
        
        // Se receber hierarquia direta
        if (data?.hierarchy) {
            return this._convertHierarchyToTreeMap(data.hierarchy);
        }
        
        // Se receber dados diretos (assumir que já é formato TreeMap)
        if (data?.name && (data?.children || data?.value)) {
            return data;
        }
        
        // Tentar extrair de diferentes formatos
        if (data?.sankey) {
            return this._convertSankeyToTreeMap(data.sankey);
        }
        
        throw new Error('Formato de dados não reconhecido para TreeMap');
    }
    
    /**
     * Converte hierarquia para formato TreeMap
     * @private
     */
    _convertHierarchyToTreeMap(hierarchy) {
        const convert = (node) => {
            const treeNode = {
                name: node.name,
                type: node.type,
                id: node.id || this._generateId(node.name)
            };
            
            if (node.children && node.children.length > 0) {
                treeNode.children = node.children.map(child => convert(child));
            } else {
                // Folhas precisam de valor
                if (node.metrics) {
                    treeNode.value = node.metrics.relevance || node.metrics.fileCount || 1;
                    treeNode.data = node.metrics;
                } else {
                    treeNode.value = 1;
                }
            }
            
            // Copiar métricas
            if (node.metrics) {
                treeNode.metrics = node.metrics;
            }
            
            return treeNode;
        };
        
        return convert(hierarchy);
    }
    
    /**
     * Converte dados Sankey para TreeMap
     * @private
     */
    _convertSankeyToTreeMap(sankeyData) {
        console.log('🔄 Convertendo Sankey para TreeMap');
        
        if (!sankeyData.nodes || sankeyData.nodes.length === 0) {
            return { name: 'Root', value: 0, children: [] };
        }
        
        // Agrupar nós por nível
        const levels = new Map();
        sankeyData.nodes.forEach(node => {
            const level = node.level || 0;
            if (!levels.has(level)) {
                levels.set(level, []);
            }
            levels.get(level).push(node);
        });
        
        // Construir hierarquia
        const root = {
            name: 'Knowledge Base',
            children: []
        };
        
        // Processar nível 0 (categorias ou tipos)
        const level0 = levels.get(0) || [];
        level0.forEach(node => {
            const treeNode = {
                name: node.name,
                id: node.id,
                type: node.type,
                value: node.value || 1,
                children: []
            };
            
            // Encontrar filhos através dos links
            if (sankeyData.links) {
                const childLinks = sankeyData.links.filter(link => link.source === node.id);
                childLinks.forEach(link => {
                    const childNode = sankeyData.nodes.find(n => n.id === link.target);
                    if (childNode) {
                        treeNode.children.push({
                            name: childNode.name,
                            id: childNode.id,
                            type: childNode.type,
                            value: link.value || childNode.value || 1
                        });
                    }
                });
            }
            
            if (treeNode.children.length === 0) {
                delete treeNode.children;
            }
            
            root.children.push(treeNode);
        });
        
        return root;
    }
    
    /**
     * Cria estrutura DOM
     * @private
     */
    _createStructure() {
        // Container principal
        const mainDiv = document.createElement('div');
        mainDiv.className = 'treemap-container';
        mainDiv.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            background: #0a0a0a;
            display: flex;
            flex-direction: column;
        `;
        
        // Breadcrumb
        this.breadcrumbDiv = document.createElement('div');
        this.breadcrumbDiv.className = 'treemap-breadcrumb';
        this.breadcrumbDiv.style.cssText = `
            height: 40px;
            padding: 10px 20px;
            background: #1a1a2e;
            border-bottom: 1px solid #2a2a3e;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9em;
            color: #e0e0e0;
        `;
        
        // Container do TreeMap
        this.treeMapDiv = document.createElement('div');
        this.treeMapDiv.className = 'treemap-content';
        this.treeMapDiv.style.cssText = `
            flex: 1;
            position: relative;
            overflow: hidden;
        `;
        
        mainDiv.appendChild(this.breadcrumbDiv);
        mainDiv.appendChild(this.treeMapDiv);
        this.container.appendChild(mainDiv);
        
        // Dimensões internas
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom - 50; // -50 para breadcrumb
    }
    
    /**
     * Configura layout TreeMap
     * @private
     */
    _setupTreeMap() {
        // Layout TreeMap
        this.treemap = d3.treemap()
            .size([this.innerWidth, this.innerHeight])
            .paddingInner(2)
            .paddingOuter(4)
            .paddingTop(20)
            .round(true);
        
        // Estratégias de tiling
        const tilingMethods = {
            'squarify': d3.treemapSquarify,
            'binary': d3.treemapBinary,
            'slice': d3.treemapSlice,
            'dice': d3.treemapDice,
            'sliceDice': d3.treemapSliceDice
        };
        
        const method = this.options.tiling || 'squarify';
        this.treemap.tile(tilingMethods[method] || d3.treemapSquarify);
    }
    
    /**
     * Renderiza TreeMap
     * @private
     */
    _render() {
        // Preparar dados com d3.hierarchy
        const root = d3.hierarchy(this.currentRoot || this.data)
            .sum(d => d.value || 0)
            .sort((a, b) => b.value - a.value);
        
        // Aplicar layout
        this.treemap(root);
        
        // SVG principal
        this.svg = d3.select(this.treeMapDiv)
            .append('svg')
            .attr('width', this.innerWidth)
            .attr('height', this.innerHeight)
            .style('font-family', 'Arial, sans-serif');
        
        // Grupo principal
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Renderizar células
        const cell = g.selectAll('g')
            .data(root.leaves())
            .enter().append('g')
            .attr('class', 'treemap-cell')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);
        
        // Retângulos
        cell.append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => this._getColor(d))
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .style('cursor', d => d.data.children ? 'pointer' : 'default')
            .on('click', (event, d) => this._handleClick(event, d))
            .on('mouseover', (event, d) => this._handleMouseOver(event, d))
            .on('mouseout', (event, d) => this._handleMouseOut(event, d));
        
        // Clippath para texto
        cell.append('clipPath')
            .attr('id', d => `clip-${this._sanitizeId(d.data.id || d.data.name)}`)
            .append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0);
        
        // Labels
        const text = cell.append('text')
            .attr('clip-path', d => `url(#clip-${this._sanitizeId(d.data.id || d.data.name)})`);
        
        // Nome
        text.append('tspan')
            .attr('x', 4)
            .attr('y', 16)
            .style('font-weight', 'bold')
            .style('font-size', d => this._getFontSize(d))
            .style('fill', '#fff')
            .text(d => d.data.name);
        
        // Valor
        text.append('tspan')
            .attr('x', 4)
            .attr('y', 32)
            .style('font-size', d => `${this._getFontSize(d) * 0.8}px`)
            .style('fill', '#ccc')
            .text(d => this._formatValue(d));
        
        // Atualizar breadcrumb
        this._updateBreadcrumb();
    }
    
    /**
     * Calcula cor baseada no tipo e profundidade
     * @private
     */
    _getColor(d) {
        // Encontrar o ancestral tipo
        let node = d;
        while (node.parent && node.data.type !== 'analysisType') {
            node = node.parent;
        }
        
        if (node.data.type === 'analysisType') {
            const baseColor = this.typeColors[node.data.name] || '#95A5A6';
            // Escurecer baseado na profundidade
            const depth = d.depth - node.depth;
            return this._adjustBrightness(baseColor, 1 - (depth * 0.2));
        }
        
        // Fallback para escala de categoria
        const categories = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#34495E'];
        const index = Math.abs(this._hashCode(d.data.name)) % categories.length;
        return categories[index];
    }
    
    /**
     * Calcula tamanho da fonte baseado na área
     * @private
     */
    _getFontSize(d) {
        const area = (d.x1 - d.x0) * (d.y1 - d.y0);
        const minSize = 10;
        const maxSize = 20;
        
        // Escala logarítmica
        const scale = d3.scaleLog()
            .domain([100, 10000])
            .range([minSize, maxSize])
            .clamp(true);
        
        return scale(area);
    }
    
    /**
     * Formata valor para exibição
     * @private
     */
    _formatValue(d) {
        if (d.data.type === 'file') {
            return `Relevância: ${d.value.toFixed(1)}%`;
        } else if (d.data.metrics) {
            if (d.data.metrics.fileCount) {
                return `${d.data.metrics.fileCount} arquivos`;
            }
            if (d.data.metrics.avgRelevance) {
                return `Média: ${d.data.metrics.avgRelevance.toFixed(1)}%`;
            }
        }
        return `Valor: ${d.value.toFixed(0)}`;
    }
    
    /**
     * Manipula clique em célula
     * @private
     */
    _handleClick(event, d) {
        event.stopPropagation();
        
        // Se tem filhos, fazer drill-down
        if (d.data.children && d.data.children.length > 0) {
            this._drillDown(d.data);
        } else {
            // Emitir evento de seleção
            this._emit('nodeClick', { 
                node: d.data,
                path: this._getPath(d)
            });
        }
    }
    
    /**
     * Drill-down para sub-árvore
     * @private
     */
    _drillDown(node) {
        console.log('🔽 Drill-down para:', node.name);
        
        // Atualizar breadcrumb
        if (this.currentRoot) {
            this.breadcrumb.push(this.currentRoot);
        }
        
        // Definir nova raiz
        this.currentRoot = node;
        
        // Re-renderizar com transição
        this._transition();
    }
    
    /**
     * Drill-up para nível anterior
     * @private
     */
    _drillUp() {
        if (this.breadcrumb.length > 0) {
            this.currentRoot = this.breadcrumb.pop();
            if (this.breadcrumb.length === 0) {
                this.currentRoot = null; // Voltar para raiz original
            }
            this._transition();
        }
    }
    
    /**
     * Transição animada
     * @private
     */
    _transition() {
        // Fade out
        this.svg.transition()
            .duration(250)
            .style('opacity', 0)
            .on('end', () => {
                // Limpar e re-renderizar
                this.svg.remove();
                this._render();
                
                // Fade in
                this.svg.style('opacity', 0)
                    .transition()
                    .duration(250)
                    .style('opacity', 1);
            });
    }
    
    /**
     * Atualiza breadcrumb
     * @private
     */
    _updateBreadcrumb() {
        this.breadcrumbDiv.innerHTML = '';
        
        // Home
        const home = document.createElement('span');
        home.innerHTML = '🏠 Home';
        home.style.cssText = 'cursor: pointer; color: #4fc3f7;';
        home.onclick = () => {
            this.currentRoot = null;
            this.breadcrumb = [];
            this._transition();
        };
        this.breadcrumbDiv.appendChild(home);
        
        // Path
        const fullPath = [...this.breadcrumb];
        if (this.currentRoot) {
            fullPath.push(this.currentRoot);
        }
        
        fullPath.forEach((node, index) => {
            // Separator
            const sep = document.createElement('span');
            sep.innerHTML = ' › ';
            sep.style.color = '#666';
            this.breadcrumbDiv.appendChild(sep);
            
            // Node
            const item = document.createElement('span');
            item.innerHTML = node.name;
            
            if (index < fullPath.length - 1) {
                item.style.cssText = 'cursor: pointer; color: #4fc3f7;';
                item.onclick = () => {
                    // Voltar para este nível
                    this.breadcrumb = fullPath.slice(0, index);
                    this.currentRoot = node;
                    this._transition();
                };
            } else {
                item.style.color = '#e0e0e0';
            }
            
            this.breadcrumbDiv.appendChild(item);
        });
    }
    
    /**
     * Manipula mouse over
     * @private
     */
    _handleMouseOver(event, d) {
        // Destacar
        d3.select(event.target)
            .transition()
            .duration(200)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Tooltip
        this._showTooltip(event, d);
        
        // Emitir evento
        this._emit('nodeHover', { node: d.data, over: true });
    }
    
    /**
     * Manipula mouse out
     * @private
     */
    _handleMouseOut(event, d) {
        // Restaurar
        d3.select(event.target)
            .transition()
            .duration(200)
            .attr('stroke', '#000')
            .attr('stroke-width', 1);
        
        // Esconder tooltip
        this._hideTooltip();
        
        // Emitir evento
        this._emit('nodeHover', { node: d.data, over: false });
    }
    
    /**
     * Adiciona controles
     * @private
     */
    _addControls() {
        const controls = document.createElement('div');
        controls.className = 'treemap-controls';
        controls.style.cssText = `
            position: absolute;
            top: 60px;
            right: 20px;
            background: rgba(26, 26, 46, 0.9);
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            font-size: 0.85em;
            color: #e0e0e0;
        `;
        
        // Método de tiling
        const tilingDiv = document.createElement('div');
        tilingDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #4fc3f7;">Layout:</div>
            <select id="tiling-select" style="
                width: 100%;
                padding: 5px;
                background: #1a1a2e;
                border: 1px solid #2a2a3e;
                color: #e0e0e0;
                border-radius: 4px;
            ">
                <option value="squarify">Squarify (Padrão)</option>
                <option value="binary">Binary</option>
                <option value="slice">Slice</option>
                <option value="dice">Dice</option>
                <option value="sliceDice">Slice & Dice</option>
            </select>
        `;
        controls.appendChild(tilingDiv);
        
        // Evento de mudança
        tilingDiv.querySelector('select').addEventListener('change', (e) => {
            this.options.tiling = e.target.value;
            this._setupTreeMap();
            this.svg.remove();
            this._render();
        });
        
        // Estatísticas
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #2a2a3e;';
        
        const stats = this._calculateStats();
        statsDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; color: #4fc3f7;">Estatísticas:</div>
            <div style="font-size: 0.9em;">
                <div>Total de nós: ${stats.totalNodes}</div>
                <div>Profundidade: ${stats.maxDepth}</div>
                <div>Nó atual: ${this.currentRoot?.name || 'Raiz'}</div>
            </div>
        `;
        controls.appendChild(statsDiv);
        
        // Instruções
        const helpDiv = document.createElement('div');
        helpDiv.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #2a2a3e;';
        helpDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; color: #4fc3f7;">Interações:</div>
            <div style="font-size: 0.9em;">
                <div>• Clique para drill-down</div>
                <div>• Use breadcrumb para navegar</div>
                <div>• Hover para detalhes</div>
            </div>
        `;
        controls.appendChild(helpDiv);
        
        this.container.appendChild(controls);
    }
    
    /**
     * Calcula estatísticas
     * @private
     */
    _calculateStats() {
        const root = d3.hierarchy(this.currentRoot || this.data);
        
        return {
            totalNodes: root.descendants().length,
            maxDepth: d3.max(root.leaves(), d => d.depth),
            leafNodes: root.leaves().length
        };
    }
    
    /**
     * Sistema de tooltip
     * @private
     */
    _tooltipElement = null;
    
    _showTooltip(event, d) {
        if (!this._tooltipElement) {
            this._tooltipElement = document.createElement('div');
            this._tooltipElement.className = 'treemap-tooltip';
            this._tooltipElement.style.cssText = `
                position: absolute;
                padding: 10px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #4fc3f7;
                border-radius: 5px;
                color: #e0e0e0;
                font-size: 0.85em;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 1000;
                max-width: 300px;
            `;
            document.body.appendChild(this._tooltipElement);
        }
        
        let content = `<strong>${d.data.name}</strong><br/>`;
        
        if (d.data.type) {
            content += `Tipo: ${d.data.type}<br/>`;
        }
        
        if (d.data.metrics) {
            if (d.data.metrics.fileCount) {
                content += `Arquivos: ${d.data.metrics.fileCount}<br/>`;
            }
            if (d.data.metrics.avgRelevance) {
                content += `Relevância média: ${d.data.metrics.avgRelevance.toFixed(1)}%<br/>`;
            }
            if (d.data.metrics.entityCount) {
                content += `Entidades: ${d.data.metrics.entityCount}<br/>`;
            }
        }
        
        content += `<br/>Valor: ${d.value.toFixed(0)}`;
        
        if (d.data.children) {
            content += `<br/><em>Clique para explorar ${d.data.children.length} sub-itens</em>`;
        }
        
        this._tooltipElement.innerHTML = content;
        this._tooltipElement.style.left = `${event.pageX + 10}px`;
        this._tooltipElement.style.top = `${event.pageY - 10}px`;
        this._tooltipElement.style.opacity = '1';
    }
    
    _hideTooltip() {
        if (this._tooltipElement) {
            this._tooltipElement.style.opacity = '0';
        }
    }
    
    /**
     * Mostra estado vazio
     * @private
     */
    _showEmptyState() {
        this.container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #666;
                font-size: 1.2em;
                text-align: center;
            ">
                <div>
                    <div style="font-size: 3em; margin-bottom: 20px;">📊</div>
                    <div>Nenhum dado disponível para visualização</div>
                    <div style="font-size: 0.9em; margin-top: 10px;">
                        Selecione campos na etapa anterior
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Mostra estado de erro
     * @private
     */
    _showErrorState(message) {
        this.container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #e74c3c;
                font-size: 1.2em;
                text-align: center;
            ">
                <div>
                    <div style="font-size: 3em; margin-bottom: 20px;">⚠️</div>
                    <div>Erro ao carregar visualização</div>
                    <div style="font-size: 0.9em; margin-top: 10px; color: #999;">
                        ${message}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Utilitários
     * @private
     */
    _sanitizeId(str) {
        return String(str).toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    
    _generateId(str) {
        return `node_${this._sanitizeId(str)}_${Date.now()}`;
    }
    
    _hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    
    _adjustBrightness(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const adjust = (c) => Math.min(255, Math.max(0, Math.floor(c * factor)));
        
        return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`;
    }
    
    _getPath(d) {
        const path = [];
        let current = d;
        while (current) {
            path.unshift(current.data.name);
            current = current.parent;
        }
        return path;
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
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.data = null;
        this.currentRoot = null;
        this.breadcrumb = [];
        this.eventListeners.clear();
    }
}

// Exportar como módulo ES6
export default TreeMapVisualizer;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.TreeMapVisualizer = TreeMapVisualizer;
}