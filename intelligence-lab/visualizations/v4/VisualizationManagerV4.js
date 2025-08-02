/**
 * VisualizationManagerV4 - Gerenciador de Visualizações
 * 
 * Coordena a alternância entre diferentes tipos de visualização
 * (Sankey, TreeMap, Sunburst, Force-Directed) mantendo contexto e filtros.
 */

class VisualizationManagerV4 {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.currentVisualizer = null;
        this.currentType = null;
        this.transformedData = null;
        this.visualizers = {};
        this.listeners = new Map();
        
        // Estados compartilhados entre visualizações
        this.sharedState = {
            selectedNode: null,
            filters: {
                search: '',
                minRelevance: 0,
                categories: [],
                types: []
            },
            breadcrumb: [],
            zoom: 1,
            focus: null
        };
        
        this._initialize();
    }
    
    /**
     * Inicializa o gerenciador
     * @private
     */
    _initialize() {
        if (!this.container) {
            throw new Error(`Container ${this.containerId} não encontrado`);
        }
        
        // Criar estrutura base
        this.container.innerHTML = `
            <div class="viz-manager-container" style="width: 100%; height: 100%; position: relative;">
                <div class="viz-loading" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    display: none;
                    text-align: center;
                    color: #4fc3f7;
                ">
                    <div class="spinner" style="
                        border: 3px solid rgba(255,255,255,0.1);
                        border-radius: 50%;
                        border-top: 3px solid #4fc3f7;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <div>Carregando visualização...</div>
                </div>
                <div class="viz-content" style="width: 100%; height: 100%;"></div>
                <div class="viz-error" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    display: none;
                    text-align: center;
                    color: #f44336;
                    background: rgba(0,0,0,0.8);
                    padding: 20px;
                    border-radius: 8px;
                "></div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        this.contentContainer = this.container.querySelector('.viz-content');
        this.loadingElement = this.container.querySelector('.viz-loading');
        this.errorElement = this.container.querySelector('.viz-error');
    }
    
    /**
     * Registra um visualizador
     * @param {string} type - Tipo de visualização (sankey, treemap, etc.)
     * @param {Object} visualizer - Instância do visualizador
     */
    registerVisualizer(type, visualizer) {
        this.visualizers[type] = visualizer;
        console.log(`Visualizador '${type}' registrado`);
    }
    
    /**
     * Define os dados transformados
     * @param {Object} data - Dados do DataTransformerV4
     */
    setData(data) {
        this.transformedData = data;
        console.log('Dados definidos no gerenciador:', {
            hierarchy: data.hierarchy ? 'OK' : 'Missing',
            sankey: data.sankey ? 'OK' : 'Missing',
            insights: data.insights ? data.insights.length : 0
        });
    }
    
    /**
     * Alterna para uma visualização específica
     * @param {string} type - Tipo de visualização
     * @param {Object} options - Opções de renderização
     */
    async switchTo(type, options = {}) {
        if (!this.visualizers[type]) {
            throw new Error(`Visualizador '${type}' não registrado`);
        }
        
        if (!this.transformedData) {
            throw new Error('Dados não definidos. Use setData() primeiro');
        }
        
        console.log(`Alternando para visualização: ${type}`);
        this._showLoading();
        
        try {
            // Limpar visualização atual
            if (this.currentVisualizer && this.currentVisualizer.cleanup) {
                await this.currentVisualizer.cleanup();
            }
            
            // Limpar container
            this.contentContainer.innerHTML = '';
            
            // Obter novo visualizador
            this.currentVisualizer = this.visualizers[type];
            this.currentType = type;
            
            // Configurar container do visualizador
            if (this.currentVisualizer.setContainer) {
                this.currentVisualizer.setContainer(this.contentContainer);
            }
            
            // Restaurar estado compartilhado
            if (this.currentVisualizer.setState) {
                this.currentVisualizer.setState(this.sharedState);
            }
            
            // Obter dados específicos para o tipo
            const vizData = this._getDataForType(type);
            
            // Renderizar
            await this.currentVisualizer.render(vizData, {
                ...options,
                metadata: this.transformedData.metadata,
                insights: this.transformedData.insights,
                indices: this.transformedData.indices
            });
            
            // Configurar listeners
            this._setupVisualizerListeners();
            
            this._hideLoading();
            this._emitEvent('visualizationChanged', { type, data: vizData });
            
        } catch (error) {
            console.error(`Erro ao alternar para ${type}:`, error);
            this._showError(`Erro ao carregar visualização: ${error.message}`);
            this._hideLoading();
        }
    }
    
    /**
     * Obtém dados específicos para cada tipo de visualização
     * @private
     */
    _getDataForType(type) {
        switch (type) {
            case 'sankey':
                return this.transformedData.sankey;
            case 'treemap':
                return this.transformedData.treemap || this.transformedData.hierarchy;
            case 'sunburst':
                return this.transformedData.sunburst || this.transformedData.hierarchy;
            case 'force':
                return this.transformedData.force;
            default:
                return this.transformedData.hierarchy;
        }
    }
    
    /**
     * Configura listeners do visualizador atual
     * @private
     */
    _setupVisualizerListeners() {
        if (!this.currentVisualizer || !this.currentVisualizer.on) return;
        
        // Remover listeners anteriores
        this._clearVisualizerListeners();
        
        // Configurar novos listeners
        const events = ['nodeClick', 'nodeHover', 'zoom', 'filter'];
        
        events.forEach(event => {
            const handler = (data) => this._handleVisualizerEvent(event, data);
            this.currentVisualizer.on(event, handler);
            
            // Armazenar para limpeza posterior
            if (!this.listeners.has(this.currentType)) {
                this.listeners.set(this.currentType, []);
            }
            this.listeners.get(this.currentType).push({ event, handler });
        });
    }
    
    /**
     * Remove listeners do visualizador
     * @private
     */
    _clearVisualizerListeners() {
        if (!this.currentVisualizer || !this.currentVisualizer.off) return;
        
        const typeListeners = this.listeners.get(this.currentType);
        if (typeListeners) {
            typeListeners.forEach(({ event, handler }) => {
                this.currentVisualizer.off(event, handler);
            });
            this.listeners.delete(this.currentType);
        }
    }
    
    /**
     * Manipula eventos do visualizador
     * @private
     */
    _handleVisualizerEvent(event, data) {
        console.log(`Evento do visualizador: ${event}`, data);
        
        switch (event) {
            case 'nodeClick':
                this.sharedState.selectedNode = data.node;
                this.sharedState.breadcrumb = data.breadcrumb || [];
                this._emitEvent('nodeSelected', data);
                break;
                
            case 'nodeHover':
                this._emitEvent('nodeHovered', data);
                break;
                
            case 'zoom':
                this.sharedState.zoom = data.level;
                this.sharedState.focus = data.focus;
                break;
                
            case 'filter':
                Object.assign(this.sharedState.filters, data);
                this._emitEvent('filterChanged', this.sharedState.filters);
                break;
        }
    }
    
    /**
     * Aplica filtros globais
     * @param {Object} filters - Objeto com filtros
     */
    applyFilters(filters) {
        Object.assign(this.sharedState.filters, filters);
        
        if (this.currentVisualizer && this.currentVisualizer.applyFilters) {
            this.currentVisualizer.applyFilters(this.sharedState.filters);
        }
        
        this._emitEvent('filterChanged', this.sharedState.filters);
    }
    
    /**
     * Foca em um nó específico
     * @param {string} nodeId - ID do nó
     */
    focusNode(nodeId) {
        if (this.currentVisualizer && this.currentVisualizer.focusNode) {
            this.currentVisualizer.focusNode(nodeId);
        }
    }
    
    /**
     * Reseta a visualização
     */
    reset() {
        if (this.currentVisualizer && this.currentVisualizer.reset) {
            this.currentVisualizer.reset();
        }
        
        // Resetar estado compartilhado
        this.sharedState = {
            selectedNode: null,
            filters: {
                search: '',
                minRelevance: 0,
                categories: [],
                types: []
            },
            breadcrumb: [],
            zoom: 1,
            focus: null
        };
        
        this._emitEvent('reset');
    }
    
    /**
     * Obtém o tipo de visualização atual
     * @returns {string}
     */
    getCurrentType() {
        return this.currentType;
    }
    
    /**
     * Obtém o estado compartilhado
     * @returns {Object}
     */
    getState() {
        return { ...this.sharedState };
    }
    
    /**
     * Exporta a visualização atual
     * @param {string} format - Formato de exportação (png, svg, json)
     * @returns {Promise}
     */
    async export(format = 'png') {
        if (!this.currentVisualizer || !this.currentVisualizer.export) {
            throw new Error('Visualizador atual não suporta exportação');
        }
        
        return await this.currentVisualizer.export(format);
    }
    
    /**
     * Sistema de eventos
     */
    _eventListeners = new Map();
    
    on(event, callback) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this._eventListeners.has(event)) return;
        
        const listeners = this._eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    _emitEvent(event, data) {
        if (!this._eventListeners.has(event)) return;
        
        this._eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erro no listener de ${event}:`, error);
            }
        });
    }
    
    /**
     * UI helpers
     * @private
     */
    _showLoading() {
        this.loadingElement.style.display = 'block';
        this.errorElement.style.display = 'none';
    }
    
    _hideLoading() {
        this.loadingElement.style.display = 'none';
    }
    
    _showError(message) {
        this.errorElement.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <div>${message}</div>
        `;
        this.errorElement.style.display = 'block';
    }
    
    /**
     * Limpa o gerenciador
     */
    cleanup() {
        this._clearVisualizerListeners();
        
        if (this.currentVisualizer && this.currentVisualizer.cleanup) {
            this.currentVisualizer.cleanup();
        }
        
        this.currentVisualizer = null;
        this.currentType = null;
        this.transformedData = null;
        this.sharedState = {
            selectedNode: null,
            filters: {
                search: '',
                minRelevance: 0,
                categories: [],
                types: []
            },
            breadcrumb: [],
            zoom: 1,
            focus: null
        };
        
        this.contentContainer.innerHTML = '';
    }
}

// Exportar como módulo ES6
export default VisualizationManagerV4;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.VisualizationManagerV4 = VisualizationManagerV4;
}