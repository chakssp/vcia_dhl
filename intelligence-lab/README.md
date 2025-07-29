# Intelligence Lab - Manual de Acesso aos Insights

## 🧠 Visão Geral

O Intelligence Lab é um ambiente dedicado para exploração profunda da inteligência do sistema baseada na hierarquia fundamental:

```
entidades → categorias → arquivos
```

Este laboratório permite extrair insights avançados dos dados processados no Qdrant, revelando a estrutura oculta do conhecimento organizacional.

## 📊 Insights Computados Disponíveis

### 1. Core Intelligence - A Hierarquia Tripla

- **Entidades (O QUE)**: Conceitos-chave extraídos automaticamente
- **Categorias (COMO)**: Taxonomia organizacional, bridge entre conceitos e documentos
- **Arquivos (ONDE)**: Evidências concretas com rastreabilidade completa

### 2. Lentes Estratégicas - 4 Modos de Visualização

| Modo | Pergunta Estratégica | Valor |
|------|---------------------|-------|
| Standard | "O que temos?" | Auditoria inicial, gaps e redundâncias |
| Clusters | "Como se agrupa?" | Ilhas de conhecimento, silos organizacionais |
| Entity-Centric | "Quais são os pilares?" | Conceitos fundamentais, dependências críticas |
| Vertical-Clusters | "Qual a natureza?" | Tipos de insight, orientação P&D |

### 3. Análises Avançadas

- **Convergência Temporal**: Como entidades evoluem e convergem ao longo do tempo
- **Padrões Emergentes**: Detecção automática de padrões não óbvios
- **Inteligência Preditiva**: Antecipação de próximas convergências
- **Mapa de Influência**: Identificação de entidades mais influentes

### 4. Aplicações de Negócio

- **Due Diligence Automatizada**: Mapa completo do conhecimento organizacional
- **Innovation Tracking**: Identificação de onde surgem breakthroughs
- **Knowledge Gap Analysis**: O que falta para completar clusters
- **Succession Planning**: Mapeamento de quem detém conhecimento crítico
- **M&A Intelligence**: Análise de compatibilidade de bases de conhecimento

## 🔑 Como Acessar os Insights

### Inicialização do Sistema

```javascript
// 1. Carregar o Intelligence Lab
await KC.IntelligenceLab.initialize({
  qdrantUrl: 'http://qdr.vcia.com.br:6333',
  collection: 'knowledge_consolidator'
});

// 2. Verificar status
const status = KC.IntelligenceLab.getStatus();
console.log(`Conectado: ${status.connected}`);
console.log(`Total de pontos: ${status.totalPoints}`);
```

### Carregamento e Agregação de Dados

```javascript
// Carregar dados do Qdrant e agregar chunks por arquivo
const aggregatedData = await KC.IntelligenceLab.loadAndAggregate();

console.log(`Arquivos únicos: ${aggregatedData.files.length}`);
console.log(`Total de chunks: ${aggregatedData.totalChunks}`);
console.log(`Entidades extraídas: ${aggregatedData.entities.size}`);
```

### Construção da Ontologia

```javascript
// Construir hierarquia completa
const ontology = await KC.IntelligenceLab.buildOntology();

// Acessar componentes específicos
const entities = ontology.entities;      // Map de entidades únicas
const categories = ontology.categories;  // Array de categorias
const relationships = ontology.edges;    // Conexões entre elementos
```

### Execução de Análises

```javascript
// Análise de clusters
const clusters = await KC.IntelligenceLab.analyze('clusters', {
  algorithm: 'louvain',           // ou 'hierarchical', 'kmeans'
  resolution: 1.0,                // Granularidade dos clusters
  minClusterSize: 3              // Tamanho mínimo
});

// Mapa de influência
const influence = await KC.IntelligenceLab.analyze('influence', {
  metric: 'betweenness_centrality',  // ou 'degree', 'closeness', 'eigenvector'
  normalize: true,
  weightEdges: true
});

// Análise temporal
const temporal = await KC.IntelligenceLab.analyze('temporal', {
  window: '6months',              // Janela de análise
  convergenceThreshold: 0.7,      // Limiar de convergência
  detectTrends: true
});

// Detecção de padrões
const patterns = await KC.IntelligenceLab.analyze('patterns', {
  minSupport: 0.3,               // Suporte mínimo (30% dos dados)
  minConfidence: 0.8,            // Confiança mínima (80%)
  maxPatternLength: 5            // Tamanho máximo do padrão
});
```

### Aplicações de Negócio

```javascript
// Due Diligence completa
const dueDiligence = await KC.IntelligenceLab.business.runDueDiligence({
  depth: 'comprehensive',         // ou 'quick', 'standard'
  includeRisks: true,
  includeOpportunities: true
});

// Rastreamento de inovações
const innovations = await KC.IntelligenceLab.business.trackInnovations({
  period: 'last_year',
  thresholdScore: 0.8,
  categories: ['Breakthrough Técnico', 'Evolução Conceitual']
});

// Análise de gaps
const gaps = await KC.IntelligenceLab.business.analyzeGaps({
  targetCompleteness: 0.9,       // 90% de completude desejada
  prioritize: 'impact'           // ou 'effort', 'strategic'
});

// Mapeamento de sucessão
const succession = await KC.IntelligenceLab.business.mapSuccession({
  criticalityThreshold: 0.8,     // Conhecimento crítico
  includeBackups: true,
  riskAnalysis: true
});
```

