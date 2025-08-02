/**
 * FieldExplorer - Explorador de Campos do Qdrant
 * 
 * Primeira tela do sistema V4: mostra todos os campos disponíveis
 * como um "mapa de calor" permitindo seleção antes da visualização.
 */

class FieldExplorer {
    constructor() {
        this.fields = new Map();
        this.selectedFields = new Set();
        this.container = null;
        this.onSelectionChange = null;
        
        // Categorias de campos conhecidos
        this.fieldCategories = {
            metadata: ['id', 'name', 'path', 'size', 'created_at', 'modified_at'],
            analysis: ['analysisType', 'relevanceScore', 'confidence'],
            semantic: ['categories', 'entities', 'tags', 'topics'],
            content: ['preview', 'chunks', 'embeddings'],
            relationships: ['triples', 'connections', 'references'],
            temporal: ['timeline', 'dateRange', 'period'],
            metrics: ['chunkCount', 'entityCount', 'tripleCount']
        };
        
        // Tipos de relacionamento
        this.relationshipTypes = {
            '1:1': { color: '#4CAF50', description: 'Um para um' },
            '1:N': { color: '#2196F3', description: 'Um para muitos' },
            'N:1': { color: '#FF9800', description: 'Muitos para um' },
            'N:N': { color: '#F44336', description: 'Muitos para muitos' }
        };
    }
    
    /**
     * Analisa pontos do Qdrant para extrair campos e estatísticas
     * @param {Array} points - Pontos do Qdrant
     */
    async analyzeFields(points) {
        console.log(`Analisando ${points.length} pontos para descobrir campos...`);
        
        this.fields.clear();
        
        // Analisar cada ponto
        points.forEach(point => {
            this._analyzeObject(point.payload, '');
        });
        
        // Calcular estatísticas finais
        this._calculateStatistics(points);
        
        console.log(`${this.fields.size} campos únicos descobertos`);
        return this.fields;
    }
    
    /**
     * Analisa recursivamente um objeto
     * @private
     */
    _analyzeObject(obj, prefix) {
        if (!obj || typeof obj !== 'object') return;
        
        Object.entries(obj).forEach(([key, value]) => {
            const fieldPath = prefix ? `${prefix}.${key}` : key;
            
            if (!this.fields.has(fieldPath)) {
                this.fields.set(fieldPath, {
                    path: fieldPath,
                    name: key,
                    type: this._getValueType(value),
                    category: this._getFieldCategory(fieldPath),
                    values: new Set(),
                    count: 0,
                    nullCount: 0,
                    uniqueValues: 0,
                    cardinality: 'unknown',
                    dataType: typeof value,
                    isArray: Array.isArray(value),
                    isNested: typeof value === 'object' && !Array.isArray(value),
                    depth: fieldPath.split('.').length,
                    examples: []
                });
            }
            
            const field = this.fields.get(fieldPath);
            field.count++;
            
            if (value === null || value === undefined) {
                field.nullCount++;
            } else {
                // Coletar valores únicos (limitado para performance)
                if (field.values.size < 1000) {
                    if (Array.isArray(value)) {
                        value.forEach(v => {
                            if (typeof v !== 'object') {
                                field.values.add(v);
                            }
                        });
                    } else if (typeof value !== 'object') {
                        field.values.add(value);
                    }
                }
                
                // Coletar exemplos
                if (field.examples.length < 5) {
                    field.examples.push(this._sanitizeExample(value));
                }
            }
            
            // Recursão para objetos aninhados
            if (typeof value === 'object' && !Array.isArray(value)) {
                this._analyzeObject(value, fieldPath);
            }
        });
    }
    
