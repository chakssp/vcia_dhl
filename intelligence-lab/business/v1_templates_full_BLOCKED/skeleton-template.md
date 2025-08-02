# 🦴 Skeleton Template - Intelligence Lab v1.0

**Tipo**: Template Base para Novas Interfaces  
**Versão**: 1.0  
**Data**: 29/07/2025  
**Objetivo**: Fornecer estrutura esqueleto para criar qualquer tipo de visualização

---

## 1. Template HTML Base

### 1.1 Estrutura Mínima
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PAGE_TITLE}} - Intelligence Lab</title>
    
    <!-- CSS Base (obrigatório) -->
    <link rel="stylesheet" href="../specs/css-variables-v1.css">
    
    <!-- CSS Customizado (opcional) -->
    <style>
        /* Suas customizações aqui */
    </style>
</head>
<body>
    <!-- Container Principal -->
    <div class="il-container" data-view="{{VIEW_NAME}}">
        
        <!-- Header (opcional) -->
        <header class="il-header">
            <h1>{{VIEW_TITLE}}</h1>
            <div class="il-actions">
                <!-- Ações da página -->
            </div>
        </header>
        
        <!-- Conteúdo Principal -->
        <main class="il-main">
            <!-- Seu conteúdo aqui -->
        </main>
        
        <!-- Footer (opcional) -->
        <footer class="il-footer">
            <div class="il-status" id="status"></div>
        </footer>
        
    </div>
    
    <!-- Scripts -->
    <script type="module" src="../IntelligenceLab.js"></script>
    <script type="module" src="./{{VIEW_NAME}}.js"></script>
</body>
</html>
```

---

## 2. Template JavaScript Base

### 2.1 Módulo de Visualização
```javascript
// {{VIEW_NAME}}.js
import IntelligenceLab from '../IntelligenceLab.js';

class {{ViewClassName}} {
    constructor() {
        this.lab = null;
        this.data = null;
        this.config = {
            // Configurações da visualização
            pageSize: 50,
            refreshInterval: 300000, // 5 min
            filters: {}
        };
        this.state = {
            loading: false,
            error: null,
            currentPage: 1
        };
    }
    
    // Inicialização
    async init() {
        try {
            this.setState({ loading: true });
            
            // Conectar ao lab
            this.lab = new IntelligenceLab();
            await this.lab.initialize({
                qdrantUrl: 'http://qdr.vcia.com.br:6333',
                collection: 'knowledge_consolidator'
            });
            
            // Carregar dados
            await this.loadData();
            
            // Configurar interface
            this.setupUI();
            
            // Iniciar listeners
            this.attachListeners();
            
            this.setState({ loading: false });
            
        } catch (error) {
            this.setState({ error: error.message });
            console.error('Initialization error:', error);
        }
    }
    
    // Carregar dados necessários
    async loadData() {
        // Defina quais dados são necessários
        const requirements = {
            files: true,
            entities: true,
            categories: true,
            stats: true
        };
        
        // Carregue apenas o necessário
        this.data = await this.lab.getData(requirements);
        
        // Processar/filtrar dados
        this.processData();
    }
    
    // Processar dados para visualização
    processData() {
        // Implemente transformações necessárias
        this.processedData = {
            // Seus dados processados
        };
    }
    
    // Configurar interface
    setupUI() {
        // Elementos DOM
        this.elements = {
            container: document.querySelector('.il-main'),
            status: document.getElementById('status'),
            // Adicione seus elementos
        };
        
        // Renderizar inicial
        this.render();
    }
    
    // Renderizar visualização
    render() {
        const { container } = this.elements;
        
        // Limpar container
        container.innerHTML = '';
        
        // Renderizar conteúdo
        container.innerHTML = this.getTemplate();
        
        // Pós-processamento
        this.afterRender();
    }
    
    // Template HTML
    getTemplate() {
        return `
            <div class="{{view-name}}-content">
                <!-- Seu template aqui -->
            </div>
        `;
    }
    
    // Após renderizar
    afterRender() {
        // Inicializar componentes
        // Aplicar estilos dinâmicos
        // Configurar gráficos, etc
    }
    
