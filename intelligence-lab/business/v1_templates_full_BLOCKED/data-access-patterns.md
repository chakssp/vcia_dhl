# 🔌 Data Access Patterns - Intelligence Lab v1.0

**Tipo**: Guia de Acesso a Dados  
**Versão**: 1.0  
**Data**: 29/07/2025  
**Objetivo**: Documentar COMO acessar cada tipo de dado para criar novas interfaces

---

## 1. Quick Start - Acessando Dados

### 1.1 Inicialização Básica
```javascript
// Obter instância do lab
const lab = window.IntelligenceLab.lab;

// Verificar se está conectado
if (!lab.initialized) {
    await lab.initialize({
        qdrantUrl: 'http://qdr.vcia.com.br:6333',
        collection: 'knowledge_consolidator'
    });
}

// Acessar dados agregados
const data = lab.data;
```

### 1.2 Estrutura de Acesso
```javascript
// Dados principais
lab.data.files          // Array de arquivos
lab.data.entities       // Array de entidades  
lab.data.categories     // Array de categorias
lab.data.stats         // Estatísticas

// Componentes
lab.connector          // QdrantConnector
lab.aggregator         // DataAggregator
lab.ontology           // OntologyEngine
```

---

## 2. Padrões de Acesso por Tipo

### 2.1 Acessando Arquivos

#### Todos os arquivos
```javascript
const allFiles = lab.data.files;
```

#### Arquivo específico
```javascript
const file = lab.data.files.find(f => f.id === fileId);
```

#### Arquivos por categoria
```javascript
const categoryFiles = lab.aggregator.getFilesByCategory('Breakthrough Técnico');
```

#### Arquivos por entidade
```javascript
const entityFiles = lab.aggregator.getFilesByEntity('Projeto Alpha');
```

#### Filtrar arquivos
```javascript
// Por relevância
const relevantFiles = lab.data.files.filter(f => f.relevanceScore > 70);

// Por data
const recentFiles = lab.data.files.filter(f => {
    const date = new Date(f.createdAt);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return date > sixMonthsAgo;
});

// Por múltiplas categorias
const multiCategoryFiles = lab.data.files.filter(f => 
    f.categories.has('Insight Estratégico') && 
    f.categories.has('Evolução Conceitual')
);
```

### 2.2 Acessando Entidades

#### Todas as entidades
```javascript
const allEntities = lab.data.entities;
```

#### Entidade específica
```javascript
const entity = lab.ontology.entities.get(entityName);
```

#### Entidades influentes
```javascript
const influentialEntities = lab.data.entities
    .filter(e => e.influence > 0.7)
    .sort((a, b) => b.influence - a.influence);
```

#### Entidades por tipo
```javascript
const people = lab.data.entities.filter(e => e.type === 'person');
const organizations = lab.data.entities.filter(e => e.type === 'organization');
const concepts = lab.data.entities.filter(e => e.type === 'concept');
```

### 2.3 Acessando Categorias

#### Todas as categorias
```javascript
const allCategories = lab.data.categories;
```

#### Categoria específica com arquivos
```javascript
const category = lab.data.categories.find(c => c.name === 'Momento Decisivo');
const categoryFiles = lab.aggregator.getFilesByCategory(category.name);
```

#### Hierarquia de categorias
```javascript
// Categorias raiz
const rootCategories = lab.data.categories.filter(c => !c.parent);

// Subcategorias
const subCategories = lab.data.categories.filter(c => c.parent === parentId);
```

### 2.4 Acessando Estatísticas

#### Estatísticas gerais
```javascript
const stats = lab.data.stats;
console.log(`Total de arquivos: ${stats.totalFiles}`);
console.log(`Média de chunks: ${stats.avgChunksPerFile}`);
```

#### Distribuições
```javascript
// Por tipo de análise
const analysisTypes = stats.analysisDistribution;
Object.entries(analysisTypes).forEach(([type, count]) => {
    console.log(`${type}: ${count} arquivos`);
});

// Top entidades
stats.topEntities.forEach(entity => {
    console.log(`${entity.name}: ${entity.count} ocorrências`);
});
```

---

## 3. Buscas e Consultas

### 3.1 Busca Semântica
```javascript
// Busca por texto
const results = await lab.connector.search({
    query: "inteligência artificial aplicada",
    limit: 20
});

// Busca com filtros
const filteredResults = await lab.search({
    text: "machine learning",
    filters: {
        categories: ["Breakthrough Técnico"],
        relevanceMin: 70
    }
});
```

### 3.2 Busca por Similaridade
```javascript
// Encontrar arquivos similares
const similarFiles = await lab.findSimilar(fileId, {
    limit: 10,
    threshold: 0.8
});

// Encontrar entidades relacionadas  
const relatedEntities = lab.ontology.getRelatedEntities(entityName, {
    maxDistance: 2,
    minStrength: 0.5
});
```

