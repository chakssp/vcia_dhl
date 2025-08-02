# 📊 Data Schema Specification - Intelligence Lab v1.0

**Tipo**: Especificação de Dados  
**Versão**: 1.0  
**Data**: 29/07/2025  
**Objetivo**: Documentar TODOS os dados disponíveis para criação flexível de interfaces

---

## 1. Visão Geral do Esqueleto de Dados

### 1.1 Conceito
Este documento define o "esqueleto" de dados - uma estrutura modular e flexível que permite criar qualquer tipo de visualização (páginas, modais, dashboards) sem modificar o backend.

### 1.2 Princípios
- **Modularidade**: Cada tipo de dado é independente
- **Composabilidade**: Dados podem ser combinados livremente
- **Extensibilidade**: Novos campos podem ser adicionados sem quebrar
- **Acessibilidade**: Estrutura clara para fácil navegação

---

## 2. Estrutura de Dados Principal

### 2.1 Objeto Raiz - AggregatedData
```javascript
{
  files: Array<File>,           // Arquivos únicos agregados
  entities: Array<Entity>,      // Entidades extraídas
  categories: Array<Category>,  // Categorias disponíveis
  stats: Statistics,           // Estatísticas calculadas
  timestamp: ISO8601,          // Momento da agregação
  metadata: Object             // Metadados adicionais
}
```

### 2.2 Schema Detalhado

#### 2.2.1 File Object
```javascript
File = {
  // Identificação
  id: String,                  // ID único do arquivo
  name: String,                // Nome do arquivo
  path: String,                // Caminho completo
  
  // Conteúdo
  chunks: Array<Chunk>,        // Fragmentos do arquivo
  preview: String,             // Preview do conteúdo
  content: String,             // Conteúdo completo (reconstruído)
  
  // Classificação
  categories: Set<String>,     // Categorias associadas
  analysisType: String,        // Tipo de análise detectado
  entities: Set<String>,       // Entidades encontradas
  
  // Métricas
  relevanceScore: Number,      // 0-100 pontuação de relevância
  createdAt: Date,             // Data de criação
  lastModified: Date,          // Última modificação
  size: Number,                // Tamanho em bytes
  
  // Metadados
  metadata: {
    author: String,
    tags: Array<String>,
    language: String,
    encoding: String,
    customFields: Object
  }
}
```

#### 2.2.2 Entity Object
```javascript
Entity = {
  // Identificação
  name: String,                // Nome da entidade
  type: String,                // Tipo (person, org, concept, etc)
  id: String,                  // ID único
  
  // Relacionamentos
  files: Set<String>,          // IDs dos arquivos onde aparece
  categories: Set<String>,     // Categorias relacionadas
  relatedEntities: Array<{
    entityId: String,
    relationType: String,
    strength: Number
  }>,
  
  // Métricas
  occurrences: Number,         // Total de ocorrências
  influence: Number,           // 0-1 score de influência
  confidence: Number,          // 0-1 confiança na extração
  
  // Análise
  contexts: Array<String>,     // Contextos onde aparece
  sentiment: Number,           // -1 a 1 sentimento
  importance: String,          // low, medium, high, critical
  
  // Grafo
  metrics: {
    degree: Number,            // Conexões diretas
    pagerank: Number,          // PageRank score
    betweenness: Number,       // Centralidade
    clustering: Number         // Coeficiente de clustering
  }
}
```

#### 2.2.3 Category Object
```javascript
Category = {
  // Identificação
  name: String,                // Nome da categoria
  id: String,                  // ID único
  type: String,                // semantic, manual, auto
  
  // Conteúdo
  files: Set<String>,          // IDs dos arquivos
  entities: Set<String>,       // IDs das entidades
  
  // Hierarquia
  parent: String,              // Categoria pai (se houver)
  children: Array<String>,     // Categorias filhas
  level: Number,               // Nível na hierarquia
  
  // Métricas
  count: Number,               // Total de itens
  relevance: Number,           // Relevância média
  coverage: Number,            // % do corpus
  
  // Visual
  color: String,               // Cor hexadecimal
  icon: String,                // Emoji ou classe de ícone
  order: Number                // Ordem de exibição
}
```