    /**
     * Calcula estatísticas dos campos
     * @private
     */
    _calculateStatistics(points) {
        const totalPoints = points.length;
        
        this.fields.forEach((field, path) => {
            // Taxa de preenchimento
            field.fillRate = ((field.count - field.nullCount) / totalPoints) * 100;
            
            // Cardinalidade
            field.uniqueValues = field.values.size;
            const uniqueRatio = field.uniqueValues / field.count;
            
            if (uniqueRatio === 1) {
                field.cardinality = '1:1'; // Cada valor é único
            } else if (uniqueRatio > 0.8) {
                field.cardinality = '1:N'; // Alta cardinalidade
            } else if (uniqueRatio < 0.1) {
                field.cardinality = 'N:1'; // Baixa cardinalidade
            } else {
                field.cardinality = 'N:N'; // Cardinalidade média
            }
            
            // Score de relevância com peso de negócio
            field.relevanceScore = this._calculateBusinessRelevance(field);
            
            // Detectar relacionamentos
            field.relationships = this._detectRelationships(field, path);
        });
    }
    
    /**
     * Calcula score de relevância do campo
     * @private
     */
    _calculateBusinessRelevance(field) {
        let score = 0;
        
        // Peso por categoria de negócio
        const categoryWeights = {
            critical: 50,    // Campos críticos têm peso máximo
            semantic: 30,    // Conteúdo semântico é importante
            states: 20,      // Estados são úteis para filtros
            metrics: 15,     // Métricas são auxiliares
            structural: 5    // Estrutura tem menor peso
        };
        
        score += categoryWeights[field.category] || 10;
        
        // Taxa de preenchimento (até 30 pontos)
        score += (field.fillRate / 100) * 30;
        
        // Bonus para campos com boa distribuição de valores
        if (field.uniqueValues > 5 && field.uniqueValues < 100) {
            score += 10; // Boa segmentação
        }
        
        // Bonus para relacionamentos úteis
        if (field.cardinality === '1:N' || field.cardinality === 'N:N') {
            score += 10; // Potencial para análise cruzada
        }
        
        return Math.round(Math.min(100, score));
    }
    
    /**
     * Detecta relacionamentos entre campos
     * @private
     */
    _detectRelationships(field, path) {
        const relationships = [];
        
        // Detectar arrays que indicam relacionamentos 1:N
        if (field.isArray && field.category === 'semantic') {
            relationships.push({
                type: '1:N',
                target: 'items',
                description: `${field.name} contém múltiplos valores`
            });
        }
        
        // Detectar campos que referenciam outros
        if (path.includes('Id') || path.includes('_id')) {
            relationships.push({
                type: 'N:1',
                target: path.replace(/Id|_id/, ''),
                description: `Referência para ${path.replace(/Id|_id/, '')}`
            });
        }
        
        // Detectar campos de categoria cruzada
        if (field.name === 'categories' || field.name === 'tags') {
            relationships.push({
                type: 'N:N',
                target: 'documents',
                description: `Relacionamento muitos-para-muitos com documentos`
            });
        }
        
        return relationships;
    }
    
    /**
     * Renderiza o explorador de campos
     * @param {HTMLElement} container
     */
    render(container) {
        this.container = container;
        this.container.innerHTML = '';
        
        // Criar estrutura
        const explorer = document.createElement('div');
        explorer.className = 'field-explorer';
        explorer.innerHTML = `
            <div class="explorer-header">
                <h2>🔍 Explorador de Campos</h2>
                <div class="explorer-stats">
                    <span class="stat-item">
                        <strong>${this.fields.size}</strong> campos descobertos
                    </span>
                    <span class="stat-item">
                        <strong>${this.selectedFields.size}</strong> selecionados
                    </span>
                </div>
            </div>
            
            <div class="explorer-filters">
                <input type="text" 
                       placeholder="Buscar campos..." 
                       class="field-search">
                <select class="category-filter">
                    <option value="all">Todas as categorias</option>
                    ${Object.keys(this.fieldCategories).map(cat => 
                        `<option value="${cat}">${this._formatCategory(cat)}</option>`
                    ).join('')}
                </select>
                <select class="sort-by">
                    <option value="relevance">Relevância</option>
                    <option value="fillRate">Taxa de preenchimento</option>
                    <option value="cardinality">Cardinalidade</option>
                    <option value="name">Nome</option>
                </select>
            </div>
            
            <div class="field-grid">
                <!-- Campos serão renderizados aqui -->
            </div>
            
            <div class="selection-summary">
                <h3>📊 Resumo da Seleção</h3>
                <div class="summary-content">
                    <p>Selecione campos para ver recomendações de visualização</p>
                </div>
                <button class="btn-recommend" disabled>
                    Recomendar Visualizações
                </button>
            </div>
        `;
        
        this.container.appendChild(explorer);
        this._addStyles();
        this._setupEventListeners();
        this._renderFields();
    }
    
