/**
 * FieldExplorerBusiness - Explorador de Campos Orientado a Negócios
 * 
 * Versão simplificada e objetiva focada em insights de negócio
 */

class FieldExplorerBusiness {
    constructor() {
        this.fields = new Map();
        this.selectedFields = new Set();
        this.container = null;
        this.onSelectionChange = null;
        
        // Sistema de categorização SIMPLES e OBJETIVO
        this.businessCategories = {
            // Campos CRÍTICOS para decisão
            critical: {
                fields: ['categories', 'analysisType', 'presentKeywords', 'sectionTitle'],
                color: '#FFD700',
                icon: '⭐',
                label: 'CRÍTICO'
            },
            // Conteúdo de valor
            content: {
                fields: ['keywords', 'title', 'sentiment', 'content', 'entities', 'tags', 'preview'],
                color: '#00CED1',
                icon: '📝',
                label: 'CONTEÚDO'
            },
            // Números e métricas
            metrics: {
                fields: ['count', 'score', 'rate', 'index', 'total', 'size'],
                color: '#9370DB',
                icon: '📊',
                label: 'MÉTRICAS'
            },
            // Estados e filtros
            filters: {
                fields: ['approved', 'analyzed', 'is', 'has', 'can'],
                color: '#32CD32',
                icon: '🔀',
                label: 'FILTROS'
            },
            // Sistema
            system: {
                fields: ['id', 'path', 'file', 'created', 'modified', 'updated'],
                color: '#708090',
                icon: '⚙️',
                label: 'SISTEMA'
            }
        };
        
        // Cores SIMPLES para cardinalidade
        this.relationColors = {
            '1:1': '#2ECC71',  // Verde
            '1:N': '#3498DB',  // Azul
            'N:1': '#9B59B6',  // Roxo
            'N:N': '#E67E22'   // Laranja
        };
    }
    
    /**
     * Analisa campos com foco em negócio
     */
    async analyzeFields(points) {
        console.log(`Analisando ${points.length} pontos...`);
        
        this.fields.clear();
        
        points.forEach(point => {
            this._analyzeObject(point.payload, '');
        });
        
        this._calculateBusinessMetrics(points);
        
        console.log(`${this.fields.size} campos encontrados`);
        return this.fields;
    }
    
    _analyzeObject(obj, prefix) {
        if (!obj || typeof obj !== 'object') return;
        
        Object.entries(obj).forEach(([key, value]) => {
            const fieldPath = prefix ? `${prefix}.${key}` : key;
            
            if (!this.fields.has(fieldPath)) {
                this.fields.set(fieldPath, {
                    path: fieldPath,
                    name: key,
                    category: this._getBusinessCategory(key),
                    values: new Set(),
                    count: 0,
                    nullCount: 0,
                    examples: [],
                    isBoolean: false,
                    isNumeric: false
                });
            }
            
            const field = this.fields.get(fieldPath);
            field.count++;
            
            if (value === null || value === undefined) {
                field.nullCount++;
            } else {
                // Detectar tipo
                if (typeof value === 'boolean') field.isBoolean = true;
                if (typeof value === 'number') field.isNumeric = true;
                
                // Coletar exemplos (máximo 3)
                if (field.examples.length < 3 && typeof value !== 'object') {
                    field.examples.push(value);
                }
                
                // Valores únicos (máximo 100)
                if (field.values.size < 100 && typeof value !== 'object') {
                    field.values.add(value);
                }
            }
            
            // Recursão apenas 1 nível
            if (typeof value === 'object' && !Array.isArray(value) && prefix.split('.').length < 2) {
                this._analyzeObject(value, fieldPath);
            }
        });
    }
    
    _getBusinessCategory(fieldName) {
        const name = fieldName.toLowerCase();
        
        // Detectar por nome exato primeiro
        for (const [cat, config] of Object.entries(this.businessCategories)) {
            if (config.fields.some(f => name.includes(f))) {
                return cat;
            }
        }
        
        // Padrões especiais
        if (name.startsWith('is') || name.startsWith('has') || name.startsWith('can')) {
            return 'filters';
        }
        if (name.match(/count|total|size|score|rate|index/)) {
            return 'metrics';
        }
        if (name.match(/id$|at$|date|time|path|file/)) {
            return 'system';
        }
        
        return 'content'; // Default
    }
    
