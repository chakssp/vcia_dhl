# 📊 ORIGEM DE CADA CAMPO NO JSON EXPORTADO

## ESTRUTURA COMPLETA COM ORIGEM DOS DADOS

### 1️⃣ METADADOS DO EXPORT
```javascript
{
  "timestamp": "2025-07-16T18:40:43.435Z",  // ⚡ Gerado por: new Date().toISOString() no momento do export
  "version": "1.3.0",                       // ⚡ Hardcoded em StatsPanel.exportState()
```

### 2️⃣ ESTATÍSTICAS
```javascript
  "stats": {
    // Gerado por: StatsManager.exportStats()
    "stats": {
      "arquivosEncontrados": 4,     // 📊 Contado por: FilterPanel.updateCountersUI()
      "candidatosRelevantes": 2,    // 📊 Files com relevanceScore >= 50%
      "jaAnalisados": 4,            // 📊 Files com analyzed = true
      "momentosDescobertos": 4,     // 📊 Files com analysisType detectado
      "categorizados": 4,           // 📊 Files com categories.length > 0
      "arquivados": 1,              // 📊 Files com archived = true
      "pendenteAnalise": 0,         // 📊 Files com analyzed = false
      "altaRelevancia": 1,          // 📊 Files com relevanceScore >= 70%
      "mediaRelevancia": 1,         // 📊 Files com relevanceScore 50-69%
      "baixaRelevancia": 2,         // 📊 Files com relevanceScore < 50%
      "periodos": {                 // 📊 Calculado por FilterPanel baseado em lastModified
        "hoje": 2,
        "semana": 2,
        "mes": 3,
        "tresMeses": 3,
        "seisMeses": 4,
        "ano": 4,
        "todos": 4
      },
      "relevanciaMedia": 57         // 📊 Média de todos os relevanceScore
    },
    "validation": {
      // Gerado por: StatsManager.getValidation()
      "totalFiles": 4,
      "analyzedFiles": 4,
      "pendingFiles": 0,
      "isComplete": true,           // Se todos foram processados
      "canProceed": true,           // Se pode ir para próxima etapa
      "completionPercentage": 100,
      "requirements": {
        "hasFiles": true,
        "hasRelevantFiles": true,
        "hasAnalysis": true,
        "allAnalyzed": true
      }
    }
  },
```

### 3️⃣ CONFIGURAÇÕES
```javascript
  "configuration": {
    // Vem de: AppState.get('configuration')
    // Definido em: WorkflowPanel nas etapas 1-4
    
    "discovery": {
      // Configurado em: Etapa 1 - WorkflowPanel.saveDiscoveryConfig()
      "filePatterns": ["*.md", "*.txt", "*.docx", "*.pdf", "*.gdoc"],
      "directories": ["teste"],     // Diretórios escolhidos pelo usuário
      "dateMetric": "created",      // created ou modified
      "timeRange": "all",           // Período de busca
      "recursive": true,
      "excludePatterns": ["temp", "cache", "backup"],
      "subfolderDepth": 0
    },
    
    "preAnalysis": {
      // Configurado em: Etapa 2 - WorkflowPanel.savePreAnalysisConfig()
      "keywords": [                 // 🔑 KEYWORDS PRINCIPAIS DO SISTEMA
        "decisão",
        "insight",
        "transformação",
        "aprendizado",
        "breakthrough"
      ],
      "relevanceThreshold": 50,
      "maxResults": 100,
      "sizeFilter": "all",
      "previewEnabled": true
    },
    
    "aiAnalysis": {
      // Configurado em: Etapa 3 - WorkflowPanel.saveAIAnalysisConfig()
      "model": "claude-sonnet-4",
      "tokenLimit": 8000,
      "customPrompt": "",
      "batchSize": 10,
      "autoAnalyze": false
    },
    
    "organization": {
      // Configurado em: Etapa 4 - WorkflowPanel.saveOrganizationConfig()
      "exportPath": "/Knowledge Consolidation",
      "structure": "category",
      "autoCategories": true,
      "exportFormats": ["json", "markdown"]
    }
  },
```