    /**
     * Renderiza os campos como heat map
     * @private
     */
    _renderFields(filter = '') {
        const grid = this.container.querySelector('.field-grid');
        grid.innerHTML = '';
        
        // Filtrar e ordenar campos
        let fieldsArray = Array.from(this.fields.entries());
        
        if (filter) {
            fieldsArray = fieldsArray.filter(([path, field]) => 
                path.toLowerCase().includes(filter.toLowerCase()) ||
                field.category.includes(filter)
            );
        }
        
        // Ordenar por relevância
        fieldsArray.sort((a, b) => b[1].relevanceScore - a[1].relevanceScore);
        
        // Renderizar cada campo
        fieldsArray.forEach(([path, field]) => {
            const fieldEl = this._createFieldElement(path, field);
            grid.appendChild(fieldEl);
        });
    }
    
    /**
     * Cria elemento visual para um campo
     * @private
     */
    _createFieldElement(path, field) {
        const div = document.createElement('div');
        div.className = 'field-item';
        div.dataset.path = path;
        
        // Cor baseada na relevância (heat map) - AJUSTADO PARA MELHOR CONTRASTE
        const hue = 240 - (field.relevanceScore * 1.2); // Azul para vermelho
        const saturation = 50 + (field.relevanceScore * 0.5); // Aumenta saturação com relevância
        const lightness = 25 + (field.relevanceScore * 0.15); // Mantém escuro para contraste
        div.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        if (this.selectedFields.has(path)) {
            div.classList.add('selected');
        }
        
        div.innerHTML = `
            <div class="field-header">
                <span class="field-name">${field.name}</span>
                <span class="field-type ${field.cardinality}">
                    ${this.relationshipTypes[field.cardinality].description}
                </span>
            </div>
            <div class="field-stats">
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${field.fillRate}%"></div>
                    <span class="stat-label">${field.fillRate.toFixed(1)}% preenchido</span>
                </div>
                <div class="field-meta">
                    <span class="meta-item">📊 ${field.uniqueValues} valores únicos</span>
                    <span class="meta-item">🏷️ ${this._formatCategory(field.category)}</span>
                </div>
            </div>
            <div class="field-examples">
                ${field.examples.slice(0, 3).map(ex => 
                    `<span class="example">${this._truncate(String(ex), 30)}</span>`
                ).join(' ')}
            </div>
            ${field.relationships.length > 0 ? `
                <div class="field-relationships">
                    ${field.relationships.map(rel => 
                        `<span class="relationship ${rel.type}">
                            ${rel.description}
                        </span>`
                    ).join('')}
                </div>
            ` : ''}
        `;
        
        // Click handler
        div.addEventListener('click', () => this._toggleFieldSelection(path));
        
        // Hover para mostrar detalhes
        div.addEventListener('mouseenter', (e) => this._showFieldDetails(e, field));
        div.addEventListener('mouseleave', () => this._hideFieldDetails());
        
        return div;
    }
    
    /**
     * Alterna seleção de campo
     * @private
     */
    _toggleFieldSelection(path) {
        if (this.selectedFields.has(path)) {
            this.selectedFields.delete(path);
        } else {
            this.selectedFields.add(path);
        }
        
        // Atualizar visual
        const fieldEl = this.container.querySelector(`[data-path="${path}"]`);
        fieldEl.classList.toggle('selected');
        
        // Atualizar resumo
        this._updateSelectionSummary();
        
        // Callback
        if (this.onSelectionChange) {
            this.onSelectionChange(this.getSelectedFields());
        }
    }
    