#### 2.2.4 Chunk Object
```javascript
Chunk = {
  // Identificação
  id: String,                  // ID do chunk no Qdrant
  index: Number,               // Posição no arquivo
  fileId: String,              // ID do arquivo pai
  
  // Conteúdo
  content: String,             // Texto do chunk
  preview: String,             // Preview resumido
  tokens: Number,              // Contagem de tokens
  
  // Vetorização
  embedding: Array<Number>,    // Vetor 768D (se necessário)
  similarity: Number,          // Similaridade com query
  
  // Metadados
  startPos: Number,            // Posição inicial no arquivo
  endPos: Number,              // Posição final
  overlap: Number              // % de overlap com anterior
}
```

#### 2.2.5 Statistics Object
```javascript
Statistics = {
  // Totais
  totalFiles: Number,
  totalChunks: Number,
  totalEntities: Number,
  totalCategories: Number,
  totalSize: Number,           // Bytes
  
  // Médias
  avgChunksPerFile: Number,
  avgEntitiesPerFile: Number,
  avgRelevance: Number,
  avgFileSize: Number,
  
  // Distribuições
  analysisDistribution: {
    "Breakthrough Técnico": Number,
    "Evolução Conceitual": Number,
    "Momento Decisivo": Number,
    "Insight Estratégico": Number,
    "Aprendizado Geral": Number
  },
  
  categoryDistribution: {
    [categoryName]: Number     // Contagem por categoria
  },
  
  temporalDistribution: {
    [yearMonth]: Number        // Arquivos por período
  },
  
  // Rankings
  topEntities: Array<{
    name: String,
    count: Number,
    influence: Number
  }>,
  
  topCategories: Array<{
    name: String,
    count: Number,
    coverage: Number
  }>,
  
  topFiles: Array<{
    name: String,
    relevance: Number,
    entities: Number
  }>
}
```

---

## 3. Dados Derivados e Calculados

### 3.1 Análises Disponíveis
```javascript
Analyses = {
  // Clustering
  clusters: Array<{
    id: String,
    name: String,
    members: Array<String>,    // Entity/File IDs
    centroid: Object,
    coherence: Number
  }>,
  
  // Padrões Temporais
  temporal: {
    timeline: Array<{
      date: Date,
      events: Array<String>,
      entities: Array<String>,
      intensity: Number
    }>,
    trends: Array<{
      entity: String,
      direction: String,       // rising, falling, stable
      velocity: Number
    }>
  },
  
  // Influência
  influence: {
    network: Object,           // Grafo de influências
    propagation: Array,        // Caminhos de propagação
    critical: Array<String>    // Nós críticos
  },
  
  // Gaps
  gaps: Array<{
    type: String,              // knowledge, temporal, relational
    description: String,
    severity: String,
    recommendations: Array
  }>
}
```

### 3.2 Métricas de Negócio
```javascript
BusinessMetrics = {
  // Due Diligence
  dueDiligence: {
    risks: Array<Risk>,
    opportunities: Array<Opportunity>,
    redFlags: Array<Flag>,
    score: Number
  },
  
  // Innovation Tracking
  innovation: {
    breakthroughs: Array<Innovation>,
    trajectory: Array<Point>,
    velocity: Number,
    nextSteps: Array<Recommendation>
  },
  
  // Knowledge Gaps
  knowledgeGaps: {
    identified: Array<Gap>,
    critical: Array<Gap>,
    fillable: Array<Gap>,
    resources: Array<Resource>
  },
  
  // Succession Planning
  succession: {
    keyPeople: Array<Person>,
    knowledge: Array<Knowledge>,
    risks: Array<Risk>,
    plan: Array<Step>
  }
}
```

---

## 4. Estrutura de Consultas