    // Listeners de eventos
    attachListeners() {
        // Eventos globais
        document.addEventListener('lab:data-updated', () => {
            this.loadData();
        });
        
        // Eventos locais
        // this.elements.button.addEventListener('click', ...);
    }
    
    // Gerenciamento de estado
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUI();
    }
    
    // Atualizar UI baseado no estado
    updateUI() {
        if (this.state.loading) {
            this.showLoading();
        } else if (this.state.error) {
            this.showError(this.state.error);
        } else {
            this.render();
        }
    }
    
    // Helpers UI
    showLoading() {
        this.elements.container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando dados...</p>
            </div>
        `;
    }
    
    showError(message) {
        this.elements.container.innerHTML = `
            <div class="error">
                <p>❌ Erro: ${message}</p>
                <button onclick="location.reload()">Recarregar</button>
            </div>
        `;
    }
    
    // Destruir visualização
    destroy() {
        // Limpar listeners
        // Limpar timers
        // Limpar dados
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const view = new {{ViewClassName}}();
    view.init();
    
    // Expor globalmente se necessário
    window.{{viewName}} = view;
});

export default {{ViewClassName}};
```

---

## 3. Templates de Componentes

### 3.1 Card de Métrica
```javascript
function MetricCard({ label, value, icon, trend }) {
    return `
        <div class="metric-card">
            <div class="metric-icon">${icon}</div>
            <div class="metric-value">${value}</div>
            <div class="metric-label">${label}</div>
            ${trend ? `<div class="metric-trend ${trend.direction}">${trend.text}</div>` : ''}
        </div>
    `;
}
```

### 3.2 Lista de Items
```javascript
function ItemList({ items, onItemClick }) {
    return `
        <ul class="item-list">
            ${items.map(item => `
                <li class="item" data-id="${item.id}">
                    <span class="item-name">${item.name}</span>
                    <span class="item-meta">${item.meta}</span>
                    <button class="item-action" onclick="${onItemClick}('${item.id}')">
                        Ver
                    </button>
                </li>
            `).join('')}
        </ul>
    `;
}
```

### 3.3 Filtros
```javascript
function FilterPanel({ filters, onChange }) {
    return `
        <div class="filter-panel">
            ${filters.map(filter => `
                <div class="filter-group">
                    <label>${filter.label}</label>
                    ${renderFilterControl(filter)}
                </div>
            `).join('')}
        </div>
    `;
}

function renderFilterControl(filter) {
    switch (filter.type) {
        case 'select':
            return `
                <select name="${filter.name}" onchange="${onChange}">
                    ${filter.options.map(opt => 
                        `<option value="${opt.value}">${opt.label}</option>`
                    ).join('')}
                </select>
            `;
        case 'range':
            return `
                <input type="range" 
                       name="${filter.name}"
                       min="${filter.min}" 
                       max="${filter.max}"
                       value="${filter.value}"
                       onchange="${onChange}">
                <span>${filter.value}</span>
            `;
        // Adicione outros tipos
    }
}
```

---

## 4. Templates de Visualizações

### 4.1 Dashboard
```javascript
class DashboardView {
    getTemplate() {
        return `
            <div class="dashboard-grid">
                <!-- Métricas -->
                <section class="metrics-section">
                    <h2>Métricas Principais</h2>
                    <div class="metrics-grid">
                        ${this.renderMetrics()}
                    </div>
                </section>
                
                <!-- Gráficos -->
                <section class="charts-section">
                    <h2>Análises</h2>
                    <div class="charts-grid">
                        <div id="chart1" class="chart"></div>
                        <div id="chart2" class="chart"></div>
                    </div>
                </section>
                
                <!-- Lista -->
                <section class="list-section">
                    <h2>Itens Recentes</h2>
                    ${this.renderRecentItems()}
                </section>
            </div>
        `;
    }
}
```

### 4.2 Explorador
```javascript
class ExplorerView {
    getTemplate() {
        return `
            <div class="explorer-layout">
                <!-- Sidebar com filtros -->
                <aside class="explorer-sidebar">
                    ${this.renderFilters()}
                    ${this.renderCategories()}
                </aside>
                
                <!-- Área principal -->
                <main class="explorer-main">
                    <!-- Barra de busca -->
                    <div class="search-bar">
                        <input type="search" placeholder="Buscar...">
                        <button>🔍</button>
                    </div>
                    
                    <!-- Resultados -->
                    <div class="results">
                        ${this.renderResults()}
                    </div>
                    
                    <!-- Paginação -->
                    <div class="pagination">
                        ${this.renderPagination()}
                    </div>
                </main>
                
                <!-- Detalhe -->
                <aside class="explorer-detail">
                    ${this.renderDetail()}
                </aside>
            </div>
        `;
    }
}
```

### 4.3 Visualização de Grafo
```javascript
class GraphView {
    getTemplate() {
        return `
            <div class="graph-container">
                <!-- Controles -->
                <div class="graph-controls">
                    <button onclick="resetZoom()">Reset</button>
                    <button onclick="togglePhysics()">Physics</button>
                    <select onchange="changeLayout(this.value)">
                        <option>Hierárquico</option>
                        <option>Força</option>
                        <option>Circular</option>
                    </select>
                </div>
                
                <!-- Canvas do grafo -->
                <div id="graph-canvas"></div>
                
                <!-- Legenda -->
                <div class="graph-legend">
                    ${this.renderLegend()}
                </div>
            </div>
        `;
    }
    
    afterRender() {
        // Inicializar vis.js
        const container = document.getElementById('graph-canvas');
        const data = this.prepareGraphData();
        const options = this.getGraphOptions();
        
        this.network = new vis.Network(container, data, options);
    }
}
```

---

## 5. Templates de Modais

### 5.1 Modal Base
```javascript
class Modal {
    constructor(options) {
        this.options = {
            title: 'Modal',
            content: '',
            actions: [],
            ...options
        };
    }
    
    show() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.options.title}</h3>
                    <button class="close-btn" onclick="this.close()">×</button>
                </div>
                <div class="modal-body">
                    ${this.options.content}
                </div>
                <div class="modal-footer">
                    ${this.renderActions()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    renderActions() {
        return this.options.actions.map(action => `
            <button class="btn btn-${action.type}" 
                    onclick="${action.handler}">
                ${action.label}
            </button>
        `).join('');
    }
    
    close() {
        document.querySelector('.modal').remove();
    }
}
```

### 5.2 Modal de Detalhes
```javascript
function showDetailModal(itemId) {
    const item = lab.data.files.find(f => f.id === itemId);
    
    const modal = new Modal({
        title: item.name,
        content: `
            <div class="detail-grid">
                <div class="detail-section">
                    <h4>Informações</h4>
                    <dl>
                        <dt>Relevância</dt>
                        <dd>${item.relevanceScore}%</dd>
                        <dt>Categorias</dt>
                        <dd>${Array.from(item.categories).join(', ')}</dd>
                        <dt>Data</dt>
                        <dd>${formatDate(item.createdAt)}</dd>
                    </dl>
                </div>
                
                <div class="detail-section">
                    <h4>Entidades</h4>
                    <ul>
                        ${Array.from(item.entities).map(e => 
                            `<li>${e}</li>`
                        ).join('')}
                    </ul>
                </div>
                
                <div class="detail-section">
                    <h4>Preview</h4>
                    <p>${item.preview}</p>
                </div>
            </div>
        `,
        actions: [
            {
                label: 'Exportar',
                type: 'primary',
                handler: `exportItem('${itemId}')`
            },
            {
                label: 'Fechar',
                type: 'secondary',
                handler: 'this.close()'
            }
        ]
    });
    
    modal.show();
}
```

---

## 6. Helpers e Utilitários

### 6.1 Formatadores
```javascript
const Formatters = {
    // Números
    number: (n) => n.toLocaleString('pt-BR'),
    percent: (n) => `${Math.round(n)}%`,
    decimal: (n, places = 2) => n.toFixed(places),
    
    // Datas
    date: (d) => new Date(d).toLocaleDateString('pt-BR'),
    time: (d) => new Date(d).toLocaleTimeString('pt-BR'),
    relative: (d) => {
        const diff = Date.now() - new Date(d);
        if (diff < 60000) return 'agora';
        if (diff < 3600000) return `${Math.floor(diff/60000)}min atrás`;
        if (diff < 86400000) return `${Math.floor(diff/3600000)}h atrás`;
        return `${Math.floor(diff/86400000)}d atrás`;
    },
    
    // Textos
    truncate: (text, length = 100) => 
        text.length > length ? text.substr(0, length) + '...' : text,
    
    highlight: (text, query) =>
        text.replace(new RegExp(query, 'gi'), match => 
            `<mark>${match}</mark>`
        )
};
```

### 6.2 Builders
```javascript
const Builders = {
    // Construir URL com parâmetros
    buildUrl: (base, params) => {
        const url = new URL(base);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        return url.toString();
    },
    
    // Construir classes CSS
    buildClass: (...classes) => 
        classes.filter(Boolean).join(' '),
    
    // Construir atributos data-*
    buildDataAttrs: (data) =>
        Object.entries(data)
            .map(([key, value]) => `data-${key}="${value}"`)
            .join(' ')
};
```

### 6.3 Validators
```javascript
const Validators = {
    // Validar tipos
    isFile: (obj) => obj && obj.id && obj.name && obj.chunks,
    isEntity: (obj) => obj && obj.name && obj.type && obj.occurrences,
    isCategory: (obj) => obj && obj.name && obj.files,
    
    // Validar dados
    hasData: (obj) => obj && Object.keys(obj).length > 0,
    hasItems: (arr) => Array.isArray(arr) && arr.length > 0,
    
    // Validar estado
    isReady: (lab) => lab && lab.initialized && lab.data,
    hasError: (state) => state.error !== null
};
```

---

## 7. Padrões de Integração

### 7.1 Event Bus
```javascript
class EventBus {
    constructor() {
        this.events = {};
    }
    
    on(event, handler) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(handler);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(handler => handler(data));
        }
    }
    
    off(event, handler) {
        if (this.events[event]) {
            this.events[event] = this.events[event]
                .filter(h => h !== handler);
        }
    }
}

// Uso
const bus = new EventBus();
bus.on('data:loaded', (data) => console.log('Data:', data));
bus.emit('data:loaded', labData);
```

### 7.2 State Manager
```javascript
class StateManager {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = [];
    }
    
    get(key) {
        return key ? this.state[key] : this.state;
    }
    
    set(key, value) {
        const oldState = { ...this.state };
        this.state[key] = value;
        this.notify(key, value, oldState[key]);
    }
    
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    notify(key, newValue, oldValue) {
        this.listeners.forEach(listener => 
            listener({ key, newValue, oldValue })
        );
    }
}
```

---

## 8. CSS Classes Padrão

### 8.1 Layout
```css
.il-container { }      /* Container principal */
.il-header { }         /* Header */
.il-main { }          /* Conteúdo principal */
.il-footer { }        /* Footer */
.il-sidebar { }       /* Sidebar */
.il-content { }       /* Área de conteúdo */
```

### 8.2 Components
```css
.il-card { }          /* Card padrão */
.il-list { }          /* Lista */
.il-table { }         /* Tabela */
.il-form { }          /* Formulário */
.il-modal { }         /* Modal */
.il-tooltip { }       /* Tooltip */
```

### 8.3 States
```css
.is-loading { }       /* Carregando */
.is-active { }        /* Ativo */
.is-disabled { }      /* Desabilitado */
.is-hidden { }        /* Oculto */
.has-error { }        /* Com erro */
.has-success { }      /* Com sucesso */
```

---

## 9. Checklist de Implementação

### 9.1 Antes de Começar
- [ ] Definir tipo de visualização (dashboard, explorador, relatório, etc)
- [ ] Identificar dados necessários
- [ ] Escolher layout apropriado
- [ ] Planejar interações

### 9.2 Durante Desenvolvimento
- [ ] Usar template base como ponto de partida
- [ ] Seguir convenções de nomenclatura
- [ ] Implementar loading states
- [ ] Adicionar tratamento de erros
- [ ] Testar com dados reais

### 9.3 Antes de Finalizar
- [ ] Verificar responsividade
- [ ] Otimizar performance
- [ ] Documentar componentes customizados
- [ ] Adicionar comentários em lógica complexa
- [ ] Testar em diferentes navegadores

---

**Skeleton Template v1.0**  
**Para exemplos completos**: Ver `/intelligence-lab/index.html`  
**Última Atualização**: 29/07/2025