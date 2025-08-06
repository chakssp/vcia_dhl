# 📦 JavaScript SDK

## Overview

O JavaScript SDK fornece uma interface tipada e otimizada para integração com o Knowledge Consolidator API, especialmente útil para aplicações frontend, Node.js e automações JavaScript.

## Instalação

### NPM
```bash
npm install @knowledge-consolidator/js-sdk
```

### Yarn
```bash
yarn add @knowledge-consolidator/js-sdk
```

### CDN (Browser)
```html
<script src="https://unpkg.com/@knowledge-consolidator/js-sdk@latest/dist/kc-sdk.min.js"></script>
```

## Configuração Inicial

### Node.js / Modern Frontend
```javascript
import { KnowledgeConsolidatorAPI } from '@knowledge-consolidator/js-sdk'

const api = new KnowledgeConsolidatorAPI({
  baseURL: 'http://localhost:3000/api',
  token: 'your-bearer-token',
  timeout: 30000,
  retries: 3
})
```

### CommonJS (Node.js Legacy)
```javascript
const { KnowledgeConsolidatorAPI } = require('@knowledge-consolidator/js-sdk')

const api = new KnowledgeConsolidatorAPI({
  baseURL: process.env.KC_API_URL || 'http://localhost:3000/api',
  token: process.env.KC_API_TOKEN
})
```

### Browser (UMD)
```html
<script>
const api = new window.KnowledgeConsolidatorAPI.KnowledgeConsolidatorAPI({
  baseURL: 'http://localhost:3000/api',
  token: 'your-bearer-token'
})
</script>
```

## Configuração Avançada

### Interceptors
```javascript
// Request interceptor
api.interceptors.request.use((config) => {
  config.headers['X-App-Version'] = '1.0.0'
  console.log('Making request:', config.method.toUpperCase(), config.url)
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status)
    return response
  },
  (error) => {
    console.error('Request failed:', error.message)
    throw error
  }
)
```

### Error Handling
```javascript
api.configure({
  errorHandler: (error) => {
    if (error.code === 'ERR_001') {
      console.warn('Invalid file ID, retrying...')
      return true // Retry
    }
    return false // Don't retry
  },
  retryCondition: (error) => {
    return error.status >= 500 || error.code === 'NETWORK_ERROR'
  }
})
```

## Files API

### Listar Arquivos
```javascript
// Listar todos os arquivos
const files = await api.files.list()

// Com filtros
const filteredFiles = await api.files.list({
  category: 'IA/ML',
  analyzed: true,
  relevance_min: 0.8,
  limit: 50,
  offset: 0
})

// Com paginação automática
const allFiles = await api.files.listAll({
  category: 'IA/ML',
  pageSize: 100
})
```

### Obter Arquivo Específico
```javascript
// Obter detalhes completos
const file = await api.files.get('file_001')

// Obter apenas metadados
const metadata = await api.files.getMetadata('file_001')

// Obter conteúdo
const content = await api.files.getContent('file_001')
```

### Análise de Arquivos
```javascript
// Analisar arquivos específicos
const analysisJob = await api.files.analyze({
  file_ids: ['file_001', 'file_002'],
  template: 'decisiveMoments',
  provider: 'ollama',
  batch_size: 5
})

// Monitorar progresso
const status = await api.analysis.getJobStatus(analysisJob.job_id)

// Aguardar conclusão
const results = await api.analysis.waitForCompletion(analysisJob.job_id, {
  timeout: 300000, // 5 minutos
  interval: 5000   // Check a cada 5s
})
```

### Upload de Arquivos (Futuro)
```javascript
// Upload de novos arquivos
const uploadResult = await api.files.upload({
  file: fileObject,
  category: 'IA/ML',
  auto_analyze: true
})
```

## Categories API

### Gerenciar Categorias
```javascript
// Listar categorias
const categories = await api.categories.list()

// Criar categoria
const newCategory = await api.categories.create({
  name: 'Blockchain',
  color: '#F59E0B',
  parent_id: 'tecnologia',
  description: 'Tecnologias blockchain e criptomoedas'
})

// Atualizar categoria
const updatedCategory = await api.categories.update('blockchain', {
  color: '#EF4444',
  description: 'Blockchain, DeFi e Web3'
})

// Deletar categoria
await api.categories.delete('blockchain')
```

### Hierarquia de Categorias
```javascript
// Obter árvore completa
const categoryTree = await api.categories.getTree()

// Obter filhos de uma categoria
const children = await api.categories.getChildren('tecnologia')

// Mover categoria
await api.categories.move('blockchain', 'fintech')
```

## Search API