### 4.1 Query Templates
```javascript
// Busca Simples
SimpleQuery = {
  text: String,
  limit: Number,
  offset: Number
}

// Busca Avançada
AdvancedQuery = {
  // Texto
  text: String,
  fuzzy: Boolean,
  synonyms: Boolean,
  
  // Filtros
  filters: {
    categories: Array<String>,
    entities: Array<String>,
    dateRange: {
      start: Date,
      end: Date
    },
    relevanceMin: Number,
    analysisTypes: Array<String>
  },
  
  // Agregações
  aggregations: {
    byCategory: Boolean,
    byEntity: Boolean,
    byDate: Boolean,
    byType: Boolean
  },
  
  // Opções
  includeChunks: Boolean,
  includeEmbeddings: Boolean,
  includeMetadata: Boolean
}
```

### 4.2 Response Templates
```javascript
QueryResponse = {
  // Resultados
  results: Array<{
    item: File|Entity,
    score: Number,
    highlights: Array<String>,
    explanation: String
  }>,
  
  // Metadados
  total: Number,
  took: Number,              // ms
  query: Object,
  
  // Agregações
  aggregations: {
    categories: Array<{name, count}>,
    entities: Array<{name, count}>,
    dates: Array<{date, count}>
  },
  
  // Sugestões
  suggestions: Array<String>,
  related: Array<String>
}
```

---

## 5. Estados e Transições

### 5.1 Estados de Dados
```javascript
DataStates = {
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
  UPDATING: "updating",
  STALE: "stale"
}

StateTransitions = {
  loading: ["ready", "error"],
  ready: ["updating", "stale"],
  error: ["loading"],
  updating: ["ready", "error"],
  stale: ["loading", "updating"]
}
```

### 5.2 Cache Strategy
```javascript
CacheConfig = {
  // Níveis
  memory: {
    maxSize: "100MB",
    ttl: 300,              // 5 minutos
    strategy: "LRU"
  },
  
  indexedDB: {
    maxSize: "500MB",
    ttl: 3600,             // 1 hora
    strategy: "LFU"
  },
  
  // Invalidação
  invalidation: {
    onUpdate: ["categories", "filters"],
    onExpire: ["embeddings", "aggregations"],
    onError: ["all"]
  }
}
```

---

## 6. Transformações de Dados

### 6.1 Para Visualizações
```javascript
// Para vis.js Network
toVisNetwork = (data) => ({
  nodes: entities.map(e => ({
    id: e.id,
    label: e.name,
    value: e.influence,
    group: e.type,
    title: buildTooltip(e)
  })),
  edges: relationships.map(r => ({
    from: r.source,
    to: r.target,
    value: r.strength,
    title: r.type
  }))
})

// Para Chart.js
toChartData = (stats) => ({
  labels: Object.keys(stats.distribution),
  datasets: [{
    data: Object.values(stats.distribution),
    backgroundColor: getCategoryColors()
  }]
})

// Para Timeline
toTimeline = (temporal) => ({
  groups: categories.map(c => ({id: c.id, content: c.name})),
  items: events.map(e => ({
    id: e.id,
    group: e.category,
    content: e.title,
    start: e.date,
    type: e.type
  }))
})
```

### 6.2 Para Exportação
```javascript
// JSON Estruturado
toJSON = (data) => JSON.stringify(data, null, 2)

// CSV Tabular
toCSV = (files) => {
  headers: ["Name", "Categories", "Relevance", "Entities", "Date"],
  rows: files.map(f => [
    f.name,
    Array.from(f.categories).join(";"),
    f.relevanceScore,
    f.entities.size,
    f.createdAt
  ])
}

// Markdown Report
toMarkdown = (data) => `
# Knowledge Base Report

## Summary
- Files: ${data.stats.totalFiles}
- Entities: ${data.stats.totalEntities}
- Categories: ${data.stats.totalCategories}

## Top Insights
${formatInsights(data)}
`
```

---

## 7. Casos de Uso e Templates

### 7.1 Dashboard Executivo
```javascript
ExecutiveDashboard = {
  requiredData: [
    "stats.totalFiles",
    "stats.avgRelevance",
    "stats.topEntities",
    "analyses.influence.critical"
  ],
  
  components: [
    "MetricCards",
    "InfluenceGraph",
    "TrendChart",
    "InsightsList"
  ],
  
  refreshRate: 300,        // 5 minutos
  permissions: ["view", "export"]
}
```