### Visualização dos Insights

```javascript
// Visualização entity-centric com força gravitacional
KC.IntelligenceLab.visualize('entity-centric', {
  data: ontology,
  filters: {
    minInfluence: 0.5,           // Mostrar apenas entidades influentes
    categories: ['IA/ML', 'Estratégia']
  },
  visualization: {
    type: 'gravity-force',       // ou 'radial', 'hierarchical', 'temporal'
    animate: true,
    interactive: true
  }
});

// Mapa de calor temporal
KC.IntelligenceLab.visualize('heatmap', {
  data: temporal,
  dimension: 'activity',         // ou 'innovation', 'convergence'
  colorScale: 'viridis',
  showTimeline: true
});

// Fluxo de conhecimento animado
KC.IntelligenceLab.visualize('knowledge-flow', {
  data: relationships,
  animation: {
    duration: 5000,              // 5 segundos
    loop: true,
    showTrails: true
  }
});
```

## 📁 Estrutura de Dados

### Formato da Ontologia

```javascript
{
  entities: Map {
    'entity-id' => {
      id: 'entity-id',
      name: 'Nome da Entidade',
      type: 'concept|person|technology|decision',
      influence: 0.85,
      categories: Set(['cat1', 'cat2']),
      files: Set(['file1', 'file2']),
      firstSeen: '2024-01-01',
      lastUpdated: '2025-01-28',
      context: ['contexto relevante'],
      metrics: {
        centrality: 0.9,
        frequency: 45,
        growth: 0.15
      }
    }
  },
  categories: [
    {
      id: 'cat-id',
      name: 'Nome da Categoria',
      color: '#color',
      entityCount: 25,
      fileCount: 50,
      importance: 0.8
    }
  ],
  relationships: [
    {
      from: 'entity1',
      to: 'entity2',
      type: 'relates_to|depends_on|evolves_from',
      strength: 0.75,
      evidence: ['file1', 'file2']
    }
  ]
}
```

### Formato dos Clusters

```javascript
{
  clusters: [
    {
      id: 'cluster-1',
      name: 'Nome do Cluster',
      size: 15,
      density: 0.68,
      coherence: 0.82,
      members: {
        entities: ['e1', 'e2'],
        categories: ['c1', 'c2'],
        files: ['f1', 'f2']
      },
      characteristics: {
        dominantType: 'Breakthrough Técnico',
        avgRelevance: 85,
        timeSpan: '6 months'
      }
    }
  ],
  modularity: 0.75,
  silhouetteScore: 0.68
}
```

## 🚀 Casos de Uso Avançados

### 1. Identificar Conhecimento em Risco

```javascript
const atRisk = await KC.IntelligenceLab.analyzeRisk({
  factors: ['single_owner', 'no_documentation', 'critical_path'],
  threshold: 'high'
});
```

### 2. Descobrir Oportunidades de Inovação

```javascript
const opportunities = await KC.IntelligenceLab.findOpportunities({
  method: 'cross_cluster_analysis',
  minPotential: 0.7
});
```

### 3. Otimizar Fluxo de Conhecimento

```javascript
const optimization = await KC.IntelligenceLab.optimizeFlow({
  objective: 'minimize_bottlenecks',
  constraints: ['preserve_security', 'maintain_quality']
});
```

## 📊 Métricas e KPIs

O Intelligence Lab calcula automaticamente:

- **Knowledge Density**: Quantidade de conhecimento por área
- **Innovation Rate**: Taxa de surgimento de novos conceitos
- **Convergence Index**: Grau de convergência entre áreas
- **Knowledge Health**: Saúde geral da base de conhecimento
- **Risk Score**: Nível de risco do conhecimento crítico

## 🔧 Configuração Avançada

```javascript
KC.IntelligenceLab.configure({
  cache: {
    enabled: true,
    ttl: 3600000,  // 1 hora
    maxSize: '100MB'
  },
  processing: {
    batchSize: 100,
    parallel: true,
    workers: 4
  },
  algorithms: {
    clustering: 'louvain',
    embedding: 'use',
    similarity: 'cosine'
  }
});
```

## 📝 Notas Importantes

1. **Performance**: Para bases grandes (>10k documentos), use processamento em batch
2. **Cache**: Resultados computacionalmente intensivos são cacheados automaticamente
3. **Privacidade**: Todos os dados permanecem locais, sem envio externo
4. **Versionamento**: Insights são versionados para comparação temporal

---

Para mais informações ou suporte, consulte a documentação completa ou entre em contato com a equipe de desenvolvimento.