    /**
     * Atualiza resumo da seleção
     * @private
     */
    _updateSelectionSummary() {
        const summary = this.container.querySelector('.summary-content');
        const btnRecommend = this.container.querySelector('.btn-recommend');
        
        if (this.selectedFields.size === 0) {
            summary.innerHTML = '<p>Selecione campos para ver recomendações de visualização</p>';
            btnRecommend.disabled = true;
            return;
        }
        
        btnRecommend.disabled = false;
        
        // Analisar campos selecionados
        const selectedData = this.getSelectedFields();
        const analysis = this._analyzeSelection(selectedData);
        
        summary.innerHTML = `
            <div class="selection-analysis">
                <h4>Análise da Seleção:</h4>
                <ul>
                    <li><strong>Campos selecionados:</strong> ${selectedData.length}</li>
                    <li><strong>Tipos de relação:</strong> ${analysis.relationTypes.join(', ')}</li>
                    <li><strong>Categorias:</strong> ${analysis.categories.join(', ')}</li>
                    <li><strong>Complexidade:</strong> ${analysis.complexity}</li>
                </ul>
                
                <h4>Visualizações Recomendadas:</h4>
                <div class="viz-recommendations">
                    ${analysis.recommendations.map(rec => `
                        <div class="viz-rec ${rec.fit}">
                            <span class="viz-icon">${rec.icon}</span>
                            <span class="viz-name">${rec.name}</span>
                            <span class="viz-fit">${rec.reason}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Atualizar contador no header
        this.container.querySelector('.explorer-stats').innerHTML = `
            <span class="stat-item">
                <strong>${this.fields.size}</strong> campos descobertos
            </span>
            <span class="stat-item">
                <strong>${this.selectedFields.size}</strong> selecionados
            </span>
        `;
    }
    
    /**
     * Analisa seleção para recomendar visualizações
     * @private
     */
    _analyzeSelection(selectedFields) {
        const analysis = {
            relationTypes: new Set(),
            categories: new Set(),
            hasHierarchy: false,
            hasTimeSeries: false,
            hasNetwork: false,
            hasCategorical: false,
            complexity: 'baixa',
            recommendations: []
        };
        
        // Analisar campos
        selectedFields.forEach(field => {
            analysis.relationTypes.add(field.cardinality);
            analysis.categories.add(field.category);
            
            if (field.category === 'temporal') analysis.hasTimeSeries = true;
            if (field.category === 'relationships') analysis.hasNetwork = true;
            if (field.category === 'semantic') analysis.hasCategorical = true;
            if (field.depth > 2) analysis.hasHierarchy = true;
        });
        
        // Determinar complexidade
        if (analysis.relationTypes.has('N:N')) {
            analysis.complexity = 'alta';
        } else if (analysis.relationTypes.has('1:N')) {
            analysis.complexity = 'média';
        }
        
        // Recomendar visualizações
        if (analysis.hasHierarchy || analysis.categories.has('semantic')) {
            analysis.recommendations.push({
                name: 'Sankey Diagram',
                icon: '📊',
                fit: 'perfect',
                reason: 'Ideal para fluxos hierárquicos'
            });
        }
        
        if (analysis.hasCategorical) {
            analysis.recommendations.push({
                name: 'TreeMap',
                icon: '🔲',
                fit: 'good',
                reason: 'Ótimo para proporções categóricas'
            });
        }
        
        if (analysis.hasNetwork || analysis.relationTypes.has('N:N')) {
            analysis.recommendations.push({
                name: 'Force-Directed Graph',
                icon: '🔗',
                fit: 'perfect',
                reason: 'Perfeito para relações complexas'
            });
            
            analysis.recommendations.push({
                name: 'Chord Diagram',
                icon: '🎯',
                fit: 'good',
                reason: 'Visualiza relações N:N'
            });
        }
        
        if (analysis.hasTimeSeries) {
            analysis.recommendations.push({
                name: 'Timeline',
                icon: '📅',
                fit: 'perfect',
                reason: 'Mostra evolução temporal'
            });
        }
        
        // Converter Sets para Arrays
        analysis.relationTypes = Array.from(analysis.relationTypes);
        analysis.categories = Array.from(analysis.categories).map(cat => 
            this._formatCategory(cat)
        );
        
        return analysis;
    }
    
    /**
     * Retorna campos selecionados com dados completos
     */
    getSelectedFields() {
        return Array.from(this.selectedFields).map(path => 
            ({ path, ...this.fields.get(path) })
        );
    }
    