### Busca Semântica
```javascript
// Busca básica
const results = await api.search.semantic({
  query: 'automação inteligente com machine learning',
  limit: 20
})

// Busca avançada com filtros
const advancedResults = await api.search.semantic({
  query: 'implementação de IA',
  filters: {
    categories: ['IA/ML', 'Automação'],
    confidence_min: 0.7,
    date_range: {
      start: '2024-01-01',
      end: '2025-08-02'
    }
  },
  options: {
    limit: 50,
    include_content: true,
    similarity_threshold: 0.75,
    highlight: true
  }
})

// Busca com expansão de query
const expandedResults = await api.search.semantic({
  query: 'IA',
  expand_query: true,
  expansion_terms: ['machine learning', 'automação', 'algoritmos']
})
```

### Busca Híbrida
```javascript
const hybridResults = await api.search.hybrid({
  query: 'estratégia de automação',
  methods: {
    dense: {
      enabled: true,
      weight: 0.7,
      model: 'nomic-embed-text'
    },
    sparse: {
      enabled: true,
      weight: 0.3,
      method: 'tfidf'
    }
  },
  rerank: {
    enabled: true,
    top_k: 50,
    model: 'cross_encoder'
  }
})
```

### Busca por Similaridade
```javascript
// Encontrar arquivos similares
const similarFiles = await api.search.findSimilar('file_001', {
  limit: 10,
  similarity_threshold: 0.8,
  exclude_categories: ['Rascunhos']
})

// Busca por embedding customizado
const customResults = await api.search.byEmbedding({
  embedding: [0.1, -0.3, 0.8, ...], // Vector 768D
  limit: 20,
  filters: { category: 'IA/ML' }
})
```

## Analysis API

### Templates de Análise
```javascript
// Listar templates disponíveis
const templates = await api.analysis.listTemplates()

// Criar template personalizado
const customTemplate = await api.analysis.createTemplate({
  name: 'Análise de Oportunidades',
  description: 'Identifica oportunidades de negócio',
  prompt: 'Analise o conteúdo buscando: 1. Oportunidades...',
  output_format: 'structured',
  categories: ['Oportunidades', 'ROI']
})

// Usar template customizado
const analysisJob = await api.files.analyze({
  file_ids: ['file_001'],
  template: customTemplate.id
})
```

### Monitoramento de Jobs
```javascript
// Listar jobs ativos
const activeJobs = await api.analysis.listJobs({ status: 'processing' })

// Monitorar job com callback
await api.analysis.monitorJob('analysis_job_123', {
  onProgress: (progress) => {
    console.log(`Progresso: ${progress.percentage}%`)
  },
  onComplete: (results) => {
    console.log('Análise concluída:', results)
  },
  onError: (error) => {
    console.error('Erro na análise:', error)
  }
})

// Cancelar job
await api.analysis.cancelJob('analysis_job_123')
```

## Export API

### Exportação RAG
```javascript
// Exportar para formato RAG
const exportJob = await api.export.createRAGExport({
  format: 'qdrant_json',
  filters: {
    categories: ['IA/ML', 'Estratégia'],
    analyzed_only: true,
    confidence_min: 0.8
  },
  options: {
    include_embeddings: true,
    include_content: true,
    chunk_size: 1000,
    compression: 'gzip'
  }
})

// Aguardar conclusão e baixar
const downloadUrl = await api.export.waitAndDownload(exportJob.export_id)

// Download direto (Node.js)
const buffer = await api.export.downloadBuffer(exportJob.export_id)
```

### Exportação Personalizada
```javascript
// Exportar categorias específicas
const categoryExport = await api.export.byCategory('IA/ML', {
  format: 'markdown',
  include_metadata: true
})

// Exportar resultados de busca
const searchExport = await api.export.searchResults({
  query: 'automação',
  format: 'csv',
  fields: ['name', 'category', 'confidence', 'insights']
})
```

## Metrics API

### Métricas do Sistema
```javascript
// Métricas gerais
const systemMetrics = await api.metrics.getSystem()

// Métricas de confiança
const confidenceMetrics = await api.metrics.getConfidence()

// Métricas de performance
const performanceMetrics = await api.metrics.getPerformance()

// Dashboard completo
const dashboard = await api.metrics.getDashboard()
```

### Monitoramento em Tempo Real
```javascript
// Stream de métricas (WebSocket)
const metricsStream = api.metrics.createStream({
  interval: 5000,
  metrics: ['system', 'confidence', 'performance']
})

metricsStream.on('data', (metrics) => {
  console.log('Métricas atualizadas:', metrics)
})

metricsStream.on('error', (error) => {
  console.error('Erro no stream:', error)
})

// Parar stream
metricsStream.stop()
```