    _calculateBusinessMetrics(points) {
        const total = points.length;
        
        this.fields.forEach((field, path) => {
            // Taxa de preenchimento
            field.fillRate = ((field.count - field.nullCount) / total) * 100;
            
            // Cardinalidade SIMPLES
            const uniqueRatio = field.values.size / field.count;
            if (field.isBoolean || field.values.size === 2) {
                field.cardinality = '1:1'; // Binário
            } else if (uniqueRatio > 0.8) {
                field.cardinality = '1:1'; // Quase único
            } else if (uniqueRatio < 0.1) {
                field.cardinality = 'N:1'; // Poucos valores
            } else if (field.values.size > 10) {
                field.cardinality = 'N:N'; // Muitos valores
            } else {
                field.cardinality = '1:N'; // Médio
            }
            
            // Score de importância para NEGÓCIO
            field.businessScore = this._calculateBusinessScore(field);
        });
    }
    
    _calculateBusinessScore(field) {
        let score = 0;
        
        // Categoria é o mais importante
        const catScores = {
            critical: 100,
            content: 80,
            filters: 60,
            metrics: 40,
            system: 20
        };
        
        score = catScores[field.category] || 50;
        
        // Penalizar campos vazios
        if (field.fillRate < 50) score *= 0.5;
        
        return Math.round(score);
    }
    
    /**
     * Renderiza interface LIMPA e OBJETIVA
     */
    render(container) {
        this.container = container;
        this.container.innerHTML = '';
        
        const explorer = document.createElement('div');
        explorer.className = 'field-explorer-business';
        explorer.innerHTML = `
            <div class="feb-header">
                <h2>📊 Campos Disponíveis</h2>
                <div class="feb-stats">
                    <span>${this.fields.size} campos</span>
                    <span class="selected-count">0 selecionados</span>
                </div>
            </div>
            
            <div class="feb-filters">
                <button class="cat-filter active" data-cat="all">Todos</button>
                ${Object.entries(this.businessCategories).map(([cat, config]) => 
                    `<button class="cat-filter" data-cat="${cat}" style="color: ${config.color}">
                        ${config.icon} ${config.label}
                    </button>`
                ).join('')}
            </div>
            
            <div class="feb-grid"></div>
            
            <div class="feb-actions">
                <button class="btn-analyze" disabled>
                    🎯 Analisar Campos Selecionados
                </button>
            </div>
        `;
        
        this.container.appendChild(explorer);
        this._addBusinessStyles();
        this._setupEvents();
        this._renderFields();
    }
    
    _renderFields(filterCat = 'all') {
        const grid = this.container.querySelector('.feb-grid');
        grid.innerHTML = '';
        
        // Agrupar por categoria
        const grouped = {};
        this.fields.forEach((field, path) => {
            if (filterCat !== 'all' && field.category !== filterCat) return;
            
            if (!grouped[field.category]) {
                grouped[field.category] = [];
            }
            grouped[field.category].push({ path, ...field });
        });
        
        // Renderizar por categoria
        Object.entries(grouped).forEach(([cat, fields]) => {
            const config = this.businessCategories[cat];
            
            const section = document.createElement('div');
            section.className = 'feb-section';
            section.innerHTML = `
                <div class="section-header" style="border-color: ${config.color}">
                    <span style="color: ${config.color}">${config.icon} ${config.label}</span>
                    <span class="count">${fields.length} campos</span>
                </div>
                <div class="section-fields">
                    ${fields.sort((a, b) => b.businessScore - a.businessScore)
                        .map(field => this._createFieldCard(field)).join('')}
                </div>
            `;
            
            grid.appendChild(section);
        });
        
        // Re-aplicar seleções
        this.selectedFields.forEach(path => {
            const el = grid.querySelector(`[data-path="${path}"]`);
            if (el) el.classList.add('selected');
        });
    }
    
    _createFieldCard(field) {
        const catConfig = this.businessCategories[field.category];
        const relColor = this.relationColors[field.cardinality];
        
        // Indicador visual simples
        let indicator = '';
        if (field.fillRate < 30) {
            indicator = '<span class="indicator low">⚠️ Poucos dados</span>';
        } else if (field.fillRate > 90 && field.category === 'critical') {
            indicator = '<span class="indicator high">✅ Completo</span>';
        }
        
        // Exemplos formatados com contexto de negócio
        let examples = this._formatFieldExamples(field);
        
        return `
            <div class="feb-field ${field.category}" 
                 data-path="${field.path}"
                 style="border-left: 4px solid ${catConfig.color}">
                
                <div class="field-header">
                    <span class="field-name">${field.name}</span>
                    <span class="field-rel" style="color: ${relColor}">${field.cardinality}</span>
                </div>
                
                <div class="field-fill">
                    <div class="fill-bar" style="width: ${field.fillRate}%; 
                         background: ${field.fillRate > 70 ? '#2ECC71' : 
                                      field.fillRate > 40 ? '#F39C12' : '#E74C3C'}">
                    </div>
                    <span class="fill-text">${Math.round(field.fillRate)}%</span>
                </div>
                
                ${indicator}
                ${examples}
            </div>
        `;
    }
    