---

## 4. Análises Avançadas

### 4.1 Análise de Clusters
```javascript
const clusters = await lab.analyze({
    type: 'clusters',
    options: {
        algorithm: 'kmeans',
        k: 5
    }
});

// Acessar membros de um cluster
const clusterMembers = clusters[0].members.map(id => 
    lab.data.files.find(f => f.id === id)
);
```

### 4.2 Análise Temporal
```javascript
const temporal = await lab.analyze({
    type: 'temporal',
    options: {
        granularity: 'month',
        startDate: '2024-01-01'
    }
});

// Timeline de eventos
temporal.timeline.forEach(point => {
    console.log(`${point.date}: ${point.events.length} eventos`);
});
```

### 4.3 Análise de Influência
```javascript
const influence = await lab.analyze({
    type: 'influence',
    options: {
        metric: 'pagerank',
        threshold: 0.1
    }
});

// Nós críticos
const criticalNodes = influence.critical;
```

---

## 5. Visualizações de Dados

### 5.1 Preparar para Grafo
```javascript
// Obter dados de visualização
const visData = lab.visualize('entity-centric', {
    filters: {
        minInfluence: 0.3,
        categories: ['Insight Estratégico']
    }
});

// Estrutura retornada
{
    nodes: [
        {
            id: "entity_123",
            label: "Projeto X",
            value: 0.85,        // Tamanho do nó
            color: "#5b8def",   // Cor
            group: "project"    // Grupo
        }
    ],
    edges: [
        {
            from: "entity_123",
            to: "entity_456",
            value: 0.7,         // Força da conexão
            label: "relates_to" // Tipo
        }
    ]
}
```

### 5.2 Preparar para Charts
```javascript
// Dados para gráfico de barras
const chartData = {
    labels: Object.keys(lab.data.stats.analysisDistribution),
    datasets: [{
        label: 'Distribuição por Tipo',
        data: Object.values(lab.data.stats.analysisDistribution),
        backgroundColor: [
            '#7c3aed',  // Breakthrough
            '#2563eb',  // Evolução
            '#dc2626',  // Momento
            '#059669',  // Insight
            '#d97706'   // Aprendizado
        ]
    }]
};

// Dados para linha do tempo
const timelineData = lab.data.files
    .map(f => ({
        x: new Date(f.createdAt),
        y: f.relevanceScore
    }))
    .sort((a, b) => a.x - b.x);
```

### 5.3 Preparar para Tabelas
```javascript
// Dados tabulares
const tableData = lab.data.files.map(file => ({
    nome: file.name,
    categorias: Array.from(file.categories).join(', '),
    relevancia: `${file.relevanceScore}%`,
    entidades: file.entities.size,
    data: new Date(file.createdAt).toLocaleDateString('pt-BR'),
    acoes: {
        view: () => viewFile(file.id),
        edit: () => editFile(file.id),
        export: () => exportFile(file.id)
    }
}));
```

---

## 6. Casos de Uso Práticos

### 6.1 Dashboard Executivo
```javascript
async function loadExecutiveDashboard() {
    // Métricas principais
    const metrics = {
        totalFiles: lab.data.stats.totalFiles,
        avgRelevance: lab.data.stats.avgRelevance,
        topInsights: lab.data.stats.topEntities.slice(0, 5),
        recentBreakthroughs: lab.data.files
            .filter(f => f.analysisType === 'Breakthrough Técnico')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3)
    };
    
    // Análise de tendências
    const trends = await lab.analyze({
        type: 'temporal',
        options: { period: 'last_6_months' }
    });
    
    return { metrics, trends };
}
```

### 6.2 Página de Detalhes
```javascript
async function loadFileDetails(fileId) {
    // Dados do arquivo
    const file = lab.data.files.find(f => f.id === fileId);
    
    // Conteúdo reconstruído
    const content = lab.aggregator.reconstructFileContent(fileId);
    
    // Entidades relacionadas
    const entities = Array.from(file.entities).map(name => 
        lab.data.entities.find(e => e.name === name)
    );
    
    // Arquivos similares
    const similar = await lab.findSimilar(fileId, { limit: 5 });
    
    return { file, content, entities, similar };
}
```

### 6.3 Modal de Busca
```javascript
async function searchModal(query) {
    // Busca multi-modal
    const results = await Promise.all([
        // Busca em arquivos
        lab.connector.search({ query, limit: 10 }),
        
        // Busca em entidades
        lab.data.entities.filter(e => 
            e.name.toLowerCase().includes(query.toLowerCase())
        ),
        
        // Busca em categorias
        lab.data.categories.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase())
        )
    ]);
    
    return {
        files: results[0],
        entities: results[1],
        categories: results[2]
    };
}
```