## Utilities

### Cache Management
```javascript
// Configurar cache
api.cache.configure({
  ttl: 300000,        // 5 minutos
  maxSize: 100,       // 100 entradas
  strategy: 'lru'     // Least Recently Used
})

// Limpar cache
api.cache.clear()

// Cache específico
api.cache.set('custom_key', data, 600000) // 10 min TTL
const cachedData = api.cache.get('custom_key')
```

### Batch Operations
```javascript
// Operações em lote
const batchResults = await api.batch.execute([
  { method: 'files.get', params: ['file_001'] },
  { method: 'files.get', params: ['file_002'] },
  { method: 'categories.list', params: [] }
])

// Análise em lote com controle de concorrência
const batchAnalysis = await api.batch.analyze({
  file_ids: ['file_001', 'file_002', 'file_003'],
  concurrency: 2,     // Max 2 simultâneos
  template: 'decisiveMoments'
})
```

### Webhooks Client
```javascript
// Configurar webhooks
await api.webhooks.configure({
  endpoints: {
    'file_analyzed': 'https://myapp.com/webhooks/file-analyzed',
    'analysis_completed': 'https://myapp.com/webhooks/analysis-completed'
  },
  secret: 'webhook-secret-key'
})

// Validar webhook (no servidor receptor)
const isValid = api.webhooks.validateSignature(
  payload,
  signature,
  'webhook-secret-key'
)
```

## TypeScript Support

### Type Definitions
```typescript
import { 
  KnowledgeConsolidatorAPI,
  FileListResponse,
  SearchResults,
  AnalysisJob,
  Category,
  ExportOptions
} from '@knowledge-consolidator/js-sdk'

const api = new KnowledgeConsolidatorAPI({
  baseURL: 'http://localhost:3000/api',
  token: process.env.KC_API_TOKEN!
})

// Tipagem automática
const files: FileListResponse = await api.files.list({
  category: 'IA/ML',
  limit: 50
})

// Interface customizada
interface CustomSearchFilters {
  projectType: string
  priority: 'high' | 'medium' | 'low'
}

const customSearch = await api.search.semantic<CustomSearchFilters>({
  query: 'projeto urgente',
  filters: {
    projectType: 'automation',
    priority: 'high'
  }
})
```

### Generic Types
```typescript
// Resultados tipados
interface ProjectFile {
  id: string
  name: string
  projectType: string
  deadline: string
}

const projects = await api.files.list<ProjectFile>({
  category: 'Projetos'
})

// Template personalizado tipado
interface OpportunityAnalysis {
  opportunities: string[]
  roi_estimate: number
  risk_level: 'low' | 'medium' | 'high'
}

const analysis = await api.files.analyze<OpportunityAnalysis>({
  file_ids: ['file_001'],
  template: 'opportunity_analysis'
})
```

## Error Handling

### Try-Catch Pattern
```javascript
try {
  const files = await api.files.list({ category: 'IA/ML' })
  console.log('Files loaded:', files.data.files.length)
} catch (error) {
  if (error.code === 'ERR_001') {
    console.warn('Invalid parameters, using defaults')
    const files = await api.files.list()
  } else {
    console.error('Unexpected error:', error.message)
    throw error
  }
}
```

### Global Error Handler
```javascript
api.onError((error, context) => {
  console.error(`Error in ${context.method}:`, error.message)
  
  // Custom error handling
  if (error.status === 401) {
    // Token expired, refresh
    refreshToken()
  } else if (error.status >= 500) {
    // Server error, retry later
    scheduleRetry(context)
  }
})
```

### Circuit Breaker
```javascript
api.configure({
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,    // 5 falhas consecutivas
    timeout: 60000,         // 1 minuto
    retryDelay: 30000       // 30s entre tentativas
  }
})
```

## Performance Optimization

### Connection Pooling
```javascript
api.configure({
  http: {
    maxSockets: 10,         // Max connections
    keepAlive: true,        // Reuse connections
    timeout: 30000          // 30s timeout
  }
})
```

### Request Compression
```javascript
api.configure({
  compression: {
    enabled: true,
    threshold: 1024,        // Compress > 1KB
    algorithm: 'gzip'
  }
})
```

### Response Caching
```javascript
// Cache automático por endpoint
api.configure({
  cache: {
    'files.list': 300000,      // 5 min
    'categories.list': 600000, // 10 min
    'search.semantic': 60000   // 1 min
  }
})
```

---

**Anterior**: [← REST API Spec](rest-api-spec.md) | **Próximo**: [Integration Examples →](integration-examples.md)