    /**
     * Configura event listeners
     * @private
     */
    _setupEventListeners() {
        // Busca
        const searchInput = this.container.querySelector('.field-search');
        searchInput.addEventListener('input', (e) => {
            this._renderFields(e.target.value);
        });
        
        // Filtro de categoria
        const categoryFilter = this.container.querySelector('.category-filter');
        categoryFilter.addEventListener('change', (e) => {
            if (e.target.value === 'all') {
                this._renderFields();
            } else {
                this._renderFields(e.target.value);
            }
        });
        
        // Ordenação
        const sortBy = this.container.querySelector('.sort-by');
        sortBy.addEventListener('change', (e) => {
            this._sortFields(e.target.value);
        });
        
        // Botão recomendar
        const btnRecommend = this.container.querySelector('.btn-recommend');
        btnRecommend.addEventListener('click', () => {
            this._emitRecommendation();
        });
    }
    
    /**
     * Emite evento de recomendação
     * @private
     */
    _emitRecommendation() {
        const selectedData = this.getSelectedFields();
        const analysis = this._analyzeSelection(selectedData);
        
        const event = new CustomEvent('recommendVisualization', {
            detail: {
                fields: selectedData,
                analysis: analysis
            }
        });
        
        this.container.dispatchEvent(event);
    }
    
    /**
     * Helpers
     * @private
     */
    _getValueType(value) {
        if (value === null || value === undefined) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }
    
    _getFieldCategory(path) {
        for (const [category, fields] of Object.entries(this.fieldCategories)) {
            if (fields.some(f => path.includes(f))) {
                return category;
            }
        }
        return 'other';
    }
    
    _formatCategory(cat) {
        const formatted = {
            metadata: 'Metadados',
            analysis: 'Análise',
            semantic: 'Semântico',
            content: 'Conteúdo',
            relationships: 'Relacionamentos',
            temporal: 'Temporal',
            metrics: 'Métricas',
            other: 'Outros'
        };
        return formatted[cat] || cat;
    }
    
    _sanitizeExample(value) {
        if (Array.isArray(value)) {
            return `[${value.length} items]`;
        }
        if (typeof value === 'object') {
            return '{...}';
        }
        return value;
    }
    
    _truncate(str, max) {
        if (str.length <= max) return str;
        return str.substr(0, max) + '...';
    }
    
    _sortFields(by) {
        // TODO: Implementar ordenação
        console.log('Ordenar por:', by);
    }
    
    _showFieldDetails(event, field) {
        // TODO: Implementar tooltip detalhado
    }
    
    _hideFieldDetails() {
        // TODO: Esconder tooltip
    }
    
