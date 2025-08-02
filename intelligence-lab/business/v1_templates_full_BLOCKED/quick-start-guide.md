# 🚀 Quick Start Guide - Intelligence Lab v1.0

**Guia Rápido para Criar Novas Visualizações**

---

## 1. Começando em 5 Minutos

### Passo 1: Copie o Template Base
```bash
# Crie seu novo arquivo
cp specs/skeleton-template.md minha-nova-view.html
```

### Passo 2: Estrutura Mínima
```html
<!-- minha-nova-view.html -->
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="specs/css-variables-v1.css">
</head>
<body>
    <div class="il-container">
        <main class="il-main" id="content"></main>
    </div>
    
    <script type="module">
        // Conectar ao lab
        import IntelligenceLab from './IntelligenceLab.js';
        const lab = new IntelligenceLab();
        
        // Inicializar
        await lab.initialize({
            qdrantUrl: 'http://qdr.vcia.com.br:6333',
            collection: 'knowledge_consolidator'
        });
        
        // Acessar dados
        const files = lab.data.files;
        const stats = lab.data.stats;
        
        // Renderizar
        document.getElementById('content').innerHTML = `
            <h1>Total: ${stats.totalFiles} arquivos</h1>
        `;
    </script>
</body>
</html>
```

---

## 2. Dados Disponíveis - Cheat Sheet

### Acessos Diretos
```javascript
// Principais
lab.data.files          // Array<File> - Todos os arquivos
lab.data.entities       // Array<Entity> - Todas entidades
lab.data.categories     // Array<Category> - Todas categorias
lab.data.stats         // Statistics - Estatísticas calculadas

// Helpers
lab.aggregator.getFilesByCategory('Breakthrough Técnico')
lab.aggregator.getFilesByEntity('Projeto X')
lab.ontology.entities.get('Nome da Entidade')
```

### Estruturas de Dados
```javascript
// File
{
    id, name, path,
    categories: Set<String>,
    entities: Set<String>,
    relevanceScore: 0-100,
    analysisType: String,
    createdAt: Date
}

// Entity  
{
    name, type, occurrences,
    influence: 0-1,
    files: Set<String>,
    categories: Set<String>,
    metrics: { degree, pagerank, betweenness }
}

// Category
{
    name, files: Set<String>,
    entities: Set<String>,
    count: Number,
    color: String
}
```

---

## 3. Componentes Prontos

### Métrica
```javascript
`<div class="metric-card">
    <div class="metric-value">${value}</div>
    <div class="metric-label">${label}</div>
</div>`
```

### Card
```javascript
`<div class="card">
    <h3>${title}</h3>
    <div>${content}</div>
</div>`
```

### Lista
```javascript
`<ul class="il-list">
    ${items.map(item => `
        <li>${item.name} - ${item.value}</li>
    `).join('')}
</ul>`
```

### Botão
```javascript
`<button class="btn btn-primary" onclick="action()">
    ${label}
</button>`
```

---

## 4. Filtros Rápidos

### Por Relevância
```javascript
const relevant = lab.data.files.filter(f => f.relevanceScore > 70);
```

### Por Categoria
```javascript
const breakthrough = lab.data.files.filter(f => 
    f.categories.has('Breakthrough Técnico')
);
```

### Por Data
```javascript
const recent = lab.data.files.filter(f => {
    const days = (Date.now() - new Date(f.createdAt)) / 86400000;
    return days < 30; // Últimos 30 dias
});
```

### Combinados
```javascript
const filtered = lab.data.files
    .filter(f => f.relevanceScore > 70)
    .filter(f => f.categories.has('Insight Estratégico'))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10); // Top 10
```

---

## 5. Visualizações Comuns

### Dashboard de Métricas
```javascript
function renderDashboard() {
    const stats = lab.data.stats;
    
    return `
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${stats.totalFiles}</div>
                <div class="metric-label">Arquivos</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.avgRelevance}%</div>
                <div class="metric-label">Relevância Média</div>
            </div>
        </div>
    `;
}
```

### Lista com Filtros
```javascript
function renderFilteredList(category) {
    const files = lab.aggregator.getFilesByCategory(category);
    
    return `
        <h2>${category} (${files.length})</h2>
        <ul class="il-list">
            ${files.map(f => `
                <li>
                    <strong>${f.name}</strong>
                    <span>${f.relevanceScore}%</span>
                </li>
            `).join('')}
        </ul>
    `;
}
```