### 4️⃣ ARQUIVOS PROCESSADOS
```javascript
  "files": [
    // Vem de: AppState.get('files')
    // Cada arquivo passa por:
    {
      // 1. DESCOBERTA (DiscoveryManager)
      "id": "file_1752691095476_ay8ihxytr",  // Gerado: `file_${Date.now()}_${Math.random()}`
      "name": "plano de teste.md",
      "path": "teste/plano de teste.md",
      "size": 11529,
      "lastModified": "2025-06-28T03:44:36.072Z",
      "handle": {},                           // File System Access API handle
      
      // 2. PRÉ-ANÁLISE (FileRenderer + PreviewUtils)
      "relevanceScore": 0.65,                 // Calculado por: FileRenderer.calculateInitialRelevance()
      "smartPreview": {                       // Extraído por: PreviewUtils.extractSmartPreview()
        "segment1": "Primeiras 30 palavras",
        "segment2": "Segundo parágrafo",
        "segment3": "Último antes de ':'",
        "segment4": "Frase com ':'",
        "segment5": "30 palavras após ':'",
        "structure": {
          "hasHeaders": true,
          "hasLists": true,
          "hasCode": true,
          "hasLinks": true,
          "hasImages": false,
          "linkDomains": ["github.com"]
        }
      },
      
      // 3. ANÁLISE IA (AnalysisManager + FileRenderer)
      "analyzed": true,
      "analysisDate": "2025-07-16T18:38:54.484Z",
      "analysisType": "Aprendizado Geral",   // Detectado por: FileRenderer.detectAnalysisType()
      
      // 4. CURADORIA (CategoryManager + UI)
      "categories": [                         // 🏷️ CATEGORIAS APLICADAS PELO USUÁRIO
        "conceitual",                         // Categoria do sistema
        "prompt",                            // Categoria criada pelo usuário
        "prd"                                // Categoria criada pelo usuário
      ],
      "categorizedDate": "2025-07-16T18:40:24.191Z",
      
      // CONTEÚDO
      "content": "● 🧪 PLANO DE TESTES..."   // Texto completo do arquivo
    }
  ],
```

### 5️⃣ DEFINIÇÕES DE CATEGORIAS
```javascript
  "categories": [
    // Vem de: CategoryManager.getCategories()
    // Mistura categorias padrão + customizadas
    
    // CATEGORIAS PADRÃO (definidas em CategoryManager)
    {
      "id": "tecnico",
      "name": "Técnico",
      "color": "#4f46e5",
      "count": 1,                    // Quantos arquivos usam
      "icon": "🔧"
    },
    
    // CATEGORIAS CRIADAS PELO USUÁRIO
    {
      "id": "prompt",
      "name": "PROMPT",              // Nome escolhido pelo usuário
      "color": "#eab308",            // Cor atribuída automaticamente
      "count": 4,
      "custom": true                 // Indica que foi criada pelo usuário
    }
  ],
```

### 6️⃣ ESTADO DOS FILTROS
```javascript
  "filters": {
    // Vem de: FilterManager.getConfig()
    // Define todos os filtros disponíveis e suas contagens
    
    "relevance": {
      "all": { "active": true, "min": 0, "max": 100, "count": 4 },
      "high": { "active": false, "min": 70, "max": 100, "count": 1 }
    },
    
    "status": {
      "todos": { "active": true, "statuses": [], "count": 4 },
      "analisado": { "active": false, "statuses": ["analyzed"], "count": 4 }
    }
  },
```

### 7️⃣ FILTROS ATIVOS
```javascript
  "activeFilters": {
    // Vem de: FilterManager.getActiveFilters()
    // Mostra qual opção está selecionada em cada categoria
    "relevance": "all",      // Filtro de relevância ativo
    "status": "todos",       // Filtro de status ativo
    "timeRange": "all",      // Filtro temporal ativo
    "size": "all",          // Filtro de tamanho ativo
    "fileType": "all"       // Filtro de tipo ativo
  },
```

### 8️⃣ KEYWORDS ADICIONAIS
```javascript
  "keywords": []  // Vem de: FilterManager.keywords (não está sendo usado atualmente)
}
```

## 🔄 FLUXO RESUMIDO

1. **Usuário clica em Exportar**
2. **StatsPanel.exportState()** é chamado
3. **Coleta dados de**:
   - StatsManager → estatísticas
   - AppState → configuration, files, categories
   - FilterManager → filters, activeFilters, keywords
4. **Gera timestamp** e versão
5. **Retorna JSON completo**

## 📝 EXEMPLO DE CATEGORIAS CUSTOMIZADAS

Se o usuário criar categorias como "CARRO", "BICHO", "GPT":

```javascript
"categories": [
  // ... categorias padrão ...
  {
    "id": "carro",
    "name": "CARRO",
    "color": "#ff5722",
    "count": 2,
    "custom": true
  },
  {
    "id": "bicho", 
    "name": "BICHO",
    "color": "#4caf50",
    "count": 1,
    "custom": true
  },
  {
    "id": "gpt",
    "name": "GPT",
    "color": "#2196f3", 
    "count": 3,
    "custom": true
  }
]
```

E nos arquivos:
```javascript
"files": [
  {
    "name": "meu-arquivo.md",
    "categories": ["tecnico", "carro", "gpt"]  // Mix de categorias padrão + custom
  }
]
```