    /**
     * Adiciona estilos CSS
     * @private
     */
    _addStyles() {
        if (document.getElementById('field-explorer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'field-explorer-styles';
        style.textContent = `
            .field-explorer {
                padding: 20px;
                background: #0a0a0a;
                color: #ffffff;
                height: 100%;
                overflow-y: auto;
            }
            
            .explorer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #2a2a3e;
            }
            
            .explorer-header h2 {
                margin: 0;
                color: #4fc3f7;
            }
            
            .explorer-stats {
                display: flex;
                gap: 20px;
            }
            
            .stat-item {
                color: #9ca3af;
            }
            
            .explorer-filters {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .field-search,
            .category-filter,
            .sort-by {
                padding: 8px 12px;
                background: #1a1a2e;
                border: 1px solid #2a2a3e;
                border-radius: 5px;
                color: #e0e0e0;
            }
            
            .field-search {
                flex: 1;
            }
            
            .field-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .field-item {
                padding: 15px;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            
            .field-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.8);
                border-color: rgba(255,255,255,0.4);
            }
            
            .field-item.selected {
                border-color: #4fc3f7;
                box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
            }
            
            .field-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .field-name {
                font-weight: 600;
                color: #ffffff;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            }
            
            .field-type {
                font-size: 0.8em;
                padding: 2px 8px;
                border-radius: 3px;
                background: rgba(0,0,0,0.8);
                font-weight: 600;
            }
            
            .field-type.1\\:1 { color: #81C784; background: rgba(76, 175, 80, 0.2); }
            .field-type.1\\:N { color: #64B5F6; background: rgba(33, 150, 243, 0.2); }
            .field-type.N\\:1 { color: #FFB74D; background: rgba(255, 152, 0, 0.2); }
            .field-type.N\\:N { color: #E57373; background: rgba(244, 67, 54, 0.2); }
            
            .field-stats {
                margin-bottom: 10px;
            }
            
            .stat-bar {
                position: relative;
                height: 20px;
                background: rgba(0,0,0,0.8);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 5px;
            }
            
            .stat-fill {
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                background: linear-gradient(90deg, #4fc3f7, #29b6f6);
                transition: width 0.3s;
            }
            
            .stat-label {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 0.8em;
                color: #fff;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }
            
            .field-meta {
                display: flex;
                gap: 15px;
                font-size: 0.85em;
                color: #ffffff;
                opacity: 0.9;
            }
            
            .field-examples {
                margin-top: 10px;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            /* Indicadores visuais por categoria */
            .field-item[data-category="critical"]::before {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 30px;
                height: 30px;
                background: #FFD700;
                opacity: 0.1;
                border-radius: 0 6px 0 100%;
            }
            
            .field-item[data-category="semantic"]::before {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 30px;
                height: 30px;
                background: #00CED1;
                opacity: 0.1;
                border-radius: 0 6px 0 100%;
            }
            
            /* Estados especiais para filtros */
            .field-item[data-category="states"] .field-examples {
                display: flex;
                gap: 10px;
            }
            
            .field-item[data-category="states"] .example {
                background: none;
                border: none;
                padding: 0;
            }
            
            .field-item[data-category="states"] .example:first-child {
                color: #2ECC71;
            }
            
            .field-item[data-category="states"] .example:last-child {
                color: #E74C3C;
            }
            
            .example {
                font-size: 0.8em;
                padding: 2px 6px;
                background: rgba(79, 195, 247, 0.3);
                border: 1px solid rgba(79, 195, 247, 0.5);
                border-radius: 3px;
                color: #ffffff;
            }
            
            .field-relationships {
                margin-top: 10px;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            .relationship {
                font-size: 0.75em;
                padding: 3px 8px;
                border-radius: 3px;
                background: rgba(0,0,0,0.3);
            }
            
            .selection-summary {
                background: #1a1a2e;
                padding: 20px;
                border-radius: 8px;
                margin-top: 30px;
            }
            
            .selection-summary h3 {
                margin-top: 0;
                color: #4fc3f7;
            }
            
            .selection-analysis ul {
                list-style: none;
                padding-left: 0;
            }
            
            .selection-analysis li {
                margin-bottom: 8px;
            }
            
            .viz-recommendations {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
                margin-top: 15px;
            }
            
            /* Destaque para campos críticos selecionados */
            .selection-analysis .critical-fields {
                background: rgba(255, 215, 0, 0.1);
                border: 1px solid #FFD700;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px;
            }
            
            .selection-analysis .critical-fields h5 {
                color: #FFD700;
                margin: 0 0 8px 0;
            }
            
            .viz-rec {
                padding: 12px;
                background: rgba(0,0,0,0.3);
                border-radius: 5px;
                border: 1px solid #2a2a3e;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .viz-rec.perfect {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.1);
            }
            
            .viz-rec.good {
                border-color: #2196F3;
                background: rgba(33, 150, 243, 0.1);
            }
            
            .viz-icon {
                font-size: 1.5em;
            }
            
            .viz-name {
                font-weight: 600;
            }
            
            .viz-fit {
                font-size: 0.85em;
                color: #9ca3af;
            }
            
            .btn-recommend {
                margin-top: 20px;
                padding: 10px 20px;
                background: #4fc3f7;
                color: #0a0a0a;
                border: none;
                border-radius: 5px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-recommend:hover:not(:disabled) {
                background: #29b6f6;
                transform: translateY(-1px);
            }
            
            .btn-recommend:disabled {
                background: #555;
                color: #999;
                cursor: not-allowed;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Limpa o explorador
     */
    cleanup() {
        this.fields.clear();
        this.selectedFields.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Exportar como módulo ES6
export default FieldExplorer;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.FieldExplorer = FieldExplorer;
}