### Gráfico de Distribuição
```javascript
function prepareChartData() {
    const dist = lab.data.stats.analysisDistribution;
    
    return {
        labels: Object.keys(dist),
        datasets: [{
            data: Object.values(dist),
            backgroundColor: [
                '#7c3aed',  // Breakthrough
                '#2563eb',  // Evolução
                '#dc2626',  // Momento
                '#059669',  // Insight
                '#d97706'   // Aprendizado
            ]
        }]
    };
}
```

---

## 6. Busca Semântica

### Busca Simples
```javascript
const results = await lab.connector.search({
    query: "machine learning",
    limit: 10
});
```

### Busca com Filtros
```javascript
const results = await lab.search({
    text: "inteligência artificial",
    filters: {
        categories: ["Breakthrough Técnico"],
        relevanceMin: 70,
        dateRange: {
            start: new Date('2024-01-01'),
            end: new Date()
        }
    }
});
```

---

## 7. Eventos e Updates

### Escutar Mudanças
```javascript
document.addEventListener('lab:data-updated', (e) => {
    // Recarregar visualização
    render();
});
```

### Emitir Eventos
```javascript
document.dispatchEvent(new CustomEvent('lab:filter-changed', {
    detail: { category: 'Insight Estratégico' }
}));
```

---

## 8. CSS Classes Essenciais

### Layout
```css
.il-container     /* Container principal */
.il-main         /* Área de conteúdo */
.metrics-grid    /* Grid de métricas */
.card           /* Card padrão */
```

### Estados
```css
.is-loading      /* Carregando */
.is-active       /* Ativo */
.has-error       /* Erro */
```

### Utilitárias
```css
.p-sm           /* Padding pequeno */
.m-md           /* Margin média */
.text-primary   /* Cor primária */
```

---

## 9. Performance Tips

### 1. Paginação
```javascript
const page = 1;
const pageSize = 50;
const start = (page - 1) * pageSize;
const items = lab.data.files.slice(start, start + pageSize);
```

### 2. Debounce
```javascript
let timeout;
function search(query) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}
```

### 3. Cache
```javascript
const cache = new Map();
function getCached(key, fn) {
    if (!cache.has(key)) {
        cache.set(key, fn());
    }
    return cache.get(key);
}
```

---

## 10. Exemplo Completo

```html
<!DOCTYPE html>
<html>
<head>
    <title>Meu Dashboard - Intelligence Lab</title>
    <link rel="stylesheet" href="specs/css-variables-v1.css">
    <style>
        .dashboard { 
            display: grid; 
            gap: 1rem; 
        }
    </style>
</head>
<body>
    <div class="il-container">
        <header class="il-header">
            <h1>Meu Dashboard</h1>
        </header>
        
        <main class="il-main">
            <div class="dashboard" id="dashboard">
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            </div>
        </main>
    </div>
    
    <script type="module">
        import IntelligenceLab from './IntelligenceLab.js';
        
        async function init() {
            // Conectar
            const lab = new IntelligenceLab();
            await lab.initialize({
                qdrantUrl: 'http://qdr.vcia.com.br:6333',
                collection: 'knowledge_consolidator'
            });
            
            // Renderizar
            const dashboard = document.getElementById('dashboard');
            dashboard.innerHTML = `
                <!-- Métricas -->
                <section>
                    <h2>Visão Geral</h2>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">
                                ${lab.data.stats.totalFiles}
                            </div>
                            <div class="metric-label">Arquivos</div>
                        </div>
                    </div>
                </section>
                
                <!-- Top Files -->
                <section>
                    <h2>Arquivos Mais Relevantes</h2>
                    <ul class="il-list">
                        ${lab.data.files
                            .sort((a,b) => b.relevanceScore - a.relevanceScore)
                            .slice(0, 5)
                            .map(f => `
                                <li>
                                    ${f.name} - ${f.relevanceScore}%
                                </li>
                            `).join('')}
                    </ul>
                </section>
            `;
        }
        
        // Iniciar
        init().catch(console.error);
    </script>
</body>
</html>
```

---

**🎯 Dicas Finais**

1. **Sempre teste com dados reais** - Use o ambiente conectado
2. **Comece simples** - Dashboard → Filtros → Visualizações complexas
3. **Reutilize componentes** - Copie dos templates
4. **Monitore performance** - Use paginação para listas grandes
5. **Documente customizações** - Facilita manutenção futura

---

**Para mais detalhes**:
- Schema completo: `/specs/data-schema.md`
- Padrões de acesso: `/specs/data-access-patterns.md`
- Templates: `/specs/skeleton-template.md`

**Última Atualização**: 29/07/2025