### 7.2 Modal de Detalhes
```javascript
DetailModal = {
  requiredData: [
    "file.*",
    "file.chunks[0..5]",
    "relatedEntities",
    "similarFiles"
  ],
  
  sections: [
    "Overview",
    "Content",
    "Relationships",
    "History"
  ],
  
  actions: [
    "edit",
    "categorize",
    "export",
    "share"
  ]
}
```

### 7.3 Página de Análise
```javascript
AnalysisPage = {
  requiredData: [
    "clusters",
    "temporal.timeline",
    "gaps",
    "recommendations"
  ],
  
  views: [
    "cluster-map",
    "timeline",
    "gap-matrix",
    "action-plan"
  ],
  
  filters: [
    "dateRange",
    "categories",
    "confidence"
  ]
}
```

---

## 8. Guia de Implementação

### 8.1 Criando Nova Visualização
```javascript
// 1. Definir dados necessários
const dataRequirements = {
  primary: ["files", "entities"],
  derived: ["clusters", "influence"],
  optional: ["embeddings"]
}

// 2. Criar fetcher
async function fetchViewData(requirements) {
  const data = {};
  for (const [type, fields] of Object.entries(requirements)) {
    data[type] = await lab.getData(fields);
  }
  return data;
}

// 3. Transformar para visualização
function prepareVisualization(data) {
  return {
    nodes: transformToNodes(data.entities),
    edges: transformToEdges(data.relationships),
    config: getVisualizationConfig(data.stats)
  };
}

// 4. Renderizar
function renderView(container, vizData) {
  const chart = new CustomVisualization(container);
  chart.setData(vizData);
  chart.render();
}
```

### 8.2 Adicionando Novo Tipo de Dado
```javascript
// 1. Definir schema
const NewDataType = {
  id: String,
  type: "custom",
  fields: {
    required: ["name", "value"],
    optional: ["description", "metadata"]
  }
}

// 2. Criar extractor
function extractNewData(source) {
  return {
    id: generateId(),
    name: source.name,
    value: calculate(source),
    metadata: enrichMetadata(source)
  };
}

// 3. Integrar no aggregator
aggregator.registerType("custom", {
  extractor: extractNewData,
  validator: validateCustom,
  indexer: indexCustom
});
```

---

## 9. Performance e Limites

### 9.1 Limites de Dados
```javascript
DataLimits = {
  // Por consulta
  maxResults: 1000,
  maxEmbeddings: 100,
  maxChunksPerFile: 100,
  
  // Por sessão
  maxMemoryCache: "100MB",
  maxLocalStorage: "50MB",
  maxIndexedDB: "500MB",
  
  // Por visualização
  maxNodes: 500,
  maxEdges: 2000,
  maxDataPoints: 10000
}
```

### 9.2 Estratégias de Otimização
```javascript
OptimizationStrategies = {
  // Paginação
  pagination: {
    pageSize: 50,
    strategy: "cursor",
    preload: 2              // páginas
  },
  
  // Virtualização
  virtualization: {
    enabled: true,
    rowHeight: 40,
    buffer: 10
  },
  
  // Progressive Loading
  progressive: {
    initial: ["id", "name", "relevance"],
    onDemand: ["content", "chunks"],
    lazy: ["embeddings", "metadata"]
  }
}
```

---

## 10. Versionamento de Dados

### 10.1 Schema Versions
```javascript
SchemaVersions = {
  "1.0": {
    released: "2025-07-29",
    changes: ["initial"],
    migration: null
  },
  
  "1.1": {
    released: "TBD",
    changes: ["add temporal analysis"],
    migration: "v1_0_to_v1_1.js"
  }
}
```

### 10.2 Backwards Compatibility
```javascript
// Adapter pattern para versões antigas
DataAdapter = {
  adapt(data, fromVersion, toVersion) {
    const migrations = getMigrationPath(fromVersion, toVersion);
    return migrations.reduce((d, m) => m(d), data);
  }
}
```

---

**Documento mantido por**: Intelligence Lab Team  
**Para dúvidas**: Consulte `/specs/elements.md` para UI  
**Próxima revisão**: Q3 2025