---

## 7. Otimização e Cache

### 7.1 Cache de Dados
```javascript
// Implementar cache local
const dataCache = {
    _cache: new Map(),
    
    get(key) {
        const cached = this._cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }
        return null;
    },
    
    set(key, data, ttl = 300000) { // 5 minutos
        this._cache.set(key, {
            data,
            expires: Date.now() + ttl
        });
    }
};

// Usar cache
async function getCachedAnalysis(type) {
    const cacheKey = `analysis_${type}`;
    let data = dataCache.get(cacheKey);
    
    if (!data) {
        data = await lab.analyze({ type });
        dataCache.set(cacheKey, data);
    }
    
    return data;
}
```

### 7.2 Lazy Loading
```javascript
// Carregar dados sob demanda
class LazyDataLoader {
    constructor(lab) {
        this.lab = lab;
        this.loaded = new Set();
    }
    
    async loadFileContent(fileId) {
        if (this.loaded.has(`content_${fileId}`)) {
            return;
        }
        
        const content = await this.lab.aggregator.reconstructFileContent(fileId);
        this.loaded.add(`content_${fileId}`);
        return content;
    }
    
    async loadEntityDetails(entityName) {
        if (this.loaded.has(`entity_${entityName}`)) {
            return;
        }
        
        const details = await this.lab.ontology.getEntityDetails(entityName);
        this.loaded.add(`entity_${entityName}`);
        return details;
    }
}
```

---

## 8. Helpers e Utilitários

### 8.1 Formatadores
```javascript
// Formatar relevância
function formatRelevance(score) {
    const percentage = Math.round(score);
    const level = 
        percentage >= 90 ? 'critical' :
        percentage >= 70 ? 'high' :
        percentage >= 50 ? 'medium' : 'low';
    
    return {
        text: `${percentage}%`,
        level,
        color: getRelevanceColor(level)
    };
}

// Formatar data
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) return 'Hoje';
    if (diff < 172800000) return 'Ontem';
    if (diff < 604800000) return `${Math.floor(diff/86400000)} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
}
```

### 8.2 Filtros Compostos
```javascript
// Criar filtros complexos
class DataFilter {
    constructor(data) {
        this.data = data;
        this.filters = [];
    }
    
    addFilter(fn) {
        this.filters.push(fn);
        return this;
    }
    
    relevance(min, max = 100) {
        return this.addFilter(item => 
            item.relevanceScore >= min && item.relevanceScore <= max
        );
    }
    
    categories(...cats) {
        return this.addFilter(item =>
            cats.some(cat => item.categories.has(cat))
        );
    }
    
    dateRange(start, end) {
        return this.addFilter(item => {
            const date = new Date(item.createdAt);
            return date >= start && date <= end;
        });
    }
    
    apply() {
        return this.data.filter(item =>
            this.filters.every(filter => filter(item))
        );
    }
}

// Usar
const filtered = new DataFilter(lab.data.files)
    .relevance(70)
    .categories('Breakthrough Técnico', 'Insight Estratégico')
    .dateRange(new Date('2024-01-01'), new Date())
    .apply();
```

---

## 9. Exemplos de Integração

### 9.1 Com Vue.js
```javascript
// Composable
export function useIntelligenceLab() {
    const lab = ref(null);
    const data = ref(null);
    const loading = ref(false);
    
    async function initialize() {
        loading.value = true;
        lab.value = window.IntelligenceLab.lab;
        await lab.value.initialize(config);
        data.value = lab.value.data;
        loading.value = false;
    }
    
    return {
        lab: readonly(lab),
        data: readonly(data),
        loading: readonly(loading),
        initialize
    };
}
```

### 9.2 Com React
```javascript
// Hook
export function useIntelligenceLab() {
    const [lab, setLab] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        async function init() {
            setLoading(true);
            const labInstance = window.IntelligenceLab.lab;
            await labInstance.initialize(config);
            setLab(labInstance);
            setData(labInstance.data);
            setLoading(false);
        }
        init();
    }, []);
    
    return { lab, data, loading };
}
```

### 9.3 Vanilla JS
```javascript
// Módulo
const IntelligenceLabModule = {
    lab: null,
    data: null,
    
    async init() {
        this.lab = window.IntelligenceLab.lab;
        await this.lab.initialize(config);
        this.data = this.lab.data;
        this.emit('ready');
    },
    
    on(event, handler) {
        document.addEventListener(`lab:${event}`, handler);
    },
    
    emit(event, data) {
        document.dispatchEvent(
            new CustomEvent(`lab:${event}`, { detail: data })
        );
    }
};
```

---

**Documento de Referência Rápida**  
**Para mais detalhes**: Ver `/specs/data-schema.md`  
**Última Atualização**: 29/07/2025