    _setupEvents() {
        // Filtros de categoria
        this.container.querySelectorAll('.cat-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.container.querySelectorAll('.cat-filter').forEach(b => 
                    b.classList.remove('active')
                );
                btn.classList.add('active');
                this._renderFields(btn.dataset.cat);
            });
        });
        
        // Seleção de campos
        this.container.addEventListener('click', (e) => {
            const fieldEl = e.target.closest('.feb-field');
            if (!fieldEl) return;
            
            const path = fieldEl.dataset.path;
            
            if (this.selectedFields.has(path)) {
                this.selectedFields.delete(path);
                fieldEl.classList.remove('selected');
            } else {
                this.selectedFields.add(path);
                fieldEl.classList.add('selected');
            }
            
            this._updateSelection();
        });
        
        // Botão analisar
        const btnAnalyze = this.container.querySelector('.btn-analyze');
        btnAnalyze.addEventListener('click', () => {
            if (this.selectedFields.size > 0) {
                this._emitAnalysis();
            }
        });
    }
    
    _updateSelection() {
        const count = this.selectedFields.size;
        this.container.querySelector('.selected-count').textContent = `${count} selecionados`;
        
        const btnAnalyze = this.container.querySelector('.btn-analyze');
        btnAnalyze.disabled = count < 2;
        
        if (this.onSelectionChange) {
            this.onSelectionChange(this.getSelectedFields());
        }
    }
    
    getSelectedFields() {
        return Array.from(this.selectedFields).map(path => ({
            path,
            ...this.fields.get(path)
        }));
    }
    
    _emitAnalysis() {
        const event = new CustomEvent('analyzeFields', {
            detail: {
                fields: this.getSelectedFields(),
                summary: this._createSummary()
            }
        });
        this.container.dispatchEvent(event);
    }
    
    _createSummary() {
        const selected = this.getSelectedFields();
        const byCat = {};
        
        selected.forEach(f => {
            byCat[f.category] = (byCat[f.category] || 0) + 1;
        });
        
        return {
            total: selected.length,
            byCategory: byCat,
            hasCritical: byCat.critical > 0,
            hasFilters: byCat.filters > 0,
            recommendation: this._getRecommendation(byCat)
        };
    }
    
    _getRecommendation(byCat) {
        if (byCat.critical && byCat.content) {
            return 'Excelente para análise de categorização';
        }
        if (byCat.filters && byCat.metrics) {
            return 'Ideal para dashboards e métricas';
        }
        if (byCat.content >= 3) {
            return 'Bom para análise de conteúdo';
        }
        return 'Selecione mais campos para melhor análise';
    }
    
    _addBusinessStyles() {
        if (document.getElementById('feb-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'feb-styles';
        style.textContent = `
            .field-explorer-business {
                background: #000;
                color: #fff;
                padding: 10px;
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            .feb-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #333;
            }
            
            .feb-header h2 {
                margin: 0;
                font-size: 1.2em;
            }
            
            .feb-stats {
                font-size: 0.8em;
                color: #999;
            }
            
            .feb-stats span {
                margin-left: 10px;
            }
            
            .selected-count {
                color: #FFD700;
                font-weight: bold;
            }
            
            /* Filtros simples */
            .feb-filters {
                display: flex;
                gap: 6px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }
            
            .cat-filter {
                padding: 5px 10px;
                background: #111;
                border: 1px solid #333;
                color: #fff;
                border-radius: 15px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
                font-size: 0.8em;
            }
            
            .cat-filter:hover {
                background: #222;
                transform: translateY(-1px);
            }
            
            .cat-filter.active {
                background: #333;
                border-color: #666;
            }
            
            /* Grid de campos */
            .feb-grid {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 60px; /* Espaço para o botão fixo */
            }
            
            .feb-section {
                background: #0a0a0a;
                border-radius: 6px;
                overflow: hidden;
            }
            
            .section-header {
                padding: 8px 12px;
                background: #111;
                border-left: 3px solid;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
                font-size: 0.9em;
            }
            
            .section-fields {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 8px;
                padding: 10px;
            }
            
            /* Cards de campos */
            .feb-field {
                background: #111;
                border: 1px solid #222;
                border-radius: 4px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
                overflow: hidden;
            }
            
            .feb-field:hover {
                background: #1a1a1a;
                border-color: #444;
                transform: translateY(-2px);
            }
            
            .feb-field.selected {
                background: #1a1a1a;
                border-color: #FFD700;
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
            }
            
            .field-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .field-name {
                font-weight: 600;
                font-size: 0.9em;
            }
            
            .field-rel {
                font-size: 0.7em;
                font-weight: 600;
            }
            
            /* Barra de preenchimento */
            .field-fill {
                height: 4px;
                background: #222;
                border-radius: 2px;
                position: relative;
                margin-bottom: 6px;
                overflow: hidden;
            }
            
            .fill-bar {
                height: 100%;
                transition: width 0.3s;
                border-radius: 3px;
            }
            
            .fill-text {
                position: absolute;
                right: 3px;
                top: -14px;
                font-size: 0.65em;
                color: #999;
            }
            
            /* Indicadores */
            .indicator {
                font-size: 0.7em;
                margin-bottom: 2px;
                display: inline-block;
            }
            
            .indicator.low {
                color: #E74C3C;
            }
            
            .indicator.high {
                color: #2ECC71;
            }
            
            /* Exemplos contextualizados */
            .example {
                font-size: 0.7em;
                color: #aaa;
                background: #1a1a1a;
                padding: 2px 5px;
                border-radius: 3px;
                margin-right: 4px;
                display: inline-block;
                margin-top: 2px;
                border: 1px solid #222;
            }
            
            .example.file {
                color: #87CEEB;
                background: rgba(135, 206, 235, 0.1);
                border-color: rgba(135, 206, 235, 0.3);
            }
            
            .example.path {
                color: #DDA0DD;
                background: rgba(221, 160, 221, 0.1);
                border-color: rgba(221, 160, 221, 0.3);
                font-family: monospace;
                font-size: 0.65em;
            }
            
            .example.id {
                color: #FFB6C1;
                background: rgba(255, 182, 193, 0.1);
                border-color: rgba(255, 182, 193, 0.3);
                font-family: monospace;
            }
            
            .example.metric {
                color: #98FB98;
                background: rgba(152, 251, 152, 0.1);
                border-color: rgba(152, 251, 152, 0.3);
            }
            
            .example.date {
                color: #F0E68C;
                background: rgba(240, 230, 140, 0.1);
                border-color: rgba(240, 230, 140, 0.3);
            }
            
            .example.category {
                color: #FFD700;
                background: rgba(255, 215, 0, 0.1);
                border-color: rgba(255, 215, 0, 0.3);
            }
            
            .example.type {
                color: #FF6347;
                background: rgba(255, 99, 71, 0.1);
                border-color: rgba(255, 99, 71, 0.3);
            }
            
            .example.content {
                color: #B0C4DE;
                background: rgba(176, 196, 222, 0.1);
                border-color: rgba(176, 196, 222, 0.3);
                font-style: italic;
            }
            
            .bool-ratio {
                font-size: 0.7em;
                color: #aaa;
                display: inline-block;
                margin-top: 2px;
            }
            
            .bool-ratio {
                color: #2ECC71;
            }
            
            /* Ações */
            .feb-actions {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #000;
                text-align: center;
                padding: 10px;
                border-top: 1px solid #333;
                z-index: 100;
            }
            
            .btn-analyze {
                padding: 8px 24px;
                background: #FFD700;
                color: #000;
                border: none;
                border-radius: 5px;
                font-size: 0.9em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-analyze:hover:not(:disabled) {
                background: #FFC700;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
            }
            
            .btn-analyze:disabled {
                background: #333;
                color: #666;
                cursor: not-allowed;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    _formatFieldExamples(field) {
        const fieldName = field.name.toLowerCase();
        
        // Formatação especial por tipo de campo
        if (field.isBoolean) {
            const trueCount = Array.from(field.values).filter(v => v === true).length;
            const falseCount = field.values.size - trueCount;
            return `<span class="bool-ratio">✓ ${trueCount} | ✗ ${falseCount}</span>`;
        }
        
        // Campos específicos com formatação customizada
        if (fieldName.includes('filename') || fieldName.includes('name')) {
            const example = field.examples[0] || 'documento.pdf';
            const ext = example.split('.').pop();
            return `<span class="example file">📄 ${this._truncate(example, 25)} (.${ext})</span>`;
        }
        
        if (fieldName.includes('filepath') || fieldName.includes('path')) {
            const example = field.examples[0] || '/docs/...';
            const parts = example.split(/[\\\/]/);
            const short = parts.length > 3 ? 
                `.../${parts.slice(-2).join('/')}` : 
                example;
            return `<span class="example path">📁 ${short}</span>`;
        }
        
        if (fieldName.includes('id')) {
            const prefix = field.isNumeric ? '#' : 'ID-';
            const example = field.examples[0] || 'auto';
            return `<span class="example id">${prefix}${this._truncate(String(example), 12)}</span>`;
        }
        
        if (fieldName.includes('score') || fieldName.includes('rate')) {
            const values = Array.from(field.values).filter(v => typeof v === 'number');
            if (values.length > 0) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                return `<span class="example metric">📊 ${min.toFixed(0)}-${max.toFixed(0)} (avg: ${avg.toFixed(1)})</span>`;
            }
        }
        
        if (fieldName.includes('date') || fieldName.includes('created') || fieldName.includes('modified')) {
            const example = field.examples[0];
            if (example) {
                const date = new Date(example);
                if (!isNaN(date)) {
                    return `<span class="example date">📅 ${date.toLocaleDateString('pt-BR')}</span>`;
                }
            }
        }
        
        if (fieldName.includes('category') || fieldName.includes('categories')) {
            const cats = Array.from(field.values).slice(0, 3);
            return `<span class="example category">🏷️ ${cats.map(c => this._truncate(String(c), 15)).join(', ')}${field.values.size > 3 ? '...' : ''}</span>`;
        }
        
        if (fieldName.includes('type') || fieldName === 'analysisType') {
            const types = Array.from(field.values).slice(0, 2);
            return `<span class="example type">🎯 ${types.join(' | ')}</span>`;
        }
        
        if (fieldName.includes('index')) {
            const values = Array.from(field.values).filter(v => typeof v === 'number');
            if (values.length > 0) {
                const max = Math.max(...values);
                return `<span class="example index">📍 1-${max}</span>`;
            }
        }
        
        if (fieldName.includes('count') || fieldName.includes('total')) {
            const values = Array.from(field.values).filter(v => typeof v === 'number');
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                return `<span class="example count">∑ ${sum.toLocaleString('pt-BR')}</span>`;
            }
        }
        
        if (fieldName.includes('size')) {
            const values = Array.from(field.values).filter(v => typeof v === 'number');
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                return `<span class="example size">💾 ${this._formatBytes(avg)}</span>`;
            }
        }
        
        if (fieldName.includes('keywords') || fieldName.includes('tags')) {
            const examples = field.examples.slice(0, 2);
            if (examples.length > 0) {
                if (Array.isArray(examples[0])) {
                    const tags = examples[0].slice(0, 3);
                    return `<span class="example tags">🔖 ${tags.join(', ')}...</span>`;
                }
            }
        }
        
        // Campos de conteúdo
        if (field.category === 'content' && field.examples.length > 0) {
            const text = String(field.examples[0]);
            const preview = text.split(' ').slice(0, 5).join(' ');
            return `<span class="example content">"${preview}..."</span>`;
        }
        
        // Default: mostrar valores únicos se poucos
        if (field.values.size <= 5) {
            const vals = Array.from(field.values).slice(0, 3);
            return `<span class="example values">${vals.map(v => this._truncate(String(v), 15)).join(' | ')}</span>`;
        }
        
        // Fallback genérico
        if (field.examples.length > 0) {
            return field.examples.slice(0, 2).map(ex => 
                `<span class="example">${this._truncate(String(ex), 20)}</span>`
            ).join(' ');
        }
        
        return '';
    }
    
    _truncate(str, len) {
        return str.length > len ? str.substring(0, len) + '...' : str;
    }
    
    _formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
    
    cleanup() {
        this.fields.clear();
        this.selectedFields.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

export default FieldExplorerBusiness;

if (typeof window !== 'undefined') {
    window.FieldExplorerBusiness = FieldExplorerBusiness;
}